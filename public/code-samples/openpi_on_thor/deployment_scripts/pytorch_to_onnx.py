#!/usr/bin/env python3
import argparse
import copy
import math
import os
import sys
import types
from dataclasses import dataclass
from pathlib import Path

import torch
import torch.onnx
import onnx
from onnx.external_data_helper import convert_model_to_external_data

# Make openpi (src/ layout) and deployment_scripts importable without relying
# on an editable install.
_REPO_ROOT = Path(__file__).resolve().parent.parent
for _p in (str(_REPO_ROOT / "src"), str(_REPO_ROOT)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import openpi.models_pytorch.pi0_pytorch
from openpi.training import config as _config
from openpi.policies import policy_config
from openpi.models.model import IMAGE_KEYS, IMAGE_RESOLUTION
from openpi.models.gemma import PALIGEMMA_VOCAB_SIZE

import modelopt.torch.quantization as mtq
from deployment_scripts.calibration_data import load_calibration_data

from modelopt.torch.quantization.nn import TensorQuantizer
from modelopt.torch.quantization.config import QuantizerAttributeConfig


# =============================================================================
# Export options
# =============================================================================


@dataclass(frozen=True)
class ExportOptions:
    """All export-time switches.

    ``perf_opts`` bundles every graph optimization that is numerically exact
    (or exact up to a validated FP8 scale merge, see fuse_ae_projections).
    """

    perf_opts: bool = True
    quantize_attention_matmul: bool = True  # FP8 only; ignored for fp16
    enable_llm_nvfp4: bool = False

    # --- the perf_opts bundle ---
    @property
    def chunked_ae_attention(self) -> bool:
        return self.perf_opts

    @property
    def suffix_attn_fp16(self) -> bool:
        return self.perf_opts

    @property
    def gqa_zero_copy(self) -> bool:
        return self.perf_opts

    @property
    def fold_time_constants(self) -> bool:
        return self.perf_opts

    @property
    def fold_adaln_dense(self) -> bool:
        return self.perf_opts

    @property
    def vit_view_batch(self) -> bool:
        return self.perf_opts

    @property
    def fuse_ae_projections(self) -> bool:
        return self.perf_opts

    def summary(self, precision: str) -> str:
        state = "ENABLED" if self.perf_opts else "disabled"
        lines = [
            f"  perf_opts {state}: chunked_ae_attention, suffix_attn_fp16, gqa_zero_copy,",
            "             fold_time_constants, fold_adaln_dense, vit_view_batch, fuse_ae_projections",
            f"  quantize_attention_matmul: {self.quantize_attention_matmul and precision == 'fp8'}"
            f" (fp8-only, requested={self.quantize_attention_matmul})",
            f"  enable_llm_nvfp4: {self.enable_llm_nvfp4}",
        ]
        return "\n".join(lines)


# Shared state for chunked AE attention: (mask_prefix_4d, mask_new_4d), set by the
# denoise hooks before running the expert; None disables the chunked path.
_CHUNKED_STATE = {"masks": None, "use_quantized_matmul": False, "suffix_fp16": True}

# Zero-copy GQA: fold the n_rep query heads into the GEMM row dim via reshapes
# instead of materializing repeat_kv copies of K/V (bitwise-exact).
_GQA_ZERO_COPY = {"enabled": True}


# =============================================================================
# Quantized attention matmul
# =============================================================================


class QuantizedMatMul(torch.nn.Module):
    """Quantized matrix multiplication with QDQ nodes.

    MTQ cannot automatically insert QDQ nodes for MHA matmul operations,
    so we manually manage quantizers for Q@K^T and attn_weights@V.
    """

    def __init__(self):
        super().__init__()
        self.input1_quantizer = TensorQuantizer(QuantizerAttributeConfig(num_bits=(4, 3)))
        self.input2_quantizer = TensorQuantizer(QuantizerAttributeConfig(num_bits=(4, 3)))
        for q in (self.input1_quantizer, self.input2_quantizer):
            q.enable_calib()
            q.disable_quant()

    def forward(self, input1, input2):
        return torch.matmul(self.input1_quantizer(input1), self.input2_quantizer(input2))


def repeat_kv(hidden_states: torch.Tensor, n_rep: int) -> torch.Tensor:
    """Repeat key/value tensors for multi-query/grouped-query attention."""
    batch, num_key_value_heads, slen, head_dim = hidden_states.shape
    if n_rep == 1:
        return hidden_states
    hidden_states = hidden_states[:, :, None, :, :].expand(batch, num_key_value_heads, n_rep, slen, head_dim)
    return hidden_states.reshape(batch, num_key_value_heads * n_rep, slen, head_dim)


def quantized_eager_attention_forward(
    module: torch.nn.Module,
    query: torch.Tensor,
    key: torch.Tensor,
    value: torch.Tensor,
    attention_mask: torch.Tensor,
    scaling: float,
    dropout: float = 0.0,
    **kwargs,
):
    """Attention forward with quantized matmul operations."""
    if not hasattr(module, "qk_matmul"):
        module.add_module("qk_matmul", QuantizedMatMul())
    if not hasattr(module, "av_matmul"):
        module.add_module("av_matmul", QuantizedMatMul())

    n_rep = module.num_key_value_groups
    zero_copy = _GQA_ZERO_COPY["enabled"] and n_rep > 1
    if zero_copy:
        # Fold the n_rep query heads sharing one KV head into the GEMM row dim
        # via free reshapes; K/V are consumed as-is, every dot product unchanged.
        b, h, m, d = query.shape
        kv = key.shape[1]
        q_g = query.reshape(b, kv, n_rep * m, d)
        attn_weights = module.qk_matmul(q_g, key.transpose(2, 3)).reshape(b, h, m, key.shape[-2]) * scaling
    else:
        key = repeat_kv(key, n_rep)
        value = repeat_kv(value, n_rep)
        attn_weights = module.qk_matmul(query, key.transpose(2, 3)) * scaling

    if attention_mask is not None:
        causal_mask = attention_mask[:, :, :, : key.shape[-2]]
        attn_weights = attn_weights + causal_mask

    attn_weights = torch.nn.functional.softmax(attn_weights, dim=-1, dtype=torch.float32).to(query.dtype)
    attn_weights = torch.nn.functional.dropout(attn_weights, p=dropout, training=module.training)

    if zero_copy:
        attn_g = attn_weights.reshape(b, kv, n_rep * m, key.shape[-2])
        attn_output = module.av_matmul(attn_g, value).reshape(b, h, m, value.shape[-1])
    else:
        attn_output = module.av_matmul(attn_weights, value)
    attn_output = attn_output.transpose(1, 2).contiguous()

    return attn_output, attn_weights


def replace_attention_with_quantized_version():
    """Replace eager_attention_forward with quantized version."""
    from transformers.models.gemma import modeling_gemma

    if not hasattr(modeling_gemma, "_original_eager_attention_forward"):
        modeling_gemma._original_eager_attention_forward = modeling_gemma.eager_attention_forward

    modeling_gemma.eager_attention_forward = quantized_eager_attention_forward


# =============================================================================
# Chunked AE attention + projection fusion
# =============================================================================


def chunked_gemma_attention_forward(
    self,
    hidden_states,
    position_embeddings,
    attention_mask,
    past_key_value=None,
    cache_position=None,
    use_cache=False,
    **kwargs,
):
    """GemmaAttention.forward with chunked prefix/suffix KV attention, used on
    the AE denoise step (past_key_value present, use_cache=False).

    QK and AV run per chunk, so the prefix KV is never concatenated with the
    suffix KV and re-repeated per layer per step; only the small logits are
    concatenated and go through one standard softmax. Numerically identical to
    the original attention. The standard softmax op is required: a manually
    fused joint softmax fails to build on TRT 10.16.
    All other cases (LLM prefill, vision) delegate to the original forward.
    """
    from transformers.models.gemma import modeling_gemma

    masks = _CHUNKED_STATE["masks"]
    if past_key_value is None or use_cache or masks is None:
        return modeling_gemma._original_gemma_attention_forward(
            self, hidden_states, position_embeddings, attention_mask,
            past_key_value=past_key_value, cache_position=cache_position, use_cache=use_cache, **kwargs,
        )

    input_shape = hidden_states.shape[:-1]
    hidden_shape = (*input_shape, -1, self.head_dim)

    if hasattr(self, "qkv_proj"):
        qkv = self.qkv_proj(hidden_states)
        query_states, key_states, value_states = qkv.split(
            [self._q_out_features, self._k_out_features, self._v_out_features], dim=-1
        )
        query_states = query_states.reshape(hidden_shape).transpose(1, 2)
        key_states = key_states.reshape(hidden_shape).transpose(1, 2)
        value_states = value_states.reshape(hidden_shape).transpose(1, 2)
    else:
        query_states = self.q_proj(hidden_states).view(hidden_shape).transpose(1, 2)
        key_states = self.k_proj(hidden_states).view(hidden_shape).transpose(1, 2)
        value_states = self.v_proj(hidden_states).view(hidden_shape).transpose(1, 2)

    cos, sin = position_embeddings
    query_states, key_states = modeling_gemma.apply_rotary_pos_emb(query_states, key_states, cos, sin)

    prefix_k = past_key_value[self.layer_idx][0]
    prefix_v = past_key_value[self.layer_idx][1]
    mask_p, mask_n = masks
    n_rep = self.num_key_value_groups
    zero_copy = _GQA_ZERO_COPY["enabled"] and n_rep > 1

    if zero_copy:
        # K/V consumed as-is; query heads folded into the GEMM row dim below.
        pk, pv, nk, nv = prefix_k, prefix_v, key_states, value_states
    else:
        pk = repeat_kv(prefix_k, n_rep)      # identical across unrolled steps -> CSE once per layer
        pv = repeat_kv(prefix_v, n_rep)
        nk = repeat_kv(key_states, n_rep)    # tiny (suffix tokens only)
        nv = repeat_kv(value_states, n_rep)

    if _CHUNKED_STATE["use_quantized_matmul"]:
        if not hasattr(self, "qk_matmul"):
            self.add_module("qk_matmul", QuantizedMatMul())
        if not hasattr(self, "av_matmul"):
            self.add_module("av_matmul", QuantizedMatMul())
        mm_qk, mm_av = self.qk_matmul, self.av_matmul
    else:
        mm_qk = mm_av = torch.matmul

    # The suffix chunk is tiny: FP8 Q/DQ overhead exceeds the matmul itself, so
    # it runs in plain fp16. The prefix chunk keeps the quantized matmul.
    if _CHUNKED_STATE["suffix_fp16"]:
        mm_qk_n = mm_av_n = torch.matmul
    else:
        mm_qk_n, mm_av_n = mm_qk, mm_av

    if zero_copy:
        b, h, m, d = query_states.shape
        kv = prefix_k.shape[1]
        q_g = query_states.reshape(b, kv, n_rep * m, d)
        logits_p = mm_qk(q_g, pk.transpose(2, 3)).reshape(b, h, m, pk.shape[-2]) * self.scaling + mask_p
        logits_n = mm_qk_n(q_g, nk.transpose(2, 3)).reshape(b, h, m, nk.shape[-2]) * self.scaling + mask_n
    else:
        logits_p = mm_qk(query_states, pk.transpose(2, 3)) * self.scaling + mask_p
        logits_n = mm_qk_n(query_states, nk.transpose(2, 3)) * self.scaling + mask_n

    # Block-structured QK is bitwise-identical to qk(q, cat(pk, nk)); only the
    # small logits are concatenated before a single standard softmax.
    prefix_len = pk.shape[-2]
    logits = torch.cat([logits_p, logits_n], dim=-1)
    attn = torch.nn.functional.softmax(logits, dim=-1, dtype=torch.float32).to(query_states.dtype)

    if zero_copy:
        attn_g = attn.reshape(b, kv, n_rep * m, -1)
        attn_p = attn_g[..., :prefix_len]
        attn_n = attn_g[..., prefix_len:]
        attn_output = (mm_av(attn_p, pv) + mm_av_n(attn_n, nv)).reshape(b, h, m, d)
    else:
        attn_p = attn[..., :prefix_len]
        attn_n = attn[..., prefix_len:]
        attn_output = mm_av(attn_p, pv) + mm_av_n(attn_n, nv)
    attn_output = attn_output.transpose(1, 2).contiguous()
    attn_output = attn_output.reshape(*input_shape, self.config.num_attention_heads * self.head_dim).contiguous()
    attn_output = self.o_proj(attn_output)
    return attn_output, None


def replace_attention_with_chunked_kv(use_quantized_matmul: bool, suffix_fp16: bool = True):
    """Install chunked prefix/suffix attention for the AE denoise path."""
    from transformers.models.gemma import modeling_gemma

    if not hasattr(modeling_gemma, "_original_gemma_attention_forward"):
        modeling_gemma._original_gemma_attention_forward = modeling_gemma.GemmaAttention.forward
    if not hasattr(modeling_gemma, "_original_eager_attention_forward"):
        modeling_gemma._original_eager_attention_forward = modeling_gemma.eager_attention_forward

    _CHUNKED_STATE["use_quantized_matmul"] = use_quantized_matmul
    _CHUNKED_STATE["suffix_fp16"] = suffix_fp16
    modeling_gemma.GemmaAttention.forward = chunked_gemma_attention_forward
    suffix_note = "suffix matmuls in plain fp16" if suffix_fp16 and use_quantized_matmul else "suffix matmuls quantized"
    print(f"  Chunked AE attention ENABLED: prefix/suffix KV attended separately (cat-logits + standard softmax, {suffix_note})")


def _fuse_projections_in_layers(layers):
    for layer in layers:
        sa = layer.self_attn
        if not hasattr(sa, "qkv_proj"):
            assert sa.q_proj.bias is None and sa.k_proj.bias is None and sa.v_proj.bias is None
            w = torch.cat([sa.q_proj.weight, sa.k_proj.weight, sa.v_proj.weight], dim=0)
            fused = torch.nn.Linear(w.shape[1], w.shape[0], bias=False, device=w.device, dtype=w.dtype)
            fused.weight.data.copy_(w)
            sa._q_out_features = sa.q_proj.out_features
            sa._k_out_features = sa.k_proj.out_features
            sa._v_out_features = sa.v_proj.out_features
            sa.qkv_proj = fused
            # Keep q/k/v_proj: GemmaModel.forward probes q_proj.weight.dtype.
            # They are never called on the fused path, so they stay out of the
            # traced graph.
        mlp = layer.mlp
        if not hasattr(mlp, "gateup_proj"):
            assert mlp.gate_proj.bias is None and mlp.up_proj.bias is None
            w = torch.cat([mlp.gate_proj.weight, mlp.up_proj.weight], dim=0)
            fused = torch.nn.Linear(w.shape[1], w.shape[0], bias=False, device=w.device, dtype=w.dtype)
            fused.weight.data.copy_(w)
            mlp._gate_out_features = mlp.gate_proj.out_features
            mlp.gateup_proj = fused
            # gate/up_proj kept for the same reason as q/k/v_proj above (unused -> untraced).


def _install_fused_mlp_forward():
    from transformers.models.gemma import modeling_gemma

    if not hasattr(modeling_gemma, "_original_gemma_mlp_forward"):
        modeling_gemma._original_gemma_mlp_forward = modeling_gemma.GemmaMLP.forward

        def fused_mlp_forward(self, x):
            if hasattr(self, "gateup_proj"):
                gateup = self.gateup_proj(x)
                gate, up = gateup.split([self._gate_out_features, gateup.shape[-1] - self._gate_out_features], dim=-1)
                return self.down_proj(self.act_fn(gate) * up)
            return modeling_gemma._original_gemma_mlp_forward(self, x)

        modeling_gemma.GemmaMLP.forward = fused_mlp_forward


def _expert_layers(model):
    expert = model.paligemma_with_expert.gemma_expert
    return expert.model.layers if hasattr(expert.model, "layers") else expert.model.model.layers


def fuse_ae_projections(model):
    """Fuse q/k/v -> qkv and gate/up -> gateup Linears in the AE expert layers.

    Numerically exact in fp16 (concatenated output columns compute identically);
    under FP8 PTQ the fused weight shares one per-tensor scale (max of the
    branch amaxes), a small quantization change that must be validated on
    outputs.
    """
    layers = _expert_layers(model)
    _fuse_projections_in_layers(layers)
    _install_fused_mlp_forward()
    print(f"  AE projection fusion ENABLED: qkv + gateup fused for {len(layers)} expert layers")


# =============================================================================
# ONNX postprocessing
# =============================================================================


def _fold_adaln_dense_constants(onnx_model):
    """Targeted constant folding of the AdaRMS dense Gemms.

    The tracer emits the precomputed adarms_cond as inline Constant nodes, so
    each dense Gemm is Constant x weight-initializer - a pure constant that TRT
    does not fold at build time. Evaluate with numpy (fp32 accumulate, single
    fp16 round, matching the runtime GEMM) and replace with initializers. QDQ
    nodes are never touched.
    """
    import re as _re

    import numpy as np
    from onnx import numpy_helper

    g = onnx_model.graph
    inits = {i.name: i for i in g.initializer}
    producers = {o: n for n in g.node for o in n.output}
    pat = _re.compile(r"(input_layernorm|post_attention_layernorm|/norm)[^/]*/dense")

    def _value(name):
        if name in inits:
            return numpy_helper.to_array(inits[name])
        n = producers.get(name)
        if n is not None and n.op_type == "Constant":
            for a in n.attribute:
                if a.name == "value":
                    return numpy_helper.to_array(a.t)
        return None

    folded, removed = 0, []
    for node in list(g.node):
        if node.op_type not in ("Gemm", "MatMul") or not pat.search(node.name):
            continue
        vals = [_value(i) for i in node.input]
        if any(v is None for v in vals):
            continue
        out_dtype = vals[0].dtype
        vals = [v.astype(np.float32) for v in vals]
        if node.op_type == "Gemm":
            attrs = {a.name: a for a in node.attribute}
            alpha = attrs["alpha"].f if "alpha" in attrs else 1.0
            beta = attrs["beta"].f if "beta" in attrs else 1.0
            a = vals[0].T if ("transA" in attrs and attrs["transA"].i) else vals[0]
            b = vals[1].T if ("transB" in attrs and attrs["transB"].i) else vals[1]
            y = alpha * (a @ b)
            if len(vals) > 2:
                y = y + beta * vals[2]
        else:
            y = vals[0] @ vals[1]
        g.initializer.append(numpy_helper.from_array(y.astype(out_dtype), name=node.output[0]))
        removed.append(node)
        folded += 1
    for node in removed:
        g.node.remove(node)

    # sweep now-dead nodes (the inline Constants that fed the folded Gemms)
    graph_outputs = {o.name for o in g.output}
    changed = True
    while changed:
        changed = False
        live = {i for n in g.node for i in n.input} | graph_outputs
        for n in list(g.node):
            if n.output and not any(o in live for o in n.output):
                g.node.remove(n)
                changed = True
    print(f"  Folded {folded} AdaRMS dense Gemm(s) into constants")
    return onnx_model


def postprocess_onnx_model(onnx_path, opts: ExportOptions) -> None:
    """Post-process ONNX model for TensorRT compatibility.

    - Optionally folds the AdaRMS dense Gemms into constants
    - Converts FP4 QDQ ops to 2DQ format if enable_llm_nvfp4 is on
    - Re-saves the model with all weights in one external .data file and
      removes the per-tensor weight files torch.onnx.export left behind
    """
    onnx_path = str(onnx_path)
    onnx_model = onnx.load(onnx_path, load_external_data=True)

    if opts.fold_adaln_dense:
        try:
            onnx_model = _fold_adaln_dense_constants(onnx_model)
        except Exception as e:  # noqa: BLE001
            print(f"  WARNING: AdaRMS dense folding skipped ({e})")

    if opts.enable_llm_nvfp4:
        print("  Converting LLM NVFP4 ONNX model to 2DQ format...")
        # modelopt >= 0.43 removed the free function fp4qdq_to_2dq and moved the
        # TRT_FP4QDQ -> 2x DequantizeLinear conversion into NVFP4QuantExporter.
        # Keep a fallback to the old API for older modelopt installs.
        try:
            from modelopt.onnx.export import NVFP4QuantExporter

            onnx_model = NVFP4QuantExporter.process_model(onnx_model)
        except ImportError:
            from modelopt.onnx.quantization.qdq_utils import fp4qdq_to_2dq

            onnx_model = fp4qdq_to_2dq(onnx_model, verbose=True)
        print("  NVFP4 2DQ conversion completed")

    onnx_dir = os.path.dirname(onnx_path)
    for filename in os.listdir(onnx_dir):
        if filename.endswith(".onnx") or filename.endswith(".data"):
            continue
        file_path = os.path.join(onnx_dir, filename)
        if os.path.isfile(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass

    convert_model_to_external_data(
        onnx_model,
        all_tensors_to_one_file=True,
        location=os.path.basename(onnx_path).replace(".onnx", ".data"),
    )
    onnx.save(onnx_model, onnx_path)


# =============================================================================
# Model patching (export-compatible sample_actions / denoise / embed_prefix)
# =============================================================================


def make_att_2d_masks_hook(pad_masks, att_masks):
    """TensorRT-compatible version of make_att_2d_masks with explicit int64 casting."""
    if att_masks.ndim != 2:
        raise ValueError(att_masks.ndim)
    if pad_masks.ndim != 2:
        raise ValueError(pad_masks.ndim)

    cumsum = torch.cumsum(att_masks.to(dtype=torch.int64), dim=1)
    att_2d_masks = cumsum[:, None, :] <= cumsum[:, :, None]
    pad_2d_masks = pad_masks[:, None, :] * pad_masks[:, :, None]
    return att_2d_masks & pad_2d_masks


def patch_model_for_export(model, opts: ExportOptions, compute_dtype=torch.float16):
    """Patch model with export-compatible hooks without modifying openpi source."""
    model.compute_dtype = compute_dtype
    fold_time_constants = opts.fold_time_constants

    def sample_noise_hook(self, shape, device):
        return torch.normal(mean=0.0, std=1.0, size=shape, dtype=self.compute_dtype, device=device)

    def _run_expert_denoise(
        self, suffix_embs, suffix_pad_masks, suffix_att_masks, prefix_pad_masks, past_key_values, adarms_cond
    ):
        """Common tail of both denoise variants: build masks/positions, run the
        AE expert, project to actions. Also publishes the per-chunk masks the
        chunked attention forward consumes."""
        suffix_len = suffix_pad_masks.shape[1]

        # expand with -1 keeps the batch / prefix dims symbolic in the traced
        # graph (shape[i] Python ints here can get baked in as constants).
        prefix_pad_2d_masks = prefix_pad_masks[:, None, :].expand(-1, suffix_len, -1)
        suffix_att_2d_masks = make_att_2d_masks_hook(suffix_pad_masks, suffix_att_masks)
        full_att_2d_masks = torch.cat([prefix_pad_2d_masks, suffix_att_2d_masks], dim=2)

        prefix_offsets = torch.sum(prefix_pad_masks, dim=-1)[:, None]
        position_ids = prefix_offsets + torch.cumsum(suffix_pad_masks.to(dtype=torch.int64), dim=1) - 1

        full_att_2d_masks_4d = self._prepare_attention_masks_4d(full_att_2d_masks)
        _CHUNKED_STATE["masks"] = (
            self._prepare_attention_masks_4d(prefix_pad_2d_masks),
            self._prepare_attention_masks_4d(suffix_att_2d_masks),
        )
        self.paligemma_with_expert.gemma_expert.model.config._attn_implementation = "eager"

        outputs_embeds, _ = self.paligemma_with_expert.forward(
            attention_mask=full_att_2d_masks_4d,
            position_ids=position_ids,
            past_key_values=past_key_values,
            inputs_embeds=[None, suffix_embs],
            use_cache=False,
            adarms_cond=[None, adarms_cond],
        )

        suffix_out = outputs_embeds[1][:, -self.config.action_horizon :]
        return self.action_out_proj(suffix_out.to(dtype=self.compute_dtype))

    def denoise_step_hook(self, state, prefix_pad_masks, past_key_values, x_t, timestep):
        """One denoising step (original time-conditioned path)."""
        suffix_embs, suffix_pad_masks, suffix_att_masks, adarms_cond = self.embed_suffix(state, x_t, timestep)
        return self._run_expert_denoise(
            suffix_embs, suffix_pad_masks, suffix_att_masks, prefix_pad_masks, past_key_values, adarms_cond
        )

    def denoise_step_folded_hook(self, state, prefix_pad_masks, past_key_values, x_t, adarms_cond):
        """denoise_step variant for fold_time_constants: identical math, but the
        suffix embedding is built inline (pi05 branch of embed_suffix minus the
        time path) and adarms_cond comes in as a precomputed [1, D] constant.

        `state` is only consumed via shape (batch size), mirroring how the
        original graph referenced it - keeps `state` a network input so the
        ONNX I/O interface is unchanged (pi05 does not use its values)."""
        suffix_embs = self.action_in_proj(x_t)

        bsize = state.shape[0]
        suffix_len = suffix_embs.shape[1]
        suffix_pad_masks = torch.ones(bsize, suffix_len, dtype=torch.bool, device=suffix_embs.device)

        att_masks = [1] + ([0] * (self.config.action_horizon - 1))
        suffix_att_masks = torch.tensor(att_masks, dtype=suffix_embs.dtype, device=suffix_embs.device)
        suffix_att_masks = suffix_att_masks[None, :].expand(bsize, len(att_masks))

        return self._run_expert_denoise(
            suffix_embs, suffix_pad_masks, suffix_att_masks, prefix_pad_masks, past_key_values, adarms_cond
        )

    def sample_actions_hook(self, device, observation, noise=None, num_steps=10):
        """Sample actions using TensorRT-compatible operations."""
        bsize = observation.state.shape[0]
        if noise is None:
            actions_shape = (bsize, self.config.action_horizon, self.config.action_dim)
            noise = self.sample_noise(actions_shape, device)

        images, img_masks, lang_tokens, lang_masks, state = self._preprocess_observation(observation, train=False)

        prefix_embs, prefix_pad_masks, prefix_att_masks = self.embed_prefix(images, img_masks, lang_tokens, lang_masks)
        prefix_att_2d_masks = make_att_2d_masks_hook(prefix_pad_masks, prefix_att_masks)
        prefix_position_ids = torch.cumsum(prefix_pad_masks.to(dtype=torch.int64), dim=1) - 1

        prefix_att_2d_masks_4d = self._prepare_attention_masks_4d(prefix_att_2d_masks)
        self.paligemma_with_expert.paligemma.language_model.config._attn_implementation = "eager"

        _, past_key_values = self.paligemma_with_expert.forward(
            attention_mask=prefix_att_2d_masks_4d,
            position_ids=prefix_position_ids,
            past_key_values=None,
            inputs_embeds=[prefix_embs, None],
            use_cache=True,
        )

        dt = torch.tensor(-1.0 / num_steps, dtype=self.compute_dtype, device=device)

        x_t = noise
        if fold_time_constants:
            # The denoise schedule is fixed, so the time chain (sin/cos ->
            # time_mlp -> adarms_cond) was precomputed as [1, D] buffers; they
            # enter the graph as initializers and the downstream AdaRMS dense
            # GEMVs become foldable constants. The [1, ...] modulation applies
            # via broadcast - numerically identical to the batch-expanded form.
            for step_idx in range(num_steps):
                adarms_cond = getattr(self, f"_folded_adarms_cond_{step_idx}")
                v_t = self.denoise_step_folded(state, prefix_pad_masks, past_key_values, x_t, adarms_cond)
                x_t = x_t + dt * v_t
            return x_t

        time = torch.tensor(1.0, dtype=self.compute_dtype, device=device)
        while time >= -dt / 2:
            expanded_time = time.expand(bsize)
            v_t = self.denoise_step(state, prefix_pad_masks, past_key_values, x_t, expanded_time)
            x_t = x_t + dt * v_t
            time += dt
        return x_t

    def embed_prefix_view_batched_hook(self, images, img_masks, lang_tokens, lang_masks):
        """View-batched variant of PI0Pytorch.embed_prefix.

        Stacks the camera views on the batch dimension and runs the SigLIP
        vision tower + multi-modal projector once with batch = num_views * B,
        instead of tracing one vision subgraph per view. Attention inside
        SigLIP is per-sample, so each view still attends only within its own
        tokens, and the returned token order matches the original per-view
        loop - downstream masks / positions are unchanged.
        """
        assert len(images) == len(img_masks)
        embs = []
        pad_masks = []

        num_views = len(images)
        stacked_views = torch.cat(list(images), dim=0)  # [num_views * B, 3, H, W]

        all_img_embs = self._apply_checkpoint(self.paligemma_with_expert.embed_image, stacked_views)  # [V*B, S, D]

        seq_len, emb_dim = all_img_embs.shape[1], all_img_embs.shape[2]
        # [V*B, S, D] -> [V, B, S, D] -> [B, V, S, D]; per-view order matches the original loop
        all_img_embs = all_img_embs.reshape(num_views, -1, seq_len, emb_dim).transpose(0, 1)

        for view_idx, img_mask in enumerate(img_masks):
            img_emb = all_img_embs[:, view_idx]
            bsize, num_img_embs = img_emb.shape[:2]
            embs.append(img_emb)
            pad_masks.append(img_mask[:, None].expand(bsize, num_img_embs))

        def lang_embed_func(lang_tokens):
            lang_emb = self.paligemma_with_expert.embed_language_tokens(lang_tokens)
            return lang_emb * math.sqrt(lang_emb.shape[-1])

        lang_emb = self._apply_checkpoint(lang_embed_func, lang_tokens)

        embs.append(lang_emb)
        pad_masks.append(lang_masks)

        embs = torch.cat(embs, dim=1)
        pad_masks = torch.cat(pad_masks, dim=1)
        # All prefix tokens (image + language) carry att_mask=0 (bidirectional
        # prefix attention). Build the mask from pad_masks' traced shape rather
        # than accumulating a Python list: the list length is a trace-time int,
        # so torch.tensor(...) would bake the whole prefix length (e.g. 968)
        # into the graph as a constant and pin the language seq dim regardless
        # of the declared dynamic axis.
        att_masks = torch.zeros_like(pad_masks, dtype=torch.bool)

        return embs, pad_masks, att_masks

    model.sample_noise = types.MethodType(sample_noise_hook, model)
    model.sample_actions = types.MethodType(sample_actions_hook, model)
    model._run_expert_denoise = types.MethodType(_run_expert_denoise, model)
    model.denoise_step = types.MethodType(denoise_step_hook, model)
    model.denoise_step_folded = types.MethodType(denoise_step_folded_hook, model)

    if opts.vit_view_batch:
        model.embed_prefix = types.MethodType(embed_prefix_view_batched_hook, model)
        print("  ViT view-batching ENABLED: SigLIP runs once with batch = num_views * B")

    if fold_time_constants:
        print("  Time-constant folding ENABLED: timestep kept [1]-shaped; adaLN dense / time_mlp fold to constants")

    print(f"  Model patched with compute_dtype={compute_dtype}")
    return model


def _precompute_folded_time_constants(model, num_steps: int) -> None:
    """Eagerly precompute adarms_cond for the fixed denoise schedule and register
    them as [1, D] buffers, so the time chain never enters the traced graph.

    Must run before quantization: the FP8 calibration forward_loop runs
    sample_actions, whose folded denoise path reads these buffers. (time_mlp
    quantizers are disabled in fold mode, so values are identical pre-/post-
    quantization.)
    """
    import torch.nn.functional as F

    from openpi.models_pytorch.pi0_pytorch import create_sinusoidal_pos_embedding

    device = next(model.parameters()).device
    dt = 1.0 / num_steps
    with torch.no_grad():
        for step_idx in range(num_steps):
            t = torch.tensor([1.0 - step_idx * dt], dtype=model.compute_dtype, device=device)
            time_emb = create_sinusoidal_pos_embedding(
                t, model.action_in_proj.out_features, min_period=4e-3, max_period=4.0, device=t.device
            )
            time_emb = time_emb.type(dtype=t.dtype)
            x = F.silu(model.time_mlp_in(time_emb))
            x = F.silu(model.time_mlp_out(x))
            model.register_buffer(f"_folded_adarms_cond_{step_idx}", x.detach().clone(), persistent=False)
    print(f"  Precomputed {num_steps} folded adarms_cond constants (shape {tuple(x.shape)})")


# =============================================================================
# Quantization
# =============================================================================


def quantize_model(
    model: torch.nn.Module,
    dummy_inputs: tuple,
    opts: ExportOptions,
    calibration_data=None,
    num_steps: int = 10,
) -> torch.nn.Module:
    """Quantize model using NVIDIA modelopt (FP8 with optional NVFP4 for LLM layers)."""
    print("  Quantizing model to FP8 using NVIDIA modelopt...")

    if opts.quantize_attention_matmul:
        replace_attention_with_quantized_version()

    # deepcopy: FP8_DEFAULT_CFG is module-level shared state; mutating it in
    # place would leak our overrides into any later mtq.quantize call.
    quant_cfg = copy.deepcopy(mtq.FP8_DEFAULT_CFG)
    quant_cfg["quant_cfg"]["nn.Conv2d"] = {"*": {"enable": False}}

    if opts.fold_time_constants:
        # time_mlp / AdaRMS dense outputs depend only on the fixed denoise schedule and
        # are meant to be constant-folded away; disabling their quantizers keeps the
        # constant chain free of QDQ nodes (nothing that actually runs at inference
        # changes precision).
        quant_cfg["quant_cfg"]["*time_mlp*"] = {"enable": False}
        quant_cfg["quant_cfg"]["*norm.dense*"] = {"enable": False}

    if opts.enable_llm_nvfp4:
        print("  Enabling NVFP4 quantization for LLM layers...")
        quant_cfg["quant_cfg"]["paligemma_with_expert.paligemma.model.language_model.layers.*"] = {
            "num_bits": (2, 1),
            "block_sizes": {-1: 16, "type": "dynamic", "scale_bits": (4, 3)},
            "axis": None,
            "enable": True,
        }
        quant_cfg["quant_cfg"]["paligemma_with_expert.paligemma.model.language_model.layers.*.output_quantizer"] = {
            "num_bits": (2, 1),
            "block_sizes": {-1: 16, "type": "dynamic", "scale_bits": (4, 3)},
            "axis": None,
            "enable": False,
        }

    if calibration_data is not None:
        num_samples = len(calibration_data.dataset) if hasattr(calibration_data, "dataset") else "unknown"
        print(f"  Using {num_samples} real calibration samples from dataset")

        def forward_loop(mdl):
            mdl.eval()
            device = next(mdl.parameters()).device
            with torch.no_grad():
                for batch_idx, (observation, noise) in enumerate(calibration_data):
                    try:
                        mdl.sample_actions(device, observation, noise=noise, num_steps=num_steps)
                    except Exception as e:  # noqa: BLE001
                        print(f"    Warning: Calibration batch {batch_idx} forward failed: {e}")
                        continue
                    if (batch_idx + 1) % 10 == 0:
                        print(f"    Processed {batch_idx + 1}/{num_samples} calibration samples")
    else:
        print("  Using dummy inputs for calibration")

        def forward_loop(mdl):
            with torch.no_grad():
                ONNXWrapper(mdl, num_steps)(*dummy_inputs)

    print("  Running quantization with calibration...")
    quantized_model = mtq.quantize(model, quant_cfg, forward_loop=forward_loop)

    print("\n  Quantization Summary:")
    mtq.print_quant_summary(quantized_model)
    print("  FP8 quantization completed")

    if opts.enable_llm_nvfp4:
        from modelopt.torch.quantization.utils import is_quantized_linear

        for module in quantized_model.modules():
            assert not isinstance(module, torch.nn.Linear) or is_quantized_linear(module)
            if isinstance(module, torch.nn.Linear):
                module.input_quantizer._trt_high_precision_dtype = "Half"
                module.input_quantizer._onnx_quantizer_type = "dynamic"
                module.output_quantizer._onnx_quantizer_type = "dynamic"
                module.weight_quantizer._onnx_quantizer_type = "static"

    return quantized_model


# =============================================================================
# Export
# =============================================================================


class ONNXWrapper(torch.nn.Module):
    """Wrapper for ONNX export that converts flat tensor inputs to Observation."""

    def __init__(self, model: torch.nn.Module, num_steps: int):
        super().__init__()
        self.model = model
        self.num_steps = num_steps

    def forward(self, images, img_masks, lang_tokens, lang_masks, state, noise):
        from openpi.models.model import Observation

        observation = Observation(
            images={IMAGE_KEYS[i]: images[:, i * 3 : (i + 1) * 3] for i in range(len(IMAGE_KEYS))},
            image_masks={IMAGE_KEYS[i]: img_masks[:, i] for i in range(len(IMAGE_KEYS))},
            state=state,
            tokenized_prompt=lang_tokens,
            tokenized_prompt_mask=lang_masks,
        )
        return self.model.sample_actions(images.device, observation, noise=noise, num_steps=self.num_steps)


def _create_dummy_inputs(model_device, model_config, compute_dtype=torch.float16) -> tuple:
    """Create dummy inputs for ONNX export from model_config / imported constants."""
    num_images = len(IMAGE_KEYS)
    image_size = IMAGE_RESOLUTION[0]
    action_horizon = model_config.action_horizon
    action_dim = model_config.action_dim
    max_token_len = model_config.max_token_len

    dummy_inputs = (
        torch.randn(1, num_images * 3, image_size, image_size, dtype=compute_dtype, device=model_device),
        torch.ones(1, num_images, dtype=torch.bool, device=model_device),
        torch.randint(0, PALIGEMMA_VOCAB_SIZE, (1, max_token_len), dtype=torch.long, device=model_device),
        torch.ones(1, max_token_len, dtype=torch.bool, device=model_device),
        torch.randn(1, action_dim, dtype=compute_dtype, device=model_device),
        torch.randn(1, action_horizon, action_dim, dtype=compute_dtype, device=model_device),
    )
    print(
        f"  Dummy inputs created: images={dummy_inputs[0].shape} (dtype={compute_dtype}), "
        f"noise={dummy_inputs[5].shape} (dtype={compute_dtype})"
    )
    return dummy_inputs


def _prepare_model_for_export(
    model: torch.nn.Module,
    precision: str,
    opts: ExportOptions,
    dummy_inputs: tuple = None,
    config_obj=None,
    checkpoint_dir: str = None,
    num_calibration_samples: int = 32,
    num_steps: int = 10,
) -> torch.nn.Module:
    """Prepare model for ONNX export: patch hooks, apply optimizations, quantize."""
    model.eval()

    model = patch_model_for_export(model, opts, compute_dtype=torch.float16)
    model = model.to(torch.float16)

    if opts.fold_time_constants:
        _precompute_folded_time_constants(model, num_steps)

    _GQA_ZERO_COPY["enabled"] = opts.gqa_zero_copy
    if opts.gqa_zero_copy:
        print("  GQA zero-copy ENABLED: grouped-GEMM reshapes replace repeat_kv (bitwise-exact)")

    if opts.fuse_ae_projections:
        # Before quantization so the fused Linears are calibrated as single units.
        fuse_ae_projections(model)

    if opts.chunked_ae_attention:
        replace_attention_with_chunked_kv(
            use_quantized_matmul=(precision == "fp8" and opts.quantize_attention_matmul),
            suffix_fp16=opts.suffix_attn_fp16,
        )

    if precision == "fp8":
        if dummy_inputs is None:
            raise ValueError("dummy_inputs required for FP8 quantization")

        device = next(model.parameters()).device
        calibration_data = None
        if config_obj is not None and checkpoint_dir is not None:
            calibration_data = load_calibration_data(
                config_obj,
                checkpoint_dir,
                num_calibration_samples,
                str(device),
                compute_dtype=torch.float16,
            )

        model = quantize_model(model, dummy_inputs, opts, calibration_data, num_steps)
        dtype_str = "float8 (quantized from float16)"
        if opts.enable_llm_nvfp4:
            dtype_str += " with NVFP4 LLM"
    else:
        dtype_str = "float16"

    print(f"  Model device: {next(model.parameters()).device}, dtype: {dtype_str}")

    if hasattr(model.sample_actions, "_torchdynamo_inline"):
        uncompiled = openpi.models_pytorch.pi0_pytorch.PI0Pytorch.sample_actions
        model.sample_actions = lambda *args, **kwargs: uncompiled(model, *args, **kwargs)
    return model


def export_to_onnx(
    model: torch.nn.Module,
    output_path: Path,
    model_config,
    opts: ExportOptions,
    num_steps: int = 10,
    precision: str = "fp16",
    config_obj=None,
    checkpoint_dir: str = None,
    num_calibration_samples: int = 32,
) -> torch.nn.Module:
    """Export PyTorch model to ONNX format."""
    nvfp4 = opts.enable_llm_nvfp4 and precision == "fp8"
    print(f"Exporting model to ONNX format with precision: {precision.upper()}{' + NVFP4 LLM' if nvfp4 else ''}...")
    print(opts.summary(precision))

    device = next(model.parameters()).device
    dummy_inputs = _create_dummy_inputs(device, model_config, torch.float16)

    model = _prepare_model_for_export(
        model,
        precision,
        opts,
        dummy_inputs,
        config_obj,
        checkpoint_dir,
        num_calibration_samples,
        num_steps,
    )

    onnx_dir = Path(output_path) / "onnx"
    onnx_dir.mkdir(parents=True, exist_ok=True)
    onnx_path = onnx_dir / (f"model_{precision}_nvfp4.onnx" if nvfp4 else f"model_{precision}.onnx")

    print(f"\nExporting to: {onnx_path}")

    with torch.no_grad():
        torch.onnx.export(
            ONNXWrapper(model, num_steps),
            dummy_inputs,
            str(onnx_path),
            # opset 20 exports GELU as a single native Gelu op (opset 19 traces the
            # tanh-approximation chain). Override with EXPORT_OPSET for A/B tests.
            opset_version=int(os.getenv("EXPORT_OPSET", "20")),
            do_constant_folding=True,
            input_names=["images", "img_masks", "lang_tokens", "lang_masks", "state", "noise"],
            output_names=["actions"],
            dynamic_axes={
                "images": {0: "batch_size"},
                "img_masks": {0: "batch_size"},
                "lang_tokens": {0: "batch_size", 1: "seq_len"},
                "lang_masks": {0: "batch_size", 1: "seq_len"},
                "state": {0: "batch_size"},
                "noise": {0: "batch_size"},
                "actions": {0: "batch_size"},
            },
            dynamo=False,
        )
        postprocess_onnx_model(onnx_path, opts)

    return model


def export_checkpoint_to_onnx(
    checkpoint_dir: str,
    output_path: Path,
    opts: ExportOptions,
    config_name: str = "pi05_droid",
    num_steps: int = 10,
    precision: str = "fp16",
    num_calibration_samples: int = 32,
) -> torch.nn.Module:
    """Export a trained model checkpoint to ONNX format."""
    print(f"Loading model from: {checkpoint_dir}")
    print(f"Output path: {output_path}\n")

    if not os.path.exists(checkpoint_dir):
        raise FileNotFoundError(f"Checkpoint directory not found: {checkpoint_dir}")

    config = _config.get_config(config_name)
    policy = policy_config.create_trained_policy(config, checkpoint_dir)

    model = export_to_onnx(
        model=policy._model,
        output_path=output_path,
        model_config=config.model,
        opts=opts,
        num_steps=num_steps,
        precision=precision,
        config_obj=config,
        checkpoint_dir=checkpoint_dir,
        num_calibration_samples=num_calibration_samples,
    )

    print(f"  ONNX model saved to: {output_path}/onnx/")
    return model


def main():
    parser = argparse.ArgumentParser(
        description="Export PyTorch model to ONNX format (TensorRT-optimized)",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--checkpoint_dir",
        type=str,
        default="/root/.cache/openpi/openpi-assets/checkpoints/pi05_droid_pytorch",
        help="Path to PyTorch checkpoint directory",
    )
    parser.add_argument(
        "--output_path",
        type=str,
        default="/root/.cache/openpi/openpi-assets/checkpoints/pi05_droid_pytorch",
        help="Path to output directory for ONNX model",
    )
    parser.add_argument("--config_name", type=str, default="pi05_droid", help="Model configuration name")
    parser.add_argument("--num_steps", type=int, default=10, help="Number of denoising steps")
    parser.add_argument(
        "--precision",
        type=str.lower,
        default="fp16",
        choices=["fp16", "fp8"],
        help="Model precision type",
    )
    parser.add_argument(
        "--num_calibration_samples",
        type=int,
        default=32,
        help="Number of dataset samples to use for FP8 calibration",
    )
    parser.add_argument(
        "--enable_llm_nvfp4",
        action="store_true",
        help="Enable NVFP4 quantization for LLM layers (only applies with --precision fp8)",
    )
    parser.add_argument(
        "--quantize_attention_matmul",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="QDQ nodes for attention matmul operations; only applies with --precision fp8",
    )

    args = parser.parse_args()

    opts = ExportOptions(
        quantize_attention_matmul=args.quantize_attention_matmul,
        enable_llm_nvfp4=args.enable_llm_nvfp4,
    )

    try:
        export_checkpoint_to_onnx(
            checkpoint_dir=args.checkpoint_dir,
            output_path=Path(args.output_path),
            opts=opts,
            config_name=args.config_name,
            num_steps=args.num_steps,
            precision=args.precision,
            num_calibration_samples=args.num_calibration_samples,
        )
    except Exception as e:
        import traceback

        traceback.print_exc()
        print(f"Export failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

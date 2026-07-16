#!/usr/bin/env python3
import os
import time
import types
from functools import partial

import jax
import numpy as np
import torch
import deployment_scripts.trt_torch as trt


def install_attention_mask_dtype_fix(model):
    """Runtime patch (deployment-side only, openpi source untouched): make the
    additive attention mask match the attention compute dtype.

    pi0_pytorch._prepare_attention_masks_4d builds the mask with
    ``torch.where(bool, 0.0, -2.3819763e38)``, whose Python-float scalars yield a
    float32 tensor. The Q/K/V embeddings are cast to bfloat16, and sample_actions
    is wrapped in torch.compile(mode="max-autotune"); Inductor lowers attention to
    ``_scaled_dot_product_efficient_attention``, which strictly requires the bias
    dtype to equal the query dtype -> "invalid dtype for bias - should match
    query's dtype". Eager mode hides this because it can fall back to the math
    kernel. We cast the mask to the q_proj weight dtype (the actual attention
    compute dtype), keeping the exact -2.3819763e38 value. Disable with
    OPENPI_MASK_DTYPE_FIX=0.
    """
    if os.getenv("OPENPI_MASK_DTYPE_FIX", "1") == "0":
        return
    cls = type(model)
    if getattr(cls, "_trt_mask_dtype_fix_installed", False):
        return

    def _compute_dtype(self):
        try:
            return self.paligemma_with_expert.paligemma.language_model.layers[
                0
            ].self_attn.q_proj.weight.dtype
        except Exception:  # noqa: BLE001 - fall back to no-op cast target
            return None

    def _prepare_attention_masks_4d(self, att_2d_masks):
        att_2d_masks_4d = att_2d_masks[:, None, :, :]
        mask = torch.where(att_2d_masks_4d, 0.0, -2.3819763e38)
        dtype = _compute_dtype(self)
        if dtype is not None and mask.dtype != dtype:
            mask = mask.to(dtype)
        return mask

    cls._prepare_attention_masks_4d = _prepare_attention_masks_4d
    cls._trt_mask_dtype_fix_installed = True
    print("  [trt hooks] attention mask dtype fix installed (OPENPI_MASK_DTYPE_FIX=0 to disable)")


def _install_tokenize_cache():
    """Runtime patch (deployment-side only, openpi source untouched): cache
    PaligemmaTokenizer.tokenize results. The key is the raw prompt plus the
    256-bin discretized state (identical inputs -> identical tokens by
    construction), so caching is exact. Within an episode the instruction is
    fixed and binned state repeats often. Disable with OPENPI_TOKENIZE_CACHE=0.
    """
    from openpi.models import tokenizer as _tok

    cls = _tok.PaligemmaTokenizer
    if getattr(cls, "_trt_tokenize_cache_installed", False):
        return
    orig = cls.tokenize

    def cached_tokenize(self, prompt, state=None):
        if state is not None:
            disc = np.digitize(state, bins=np.linspace(-1, 1, 256 + 1)[:-1]) - 1
            key = prompt + "|" + " ".join(map(str, disc))
        else:
            key = prompt
        cache = getattr(self, "_trt_tok_cache", None)
        if cache is None:
            cache = self._trt_tok_cache = {}
        hit = cache.get(key)
        if hit is not None:
            return hit
        out = orig(self, prompt, state)
        if len(cache) >= 1024:  # bound memory over long deployments
            cache.clear()
        cache[key] = out
        return out

    cls.tokenize = cached_tokenize
    cls._trt_tokenize_cache_installed = True
    print("  [trt hooks] tokenize cache installed (OPENPI_TOKENIZE_CACHE=0 to disable)")


def _install_fast_infer(policy):
    """Instance-level Policy.infer replacement (deployment-side only): skips the
    flax-struct + beartype/jaxtyping Observation construction, which is pure
    validation overhead per call. pi0_tensorrt_sample_actions only
    reads plain attributes, so a SimpleNamespace stands in for Observation.
    Numerics are identical: the uint8->[-1,1] fp32 image conversion below
    mirrors Observation.from_dict verbatim. Disable with OPENPI_FAST_INFER=0.
    """

    def fast_infer(self, obs, *, noise=None):
        inputs = jax.tree.map(lambda x: x, obs)
        inputs = self._input_transform(inputs)
        inputs = jax.tree.map(lambda x: torch.from_numpy(np.array(x)).to(self._pytorch_device)[None, ...], inputs)
        images = inputs["image"]
        for key, img in images.items():
            if img.dtype == torch.uint8:
                images[key] = img.to(torch.float32).permute(0, 3, 1, 2) / 255.0 * 2.0 - 1.0
        observation = types.SimpleNamespace(
            images=images,
            image_masks=inputs["image_mask"],
            state=inputs["state"],
            tokenized_prompt=inputs.get("tokenized_prompt"),
            tokenized_prompt_mask=inputs.get("tokenized_prompt_mask"),
            token_ar_mask=inputs.get("token_ar_mask"),
            token_loss_mask=inputs.get("token_loss_mask"),
        )

        sample_kwargs = dict(self._sample_kwargs)
        if noise is not None:
            if not isinstance(noise, torch.Tensor):
                noise = torch.from_numpy(noise)
            noise = noise.to(self._pytorch_device)
            if noise.ndim == 2:
                noise = noise[None, ...]
            sample_kwargs["noise"] = noise

        start_time = time.monotonic()
        outputs = {
            "state": inputs["state"],
            "actions": self._sample_actions(self._pytorch_device, observation, **sample_kwargs),
        }
        model_time = time.monotonic() - start_time
        outputs = jax.tree.map(lambda x: np.asarray(x[0, ...].detach().cpu()), outputs)
        outputs = self._output_transform(outputs)
        outputs["policy_timing"] = {"infer_ms": model_time * 1000}
        return outputs

    policy.infer = types.MethodType(fast_infer, policy)
    print("  [trt hooks] fast infer installed: Observation validation bypassed (OPENPI_FAST_INFER=0 to disable)")


def pi0_tensorrt_sample_actions(self, device, observation, noise=None, num_steps=None):
    """
    TensorRT-accelerated sample_actions for π₀.5 models.

    This replaces the PyTorch model's sample_actions method with TensorRT inference.

    Args:
        device: CUDA device (e.g., "cuda:0")
        observation: Observation object with images, image_masks, tokenized_prompt, etc.
        noise: Optional noise tensor [batch, action_horizon, action_dim] (if None, generates random noise)
        num_steps: Denoising steps (not used, TensorRT engine uses compiled steps)

    Returns:
        actions: [batch, action_horizon, action_dim] float32 tensor
    """
    # Prepare inputs from observation
    # Convert images dict to concatenated tensor [batch, 9, 224, 224]
    image_keys = ["base_0_rgb", "left_wrist_0_rgb", "right_wrist_0_rgb"]
    images_list = []
    img_masks_list = []

    for key in image_keys:
        if key in observation.images:
            img = observation.images[key]
            # Ensure correct shape [batch, C, H, W]
            if img.dim() == 3:  # [C, H, W]
                img = img.unsqueeze(0)  # [1, C, H, W]
            images_list.append(img)

            # Get mask for this image
            mask = observation.image_masks.get(key, torch.ones(img.shape[0], dtype=torch.bool, device=device))
            if mask.dim() == 0:  # scalar
                mask = mask.unsqueeze(0)
            img_masks_list.append(mask)

    # Concatenate all images: [batch, 9, 224, 224]
    images = torch.cat(images_list, dim=1)
    # Stack masks: [batch, 3]
    img_masks = torch.stack(img_masks_list, dim=1)

    # Get language tokens and masks
    lang_tokens = observation.tokenized_prompt
    lang_masks = observation.tokenized_prompt_mask

    # Get state
    state = observation.state

    # Get batch size from images
    batch_size = images.shape[0]

    target_dtype = torch.float16

    # Handle noise input - generate if not provided
    if noise is None:
        # Get action shape from the model config (stored during setup)
        # Default to common values if not available
        action_horizon = getattr(self, "action_horizon", 10)
        action_dim = getattr(self, "action_dim", 32)
        noise = torch.normal(
            mean=0.0,
            std=1.0,
            size=(batch_size, action_horizon, action_dim),
            dtype=target_dtype,
            device=device,
        )
    else:
        # Ensure noise is a tensor
        if not isinstance(noise, torch.Tensor):
            noise = torch.from_numpy(noise)
        # Ensure correct batch dimension
        if noise.dim() == 2:  # [action_horizon, action_dim]
            noise = noise.unsqueeze(0)  # [1, action_horizon, action_dim]
        # Ensure correct dtype and device
        if noise.dtype != target_dtype:
            noise = noise.to(target_dtype)
        if not noise.is_cuda:
            noise = noise.cuda()
        noise = noise.contiguous()

    # Convert all tensors to the target dtype that matches the TensorRT engine
    if images.dtype != target_dtype:
        images = images.to(target_dtype)
    if state.dtype != target_dtype:
        state = state.to(target_dtype)

    # Ensure tensors are on CUDA
    images = images.cuda().contiguous()
    img_masks = img_masks.cuda().contiguous()
    lang_tokens = lang_tokens.cuda().contiguous()
    lang_masks = lang_masks.cuda().contiguous()
    state = state.cuda().contiguous()

    # Fit language inputs to the engine's compiled language length. Static
    # engines (lang dim pinned, e.g. 208) reject any other runtime length, so
    # pad up (token 0 + mask False: attention-masked, and position_ids come
    # from the pad-mask cumsum, so real-token positions are unaffected) or
    # truncate down with a warning. Dynamic engines (dim == -1) pass through.
    for _name, _shape, _dtype in self.trt_engine.in_meta:
        if _name == "lang_tokens" and len(_shape) == 2 and _shape[1] > 0:
            _eng_len = int(_shape[1])
            _cur_len = lang_tokens.shape[1]
            if _cur_len < _eng_len:
                _pad = _eng_len - _cur_len
                lang_tokens = torch.nn.functional.pad(lang_tokens, (0, _pad), value=0).contiguous()
                lang_masks = torch.nn.functional.pad(lang_masks, (0, _pad), value=False).contiguous()
            elif _cur_len > _eng_len:
                print(
                    f"WARNING: prompt length {_cur_len} exceeds engine language capacity "
                    f"{_eng_len}; truncating (tail tokens dropped)"
                )
                lang_tokens = lang_tokens[:, :_eng_len].contiguous()
                lang_masks = lang_masks[:, :_eng_len].contiguous()
            break

    # Set runtime shapes for dynamic inputs
    self.trt_engine.set_runtime_tensor_shape("images", images.shape)
    self.trt_engine.set_runtime_tensor_shape("img_masks", img_masks.shape)
    self.trt_engine.set_runtime_tensor_shape("lang_tokens", lang_tokens.shape)
    self.trt_engine.set_runtime_tensor_shape("lang_masks", lang_masks.shape)
    self.trt_engine.set_runtime_tensor_shape("state", state.shape)
    self.trt_engine.set_runtime_tensor_shape("noise", noise.shape)

    # Run TensorRT inference
    # The engine expects inputs in order: images, img_masks, lang_tokens, lang_masks, state, noise
    outputs = self.trt_engine(images, img_masks, lang_tokens, lang_masks, state, noise)

    # Extract actions from output dict
    actions = outputs["actions"]

    return actions


def setup_pi0_tensorrt_engine(policy, engine_path):
    """
    Setup TensorRT engine for π₀.5 model inference.

    This function loads a TensorRT engine and hooks it to replace the PyTorch
    sample_actions method, providing significant inference speedup.

    Args:
        policy: π₀.5 policy instance from policy_config.create_trained_policy()
        engine_path: Path to the .engine file (e.g., "model_fp16.engine")

    Returns:
        policy: Modified policy with TensorRT engine attached

    Example:
        >>> from openpi.training import config as _config
        >>> from openpi.policies import policy_config
        >>> config = _config.get_config("pi05_droid")
        >>> policy = policy_config.create_trained_policy(config, checkpoint_dir)
        >>> policy = setup_pi0_tensorrt_engine(
        ...     policy,
        ...     os.path.join(checkpoint_dir, "model_fp16.engine")
        ... )
        >>> # Now policy.infer() uses TensorRT automatically
        >>> actions = policy.infer(observation)["actions"]
    """
    print(f"Setting up π₀.5 TensorRT engine from {engine_path}...")

    # Get the model object (use _model for Policy class)
    model = policy._model if hasattr(policy, "_model") else policy.model

    # Load TensorRT engine
    model.trt_engine = trt.Engine(engine_path)

    # Store action dimensions for noise generation
    if hasattr(model, "config"):
        model.action_horizon = model.config.action_horizon
        model.action_dim = model.config.action_dim
        print(f"  Action dimensions: horizon={model.action_horizon}, dim={model.action_dim}")

    # Save the original sample_actions method (optional, for fallback)
    if not hasattr(model, "_original_sample_actions"):
        model._original_sample_actions = model.sample_actions

    # Replace sample_actions with TensorRT version
    trt_sample_actions = partial(pi0_tensorrt_sample_actions, model)
    model.sample_actions = trt_sample_actions

    # IMPORTANT: Also update policy._sample_actions if it exists
    # The Policy class caches a reference to model.sample_actions during __init__
    if hasattr(policy, "_sample_actions"):
        policy._sample_actions = trt_sample_actions

    print("TensorRT engine hooked to policy._model.sample_actions")

    # Delete PyTorch model components to save memory
    print("Deleting PyTorch model components to save memory...")

    # Delete PaliGemma components
    if hasattr(model, "paligemma_with_expert"):
        if hasattr(model.paligemma_with_expert, "paligemma"):
            del model.paligemma_with_expert.paligemma
        if hasattr(model.paligemma_with_expert, "gemma_expert"):
            del model.paligemma_with_expert.gemma_expert

    # Delete diffusion components (if present)
    if hasattr(model, "time_mlp_in"):
        del model.time_mlp_in
    if hasattr(model, "time_mlp_out"):
        del model.time_mlp_out
    if hasattr(model, "action_in_proj"):
        del model.action_in_proj
    if hasattr(model, "action_out_proj"):
        del model.action_out_proj

    torch.cuda.empty_cache()
    print("PyTorch components deleted, memory freed")

    # Deployment-side host-path hooks (openpi source untouched); both opt-out via env.
    if os.getenv("OPENPI_TOKENIZE_CACHE", "1") != "0":
        _install_tokenize_cache()
    if os.getenv("OPENPI_FAST_INFER", "1") != "0":
        _install_fast_infer(policy)

    return policy

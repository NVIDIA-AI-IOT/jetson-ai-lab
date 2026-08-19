#!/usr/bin/env bash
set -euo pipefail

# Keep the public entry point as a shell script while using Python for JSON,
# checkpoint metadata, and argument-safe subprocess orchestration.
exec python3 - "$@" <<'PY'
import argparse
import csv
import hashlib
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


EXPECTED_VERSION = "0.10.0"

VLM_MODEL_TYPES = {
    "qwen2_vl",
    "qwen3_vl",
    "qwen3_omni",
    "qwen3_omni_thinker",
    "qwen3_omni_moe",
    "qwen3_omni_moe_thinker",
    "qwen3_omni_next",
    "qwen3_omni_next_thinker",
    "qwen3_5",
    "qwen3_5_moe",
    "qwen2_5_vl",
    "internvl",
    "internvl_chat",
    "phi4mm",
    "phi4_multimodal",
    "gemma4",
    "gemma4_text",
    "gemma4_unified",
    "gemma4_unified_text",
    "alpamayo_r1",
    "NemotronH_Nano_VL_V2",
    "NemotronH_Nano_Omni_Reasoning_V3",
    "cosmos3_edge",
    "diffusion_gemma",
}

AUDIO_MODEL_TYPES = {
    "gemma4",
    "gemma4_text",
    "gemma4_unified",
    "gemma4_unified_text",
    "qwen3_asr",
    "qwen3_omni",
    "qwen3_omni_thinker",
    "qwen3_omni_moe",
    "qwen3_omni_moe_thinker",
    "qwen3_omni_next",
    "qwen3_omni_next_thinker",
    "NemotronH_Nano_Omni_Reasoning_V3",
}

OMNI_MODEL_TYPES = {
    "qwen3_omni",
    "qwen3_omni_moe",
    "qwen3_omni_next",
}

WEIGHTLESS_EXTERNAL_WEIGHT_KINDS = (
    "int4_ffn",
    "int4_moe",
    "nvfp4_moe",
    "lm_head",
    "fp16",
    "embedding",
)

PLE_MODEL_TYPES = {
    "gemma4",
    "gemma4_text",
    "gemma4_unified",
    "gemma4_unified_text",
}

@dataclass(frozen=True)
class ModelInfo:
    path: Path
    model_type: str
    has_llm: bool
    has_visual: bool
    has_audio: bool
    has_talker: bool
    has_code_predictor: bool
    has_code2wav: bool
    has_action: bool
    is_tts: bool
    tts_mode: str
    is_omni: bool
    is_moe: bool
    is_diffusion: bool
    is_cosmos3: bool
    is_cosmos3_policy: bool
    is_nemotron_asr: bool
    external_weights: tuple[str, ...]


def default_workspace() -> Path:
    data = Path("/data/edgellm")
    if data.parent.exists() and os.access(data.parent, os.W_OK):
        return data
    return Path.cwd() / "edgellm-workspace"


def find_edgellm_home(value: str) -> Path:
    candidates = []
    if value:
        candidates.append(Path(value))
    if os.environ.get("EDGELLM_HOME"):
        candidates.append(Path(os.environ["EDGELLM_HOME"]))
    candidates.extend((Path.cwd(), Path("/opt/TensorRT-Edge-LLM")))
    for candidate in candidates:
        if (candidate / "tensorrt_edgellm").is_dir() and (candidate / "CMakeLists.txt").is_file():
            return candidate.resolve()
    raise SystemExit("TensorRT Edge-LLM source was not found; pass --edgellm-home.")


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="run_model.sh",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        description="""Build, run, and benchmark one TensorRT Edge-LLM 0.10.0 checkpoint.

The default weightless builder skips ONNX and builds checkpoint-backed engines
for every registered component. Select --builder onnx for serving or the
supported ONNX workflow. Speculative decoding is never enabled implicitly.
""",
    )
    p.add_argument("model", help="Hugging Face model ID or local checkpoint directory")
    p.add_argument("--stage", choices=("all", "export", "build", "infer", "bench", "serve"), default="all")
    p.add_argument(
        "--builder",
        choices=("weightless", "onnx", "direct"),
        default="weightless",
        help=(
            "Engine frontend. 'weightless' is the experimental checkpoint-backed "
            "ONNX-less 0.10 builder; 'direct' is retained as an alias."
        ),
    )
    p.add_argument("--workspace", type=Path, default=default_workspace())
    p.add_argument("--edgellm-home", default="")
    p.add_argument("--revision", default=None, help="Hugging Face revision")
    p.add_argument("--local-files-only", action="store_true")

    spec = p.add_mutually_exclusive_group()
    spec.add_argument("--mtp", action="store_const", const="mtp", dest="spec_mode")
    spec.add_argument("--eagle3", metavar="DRAFT", dest="eagle3_draft")
    spec.add_argument("--dflash", metavar="DRAFT", dest="dflash_draft")
    spec.add_argument("--dspark", metavar="DRAFT", dest="dspark_draft")
    p.set_defaults(spec_mode="none")
    p.add_argument("--mtp-draft", default="", help="Matched Gemma4 MTP assistant checkpoint")
    p.add_argument("--draft-top-k", type=int)
    p.add_argument("--draft-steps", type=int)
    p.add_argument("--verify-size", type=int)
    p.add_argument("--dflash-block-size", type=int, default=0)
    p.add_argument("--diffusion-steps", type=int, default=16)
    p.add_argument("--policy-steps", type=int, default=4)
    p.add_argument("--policy-seed", type=int, default=0)
    p.add_argument("--policy-domain", default="droid_lerobot")
    p.add_argument("--policy-viewpoint", default="ego_view")
    p.add_argument("--policy-guidance", type=float, default=1.0)
    p.add_argument("--policy-video-subsample-factor", type=int, default=1)
    p.add_argument("--policy-action-chunk-size", type=int, default=0)
    p.add_argument("--asr-prompt-id", type=int)

    p.add_argument("--omni-root-model", default="", help="Original full Qwen3-Omni checkpoint for split NVFP4 export")
    p.add_argument("--talker-model", default="", help="Split Qwen3-Omni Talker checkpoint")

    p.add_argument("--input-json", type=Path, help="Existing Edge-LLM request JSON; passed through unchanged")
    p.add_argument("--prompt", action="append", default=[])
    p.add_argument("--system-prompt", default="")
    p.add_argument("--image", action="append", default=[], type=Path)
    p.add_argument("--audio", action="append", default=[], type=Path)
    p.add_argument("--video-frame", action="append", default=[], type=Path)
    p.add_argument("--video-fps", type=float, default=1.0)
    p.add_argument("--trajectory", default="", help="Trajectory JSON array or path to a JSON file")
    p.add_argument("--speaker", default="ryan")
    p.add_argument("--language", default="auto", help="Qwen3-TTS language conditioning")
    p.add_argument("--tts-instruct", default="", help="Qwen3-TTS style or VoiceDesign instruction")
    p.add_argument("--ref-audio", type=Path, help="Qwen3-TTS Base voice-clone reference audio")
    p.add_argument("--ref-text", default="", help="Exact transcript for Qwen3-TTS Base ICL voice cloning")
    p.add_argument("--text-only", action="store_true", help="Do not add bundled media to the default smoke request")
    p.add_argument("--audio-output", action="store_true", help="Generate speech output for Qwen3-Omni")
    thinking = p.add_mutually_exclusive_group()
    thinking.add_argument("--enable-thinking", action="store_true", dest="enable_thinking")
    thinking.add_argument("--disable-thinking", action="store_false", dest="enable_thinking")
    p.set_defaults(enable_thinking=None)

    p.add_argument("--batch-size", type=int, default=1, help="Offline request and benchmark batch size")
    p.add_argument("--max-batch-size", type=int, help="Engine profile batch size")
    p.add_argument("--max-input-len", type=int)
    p.add_argument("--max-kv-cache-capacity", type=int)
    p.add_argument("--max-generate-length", type=int, default=128)
    p.add_argument("--temperature", type=float, default=1.0)
    p.add_argument("--top-p", type=float, default=1.0)
    p.add_argument("--top-k", type=int, default=50)

    p.add_argument("--min-image-tokens", type=int)
    p.add_argument("--max-image-tokens", type=int)
    p.add_argument("--max-image-tokens-per-image", type=int)
    p.add_argument("--min-audio-time-steps", type=int, default=100)
    p.add_argument("--max-audio-time-steps", type=int, default=6000)
    p.add_argument("--max-code-length", type=int, default=2000)

    p.add_argument("--inference-warmup", type=int, default=10)
    p.add_argument("--bench-warmup", type=int, default=3)
    p.add_argument("--bench-iterations", type=int, default=10)
    p.add_argument("--prefill-len", type=int, help="Prefill benchmark length (default: up to 2048 within the engine profile)")
    p.add_argument("--past-kv-len", type=int, help="Decode benchmark prefix length (default: up to 2048 within KV capacity)")
    p.add_argument("--bench-output-len", type=int, default=128)
    p.add_argument("--image-size", default="1024x2048")

    p.add_argument("--output-json", type=Path)
    p.add_argument("--profile-json", type=Path)
    p.add_argument("--host", default="0.0.0.0")
    p.add_argument("--port", type=int, default=8000)
    p.add_argument(
        "--allowed-local-media-path",
        default="",
        help=(
            "Directory the HTTP server may read image, audio, or video files "
            "from. Local media is disabled unless this is set."
        ),
    )

    p.add_argument(
        "--externalize-weight", action="append", default=[],
        choices=("int4_ffn", "int4_moe", "nvfp4_moe", "lm_head"),
        help=(
            "Explicit external-weight subset. Omit it for the weightless "
            "builder's maximum checkpoint-backed policy."
        ),
    )
    p.add_argument("--export-arg", action="append", default=[], help="One extra exporter token; use --export-arg=--flag")
    p.add_argument(
        "--weightless-build-arg", "--direct-build-arg",
        action="append", default=[], dest="weightless_build_arg",
        help="One extra tensorrt-edgellm-build token",
    )
    p.add_argument("--llm-build-arg", action="append", default=[], help="One extra token for every llm_build command")
    p.add_argument("--talker-build-arg", action="append", default=[])
    p.add_argument("--code-predictor-build-arg", action="append", default=[])
    p.add_argument("--visual-build-arg", action="append", default=[])
    p.add_argument("--audio-build-arg", action="append", default=[])
    p.add_argument("--action-build-arg", action="append", default=[])
    p.add_argument("--inference-arg", action="append", default=[])
    p.add_argument(
        "--bench-arg",
        action="append",
        default=[],
        help="One extra llm_bench token; --profile adds a separate layer-profile pass",
    )

    p.add_argument("--force-export", action="store_true")
    p.add_argument("--force-build", action="store_true")
    p.add_argument("--no-inference", action="store_true")
    p.add_argument("--no-benchmark", action="store_true")
    p.add_argument("--skip-software-build", action="store_true")
    p.add_argument("--dry-run", action="store_true", help="Print and record commands without executing them")
    return p


def check_positive(name: str, value: int | None, allow_zero: bool = False) -> None:
    if value is None:
        return
    minimum = 0 if allow_zero else 1
    if value < minimum:
        raise SystemExit(f"{name} must be >= {minimum}, got {value}")


def system_memory_gib() -> float:
    try:
        for line in Path("/proc/meminfo").read_text(encoding="utf-8").splitlines():
            if line.startswith("MemTotal:"):
                return int(line.split()[1]) / (1024 * 1024)
    except (OSError, ValueError, IndexError):
        pass
    return 0.0


def validate_args(args: argparse.Namespace) -> None:
    for name in (
        "batch_size", "max_batch_size", "max_input_len", "max_kv_cache_capacity",
        "max_generate_length", "draft_top_k", "draft_steps", "verify_size",
        "min_image_tokens", "max_image_tokens", "max_image_tokens_per_image",
        "min_audio_time_steps", "max_audio_time_steps", "max_code_length",
        "bench_iterations", "prefill_len", "past_kv_len", "bench_output_len",
        "diffusion_steps",
        "policy_steps", "policy_video_subsample_factor",
    ):
        check_positive("--" + name.replace("_", "-"), getattr(args, name))
    check_positive("--dflash-block-size", args.dflash_block_size, allow_zero=True)
    check_positive("--inference-warmup", args.inference_warmup, allow_zero=True)
    check_positive("--bench-warmup", args.bench_warmup, allow_zero=True)
    check_positive("--policy-seed", args.policy_seed, allow_zero=True)
    check_positive("--policy-action-chunk-size", args.policy_action_chunk_size, allow_zero=True)
    check_positive("--asr-prompt-id", args.asr_prompt_id, allow_zero=True)
    if args.policy_guidance <= 0:
        raise SystemExit("--policy-guidance must be positive")
    if args.video_fps <= 0:
        raise SystemExit("--video-fps must be positive")
    if args.port < 1 or args.port > 65535:
        raise SystemExit("--port must be between 1 and 65535")
    if not re.fullmatch(r"[1-9][0-9]*x[1-9][0-9]*", args.image_size):
        raise SystemExit("--image-size must use positive HxW dimensions, for example 896x448")
    if args.input_json and any((
        args.prompt, args.system_prompt, args.image, args.audio, args.video_frame,
        args.trajectory, args.tts_instruct, args.ref_audio, args.ref_text,
        args.language != "auto",
    )):
        raise SystemExit("--input-json cannot be combined with prompt/media request-generation options")
    if args.ref_text and not args.ref_audio:
        raise SystemExit("--ref-text requires --ref-audio")
    if bool(args.omni_root_model) != bool(args.talker_model):
        raise SystemExit("--omni-root-model and --talker-model must be provided together")
    if args.eagle3_draft:
        args.spec_mode = "eagle3"
        args.draft_model = args.eagle3_draft
    elif args.dflash_draft:
        args.spec_mode = "dflash"
        args.draft_model = args.dflash_draft
    elif args.dspark_draft:
        args.spec_mode = "dspark"
        args.draft_model = args.dspark_draft
    else:
        args.draft_model = args.mtp_draft
    if args.spec_mode != "mtp" and args.mtp_draft:
        raise SystemExit("--mtp-draft requires --mtp")
    if args.spec_mode != "none" and args.omni_root_model:
        raise SystemExit("Split Qwen3-Omni export is not supported with speculative decoding")
    if args.builder == "weightless" and args.stage == "export":
        raise SystemExit("--stage export is not part of the weightless builder; use --stage build or all")
    if args.builder == "weightless" and args.stage == "serve":
        raise SystemExit(
            "TensorRT Edge-LLM 0.10.0 serving does not accept checkpoint-backed "
            "weightless engines; use --builder onnx for --stage serve"
        )
    if any(token == "--externalize-weights" for token in args.export_arg):
        raise SystemExit("Use --externalize-weight; automatic INT4/NVFP4 externalization must remain enabled")


def materialized_checkpoint_path(source: Path, root: Path, label: str) -> Path:
    return root / f"{safe_name(label)}-{short_hash(str(source), 8)}"


def materialize_checkpoint(source: Path, destination: Path) -> Path:
    marker = destination / ".edgellm-source.json"
    signature = {"source": str(source)}
    if marker.is_file() and load_json(marker) == signature:
        print(f"Reusing materialized checkpoint: {destination}", flush=True)
        return destination

    temporary = destination.with_name(f".{destination.name}.{os.getpid()}.tmp")
    shutil.rmtree(temporary, ignore_errors=True)
    temporary.mkdir(parents=True)
    linked = copied = 0
    try:
        for item in source.rglob("*"):
            relative = item.relative_to(source)
            target = temporary / relative
            if item.is_dir() and not item.is_symlink():
                target.mkdir(parents=True, exist_ok=True)
                continue
            resolved = item.resolve(strict=True)
            if not resolved.is_file():
                raise SystemExit(f"Checkpoint entry is not a regular file: {item}")
            target.parent.mkdir(parents=True, exist_ok=True)
            try:
                os.link(resolved, target)
                linked += 1
            except OSError:
                shutil.copy2(resolved, target)
                copied += 1
        (temporary / marker.name).write_text(
            json.dumps(signature, indent=2) + "\n", encoding="utf-8"
        )
        if destination.exists():
            shutil.rmtree(destination)
        os.replace(temporary, destination)
    finally:
        shutil.rmtree(temporary, ignore_errors=True)
    print(
        f"Materialized checkpoint with {linked} hard links and {copied} copies: {destination}",
        flush=True,
    )
    return destination


def resolve_checkpoint(
    model: str,
    revision: str | None,
    local_only: bool,
    metadata_only: bool = False,
    materialize_root: Path | None = None,
    materialize: bool = False,
) -> Path:
    local = Path(model).expanduser()
    if local.is_dir():
        source = local.resolve()
    else:
        try:
            from huggingface_hub import snapshot_download
        except ImportError as exc:
            raise SystemExit("huggingface_hub is required to resolve Hugging Face model IDs") from exc
        print(f"Resolving Hugging Face checkpoint: {model}", flush=True)
        options: dict[str, Any] = {}
        if metadata_only:
            options["allow_patterns"] = ["*.json"]
        source = Path(snapshot_download(
            repo_id=model,
            revision=revision,
            local_files_only=local_only,
            **options,
        )).resolve()

    if materialize_root is None:
        return source
    if source.parent.name == "snapshots":
        materialize_root = source.parent.parent / "materialized"
    destination = materialized_checkpoint_path(source, materialize_root, model)
    if materialize:
        materialize_root.mkdir(parents=True, exist_ok=True)
        return materialize_checkpoint(source, destination)
    marker = destination / ".edgellm-source.json"
    if marker.is_file() and load_json(marker) == {"source": str(source)}:
        return destination
    return source


def load_json(path: Path) -> dict[str, Any]:
    try:
        with path.open(encoding="utf-8") as stream:
            data = json.load(stream)
    except (OSError, json.JSONDecodeError) as exc:
        raise SystemExit(f"Failed to read JSON {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise SystemExit(f"Expected a JSON object in {path}")
    return data


def walk_values(value: Any):
    if isinstance(value, dict):
        for key, child in value.items():
            yield str(key).lower()
            yield from walk_values(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk_values(child)
    else:
        yield str(value).lower()


def normalize_tokenizers(root: Path) -> None:
    """Keep special tokens out of the regular decoder vocabulary."""
    for path in sorted(root.rglob("tokenizer.json")):
        data = load_json(path)
        model = data.get("model")
        added = data.get("added_tokens")
        if not isinstance(model, dict) or not isinstance(added, list):
            continue
        vocab = model.get("vocab")
        if not isinstance(vocab, dict):
            continue

        duplicates = []
        for token in added:
            if not isinstance(token, dict) or token.get("special") is not True:
                continue
            content = token.get("content")
            token_id = token.get("id")
            if isinstance(content, str) and vocab.get(content) == token_id:
                duplicates.append(content)
        if not duplicates:
            continue

        for content in duplicates:
            del vocab[content]
        temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
        temporary.unlink(missing_ok=True)
        try:
            temporary.write_text(json.dumps(data, ensure_ascii=False) + "\n", encoding="utf-8")
            os.replace(temporary, path)
        finally:
            temporary.unlink(missing_ok=True)
        print(
            f"Normalized {len(duplicates)} duplicated special tokens in {path}",
            flush=True,
        )


def ensure_processed_chat_template(source: Path, target: Path) -> None:
    """Create the C++ tokenizer artifact omitted by direct component builds."""
    output = target / "processed_chat_template.json"
    if output.is_file():
        return
    if not source.is_dir():
        raise SystemExit(f"Tokenizer source directory does not exist: {source}")

    from tensorrt_edgellm.chat_template import (
        process_chat_template,
        write_fallback_processed_chat_template,
    )

    target.mkdir(parents=True, exist_ok=True)
    process_chat_template(str(source), str(target))
    if not output.is_file():
        write_fallback_processed_chat_template(str(source), str(target))
    if not output.is_file():
        raise SystemExit(f"Failed to create C++ chat template artifact: {output}")
    print(f"Created C++ chat template artifact: {output}", flush=True)


MODEL_CHANNEL_PREFIX = re.compile(
    r"^(?:(?:thought|final)[ \t]*\r?\n)+", re.IGNORECASE
)


def normalize_model_channel(text: str) -> str:
    """Remove a decoded Gemma4 channel label while preserving response text."""
    return MODEL_CHANNEL_PREFIX.sub("", text, count=1)


def normalize_gemma4_output(path: Path, raw_path: Path, model_type: str) -> Path | None:
    """Keep the raw output and expose the provider's response content."""
    if model_type not in PLE_MODEL_TYPES or not path.is_file():
        return None

    output = load_json(path)
    responses = output.get("responses") if isinstance(output, dict) else None
    if not isinstance(responses, list):
        return None

    changed = 0
    for response in responses:
        if not isinstance(response, dict) or not isinstance(response.get("output_text"), str):
            continue
        original = response["output_text"]
        response["output_text"] = normalize_model_channel(original)
        changed += response["output_text"] != original
    if not changed:
        return None

    shutil.copy2(path, raw_path)
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    temporary.unlink(missing_ok=True)
    try:
        temporary.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)
    print(
        f"Normalized {changed} Gemma4 channel label(s); raw output: {raw_path}",
        flush=True,
    )
    return raw_path


def gemma4_server_launcher(model_root: Path) -> Path:
    """Write the server adapter for Gemma4 channel-labelled output."""
    path = model_root / "checkpoint-compat" / "gemma4_server.py"
    content = '''#!/usr/bin/env python3
import json
import re
import sys

from experimental.server import LLM


PREFIX = re.compile(r"^(?:(?:thought|final)[ \\t]*\\r?\\n)+", re.IGNORECASE)
STREAM_PREFIXES = ("thought\\n", "final\\n", "thought\\r\\n", "final\\r\\n")


def normalize(text):
    return PREFIX.sub("", text, count=1)


class Response:
    def __init__(self, wrapped):
        self._wrapped = wrapped

    @property
    def output_texts(self):
        return [normalize(text) for text in self._wrapped.output_texts]

    def __getattr__(self, name):
        return getattr(self._wrapped, name)


class Runtime:
    def __init__(self, wrapped):
        self._wrapped = wrapped

    def handle_request(self, request):
        return Response(self._wrapped.handle_request(request))

    def __getattr__(self, name):
        return getattr(self._wrapped, name)


original_generate_stream = LLM.generate_stream


def generate_stream(self, *args, **kwargs):
    pending = ""
    held_ids = []
    held_logprobs = []
    undecided = True
    for delta in original_generate_stream(self, *args, **kwargs):
        if not undecided:
            if held_ids:
                delta.token_ids = held_ids + list(delta.token_ids)
                delta.logprobs = held_logprobs + list(delta.logprobs)
                held_ids = []
                held_logprobs = []
            yield delta
            continue

        pending += delta.text
        held_ids.extend(delta.token_ids)
        held_logprobs.extend(delta.logprobs)
        while True:
            lowered = pending.lower()
            if not delta.finished and any(
                prefix.startswith(lowered) for prefix in STREAM_PREFIXES
            ):
                break
            matched = next(
                (prefix for prefix in STREAM_PREFIXES if lowered.startswith(prefix)),
                None,
            )
            if matched is None:
                break
            pending = pending[len(matched):]
        lowered = pending.lower()
        if not delta.finished and any(prefix.startswith(lowered) for prefix in STREAM_PREFIXES):
            continue

        visible = pending
        undecided = False
        delta.text = visible
        delta.token_ids = held_ids
        delta.logprobs = held_logprobs
        held_ids = []
        held_logprobs = []
        if delta.text or delta.finished:
            yield delta


LLM.generate_stream = generate_stream
options = json.loads(sys.argv[1])
llm = LLM(**options)
llm._runtime = Runtime(llm._runtime)
serve_options = json.loads(sys.argv[2])
llm.serve(**serve_options)
'''
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.is_file() or path.read_text(encoding="utf-8") != content:
        path.write_text(content, encoding="utf-8")
    return path


def prepare_gemma4_checkpoint(path: Path, model_root: Path, model_type: str) -> tuple[Path, tuple[str, ...]]:
    """Create a non-mutating view for incomplete community Gemma4 metadata."""
    if model_type not in PLE_MODEL_TYPES:
        return path, ()

    replacements: dict[str, dict[str, Any]] = {}
    compatibility: list[str] = []
    for name in ("config.json", "hf_quant_config.json", "quantization_config.json", "quant_cfg.json"):
        source = path / name
        if not source.is_file():
            continue
        data = load_json(source)
        changed = False
        vision = data.get("vision_config")
        if (
            name == "config.json"
            and model_type == "gemma4_unified"
            and isinstance(vision, dict)
            and "model_patch_size" not in vision
        ):
            patch_size = vision.get("patch_size")
            pooling_kernel_size = vision.get("pooling_kernel_size")
            if not isinstance(patch_size, int) or not isinstance(pooling_kernel_size, int):
                raise SystemExit(
                    "Gemma4 Unified vision_config must define integer patch_size and "
                    "pooling_kernel_size"
                )
            vision["model_patch_size"] = patch_size * pooling_kernel_size
            changed = True
            compatibility.append("unified_model_patch_size")

        audio = data.get("audio_config")
        if (
            name == "config.json"
            and model_type == "gemma4_unified"
            and isinstance(audio, dict)
            and "output_proj_dims" not in audio
        ):
            output_proj_dims = audio.get("audio_embed_dim", audio.get("hidden_size"))
            if not isinstance(output_proj_dims, int):
                raise SystemExit(
                    "Gemma4 Unified audio_config must define integer audio_embed_dim "
                    "or hidden_size"
                )
            audio["output_proj_dims"] = output_proj_dims
            changed = True
            compatibility.append("unified_audio_output_proj_dims")
        if changed:
            replacements[name] = data

    if not replacements and not compatibility:
        return path, ()

    signature = {
        "source": str(path),
        "compatibility": compatibility,
        "sidecars": {
            name: hashlib.sha256(
                json.dumps(data, sort_keys=True, separators=(",", ":")).encode()
            ).hexdigest()
            for name, data in replacements.items()
        },
    }
    view = model_root / "checkpoint-compat" / f"gemma4-{short_hash(signature, 8)}"
    marker = view / ".edgellm-compat.json"
    if marker.is_file() and load_json(marker) == signature:
        print(f"Using Gemma4 compatibility view: {view}", flush=True)
        return view, tuple(compatibility)

    temporary = view.with_name(f".{view.name}.{os.getpid()}.tmp")
    shutil.rmtree(temporary, ignore_errors=True)
    temporary.mkdir(parents=True)
    try:
        for source in path.iterdir():
            destination = temporary / source.name
            if source.name in replacements:
                destination.write_text(
                    json.dumps(replacements[source.name], indent=2) + "\n",
                    encoding="utf-8",
                )
            else:
                os.symlink(source.resolve(), destination, target_is_directory=source.is_dir())
        marker = temporary / marker.name
        marker.write_text(json.dumps(signature, indent=2) + "\n", encoding="utf-8")
        shutil.rmtree(view, ignore_errors=True)
        os.replace(temporary, view)
    finally:
        shutil.rmtree(temporary, ignore_errors=True)

    print(
        "Prepared TensorRT Edge-LLM Gemma4 compatibility view "
        f"({', '.join(compatibility)}): {view}",
        flush=True,
    )
    return view, tuple(compatibility)


def has_moe_experts(value: Any) -> bool:
    moe_keys = {"num_experts", "num_local_experts", "n_routed_experts", "moe_intermediate_size"}
    if isinstance(value, dict):
        for key, child in value.items():
            if str(key).lower() in moe_keys:
                try:
                    if int(child) > 0:
                        return True
                except (TypeError, ValueError):
                    pass
            if has_moe_experts(child):
                return True
    elif isinstance(value, list):
        return any(has_moe_experts(child) for child in value)
    return False


def checkpoint_uses_fp8_kv_cache(path: Path) -> bool:
    """Return whether checkpoint metadata requests an FP8 KV cache."""

    def kv_metadata_is_fp8(value: Any, kv_context: bool = False) -> bool:
        if isinstance(value, dict):
            if kv_context:
                kind = str(value.get("type", "")).lower()
                try:
                    if kind == "float" and int(value.get("num_bits", 0)) == 8:
                        return True
                except (TypeError, ValueError):
                    pass
            for key, child in value.items():
                normalized = re.sub(r"[^a-z0-9]+", "_", str(key).lower())
                child_context = kv_context or ("kv" in normalized and "cache" in normalized)
                if child_context and isinstance(child, str) and any(
                    marker in child.lower() for marker in ("fp8", "e4m3")
                ):
                    return True
                if kv_metadata_is_fp8(child, child_context):
                    return True
        elif isinstance(value, list):
            return any(kv_metadata_is_fp8(child, kv_context) for child in value)
        return False

    metadata = [load_json(path / "config.json")]
    for name in ("hf_quant_config.json", "quantization_config.json", "quant_cfg.json"):
        candidate = path / name
        if candidate.is_file():
            metadata.append(load_json(candidate))
    return any(kv_metadata_is_fp8(item) for item in metadata)


def inspect_model(path: Path, extra_external: list[str]) -> ModelInfo:
    config_path = path / "config.json"
    if not config_path.is_file():
        raise SystemExit(f"Checkpoint has no config.json: {path}")
    config = load_json(config_path)
    model_type = str(config.get("model_type", ""))
    text_config = config.get("text_config") if isinstance(config.get("text_config"), dict) else {}
    thinker = config.get("thinker_config") if isinstance(config.get("thinker_config"), dict) else {}

    metadata: list[Any] = [config]
    quant_sidecars: dict[str, dict[str, Any]] = {}
    for name in ("hf_quant_config.json", "quantization_config.json", "quant_cfg.json"):
        candidate = path / name
        if candidate.is_file():
            quant_sidecars[name] = load_json(candidate)
            metadata.append(quant_sidecars[name])

    embedded_quant = config.get("quantization_config")
    if not isinstance(embedded_quant, dict):
        embedded_quant = {}
    hf_quant = quant_sidecars.get("hf_quant_config.json", {}).get("quantization", {})
    if not isinstance(hf_quant, dict):
        hf_quant = {}
    quant_declared = bool(embedded_quant or quant_sidecars)
    quant_algo = hf_quant.get("quant_algo") or embedded_quant.get("quant_algo")
    quant_method = str(embedded_quant.get("quant_method", "")).lower()
    normalized_algo = str(quant_algo or "").upper()
    modelopt_algo = normalized_algo == "MIXED_PRECISION" or any(
        marker in normalized_algo
        for marker in ("FP8", "MXFP8", "FP4", "NVFP4", "AWQ", "INT4_AWQ", "W8A8", "INT8")
    )
    if quant_declared and not (modelopt_algo or quant_method in {"awq", "gptq"}):
        description = (
            normalized_algo
            or quant_method
            or str(embedded_quant.get("format", "unknown"))
        )
        raise SystemExit(
            f"Checkpoint quantization {description!r} is not supported by TensorRT "
            f"Edge-LLM {EXPECTED_VERSION}; use a ModelOpt quant_algo, AWQ, or GPTQ checkpoint."
        )
    words = set()
    for item in metadata:
        words.update(walk_values(item))
    flattened = " ".join(sorted(words))

    is_nvfp4 = "nvfp4" in flattened or "nv_fp4" in flattened
    is_int4 = not is_nvfp4 and any(token in flattened for token in ("int4", "w4a16", "gptq", "awq"))
    is_moe = "moe" in model_type.lower() or has_moe_experts(config)

    external = set(extra_external)
    if is_int4:
        external.add("int4_ffn")
        if is_moe:
            external.add("int4_moe")
    if is_nvfp4 and is_moe:
        external.add("nvfp4_moe")

    has_visual = model_type == "alpamayo_r1" or (
        model_type in VLM_MODEL_TYPES
        and bool(config.get("vision_config") or thinker.get("vision_config") or config.get("vision_model_config"))
    )
    has_audio = model_type in AUDIO_MODEL_TYPES and bool(config.get("audio_config") or thinker.get("audio_config") or config.get("sound_config"))
    is_tts = model_type == "qwen3_tts"
    tts_mode = str(config.get("tts_model_type", "")).lower() if is_tts else ""
    is_omni = model_type in OMNI_MODEL_TYPES
    is_diffusion = model_type in {"diffusion_gemma", "diffusion_gemma_text"}
    is_cosmos3_policy = model_type in {"cosmos3_omni", "cosmos3"}
    is_cosmos3 = model_type == "cosmos3_edge" or is_cosmos3_policy
    is_nemotron_asr = model_type == "nemotron3_5_asr"
    has_visual = has_visual or (
        (is_diffusion or model_type == "cosmos3_edge")
        and isinstance(config.get("vision_config"), dict)
    )
    has_talker = is_tts or is_omni
    has_cp = is_tts or is_omni

    return ModelInfo(
        path=path,
        model_type=model_type,
        has_llm=not (is_tts or is_cosmos3_policy or is_nemotron_asr),
        has_visual=has_visual,
        has_audio=has_audio or is_nemotron_asr,
        has_talker=has_talker,
        has_code_predictor=has_cp,
        has_code2wav=is_tts or is_omni,
        has_action=model_type == "alpamayo_r1",
        is_tts=is_tts,
        tts_mode=tts_mode,
        is_omni=is_omni,
        is_moe=is_moe,
        is_diffusion=is_diffusion,
        is_cosmos3=is_cosmos3,
        is_cosmos3_policy=is_cosmos3_policy,
        is_nemotron_asr=is_nemotron_asr,
        external_weights=tuple(sorted(external)),
    )


def short_hash(value: Any, length: int = 10) -> str:
    encoded = json.dumps(value, sort_keys=True, default=str, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()[:length]


def safe_name(value: str) -> str:
    name = re.sub(r"[^A-Za-z0-9._-]+", "-", value.rstrip("/").split("/")[-1]).strip("-.")
    return (name or "model")[:64]


def shell_join(command: list[str]) -> str:
    return shlex.join(str(item) for item in command)


def update_symlink(link: Path, target: Path) -> None:
    if link.is_symlink() or link.is_file():
        link.unlink()
    elif link.exists():
        return
    link.symlink_to(target, target_is_directory=True)


class CommandRunner:
    def __init__(self, command_file: Path, log_file: Path, dry_run: bool):
        self.command_file = command_file
        self.log_file = log_file
        self.dry_run = dry_run
        command_file.parent.mkdir(parents=True, exist_ok=True)
        command_file.write_text("#!/usr/bin/env bash\nset -euo pipefail\n\n", encoding="utf-8")

    def run(
        self,
        command: list[str],
        cwd: Path | None = None,
        capture_file: Path | None = None,
    ) -> None:
        rendered = shell_join(command)
        if cwd:
            recorded = f"(cd {shlex.quote(str(cwd))} && {rendered})"
        else:
            recorded = rendered
        with self.command_file.open("a", encoding="utf-8") as stream:
            stream.write(recorded + "\n")
        print(f"\n+ {recorded}", flush=True)
        if self.dry_run:
            return
        self.log_file.parent.mkdir(parents=True, exist_ok=True)
        if capture_file:
            capture_file.parent.mkdir(parents=True, exist_ok=True)
        with self.log_file.open("a", encoding="utf-8") as log:
            log.write(f"\n+ {recorded}\n")
            process = subprocess.Popen(
                command,
                cwd=str(cwd) if cwd else None,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                errors="replace",
                bufsize=1,
            )
            assert process.stdout is not None
            with (
                capture_file.open("w", encoding="utf-8")
                if capture_file
                else open(os.devnull, "w", encoding="utf-8")
            ) as capture:
                for line in process.stdout:
                    sys.stdout.write(line)
                    sys.stdout.flush()
                    log.write(line)
                    log.flush()
                    if capture_file:
                        capture.write(line)
                        capture.flush()
            returncode = process.wait()
        if returncode:
            raise SystemExit(f"Command failed with exit code {returncode}: {rendered}")


def summarize_benchmarks(
    bench_root: Path,
    run_root: Path,
    profile_json: Path | None,
    batch_size: int,
    include_runtime_summary: bool = False,
) -> Path:
    runtime_profile = None
    if profile_json and profile_json.is_file():
        runtime_profile = load_json(profile_json)

    rows: list[dict[str, Any]] = []
    for result in sorted(bench_root.rglob("e2e_*.csv")):
        with result.open(newline="", encoding="utf-8") as stream:
            for row in csv.DictReader(stream):
                row["result_file"] = str(result.relative_to(run_root))
                rows.append(row)

    if include_runtime_summary:
        if not runtime_profile:
            raise SystemExit("The model runtime produced no profile for end-to-end benchmarking")
        prefill = runtime_profile.get("prefill", {})
        generation_key = "generation"
        generation = runtime_profile.get(generation_key, {})
        if not generation:
            for candidate in ("mtp_generation", "eagle_generation"):
                if runtime_profile.get(candidate):
                    generation_key = candidate
                    generation = runtime_profile[candidate]
                    break
        if generation_key == "generation":
            generated_tokens = generation.get("generated_tokens")
            generation_rate = generation.get("tokens_per_second")
            generation_per_token_ms = generation.get("average_time_per_token_ms")
        else:
            generated_tokens = generation.get("total_generated_tokens")
            generation_rate = generation.get("overall_tokens_per_second_excluding_base_prefill")
            generation_per_token_ms = (
                1000.0 / generation_rate
                if isinstance(generation_rate, (int, float)) and generation_rate > 0
                else None
            )
        required = (
            (
                "prefill.average_time_per_run_ms",
                prefill.get("average_time_per_run_ms"),
            ),
            (
                "prefill.average_tokens_per_run",
                prefill.get("average_tokens_per_run"),
            ),
            ("prefill.tokens_per_second", prefill.get("tokens_per_second")),
            (
                f"{generation_key}.average_time_per_token_ms",
                generation_per_token_ms,
            ),
            (f"{generation_key}.generated_tokens", generated_tokens),
            (f"{generation_key}.tokens_per_second", generation_rate),
        )
        invalid = [
            name
            for name, value in required
            if not isinstance(value, (int, float)) or value <= 0
        ]
        if invalid:
            raise SystemExit(f"The model runtime profile is missing benchmark values: {', '.join(invalid)}")

        assert profile_json is not None
        try:
            profile_result_file = str(profile_json.relative_to(run_root))
        except ValueError:
            profile_result_file = str(profile_json)
        prefill_tokens = float(prefill["average_tokens_per_run"])
        generated_tokens = int(generated_tokens)
        generation_ms = float(generation_per_token_ms) * generated_tokens
        runtime_rows = [
            {
                "mode": "prefill",
                "batch_size": str(batch_size),
                "osl": "1",
                "e2e_time_ms": f"{float(prefill['average_time_per_run_ms']):.4f}",
                "per_token_ms": f"{float(prefill.get('average_time_per_token_ms', 1000.0 / float(prefill['tokens_per_second']))):.4f}",
                "throughput_tps": f"{float(prefill['tokens_per_second']):.4f}",
                "input_len": str(int(prefill_tokens)),
                "result_file": profile_result_file,
                "source": "model_runtime_profile",
            },
            {
                "mode": "decode",
                "batch_size": str(batch_size),
                "osl": str(generated_tokens),
                "e2e_time_ms": f"{generation_ms:.4f}",
                "per_token_ms": f"{float(generation_per_token_ms):.4f}",
                "throughput_tps": f"{float(generation_rate):.4f}",
                "past_kv_len": str(int(prefill_tokens)),
                "result_file": profile_result_file,
                "source": "model_runtime_profile",
                "profile_section": generation_key,
            },
        ]
        rows = [*runtime_rows, *rows]
    elif not rows:
        raise SystemExit(f"llm_bench produced no E2E timing CSV under {bench_root}")

    summary = run_root / "benchmark_summary.json"
    summary.write_text(json.dumps({
        "llm_bench": rows,
        "inference_profile": runtime_profile,
    }, indent=2) + "\n", encoding="utf-8")

    print("\nPerformance summary", flush=True)
    for row in rows:
        mode = row.get("mode", "unknown")
        batch = row.get("batch_size", "?")
        e2e_ms = row.get("e2e_time_ms", "?")
        rate = row.get("throughput_tps") or row.get("trees_per_second") or "?"
        unit = "trees/s" if row.get("trees_per_second") else "tokens/s"
        shape = []
        for key in (
            "input_len", "past_kv_len", "osl", "image_height", "image_width",
            "verify_tree_size", "draft_tree_size",
        ):
            value = row.get(key)
            if value not in (None, ""):
                shape.append(f"{key}={value}")
        dimensions = " ".join(shape)
        print(
            f"  {mode:<24} BS={batch:<3} {dimensions:<48} "
            f"{e2e_ms:>12} ms  {rate:>12} {unit}",
            flush=True,
        )
    if runtime_profile:
        for stage in runtime_profile.get("stages", []):
            stage_id = stage.get("stage_id", "")
            if stage_id not in {
                "vision_encoder",
                "audio_encoder",
                "multimodal_processing",
                "action_model",
            }:
                continue
            average_ms = stage.get("average_time_per_run_ms")
            if not isinstance(average_ms, (int, float)) or average_ms <= 0:
                continue
            print(
                f"  {stage_id:<24} BS={batch_size:<3} "
                f"{'runtime input':<48} {average_ms:>12.4f} ms  "
                f"{1000.0 / average_ms:>12.2f} runs/s",
                flush=True,
            )
    print(f"  summary                  {summary}", flush=True)
    return summary


def normalize_runtime_profile(path: Path, input_path: Path, info: ModelInfo) -> None:
    """Map legacy stage names to their model-specific contract."""
    if info.model_type != "gemma4" or not info.has_audio or not path.is_file():
        return

    requests = load_json(input_path).get("requests", [])
    has_audio_input = any(
        isinstance(content, dict) and content.get("type") == "audio"
        for request in requests
        if isinstance(request, dict)
        for message in request.get("messages", [])
        if isinstance(message, dict)
        for content in (message.get("content") if isinstance(message.get("content"), list) else [])
    )
    if not has_audio_input:
        return

    profile = load_json(path)
    stages = profile.get("stages", [])
    if not isinstance(stages, list) or any(
        isinstance(stage, dict) and stage.get("stage_id") == "audio_encoder"
        for stage in stages
    ):
        return

    legacy = next(
        (
            stage
            for stage in stages
            if isinstance(stage, dict) and stage.get("stage_id") == "multimodal_processing"
        ),
        None,
    )
    if legacy is None:
        raise SystemExit("Gemma4 audio inference produced no runtime timing stage")

    legacy["source_stage_id"] = legacy["stage_id"]
    legacy["stage_id"] = "audio_encoder"
    path.write_text(json.dumps(profile, indent=2) + "\n", encoding="utf-8")
    print(
        "Normalized the Gemma4 legacy multimodal_processing timing "
        "to audio_encoder.",
        flush=True,
    )


def export_tool(
    home: Path, model_root: Path, compatibility: tuple[str, ...]
) -> list[str]:
    installed = shutil.which("tensorrt-edgellm-export")
    if installed:
        return [installed]
    return [sys.executable, "-m", "tensorrt_edgellm.scripts.export"]


def add_external_args(command: list[str], info: ModelInfo) -> None:
    if info.external_weights:
        command.extend(("--externalize-weights", *info.external_weights))


def component_paths(info: ModelInfo, root: Path) -> dict[str, Path]:
    if info.is_diffusion:
        return {
            "llm": root / "dllm",
            "talker": root / "talker",
            "code_predictor": root / "code_predictor",
            "visual": root / "visual",
            "audio": root / "audio",
            "code2wav": root / "code2wav",
            "action": root / "action",
            "rnnt_decoder": root / "rnnt_decoder",
            "mtp_draft": root / "mtp_draft",
        }
    if info.is_omni:
        return {
            "llm": root / "llm/thinker",
            "talker": root / "llm/talker",
            "code_predictor": root / "llm/code_predictor",
            "visual": root / "vision",
            "audio": root / "audio/audio_encoder",
            "code2wav": root / "audio/code2wav",
            "action": root / "action",
            "rnnt_decoder": root / "rnnt_decoder",
            "mtp_draft": root / "mtp_draft",
        }
    return {
        "llm": root / "llm",
        "talker": root / ("llm" if info.is_tts else "talker"),
        "code_predictor": root / "code_predictor",
        "visual": root / "visual",
        "audio": root / "audio",
        "code2wav": root / "code2wav",
        "action": root / "action",
        "rnnt_decoder": root / "rnnt_decoder",
        "mtp_draft": root / "mtp_draft",
    }


def write_default_input(
    path: Path,
    args: argparse.Namespace,
    info: ModelInfo,
    home: Path,
) -> None:
    gemma_audio_prompt = (
        "Transcribe the following speech segment in its original language. "
        "Follow these specific instructions for formatting the answer:\n"
        "* Only output the transcription, with no newlines.\n"
        "* When transcribing numbers, write the digits, i.e. write 1.7 and not "
        "one point seven, and write 3 instead of three."
    )
    prompts = list(args.prompt)
    images = [item.expanduser().resolve() for item in args.image]
    audios = [item.expanduser().resolve() for item in args.audio]
    frames = [item.expanduser().resolve() for item in args.video_frame]
    trajectory = args.trajectory
    user_supplied = bool(prompts or images or audios or frames or trajectory or args.system_prompt)
    split_modality_smoke = False

    sample_image = home / "examples/multimodal/pics/woman_and_dog.jpeg"
    sample_audio = home / "examples/multimodal/audio/6930-75918-0000.flac"
    if not user_supplied and not args.text_only:
        if info.has_action:
            images = [sample_image] * 16
            trajectory = json.dumps([[0.0, 0.0, 0.0]] * 16)
        elif info.has_visual:
            images = [sample_image]
        if info.has_audio:
            audios = [sample_audio]
        split_modality_smoke = info.has_visual and info.has_audio

    for media in (*images, *audios, *frames):
        if not media.is_file():
            raise SystemExit(f"Input media does not exist: {media}")

    if not prompts and not split_modality_smoke:
        if info.is_tts:
            prompts = ["Hello, this is TensorRT Edge-LLM running on NVIDIA Jetson."]
        elif info.has_action:
            prompts = ["Explain the driving scene, then predict the future trajectory."]
        elif images:
            prompts = ["Describe this image in detail."]
        elif audios:
            prompts = [
                gemma_audio_prompt
                if info.model_type in PLE_MODEL_TYPES
                else "Transcribe this audio."
            ]
        else:
            prompts = ["What is the capital of the United States?"]
    trajectory_data = None
    if trajectory:
        raw = trajectory
        if not trajectory.lstrip().startswith("["):
            trajectory_path = Path(trajectory).expanduser()
            if trajectory_path.is_file():
                raw = trajectory_path.read_text(encoding="utf-8")
        try:
            trajectory_data = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise SystemExit(f"Invalid --trajectory JSON: {exc}") from exc
        if not isinstance(trajectory_data, list):
            raise SystemExit("--trajectory must contain a JSON array")

    if split_modality_smoke:
        request_specs = [
            ("Describe this image in detail.", images, [], [], None)
            for _ in range(args.batch_size)
        ]
        request_specs.extend(
            (
                gemma_audio_prompt
                if info.model_type in PLE_MODEL_TYPES
                else "Transcribe this audio.",
                [],
                audios,
                [],
                None,
            )
            for _ in range(args.batch_size)
        )
    else:
        if len(prompts) == 1 and args.batch_size > 1:
            prompts *= args.batch_size
        request_specs = [
            (prompt, images, audios, frames, trajectory_data)
            for prompt in prompts
        ]

    requests = []
    for prompt, request_images, request_audios, request_frames, request_trajectory in request_specs:
        if info.is_tts:
            messages = [{"role": "assistant", "content": prompt}]
        else:
            messages = []
            if args.system_prompt:
                messages.append({"role": "system", "content": args.system_prompt})
            content: list[dict[str, Any]] = []
            content.extend({"type": "image", "image": str(item)} for item in request_images)
            if request_frames:
                content.append({
                    "type": "video",
                    "frames": [str(item) for item in request_frames],
                    "fps": args.video_fps,
                })
            gemma_audio = info.model_type in PLE_MODEL_TYPES and bool(request_audios)
            if gemma_audio and prompt:
                content.append({"type": "text", "text": prompt})
            content.extend(
                {"type": "audio", "audio": str(item)} for item in request_audios
            )
            if request_trajectory is not None:
                content.append({"type": "trajectory", "trajectory": request_trajectory})
            if prompt and not gemma_audio:
                content.append({"type": "text", "text": prompt})
            messages.append({"role": "user", "content": content if len(content) != 1 or content[0]["type"] != "text" else prompt})
        request: dict[str, Any] = {"messages": messages}
        if info.is_tts:
            request["speaker"] = args.speaker
            request["language"] = args.language
            if args.tts_instruct:
                request["instruct"] = args.tts_instruct
            elif info.tts_mode == "voice_design":
                request["instruct"] = "Speak clearly in a warm, natural voice."
            if info.tts_mode == "base":
                reference = (
                    args.ref_audio.expanduser().resolve()
                    if args.ref_audio
                    else sample_audio
                )
                if not reference.is_file():
                    raise SystemExit(f"Reference audio does not exist: {reference}")
                request["ref_audio"] = str(reference)
                if args.ref_text:
                    request["ref_text"] = args.ref_text
        requests.append(request)

    payload: dict[str, Any] = {
        "batch_size": args.batch_size,
        "temperature": args.temperature,
        "top_p": args.top_p,
        "top_k": args.top_k,
        "max_generate_length": args.max_generate_length,
        "enable_thinking": bool(args.enable_thinking),
        "requests": requests,
    }
    if info.is_tts:
        payload.update({
            "talker_temperature": args.temperature,
            "talker_top_k": args.top_k,
            "talker_top_p": args.top_p,
            "repetition_penalty": 1.05,
            "max_audio_length": 4096,
            "speaker": args.speaker,
            "language": args.language,
        })
    if info.is_diffusion:
        payload["diffusion_config"] = {
            "max_denoising_steps": args.diffusion_steps,
        }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def cosmos_policy_request(
    args: argparse.Namespace, home: Path
) -> tuple[str, str, list[str], dict[str, Any]]:
    if args.input_json or args.audio or args.trajectory or args.system_prompt:
        raise SystemExit(
            "Cosmos3 policy accepts --image or --video-frame plus --prompt; "
            "it does not use the LLM request JSON contract"
        )
    images = [item.expanduser().resolve() for item in args.image]
    frames = [item.expanduser().resolve() for item in args.video_frame]
    if images and frames:
        raise SystemExit("Cosmos3 policy accepts either --image or --video-frame, not both")
    if len(images) > 1:
        raise SystemExit("Cosmos3 policy accepts one conditioning image")
    if not images and not frames:
        images = [home / "examples/multimodal/pics/woman_and_dog.jpeg"]
    media = images or frames
    for path in media:
        if not path.is_file():
            raise SystemExit(f"Input media does not exist: {path}")

    prompts = list(args.prompt) or ["Move toward the requested object and grasp it safely."]
    if len(prompts) == 1 and args.batch_size > 1:
        prompts *= args.batch_size
    if len(prompts) != args.batch_size:
        raise SystemExit(
            "Cosmos3 policy requires one --prompt per batch item, or one prompt "
            "that can be repeated across --batch-size"
        )
    if frames:
        source_option = "--video"
        source_value = ",".join(str(path) for path in frames)
    else:
        source_option = "--image"
        source_value = str(images[0])
    payload = {
        "contract": "cosmos3_policy",
        "source": {"type": source_option.removeprefix("--"), "value": source_value},
        "prompts": prompts,
        "domain": args.policy_domain,
        "viewpoint": args.policy_viewpoint,
        "steps": args.policy_steps,
        "seed": args.policy_seed,
        "guidance": args.policy_guidance,
        "video_subsample_factor": args.policy_video_subsample_factor,
        "action_chunk_size": args.policy_action_chunk_size,
    }
    return source_option, source_value, prompts, payload


def nemotron_asr_request(args: argparse.Namespace, home: Path) -> tuple[Path, dict[str, Any]]:
    if args.input_json or args.image or args.video_frame or args.trajectory or args.prompt or args.system_prompt:
        raise SystemExit(
            "Nemotron-3.5-ASR accepts one --audio file and optional --asr-prompt-id; "
            "it does not use the LLM request JSON contract"
        )
    audios = [item.expanduser().resolve() for item in args.audio]
    if len(audios) > 1:
        raise SystemExit("Nemotron-3.5-ASR accepts one audio file per invocation")
    audio = audios[0] if audios else home / "examples/multimodal/audio/6930-75918-0000.flac"
    if not audio.is_file():
        raise SystemExit(f"Input audio does not exist: {audio}")
    payload: dict[str, Any] = {
        "contract": "nemotron3_5_asr",
        "audio": str(audio),
    }
    if args.asr_prompt_id is not None:
        payload["prompt_id"] = args.asr_prompt_id
    return audio, payload


def validate_input_json(path: Path, forbidden_content_types: tuple[str, ...] = ()) -> Path:
    path = path.expanduser().resolve()
    data = load_json(path)
    if not isinstance(data.get("requests"), list) or not data["requests"]:
        raise SystemExit(f"Edge-LLM input JSON must contain a non-empty requests array: {path}")
    forbidden = set(forbidden_content_types)
    for request in data["requests"]:
        if not isinstance(request, dict):
            continue
        for message in request.get("messages", []):
            if not isinstance(message, dict) or not isinstance(message.get("content"), list):
                continue
            for item in message["content"]:
                if isinstance(item, dict) and item.get("type") in forbidden:
                    raise SystemExit(
                        f"Content type {item['type']!r} is not supported for this model "
                        f"by TensorRT Edge-LLM {EXPECTED_VERSION}"
                    )
    return path


def ensure_software(
    home: Path,
    targets: dict[str, Path],
    runner: CommandRunner,
    skip: bool,
) -> None:
    missing = [name for name, path in targets.items() if not path.is_file()]
    if not missing:
        return
    if skip:
        details = ", ".join(f"{name} ({targets[name]})" for name in missing)
        raise SystemExit(f"Required C++ executables are missing: {details}")
    build_dir = home / "build"
    if not build_dir.is_dir() and not runner.dry_run:
        raise SystemExit(f"CMake build directory does not exist: {build_dir}")
    experimental_targets = {
        "cosmos3_policy_build",
        "cosmos3_policy_inference",
        "nemotron_asr_inference",
    }
    if experimental_targets.intersection(missing):
        cache = build_dir / "CMakeCache.txt"
        enabled = cache.is_file() and "BUILD_EXPERIMENTAL_MODELS:BOOL=ON" in cache.read_text(
            encoding="utf-8", errors="replace"
        )
        if not enabled:
            runner.run([
                "cmake", "-S", str(home), "-B", str(build_dir),
                "-DBUILD_EXPERIMENTAL_MODELS=ON",
            ], home)
    runner.run(["cmake", "--build", str(build_dir), "--target", *missing, "--parallel", str(os.cpu_count() or 1)], home)


def main() -> None:
    args = parser().parse_args()
    if args.builder == "direct":
        print("--builder direct is an alias for --builder weightless", flush=True)
        args.builder = "weightless"
    validate_args(args)
    home = find_edgellm_home(args.edgellm_home)

    version_file = home / "tensorrt_edgellm/_version.py"
    if version_file.is_file():
        match = re.search(r'__version__\s*=\s*["\']([^"\']+)', version_file.read_text(encoding="utf-8"))
        if match and match.group(1) != EXPECTED_VERSION:
            raise SystemExit(f"This workflow targets Edge-LLM {EXPECTED_VERSION}, but {home} contains {match.group(1)}")

    metadata_only = args.dry_run or (
        args.builder == "onnx" and args.stage in {"build", "infer", "bench"}
    )
    materialize_root = (
        args.workspace.expanduser().resolve() / "checkpoints"
        if args.builder == "onnx"
        else None
    )
    materialize = (
        args.builder == "onnx"
        and args.stage in {"all", "export", "serve"}
        and not args.dry_run
    )
    checkpoint_args = {
        "metadata_only": metadata_only,
        "materialize_root": materialize_root,
        "materialize": materialize,
    }
    base_path = resolve_checkpoint(
        args.model, args.revision, args.local_files_only, **checkpoint_args
    )
    info = inspect_model(base_path, args.externalize_weight)
    if not info.is_tts and any((
        args.tts_instruct, args.ref_audio, args.ref_text,
        args.language != "auto",
    )):
        raise SystemExit(
            "--language, --tts-instruct, --ref-audio, and --ref-text require "
            "a Qwen3-TTS checkpoint"
        )
    if args.builder == "weightless" and info.is_nemotron_asr:
        raise SystemExit(
            "Nemotron-3.5-ASR requires --builder onnx because Edge-LLM 0.10.0 "
            "builds its FastConformer and RNN-T step with audio_build"
        )
    draft_info = None
    if args.draft_model:
        draft_path = resolve_checkpoint(
            args.draft_model, args.revision, args.local_files_only, **checkpoint_args
        )
        draft_info = inspect_model(draft_path, args.externalize_weight)
    else:
        draft_path = None

    omni_root_info = talker_info = None
    if args.omni_root_model:
        omni_root_path = resolve_checkpoint(
            args.omni_root_model, args.revision, args.local_files_only, **checkpoint_args
        )
        talker_path = resolve_checkpoint(
            args.talker_model, args.revision, args.local_files_only, **checkpoint_args
        )
        omni_root_info = inspect_model(omni_root_path, args.externalize_weight)
        talker_info = inspect_model(talker_path, args.externalize_weight)
        if not omni_root_info.is_omni:
            raise SystemExit("--omni-root-model must be a Qwen3-Omni full checkpoint")
        info = ModelInfo(
            path=info.path,
            model_type=omni_root_info.model_type,
            has_llm=True,
            has_visual=omni_root_info.has_visual,
            has_audio=omni_root_info.has_audio,
            has_talker=True,
            has_code_predictor=True,
            has_code2wav=True,
            has_action=False,
            is_tts=False,
            tts_mode="",
            is_omni=True,
            is_moe=True,
            is_diffusion=False,
            is_cosmos3=False,
            is_cosmos3_policy=False,
            is_nemotron_asr=False,
            external_weights=info.external_weights,
        )

    if args.spec_mode == "eagle3" and draft_info is None:
        raise SystemExit("--eagle3 requires a draft checkpoint")
    if args.spec_mode in {"dflash", "dspark"} and draft_info is None:
        raise SystemExit(f"--{args.spec_mode} requires a draft checkpoint")
    if args.spec_mode == "mtp" and info.model_type in PLE_MODEL_TYPES and draft_info is None:
        raise SystemExit("Gemma4 --mtp requires --mtp-draft with the matched assistant checkpoint")
    if args.spec_mode != "none" and (info.is_tts or info.has_action or info.is_omni):
        raise SystemExit(f"{args.spec_mode} is not supported by this release workflow for model_type={info.model_type}")
    if args.builder == "weightless" and omni_root_info:
        raise SystemExit("The weightless builder accepts one complete Qwen3-Omni checkpoint; remove the split-checkpoint options")
    if args.stage == "serve":
        if info.model_type in PLE_MODEL_TYPES and checkpoint_uses_fp8_kv_cache(info.path):
            raise SystemExit(
                "TensorRT Edge-LLM 0.10.0 cannot serve Gemma4 shared-KV "
                "attention with an FP8 KV cache; select a Gemma4 checkpoint "
                "with an FP16 KV cache"
            )
        if info.is_tts and info.tts_mode != "custom_voice":
            raise SystemExit(
                "The 0.10.0 HTTP speech endpoint supports Qwen3-TTS "
                "CustomVoice checkpoints. Base voice cloning and VoiceDesign "
                "keep their model-specific offline input contracts."
            )
        if info.is_diffusion:
            raise SystemExit(
                "DiffusionGemma uses the block-diffusion C++ runtime and is not "
                "loadable by the 0.10.0 generic HTTP server"
            )
        if info.has_action or info.is_cosmos3_policy or info.is_nemotron_asr:
            raise SystemExit(
                "This helper's server stage supports LLM, VLM, LLM-backed ASR, "
                "and Qwen3-TTS CustomVoice engines; use offline inference for "
                "Cosmos3 policy, Alpamayo action, or RNN-T ASR contracts"
            )

    low_memory_orin = 0 < system_memory_gib() < 10
    defaults = {
        "batch": 1 if info.is_cosmos3_policy or info.is_nemotron_asr else (6 if info.has_action else 1),
        "input": 3424 if info.has_action else (
            4096 if info.is_tts else (
                2304 if info.has_visual and info.has_audio else (
                    1024 if info.is_omni else (1152 if low_memory_orin else 2048)
                )
            )
        ),
        "kv": 4096 if info.has_action or info.is_tts else (
            2500 if info.has_visual and info.has_audio else (
                2048 if info.is_omni else (1280 if low_memory_orin else 2200)
            )
        ),
    }
    max_batch = args.max_batch_size or defaults["batch"]
    max_input = args.max_input_len or defaults["input"]
    max_kv = args.max_kv_cache_capacity or defaults["kv"]
    if args.batch_size > max_batch:
        raise SystemExit(f"--batch-size {args.batch_size} exceeds engine --max-batch-size {max_batch}")

    if info.has_action:
        min_image = args.min_image_tokens or 160
        max_image = args.max_image_tokens or 18432
        max_per_image = args.max_image_tokens_per_image or 192
    else:
        min_image = args.min_image_tokens or 8
        max_image = args.max_image_tokens or (2048 if low_memory_orin else 16384)
        max_per_image = args.max_image_tokens_per_image or (1024 if low_memory_orin else 2048)
    if not (min_image <= max_per_image <= max_image):
        raise SystemExit("Image token profiles require min <= max-per-image <= max")

    spec_defaults = {
        "none": (0, 0, 0),
        "mtp": (1, 3, 4),
        "eagle3": (10, 6, 60),
        "dflash": (1, 1, 16),
        "dspark": (1, 1, 8),
    }
    default_top_k, default_steps, default_verify = spec_defaults[args.spec_mode]
    draft_top_k = args.draft_top_k or default_top_k
    draft_steps = args.draft_steps or default_steps
    verify_size = args.verify_size or default_verify
    if args.spec_mode == "mtp" and (draft_top_k != 1 or verify_size != draft_steps + 1):
        raise SystemExit("MTP requires --draft-top-k 1 and --verify-size == --draft-steps + 1")
    if args.spec_mode in {"dflash", "dspark"} and draft_steps != 1:
        raise SystemExit(f"{args.spec_mode} requires --draft-steps 1")
    if args.spec_mode == "dflash" and args.enable_thinking is None:
        args.enable_thinking = info.model_type in {"qwen3_5", "qwen3_5_text", "qwen3_5_moe"}
    if args.enable_thinking is None:
        args.enable_thinking = False

    prefill_len = args.prefill_len or min(2048, max_input)
    decode_reserve = max(args.bench_output_len, verify_size, args.dflash_block_size)
    past_kv_len = args.past_kv_len or min(2048, max_kv - decode_reserve)
    if prefill_len > max_input:
        raise SystemExit(
            f"--prefill-len {prefill_len} exceeds --max-input-len {max_input}; "
            "increase the engine profile or lower the benchmark length"
        )
    if past_kv_len < 0 or past_kv_len + decode_reserve > max_kv:
        raise SystemExit(
            f"--past-kv-len {past_kv_len} plus the {decode_reserve}-token benchmark reserve "
            f"exceeds --max-kv-cache-capacity {max_kv}"
        )

    model_identity = {
        "model": args.model,
        "resolved": str(base_path),
        "revision": args.revision,
    }
    weightless_external_weights = (
        tuple(args.externalize_weight)
        if args.externalize_weight
        else WEIGHTLESS_EXTERNAL_WEIGHT_KINDS
    )
    model_root = args.workspace.expanduser().resolve() / f"{safe_name(args.model)}-{short_hash(model_identity, 8)}"
    model_root.mkdir(parents=True, exist_ok=True)
    if args.builder == "onnx":
        export_base_path, gemma4_compatibility = prepare_gemma4_checkpoint(
            base_path, model_root, info.model_type
        )
    else:
        export_base_path, gemma4_compatibility = base_path, ()

    export_signature = {
        **model_identity,
        "spec": args.spec_mode,
        "draft": str(draft_path or ""),
        "omni_root": str(omni_root_info.path if omni_root_info else ""),
        "talker": str(talker_info.path if talker_info else ""),
        "external": info.external_weights,
        "kv": max_kv,
        "extra": args.export_arg,
        "dflash_tree": args.spec_mode == "dflash" and draft_top_k > 1,
        "gemma4_compatibility": gemma4_compatibility,
        "builder": args.builder,
    }
    export_root = model_root / "onnx" / f"{args.spec_mode}-{short_hash(export_signature)}"
    engine_signature = {
        "export": export_signature,
        "batch": max_batch,
        "input": max_input,
        "kv": max_kv,
        "verify": verify_size,
        "draft_top_k": draft_top_k,
        "draft_steps": draft_steps,
        "dflash_block": args.dflash_block_size,
        "image": (min_image, max_image, max_per_image) if info.has_visual else None,
        "audio": (args.min_audio_time_steps, args.max_audio_time_steps) if info.has_audio else None,
        "code": args.max_code_length if info.has_code2wav else None,
        "build_args": {
            "llm": args.llm_build_arg if info.has_llm else (),
            "talker": args.talker_build_arg if info.has_talker else (),
            "cp": args.code_predictor_build_arg if info.has_code_predictor else (),
            "visual": args.visual_build_arg if info.has_visual else (),
            "audio": args.audio_build_arg if info.has_audio or info.has_code2wav else (),
            "action": args.action_build_arg if info.has_action else (),
            "weightless": args.weightless_build_arg if args.builder == "weightless" else (),
            "weightless_external": (
                weightless_external_weights
                if args.builder == "weightless"
                else ()
            ),
        },
    }
    engine_root = model_root / "engines" / f"b{max_batch}-i{max_input}-kv{max_kv}-{args.spec_mode}-{short_hash(engine_signature, 8)}"
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + f"-{os.getpid()}"
    run_root = model_root / "runs" / run_id
    run_root.mkdir(parents=True, exist_ok=True)
    command_file = run_root / "commands.sh"
    runner = CommandRunner(command_file, run_root / "pipeline.log", args.dry_run)

    runtime_profile_benchmark = (
        info.model_type in PLE_MODEL_TYPES
        or info.is_diffusion
        or info.is_cosmos3_policy
        or info.is_nemotron_asr
        or args.spec_mode != "none"
    )
    need_export = args.builder == "onnx" and args.stage in {"all", "export", "serve"}
    need_build = args.stage in {"all", "build", "serve"}
    need_bench = args.stage in {"all", "bench"} and not args.no_benchmark
    need_infer = (
        args.stage in {"all", "infer"} and not args.no_inference
    ) or (need_bench and runtime_profile_benchmark)
    need_server = args.stage == "serve"
    if need_bench and runtime_profile_benchmark and args.no_inference:
        raise SystemExit("This model's end-to-end benchmark requires its runtime; remove --no-inference")

    if need_export and args.force_export and export_root.exists() and not args.dry_run:
        shutil.rmtree(export_root)
    if need_export:
        marker = export_root / ".complete"
        if marker.is_file() and not args.force_export and not args.dry_run:
            print(f"Reusing ONNX export: {export_root}")
        else:
            export_root.mkdir(parents=True, exist_ok=True)
            tool = export_tool(home, model_root, gemma4_compatibility)
            if omni_root_info and talker_info:
                commands = []
                thinker_cmd = [*tool, str(export_base_path), str(export_root / "thinker")]
                add_external_args(thinker_cmd, inspect_model(base_path, args.externalize_weight))
                commands.append(thinker_cmd)
                talker_cmd = [*tool, str(talker_info.path), str(export_root / "talker"), "--talker-sidecar-from", str(omni_root_info.path)]
                add_external_args(talker_cmd, talker_info)
                commands.append(talker_cmd)
                root_cmd = [*tool, str(omni_root_info.path), str(export_root / "multimodal"), "--components", "visual,audio,code2wav,code_predictor"]
                add_external_args(root_cmd, omni_root_info)
                commands.append(root_cmd)
            elif args.spec_mode == "eagle3":
                base_cmd = [*tool, str(export_base_path), str(export_root / "base"), "--eagle-base", "--max-kv-cache-capacity", str(max_kv)]
                add_external_args(base_cmd, info)
                draft_cmd = [*tool, str(draft_path), str(export_root / "draft")]
                add_external_args(draft_cmd, draft_info)
                commands = [base_cmd, draft_cmd]
            elif args.spec_mode == "dflash":
                base_flag = "--dflash-tree-base" if draft_top_k > 1 else "--dflash-base"
                base_cmd = [*tool, str(export_base_path), str(export_root / "base"), base_flag, "--dflash-draft-dir", str(draft_path), "--max-kv-cache-capacity", str(max_kv)]
                add_external_args(base_cmd, info)
                draft_cmd = [*tool, str(export_base_path), str(export_root / "draft"), "--dflash-draft", "--dflash-draft-dir", str(draft_path)]
                commands = [base_cmd, draft_cmd]
            elif args.spec_mode == "dspark":
                base_cmd = [*tool, str(export_base_path), str(export_root / "base"), "--dspark-base", "--dspark-draft-dir", str(draft_path), "--max-kv-cache-capacity", str(max_kv)]
                add_external_args(base_cmd, info)
                draft_cmd = [*tool, str(export_base_path), str(export_root / "draft"), "--dspark-draft", "--dspark-draft-dir", str(draft_path)]
                commands = [base_cmd, draft_cmd]
            else:
                command = [*tool, str(export_base_path), str(export_root), "--max-kv-cache-capacity", str(max_kv)]
                if info.is_cosmos3_policy:
                    command.extend(("--task", "policy"))
                elif info.is_cosmos3:
                    command.extend(("--task", "reasoning"))
                if args.spec_mode == "mtp":
                    command.append("--mtp")
                    if draft_path:
                        command.extend(("--mtp-draft-dir", str(draft_path)))
                add_external_args(command, info)
                commands = [command]
            for command in commands:
                command.extend(args.export_arg)
                runner.run(command, home)
            if not args.dry_run:
                marker.write_text(json.dumps(export_signature, indent=2, default=str) + "\n", encoding="utf-8")

    if export_root.is_dir() and not args.dry_run:
        normalize_tokenizers(export_root)

    if omni_root_info and talker_info:
        paths = {
            "llm": export_root / "thinker/llm",
            "talker": export_root / "talker/llm",
            "code_predictor": export_root / "multimodal/code_predictor",
            "visual": export_root / "multimodal/visual",
            "audio": export_root / "multimodal/audio",
            "code2wav": export_root / "multimodal/code2wav",
            "action": export_root / "multimodal/action",
        }
    elif args.spec_mode == "eagle3":
        base_paths = component_paths(info, export_root / "base")
        paths = dict(base_paths)
        paths["spec_base"] = base_paths["llm"]
        paths["spec_draft"] = export_root / "draft/llm"
    elif args.spec_mode in {"dflash", "dspark"}:
        base_paths = component_paths(info, export_root / "base")
        paths = dict(base_paths)
        paths["spec_base"] = base_paths["llm"]
        draft_component = "dflash_draft" if args.spec_mode == "dflash" else "dspark_draft"
        paths["spec_draft"] = export_root / "draft" / draft_component
    else:
        paths = component_paths(info, export_root)
        if args.spec_mode == "mtp":
            paths["spec_base"] = paths["llm"]
            paths["spec_draft"] = paths["mtp_draft"]

    binary = {
        "llm_build": home / "build/examples/llm/llm_build",
        "llm_inference": home / "build/examples/llm/llm_inference",
        "llm_bench": home / "build/examples/llm/llm_bench",
        "visual_build": home / "build/examples/multimodal/visual_build",
        "audio_build": home / "build/examples/multimodal/audio_build",
        "action_build": home / "build/examples/multimodal/action_build",
        "action_inference": home / "build/examples/multimodal/action_inference",
        "qwen3_tts_inference": home / "build/examples/omni/qwen3_tts_inference",
        "cosmos3_policy_build": home / "build/experimental_models/cosmos3/examples/cosmos3_policy_build",
        "cosmos3_policy_inference": home / "build/experimental_models/cosmos3/examples/cosmos3_policy_inference",
        "nemotron_asr_inference": home / "build/experimental_models/nemotron3_5_asr/examples/nemotron_asr_inference",
    }
    required_targets: dict[str, Path] = {}
    if need_build and args.builder == "onnx":
        if info.is_cosmos3_policy:
            required_targets["cosmos3_policy_build"] = binary["cosmos3_policy_build"]
        else:
            if info.has_llm or info.has_talker:
                required_targets["llm_build"] = binary["llm_build"]
            if info.has_visual:
                required_targets["visual_build"] = binary["visual_build"]
            if info.has_audio or info.has_code2wav:
                required_targets["audio_build"] = binary["audio_build"]
            if info.has_action:
                required_targets["action_build"] = binary["action_build"]
    if need_infer:
        runtime_target = (
            "cosmos3_policy_inference"
            if info.is_cosmos3_policy
            else (
                "nemotron_asr_inference"
                if info.is_nemotron_asr
                else (
                    "qwen3_tts_inference"
                    if info.is_tts
                    else ("action_inference" if info.has_action else "llm_inference")
                )
            )
        )
        required_targets[runtime_target] = binary[runtime_target]
    benchmark_summary = None
    if (
        need_bench
        and not (info.is_tts or info.is_cosmos3_policy or info.is_nemotron_asr)
        and (args.spec_mode != "none" or not runtime_profile_benchmark)
    ):
        required_targets["llm_bench"] = binary["llm_bench"]
    if required_targets:
        ensure_software(home, required_targets, runner, args.skip_software_build)

    if need_build and args.force_build and engine_root.exists() and not args.dry_run:
        shutil.rmtree(engine_root)
    if need_build:
        engine_root.mkdir(parents=True, exist_ok=True)
    engine_marker = engine_root / ".complete"
    if args.builder == "weightless":
        llm_engine = engine_root / "talker" if info.is_tts else engine_root
        multimodal_engine = engine_root
    else:
        llm_engine = engine_root / ("talker" if info.is_tts else ("thinker" if info.is_omni else "llm"))
        multimodal_engine = engine_root / "multimodal"

    def invalidate_engine_bundle() -> None:
        if not args.dry_run:
            engine_marker.unlink(missing_ok=True)

    def require_onnx(component: str) -> Path:
        directory = paths[component]
        if not args.dry_run and not (directory / "model.onnx").is_file():
            raise SystemExit(f"Missing {component} ONNX artifact: {directory / 'model.onnx'}")
        return directory

    def link_external_weights(onnx_dir: Path, out: Path, role: str) -> None:
        if args.dry_run:
            return
        config_path = onnx_dir / "config.json"
        config = load_json(config_path)
        entries = config.get("external_weight_files", [])
        if not isinstance(entries, list):
            raise SystemExit(f"external_weight_files must be an array in {config_path}")
        out.mkdir(parents=True, exist_ok=True)
        for entry in entries:
            if not isinstance(entry, dict) or not isinstance(entry.get("file"), str):
                raise SystemExit(f"Malformed external weight entry in {config_path}: {entry!r}")
            filename = entry["file"]
            source = (onnx_dir / filename).resolve()
            if onnx_dir.resolve() not in source.parents or not source.is_file():
                raise SystemExit(f"Invalid external weight file in {config_path}: {filename}")
            destination = out / (("draft_" if role == "draft" else "") + filename)
            if destination.exists():
                if source.samefile(destination):
                    continue
                if destination.is_file() and source.stat().st_size == destination.stat().st_size:
                    print(f"Reusing copied external weight file: {destination}", flush=True)
                    continue
                destination.unlink()
            temporary = destination.with_name(f".{destination.name}.{os.getpid()}.tmp")
            temporary.unlink(missing_ok=True)
            try:
                os.link(source, temporary)
                os.replace(temporary, destination)
                print(f"Linked external weight file: {source} -> {destination}", flush=True)
            except OSError:
                temporary.unlink(missing_ok=True)
                try:
                    shutil.copy2(source, temporary)
                    os.replace(temporary, destination)
                    print(f"Copied external weight file: {source} -> {destination}", flush=True)
                finally:
                    temporary.unlink(missing_ok=True)

    def build_llm(component: str, out: Path, role: str = "", component_args: list[str] | None = None, component_input: int | None = None, component_kv: int | None = None) -> None:
        expected = out / (
            "spec_base.engine" if role == "base" else (
                "spec_draft.engine" if role == "draft" else (
                    "dllm.engine" if info.is_diffusion else "llm.engine"
                )
            )
        )
        onnx_dir = require_onnx(component)
        link_external_weights(onnx_dir, out, role)
        if expected.is_file() and engine_marker.is_file() and not args.force_build and not args.dry_run:
            print(f"Reusing engine: {expected}")
            return
        invalidate_engine_bundle()
        command = [
            str(binary["llm_build"]), "--onnxDir", str(onnx_dir), "--engineDir", str(out),
            "--maxBatchSize", str(max_batch), "--maxInputLen", str(component_input or max_input),
            "--maxKVCacheCapacity", str(component_kv or max_kv),
        ]
        if role == "base":
            command.extend(("--specBase", "--maxVerifyTreeSize", str(verify_size)))
        elif role == "draft":
            draft_tree_size = (
                7
                if args.spec_mode == "dspark"
                else max(verify_size, args.dflash_block_size)
            )
            command.extend(("--specDraft", "--maxDraftTreeSize", str(draft_tree_size)))
        command.extend(args.llm_build_arg)
        command.extend(component_args or [])
        runner.run(command, home)

    if need_build and args.builder == "weightless":
        direct_builder = shutil.which("tensorrt-edgellm-build")
        if not direct_builder:
            raise SystemExit("tensorrt-edgellm-build is not installed in this container")
        expected_engine = (
            engine_root / "talker/llm.engine"
            if info.is_tts
            else (
                engine_root / "gen/gen.engine"
                if info.is_cosmos3_policy
                else engine_root / (
                    "spec_base.engine" if args.spec_mode != "none" else (
                        "dllm.engine" if info.is_diffusion else "llm.engine"
                    )
                )
            )
        )
        if expected_engine.is_file() and engine_marker.is_file() and not args.force_build and not args.dry_run:
            print(f"Reusing weightless engine bundle: {engine_root}")
        else:
            command = [
                direct_builder,
                "--model-dir", str(base_path),
                "--engine-dir", str(engine_root),
                "--plugin-path", str(home / "build/libNvInfer_edgellm_plugin.so"),
                "--max-batch-size", str(max_batch),
                "--max-input-len", str(max_input),
                "--max-kv-cache-capacity", str(max_kv),
            ]
            if info.is_cosmos3_policy:
                command.extend(("--components", "und-prefill,gen,vae-encoder"))
            elif info.is_cosmos3:
                command.extend(("--components", "llm,visual"))
            elif info.is_diffusion:
                command.extend(("--components", "dllm,visual"))
            if info.has_visual:
                command.extend((
                    "--min-image-tokens", str(min_image),
                    "--max-image-tokens", str(max_image),
                    "--max-image-tokens-per-image", str(max_per_image),
                ))
            if info.has_audio:
                command.extend((
                    "--min-time-steps", str(args.min_audio_time_steps),
                    "--max-time-steps", str(args.max_audio_time_steps),
                ))
            if info.has_code2wav:
                command.extend(("--max-code-len", str(args.max_code_length)))
            if args.spec_mode != "none":
                spec_type = (
                    "gemma4_mtp"
                    if args.spec_mode == "mtp" and info.model_type in PLE_MODEL_TYPES
                    else args.spec_mode
                )
                command.extend(("--spec-type", spec_type))
                if draft_path:
                    command.extend(("--draft-model-dir", str(draft_path)))
                direct_draft_size = 7 if args.spec_mode == "dspark" else max(
                    verify_size, args.dflash_block_size
                )
                command.extend((
                    "--max-verify-tree-size", str(verify_size),
                    "--max-draft-tree-size", str(direct_draft_size),
                ))
                if args.spec_mode in {"dflash", "dspark"} and draft_top_k > 1:
                    command.append("--tree-base")
            for weight_kind in args.externalize_weight:
                command.extend(("--externalize-weights", weight_kind))
            command.extend(args.weightless_build_arg)
            runner.run(command, home)
            if not args.dry_run:
                engine_marker.write_text(json.dumps(engine_signature, indent=2, default=str) + "\n", encoding="utf-8")
        if info.is_cosmos3_policy and not args.dry_run:
            ensure_processed_chat_template(
                base_path / "text_tokenizer",
                engine_root / "text_tokenizer",
            )

    if need_build and args.builder == "onnx":
        if info.is_cosmos3_policy:
            expected = engine_root / "gen/gen.engine"
            if not expected.is_file() or not engine_marker.is_file() or args.force_build or args.dry_run:
                invalidate_engine_bundle()
                runner.run([
                    str(binary["cosmos3_policy_build"]),
                    "--onnxDir", str(export_root),
                    "--engineDir", str(engine_root),
                    "--maxBatchSize", str(max_batch),
                ], home)
        elif info.is_nemotron_asr:
            runtime_dir = engine_root / "runtime"
            expected = runtime_dir / "rnnt_step.engine"
            if not expected.is_file() or not engine_marker.is_file() or args.force_build or args.dry_run:
                invalidate_engine_bundle()
                runner.run([
                    str(binary["audio_build"]),
                    "--onnxDir", str(require_onnx("audio")),
                    "--engineDir", str(engine_root),
                    "--maxTimeSteps", str(args.max_audio_time_steps),
                    *args.audio_build_arg,
                ], home)
                runner.run([
                    str(binary["audio_build"]),
                    "--onnxDir", str(require_onnx("rnnt_decoder")),
                    "--engineDir", str(engine_root),
                    *args.audio_build_arg,
                ], home)
                runtime_files = [
                    engine_root / "audio/audio_encoder.engine",
                    engine_root / "rnnt_decoder/rnnt_step.engine",
                    paths["audio"] / "config.json",
                    paths["audio"] / "tokenizer.json",
                    paths["audio"] / "tokenizer_config.json",
                ]
                runner.run(["cmake", "-E", "make_directory", str(runtime_dir)], home)
                runner.run([
                    "cmake", "-E", "copy_if_different",
                    *(str(path) for path in runtime_files),
                    str(runtime_dir),
                ], home)
        elif args.spec_mode != "none":
            build_llm("spec_base", llm_engine, "base")
            build_llm("spec_draft", llm_engine, "draft")
        elif info.has_llm:
            build_llm("llm", llm_engine)
        if info.has_talker:
            talker_engine = engine_root / "talker"
            talker_input = 4096 if info.is_tts else max_input
            talker_kv = 4096 if info.is_tts else max_kv
            build_llm("talker", talker_engine, component_args=args.talker_build_arg, component_input=talker_input, component_kv=talker_kv)
        else:
            talker_engine = engine_root / "talker"
        if info.has_code_predictor:
            cp_input = 4096 if info.is_tts else 256
            cp_kv = 4096 if info.is_tts else 256
            build_llm("code_predictor", engine_root / "code_predictor", component_args=args.code_predictor_build_arg, component_input=cp_input, component_kv=cp_kv)
        if info.has_visual:
            expected = multimodal_engine / "visual/visual.engine"
            if not expected.is_file() or not engine_marker.is_file() or args.force_build or args.dry_run:
                invalidate_engine_bundle()
                command = [
                    str(binary["visual_build"]), "--onnxDir", str(require_onnx("visual")), "--engineDir", str(multimodal_engine),
                    "--minImageTokens", str(min_image), "--maxImageTokens", str(max_image),
                    "--maxImageTokensPerImage", str(max_per_image), *args.visual_build_arg,
                ]
                runner.run(command, home)
        if info.has_audio and not info.is_nemotron_asr:
            expected = multimodal_engine / "audio/audio_encoder.engine"
            if not expected.is_file() or not engine_marker.is_file() or args.force_build or args.dry_run:
                invalidate_engine_bundle()
                command = [
                    str(binary["audio_build"]), "--onnxDir", str(require_onnx("audio")), "--engineDir", str(multimodal_engine),
                    "--minTimeSteps", str(args.min_audio_time_steps), "--maxTimeSteps", str(args.max_audio_time_steps),
                    *args.audio_build_arg,
                ]
                runner.run(command, home)
        if info.has_code2wav:
            expected = engine_root / "code2wav/code2wav.engine"
            if not expected.is_file() or not engine_marker.is_file() or args.force_build or args.dry_run:
                invalidate_engine_bundle()
                command = [
                    str(binary["audio_build"]), "--onnxDir", str(require_onnx("code2wav")), "--engineDir", str(engine_root),
                    "--maxCodeLen", str(args.max_code_length), *args.audio_build_arg,
                ]
                runner.run(command, home)
        if info.is_tts and info.tts_mode == "base":
            clone_onnx = export_root / "clone_encoders"
            clone_engine = engine_root / "clone_encoders"
            speaker_onnx = clone_onnx / "speaker_encoder.onnx"
            tokenizer_onnx = clone_onnx / "speech_tokenizer_encoder.onnx"
            if not args.dry_run:
                for required in (speaker_onnx, tokenizer_onnx):
                    if not required.is_file():
                        raise SystemExit(f"Missing Qwen3-TTS Base clone encoder: {required}")
            trtexec = shutil.which("trtexec")
            if not trtexec and not args.dry_run:
                raise SystemExit("trtexec is required to build Qwen3-TTS Base clone encoders")
            trtexec = trtexec or "trtexec"
            runner.run(["cmake", "-E", "make_directory", str(clone_engine)], home)
            speaker_engine = clone_engine / "speaker_encoder.engine"
            if not speaker_engine.is_file() or not engine_marker.is_file() or args.force_build or args.dry_run:
                runner.run([
                    trtexec,
                    f"--onnx={speaker_onnx}",
                    "--fp16",
                    "--minShapes=wav:1x24000",
                    "--optShapes=wav:1x240000",
                    "--maxShapes=wav:1x960000",
                    f"--saveEngine={speaker_engine}",
                ], home)
            tokenizer_engine = clone_engine / "speech_tokenizer_encoder.engine"
            if not tokenizer_engine.is_file() or not engine_marker.is_file() or args.force_build or args.dry_run:
                runner.run([
                    trtexec,
                    f"--onnx={tokenizer_onnx}",
                    "--fp16",
                    f"--saveEngine={tokenizer_engine}",
                ], home)
        if info.has_action:
            expected = multimodal_engine / "action/action.engine"
            if not expected.is_file() or not engine_marker.is_file() or args.force_build or args.dry_run:
                invalidate_engine_bundle()
                command = [
                    str(binary["action_build"]), "--onnxDir", str(require_onnx("action")), "--engineDir", str(multimodal_engine),
                    "--maxBatchSize", str(max_batch), *args.action_build_arg,
                ]
                runner.run(command, home)
        if not args.dry_run:
            engine_marker.write_text(json.dumps(engine_signature, indent=2, default=str) + "\n", encoding="utf-8")

    if engine_root.is_dir() and not args.dry_run:
        normalize_tokenizers(engine_root)

    if not args.dry_run:
        if (export_root / ".complete").is_file():
            update_symlink(model_root / "latest-onnx", export_root)
        if (engine_root / ".complete").is_file():
            update_symlink(model_root / "latest-engines", engine_root)

    input_json = None
    output_json = None
    raw_output_json = None
    profile_json = None
    policy_source_option = policy_source_value = None
    policy_prompts: list[str] = []
    asr_audio = None
    if need_infer:
        if info.is_cosmos3_policy:
            policy_source_option, policy_source_value, policy_prompts, payload = cosmos_policy_request(args, home)
            input_json = run_root / "policy-input.json"
            input_json.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        elif info.is_nemotron_asr:
            asr_audio, payload = nemotron_asr_request(args, home)
            input_json = run_root / "asr-input.json"
            input_json.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        elif args.input_json:
            input_json = validate_input_json(args.input_json)
        else:
            input_json = run_root / "input.json"
            write_default_input(input_json, args, info, home)
        default_output = "transcript.txt" if info.is_nemotron_asr else "output.json"
        default_profile = "benchmark.txt" if info.is_cosmos3_policy or info.is_nemotron_asr else "profile.json"
        output_json = (
            args.output_json.expanduser().resolve()
            if args.output_json
            else run_root / default_output
        )
        profile_json = (
            args.profile_json.expanduser().resolve()
            if args.profile_json
            else run_root / default_profile
        )
        output_json.parent.mkdir(parents=True, exist_ok=True)
        profile_json.parent.mkdir(parents=True, exist_ok=True)

    def require_engine(path: Path) -> None:
        if not path.is_file() and not args.dry_run:
            raise SystemExit(f"Missing engine artifact: {path}")

    if need_infer:
        assert input_json is not None and output_json is not None and profile_json is not None
        runtime_capture = None
        if info.is_cosmos3_policy:
            assert policy_source_option and policy_source_value and policy_prompts
            for component in ("und_prefill", "gen", "vae_encoder"):
                require_engine(engine_root / component / f"{component}.engine")
            command = [
                str(binary["cosmos3_policy_inference"]),
                "--engineDir", str(engine_root),
                policy_source_option, policy_source_value,
                "--output", str(output_json),
                "--domain", args.policy_domain,
                "--viewPoint", args.policy_viewpoint,
                "--steps", str(args.policy_steps),
                "--seed", str(args.policy_seed),
                "--guidance", str(args.policy_guidance),
                "--video-subsample-factor", str(args.policy_video_subsample_factor),
                "--action-chunk-size", str(args.policy_action_chunk_size),
                "--iters", "1",
                "--warmup", str(args.inference_warmup),
            ]
            for prompt in policy_prompts:
                command.extend(("--prompt", prompt))
            command.extend(args.inference_arg)
            runtime_capture = run_root / "inference.log"
        elif info.is_nemotron_asr:
            assert asr_audio is not None
            asr_runtime_dir = engine_root / "runtime"
            require_engine(asr_runtime_dir / "audio_encoder.engine")
            require_engine(asr_runtime_dir / "rnnt_step.engine")
            command = [
                str(binary["nemotron_asr_inference"]),
                "--engineDir", str(asr_runtime_dir),
                "--audioFile", str(asr_audio),
            ]
            if args.asr_prompt_id is not None:
                command.extend(("--promptId", str(args.asr_prompt_id)))
            command.extend(args.inference_arg)
            runtime_capture = output_json
        elif info.is_tts:
            require_engine(engine_root / "talker/llm.engine")
            command = [
                str(binary["qwen3_tts_inference"]), "--talkerEngineDir", str(engine_root / "talker"),
                "--code2wavEngineDir", str(engine_root / "code2wav"), "--tokenizerDir", str(engine_root / "talker"),
                "--inputFile", str(input_json), "--outputFile", str(output_json), "--outputAudioDir", str(run_root / "audio"),
                "--dumpProfile", "--profileOutputFile", str(profile_json), "--dumpOutput", *args.inference_arg,
            ]
            if info.tts_mode == "base":
                require_engine(engine_root / "clone_encoders/speaker_encoder.engine")
                require_engine(engine_root / "clone_encoders/speech_tokenizer_encoder.engine")
                command.extend(("--cloneEncoderDir", str(engine_root / "clone_encoders")))
            if args.builder == "weightless":
                command.extend(("--checkpointDir", str(base_path)))
        elif info.has_action:
            require_engine(llm_engine / "llm.engine")
            command = [
                str(binary["action_inference"]), "--engineDir", str(llm_engine), "--multimodalEngineDir", str(multimodal_engine),
                "--inputFile", str(input_json), "--outputFile", str(output_json), "--warmup", str(args.inference_warmup),
                "--dumpProfile", "--profileOutputFile", str(profile_json), "--dumpOutput", *args.inference_arg,
            ]
            if args.builder == "weightless":
                command.extend(("--checkpointDir", str(base_path)))
        else:
            expected_llm = "spec_base.engine" if args.spec_mode != "none" else (
                "dllm.engine" if info.is_diffusion else "llm.engine"
            )
            require_engine(llm_engine / expected_llm)
            command = [
                str(binary["llm_inference"]), "--engineDir", str(llm_engine), "--inputFile", str(input_json),
                "--outputFile", str(output_json), "--warmup", str(args.inference_warmup), "--dumpProfile",
                "--profileOutputFile", str(profile_json), "--dumpOutput",
            ]
            if args.builder == "weightless":
                command.extend(("--checkpointDir", str(base_path)))
                if draft_path:
                    command.extend(("--draftCheckpointDir", str(draft_path)))
            if info.has_visual or info.has_audio:
                command.extend(("--multimodalEngineDir", str(multimodal_engine)))
            if args.spec_mode != "none":
                command.extend((
                    "--specDecode", "--specDraftTopK", str(draft_top_k), "--specDraftStep", str(draft_steps),
                    "--specVerifySize", str(verify_size),
                ))
                if args.dflash_block_size:
                    command.extend(("--dflashBlockSize", str(args.dflash_block_size)))
            if args.audio_output:
                if not info.is_omni:
                    raise SystemExit("--audio-output is only valid for Qwen3-Omni")
                command.extend((
                    "--enableAudioOutput", "--talkerEngineDir", str(engine_root / "talker"),
                    "--code2wavEngineDir", str(engine_root / "code2wav"), "--outputAudioDir", str(run_root / "audio"),
                ))
            command.extend(args.inference_arg)
        runner.run(command, home, capture_file=runtime_capture)
        if not args.dry_run and not (info.is_cosmos3_policy or info.is_nemotron_asr):
            raw_output_json = normalize_gemma4_output(
                output_json, run_root / "output.raw.json", info.model_type
            )
            normalize_runtime_profile(profile_json, input_json, info)

    layer_profile_requested = "--profile" in args.bench_arg
    bench_args = [token for token in args.bench_arg if token != "--profile"]

    def bench(mode: str, mode_args: list[str], directory: Path, engine_dir: Path = llm_engine) -> None:
        directory.mkdir(parents=True, exist_ok=True)
        command_prefix = [
            str(binary["llm_bench"]), "--engineDir", str(engine_dir), "--mode", mode,
            "--batchSize", str(args.batch_size), "--warmup", str(args.bench_warmup),
            "--iterations", str(args.bench_iterations), *mode_args, *bench_args,
        ]
        if args.builder == "weightless":
            command_prefix.extend(("--checkpointDir", str(base_path)))
            if draft_path:
                command_prefix.extend(("--draftCheckpointDir", str(draft_path)))
        runner.run([*command_prefix, "--outputDir", str(directory)], home)
        if layer_profile_requested:
            layer_directory = directory / "layers"
            layer_directory.mkdir(parents=True, exist_ok=True)
            runner.run([
                *command_prefix, "--profile", "--outputDir", str(layer_directory),
            ], home)

    if need_bench and not info.is_tts:
        bench_root = run_root / "bench"
        bench_root.mkdir(parents=True, exist_ok=True)
        if info.is_cosmos3_policy:
            assert output_json is not None and profile_json is not None
            assert policy_source_option and policy_source_value and policy_prompts
            command = [
                str(binary["cosmos3_policy_inference"]),
                "--engineDir", str(engine_root),
                policy_source_option, policy_source_value,
                "--output", str(bench_root / "action.json"),
                "--domain", args.policy_domain,
                "--viewPoint", args.policy_viewpoint,
                "--steps", str(args.policy_steps),
                "--seed", str(args.policy_seed),
                "--guidance", str(args.policy_guidance),
                "--video-subsample-factor", str(args.policy_video_subsample_factor),
                "--action-chunk-size", str(args.policy_action_chunk_size),
                "--iters", str(args.bench_iterations),
                "--warmup", str(args.bench_warmup),
            ]
            for prompt in policy_prompts:
                command.extend(("--prompt", prompt))
            command.extend(bench_args)
            runner.run(command, home, capture_file=profile_json)
            benchmark_summary = profile_json
        elif info.is_nemotron_asr:
            assert asr_audio is not None and profile_json is not None
            asr_runtime_dir = engine_root / "runtime"
            command = [
                str(binary["nemotron_asr_inference"]),
                "--engineDir", str(asr_runtime_dir),
                "--audioFile", str(asr_audio),
                "--benchmark",
                "--iters", str(args.bench_iterations),
                "--warmup", str(args.bench_warmup),
            ]
            if args.asr_prompt_id is not None:
                command.extend(("--promptId", str(args.asr_prompt_id)))
            command.extend(bench_args)
            runner.run(command, home, capture_file=profile_json)
            benchmark_summary = profile_json
        else:
            expected_llm = "spec_base.engine" if args.spec_mode != "none" else (
                "dllm.engine" if info.is_diffusion else "llm.engine"
            )
            require_engine(llm_engine / expected_llm)
        if args.spec_mode != "none":
            print(
                "Using the speculative runtime profile for end-to-end prefill and decode timing, "
                "plus standalone base-verification and draft component benchmarks.",
                flush=True,
            )
            spec_bench_args = [
                "--draftStep", str(draft_steps),
                "--verifyTreeSize", str(verify_size),
            ]
            bench("spec_verify", [
                *spec_bench_args,
                "--pastKVLen", str(past_kv_len),
                "--osl", str(args.bench_output_len),
            ], bench_root / "spec_verify")
            bench("spec_draft_prefill", [
                *spec_bench_args,
                "--inputLen", str(prefill_len),
            ], bench_root / "spec_draft_prefill")
            bench("spec_draft_proposal", [
                *spec_bench_args,
                "--draftTreeSize", str(draft_top_k),
                "--pastKVLen", str(past_kv_len),
                "--osl", str(args.bench_output_len),
            ], bench_root / "spec_draft_proposal")
        elif runtime_profile_benchmark and not (info.is_cosmos3_policy or info.is_nemotron_asr):
            print(
                "Using the real model runtime for end-to-end timing; the standalone "
                "LLM benchmark does not represent this model's generation contract.",
                flush=True,
            )
        elif not (info.is_cosmos3_policy or info.is_nemotron_asr):
            bench("prefill", ["--inputLen", str(prefill_len)], bench_root / "prefill")
            bench("decode", ["--pastKVLen", str(past_kv_len), "--osl", str(args.bench_output_len)], bench_root / "decode")
        if info.has_visual and not info.is_cosmos3_policy:
            print(
                "Using the real inference profile for vision timing; the standalone "
                "visual benchmark creates HWC input instead of the runtime's THWC contract.",
                flush=True,
            )
        if not args.dry_run and not (info.is_cosmos3_policy or info.is_nemotron_asr):
            benchmark_summary = summarize_benchmarks(
                bench_root,
                run_root,
                profile_json,
                args.batch_size,
                include_runtime_summary=runtime_profile_benchmark,
            )

    if need_server:
        serve_options = {"host": args.host, "port": args.port}
        if args.allowed_local_media_path:
            allowed_media = Path(args.allowed_local_media_path).expanduser().resolve()
            if not allowed_media.is_dir() and not args.dry_run:
                raise SystemExit(
                    f"--allowed-local-media-path is not a directory: {allowed_media}"
                )
            serve_options["allowed_local_media_path"] = str(allowed_media)

        if info.is_tts:
            talker_engine = engine_root / "talker"
            code_predictor_engine = engine_root / "code_predictor"
            code2wav_engine = engine_root / "code2wav"
            require_engine(talker_engine / "llm.engine")
            require_engine(code_predictor_engine / "llm.engine")
            require_engine(code2wav_engine / "code2wav.engine")
            tts_options = {
                "talker_engine_dir": str(talker_engine),
                "code_predictor_engine_dir": str(code_predictor_engine),
                "code2wav_engine_dir": str(code2wav_engine),
                "tokenizer_dir": str(talker_engine),
                "model": args.model,
            }
            server_code = (
                "from experimental.server import TTS; "
                f"tts=TTS(**{tts_options!r}); "
                f"tts.serve(host={args.host!r}, port={args.port})"
            )
            runner.run([sys.executable, "-c", server_code], home)
        else:
            expected_llm = "spec_base.engine" if args.spec_mode != "none" else "llm.engine"
            require_engine(llm_engine / expected_llm)
            llm_options = {
                "engine_dir": str(llm_engine),
                "draft_top_k": draft_top_k,
                "draft_step": draft_steps,
                "verify_tree_size": verify_size,
            }
            if (info.has_visual or info.has_audio) and args.spec_mode == "none" and not args.text_only:
                if info.has_visual:
                    require_engine(multimodal_engine / "visual/visual.engine")
                if info.has_audio:
                    require_engine(multimodal_engine / "audio/audio_encoder.engine")
                llm_options["multimodal_engine_dir"] = str(multimodal_engine)
            if info.model_type in PLE_MODEL_TYPES:
                launcher = gemma4_server_launcher(model_root)
                command = [
                    sys.executable,
                    str(launcher),
                    json.dumps(llm_options),
                    json.dumps(serve_options),
                ]
            else:
                server_code = (
                    "from experimental.server import LLM; "
                    f"llm=LLM(**{llm_options!r}); "
                    f"llm.serve(**{serve_options!r})"
                )
                command = [sys.executable, "-c", server_code]
            runner.run(command, home)

    manifest = {
        "edge_llm_version": EXPECTED_VERSION,
        "builder": args.builder,
        "model": args.model,
        "resolved_model": str(base_path),
        "model_type": info.model_type,
        "components": {
            "llm": info.has_llm,
            "visual": info.has_visual,
            "audio": info.has_audio,
            "talker": info.has_talker,
            "code_predictor": info.has_code_predictor,
            "code2wav": info.has_code2wav,
            "action": info.has_action or info.is_cosmos3_policy,
            "cosmos3_policy": info.is_cosmos3_policy,
            "rnnt": info.is_nemotron_asr,
        },
        "requested_external_weights": list(
            weightless_external_weights
            if args.builder == "weightless"
            else info.external_weights
        ),
        "externalized_weights": (
            None
            if args.builder == "weightless"
            else list(info.external_weights)
        ),
        "external_weight_binding_source": (
            "component config.json checkpoint bindings"
            if args.builder == "weightless"
            else "exported external-weight files"
        ),
        "speculative_decoding": {
            "mode": args.spec_mode,
            "draft_top_k": draft_top_k,
            "draft_steps": draft_steps,
            "verify_size": verify_size,
            "dflash_block_size": args.dflash_block_size,
        },
        "onnx_dir": str(export_root) if args.builder == "onnx" else None,
        "checkpoint_dir": str(base_path) if args.builder == "weightless" else None,
        "engine_dir": str(engine_root),
        "input_json": str(input_json) if input_json else None,
        "output_json": str(output_json) if output_json else None,
        "raw_output_json": str(raw_output_json) if raw_output_json else None,
        "profile_json": str(profile_json) if profile_json else None,
        "benchmark": {
            "prefill_len": prefill_len,
            "past_kv_len": past_kv_len,
            "output_len": args.bench_output_len,
            "summary": str(benchmark_summary) if benchmark_summary else None,
        },
        "commands": str(command_file),
        "run_dir": str(run_root),
    }
    (run_root / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print("\nTensorRT Edge-LLM workflow complete")
    print(f"  model type : {info.model_type}")
    print(f"  builder    : {args.builder}")
    if args.builder == "onnx":
        print(f"  ONNX       : {export_root}")
    print(f"  engines    : {engine_root}")
    print(f"  run        : {run_root}")
    print(f"  commands   : {command_file}")
    if need_infer:
        assert output_json is not None and profile_json is not None
        print(f"  output     : {output_json}")
        print(f"  profile    : {profile_json}")


if __name__ == "__main__":
    main()
PY

#!/usr/bin/env bash
# Build and serve NVIDIA-Nemotron-3.5-Lightning-30B-A3B-NVFP4 with TensorRT Edge-LLM 0.10.0.
# This helper deliberately supports this one checkpoint only; it is the staged validation path
# for the Jetson AI Lab model card.
set -euo pipefail

readonly MODEL_ID='nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-NVFP4'
readonly EDGE_LLM_VERSION='0.10.0'

stage='serve'
workspace='/data/edgellm/nemotron3-5-lightning'
port='8000'
max_batch_size='1'
max_input_len='2048'
max_kv_cache_capacity='2200'
dry_run='false'

usage() {
	printf '%s\n' \
		'Usage: run-nemotron35-lightning [options]' \
		'' \
		'Build and serve NVIDIA Nemotron 3.5 Lightning NVFP4 with TensorRT Edge-LLM 0.10.0.' \
		'' \
		'Options:' \
		'  --stage export|build|serve  Run one stage (default: serve; includes export and build)' \
		'  --workspace PATH            Persistent workspace (default: /data/edgellm/nemotron3-5-lightning)' \
		'  --port PORT                 OpenAI-compatible server port (default: 8000)' \
		'  --max-batch-size N          Engine maximum batch size (default: 1)' \
		'  --max-input-len N           Engine maximum input tokens (default: 2048)' \
		'  --max-kv-cache-capacity N   Engine KV-cache capacity (default: 2200)' \
		'  --dry-run                   Print the commands without downloading, building, or serving' \
		'  -h, --help                  Show this help'
}

die() { echo "error: $*" >&2; exit 1; }

while (($#)); do
	case "$1" in
		--stage) stage="${2:-}"; shift 2 ;;
		--workspace) workspace="${2:-}"; shift 2 ;;
		--port) port="${2:-}"; shift 2 ;;
		--max-batch-size) max_batch_size="${2:-}"; shift 2 ;;
		--max-input-len) max_input_len="${2:-}"; shift 2 ;;
		--max-kv-cache-capacity) max_kv_cache_capacity="${2:-}"; shift 2 ;;
		--dry-run) dry_run='true'; shift ;;
		-h|--help) usage; exit 0 ;;
		*) die "unknown option: $1" ;;
	esac
done

[[ "$stage" =~ ^(export|build|serve)$ ]] || die '--stage must be export, build, or serve'
[[ "$port" =~ ^[1-9][0-9]{0,4}$ ]] && ((port <= 65535)) || die '--port must be between 1 and 65535'
for value in "$max_batch_size" "$max_input_len" "$max_kv_cache_capacity"; do
	[[ "$value" =~ ^[1-9][0-9]*$ ]] || die 'engine limits must be positive integers'
done

edgellm_home="${EDGELLM_HOME:-/opt/TensorRT-Edge-LLM}"
[[ -f "$edgellm_home/CMakeLists.txt" ]] || die "TensorRT Edge-LLM source was not found at $edgellm_home"
if [[ -f "$edgellm_home/tensorrt_edgellm/_version.py" ]]; then
	installed_version="$(awk -F '"' '/^__version__[[:space:]]*=/ { print $2; exit }' "$edgellm_home/tensorrt_edgellm/_version.py")"
	[[ -z "$installed_version" || "$installed_version" == "$EDGE_LLM_VERSION" ]] || die "expected Edge-LLM $EDGE_LLM_VERSION, found $installed_version"
fi

model_dir="$workspace/model"
export_dir="$workspace/onnx"
engine_dir="$workspace/engines/b${max_batch_size}-i${max_input_len}-kv${max_kv_cache_capacity}"
llm_build="$edgellm_home/build/examples/llm/llm_build"
if command -v tensorrt-edgellm-export >/dev/null; then
	export_tool=(tensorrt-edgellm-export)
else
	export_tool=(python3 -m tensorrt_edgellm.scripts.export)
fi

run() {
	printf '+ '
	printf '%q ' "$@"
	printf '\n'
	[[ "$dry_run" == 'true' ]] || "$@"
}

download_model() {
	if [[ -f "$model_dir/config.json" ]]; then
		echo "Reusing checkpoint: $model_dir"
		return
	fi
	run mkdir -p "$model_dir"
	if [[ "$dry_run" == 'true' ]]; then return; fi
	python3 - "$model_dir" "$MODEL_ID" <<'PY'
from pathlib import Path
from huggingface_hub import snapshot_download

snapshot_download(
    repo_id=__import__('sys').argv[2],
    local_dir=Path(__import__('sys').argv[1]),
)
PY
}

copy_external_weights() {
	[[ "$dry_run" == 'true' ]] && return
	python3 - "$export_dir/llm" "$engine_dir" <<'PY'
import json
import os
import shutil
import sys
from pathlib import Path

source, destination = map(Path, sys.argv[1:])
for entry in json.loads((source / 'config.json').read_text()).get('external_weight_files', []):
    name = entry.get('file')
    if not isinstance(name, str):
        raise SystemExit(f'invalid external-weight entry: {entry!r}')
    src = (source / name).resolve()
    dst = destination / name
    if source.resolve() not in src.parents or not src.is_file():
        raise SystemExit(f'missing external weight: {name}')
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists() and src.samefile(dst):
        continue
    if dst.exists():
        dst.unlink()
    try:
        os.link(src, dst)
    except OSError:
        shutil.copy2(src, dst)
PY
}

if [[ "$stage" == 'export' || "$stage" == 'serve' ]]; then
	download_model
	run mkdir -p "$export_dir"
	if [[ "$dry_run" == 'true' || ! -f "$export_dir/llm/model.onnx" ]]; then
		run "${export_tool[@]}" "$model_dir" "$export_dir" \
			--max-kv-cache-capacity "$max_kv_cache_capacity" \
			--externalize-weights nvfp4_moe
	else
		echo "Reusing ONNX export: $export_dir"
	fi
fi

if [[ "$stage" == 'build' || "$stage" == 'serve' ]]; then
	[[ "$dry_run" == 'true' || -f "$export_dir/llm/model.onnx" ]] || die "missing ONNX export: $export_dir/llm/model.onnx (run --stage export first)"
	run mkdir -p "$engine_dir"
	copy_external_weights
	if [[ "$dry_run" == 'true' || ! -x "$llm_build" ]]; then
		run cmake --build "$edgellm_home/build" --target llm_build --parallel "$(nproc)"
	fi
	if [[ "$dry_run" == 'true' || ! -f "$engine_dir/llm.engine" ]]; then
		run "$llm_build" --onnxDir "$export_dir/llm" --engineDir "$engine_dir" \
			--maxBatchSize "$max_batch_size" \
			--maxInputLen "$max_input_len" \
			--maxKVCacheCapacity "$max_kv_cache_capacity"
	else
		echo "Reusing engine: $engine_dir/llm.engine"
	fi
fi

if [[ "$stage" == 'serve' ]]; then
	[[ "$dry_run" == 'true' || -f "$engine_dir/llm.engine" ]] || die "missing engine: $engine_dir/llm.engine"
	run python3 -c "from experimental.server import LLM; LLM(engine_dir='$engine_dir').serve(host='0.0.0.0', port=$port)"
fi

---
title: "Isaac GR00T 1.7 on Jetson Thor"
description: "Deploy NVIDIA Isaac GR00T 1.7 Vision-Language-Action (VLA) model on NVIDIA Jetson AGX Thor with TensorRT mixed NVFP4 quantization."
category: "VLA"
section: "Vision-Language-Action Models"
order: 2
tags: ["vla", "gr00t", "isaac-gr00t", "n1.7", "robotics", "jetson-thor", "tensorrt", "nvfp4", "fp8", "quantization", "modelopt", "libero", "vision-language-action"]
authors:
  - name: "Aditya Sahu"
    github: "adsahu-nv"
  - name: "Anqi Liu"
    github: "liuanqi-libra7"
---

<div id="groot-n17-guide">

Deploy NVIDIA's [Isaac GR00T 1.7](https://github.com/NVIDIA/Isaac-GR00T) **Vision-Language-Action (VLA)** model on **NVIDIA Jetson AGX Thor** with TensorRT mixed NVFP4 quantization, taking mean profiled policy-call latency from **117.21 ms down to 31.95 ms**, a **3.67x speedup** at approximately **31.3 policy calls per second** in the two-camera LIBERO test. The recipe combines mixed precision, optimized vision and attention graphs, and embodiment-specific engine weights.

> **Release prerequisite:** The updated optimization patch is validated locally but is not yet publicly distributed. Step 3 requires an approved copy; this branch is a review draft, not a fully public, copy-and-paste recipe yet.

## What is Isaac GR00T 1.7?

[Isaac GR00T](https://github.com/NVIDIA/Isaac-GR00T) is NVIDIA's open foundation model for generalized humanoid robot reasoning and skills. **GR00T 1.7** pairs a vision-language backbone with a diffusion-transformer action head: it takes camera images, robot proprioceptive state, and a natural-language instruction, and emits a chunk of robot actions through a short flow-matching denoising loop.

The same foundation model is post-trained onto different robot bodies, so the pipeline in this tutorial is not specific to any one embodiment:

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; align-items: start; margin: 1.5rem 0;">
  <figure style="margin: 0;">
    <img src="/images/tutorials/groot-n17-unitree-g1.gif" alt="GR00T policy running on the Unitree G1" style="width: 100%; height: auto; display: block; border-radius: 0.5rem;" />
    <figcaption style="margin-top: 0.5rem; text-align: center; font-size: 0.875rem; font-weight: 600;">Unitree G1</figcaption>
  </figure>
  <figure style="margin: 0;">
    <img src="/images/tutorials/groot-n17-agibot-g1.gif" alt="GR00T policy running on the AgiBot G1" style="width: 100%; height: auto; display: block; border-radius: 0.5rem;" />
    <figcaption style="margin-top: 0.5rem; text-align: center; font-size: 0.875rem; font-weight: 600;">AgiBot G1</figcaption>
  </figure>
  <figure style="margin: 0;">
    <img src="/images/tutorials/groot-n17-yam.gif" alt="GR00T policy running on YAM" style="width: 100%; height: auto; display: block; border-radius: 0.5rem;" />
    <figcaption style="margin-top: 0.5rem; text-align: center; font-size: 0.875rem; font-weight: 600;">YAM</figcaption>
  </figure>
</div>

The backbone is [`nvidia/Cosmos-Reason2-2B`](https://huggingface.co/nvidia/Cosmos-Reason2-2B), a **Qwen3-VL architecture** VLM (its config declares `Qwen3VLForConditionalGeneration`), loaded as a separate gated download rather than being bundled in the GR00T checkpoint, which is why Step 4 requires accepting its license. GR00T does not run all of it: the checkpoint sets `select_layer: 16`, and the loader physically pops text layers off the top until 16 remain, so 12 of Cosmos-Reason2-2B's 28 text layers are discarded before inference.

The model is a two-stage pipeline, and the two stages have very different performance characteristics, which turns out to be the key to optimizing it:

| Stage | Components | Why it costs time |
|---|---|---|
| **Backbone** | Cosmos-Reason2-2B vision tower (24 blocks) + text model (16 of 28 layers) | Large weight matrices, memory-bandwidth bound |
| **Action head** | State/action encoders + AlternateVLDiT (32 layers) + action decoder | Runs **once per denoising step** (4x by default) |

## Why Jetson AGX Thor?

VLA models fuse a vision encoder, a language model, and an action decoder into one pipeline that has to run at real-time control rates. Jetson AGX Thor brings Blackwell-class GPU compute with up to 128 GB of unified memory, so a 3B-parameter VLA fits entirely on-device with room for the TensorRT engines alongside it. Thor's Blackwell GPU has **native NVFP4 support**, a 4-bit floating-point format with per-block scaling. The recipe keeps selected operations at higher precision and validates the resulting actions separately from inference speed.

![GR00T 1.7 mean profiled policy-call latency on Jetson AGX Thor across PyTorch eager, torch.compile, TensorRT BF16, optimized FP8, and mixed NVFP4. The three stacked sections show data processing, backbone, and action head.](/images/tutorials/groot-n17-thor-latency.png?v=7860e4b1cf4c)

## Pipeline Overview

```
Checkpoint + calibration data ──► Quantized ONNX ──► TensorRT Engines ──► Verify + Benchmark
```

| Stage | What happens |
|---|---|
| **1. Calibrate** | ModelOpt collects quantization ranges from 10 LIBERO samples |
| **2. Export** | Each component is exported to ONNX with its precision and graph optimizations |
| **3. Build** | TensorRT compiles one engine per component, plus a cross-attention K/V engine |
| **4. Verify** | Compare TRT action output against the PyTorch reference |
| **5. Benchmark** | Measure synchronized complete-policy calls with preprocessing and action decoding |

`build_trt_pipeline.py` handles calibration/export, engine building, and verification. Step 9 runs `benchmark_inference.py` separately with `--flat-e2e` for complete-policy timing.

## Performance

Benchmarked on Jetson AGX Thor T5000 (L4T 39.2, MAXN observed), `GR00T-N1.7-LIBERO/libero_10`, **4 denoising steps, 2 cameras at 256×256, batch size 1**. Each of the five backends ran in **three fresh processes**, with **10 warmups** before each **100-call** timing pass and CPU thread counts fixed at 8 intra-op / 1 inter-op. The optimized rows use the patch in Step 3 and baked LIBERO embodiment ID 2.

The chart and table show **pooled arithmetic means from component-profiled policy calls**. Matched per-call stages add to the total; they are not separately measured medians scaled to fit a bar.

| Inference Backend | Backbone | Action Head | E2E Latency | Frequency | Speedup |
|---|---|---|---|---|---|
| PyTorch Eager (BF16) | 46.07 ms | 62.10 ms | 117.21 ms | 8.5 Hz | 1.00x |
| `torch.compile` | 46.51 ms | 48.04 ms | 100.67 ms | 9.9 Hz | 1.16x |
| TensorRT BF16 (full pipeline) | 26.31 ms | 45.45 ms | 77.12 ms | 13.0 Hz | 1.52x |
| TensorRT optimized + FP8 | 11.74 ms | 19.81 ms | 36.96 ms | 27.1 Hz | 3.17x |
| **TensorRT optimized + mixed NVFP4** | **10.85 ms** | **16.03 ms** | **31.95 ms** | **31.3 Hz** | **3.67x** |

The gray chart segment includes preprocessing, action decoding, and policy overhead. Model-input device preparation is counted with the backbone. Frequency means policy calls per second—not a robot control-loop rate.

A separate fresh-install validation rebuilt the container and engines, then timed **100 complete policy calls per backend in each of three fresh processes**, without intermediate profiling synchronizations. Pooled medians were **115.52 ms BF16 / 32.69 ms mixed NVFP4** (**3.53x**). The five-backend component-profiled chart was not rerun in that validation. Profiling changes execution timing, and differences between passes also include clock and thermal variation; the stacked chart is not a breakdown of these medians.

`torch.compile` compiles the DiT forward pass with `mode="max-autotune"`, not the entire policy. The TensorRT BF16 row retains an FP32 vision engine. For the FP8 comparison, use Step 9 with `--quantization fp8` and a separate output directory; the unquantized TensorRT baseline is built in Step 8.

> **Note:** All five configurations used PyTorch 2.13.0+cu132, TensorRT 10.16.1.11, ModelOpt 0.39.0, and the same runtime image. Clock locking was not verified. Camera capture, RPC, and physical robot execution are excluded. These are LIBERO measurements, not SO101 performance; task-accuracy validation is discussed in Step 10.

## How the Optimization Works

Per-component quantization and graph optimizations work together across the vision-language backbone and action head.

### 1. Per-component quantization

Precision is chosen per component rather than uniformly, because the vision tower and the language model tolerate quantization very differently:

| Policy | ViT | LLM | DiT | Encoders / decoder |
|---|---|---|---|---|
| baseline (`none`) | fp32 | bf16 | bf16 | bf16 |
| `fp8` | fp8 | fp8 | fp8 | fp16 |
| **`mixed_nvfp4`** | fp8 | **nvfp4** | **nvfp4** | fp16 |

Even under the NVFP4 policy, accuracy-sensitive layers stay at higher precision: the LLM `o_proj` and `down_proj`, and the DiT attention, remain FP8. FP8 and NVFP4 are both Q/DQ recipes layered over an FP16 graph, so the TensorRT network boundary stays FP16 in either case. The vision-language self-attention module also uses FP8 feed-forward projections while keeping attention and its graph boundary at FP16.

### 2. Optimized execution profile

The optimized profile restructures the graph to avoid repeated work:

- **Cross-attention K/V hoisting.** The DiT's cross-attention keys and values depend only on the vision-language context, not on the denoising timestep. They are computed **once** and reused across all 4 denoising steps instead of being recomputed each step. This produces the extra `dit_cross_kv_*.engine` artifact you will see in the output directory.
- **Offline timestep precomputation.** Because the 4 denoising timesteps are fixed and known ahead of time, everything derived from them (AdaLN modulations, output modulations, action time embeddings) is computed at export time and saved to `action_head_constants.pt`. At runtime these are simply indexed.
- **Linear-layer fusion.** Projections that share an input are concatenated into a single larger GEMM, reducing kernel launches.
- **CUDA graph capture** of the action head for a matching input signature. Other prompt lengths can use eager TensorRT execution; that still uses the TensorRT engines.
- **Vision patch projection as GEMM.** A compatible full-patch convolution is expressed as a matrix multiplication.
- **Dense DeepStack updates and grouped-query attention.** Dense vision-feature insertion and an attention graph without repeated K/V tensors reduce avoidable data movement.
- **Embodiment-specific weights.** Optional `--bake-embodiment-id` selects one robot's encoder/decoder weights during export. Step 9 derives this ID from the checkpoint and rebuilds all engines.

<details>
<summary><strong>Which engines get built (click to expand)</strong></summary>

| Engine | Component | Precision under `mixed_nvfp4` |
|---|---|---|
| `vit_fp8.engine` | Qwen3-VL vision tower, 24 blocks | FP8 |
| `llm_nvfp4.engine` | Qwen3-VL text model, 16 layers | NVFP4 (FP8 for `o_proj`/`down_proj`) |
| `vl_self_attention.engine` | SelfAttentionTransformer, 4 layers | FP8 feed-forward projections; FP16 attention/boundary |
| `state_encoder.engine` | CategorySpecificMLP | FP16 |
| `action_encoder.engine` | MultiEmbodimentActionEncoder | FP16 |
| `dit_nvfp4.engine` | AlternateVLDiT, 32 layers | NVFP4 (FP8 attention) |
| `dit_cross_kv_nvfp4.engine` | Hoisted cross-attention K/V | FP8 projections within the mixed-NVFP4 recipe |
| `action_decoder.engine` | CategorySpecificMLP | FP16 |

Lightweight operations stay in PyTorch: `embed_tokens`, `masked_scatter`, `get_rope_index`, and VLLN.

</details>

## Prerequisites

### Hardware

- **NVIDIA Jetson AGX Thor** Developer Kit
- NVMe SSD strongly recommended. Plan for **around 120 GiB free** for a fresh build including the optional BF16 baseline, NVFP4 engines, models, calibration data, export intermediates, and build cache. This is conservative planning headroom, not a measured minimum; retaining additional builds requires more space.

### Software

| Component | Required Version |
|---|---|
| Jetson Linux | L4T 39.2, as tested |
| Container CUDA | 13.2, via the pinned Jetson Dockerfile |
| Docker | 28.x+ |
| NVIDIA Container Toolkit | 1.18+ |
| Git LFS | any recent |
| Hugging Face CLI | `hf` installed on the host |

> **Check your setup:**
> ```bash
> cat /etc/nv_tegra_release   # Should show R39
> nvidia-smi                  # Should show CUDA 13.x, NVIDIA Thor
> docker --version            # Docker 28.x or newer
> git lfs version             # Must be present before cloning (see Step 2)
> ```

### Hugging Face access

This checkpoint loads the gated backbone **`nvidia/Cosmos-Reason2-2B`**. Request access and accept its license at [huggingface.co/nvidia/Cosmos-Reason2-2B](https://huggingface.co/nvidia/Cosmos-Reason2-2B) before downloading.

## Step 1: Set Jetson to Maximum Performance

For a dedicated benchmark session, use consistent power and clock settings with suitable cooling. The following commands change system-wide settings; record the current mode with `sudo nvpmodel -q` first. The reported measurements observed MAXN but did not verify locked clocks.

```bash
# Set maximum performance power mode
sudo nvpmodel -m 0

# Lock all clocks to maximum frequency
sudo jetson_clocks
```

Verify with:

```bash
sudo jetson_clocks --show
```

## Step 2: Install Git LFS (before cloning)

The pinned Isaac-GR00T checkout stores the Jetson FlashAttention wheel and demo data as Git LFS objects, so install `git-lfs` before cloning.

Install it with apt:

```bash
sudo apt-get update && sudo apt-get install -y git-lfs
git lfs install
```

## Step 3: Clone the Repository and Add the Optimization Patch

### 3.1 Clone Isaac-GR00T

```bash
GIT_LFS_SKIP_SMUDGE=1 git clone https://github.com/NVIDIA/Isaac-GR00T.git
cd Isaac-GR00T
GIT_LFS_SKIP_SMUDGE=1 git checkout 944fe70c4fd54e3fcb80a7d7258a328f9c061176
git lfs pull --include='scripts/deployment/jetson/wheels/**,demo_data/libero_demo/**' --exclude=''
```

Confirm the wheel is a Zip archive rather than an ASCII LFS pointer:

```bash
file scripts/deployment/jetson/wheels/*.whl
```

> **Note:** The optimization patch must match public base commit `944fe70c4fd54e3fcb80a7d7258a328f9c061176`.

### 3.2 Add the TensorRT Optimization Patch

> **Release prerequisite:** Anqi's updated patch has been validated locally but is not yet publicly released. Obtain an approved copy for the pinned commit before continuing. This local draft does not provide a download URL.

Set `GROOT_OPT_PATCH` to that patch file's absolute path, then apply it from the checkout root:

```bash
: "${GROOT_OPT_PATCH:?Set GROOT_OPT_PATCH to the approved optimization patch file}"
git apply --check "$GROOT_OPT_PATCH" &&
git apply "$GROOT_OPT_PATCH"
```

The patch adds the vision projection, dense DeepStack, grouped-query attention, and optional embodiment-baking changes described above. The remaining steps assume it has been applied; the unpatched public base does not support `--bake-embodiment-id`.

## Step 4: Authenticate with Hugging Face

Use a dedicated cache outside the source checkout:

```bash
export HF_HOME="$PWD/../groot-hf-cache"
hf auth login
hf auth whoami   # must print your username
```

Keep this shell open for the download and container-launch steps. Never place the token in a script or command-line argument.

## Step 5: Download the Checkpoint and Calibration Dataset

```bash
# Inference checkpoint only; the broad libero_10/* pattern also downloads optimizer state.
hf download nvidia/GR00T-N1.7-LIBERO \
  libero_10/config.json \
  libero_10/embodiment_id.json \
  libero_10/processor_config.json \
  libero_10/statistics.json \
  libero_10/model-00001-of-00002.safetensors \
  libero_10/model-00002-of-00002.safetensors \
  libero_10/model.safetensors.index.json \
  --revision 2ea293aa20ba7cf5bbf3ba17a5fbcb1a01cbfe21 \
  --local-dir checkpoints/GR00T-N1.7-LIBERO \
  --max-workers 2

# Calibration dataset
hf download --repo-type dataset IPEC-COMMUNITY/libero_10_no_noops_1.0.0_lerobot \
  --revision e1a223d30b896c1613f270a2bfc63d382b3de7e1 \
  --local-dir examples/LIBERO/libero_10_no_noops_1.0.0_lerobot

# Dataset modality descriptor
cp examples/LIBERO/modality.json \
  examples/LIBERO/libero_10_no_noops_1.0.0_lerobot/meta/modality.json

# Gated backbone, downloaded before starting the offline container
hf download nvidia/Cosmos-Reason2-2B
```

The tested backbone revision is `9ce19a195e423419c349abfc86fd07178b230561`. The loader resolves the cached `main` reference, so verify it before proceeding; downloading a SHA alone does not override that lookup:

```bash
python3 - <<'PY'
import os
from pathlib import Path
ref = Path(os.environ["HF_HOME"]) / "hub/models--nvidia--Cosmos-Reason2-2B/refs/main"
if ref.read_text().strip() != "9ce19a195e423419c349abfc86fd07178b230561":
    raise SystemExit("Backbone revision changed. Establish a supported pin or revalidate before continuing.")
print("Backbone revision matches.")
PY
```

> **Tip:** For another fine-tune, check its camera/state modalities, normalization statistics, calibration data, and embodiment mapping. The LIBERO embodiment ID and results do not automatically apply to SO101.

## Step 6: Build the Docker Image for Jetson Thor

From the checkout root:

```bash
docker build --network host \
  -f scripts/deployment/jetson/Dockerfile \
  -t gr00t-thor:944fe70 .
```

<details>
<summary><strong>What the Dockerfile does (click to expand)</strong></summary>

- **Base image:** `nvidia/cuda:13.2.1-devel-ubuntu24.04`
- **Dependencies:** Jetson-specific `scripts/deployment/jetson/pyproject.toml`, including its quantization extra
- **Venv:** `/opt/gr00t-venv`, activated by default
- **Installs:** Python 3.12, PyTorch 2.13.0+cu132, TorchCodec 0.15.0+cu132, the bundled FlashAttention wheel, TensorRT, and ModelOpt 0.39.0

The fresh validation image used `MAX_JOBS=4`, `NVCC_THREADS=1`, `CMAKE_BUILD_PARALLEL_LEVEL=4`, `UV_CONCURRENT_DOWNLOADS=2`, and `UV_LINK_MODE=copy`, with a new package cache and calibration/engine output directories excluded from the build context. It was built with `--no-cache --pull`; existing immutable base-image layers could still be reused. These are resource-only adaptations to the upstream Dockerfile shown above, not model changes. Some dependency versions are ranges, so verify the installed stack before comparing results.

</details>

```bash
docker run --rm --runtime nvidia --gpus all gr00t-thor:944fe70 python -c "
import torch, tensorrt as trt, modelopt, transformers
print('torch     ', torch.__version__, 'CUDA', torch.version.cuda)
print('TensorRT  ', trt.__version__)
print('ModelOpt  ', modelopt.__version__)
print('Transformers', transformers.__version__)
print('device    ', torch.cuda.get_device_name(0))
print('capability', torch.cuda.get_device_capability(0))"
```

Tested: PyTorch **2.13.0+cu132**, CUDA **13.2**, TensorRT **10.16.1.11**, ModelOpt **0.39.0**, Transformers **4.57.6**, `NVIDIA Thor`, capability `(11, 0)`.

## Step 7: Launch the Docker Container

```bash
docker run -it --rm --runtime nvidia --gpus all \
  --network none \
  --ipc=host --ulimit memlock=-1 --ulimit stack=67108864 \
  -v "$PWD":/workspace/repo \
  -v "$HF_HOME/hub":/cache/huggingface/hub:ro \
  -w /workspace/repo \
  -e PYTHONPATH=/workspace/repo \
  -e HF_HOME=/cache/huggingface \
  -e HF_HUB_OFFLINE=1 -e TRANSFORMERS_OFFLINE=1 \
  gr00t-thor:944fe70 bash
```

**You are now inside the container.** All remaining steps run in this shell. Use its `python` directly; `uv run` from the repository root can select a different environment. The container does not receive robot or camera devices.

## Step 8: (Optional) Build the Baseline bf16 Engines

Useful for checking the pipeline without quantization. This optional TensorRT baseline is different from the PyTorch BF16 reference in the performance table.

```bash
python gr00t/data/stats.py \
  --dataset-path demo_data/libero_demo \
  --embodiment-tag LIBERO_PANDA

python scripts/deployment/build_trt_pipeline.py \
  --model-path checkpoints/GR00T-N1.7-LIBERO/libero_10 \
  --dataset-path demo_data/libero_demo \
  --embodiment-tag LIBERO_PANDA \
  --batch-size 1 \
  --output-dir ./gr00t_trt_baseline \
  --steps export,build,verify
```

## Step 9: Build the Optimized NVFP4 Engines

This recipe uses mixed precision, optimized execution, and checkpoint-specific embodiment baking.

### 9.1 Check ModelOpt

The Jetson image already installs the quantization dependencies:

```bash
python -c "import modelopt; print('modelopt', modelopt.__version__)"
```

Expected: `0.39.0`.

### 9.2 Generate dataset normalization statistics

Generate statistics for both the demo inputs and calibration dataset, including when you skipped Step 8:

```bash
python gr00t/data/stats.py \
  --dataset-path demo_data/libero_demo \
  --embodiment-tag LIBERO_PANDA

python gr00t/data/stats.py \
  --dataset-path examples/LIBERO/libero_10_no_noops_1.0.0_lerobot \
  --embodiment-tag LIBERO_PANDA
```

### 9.3 Export, calibrate, build, verify, and benchmark

Read the embodiment ID from the checkpoint:

```bash
BAKE_EMBODIMENT_ID=$(python -c '
import json
with open("checkpoints/GR00T-N1.7-LIBERO/libero_10/embodiment_id.json") as stream:
    print(json.load(stream)["libero_sim"])
')
printf 'LIBERO embodiment ID: %s\n' "$BAKE_EMBODIMENT_ID"
```

For this checkpoint, the ID is **2**. It is not a universal robot ID. Baking is optional, but was enabled for the reported result; choose the correct mapping for another embodiment and rebuild all engines.

The following launcher fixes calibration seeds before calling the pipeline. Use a fresh output directory rather than mixing engines from different configurations.

```bash
set -o pipefail
python -c '
import random, runpy, sys
import numpy as np
import torch
random.seed(42)
np.random.seed(42)
torch.manual_seed(42)
torch.cuda.manual_seed_all(42)
script = "scripts/deployment/build_trt_pipeline.py"
sys.argv[0] = script
runpy.run_path(script, run_name="__main__")
' \
  --model-path checkpoints/GR00T-N1.7-LIBERO/libero_10 \
  --dataset-path demo_data/libero_demo \
  --embodiment-tag LIBERO_PANDA \
  --batch-size 1 \
  --output-dir ./gr00t_trt_optimized_mixed_nvfp4 \
  --steps export,build,verify \
  --execution-profile optimized \
  --quantization mixed_nvfp4 \
  --bake-embodiment-id "$BAKE_EMBODIMENT_ID" \
  --calib-dataset-path examples/LIBERO/libero_10_no_noops_1.0.0_lerobot \
  --calib-size 10 2>&1 | tee gr00t-nvfp4-build.log || exit "$?"
```

The key flags are `--execution-profile optimized`, `--quantization mixed_nvfp4`, `--bake-embodiment-id`, and the `--calib-*` pair. Seeds do not force deterministic GPU kernels.

**Recorded verification output:**

```text
N1.7 optimized full-pipeline TRT engines loaded.
  ViT: TRT | LLM: TRT | Action Head: TRT CUDA graph

[6b] Final action output comparison:
  Cosine Similarity: 0.999493
  L1 Mean Error:     0.007637
  PASS — TRT matches PyTorch
```

Confirm that all **eight engines** were built and loaded. The pipeline can print a verification failure while returning exit code zero, so also check the recorded result explicitly:

```bash
python - gr00t-nvfp4-build.log ./gr00t_trt_optimized_mixed_nvfp4/engines <<'PY'
import math
from pathlib import Path
import re
import sys

log = Path(sys.argv[1]).read_text()
engine_dir = Path(sys.argv[2])
expected = {
    "vit_fp8.engine", "llm_nvfp4.engine", "vl_self_attention.engine",
    "state_encoder.engine", "action_encoder.engine", "dit_nvfp4.engine",
    "dit_cross_kv_nvfp4.engine", "action_decoder.engine",
}
results = re.findall(r"Verify complete -- cosine=(\S+) (PASS|FAIL)", log)
if len(results) != 1:
    raise SystemExit("Missing or ambiguous verification result; inspect the log.")
try:
    cosine = float(results[0][0])
except ValueError:
    raise SystemExit("Invalid verification cosine; inspect the log.")
if results[0][1] != "PASS" or not math.isfinite(cosine) or not 0.99 < cosine <= 1.0:
    raise SystemExit("Numerical smoke check failed; do not continue to deployment.")
if {path.name for path in engine_dir.glob("*.engine")} != expected:
    raise SystemExit("Expected exactly the eight mixed-NVFP4 engines.")
for name in expected | {"export_metadata.json", "action_head_constants.pt"}:
    path = engine_dir / name
    if not path.is_file() or path.is_symlink() or path.stat().st_size == 0:
        raise SystemExit(f"Missing, empty, or linked engine artifact: {path}")
if "N1.7 optimized full-pipeline TRT engines loaded." not in log:
    raise SystemExit("Missing successful engine-load verification.")
print(f"Engine bundle and numerical smoke check passed (cosine={cosine:.6f}).")
PY
```

This single-observation check is not proof of task accuracy; use the additional checks in Step 10.

Run the complete-policy benchmark separately. `--flat-e2e` includes preprocessing and action decoding rather than summing separately timed components:

```bash
for trial in 1 2 3; do
  python -c '
import runpy, sys, torch
torch.set_num_threads(8)
torch.set_num_interop_threads(1)
script = "scripts/deployment/benchmark_inference.py"
sys.argv[0] = script
runpy.run_path(script, run_name="__main__")
' \
    --model-path checkpoints/GR00T-N1.7-LIBERO/libero_10 \
    --dataset-path demo_data/libero_demo \
    --embodiment-tag LIBERO_PANDA \
    --trt-engine-path ./gr00t_trt_optimized_mixed_nvfp4/engines \
    --trt-mode n17_full_pipeline --batch-size 1 \
    --num-iterations 100 --warmup 10 --seed 42 \
    --flat-e2e --skip-compile || exit "$?"
done
```

The fresh validation's three CLI runs printed BF16 medians of **111.3, 113.2, and 112.1 ms**, and TensorRT medians of **32.7, 33.0, and 33.3 ms**. A separate three-process repeat captured 300 raw timings per backend and measured pooled medians of **115.52 ms BF16 / 32.69 ms TensorRT** (**3.53x**). That raw capture used a separate local measurement helper, not an average of the three printed CLI medians. The stacked chart and performance table use a separate synchronized component-profiling pass and report additive means. Omit `--skip-compile` when also measuring the compiled DiT baseline; its initial compilation occurs during warmup.

<details>
<summary><strong>Other quantization policies (click to expand)</strong></summary>

| Flags | Precision | Notes |
|---|---|---|
| *(none)* | bf16 | Optional baseline, no calibration needed |
| `--execution-profile optimized --quantization fp8` | FP8 | Alternative precision recipe; evaluate latency and accuracy for your task |
| **`--execution-profile optimized --quantization mixed_nvfp4`** | **FP8 + NVFP4** | **Recipe used here, with optional embodiment baking** |

> **Note:** Batch size and baked embodiment weights are part of the engine contract. Rebuild after changing the checkpoint, embodiment, export settings, GPU architecture, or incompatible TensorRT runtime. Keep `export_metadata.json` and `action_head_constants.pt` with the engines.

</details>

## Step 10: (Optional) Verify Action Accuracy on Real Trajectories

Numerical similarity and task success are different checks. A controlled diagnostic of 15 observations from five demo episodes, using three seeds (45 paired comparisons), measured the following against BF16. This test captured BF16's initial noise and supplied it unchanged to TensorRT, bypassing TensorRT's native random sampling to isolate numerical differences; it is not a production-runtime accuracy acceptance test:

| Metric | Mixed NVFP4 result |
|---|---|
| Decoded action cosine | 0.99810 |
| Decoded action MAE | 0.00628 |
| Decoded action RMSE | 0.02253 |
| Maximum absolute action error | 0.97803 |
| Opposite gripper commands | 2 / 720 |

The two gripper disagreements occurred at the 13th action in the chunk; none occurred within the first eight predicted actions in this sample. These observations were not established as held out from training/calibration, and no closed-loop LIBERO or real SO101 task evaluation was performed. **BF16-equivalent task accuracy is not established.**

<details>
<summary><strong>Commands, output, and plots (click to expand)</strong></summary>

The standalone scripts compare predictions with recorded actions and produce per-dimension plots. Both commands completed in the fresh validation. Separate invocations do not reproduce the paired-noise diagnostic above, which used a local diagnostic helper that is not distributed here.

```bash
# PyTorch reference
python scripts/deployment/standalone_inference_script.py \
  --model-path checkpoints/GR00T-N1.7-LIBERO/libero_10 \
  --dataset-path demo_data/libero_demo \
  --embodiment-tag LIBERO_PANDA \
  --traj-ids 0 --inference-mode pytorch --execution-horizon 8 \
  --save-plot-path ./output/pytorch_inference.png

# Optimized TensorRT engines
python scripts/deployment/standalone_inference_script.py \
  --model-path checkpoints/GR00T-N1.7-LIBERO/libero_10 \
  --dataset-path demo_data/libero_demo \
  --embodiment-tag LIBERO_PANDA \
  --traj-ids 0 --inference-mode trt_full_pipeline --execution-horizon 8 \
  --trt-engine-path ./gr00t_trt_optimized_mixed_nvfp4/engines \
  --save-plot-path ./output/trt_nvfp4_inference.png
```

Run additional episodes with distinct plot filenames; reusing an explicit filename overwrites the previous plot. Inspect each action dimension and gripper decision, then compare BF16 and TensorRT on held-out inputs and closed-loop tasks using predefined acceptance criteria.

> **Note:** Changed prompt lengths can use eager TensorRT instead of the captured action-head CUDA graph. In the paired diagnostic, nine trials used capture/replay and 36 used eager TensorRT. The fixed-input latency table does not measure every possible input shape.

</details>

## Deploying in Your Own Code

`scripts/deployment/standalone_inference_script.py` is the reference implementation: it shows how to load the engines, bind inputs, and run the denoising loop against a real observation stream. The engine-loading and optimized forward logic live in `scripts/deployment/trt/trt_model_forward.py`; the optimized runtime is selected automatically from `export_metadata.json` in the engines directory.

> **Note:** the bundled policy server (`gr00t/eval/run_gr00t_server.py`) does **not** currently accept a TensorRT engine path; it serves the PyTorch model only. To serve the optimized engines over a network, wrap the runtime from `standalone_inference_script.py` in your own server process.

## Troubleshooting

| Issue | Solution |
|---|---|
| Wheel cannot be opened during Docker build | Fetch `scripts/deployment/jetson/wheels/**` with Git LFS, then rebuild. The wheel must not be an ASCII pointer. |
| `--bake-embodiment-id` is rejected | Confirm the approved patch in Step 3 was applied before building the runtime. The existing `download.sh` and downloadable patch target a different base commit and cannot substitute for this patch. |
| Wrong Torch/TensorRT version or ModelOpt is missing | Use the pinned Jetson Dockerfile and its `/opt/gr00t-venv/bin/python`, not the generic root-project environment. |
| Gated Cosmos download fails | Accept the backbone license, check `hf auth whoami`, and finish downloading before starting the offline container. |
| Backbone revision check fails | Establish a supported pin or revalidate the changed backbone before proceeding. |
| High cosine but different gripper commands | Inspect decoded actions and evaluate task success; aggregate similarity alone is not an accuracy guarantee. |

## References

- [Isaac GR00T GitHub Repository](https://github.com/NVIDIA/Isaac-GR00T)
- [GR00T N1.7 LIBERO checkpoints](https://huggingface.co/nvidia/GR00T-N1.7-LIBERO)
- [NVIDIA ModelOpt (Quantization)](https://github.com/NVIDIA/TensorRT-Model-Optimizer)
- [NVIDIA TensorRT Documentation](https://docs.nvidia.com/deeplearning/tensorrt/)

</div>

<style>
  #groot-n17-guide { min-width: 0; }
  #groot-n17-guide table { display: block; max-width: 100%; overflow-x: auto; }
  #groot-n17-guide :not(pre) > code { overflow-wrap: anywhere; }
</style>

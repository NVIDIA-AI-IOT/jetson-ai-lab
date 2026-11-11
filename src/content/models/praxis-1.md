---
title: "Praxis-1"
model_id: "praxis-1"
short_description: "Runway's world action model predicts robot actions and future video on Jetson Thor with NVFP4."
family: "Runway Praxis"
catalog_added_at: "2026-11-11"
order: -8
type: "Multimodal"
vision_capable: true
precision: "NVFP4 / BF16"
parameters: "27B / ~3B active"
modalities: ["Text", "Image", "Video", "Action"]
input_modalities: ["text", "image", "action"]
output_modalities: ["action", "video"]
tasks: ["action-generation", "text-to-video"]
hf_pipeline_tag: "robotics"
license: "Apache 2.0"
hf_checkpoint: "runwayml/praxis-1-droid-nvfp4"
huggingface_url: "https://huggingface.co/runwayml/praxis-1-droid-nvfp4"
minimum_jetson: "Thor"
hide_run_button: true
serving:
  entries:
    - engine: "PyTorch"
      type: "Python"
      modules_supported:
        - thor_t5000
      serve_command_thor: |-
        # Run from praxis-1 after completing the setup below.
        . .venv/bin/activate
        python -m praxis.serve --config configs/serve_droid.yaml --host 0.0.0.0 --port 8000 \
          --set model.checkpoint=checkpoints/praxis-1-droid-nvfp4 \
          --set model.routed_precision=nvfp4 \
          --set model.nvfp4_cache=checkpoints/nvfp4-cache
one_shot_inference:
  modules_supported:
    - thor_t5000
  intro: "Run from praxis-1 after completing the setup below, with the virtual environment activated."
  shell: |-
    python scripts/benchmark_inference.py --config configs/serve_droid.yaml \
      --set model.checkpoint=checkpoints/praxis-1-droid-nvfp4 \
      --set model.routed_precision=nvfp4 \
      --set model.nvfp4_cache=checkpoints/nvfp4-cache \
      --sessions 2 --calls 6
---

## Overview

[Praxis-1](https://github.com/runwayml/praxis-1-oss) is a **world action model** from Runway: a single model that imagines how the scene will unfold and decides what the robot should do next. At every step it takes:

- two camera views (exterior and wrist),
- the robot's current pose,
- a text instruction (for example, "Put the red block in the bowl."),

and predicts the next chunk of robot actions together with the video it expects to see. The model is a 27B-parameter mixture of experts (about 3B active per token), plus the Wan2.2 video autoencoder and the Qwen3.5-2B text encoder.

## Prerequisites

- **Jetson AGX Thor Developer Kit** (T5000, 128 GB)
- **JetPack 7.2.1**
- About 100 GB of free NVMe storage for weights and the packed-weight cache
- A Hugging Face account
- Optional: put the board in MAXN mode for maximum performance (`sudo nvpmodel -m 0`)

We recommend running the steps below inside the `nvcr.io/nvidia/cuda:13.0.3-devel-ubuntu24.04` CUDA container.

## Step 1: Get the code and set up the environment

```bash
git clone https://github.com/runwayml/praxis-1-oss.git praxis-1
cd praxis-1

python3.12 -m venv .venv && . .venv/bin/activate
pip install -U pip
pip install torch==2.13.0 torchvision==0.28.0 --index-url https://download.pytorch.org/whl/cu130
pip install packaging ninja wheel
CAUSAL_CONV1D_FORCE_BUILD=TRUE MAX_JOBS=8 \
  pip install --no-cache-dir --no-build-isolation causal-conv1d==1.6.1
pip install -e ".[kernels,flash,nvfp4,thor,serve]"
pip install --no-deps nvidia-cudnn-cu13==9.24.0.43
```

## Step 2: Download the weights

```bash
hf auth login
hf download Wan-AI/Wan2.2-TI2V-5B Wan2.2_VAE.pth --local-dir weights
hf download Qwen/Qwen3.5-2B --local-dir weights/Qwen3.5-2B
hf download runwayml/praxis-1-droid-nvfp4 --local-dir checkpoints/praxis-1-droid-nvfp4
(cd checkpoints/praxis-1-droid-nvfp4 && sha256sum -c --quiet SHA256SUMS && echo "checkpoint OK")
```

`praxis-1-droid-nvfp4` is the single-arm (DROID) checkpoint fine-tuned for NVFP4. It is stored in BF16 and packed to NVFP4 when it loads.

## Step 3: Verify the setup

Check that PyTorch sees Thor and the kernels load:

```bash
python -c "import torch, causal_conv1d_cuda; print(torch.cuda.get_device_name(), torch.cuda.get_device_capability())"
```

You should see the Thor GPU with capability `(11, 0)`.

Then run the built-in benchmark. It feeds the policy synthetic camera frames and a fixed instruction and times each call:

```bash
python scripts/benchmark_inference.py --config configs/serve_droid.yaml \
  --set model.checkpoint=checkpoints/praxis-1-droid-nvfp4 \
  --set model.routed_precision=nvfp4 \
  --set model.nvfp4_cache=checkpoints/nvfp4-cache \
  --sessions 2 --calls 6
```

The first run packs the experts to NVFP4 and saves them to `checkpoints/nvfp4-cache`. Later runs load from the cache.

**Expected latency:** about 1.4 s per call with the default video guidance (4.0), and about 900 ms with `--set sampler.cfg_video_scale=1.0`.

## Step 4: Serve the policy

```bash
python -m praxis.serve --config configs/serve_droid.yaml --host 0.0.0.0 --port 8000 \
  --set model.checkpoint=checkpoints/praxis-1-droid-nvfp4 \
  --set model.routed_precision=nvfp4 \
  --set model.nvfp4_cache=checkpoints/nvfp4-cache
```

Clients connect over WebSocket at `ws://<thor-ip>:8000/api/v1/session`, sending camera frames, the robot pose and the instruction, and receiving action chunks. See [`praxis/serve/README.md`](https://github.com/runwayml/praxis-1-oss/blob/main/praxis/serve/README.md) for the protocol.

## Next steps

- **Connect a robot:** point your robot client at the server above.
- **Try it in simulation:** `scripts/run_sim.py` runs closed-loop episodes (install the `sim` extra).
- **Replay your own episodes:** `scripts/run_inference.py` on recorded camera frames and poses.
- **Fine-tune for your rig:** see [`praxis/train/README.md`](https://github.com/runwayml/praxis-1-oss/blob/main/praxis/train/README.md).

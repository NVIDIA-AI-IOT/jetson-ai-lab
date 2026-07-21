---
title: "Cosmos3 Edge"
model_id: "cosmos3-edge"
short_description: "NVIDIA's edge-optimized omnimodal world model (4B) — multimodal reasoning, video generation, and robot action policies on Jetson."
family: "NVIDIA Cosmos"
icon: "🤖"
is_new: true
order: 4
type: "Multimodal"
vision_capable: true
memory_requirements: "32GB RAM (Reasoner: 8GB)"
precision: "BF16"
parameters: "4B (2.4B reasoner + generator)"
modalities: ["Text", "Image", "Video", "Action"]
license: "OpenMDW 1.1"
model_size: "9.2GB"
hf_checkpoint: "nvidia/Cosmos3-Edge"
huggingface_url: "https://huggingface.co/nvidia/Cosmos3-Edge"
minimum_jetson: "AGX Orin"
supported_inference_engines:
  - engine: "vLLM"
    type: "Container · Reasoner (Text/Image/Video → Text)"
    modules_supported:
      - thor_t5000
      - thor_t4000
      - orin_agx_64
    serve_command_thor: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        -v $HOME/.cache/huggingface:/root/.cache/huggingface \
        --entrypoint "" \
        vllm/vllm-openai:cosmos3 \
        vllm serve nvidia/Cosmos3-Edge \
          --host 0.0.0.0 --port 8000 \
          --trust-remote-code \
          --max-model-len 16384 \
          --gpu-memory-utilization 0.3
    serve_command_orin: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        -v $HOME/.cache/huggingface:/root/.cache/huggingface \
        --entrypoint "" \
        vllm/vllm-openai:cosmos3 \
        vllm serve nvidia/Cosmos3-Edge \
          --host 0.0.0.0 --port 8000 \
          --trust-remote-code \
          --max-model-len 16384 \
          --gpu-memory-utilization 0.3
  - engine: "vLLM-Omni"
    type: "Container · Generator / Action"
    modules_supported:
      - thor_t5000
      - thor_t4000
    serve_command_thor: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        -v $HOME/.cache/huggingface:/root/.cache/huggingface \
        vllm/vllm-omni:cosmos3 \
        vllm serve nvidia/Cosmos3-Edge \
          --omni \
          --host 0.0.0.0 --port 8000 \
          --trust-remote-code \
          --init-timeout 1800
benchmark_key: "Cosmos3 Edge (Reasoner)"
benchmark_series:
  - "Cosmos3 Nano"
  - "Cosmos Reasoning 2 2B"
---

[Cosmos3 Edge](https://huggingface.co/nvidia/Cosmos3-Edge) is the edge-optimized member of the NVIDIA Cosmos3 family of omnimodal world models: a 2.4B multimodal reasoner paired with a diffusion-based generative tower (~4B total). It understands text, images, and video; generates images and video; and produces chunked robot action trajectories — designed for embedded deployment from Jetson Thor down to Jetson Orin-class devices.

One checkpoint, two servers: the **vLLM** container serves the reasoner for text, image, and video understanding through the standard OpenAI chat API (it loads only the 2.4B reasoner from the full checkpoint — verified byte-identical to the standalone Cosmos3-Edge-Reasoner release), while the **vLLM-Omni** container serves generation and action through its videos API. Deploy either or both depending on your workload.

## Key Capabilities

- **Multimodal Reasoning**: text, image, and video understanding on-device — served with vLLM on Jetson Thor and AGX Orin, and validated down to the 8GB Orin Nano with Hugging Face Transformers (BF16)
- **Robot Action Policy**: chunked action inference (32 actions per call) via vLLM-Omni, with a DROID-post-trained checkpoint available ([Cosmos3-Edge-Policy-DROID](https://huggingface.co/nvidia/Cosmos3-Edge-Policy-DROID))
- **World Generation**: text-to-video, image-to-video, and text-to-image via the diffusion tower
- **Forward / Inverse Dynamics**: action-conditioned world modeling for Physical AI pipelines

## Reasoner Performance on Jetson

Text, image, and video understanding through the vLLM chat API (BF16, batch 1, streaming chat API, up to 128 output tokens, greedy; decode tok/s):

| Module | Text | Image | Video |
|---|---|---|---|
| Thor T5000 | 68.2 | 67.2 | 67.1 |
| Thor T4000 | 63.9 | 65.6 | 65.5 |
| AGX Orin 64GB | 44.1 | 45.2 | 45.1 |

Single-stream decode is memory-bandwidth-bound, so the Thor modules land close together. At 8 concurrent streams the same server sustains ~293 tok/s aggregate on Thor T5000 and ~171 tok/s on AGX Orin.

## Inputs and Outputs

- **Input**: text prompts; images; video clips; robot observations (ego-view) with optional action conditioning
- **Output**: text (reasoning) via vLLM; images, video, and action chunks (16 × action-dim) via vLLM-Omni

## Intended Use Cases

- On-device multimodal reasoning for robotics, smart spaces, and driving scenes
- Robot action policies on Jetson Thor
- World simulation and future prediction (video generation)
- Forward / inverse dynamics modeling

## Cosmos Family

| Model | Parameters | Memory | Best For |
|---|---|---|---|
| [Cosmos3 Edge](/models/cosmos3-edge) | 4B | 32GB RAM | Omnimodal reasoning + generation + action at the edge |
| [Cosmos3 Nano](/models/cosmos3-nano) | 16B | 16GB RAM | Higher-accuracy reasoning on Thor (NVFP4) |
| [Cosmos Reason 2 2B](/models/cosmos-reason2-2b) | 2B | 8GB RAM | Lightweight vision-language reasoning |
| [Cosmos Reason 2 8B](/models/cosmos-reason2-8b) | 8B | 18GB RAM | Higher-accuracy vision-language reasoning |
| [Cosmos Reason1 7B](/models/cosmos-reason1-7b) | 7B | 16GB RAM | Previous-generation physical reasoning |

---
title: "Nemotron 3 Super 120B-A12B"
model_id: "nemotron-3-super"
short_description: "NVIDIA's large hybrid Mixture-of-Experts reasoning model — 120B total / 12B active — NVFP4 for Blackwell/Thor."
family: "NVIDIA Nemotron"
icon: "⚡"
is_new: false
order: 3
type: "Text"
vision_capable: false
memory_requirements: "128GB RAM"
precision: "NVFP4"
parameters: "120B total / 12B active"
modalities: ["Text"]
context_length: "256K"
license: "NVIDIA Open Model License"
model_size: "60GB"
hf_checkpoint: "nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-NVFP4"
huggingface_url: "https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-NVFP4"
minimum_jetson: "Thor"
supported_inference_engines:
  - engine: "vLLM"
    type: "Container"
    modules_supported:
      - thor_t5000
    serve_command_thor: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        -v $HOME/.cache/huggingface:/root/.cache/huggingface \
        --entrypoint "" \
        vllm/vllm-openai:latest \
        vllm serve nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-NVFP4 \
          --trust-remote-code \
          --kv-cache-dtype fp8 \
          --gpu-memory-utilization 0.8 \
          --max-model-len 8192 \
          --max-num-batched-tokens 4096
  - engine: "llama.cpp"
    type: "Container"
    modules_supported:
      - thor_t5000
    serve_command_thor: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        ghcr.io/nvidia-ai-iot/llama_cpp:latest-jetson-thor \
        llama-server \
          -hf unsloth/NVIDIA-Nemotron-3-Super-120B-A12B-GGUF:UD-Q4_K_M \
          --no-mmap -fa on -ub 2048 \
          --ctx-size 8192 \
          --n-gpu-layers 999 \
          --port 8080 \
          --alias my_model
benchmark_key: "Nemotron 3 Super 120B-A12B"
benchmark_series:
  - "Nemotron 3 30B-A3B"
---

Nemotron 3 Super 120B-A12B is a large hybrid Mixture-of-Experts reasoning model from the NVIDIA Nemotron family — **120B total parameters with ~12B active per forward pass**. This page covers the **NVFP4** checkpoint, which fits in ~60 GB and runs natively on Jetson Thor (Blackwell, sm_110) for efficient 4-bit inference. The checkpoint is **ungated** — no Hugging Face token required.

## Architecture

A hybrid Mamba-2 / attention Mixture-of-Experts design (`NemotronHForCausalLM`):

- Mamba-2 (state-space) layers interleaved with sparse MoE layers and a small number of attention layers
- **~12B active parameters** routed per token out of **120B total**
- 256K context window, NVFP4 (E2M1 weights with FP8 block scales) for Blackwell FP4 Tensor Cores

## Inputs and Outputs

**Input:** Text

**Output:** Text

## Intended Use Cases

- **Agentic Workflows**: Function calling and tool use with chain-of-thought reasoning
- **Complex Reasoning**: Math, coding, and multi-step problem solving where a larger expert pool helps
- **Chatbots and RAG**: High-quality conversational and retrieval-augmented generation
- **On-device Frontier-class Inference**: Serving a 120B-class model on a single Jetson Thor via NVFP4

## Supported Platforms

- Jetson Thor (T5000, 128 GB) — the ~60 GB of weights plus KV cache require the 128 GB SKU

## Nemotron 3 Family

| Model | Parameters | Memory | Best For |
|---|---|---|---|
| [Nemotron3 Nano 4B](/models/nemotron3-nano-4b) | 4B | 4GB RAM | Lightweight edge deployment |
| [Nemotron3 Nano 30B-A3B](/models/nemotron-3-nano-30b-a3b) | 30B total / 3B active | 32GB RAM | Efficient MoE reasoning on AGX Orin |
| [Nemotron 3 Nano Omni](/models/nemotron-3-nano-omni) | 30B total / 3B active | 64GB RAM | Multimodal reasoning (text, image, audio, video) |
| [Nemotron 3 Super 120B-A12B](/models/nemotron-3-super) | 120B total / 12B active | 128GB RAM | Frontier-class reasoning on Jetson Thor |

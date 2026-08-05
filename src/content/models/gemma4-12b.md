---
title: "Gemma 4 12B"
model_id: "gemma4-12b"
short_description: "Google's mid-size dense Gemma 4 model — strong general reasoning and multimodal understanding for Jetson Thor and AGX Orin"
family: "Google Gemma4"
icon: "💎"
is_new: false
order: 2
type: "Multimodal"
vision_capable: true
memory_requirements: "16GB RAM"
precision: "NVFP4 / Q4_0 QAT GGUF"
parameters: "12B"
modalities: ["Text", "Image"]
context_length: "256K"
license: "Apache 2.0"
model_size: "10GB"
hf_checkpoint: "RedHatAI/gemma-4-12B-it-NVFP4"
huggingface_url: "https://huggingface.co/google/gemma-4-12B-it"
minimum_jetson: "AGX Orin"
supported_inference_engines:
  - engine: "vLLM"
    type: "Container"
    modules_supported:
      - thor_t5000
      - thor_t4000
    serve_command_thor: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        -v ~/.cache/huggingface:/root/.cache/huggingface \
        -v ~/.cache/vllm:/root/.cache/vllm \
        --entrypoint "" \
        vllm/vllm-openai:latest \
        vllm serve RedHatAI/gemma-4-12B-it-NVFP4 \
          --gpu-memory-utilization 0.7 \
          --max-model-len 8192 \
          --reasoning-parser gemma4
  - engine: "llama.cpp"
    type: "Container"
    modules_supported:
      - thor_t5000
      - thor_t4000
      - orin_agx_64
    serve_command_orin: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        -v $HOME/.cache/huggingface:/root/.cache/huggingface \
        ghcr.io/nvidia-ai-iot/llama_cpp:latest-jetson-orin \
        llama-server \
          --hf-repo google/gemma-4-12B-it-qat-q4_0-gguf \
          --hf-file gemma-4-12b-it-qat-q4_0.gguf \
          --no-mmproj \
          -fa on \
          --ctx-size 8192 \
          --n-gpu-layers 999 \
          --port 8080 \
          --alias my_model
    serve_command_thor: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        -v $HOME/.cache/huggingface:/root/.cache/huggingface \
        ghcr.io/nvidia-ai-iot/llama_cpp:latest-jetson-thor \
        llama-server \
          --hf-repo google/gemma-4-12B-it-qat-q4_0-gguf \
          --hf-file gemma-4-12b-it-qat-q4_0.gguf \
          --no-mmproj \
          -fa on \
          --ctx-size 8192 \
          --n-gpu-layers 999 \
          --port 8080 \
          --alias my_model
benchmark_key: "Gemma 4 12B"
benchmark_series:
  - "Gemma 4 E2B"
  - "Gemma 4 26B-A4B"
---

Gemma 4 12B is Google's mid-size dense Gemma 4 model — the step up from the edge-sized E2B/E4B variants for workloads that need stronger reasoning while fitting on a single Jetson. This page covers the **NVFP4** checkpoint for vLLM on Thor (efficient 4-bit inference on Blackwell) and Google's official **quantization-aware-trained Q4_0 GGUF** for llama.cpp on Thor and AGX Orin.

- Local assistants and RAG that outgrow the E-series models
- Document, chart, and image understanding workloads
- Coding help and repository Q&A on Thor- and Orin-class devices
- General-purpose reasoning where MoE routing overhead isn't wanted

## Inputs and Outputs

**Input:** Text and image

**Output:** Text

## Supported Platforms

- Jetson Thor (vLLM NVFP4, llama.cpp GGUF)
- Jetson AGX Orin 64GB (llama.cpp GGUF)

## Inference Engine

This model is configured to run on Jetson with `vLLM` and `llama.cpp`.

## Official Highlights

- Google positions 12B as the **dense mid-size** option in the Gemma 4 family — a balance point between the edge-sized E2B/E4B and the frontier 26B-A4B/31B models.
- Supports **256K context**, **text/image input**, and the Gemma 4 function-calling and long-context reasoning features.
- The official **QAT (quantization-aware trained) Q4_0** release preserves near-BF16 quality at 4-bit, making it the recommended GGUF for llama.cpp deployment.

## Gemma 4 Family

| Model | Parameters | Memory | Best For |
|---|---|---|---|
| [Gemma 4 E2B](/models/gemma4-e2b) | 2.3B effective (5.1B with embeddings) | 8GB RAM | Lightweight edge deployment |
| [Gemma 4 E4B](/models/gemma4-e4b) | 4.5B effective (8B with embeddings) | 8GB RAM | Edge multimodal assistants |
| [Gemma 4 12B](/models/gemma4-12b) | 12B dense | 16GB RAM | Mid-size reasoning and multimodal |
| [Gemma 4 26B-A4B](/models/gemma4-26b-a4b) | 25.8B total / 3.8B active | 24GB RAM | High-end MoE reasoning |
| [Gemma 4 31B](/models/gemma4-31b) | 31B dense | 32GB RAM | Maximum quality in the family |

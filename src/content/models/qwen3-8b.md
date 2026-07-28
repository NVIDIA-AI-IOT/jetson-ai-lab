---
title: "Qwen3 8B"
model_id: "qwen3-8b"
short_description: "Alibaba's powerful 8 billion parameter instruction-tuned language model"
family: "Alibaba Qwen3"
icon: "🔮"
is_new: false
order: 2
type: "Text"
vision_capable: false
memory_requirements: "8GB RAM"
precision: "W4A16"
parameters: "8B"
modalities: ["Text"]
context_length: "128K"
license: "Apache 2.0"
model_size: "4.5GB"
hf_checkpoint: "RedHatAI/Qwen3-8B-quantized.w4a16"
huggingface_url: "https://huggingface.co/Qwen/Qwen3-8B"
minimum_jetson: "Orin NX"
# Optional: gray tabs via matrix_modules_disabled. Per-engine allowlists: supported_inference_engines[].modules_supported (from minimum_jetson).
benchmark:
  orin:
    concurrency1: 26.53
    concurrency8: 142.99
    ttftMs: 0
  thor:
    concurrency1: 41.55
    concurrency8: 229.38
    ttftMs: 0
supported_inference_engines:
  - engine: "vLLM"
    type: "Container"
    modules_supported:
      - thor_t5000
      - thor_t4000
      - orin_agx_64
      - orin_nx_16
    serve_command_orin: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        ghcr.io/nvidia-ai-iot/vllm:latest-jetson-orin \
        vllm serve RedHatAI/Qwen3-8B-quantized.w4a16
    serve_command_thor: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        vllm/vllm-openai:latest \
        vllm serve RedHatAI/Qwen3-8B-quantized.w4a16
benchmark_key: "Qwen 3 8B"
benchmark_series:
  - "Qwen 3 4B"
---

Qwen3 8B is a more powerful variant in Alibaba Cloud's latest generation of large language models. With 8 billion parameters, it offers enhanced capabilities while remaining deployable on edge devices.

## Inputs and Outputs

**Input:** Text

**Output:** Text

## Intended Use Cases

- **Reasoning**: Advanced logical and analytical reasoning tasks
- **Function Calling**: Native support for tool use and function calling
- **Subject Matter Experts**: Fine-tuning for domain-specific expertise
- **Multilingual Instruction Following**: Following instructions across 100+ languages
- **Translation**: High-quality translation between supported languages


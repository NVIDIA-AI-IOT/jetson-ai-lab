---
title: "Qwen3 32B"
model_id: "qwen3-32b"
short_description: "Alibaba's flagship 32 billion parameter language model for advanced reasoning"
family: "Alibaba Qwen3"
icon: "🔮"
is_new: false
order: 4
type: "Text"
vision_capable: false
memory_requirements: "24GB RAM"
precision: "W4A16"
parameters: "32B"
modalities: ["Text"]
context_length: "128K"
license: "Apache 2.0"
model_size: "18GB"
hf_checkpoint: "RedHatAI/Qwen3-32B-quantized.w4a16"
huggingface_url: "https://huggingface.co/Qwen/Qwen3-32B"
minimum_jetson: "Thor"
# Optional: gray tabs via matrix_modules_disabled. Per-engine allowlists: supported_inference_engines[].modules_supported (from minimum_jetson).
benchmark:
  orin:
    concurrency1: 6.22
    concurrency8: 16.84
    ttftMs: 0
  thor:
    concurrency1: 13.19
    concurrency8: 79.1
    ttftMs: 0
supported_inference_engines:
  - engine: "vLLM"
    type: "Container"
    modules_supported:
      - thor_t5000
      - thor_t4000
    serve_command_orin: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        ghcr.io/nvidia-ai-iot/vllm:latest-jetson-orin \
        vllm serve RedHatAI/Qwen3-32B-quantized.w4a16
    serve_command_thor: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        vllm/vllm-openai:latest \
        vllm serve RedHatAI/Qwen3-32B-quantized.w4a16
benchmark_key: "Qwen3-32B"
benchmark_series:
  - "Qwen3-30B-A3B"
---

Qwen3 32B is the flagship dense model in Alibaba Cloud's Qwen3 family. With 32 billion parameters, it delivers exceptional performance across complex reasoning, coding, and language understanding tasks.

## Inputs and Outputs

**Input:** Text

**Output:** Text

## Intended Use Cases

- **Reasoning**: Advanced logical and analytical reasoning tasks
- **Function Calling**: Native support for tool use and function calling
- **Subject Matter Experts**: Fine-tuning for domain-specific expertise
- **Multilingual Instruction Following**: Following instructions across 100+ languages
- **Translation**: High-quality translation between supported languages


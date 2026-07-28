---
title: "Qwen3 4B"
model_id: "qwen3-4b"
short_description: "Alibaba's efficient 4 billion parameter instruction-tuned language model"
family: "Alibaba Qwen3"
icon: "🔮"
is_new: false
order: 1
type: "Text"
vision_capable: false
memory_requirements: "4GB RAM"
precision: "W4A16"
parameters: "4B"
modalities: ["Text"]
context_length: "128K"
license: "Apache 2.0"
model_size: "2.5GB"
hf_checkpoint: "RedHatAI/Qwen3-4B-quantized.w4a16"
huggingface_url: "https://huggingface.co/Qwen/Qwen3-4B"
minimum_jetson: "Orin Nano"
# Optional: gray tabs via matrix_modules_disabled. Per-engine allowlists: supported_inference_engines[].modules_supported (from minimum_jetson).
benchmark:
  orin:
    concurrency1: 42.15
    concurrency8: 193.83
    ttftMs: 0
  thor:
    concurrency1: 56.46
    concurrency8: 273.37
    ttftMs: 0
supported_inference_engines:
  - engine: "vLLM"
    type: "Container"
    modules_supported:
      - thor_t5000
      - thor_t4000
      - orin_agx_64
      - orin_nx_16
      - orin_nano_8
    serve_command_orin: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        ghcr.io/nvidia-ai-iot/vllm:latest-jetson-orin \
        vllm serve RedHatAI/Qwen3-4B-quantized.w4a16
    serve_command_thor: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        vllm/vllm-openai:latest \
        vllm serve RedHatAI/Qwen3-4B-quantized.w4a16
benchmark_key: "Qwen 3 4B"
benchmark_series:
  - "Qwen 3 8B"
---

Qwen3 is Alibaba Cloud's latest generation of large language models, offering state-of-the-art performance across a wide range of tasks. The Qwen3 4B model provides an excellent balance of capability and efficiency for edge deployment.

## Inputs and Outputs

**Input:** Text

**Output:** Text

## Intended Use Cases

- **Reasoning**: Advanced logical and analytical reasoning tasks
- **Function Calling**: Native support for tool use and function calling
- **Subject Matter Experts**: Fine-tuning for domain-specific expertise
- **Multilingual Instruction Following**: Following instructions across 100+ languages
- **Translation**: High-quality translation between supported languages


---
title: "Qwen3 32B"
model_id: "qwen3-32b"
short_description: "Alibaba's flagship 32 billion parameter language model for advanced reasoning"
family: "Qwen Qwen3"
icon: "🔮"
is_new: false
order: 4
type: "Text"
memory_requirements: "24GB RAM"
precision: "W4A16"
model_size: "18GB"
hf_checkpoint: "RedHatAI/Qwen3-32B-quantized.w4a16"
huggingface_url: "https://huggingface.co/Qwen/Qwen3-32B"
minimum_jetson: "Thor"
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
    run_command_orin: "sudo docker run -it --rm --pull always --runtime=nvidia --network host ghcr.io/nvidia-ai-iot/vllm:latest-jetson-orin vllm serve RedHatAI/Qwen3-32B-quantized.w4a16"
    run_command_thor: "sudo docker run -it --rm --pull always --runtime=nvidia --network host ghcr.io/nvidia-ai-iot/vllm:latest-jetson-thor vllm serve RedHatAI/Qwen3-32B-quantized.w4a16"
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


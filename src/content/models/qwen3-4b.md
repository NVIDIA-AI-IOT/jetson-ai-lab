---
title: "Qwen3 4B"
model_id: "qwen3-4b"
short_description: "Alibaba's efficient 4 billion parameter instruction-tuned language model"
family: "Qwen Qwen3"
icon: "🔮"
is_new: false
order: 1
type: "Text"
memory_requirements: "4GB RAM"
precision: "W4A16"
model_size: "2.5GB"
hf_checkpoint: "RedHatAI/Qwen3-4B-quantized.w4a16"
huggingface_url: "https://huggingface.co/Qwen/Qwen3-4B"
minimum_jetson: "Orin Nano"
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
    run_command_orin: "sudo docker run -it --rm --pull always --runtime=nvidia --network host ghcr.io/nvidia-ai-iot/vllm:latest-jetson-orin vllm serve RedHatAI/Qwen3-4B-quantized.w4a16"
    run_command_thor: "sudo docker run -it --rm --pull always --runtime=nvidia --network host ghcr.io/nvidia-ai-iot/vllm:latest-jetson-thor vllm serve RedHatAI/Qwen3-4B-quantized.w4a16"
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


---
title: "Qwen3 30B-A3B (MoE)"
model_id: "qwen3-30b-a3b"
short_description: "Alibaba's Mixture-of-Experts model with 30B total / 3B active parameters"
family: "Qwen Qwen3"
icon: "🔮"
is_new: false
order: 3
type: "Text"
memory_requirements: "16GB RAM"
precision: "W4A16"
model_size: "16GB"
hf_checkpoint: "RedHatAI/Qwen3-30B-A3B-quantized.w4a16"
huggingface_url: "https://huggingface.co/Qwen/Qwen3-30B-A3B"
minimum_jetson: "Orin AGX"
benchmark:
  orin:
    concurrency1: 31.43
    concurrency8: 76.69
    ttftMs: 0
  thor:
    concurrency1: 61.01
    concurrency8: 226.42
    ttftMs: 0
supported_inference_engines:
  - engine: "vLLM"
    type: "Container"
    run_command_orin: "sudo docker run -it --rm --pull always --runtime=nvidia --network host ghcr.io/nvidia-ai-iot/vllm:latest-jetson-orin vllm serve RedHatAI/Qwen3-30B-A3B-quantized.w4a16"
    run_command_thor: "sudo docker run -it --rm --pull always --runtime=nvidia --network host ghcr.io/nvidia-ai-iot/vllm:latest-jetson-thor vllm serve RedHatAI/Qwen3-30B-A3B-quantized.w4a16"
---

Qwen3 30B-A3B is a Mixture-of-Experts (MoE) model from Alibaba Cloud's Qwen3 family. It features 30 billion total parameters with only 3 billion active during inference, providing excellent performance with improved efficiency.

## Inputs and Outputs

**Input:** Text

**Output:** Text

## Intended Use Cases

- **Reasoning**: Advanced logical and analytical reasoning tasks
- **Function Calling**: Native support for tool use and function calling
- **Subject Matter Experts**: Fine-tuning for domain-specific expertise
- **Multilingual Instruction Following**: Following instructions across 100+ languages
- **Translation**: High-quality translation between supported languages


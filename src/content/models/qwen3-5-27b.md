---
title: "Qwen3.5 27B"
model_id: "qwen3-5-27b"
short_description: "Alibaba's dense 27 billion parameter language model with native tool calling and MTP speculative decoding"
family: "Alibaba Qwen3.5"
visual_family: "qwen"
visual_variant: "3.5"
icon: "🔮"
is_new: false
order: 2
type: "Multimodal"
vision_capable: true
memory_requirements: "18GB RAM"
precision: "FP8 / AWQ-4bit"
parameters: "27B"
modalities: ["Text", "Image", "Video"]
input_modalities: ["text", "image", "video"]
output_modalities: ["text"]
tasks: ["text-generation"]
context_length: "256K"
license: "Apache 2.0"
model_size: "15GB"
hf_checkpoint: "Qwen/Qwen3.5-27B"
huggingface_url: "https://huggingface.co/Qwen/Qwen3.5-27B"
minimum_jetson: "Orin AGX"
# Optional: gray tabs via matrix_modules_disabled. Per-engine allowlists: supported_inference_engines[].modules_supported (from minimum_jetson).
supported_inference_engines:
  - engine: "vLLM"
    type: "Container"
    modules_supported:
      - thor_t5000
      - thor_t4000
      - orin_agx_64
    serve_command_orin: >-
      sudo docker run -it --rm --pull always --runtime=nvidia --network host -v ~/.cache/huggingface:/root/.cache/huggingface -v ~/.cache/vllm:/root/.cache/vllm vllm/vllm-openai:latest cyankiwi/Qwen3.5-27B-AWQ-4bit --max-model-len 8192 --gpu-memory-utilization 0.8 --reasoning-parser qwen3 --enable-auto-tool-choice --tool-call-parser qwen3_coder --speculative-config '{"method":"mtp","num_speculative_tokens":3}'
    serve_command_thor: >-
      sudo docker run -it --rm --pull always --runtime=nvidia --network host -v ~/.cache/huggingface:/root/.cache/huggingface -v ~/.cache/vllm:/root/.cache/vllm vllm/vllm-openai:latest Qwen/Qwen3.5-27B-FP8 --max-model-len 8192 --gpu-memory-utilization 0.8 --reasoning-parser qwen3 --enable-auto-tool-choice --tool-call-parser qwen3_coder --speculative-config '{"method":"mtp","num_speculative_tokens":3}'
---

Qwen3.5 27B is a dense language model from Alibaba Cloud's Qwen3.5 family. With 27 billion parameters, it delivers strong performance across complex reasoning, coding, and language understanding tasks.

## Inputs and Outputs

**Input:** Text

**Output:** Text

## Intended Use Cases

- **Reasoning**: Advanced logical and analytical reasoning with chain-of-thought
- **Function Calling**: Native support for tool use and function calling
- **Multilingual Instruction Following**: Following instructions across 100+ languages
- **Code Generation**: Programming assistance in multiple languages
- **Translation**: High-quality translation between supported languages

## Qwen3.5 Family

| Model | Parameters | Active Params | Type | Best For |
|---|---|---|---|---|
| [Qwen3.5 35B-A3B](/models/qwen3-5-35b-a3b) | 35B | 3B | MoE | Efficient high-performance inference |
| **Qwen3.5 27B** | 27B | 27B | Dense | Maximum accuracy on demanding tasks |

## Additional Resources

- [Hugging Face Model](https://huggingface.co/Qwen/Qwen3.5-27B) - Original model weights
- [FP8 Checkpoint (Thor)](https://huggingface.co/Qwen/Qwen3.5-27B-FP8) - Official FP8 weights for Jetson Thor
- [AWQ-4bit Checkpoint (Orin)](https://huggingface.co/cyankiwi/Qwen3.5-27B-AWQ-4bit) - Quantized for Jetson Orin

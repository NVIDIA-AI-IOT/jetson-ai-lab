---
title: "Qwen3.5 4B"
model_id: "qwen3-5-4b"
short_description: "Alibaba's efficient Qwen3.5 4B vision-language model tuned for practical multimodal deployment"
family: "Alibaba Qwen3.5"
icon: "🔮"
is_new: false
order: 4
type: "Multimodal"
vision_capable: true
memory_requirements: "4GB RAM"
precision: "AWQ 4-bit"
parameters: "4B"
modalities: ["Text", "Image"]
context_length: "256K"
license: "Apache 2.0"
model_size: "2.5GB"
hf_checkpoint: "cyankiwi/Qwen3.5-4B-AWQ-4bit"
huggingface_url: "https://huggingface.co/Qwen/Qwen3.5-4B"
minimum_jetson: "Orin Nano"
# Optional: gray tabs via matrix_modules_disabled. Per-engine allowlists: supported_inference_engines[].modules_supported (from minimum_jetson).
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
        vllm serve cyankiwi/Qwen3.5-4B-AWQ-4bit \
          --gpu-memory-utilization 0.8 \
          --enable-prefix-caching \
          --reasoning-parser qwen3 \
          --enable-auto-tool-choice \
          --tool-call-parser qwen3_coder
    serve_command_thor: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        vllm/vllm-openai:latest \
        vllm serve cyankiwi/Qwen3.5-4B-AWQ-4bit \
          --gpu-memory-utilization 0.8 \
          --enable-prefix-caching \
          --reasoning-parser qwen3 \
          --enable-auto-tool-choice \
          --tool-call-parser qwen3_coder
benchmark_key: "Qwen3.5-4B"
---

Qwen3.5 4B offers a balanced point in the Qwen3.5 family for local multimodal instruction following, visual understanding, and agent-style workloads on Jetson.

## Inputs and Outputs

**Input:** Text and images

**Output:** Text

## Intended Use Cases

- **Visual question answering**: Multimodal prompting with image inputs
- **Image understanding**: Captioning, scene analysis, and grounded responses
- **Tool calling**: Structured tool use with vLLM
- **Multilingual tasks**: Translation and multilingual prompting

## Additional Resources

- [Original Model](https://huggingface.co/Qwen/Qwen3.5-4B) - Base Qwen3.5 4B checkpoint
- [AWQ Checkpoint](https://huggingface.co/cyankiwi/Qwen3.5-4B-AWQ-4bit) - Quantized checkpoint used here


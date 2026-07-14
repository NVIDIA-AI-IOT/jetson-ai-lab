---
title: "Qwen3.5 9B"
model_id: "qwen3-5-9b"
short_description: "Alibaba's dense Qwen3.5 9B vision-language model with Jetson-specific checkpoints for Orin and Thor"
family: "Alibaba Qwen3.5"
icon: "🔮"
is_new: false
order: 3
type: "Multimodal"
vision_capable: true
memory_requirements: "8GB RAM"
precision: "NVFP4 / W4A16"
parameters: "9B"
modalities: ["Text", "Image"]
context_length: "256K"
license: "Apache 2.0"
model_size: "5GB"
hf_checkpoint: "Qwen/Qwen3.5-9B"
huggingface_url: "https://huggingface.co/Qwen/Qwen3.5-9B"
minimum_jetson: "Orin NX"
# Optional: gray tabs via matrix_modules_disabled. Per-engine allowlists: supported_inference_engines[].modules_supported (from minimum_jetson).
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
        vllm serve RedHatAI/Qwen3.5-9B-quantized.w4a16 \
          --gpu-memory-utilization 0.8 \
          --enable-prefix-caching \
          --reasoning-parser qwen3 \
          --enable-auto-tool-choice \
          --tool-call-parser qwen3_coder
    serve_command_thor: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        ghcr.io/nvidia-ai-iot/vllm:latest-jetson-thor \
        vllm serve AxionML/Qwen3.5-9B-NVFP4 \
          --gpu-memory-utilization 0.8 \
          --enable-prefix-caching \
          --reasoning-parser qwen3 \
          --enable-auto-tool-choice \
          --tool-call-parser qwen3_coder
benchmark_key: "Qwen3.5-9B"
---

Qwen3.5 9B is a dense vision-language model in the Qwen3.5 family aimed at stronger reasoning, visual understanding, and agentic behavior on Jetson. This entry uses a W4A16 checkpoint on Jetson Orin and an NVFP4 checkpoint on Jetson Thor.

## Inputs and Outputs

**Input:** Text and images

**Output:** Text

## Intended Use Cases

- **Visual reasoning**: Stronger multimodal reasoning over image and text inputs
- **Image understanding**: Detailed captioning, scene description, and analysis
- **Tool calling**: Native Qwen tool-call parsing in vLLM
- **Agents**: Local assistants and workflow automation

## Additional Resources

- [Original Model](https://huggingface.co/Qwen/Qwen3.5-9B) - Base Qwen3.5 9B checkpoint
- [W4A16 Checkpoint](https://huggingface.co/RedHatAI/Qwen3.5-9B-quantized.w4a16) - Jetson Orin checkpoint
- [NVFP4 Checkpoint](https://huggingface.co/AxionML/Qwen3.5-9B-NVFP4) - Jetson Thor checkpoint


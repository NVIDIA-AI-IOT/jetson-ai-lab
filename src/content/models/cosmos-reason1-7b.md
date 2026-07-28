---
title: "Cosmos Reason 1 7B"
model_id: "cosmos-reason1-7b"
short_description: "NVIDIA's 7B parameter reasoning vision-language model designed for physical AI and robotics applications"
family: "NVIDIA Cosmos Reason"
icon: "🧠"
is_new: false
order: 1
type: "Multimodal"
vision_capable: true
memory_requirements: "16GB RAM"
precision: "FP16"
parameters: "7B"
modalities: ["Text", "Image", "Video"]
context_length: "128K"
license: "NVIDIA Open Model License"
model_size: "14GB"
hf_checkpoint: "nvidia/Cosmos-Reason1-7B"
huggingface_url: "https://huggingface.co/nvidia/Cosmos-Reason1-7B"
build_nvidia_url: "https://build.nvidia.com/nvidia/cosmos-reason1-7b"
minimum_jetson: "AGX Orin"
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
        -e HF_TOKEN=$HF_TOKEN -v $HOME/.cache/huggingface:/root/.cache/huggingface ghcr.io/nvidia-ai-iot/vllm:latest-jetson-orin \
        vllm serve nvidia/Cosmos-Reason1-7B --max-model-len 8192 --gpu-memory-utilization 0.8 --reasoning-parser qwen3
    serve_command_thor: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        -e HF_TOKEN=$HF_TOKEN -v $HOME/.cache/huggingface:/root/.cache/huggingface vllm/vllm-openai:latest \
        nvidia/Cosmos-Reason1-7B --max-model-len 8192 --gpu-memory-utilization 0.6 --reasoning-parser qwen3
---

[NVIDIA Cosmos Reason 1 7B](https://huggingface.co/nvidia/Cosmos-Reason1-7B) is a reasoning vision-language model designed for physical AI and robotics applications. With 7 billion parameters, it provides strong reasoning capabilities for understanding physical world interactions, spatial relationships, and complex scene analysis.

This model can be pulled directly from HuggingFace and served with vLLM — no manual model download needed.

## Key Capabilities

- **Physical AI Reasoning**: Understands physical world dynamics and interactions
- **Spatial Understanding**: Advanced spatial reasoning about object positions, orientations, and relationships
- **Robotics Applications**: Designed for robotics perception and planning tasks
- **Chain-of-thought Reasoning**: Generates detailed reasoning traces before conclusions
- **Scene Analysis**: Comprehensive understanding of complex visual scenes

## Platform Support

| | Jetson AGX Thor | Jetson AGX Orin (64GB) |
|---|---|---|
| **vLLM Container** | `vllm/vllm-openai:latest` | `ghcr.io/nvidia-ai-iot/vllm:latest-jetson-orin` |
| **Max Model Length** | 8192 tokens | 8192 tokens |
| **GPU Memory Util** | 0.6 | 0.8 |

> **Note:** Requires `HF_TOKEN` environment variable set with your [HuggingFace token](https://huggingface.co/settings/tokens). The model is downloaded automatically on first run.

## Inputs and Outputs

**Input:**
- Text prompts and images
- Supports video frame analysis via `--media-io-kwargs`

**Output:**
- Generated text with chain-of-thought reasoning traces
- Physical reasoning, spatial analysis, and scene understanding

## Additional Resources

- [Try on build.nvidia.com](https://build.nvidia.com/nvidia/cosmos-reason1-7b)
- [NVIDIA Cosmos Documentation](https://docs.nvidia.com/cosmos/2.0.0/reason1/quickstart_guide.html)
- [Live VLM WebUI](https://github.com/NVIDIA-AI-IOT/live-vlm-webui) — real-time webcam-to-VLM interface


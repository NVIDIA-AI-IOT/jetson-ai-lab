---
title: "Nemotron Nano 12B VL"
model_id: "nemotron-nano-12b-vl"
short_description: "NVIDIA's vision-language model for image understanding and multimodal reasoning"
family: "NVIDIA Nemotron"
icon: "⚡"
is_new: false
order: 3
type: "Multimodal"
memory_requirements: "16GB RAM"
precision: "NVFP4-QAD"
model_size: "8GB"
hf_checkpoint: "nvidia/NVIDIA-Nemotron-Nano-12B-v2-VL-NVFP4-QAD"
huggingface_url: "https://huggingface.co/nvidia/NVIDIA-Nemotron-Nano-12B-v2-VL-NVFP4-QAD"
minimum_jetson: "Thor"
supported_inference_engines:
  - engine: "vLLM"
    type: "Container"
    run_command_thor: "sudo docker run -it --rm --pull always --runtime=nvidia --network host ghcr.io/nvidia-ai-iot/vllm:latest-jetson-thor vllm serve nvidia/NVIDIA-Nemotron-Nano-12B-v2-VL-NVFP4-QAD"
---

NVIDIA Nemotron Nano 12B VL is a vision-language model capable of understanding images and text, with support for chain-of-thought reasoning across multimodal inputs.

## Inputs and Outputs

**Input:** Image, Text

**Output:** Text

## Intended Use Cases

- **Image Summarization**: Generate detailed descriptions of images
- **Text-Image Analysis**: Analyze relationships between text and visual content
- **Optical Character Recognition (OCR)**: Extract text from images
- **Interactive Q&A on Images**: Answer questions about image content
- **Chain-of-Thought Reasoning**: Complex visual reasoning tasks

## Supported Languages

English, German, Spanish, French, Italian, Korean, Portuguese, Russian, Japanese, Chinese.


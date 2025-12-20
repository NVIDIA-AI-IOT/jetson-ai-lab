---
title: "Nemotron Nano 9B v2"
model_id: "nemotron-nano-9b-v2"
short_description: "NVIDIA's efficient 9B hybrid architecture model with Mamba-2 and attention layers"
family: "NVIDIA Nemotron"
icon: "⚡"
is_new: false
order: 2
type: "Text"
memory_requirements: "12GB RAM"
precision: "NVFP4"
model_size: "6GB"
hf_checkpoint: "nvidia/NVIDIA-Nemotron-Nano-9B-v2-NVFP4"
huggingface_url: "https://huggingface.co/nvidia/NVIDIA-Nemotron-Nano-9B-v2-NVFP4"
minimum_jetson: "Thor"
supported_inference_engines:
  - engine: "vLLM"
    type: "Container"
    run_command_thor: "sudo docker run -it --rm --pull always --runtime=nvidia --network host ghcr.io/nvidia-ai-iot/vllm:latest-jetson-thor vllm serve nvidia/NVIDIA-Nemotron-Nano-9B-v2-NVFP4"
---

NVIDIA Nemotron Nano 9B v2 is a quantized large language model trained from scratch by NVIDIA, designed as a unified model for both reasoning and non-reasoning tasks. It generates a reasoning trace before concluding with a final response, with configurable reasoning via system prompt.

## Architecture

The model uses a hybrid architecture:
- 56 layers total: 27 Mamba layers, 25 MLP layers, 4 attention layers
- NVFP4 quantization with Mamba and MLP layers quantized
- Attention layers and Conv1d components kept in BF16 for accuracy
- Quantization-Aware Distillation (QAD) applied for accuracy recovery

## Inputs and Outputs

**Input:** Text

**Output:** Text

## Intended Use Cases

- **AI Agent Systems**: Autonomous agents with reasoning capabilities
- **Chatbots**: General purpose conversational AI
- **RAG Systems**: Retrieval-augmented generation applications
- **Instruction Following**: General instruction-following tasks
- **Code Generation**: Programming assistance in multiple languages

## Supported Languages

English, German, Spanish, French, Italian, Japanese, and coding languages.

*This model is ready for commercial use.*


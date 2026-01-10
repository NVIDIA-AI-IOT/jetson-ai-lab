---
title: "Nemotron3 Nano 30B-A3B"
model_id: "nemotron-3-nano-30b-a3b"
short_description: "NVIDIA's flagship hybrid MoE reasoning model with 30B total / 3.5B active parameters"
family: "NVIDIA Nemotron"
icon: "⚡"
is_new: true
order: 1
type: "Text"
memory_requirements: "32GB RAM"
precision: "FP8"
model_size: "30GB"
hf_checkpoint: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-FP8"
huggingface_url: "https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-FP8"
build_nvidia_url: "https://build.nvidia.com/nvidia/nemotron-3-nano-30b-a3b"
minimum_jetson: "Thor"
supported_inference_engines:
  - engine: "vLLM"
    type: "Container"
    run_command_thor: "sudo docker run -it --rm --pull always --runtime=nvidia --network host ghcr.io/nvidia-ai-iot/vllm:latest-jetson-thor bash -c \"wget https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-FP8/resolve/main/nano_v3_reasoning_parser.py && vllm serve nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-FP8 --trust-remote-code --enable-auto-tool-choice --tool-call-parser qwen3_coder --reasoning-parser-plugin nano_v3_reasoning_parser.py --reasoning-parser nano_v3 --kv-cache-dtype fp8\""
---

NVIDIA Nemotron Nano 30B-A3B is a general purpose reasoning and chat model designed as a unified model for both reasoning and non-reasoning tasks. It responds to user queries by first generating a reasoning trace and then concluding with a final response.

## Architecture

The model employs a hybrid Mixture-of-Experts (MoE) architecture:
- 23 Mamba-2 and MoE layers
- 6 Attention layers
- 128 experts + 1 shared expert per MoE layer
- 6 experts activated per token
- **3.5B active parameters** / **30B total parameters**

## Inputs and Outputs

**Input:** Text

**Output:** Text

## Intended Use Cases

- **AI Agent Systems**: Build autonomous agents with strong reasoning capabilities
- **Chatbots**: General purpose conversational AI
- **RAG Systems**: Retrieval-augmented generation applications
- **Reasoning Tasks**: Complex problem-solving with configurable reasoning traces
- **Instruction Following**: General instruction-following tasks

## Supported Languages

English, Spanish, French, German, Japanese, Italian, and coding languages.

## Reasoning Configuration

The model's reasoning capabilities can be configured through a flag in the chat template:
- **With reasoning traces**: Higher-quality solutions for complex queries
- **Without reasoning traces**: Faster responses with slight accuracy trade-off for simpler tasks


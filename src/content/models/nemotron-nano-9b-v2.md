---
title: "Nemotron Nano 9B v2"
model_id: "nemotron-nano-9b-v2"
short_description: "NVIDIA's efficient 9B hybrid architecture model with Mamba-2 and attention layers"
family: "NVIDIA Nemotron"
icon: "⚡"
is_new: false
order: 2
type: "Text"
vision_capable: false
memory_requirements: "12GB RAM"
precision: "NVFP4"
parameters: "9B"
modalities: ["Text"]
context_length: "128K"
license: "NVIDIA Open Model License"
model_size: "6GB"
hf_checkpoint: "nvidia/NVIDIA-Nemotron-Nano-9B-v2-NVFP4"
huggingface_url: "https://huggingface.co/nvidia/NVIDIA-Nemotron-Nano-9B-v2-NVFP4"
minimum_jetson: "Thor"
# Optional: gray tabs via matrix_modules_disabled. Per-engine allowlists: supported_inference_engines[].modules_supported (from minimum_jetson).
supported_inference_engines:
  - engine: "vLLM"
    type: "Container"
    modules_supported:
      - thor_t5000
      - thor_t4000
    serve_command_thor: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        vllm/vllm-openai:latest \
        nvidia/NVIDIA-Nemotron-Nano-9B-v2-NVFP4
  - engine: "TensorRT Edge-LLM"
    type: "Container"
    modules_supported:
      - thor_t5000
    install_command: |-
      mkdir -p "$HOME/tensorrt-edgellm-workspace" "$HOME/.cache/huggingface"
      curl -fsSL https://www.jetson-ai-lab.com/code-samples/tensorrt_edge_llm/run_model.sh -o "$HOME/run-edgellm-model"
      chmod +x "$HOME/run-edgellm-model"
    serve_command_thor: |-
      sudo docker run -it --rm --pull always --runtime=nvidia --network host \
        -v "$HOME/run-edgellm-model:/usr/local/bin/run-edgellm-model:ro" \
        -v "tensorrt-edgellm-0100-build:/opt/TensorRT-Edge-LLM/build" \
        -v "$HOME/tensorrt-edgellm-workspace:/data/edgellm" \
        -v "$HOME/.cache/huggingface:/data/models/huggingface" \
        ghcr.io/nvidia-ai-iot/tensorrt_edge_llm:0.10.0-thor \
        run-edgellm-model nvidia/NVIDIA-Nemotron-Nano-9B-v2-NVFP4 --builder onnx --stage serve
benchmark_key: "Nemotron Nano 9B V2"
benchmark_series:
  - "Nemotron 3 30B-A3B"
  - "Nemotron3 Nano 4B"
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

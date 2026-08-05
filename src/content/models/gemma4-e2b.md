---
title: "Gemma 4 E2B"
model_id: "gemma4-e2b"
short_description: "Google's compact frontier Gemma 4 model for efficient multimodal and agentic workloads"
family: "Google Gemma4"
icon: "💎"
is_new: false
order: 1
type: "Multimodal"
vision_capable: true
memory_requirements: "8GB RAM"
precision: "NVFP4 / W4A16 / Q4_K_S GGUF"
parameters: "2.3B effective (5.1B with embeddings)"
modalities: ["Text", "Image", "Audio"]
context_length: "128K"
license: "Apache 2.0"
model_size: "5.0GB"
hf_checkpoint: "ggml-org/gemma-4-E2B-it-GGUF"
huggingface_url: "https://huggingface.co/google/gemma-4-E2B-it"
minimum_jetson: "Orin Nano"
serving:
  entries:
    - engine: "vLLM"
      type: "Container"
      modules_supported:
        - thor_t5000
        - thor_t4000
        - orin_agx_64
        - orin_nx_16
      serve_command_orin: >-
        sudo docker run -it --rm --pull always --runtime=nvidia --network host -v ~/.cache/huggingface:/root/.cache/huggingface -v ~/.cache/vllm:/root/.cache/vllm vllm/vllm-openai:latest google/gemma-4-E2B-it-qat-w4a16-ct --max-model-len 8192 --gpu-memory-utilization 0.7 --reasoning-parser gemma4 --enable-auto-tool-choice --tool-call-parser gemma4 --default-chat-template-kwargs '{"enable_thinking":true}' --speculative-config '{"method":"mtp","model":"google/gemma-4-E2B-it-assistant","num_speculative_tokens":3}'
      serve_command_thor: >-
        sudo docker run -it --rm --pull always --runtime=nvidia --network host -v ~/.cache/huggingface:/root/.cache/huggingface -v ~/.cache/vllm:/root/.cache/vllm vllm/vllm-openai:latest unsloth/gemma-4-E2B-it-NVFP4 --max-model-len 8192 --gpu-memory-utilization 0.7 --reasoning-parser gemma4 --enable-auto-tool-choice --tool-call-parser gemma4 --default-chat-template-kwargs '{"enable_thinking":true}' --speculative-config '{"method":"mtp","model":"google/gemma-4-E2B-it-assistant","num_speculative_tokens":3}'
    - engine: "llama.cpp"
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
          -v $HOME/.cache/huggingface:/root/.cache/huggingface \
          ghcr.io/nvidia-ai-iot/llama_cpp:latest-jetson-orin \
          llama-server -hf unsloth/gemma-4-E2B-it-GGUF:Q4_K_S
      serve_command_thor: |-
        sudo docker run -it --rm --pull always \
          --runtime=nvidia --network host \
          -v $HOME/.cache/huggingface:/root/.cache/huggingface \
          ghcr.io/nvidia-ai-iot/llama_cpp:latest-jetson-thor \
          llama-server -hf unsloth/gemma-4-E2B-it-GGUF:Q4_K_S
benchmark_key: "Gemma 4 E2B"
benchmark_series:
  - "Gemma 4 26B-A4B"
  - "Gemma 4 31B"
---

Gemma 4 E2B is the smallest variant in the Gemma 4 family. Google positions E2B as an edge-first model for low-latency, low-memory deployments where efficiency matters more than absolute model size.

- Offline voice assistants and smart home controllers
- Robotics copilots that combine speech and image understanding
- Lightweight OCR and document QA on constrained Jetson devices
- Local agent pipelines that need structured tool calling with a small footprint

## Inputs and Outputs

**Input:** Text, image, and audio

**Output:** Text

## Supported Platforms

- Jetson Orin
- Jetson Thor

## Inference Engine

This model is configured to run on Jetson with `vLLM` and `llama.cpp`.

## Official Highlights

- Google's model card describes E2B as a dense multimodal model with **2.3B effective parameters** and **5.1B parameters including embeddings**.
- It supports **128K context**, **text/image/audio input**, and native **function calling** for agentic workflows.
- The official Gemma 4 launch notes that E2B was engineered for **offline mobile and IoT use**, including devices like Jetson Orin Nano.
- Google also documents built-in **ASR** and **speech translation** support on E2B, with audio clips up to **30 seconds**.

---
title: "Gemma 4 E4B"
model_id: "gemma4-e4b"
short_description: "Google's edge-focused Gemma 4 E4B with NVFP4, W4A16, and GGUF deployment paths on Jetson"
family: "Google Gemma4"
icon: "💎"
is_new: false
order: 2
type: "Multimodal"
vision_capable: true
memory_requirements: "8GB RAM"
precision: "NVFP4 / W4A16 / Q4_K_M GGUF"
parameters: "4.5B effective (8B with embeddings)"
modalities: ["Text", "Image", "Audio"]
context_length: "128K"
license: "Apache 2.0"
model_size: "5.3GB"
hf_checkpoint: "unsloth/gemma-4-E4B"
huggingface_url: "https://huggingface.co/unsloth/gemma-4-E4B"
minimum_jetson: "Orin NX"
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
        sudo docker run -it --rm --pull always --runtime=nvidia --network host -v ~/.cache/huggingface:/root/.cache/huggingface -v ~/.cache/vllm:/root/.cache/vllm vllm/vllm-openai:latest google/gemma-4-E4B-it-qat-w4a16-ct --max-model-len 8192 --gpu-memory-utilization 0.7 --reasoning-parser gemma4 --enable-auto-tool-choice --tool-call-parser gemma4 --default-chat-template-kwargs '{"enable_thinking":true}' --speculative-config '{"method":"mtp","model":"google/gemma-4-E4B-it-assistant","num_speculative_tokens":3}'
      serve_command_thor: >-
        sudo docker run -it --rm --pull always --runtime=nvidia --network host -v ~/.cache/huggingface:/root/.cache/huggingface -v ~/.cache/vllm:/root/.cache/vllm vllm/vllm-openai:latest unsloth/gemma-4-E4B-it-NVFP4 --max-model-len 8192 --gpu-memory-utilization 0.7 --reasoning-parser gemma4 --enable-auto-tool-choice --tool-call-parser gemma4 --default-chat-template-kwargs '{"enable_thinking":true}' --speculative-config '{"method":"mtp","model":"google/gemma-4-E4B-it-assistant","num_speculative_tokens":3}'
    - engine: "llama.cpp"
      type: "Container"
      modules_supported:
        - thor_t5000
        - thor_t4000
        - orin_agx_64
        - orin_nx_16
      serve_command_orin: |-
        sudo docker run -it --rm --pull always \
          --runtime=nvidia --network host \
          -v $HOME/.cache/huggingface:/root/.cache/huggingface \
          ghcr.io/nvidia-ai-iot/llama_cpp:latest-jetson-orin \
          llama-server -hf unsloth/gemma-4-E4B:Q4_K_M
      serve_command_thor: |-
        sudo docker run -it --rm --pull always \
          --runtime=nvidia --network host \
          -v $HOME/.cache/huggingface:/root/.cache/huggingface \
          ghcr.io/nvidia-ai-iot/llama_cpp:latest-jetson-thor \
          llama-server -hf unsloth/gemma-4-E4B:Q4_K_M
benchmark_key: "Gemma 4 E4B"
---

Gemma 4 E4B is a lightweight Gemma 4 model that can be served locally on Jetson with `llama.cpp`. In Google's launch material, E4B is framed as the stronger edge-focused sibling to E2B, combining on-device efficiency with materially better coding, reasoning, and multimodal performance.

- Local coding assistants on Orin NX, AGX Orin, or Thor
- Multimodal document and screen-understanding with optional voice input
- Tool-using assistants that need better reasoning than E2B
- A balanced default for edge AI demos or products that need better quality without moving to the larger models

## Inputs and Outputs

**Input:** Text, image, and audio

**Output:** Text

## Supported Platforms

- Jetson Orin
- Jetson Thor

## Inference Engine

This model is configured to run on Jetson with `vLLM` and `llama.cpp`.

## Official Highlights

- Google's model card describes E4B as a dense multimodal model with **4.5B effective parameters** and **8B parameters including embeddings**.
- It supports **128K context**, **text/image/audio input**, **function calling**, and configurable **thinking mode**.
- In Google's published benchmark table, E4B lands well above E2B on reasoning, coding, and vision tasks, making it the better general-purpose edge choice when memory allows.
- Like E2B, E4B includes official support for **automatic speech recognition** and **speech translation** on short audio clips.

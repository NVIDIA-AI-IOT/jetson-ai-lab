---
title: "Gemma 4 31B"
model_id: "gemma4-31b"
short_description: "Google's Gemma 4 31B variant with Q4_K_M GGUF support on Jetson through llama.cpp"
family: "Google Gemma4"
icon: "💎"
is_new: false
order: 4
type: "Multimodal"
vision_capable: true
memory_requirements: "32GB RAM"
precision: "Q4_K_M GGUF"
parameters: "31B"
modalities: ["Text", "Image"]
context_length: "256K"
license: "Apache 2.0"
model_size: "18.7GB"
hf_checkpoint: "ggml-org/gemma-4-31B-it-GGUF"
huggingface_url: "https://huggingface.co/google/gemma-4-31B-it"
minimum_jetson: "AGX Orin"
serving:
  entries:
    - engine: "vLLM"
      type: "Container"
      modules_supported:
        - thor_t5000
        - thor_t4000
        - orin_agx_64
      serve_command_orin: |-
        sudo docker run -it --rm --pull always \
          --runtime=nvidia --network host \
          -v $HOME/.cache/huggingface:/root/.cache/huggingface \
          ghcr.io/nvidia-ai-iot/vllm:gemma4-jetson-orin \
          vllm serve cyankiwi/gemma-4-31B-it-AWQ-4bit \
            --gpu-memory-utilization 0.75 \
            --enable-auto-tool-choice \
            --reasoning-parser gemma4 \
            --tool-call-parser gemma4
      serve_command_thor: |-
        sudo docker run -it --rm --pull always \
          --runtime=nvidia --network host \
          -v $HOME/.cache/huggingface:/root/.cache/huggingface \
          vllm/vllm-openai:latest \
          vllm serve nvidia/Gemma-4-31B-IT-NVFP4 \
            --gpu-memory-utilization 0.75 \
            --enable-auto-tool-choice \
            --reasoning-parser gemma4 \
            --tool-call-parser gemma4
    - engine: "llama.cpp"
      type: "Container"
      modules_supported:
        - thor_t5000
        - thor_t4000
        - orin_agx_64
      serve_command_orin: |-
        sudo docker run -it --rm --pull always \
          --runtime=nvidia --network host \
          -v $HOME/.cache/huggingface:/root/.cache/huggingface \
          ghcr.io/nvidia-ai-iot/llama_cpp:latest-jetson-orin \
          llama-server -hf ggml-org/gemma-4-31B-it-GGUF:Q4_K_M
      serve_command_thor: |-
        sudo docker run -it --rm --pull always \
          --runtime=nvidia --network host \
          -v $HOME/.cache/huggingface:/root/.cache/huggingface \
          ghcr.io/nvidia-ai-iot/llama_cpp:latest-jetson-thor \
          llama-server -hf ggml-org/gemma-4-31B-it-GGUF:Q4_K_M
benchmark_key: "Gemma 4 31B"
benchmark_series:
  - "Gemma 4 E2B"
  - "Gemma 4 26B-A4B"
---

Gemma 4 31B is the largest model in the current Gemma 4 set here, and it can be served on Jetson with `llama.cpp`. In Google's launch post, 31B is the flagship dense model in the family, aimed at the best possible raw quality for local reasoning, coding, and agentic workflows.

- Highest-quality local reasoning and coding on Jetson Thor or well-provisioned AGX Orin setups
- Long-context assistants over large documents or repositories
- Multimodal analysis of screenshots, charts, forms, and PDFs
- Advanced agent systems where answer quality matters more than minimum latency

## Inputs and Outputs

**Input:** Text and image

**Output:** Text

## Supported Platforms

- Jetson AGX Orin
- Jetson Thor

## Inference Engine

This model is configured to run on Jetson with `vLLM` and `llama.cpp`.

## Official Highlights

- Google's model card describes 31B as a dense multimodal model with **30.7B parameters**, **256K context**, and **text/image input**.
- The Gemma 4 launch post positions 31B as the top-quality model in the family and states that it ranked **#3 among open models** on the Arena AI text leaderboard at launch.
- In Google's published benchmark table, 31B is the strongest Gemma 4 variant across the major reasoning, coding, and multimodal rows shown in the card.
- Google also calls out 31B as a strong foundation for **fine-tuning** when quality matters more than latency.

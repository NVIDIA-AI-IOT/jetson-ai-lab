---
title: "Nemotron 3.5 Bolt E4B 4GB"
slug: "Nemotron-3-5-Bolt-E4B-4GB"
model_id: "nemotron-3-5-bolt"
short_description: "NVIDIA's compact conversational model for local assistants, multi-turn tool use, and interactive characters. Run text chat on Jetson with llama.cpp."
family: "NVIDIA Nemotron"
is_new: true
order: -8
type: "Text"
vision_capable: false
precision: "Q4_K_M GGUF"
parameters: "8B total / 4B effective"
modalities: ["Text"]
context_length: "64K"
license: "OpenMDW-1.1"
hf_checkpoint: "nvidia/NVIDIA-Nemotron-3.5-Bolt-E4B-4GB"
minimum_jetson: "Orin Nano"
serving:
  entries:
    - engine: "llama.cpp"
      type: "Container"
      modules_supported:
        - orin_nano_8
        - orin_nx_16
        - orin_agx_64
        - thor_t4000
        - thor_t5000
      serve_command_orin: |-
        docker run --rm -it --pull always --runtime nvidia --network host \
          -v "$HOME/.cache/huggingface:/root/.cache/huggingface" \
          ghcr.io/nvidia-ai-iot/llama_cpp:latest-jetson-orin \
          llama-server \
            -hf nvidia/NVIDIA-Nemotron-3.5-Bolt-E4B-4GB \
            --hf-file Nemotron-3.5-Bolt-E4B-Q4_K_M.gguf \
            --host 0.0.0.0 \
            --port 8000 \
            --ctx-size 36864 \
            --parallel 1 \
            --n-gpu-layers 999 \
            --jinja \
            --lazy-mode on \
            --load-mode mmap \
            --cache-ram 0
      serve_command_thor: |-
        docker run --rm -it --pull always --runtime nvidia --network host \
          -v "$HOME/.cache/huggingface:/root/.cache/huggingface" \
          ghcr.io/nvidia-ai-iot/llama_cpp:latest-jetson-thor \
          llama-server \
            -hf nvidia/NVIDIA-Nemotron-3.5-Bolt-E4B-4GB \
            --hf-file Nemotron-3.5-Bolt-E4B-Q4_K_M.gguf \
            --host 0.0.0.0 \
            --port 8000 \
            --ctx-size 36864 \
            --parallel 1 \
            --n-gpu-layers 999 \
            --jinja \
            --lazy-mode on \
            --load-mode mmap \
            --cache-ram 0
---

## Get started with Nemotron 3.5 Bolt on Jetson

[Nemotron 3.5 Bolt E4B 4GB](https://research.nvidia.com/labs/nemotron/NVIDIA-Nemotron-3.5-Bolt-E4B-4GB/) is NVIDIA's compact open language model built on Gemma-4-E4B-it. It is designed for local assistants, interactive characters, and robots that hold conversations and use tools to carry out tasks. It takes text as input and generates text as output.

NVIDIA's additional training focuses on:

- Using tools across multiple turns to complete a task.
- Following instructions throughout a conversation.
- Grounding replies in the user's input, conversation history, and tool results.

The model supports reasoning and non-reasoning modes through `enable_thinking`, plus an optional `conversational_mode` for interactive dialogue. The [model card](https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Bolt-E4B-4GB#api-client) includes API examples for these options.

The Q4_K_M GGUF release targets an approximately 4 GB model memory footprint. Total memory use also depends on context length and runtime overhead. This guide serves text chat with llama.cpp.

## Run on Jetson

Select your Orin or Thor module above and copy the command. Docker pulls the latest container for your platform, and llama.cpp downloads `Nemotron-3.5-Bolt-E4B-Q4_K_M.gguf` from `nvidia/NVIDIA-Nemotron-3.5-Bolt-E4B-4GB`. The download is cached in `~/.cache/huggingface/hub` for subsequent runs.

Once the server is ready, open `http://<JETSON_IP>:8000` for the chat UI, or use the API examples above.

Read the [NVIDIA research overview](https://research.nvidia.com/labs/nemotron/NVIDIA-Nemotron-3.5-Bolt-E4B-4GB/) for the model's design and results, or the [official model card](https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Bolt-E4B-4GB) for deployment examples.

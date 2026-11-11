---
title: "Nemotron3 Nano 4B"
model_id: "nemotron3-nano-4b"
short_description: "NVIDIA's compact 4B Nano model with day-0 llama.cpp support on Jetson Orin and Thor"
family: "NVIDIA Nemotron"
visual_family: "nvidia-nemotron"
visual_variant: "3.5"
icon: "⚡"
is_new: false
order: 0
type: "Text"
vision_capable: false
memory_requirements: "4GB RAM"
precision: "FP8 / BF16 / Q4_K_M GGUF"
parameters: "4B"
modalities: ["Text"]
input_modalities: ["text"]
output_modalities: ["text"]
tasks: ["text-generation"]
context_length: "256K"
license: "NVIDIA Nemotron Open Model License"
model_size: "2.5GB"
hf_checkpoint: "nvidia/NVIDIA-Nemotron-3-Nano-4B-GGUF"
minimum_jetson: "Jetson Orin"
# Optional: gray tabs via matrix_modules_disabled. Per-engine allowlists: supported_inference_engines[].modules_supported (from minimum_jetson).
supported_inference_engines:
  - engine: "vLLM"
    type: "Container"
    modules_supported:
      - thor_t5000
      - orin_agx_64
    serve_command_thor: >-
      sudo docker run -it --rm --pull always --runtime=nvidia --network host -v ~/.cache/huggingface:/root/.cache/huggingface -v ~/.cache/vllm:/root/.cache/vllm vllm/vllm-openai:latest nvidia/NVIDIA-Nemotron-3-Nano-4B-FP8 --max-model-len 8192 --gpu-memory-utilization 0.7 --trust-remote-code --mamba-ssm-cache-dtype float32 --kv-cache-dtype fp8 --enable-auto-tool-choice --tool-call-parser qwen3_coder --reasoning-parser nemotron_v3
    serve_command_orin: >-
      sudo docker run -it --rm --pull always --runtime=nvidia --network host -v ~/.cache/huggingface:/root/.cache/huggingface -v ~/.cache/vllm:/root/.cache/vllm vllm/vllm-openai:latest nvidia/NVIDIA-Nemotron-3-Nano-4B-BF16 --max-model-len 8192 --gpu-memory-utilization 0.7 --trust-remote-code --mamba-ssm-cache-dtype float32 --kv-cache-dtype fp8 --enable-auto-tool-choice --tool-call-parser qwen3_coder --reasoning-parser nemotron_v3
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
        llama-server \
          --hf-repo nvidia/NVIDIA-Nemotron-3-Nano-4B-GGUF \
          --hf-file NVIDIA-Nemotron3-Nano-4B-Q4_K_M.gguf \
          --ctx-size 8192 \
          --alias my_model \
          --n-gpu-layers 999 \
          --jinja
    serve_command_thor: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        -v $HOME/.cache/huggingface:/root/.cache/huggingface \
        ghcr.io/nvidia-ai-iot/llama_cpp:latest-jetson-thor \
        llama-server \
          --hf-repo nvidia/NVIDIA-Nemotron-3-Nano-4B-GGUF \
          --hf-file NVIDIA-Nemotron3-Nano-4B-Q4_K_M.gguf \
          --ctx-size 8192 \
          --alias my_model \
          --n-gpu-layers 999 \
          --jinja
---

Nemotron3 Nano 4B is a compact NVIDIA language model that can be served locally on Jetson Orin and Jetson Thor with `vLLM` or `llama.cpp`, both through an OpenAI-compatible API.

## Inputs and Outputs

**Input:** Text

**Output:** Text

## Supported Platforms

- Jetson Orin
- Jetson Thor

## Inference Engine

This model runs with `vLLM` (FP8 on Jetson Thor, BF16 on Jetson AGX Orin) or with `llama.cpp` using the GGUF checkpoint `NVIDIA-Nemotron3-Nano-4B-Q4_K_M.gguf`.

## Notes

- The provided command uses `--alias my_model`; you can change that alias to match your application if needed.
- `--n-gpu-layers 999` keeps the full model on GPU when memory allows for best performance.

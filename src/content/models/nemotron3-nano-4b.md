---
title: "Nemotron3 Nano 4B"
model_id: "nemotron3-nano-4b"
short_description: "NVIDIA's compact 4B Nano model with day-0 llama.cpp support on Jetson Orin and Thor"
family: "NVIDIA Nemotron"
icon: "⚡"
is_new: false
order: 0
type: "Text"
vision_capable: false
memory_requirements: "4GB RAM"
precision: "Q4_K_M GGUF"
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
          --ctx-size 8196 \
          --alias my_model \
          --n-gpu-layers 999
    serve_command_thor: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        -v $HOME/.cache/huggingface:/root/.cache/huggingface \
        ghcr.io/nvidia-ai-iot/llama_cpp:latest-jetson-thor \
        llama-server \
          --hf-repo nvidia/NVIDIA-Nemotron-3-Nano-4B-GGUF \
          --hf-file NVIDIA-Nemotron3-Nano-4B-Q4_K_M.gguf \
          --ctx-size 8196 \
          --alias my_model \
          --n-gpu-layers 999
benchmark_key: "Nemotron3 Nano 4B"
benchmark_series:
  - "Nemotron Nano 9B V2"
  - "Nemotron 3 30B-A3B"
---

Nemotron3 Nano 4B is a compact NVIDIA language model that can be served locally on Jetson with `llama.cpp`, giving Jetson Orin and Jetson Thor day-0 support through a simple OpenAI-compatible `llama-server` workflow.

## Inputs and Outputs

**Input:** Text

**Output:** Text

## Supported Platforms

- Jetson Orin
- Jetson Thor

## Inference Engine

This model is currently configured for `llama.cpp` using the GGUF checkpoint `NVIDIA-Nemotron3-Nano-4B-Q4_K_M.gguf`.

## Notes

- The provided command uses `--alias my_model`; you can change that alias to match your application if needed.
- `--n-gpu-layers 999` keeps the full model on GPU when memory allows for best performance.

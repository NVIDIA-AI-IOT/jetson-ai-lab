---
title: "Muse Glimmer 30B"
model_id: "muse-glimmer-30b"
short_description: "Meta's local agentic model with reasoning, tool use, image understanding, and DFlash speculative decoding"
family: "Meta Muse"
visual_family: "meta-muse-glimmer"
icon: "✨"
is_new: false
order: -1
type: "Multimodal"
vision_capable: true
memory_requirements: "24GB RAM"
precision: "NVFP4 / INT4 / K-Quant (~4-bit) GGUF"
parameters: "30B"
modalities: ["Text", "Image"]
input_modalities: ["text", "image"]
output_modalities: ["text"]
tasks: ["text-generation"]
context_length: "131K"
license: "Apache 2.0"
model_size: "17GB"
hf_checkpoint: "meta-models/Muse-Glimmer-30B-GGUF"
huggingface_url: "https://huggingface.co/meta-models/Muse-Glimmer-30B-GGUF"
minimum_jetson: "AGX Orin"
serving:
  entries:
    - engine: "vLLM"
      type: "Container"
      modules_supported:
        - thor_t5000
        - orin_agx_64
      serve_command_thor: >-
        sudo docker run -it --rm --pull always --runtime=nvidia --network host -v ~/.cache/huggingface:/root/.cache/huggingface -v ~/.cache/vllm:/root/.cache/vllm vllm/vllm-openai:latest nvidia/Muse-Glimmer-30B-NVFP4 --max-model-len 8192 --gpu-memory-utilization 0.7 --enable-auto-tool-choice --tool-call-parser muse_glimmer --reasoning-parser muse_glimmer --speculative-config '{"method":"dflash","model":"meta-models/Muse-Glimmer-30B-assistant","num_speculative_tokens":15}'
      serve_command_orin: >-
        sudo docker run -it --rm --pull always --runtime=nvidia --network host -v ~/.cache/huggingface:/root/.cache/huggingface -v ~/.cache/vllm:/root/.cache/vllm vllm/vllm-openai:latest RedHatAI/Muse-Glimmer-30B-INT4 --max-model-len 8192 --gpu-memory-utilization 0.7 --enable-auto-tool-choice --tool-call-parser muse_glimmer --reasoning-parser muse_glimmer --max-num-seqs 32 --speculative-config '{"method":"dflash","model":"meta-models/Muse-Glimmer-30B-assistant","num_speculative_tokens":15}'
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
          llama-server \
            -hf meta-models/Muse-Glimmer-30B-GGUF \
            -hff Muse-Glimmer-30B-KQuant-17GB-Q4_K_M.gguf \
            --spec-type draft-dflash \
            --n-gpu-layers 999 \
            --spec-draft-ngl 999 \
            --ctx-size 131072 \
            --flash-attn on \
            --parallel 1 \
            --jinja \
            --temp 1.0 \
            --top-p 0.95 \
            --top-k 64 \
            --host 0.0.0.0 \
            --port 8080
      serve_command_thor: |-
        sudo docker run -it --rm --pull always \
          --runtime=nvidia --network host \
          -v $HOME/.cache/huggingface:/root/.cache/huggingface \
          ghcr.io/nvidia-ai-iot/llama_cpp:latest-jetson-thor \
          llama-server \
            -hf meta-models/Muse-Glimmer-30B-GGUF \
            -hff Muse-Glimmer-30B-KQuant-17GB-Q4_K_M.gguf \
            --spec-type draft-dflash \
            --n-gpu-layers 999 \
            --spec-draft-ngl 999 \
            --ctx-size 131072 \
            --flash-attn on \
            --parallel 1 \
            --jinja \
            --temp 1.0 \
            --top-p 0.95 \
            --top-k 64 \
            --host 0.0.0.0 \
            --port 8080
---

Muse Glimmer 30B is Meta's compact agentic model for running long-horizon AI workflows locally. It combines multi-step reasoning, reliable tool calling, failure recovery, and multilingual support with image understanding through a dedicated perception encoder.

The official 17GB K-quant build is designed for a 24GB memory envelope. It runs on Jetson AGX Orin and Jetson Thor with `llama.cpp`, leaving room for the vision projector, KV cache, and the included DFlash speculative-decoding model.

## Inputs and Outputs

**Input:** Text and image

**Output:** Text

## Supported Platforms

- Jetson AGX Orin 64GB
- Jetson AGX Thor

## Why Muse Glimmer on Jetson

- **Local agents:** Plan, invoke tools, recover from failures, and complete multi-step tasks without relying on a cloud model.
- **Agentic coding:** Work through repository-scale coding and debugging tasks with controllable reasoning effort.
- **Multimodal understanding:** Analyze screenshots, charts, forms, and documents with the automatically downloaded `mmproj-Muse-Glimmer-30B-Q4_K_M.gguf` perception encoder.
- **Faster generation:** `--spec-type draft-dflash` automatically downloads and enables `dflash-Muse-Glimmer-30B-Q4_K_M.gguf` for speculative decoding without changing output quality.

## Inference Engine

This model runs with `vLLM` (NVFP4 on Jetson Thor, INT4 on Jetson AGX Orin, both with DFlash speculative decoding) or with the Jetson `llama.cpp` container. The `llama.cpp` server downloads these official Meta artifacts from Hugging Face on first launch:

- `Muse-Glimmer-30B-KQuant-17GB-Q4_K_M.gguf` — 17GB language-model weights
- `mmproj-Muse-Glimmer-30B-Q4_K_M.gguf` — perception encoder for image input
- `dflash-Muse-Glimmer-30B-Q4_K_M.gguf` — DFlash speculative-decoding model

The command uses Meta's recommended sampling defaults: temperature `1.0`, top-p `0.95`, and top-k `64`.

## Reasoning Strength

Muse Glimmer supports `low`, `medium`, `high`, and `xhigh` reasoning strengths. Set the desired level in the system prompt, for example:

```text
Reasoning strength: high.
```

Use `high` or `xhigh` for complex agentic and coding tasks. Lower levels trade some depth for faster responses.

## Additional Resources

- [Muse Glimmer 30B GGUF](https://huggingface.co/meta-models/Muse-Glimmer-30B-GGUF) — official quantized weights and companion files
- [Muse Glimmer 30B](https://huggingface.co/meta-models/Muse-Glimmer-30B) — full-precision model and usage policy
- [llama.cpp](https://github.com/ggml-org/llama.cpp) — inference engine and OpenAI-compatible server

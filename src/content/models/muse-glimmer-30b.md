---
title: "Muse Glimmer 30B"
model_id: "muse-glimmer-30b"
short_description: "Meta's local agentic model with reasoning, tool use, image understanding, and DFlash speculative decoding"
family: "Meta Muse"
icon: "✨"
is_new: true
order: -1
type: "Multimodal"
vision_capable: true
memory_requirements: "24GB RAM"
precision: "K-Quant (~4-bit) GGUF"
parameters: "30B"
modalities: ["Text", "Image"]
context_length: "131K"
license: "Apache 2.0"
model_size: "17GB"
hf_checkpoint: "meta-models/Muse-Glimmer-30B-GGUF"
huggingface_url: "https://huggingface.co/meta-models/Muse-Glimmer-30B-GGUF"
minimum_jetson: "AGX Orin"
serving:
  entries:
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
            -hff muse-glimmer-30B-kquant-17gb.gguf \
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
            -hff muse-glimmer-30B-kquant-17gb.gguf \
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

The official 17GB K-quant build is designed for a 24GB memory envelope. It can run on Jetson AGX Orin and Jetson Thor with `llama.cpp`, leaving room for the vision projector, KV cache, and the included DFlash speculative-decoding model.

## Inputs and Outputs

**Input:** Text and image

**Output:** Text

## Supported Platforms

- Jetson AGX Orin 64GB
- Jetson AGX Thor T4000
- Jetson AGX Thor T5000 Developer Kit

## Why Muse Glimmer on Jetson

- **Local agents:** Plan, invoke tools, recover from failures, and complete multi-step tasks without relying on a cloud model.
- **Agentic coding:** Work through repository-scale coding and debugging tasks with controllable reasoning effort.
- **Multimodal understanding:** Analyze screenshots, charts, forms, and documents with the automatically downloaded `mmproj-kquant.gguf` perception encoder.
- **Faster generation:** `--spec-type draft-dflash` automatically downloads and enables `dflash-kquant.gguf` for speculative decoding without changing output quality.
- **Jetson performance:** Reach up to **36 tokens/s on Jetson Thor** and **25 tokens/s on Jetson AGX Orin** with DFlash speculative decoding enabled.

## Inference Engine

This model uses the latest Jetson Orin or Jetson Thor `llama.cpp` container. The server downloads these official Meta artifacts from Hugging Face on first launch:

- `muse-glimmer-30B-kquant-17gb.gguf` — 17GB language-model weights
- `mmproj-kquant.gguf` — perception encoder for image input
- `dflash-kquant.gguf` — DFlash speculative-decoding model

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

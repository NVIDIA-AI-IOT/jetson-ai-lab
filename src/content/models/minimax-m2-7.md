---
title: "MiniMax M2.7"
model_id: "minimax-m2-7"
short_description: "MiniMax's 230B agentic MoE flagship for software engineering and self-evolving agent harnesses with llama.cpp at 4-bit"
family: "MiniMax M2.7"
icon: "🌀"
is_new: false
order: 1
type: "Text"
vision_capable: false
memory_requirements: "128GB unified memory (Thor T5000)"
precision: "UD-IQ4_XS GGUF"
parameters: "229B total / 10B activated"
modalities: ["Text"]
context_length: "196K"
license: "MiniMax Model License"
model_size: "100.96 GiB"
hf_checkpoint: "unsloth/MiniMax-M2.7-GGUF"
huggingface_url: "https://huggingface.co/unsloth/MiniMax-M2.7-GGUF"
build_nvidia_url: "https://build.nvidia.com/minimaxai/minimax-m2.7"
minimum_jetson: "Thor"
# Gray out every non-T5000 tab globally — this 100.96 GiB model only fits on Thor T5000 (128GB unified memory).
matrix_modules_disabled:
  - thor_t4000
  - orin_agx_64
  - orin_nx_16
  - orin_nano_8
# Per-engine allowlist: only `thor_t5000` carries a serve command.
serving:
  entries:
    - engine: "llama.cpp"
      type: "Container"
      modules_supported:
        - thor_t5000
      serve_command_thor: |-
        sudo docker run -it --rm --pull always \
          --runtime=nvidia --network host \
          ghcr.io/nvidia-ai-iot/llama_cpp:latest-jetson-thor \
          llama-server \
            --hf-repo unsloth/MiniMax-M2.7-GGUF \
            --hf-file UD-IQ4_XS/MiniMax-M2.7-UD-IQ4_XS-00001-of-00004.gguf \
            --ctx-size 4096 \
            --port 8080 \
            --alias my_model \
            --n-gpu-layers 999
benchmark_key: "MiniMax M2.7"
---

[MiniMax M2.7](https://www.minimax.io/news/minimax-m27-en) is MiniMax's flagship agentic Mixture-of-Experts model, designed to build complex agent harnesses and complete highly elaborate productivity tasks. M2.7 is the first MiniMax model that deeply participates in its own evolution — during development the model autonomously updated its own memory, built dozens of complex skills for RL experiments, and improved its own learning process based on experiment results.

This page describes serving the [Unsloth dynamic 4-bit GGUF](https://huggingface.co/unsloth/MiniMax-M2.7-GGUF) (`UD-IQ4_XS`, 100.96 GiB) on **Jetson AGX Thor T5000** with `llama.cpp`.

## Inputs and Outputs

**Input:** Text

**Output:** Text (with optional reasoning traces between `<think>...</think>`)

## Highlights

- **229B total / 10B active** sparse MoE (`minimax-m2` arch), **196K context**.
- **Strong real-world software engineering** and agentic tool use.
- **Self-evolving training loop**: M2.7 helped optimize its own programming scaffold during RL.

## Intended Use Cases

- **Coding agents**: bug triage, refactors, code review, security analysis, and SRE-style root-cause investigations
- **Long-running productivity agents**: document and spreadsheet automation with multi-turn tool use
- **Agent harness research**: as a strong open-source backbone for tool-using and self-improving agent loops
- **On-device RAG / repo Q&A** at the edge, when very large parameter counts matter more than minimum latency

## Additional Resources

- [Unsloth MiniMax-M2.7-GGUF on Hugging Face](https://huggingface.co/unsloth/MiniMax-M2.7-GGUF) — quantized weights (this page uses `UD-IQ4_XS`)
- [MiniMaxAI/MiniMax-M2.7](https://huggingface.co/MiniMaxAI/MiniMax-M2.7) — original BF16 weights and model card

---
title: "Mjolnir"
description: "Dedicated decode-attention kernels, a 6-bit e2m3 KV cache, and a tuned vLLM image that serve Qwen3.8 27B ~68% faster on Jetson AGX Thor and ~34% on AGX Orin than the stock vLLM image — with a CLI that benchmarks every claim."
author: "Mieszko Syty"
date: "2026-11-13"
source: "GitHub"
link: "https://github.com/GoBrrr-ai/mjolnir"
image: "https://raw.githubusercontent.com/GoBrrr-ai/mjolnir/main/assets/hero.jpg"
jetson: ["Jetson Thor", "Jetson AGX Orin"]
tags: ["LLM", "vLLM", "CUDA", "Inference", "Quantization", "Agentic AI"]
---

Mjölnir ("Thor's hammer") is an open-source serving stack for edge GPUs built around a simple observation: every generated token re-reads the whole KV cache, so decode speed on a Jetson is a memory problem. Mjolnir attacks it with four pieces:

- **A decode-attention kernel per chip** — a CuTe DSL kernel on Jetson AGX Thor's `tcgen05` tensor cores (TMA + TMEM pipeline, occupancy-pinned split-KV), an `mma.sync` kernel in the FlashAttention-2 style on Jetson Orin's Ampere SMs — each written for its exact memory hierarchy.
- **A 6-bit `e2m3` KV cache for vLLM** — 25% fewer bytes than fp8 at near-fp8 accuracy, read directly by the MMA (`kind::f8f6f4`), holding ~31% more tokens of context in the same memory.
- **A patched vLLM image** (`narandill/mjolnir-vllm`) that carries the kernel, the fp8 lm-head and a 64K-draft MTP drafter — run it with `--attention-backend MJOLNIR` or the `mjolnir` CLI.
- **A CLI that benchmarks every claim** — `mjolnir serve / bench / verify / calibrate / plot`, with raw JSON behind every number and per-model configs as YAML ("models as code").

### Measured results (`Qwen3.8-27B`, same-run A/B vs the official `vllm-openai:v0.33.0` image)

| | Jetson AGX Thor | Jetson AGX Orin |
|---|---|---|
| Decode (1 req) | 21.7 → **36.4 tok/s** (+68%) | 18.2 → **24.3 tok/s** (+34%) |
| Prefill (8K) | 2,485 → **4,428 tok/s** (+78%) | ~par (+0.8%) |
| TTFT (8K) | **−18%** | ~par |
| Inter-token latency | **−35 to −42%** | **−19 to −27%** |
| Kernel vs FlashInfer (geomean, L = 128…256K) | **1.21×** (2.17× vs FA4 hd256) | **1.13×** |
| Accuracy | tool calling within ±3.6 pts of stock | 48/48 correctness checks |

Full case studies, per-context tables and reproducible commands: [Thor](https://github.com/GoBrrr-ai/mjolnir/blob/main/docs/platforms/thor/README.md) and [Orin](https://github.com/GoBrrr-ai/mjolnir/blob/main/docs/platforms/orin/README.md).

The kernel itself is grown by an **autoresearch loop**: coding agents propose, implement and benchmark kernel experiments overnight against a fixed harness, and every attempt — kept, discarded or crashed — lands on a public ledger. See the tutorial [Mjolnir Autoresearch: an agent loop for Jetson vLLM kernels](/tutorials/mjolnir-autoresearch/).

### Resources

- [GoBrrr-ai/mjolnir](https://github.com/GoBrrr-ai/mjolnir) — source and case studies
- [`narandill/mjolnir-vllm`](https://hub.docker.com/r/narandill/mjolnir-vllm) — the image; [`mjolnir-cli`](https://pypi.org/project/mjolnir-cli/) / [`mjolnir-kernel`](https://pypi.org/project/mjolnir-kernel/) on PyPI
- [Quickstart](https://github.com/GoBrrr-ai/mjolnir#quickstart): `uv tool install mjolnir-cli && mjolnir hw setup && mjolnir serve up`

Apache-2.0 (the Thor kernel derives from an NVIDIA CUTLASS CuTe DSL example, BSD-3-Clause, notice kept in-file).

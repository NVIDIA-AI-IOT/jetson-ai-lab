---
title: "voice-containers"
description: "Production-ready speech containers for Jetson: 10 recognition and 5 synthesis engines, one Docker image each, OpenAI-compatible /v1/audio APIs and Wyoming streaming — with sm_87 + sm_110a cubins baked side by side for AGX Orin and AGX Thor."
author: "Mieszko Syty"
date: "2026-11-13"
source: "GitHub"
link: "https://github.com/GoBrrr-ai/voice-containers"
image: "https://raw.githubusercontent.com/GoBrrr-ai/voice-containers/main/assets/logo.png"
jetson: ["Jetson Thor", "Jetson AGX Orin"]
tags: ["Speech", "STT", "TTS", "Containers", "Home Assistant", "Voice AI"]
---

`voice-containers` is a full-duplex streaming voice stack for NVIDIA Jetson edge GPUs, packaged the way deployment actually happens: **one Dockerfile and one script per engine**, version-pinned, no framework. A single image serves **both boards** — native `sm_87` (Orin) and `sm_110a` (Thor) cubins baked side by side on a CUDA 13.2 SBSA / JetPack 7.2.1 userspace, with the GPU driver injected from the host.

### What's inside

**Speech recognition (10 engines)** — Parakeet TDT (sherpa-onnx, ONNX Runtime, and parakeet.cpp variants), Nemotron Streaming and Nemotron Unified ASR, Canary Flash, Whisper (faster-whisper on a patched CTranslate2), Moonshine Streaming, parakeet-redux, and Phonon — several with q4_k "Orin-budget" quantizations and opt-in VAD chunking.

**Speech synthesis (5 engines)** — Kokoro 82M, Paradee (a Kokoro distillation), Phonon 31M (CPU-only by design), Piper 1.8, and Kyutai Pocket TTS with voice cloning — PCM chunks streamed as generated.

**Interfaces** — every non-Wyoming image serves an OpenAI-compatible `/v1/audio/*` API (stock SDKs work; the wire contract is tested in CI), plus Wyoming wire for Home Assistant and SSE partials / chunked PCM for full-duplex frontends.

### Measured, not promised

A spec-driven benchmark harness (frozen manifests, seed 42, LibriSpeech `test-clean`, 500 utterances) scores every engine on WER, tail latency (p95), RTF, and anonymous-memory peak — with hard deployability gates separate from the score. Leaderboard highlights:

| rank | engine | WER | lat p50 | anon mem |
|---|---|---|---|---|
| 🥇 | nemotron-unified 0.6B q4_k | **1.84%** | 119 ms | 602 MiB |
| 🥈 | parakeet-tdt 0.6B v3 q4_k (cpp) | 2.02% | 107 ms | 585 MiB |
| 🥉 | phonon-2.5 q4_k | 2.07% | 111 ms | 577 MiB |

Fastest RTF p50: **0.010** — real-time factors two orders of magnitude under the streaming bar, at single-digit watts.

### Try it

```bash
# speak OpenAI to it - recognition...
docker run -d --runtime nvidia --rm -p 8080:8080 narandill/canary-flash-stt:0.2.0
curl -s localhost:8080/v1/audio/transcriptions -F file=@speech.wav -F model=canary-180m-flash-int8

# ...and synthesis
docker run -d --runtime nvidia --rm -p 8880:8880 narandill/kokoro-tts:0.1.0
curl -s localhost:8880/v1/audio/speech -H 'Content-Type: application/json' \
  -d '{"input":"Hello from the edge.","voice":"af_heart","response_format":"wav"}' -o hello.wav
```

On pre-7.2.1 hosts, add `-e NVIDIA_DISABLE_REQUIRE=1` (driver 580.00 vs the baked 13.2 userspace; drop the flag after upgrading).

### Resources

- [GoBrrr-ai/voice-containers](https://github.com/GoBrrr-ai/voice-containers) — all 15 packages, the benchmark harness, and per-engine docs
- [Docker Hub](https://hub.docker.com/u/narandill) — every image, `arm64`, version-pinned tags

Apache-2.0.

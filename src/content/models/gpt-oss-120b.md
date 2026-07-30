---
title: "GPT OSS 120B"
model_id: "gpt-oss-120b"
short_description: "OpenAI's open-source 120 billion parameter language model for Jetson Thor"
family: "OpenAI GPT OSS"
icon: "🤖"
is_new: false
order: 2
type: "Text"
vision_capable: false
memory_requirements: "64GB RAM"
precision: "NVFP4"
parameters: "117B total / 5.1B activated"
modalities: ["Text"]
context_length: "128K"
license: "Apache 2.0"
model_size: "60GB"
hf_checkpoint: "openai/gpt-oss-120b"
huggingface_url: "https://huggingface.co/openai/gpt-oss-120b"
minimum_jetson: "Thor"
# Optional: gray tabs via matrix_modules_disabled. Per-engine allowlists: supported_inference_engines[].modules_supported (from minimum_jetson).
supported_inference_engines:
  - engine: "vLLM"
    type: "Container"
    modules_supported:
      - thor_t5000
      - thor_t4000
    install_command: |-
      mkdir -p $HOME/.cache/tiktoken
      wget -q https://openaipublic.blob.core.windows.net/encodings/cl100k_base.tiktoken \
        -O $HOME/.cache/tiktoken/cl100k_base.tiktoken
      wget -q https://openaipublic.blob.core.windows.net/encodings/o200k_base.tiktoken \
        -O $HOME/.cache/tiktoken/o200k_base.tiktoken
    serve_command_thor: |-
      sudo docker run -it --rm --pull always --runtime=nvidia --network host \
        -v $HOME/.cache/huggingface:/root/.cache/huggingface \
        -v $HOME/.cache/tiktoken:/etc/encodings \
        -e TIKTOKEN_ENCODINGS_BASE=/etc/encodings \
        vllm/vllm-openai:latest \
        openai/gpt-oss-120b --gpu-memory-utilization 0.8
---

[OpenAI GPT OSS 120B](https://huggingface.co/openai/gpt-oss-120b) is OpenAI's open-source 120 billion parameter language model. Due to its size, this model is exclusively supported on Jetson AGX Thor. It requires tiktoken encodings to be downloaded before serving.

## Running with vLLM (Thor Only)

### Step 1: Download Tiktoken Encodings

```bash
mkdir -p $HOME/.cache/tiktoken
wget -q https://openaipublic.blob.core.windows.net/encodings/cl100k_base.tiktoken \
  -O $HOME/.cache/tiktoken/cl100k_base.tiktoken
wget -q https://openaipublic.blob.core.windows.net/encodings/o200k_base.tiktoken \
  -O $HOME/.cache/tiktoken/o200k_base.tiktoken
```

### Step 2: Serve

```bash
sudo docker run -it --rm --pull always --runtime=nvidia --network host \
  -v $HOME/.cache/huggingface:/root/.cache/huggingface \
  -v $HOME/.cache/tiktoken:/etc/encodings \
  -e TIKTOKEN_ENCODINGS_BASE=/etc/encodings \
  vllm/vllm-openai:latest \
  openai/gpt-oss-120b --gpu-memory-utilization 0.8
```

## GPT OSS Family

| Model | Parameters | Memory | Minimum Jetson |
|---|---|---|---|
| [GPT OSS 20B](/models/gpt-oss-20b) | 20B | 16GB RAM | AGX Orin |
| **GPT OSS 120B** | 120B | 64GB RAM | Thor |

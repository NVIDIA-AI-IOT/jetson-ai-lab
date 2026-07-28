---
title: "GPT OSS 20B"
model_id: "gpt-oss-20b"
short_description: "OpenAI's open-source 20 billion parameter language model"
family: "OpenAI GPT OSS"
icon: "🤖"
is_new: false
order: 1
type: "Text"
vision_capable: false
memory_requirements: "16GB RAM"
precision: "W4A16"
parameters: "21B total / 3.6B activated"
modalities: ["Text"]
context_length: "128K"
license: "Apache 2.0"
model_size: "12GB"
hf_checkpoint: "openai/gpt-oss-20b"
huggingface_url: "https://huggingface.co/openai/gpt-oss-20b"
minimum_jetson: "AGX Orin"
# Optional: gray tabs via matrix_modules_disabled. Per-engine allowlists: supported_inference_engines[].modules_supported (from minimum_jetson).
supported_inference_engines:
  - engine: "vLLM"
    type: "Container"
    modules_supported:
      - thor_t5000
      - thor_t4000
      - orin_agx_64
    install_command: |-
      mkdir -p $HOME/.cache/tiktoken
      wget -q https://openaipublic.blob.core.windows.net/encodings/cl100k_base.tiktoken \
        -O $HOME/.cache/tiktoken/cl100k_base.tiktoken
      wget -q https://openaipublic.blob.core.windows.net/encodings/o200k_base.tiktoken \
        -O $HOME/.cache/tiktoken/o200k_base.tiktoken
    serve_command_orin: |-
      sudo docker run -it --rm --pull always --runtime=nvidia --network host \
        -v $HOME/.cache/huggingface:/root/.cache/huggingface \
        -v $HOME/.cache/tiktoken:/etc/encodings \
        -e TIKTOKEN_ENCODINGS_BASE=/etc/encodings \
        ghcr.io/nvidia-ai-iot/vllm:latest-jetson-orin \
        vllm serve openai/gpt-oss-20b --gpu-memory-utilization 0.8
    serve_command_thor: |-
      sudo docker run -it --rm --pull always --runtime=nvidia --network host \
        -v $HOME/.cache/huggingface:/root/.cache/huggingface \
        -v $HOME/.cache/tiktoken:/etc/encodings \
        -e TIKTOKEN_ENCODINGS_BASE=/etc/encodings \
        vllm/vllm-openai:latest \
        vllm serve openai/gpt-oss-20b --gpu-memory-utilization 0.8
benchmark_key: "GPT-OSS-20B"
---

[OpenAI GPT OSS 20B](https://huggingface.co/openai/gpt-oss-20b) is OpenAI's open-source 20 billion parameter language model. This model requires tiktoken encodings to be downloaded before serving.

## Running with vLLM

### Step 1: Download Tiktoken Encodings

```bash
mkdir -p $HOME/.cache/tiktoken
wget -q https://openaipublic.blob.core.windows.net/encodings/cl100k_base.tiktoken \
  -O $HOME/.cache/tiktoken/cl100k_base.tiktoken
wget -q https://openaipublic.blob.core.windows.net/encodings/o200k_base.tiktoken \
  -O $HOME/.cache/tiktoken/o200k_base.tiktoken
```

### Step 2: Serve

<div class="device-tabs">
<div class="device-tab-bar">
<button class="device-tab active" data-target="orin">Jetson Orin</button>
<button class="device-tab" data-target="thor">Jetson Thor</button>
</div>
<div class="device-panel" data-panel="orin">

```bash
sudo docker run -it --rm --pull always --runtime=nvidia --network host \
  -v $HOME/.cache/huggingface:/root/.cache/huggingface \
  -v $HOME/.cache/tiktoken:/etc/encodings \
  -e TIKTOKEN_ENCODINGS_BASE=/etc/encodings \
  ghcr.io/nvidia-ai-iot/vllm:latest-jetson-orin \
  vllm serve openai/gpt-oss-20b --gpu-memory-utilization 0.8
```

</div>
<div class="device-panel" data-panel="thor" style="display:none">

```bash
sudo docker run -it --rm --pull always --runtime=nvidia --network host \
  -v $HOME/.cache/huggingface:/root/.cache/huggingface \
  -v $HOME/.cache/tiktoken:/etc/encodings \
  -e TIKTOKEN_ENCODINGS_BASE=/etc/encodings \
  vllm/vllm-openai:latest \
  vllm serve openai/gpt-oss-20b --gpu-memory-utilization 0.8
```

</div>
</div>

## GPT OSS Family

| Model | Parameters | Memory | Minimum Jetson |
|---|---|---|---|
| **GPT OSS 20B** | 20B | 16GB RAM | AGX Orin |
| [GPT OSS 120B](/models/gpt-oss-120b) | 120B | 64GB RAM | Thor |

---
title: "Cosmos Reason 2 2B"
model_id: "cosmos-reason2-2b"
short_description: "NVIDIA's compact 2B parameter vision-language model with built-in chain-of-thought reasoning for edge deployment"
family: "NVIDIA Cosmos Reason"
icon: "🧠"
is_new: false
order: 3
type: "Multimodal"
vision_capable: true
memory_requirements: "8GB RAM"
precision: "FP8"
parameters: "2B"
modalities: ["Text", "Image", "Video"]
context_length: "256K"
license: "NVIDIA Open Model License"
model_size: "5GB"
hf_checkpoint: "nvidia/Cosmos-Reason2-2B"
huggingface_url: "https://huggingface.co/nvidia/Cosmos-Reason2-2B"
minimum_jetson: "Orin Nano"
# Optional: gray tabs via matrix_modules_disabled. Per-engine allowlists: supported_inference_engines[].modules_supported (from minimum_jetson).
hide_run_button: true
supported_inference_engines:
  - engine: "vLLM"
    type: "Container"
    modules_supported:
      - thor_t5000
      - thor_t4000
      - orin_agx_64
      - orin_nx_16
      - orin_nano_8
    install_command: |-
      ngc registry model download-version "nim/nvidia/cosmos-reason2-2b:1208-fp8-static-kv8"
    serve_command_orin: |-
      sudo docker run -it --rm \
        --runtime=nvidia --network host \
        -v $MODEL_PATH:/models/cosmos-reason2-2b:ro \
        ghcr.io/nvidia-ai-iot/vllm:latest-jetson-orin \
        vllm serve /models/cosmos-reason2-2b \
          --max-model-len 8192 \
          --gpu-memory-utilization 0.8 \
          --reasoning-parser qwen3 \
          --media-io-kwargs '{"video": {"num_frames": -1}}'
    serve_command_thor: |-
      sudo docker run -it --rm \
        --runtime=nvidia --network host \
        -v $MODEL_PATH:/models/cosmos-reason2-2b:ro \
        vllm/vllm-openai:latest \
        vllm serve /models/cosmos-reason2-2b \
          --max-model-len 8192 \
          --gpu-memory-utilization 0.8 \
          --reasoning-parser qwen3 \
          --media-io-kwargs '{"video": {"num_frames": -1}}'
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
        llama-server -hf Kbenkhaled/Cosmos-Reason2-2B-GGUF:Q8_0 -c 8192
    serve_command_thor: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        -v $HOME/.cache/huggingface:/root/.cache/huggingface \
        ghcr.io/nvidia-ai-iot/llama_cpp:latest-jetson-thor \
        llama-server -hf Kbenkhaled/Cosmos-Reason2-2B-GGUF:Q8_0 -c 8192
benchmark_key: "Cosmos Reasoning 2 2B"
benchmark_series:
  - "Cosmos Reasoning 2 8B"
---

[NVIDIA Cosmos Reason 2B](https://huggingface.co/nvidia/Cosmos-Reason2-2B) is a compact vision-language model with built-in chain-of-thought reasoning capabilities. Despite its small 2B parameter size, it can perform spatial reasoning, anomaly detection, and detailed scene analysis, making it well-suited for edge deployment on Jetson.

## Key Capabilities

- **Spatial Reasoning**: Understands spatial relationships between objects in scenes
- **Anomaly Detection**: Identifies unusual patterns or objects in visual data
- **Scene Analysis**: Provides detailed descriptions and analysis of visual content
- **Chain-of-thought Reasoning**: Generates reasoning traces before concluding with a final response

## Inputs and Outputs

**Input:**
- Text prompts and images
- Supports video frame analysis via `--media-io-kwargs`

**Output:**
- Generated text with chain-of-thought reasoning traces
- Spatial analysis, anomaly detection results, and scene descriptions

## Running with vLLM

The vLLM path uses an [FP8 quantized checkpoint from NGC](https://catalog.ngc.nvidia.com/orgs/nim/teams/nvidia/models/cosmos-reason2-2b/files?version=1208-fp8-static-kv8) downloaded via the NGC CLI.

### Step 1: Install and Configure the NGC CLI

```bash
wget -O ngccli_arm64.zip https://api.ngc.nvidia.com/v2/resources/nvidia/ngc-apps/ngc_cli/versions/4.13.0/files/ngccli_arm64.zip
unzip ngccli_arm64.zip && chmod u+x ngc-cli/ngc
export PATH="$PATH:$(pwd)/ngc-cli"
ngc config set
```

You will need an [NGC account](https://ngc.nvidia.com/) with access to the `nim` org and a valid API key.

### Step 2: Download the FP8 Model

```bash
ngc registry model download-version "nim/nvidia/cosmos-reason2-2b:1208-fp8-static-kv8" \
  --dest ~/.cache/huggingface/hub
MODEL_PATH="$(home)/.cache/huggingface/hub/cosmos-reason2-2b_v1208-fp8-static-kv8"
```

### Step 3: Serve

The second volume `-v ${HOME}/.cache/vllm:/root/.cache/vllm` persists vLLM's **torch.compile cache** on the host. The first run compiles kernels and writes them there; later runs reuse the cache and start faster. Create the dir if needed: `mkdir -p ~/.cache/vllm`.

<div class="device-tabs">
<div class="device-tab-bar">
<button class="device-tab active" data-target="thor">Jetson Thor</button>
<button class="device-tab" data-target="orin">AGX Orin</button>
<button class="device-tab" data-target="nano">Orin Nano</button>
</div>
<div class="device-panel" data-panel="thor">

```bash
mkdir -p ~/.cache/vllm
sudo sysctl -w vm.drop_caches=3

sudo docker run -it --rm --runtime=nvidia --network host \
  -v $MODEL_PATH:/models/cosmos-reason2-2b:ro \
  -v ${HOME}/.cache/vllm:/root/.cache/vllm \
  vllm/vllm-openai:latest \
  vllm serve /models/cosmos-reason2-2b \
    --served-model-name nvidia/cosmos-reason2-2b-fp8 \
    --max-model-len 8192 \
    --gpu-memory-utilization 0.8 \
    --reasoning-parser qwen3 \
    --media-io-kwargs '{"video": {"num_frames": -1}}' \
    --enable-prefix-caching \
    --port 8010
```

</div>
<div class="device-panel" data-panel="orin" style="display:none">

```bash
mkdir -p ~/.cache/vllm
sudo sysctl -w vm.drop_caches=3

sudo docker run -it --rm --runtime=nvidia --network host \
  -v $MODEL_PATH:/models/cosmos-reason2-2b:ro \
  -v ${HOME}/.cache/vllm:/root/.cache/vllm \
  ghcr.io/nvidia-ai-iot/vllm:latest-jetson-orin \
  vllm serve /models/cosmos-reason2-2b \
    --max-model-len 8192 --gpu-memory-utilization 0.8 --reasoning-parser qwen3 \
    --media-io-kwargs '{"video": {"num_frames": -1}}' \
    --enable-prefix-caching \
    --port 8010
```

</div>
<div class="device-panel" data-panel="nano" style="display:none">

On Orin Super Nano, use memory-constrained flags:

```bash
mkdir -p ~/.cache/vllm
sudo sysctl -w vm.drop_caches=3

sudo docker run -it --rm --runtime=nvidia --network host \
  -v $MODEL_PATH:/models/cosmos-reason2-2b:ro \
  -v ${HOME}/.cache/vllm:/root/.cache/vllm \
  ghcr.io/nvidia-ai-iot/vllm:latest-jetson-orin \
  vllm serve /models/cosmos-reason2-2b \
    --enforce-eager --max-model-len 768 \
    --max-num-batched-tokens 768 \
    --gpu-memory-utilization 0.52 \
    --max-num-seqs 1 --enable-chunked-prefill \
    --limit-mm-per-prompt '{"image":1}' \
    --enable-prefix-caching \
    --port 8010
```

You may also need to reduce the image resolution in `preprocessor_config.json` — see the [full tutorial](/tutorials/cosmos-reason2-vlm#step-4-serve-cosmos-reason2-with-vllm) for details.

</div>
</div>

## Running with llama.cpp (Recommended for Orin Nano)

<div class="device-tabs">
<div class="device-tab-bar">
<button class="device-tab active" data-target="thor">Jetson Thor</button>
<button class="device-tab" data-target="orin">AGX Orin</button>
<button class="device-tab" data-target="nano">Orin Nano</button>
</div>
<div class="device-panel" data-panel="thor">

```bash
sudo docker run -it --rm --pull always --runtime=nvidia --network host \
  -v $HOME/.cache/huggingface:/root/.cache/huggingface \
  ghcr.io/nvidia-ai-iot/llama_cpp:latest-jetson-thor \
  llama-server -hf Kbenkhaled/Cosmos-Reason2-2B-GGUF:Q8_0 -c 8192
```

</div>
<div class="device-panel" data-panel="orin" style="display:none">

```bash
sudo docker run -it --rm --pull always --runtime=nvidia --network host \
  -v $HOME/.cache/huggingface:/root/.cache/huggingface \
  ghcr.io/nvidia-ai-iot/llama_cpp:latest-jetson-orin \
  llama-server -hf Kbenkhaled/Cosmos-Reason2-2B-GGUF:Q8_0 -c 8192
```

</div>
<div class="device-panel" data-panel="nano" style="display:none">

```bash
sudo docker run -it --rm --pull always --runtime=nvidia --network host \
  -v $HOME/.cache/huggingface:/root/.cache/huggingface \
  ghcr.io/nvidia-ai-iot/llama_cpp:latest-jetson-orin \
  llama-server -hf Kbenkhaled/Cosmos-Reason2-2B-GGUF:Q8_0 -c 8192
```

</div>
</div>

## Cosmos Reason 2 Family

| Model | Parameters | Memory | Best For |
|---|---|---|---|
| **Cosmos Reason 2 2B** | 2B | 8GB RAM | Lightweight edge deployment |
| [Cosmos Reason 2 8B](/models/cosmos-reason2-8b) | 8B | 18GB RAM | Higher accuracy, demanding tasks |

## Additional Resources

- [NGC FP8 Checkpoint](https://catalog.ngc.nvidia.com/orgs/nim/teams/nvidia/models/cosmos-reason2-2b/files?version=1208-fp8-static-kv8) - FP8 quantized model for vLLM
- [Live VLM WebUI](https://github.com/NVIDIA-AI-IOT/live-vlm-webui) - real-time webcam-to-VLM interface


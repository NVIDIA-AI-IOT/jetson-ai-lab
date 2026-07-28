---
title: "Cosmos3 Nano"
model_id: "cosmos3-nano"
short_description: "NVIDIA's compact vision-language reasoning model (16B) with chain-of-thought over text, image, and video — NVFP4 for Blackwell/Thor."
family: "NVIDIA Cosmos"
icon: "🧠"
is_new: true
order: 5
type: "Multimodal"
vision_capable: true
memory_requirements: "16GB RAM"
precision: "NVFP4"
parameters: "16B"
modalities: ["Text", "Image", "Video"]
context_length: "256K"
license: "NVIDIA Open Model License"
model_size: "7GB"
hf_checkpoint: "nvidia/Cosmos3-Nano"
huggingface_url: "https://huggingface.co/nvidia/Cosmos3-Nano"
minimum_jetson: "Thor"
hide_run_button: true
supported_inference_engines:
  - engine: "vLLM"
    type: "Container"
    modules_supported:
      - thor_t5000
      - thor_t4000
    install_command: |-
      ngc registry model download-version "nim/nvidia/cosmos3-nano-reasoner:modelopt-nvfp4-full-quantize-final_format_fix"
    serve_command_thor: |-
      sudo docker run -it --rm \
        --runtime=nvidia --network host \
        -v $MODEL_PATH:/model:ro \
        --entrypoint "" \
        vllm/vllm-openai:latest \
        vllm serve /model \
          --max-model-len 8192 \
          --gpu-memory-utilization 0.8 \
          --trust-remote-code \
          --limit-mm-per-prompt '{"image": 1, "video": 0}'
benchmark_key: "Cosmos3 Nano"
benchmark_series:
  - "Cosmos Reasoning 2 8B"
---

[Cosmos3 Nano](https://huggingface.co/nvidia/Cosmos3-Nano) is a compact (16B) vision-language reasoning model from the NVIDIA Cosmos family. It performs chain-of-thought reasoning over text, images, and video, producing text output. This page covers the **NVFP4** checkpoint, which runs natively on Jetson Thor (Blackwell, sm_110) for efficient 4-bit inference.

## Key Capabilities

- **Multimodal Reasoning**: Chain-of-thought over combined image/video + text input
- **Spatial & Scene Understanding**: Reasoning about objects and relationships in a scene
- **Video Understanding**: Temporal reasoning across video frames
- **NVFP4 on Blackwell**: 4-bit (E2M1 with FP8 block scales) weights for high throughput on Thor

## Running with vLLM (NVFP4)

The NVFP4 checkpoint is published on NGC and downloaded via the NGC CLI.

### Step 1: Install and Configure the NGC CLI

```bash
wget -O ngccli_arm64.zip https://api.ngc.nvidia.com/v2/resources/nvidia/ngc-apps/ngc_cli/versions/4.20.1/files/ngccli_arm64.zip
unzip ngccli_arm64.zip && chmod u+x ngc-cli/ngc
export PATH="$PATH:$(pwd)/ngc-cli"
ngc config set
```

You will need an [NGC account](https://ngc.nvidia.com/) with access to the model and a valid API key.

### Step 2: Download the NVFP4 Model

```bash
mkdir -p ~/cosmos3-ngc
ngc registry model download-version \
  "nim/nvidia/cosmos3-nano-reasoner:modelopt-nvfp4-full-quantize-final_format_fix" \
  --dest ~/cosmos3-ngc
export MODEL_PATH=$(find ~/cosmos3-ngc -maxdepth 2 -name config.json -exec dirname {} \; | head -1)
```

### Step 3: Serve on Jetson Thor

```bash
sudo docker run -it --rm --runtime=nvidia --network host \
  -v $MODEL_PATH:/model:ro \
  --entrypoint "" \
  vllm/vllm-openai:latest \
  vllm serve /model \
    --max-model-len 8192 \
    --gpu-memory-utilization 0.8 \
    --trust-remote-code \
    --limit-mm-per-prompt '{"image": 1, "video": 0}'
```

Send an OpenAI-style chat request with an `image_url` (data URI or http URL) plus a text prompt to exercise the multimodal path.

## Additional Resources

- [NGC NVFP4 Checkpoint](https://catalog.ngc.nvidia.com/orgs/nim/nvidia/models/cosmos3-nano-reasoner/modelopt-nvfp4-full-quantize-final_format_fix) - NVFP4 quantized model for vLLM on Thor
- [Live VLM WebUI](https://github.com/NVIDIA-AI-IOT/live-vlm-webui) - real-time webcam-to-VLM interface

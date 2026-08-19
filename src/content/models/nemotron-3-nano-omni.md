---
title: "Nemotron 3 Nano Omni"
model_id: "nemotron-3-nano-omni"
short_description: "NVIDIA's multimodal reasoning model with language, vision, audio, and video understanding — 30B total / 3B active MoE, available in NVFP4, FP8, and BF16."
family: "NVIDIA Nemotron"
icon: "⚡"
is_new: false
order: 4
type: "Multimodal"
vision_capable: true
memory_requirements: "64GB RAM"
precision: "NVFP4 / FP8 / BF16 / Q4_K_M GGUF"
parameters: "30B total / 3B active"
modalities: ["Text", "Image", "Audio", "Video"]
context_length: "256K"
license: "NVIDIA Open Model License"
model_size: "21GB"
hf_checkpoint: "nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-NVFP4"
huggingface_url: "https://huggingface.co/nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-NVFP4"
build_nvidia_url: "https://build.nvidia.com/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"
minimum_jetson: "Thor"
supported_inference_engines:
  - engine: "vLLM"
    type: "Container"
    modules_supported:
      - thor_t5000
      - thor_t4000
    serve_command_thor: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        -v $HOME/.cache/huggingface:/root/.cache/huggingface \
        --entrypoint bash \
        vllm/vllm-openai:latest \
        -c "pip install -q 'vllm[audio]' && vllm serve nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-NVFP4 \
          --trust-remote-code --gpu-memory-utilization 0.8 --max-model-len 32768 \
          --reasoning-parser nemotron_v3 --enable-auto-tool-choice --tool-call-parser qwen3_coder"
  - engine: "llama.cpp"
    type: "Container"
    modules_supported:
      - thor_t5000
      - thor_t4000
      - orin_agx_64
    serve_command_thor: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        ghcr.io/nvidia-ai-iot/llama_cpp:latest-jetson-thor \
        llama-server \
          --hf-repo ggml-org/NVIDIA-Nemotron-3-Nano-Omni \
          --hf-file nemotron-3-nano-omni-ga_v1.0-Q4_K_M.gguf \
          --ctx-size 8192 \
          --port 8080 \
          --alias my_model \
          --n-gpu-layers 999
    serve_command_orin: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        ghcr.io/nvidia-ai-iot/llama_cpp:latest-jetson-orin \
        llama-server \
          --hf-repo ggml-org/NVIDIA-Nemotron-3-Nano-Omni \
          --hf-file nemotron-3-nano-omni-ga_v1.0-Q4_K_M.gguf \
          --ctx-size 8192 \
          --port 8080 \
          --alias my_model \
          --n-gpu-layers 999
  - engine: "Ollama"
    type: "Local"
    modules_supported:
      - thor_t5000
      - thor_t4000
      - orin_agx_64
    serve_command_thor: ollama run nemotron3:33b-q4_K_M
    serve_command_orin: ollama run nemotron3:33b-q4_K_M
  - engine: "TensorRT Edge-LLM"
    type: "Container"
    modules_supported:
      - thor_t5000
    install_command: |-
      mkdir -p "$HOME/tensorrt-edgellm-workspace" "$HOME/.cache/huggingface"
      curl -fsSL https://www.jetson-ai-lab.com/code-samples/tensorrt_edge_llm/run_model.sh -o "$HOME/run-edgellm-model"
      chmod +x "$HOME/run-edgellm-model"
    serve_command_thor: |-
      sudo docker run -it --rm --pull always --runtime=nvidia --network host \
        -e HF_TOKEN="$HF_TOKEN" \
        -v "$HOME/run-edgellm-model:/usr/local/bin/run-edgellm-model:ro" \
        -v "tensorrt-edgellm-0100-build:/opt/TensorRT-Edge-LLM/build" \
        -v "$HOME/tensorrt-edgellm-workspace:/data/edgellm" \
        -v "$HOME/.cache/huggingface:/data/models/huggingface" \
        ghcr.io/nvidia-ai-iot/tensorrt_edge_llm:0.10.0-thor \
        run-edgellm-model nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-NVFP4 --builder onnx --stage serve
benchmark_key: "Nemotron 3 Nano Omni"
benchmark_series:
  - "Nemotron 3 30B-A3B"
---

Nemotron Nano 3 Omni is NVIDIA's multimodal reasoning model combining language, vision, audio, and video understanding. It uses a Mixture-of-Experts architecture with 30B total parameters and 3B active per forward pass, delivering strong multimodal reasoning with efficient inference on Jetson platforms.

## Inputs and Outputs

**Input:** Text, image, audio, and video

**Output:** Text

## Intended Use Cases

- **Multimodal Assistants**: Answering questions about images, audio clips, and video segments
- **Voice and Vision Interfaces**: Edge AI applications combining speech and visual understanding
- **Agentic Workflows**: Function calling with chain-of-thought reasoning for autonomous task execution
- **Document Understanding**: OCR, chart analysis, and visual document Q&A
- **Audio Transcription and Analysis**: Processing short audio clips with context awareness

## Supported Platforms

- Jetson Thor  

## Running with vLLM

```bash
sudo docker run -it --rm --pull always \
  --runtime=nvidia --network host \
  -v $HOME/.cache/huggingface:/root/.cache/huggingface \
  --entrypoint bash \
  vllm/vllm-openai:latest \
  -c "pip install -q 'vllm[audio]' && vllm serve nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-NVFP4 \
    --trust-remote-code --gpu-memory-utilization 0.8 --max-model-len 32768 \
    --reasoning-parser nemotron_v3 --enable-auto-tool-choice --tool-call-parser qwen3_coder"
```

## Running with llama.cpp

<div class="device-tabs">
<div class="device-tab-bar">
<button class="device-tab active" data-target="thor-llama">Jetson Thor</button>
<button class="device-tab" data-target="orin-llama">Jetson AGX Orin 64GB</button>
</div>
<div class="device-panel" data-panel="thor-llama">

```bash
sudo docker run -it --rm --pull always \
  --runtime=nvidia --network host \
  ghcr.io/nvidia-ai-iot/llama_cpp:latest-jetson-thor \
  llama-server \
    --hf-repo ggml-org/NVIDIA-Nemotron-3-Nano-Omni \
    --hf-file nemotron-3-nano-omni-ga_v1.0-Q4_K_M.gguf \
    --ctx-size 8192 \
    --port 8080 \
    --alias my_model \
    --n-gpu-layers 999
```

</div>
<div class="device-panel" data-panel="orin-llama">

```bash
sudo docker run -it --rm --pull always \
  --runtime=nvidia --network host \
  ghcr.io/nvidia-ai-iot/llama_cpp:latest-jetson-orin \
  llama-server \
    --hf-repo ggml-org/NVIDIA-Nemotron-3-Nano-Omni \
    --hf-file nemotron-3-nano-omni-ga_v1.0-Q4_K_M.gguf \
    --ctx-size 8192 \
    --port 8080 \
    --alias my_model \
    --n-gpu-layers 999
```

</div>
</div>

Once the server is running, query it with:

```bash
curl -s http://127.0.0.1:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "my_model",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ],
    "max_tokens": 256,
    "chat_template_kwargs": {"enable_thinking": true}
  }'
```

> **Note:** `--hf-repo ggml-org/NVIDIA-Nemotron-3-Nano-Omni` and `--hf-file nemotron-3-nano-omni-ga_v1.0-Q4_K_M.gguf` download the official GGUF checkpoint from Hugging Face. `--n-gpu-layers 999` offloads all layers to GPU. `--alias my_model` sets the model name used in API requests. `chat_template_kwargs: {"enable_thinking": true}` activates chain-of-thought reasoning.

## Running with Ollama

Ollama runs the Q4_K_M GGUF directly on the GPU and works on both Jetson Thor and Jetson AGX Orin 64GB.

```bash
ollama run nemotron3:33b-q4_K_M
```

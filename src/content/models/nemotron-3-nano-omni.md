---
title: "Nemotron 3 Nano Omni"
model_id: "nemotron-3-nano-omni"
short_description: "NVIDIA's multimodal reasoning model with language, vision, audio, and video understanding — 30B total / 3B active MoE, available in NVFP4, FP8, and BF16."
family: "NVIDIA Nemotron"
icon: "⚡"
is_new: true
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

## Running with TensorRT Edge-LLM

TensorRT Edge-LLM support for this model is currently Jetson Thor only. It requires exporting the model to ONNX and building TensorRT engines before running inference. See the [TensorRT Edge-LLM GitHub repository](https://github.com/NVIDIA/TensorRT-Edge-LLM) and the [export/build quick start](https://nvidia.github.io/TensorRT-Edge-LLM/user_guide/getting_started/quick-start-guide.html) for the full setup flow.

<details>
<summary><strong>Steps for TensorRT-Edge-LLM on Jetson Thor</strong></summary>

Run these steps on Jetson Thor. Set paths for the TensorRT Edge-LLM checkout, model checkpoint, ONNX export directory, and engine output directory:

```bash
export TRT_EDGE_LLM_REPO=$HOME/tensorrt-edge-llm
export CHECKPOINT_DIR=/path/to/nemotron-nano-3-omni-checkpoint
export WORKSPACE=$HOME/tensorrt-edgellm-workspace/nemotron-nano-3-omni
export ONNX=$WORKSPACE/onnx
export ENGINE=$WORKSPACE/engines
```

### Build TensorRT Edge-LLM

```bash
cd $HOME
git clone https://github.com/NVIDIA/TensorRT-Edge-LLM.git tensorrt-edge-llm
cd tensorrt-edge-llm
git submodule update --init 3rdParty/nlohmannJson 3rdParty/NVTX

mkdir -p build
cd build
export PATH=/usr/local/cuda/bin:$PATH

cmake .. -DCMAKE_BUILD_TYPE=Release \
  -DENABLE_CUTE_DSL=ALL \
  -DTRT_PACKAGE_DIR=/usr \
  -DCUDA_CTK_VERSION=13.0

make -j$(nproc)
```

### Export ONNX

```bash
export PYTHONPATH=$TRT_EDGE_LLM_REPO/experimental:$PYTHONPATH
python3 -m venv $HOME/trt-edgellm-venv
source $HOME/trt-edgellm-venv/bin/activate

cd $TRT_EDGE_LLM_REPO/experimental/llm_loader
pip3 install -r requirements.txt

python3 -m llm_loader.export_all_cli \
  $CHECKPOINT_DIR \
  $ONNX
```

This creates `$ONNX/llm`, `$ONNX/visual`, and `$ONNX/audio`.

### Build Engines

```bash
export BUILD=$HOME/tensorrt-edge-llm/build
export EDGELLM_PLUGIN_PATH=$BUILD/libNvInfer_edgellm_plugin.so
export LD_PRELOAD=$EDGELLM_PLUGIN_PATH

$BUILD/examples/llm/llm_build \
  --onnxDir $ONNX/llm \
  --engineDir $ENGINE/llm

$BUILD/examples/multimodal/visual_build \
  --onnxDir $ONNX/visual \
  --engineDir $ENGINE/visual

$BUILD/examples/multimodal/audio_build \
  --onnxDir $ONNX/audio \
  --engineDir $ENGINE/audio

# Some builder versions emit nested modality directories. Flatten them if needed.
[ -d "$ENGINE/visual/visual" ] && mv $ENGINE/visual/visual/* $ENGINE/visual/ && rmdir $ENGINE/visual/visual
[ -d "$ENGINE/audio/audio" ] && mv $ENGINE/audio/audio/* $ENGINE/audio/ && rmdir $ENGINE/audio/audio
```

### Run Inference

Use the same inference command for text, vision, and audio by changing the input and output JSON files:

```bash
$BUILD/examples/llm/llm_inference \
  --engineDir $ENGINE/llm \
  --multimodalEngineDir $ENGINE \
  --inputFile <input.json> \
  --outputFile <output.json> \
  --dumpOutput
```

Text input:

```json
{
  "requests": [
    {
      "messages": [
        {"role": "user", "content": "What is 2+2?"}
      ],
      "max_generate_length": 50,
      "temperature": 0.0
    }
  ]
}
```

Vision input:

```json
{
  "requests": [
    {
      "messages": [
        {
          "role": "user",
          "content": [
            {"type": "image", "image": "/path/to/image.jpg"},
            {"type": "text", "text": "What do you see in this image?"}
          ]
        }
      ],
      "max_generate_length": 100,
      "temperature": 0.0
    }
  ]
}
```

Audio input uses a pre-computed mel-spectrogram `.safetensors` file shaped `[1, time_steps, 128]` with `float16` values:

```json
{
  "requests": [
    {
      "messages": [
        {
          "role": "user",
          "content": [
            {"type": "audio", "audio": "/path/to/audio_mel.safetensors"},
            {"type": "text", "text": "What did you hear in this audio?"}
          ]
        }
      ],
      "max_generate_length": 100,
      "temperature": 0.0
    }
  ]
}
```

</details>

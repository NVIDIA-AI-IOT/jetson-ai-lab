---
title: "Qwen3.5 35B-A3B (MoE)"
model_id: "qwen3-5-35b-a3b"
short_description: "Alibaba's multimodal Mixture-of-Experts model with 35B total / 3B active parameters, native tool calling, and MTP speculative decoding"
family: "Alibaba Qwen3.5"
icon: "🔮"
is_new: false
order: 1
type: "Multimodal"
vision_capable: true
memory_requirements: "20GB RAM"
precision: "NVFP4 / W4A16"
parameters: "35B total / 3B activated"
modalities: ["Text", "Image"]
context_length: "256K"
license: "Apache 2.0"
model_size: "18GB"
hf_checkpoint: "Qwen/Qwen3.5-35B-A3B"
huggingface_url: "https://huggingface.co/Qwen/Qwen3.5-35B-A3B"
minimum_jetson: "Orin AGX"
# Optional: gray tabs via matrix_modules_disabled. Per-engine allowlists: supported_inference_engines[].modules_supported (from minimum_jetson).
supported_inference_engines:
  - engine: "vLLM"
    type: "Container"
    modules_supported:
      - thor_t5000
      - thor_t4000
      - orin_agx_64
    serve_command_orin: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        -v ~/.cache/huggingface:/root/.cache/huggingface \
        -v ~/.cache/vllm:/root/.cache/vllm \
        ghcr.io/nvidia-ai-iot/vllm:latest-jetson-orin \
        vllm serve Kbenkhaled/Qwen3.5-35B-A3B-quantized.w4a16 \
          --gpu-memory-utilization 0.8 \
          --enable-prefix-caching \
          --reasoning-parser qwen3 \
          --enable-auto-tool-choice \
          --tool-call-parser qwen3_coder
    serve_command_thor: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        -v ~/.cache/huggingface:/root/.cache/huggingface \
        -v ~/.cache/vllm:/root/.cache/vllm \
        vllm/vllm-openai:latest \
        AxionML/Qwen3.5-35B-A3B-NVFP4 \
          --gpu-memory-utilization 0.8 \
          --enable-prefix-caching \
          --reasoning-parser qwen3 \
          --enable-auto-tool-choice \
          --tool-call-parser qwen3_coder
  - engine: "TensorRT Edge-LLM"
    type: "Container"
    modules_supported:
      - thor_t5000
      - orin_agx_64
    install_command: |-
      mkdir -p "$HOME/tensorrt-edgellm-workspace" "$HOME/.cache/huggingface"
      curl -fsSL https://www.jetson-ai-lab.com/code-samples/tensorrt_edge_llm/run_model.sh -o "$HOME/run-edgellm-model"
      chmod +x "$HOME/run-edgellm-model"
    serve_command_orin: |-
      sudo docker run -it --rm --pull always --runtime=nvidia --network host \
        -v "$HOME/run-edgellm-model:/usr/local/bin/run-edgellm-model:ro" \
        -v "tensorrt-edgellm-0100-build:/opt/TensorRT-Edge-LLM/build" \
        -v "$HOME/tensorrt-edgellm-workspace:/data/edgellm" \
        -v "$HOME/.cache/huggingface:/data/models/huggingface" \
        ghcr.io/nvidia-ai-iot/tensorrt_edge_llm:0.10.0-orin \
        run-edgellm-model Qwen/Qwen3.5-35B-A3B-GPTQ-Int4 --builder onnx --stage serve
    serve_command_thor: |-
      sudo docker run -it --rm --pull always --runtime=nvidia --network host \
        -v "$HOME/run-edgellm-model:/usr/local/bin/run-edgellm-model:ro" \
        -v "tensorrt-edgellm-0100-build:/opt/TensorRT-Edge-LLM/build" \
        -v "$HOME/tensorrt-edgellm-workspace:/data/edgellm" \
        -v "$HOME/.cache/huggingface:/data/models/huggingface" \
        ghcr.io/nvidia-ai-iot/tensorrt_edge_llm:0.10.0-thor \
        run-edgellm-model AxionML/Qwen3.5-35B-A3B-NVFP4 --builder onnx --stage serve
benchmark:
  orin:
    concurrency1: 30
    concurrency8: 80
    ttftMs: 0
  thor:
    concurrency1: 35
    concurrency8: 125
    ttftMs: 0
benchmark_key: "Qwen3.5-35B-A3B"
benchmark_series:
  - "Qwen3.5-27B"
---

Qwen3.5 35B-A3B is a multimodal Mixture-of-Experts model from Alibaba Cloud's Qwen3.5 family. It combines image understanding with 35 billion total parameters and only 3 billion active during inference.

## Inputs and Outputs

**Input:** Text and images

**Output:** Text

## Intended Use Cases

- **Reasoning**: Advanced logical and analytical reasoning with chain-of-thought
- **Visual understanding**: Image description, question answering, and document analysis
- **Function Calling**: Native support for tool use and function calling
- **Multilingual Instruction Following**: Following instructions across 100+ languages
- **Code Generation**: Programming assistance in multiple languages
- **Translation**: High-quality translation between supported languages

## Running with vLLM

<div class="device-tabs">
<div class="device-tab-bar">
<button class="device-tab active" data-target="orin">Jetson Orin</button>
<button class="device-tab" data-target="thor">Jetson Thor</button>
</div>
<div class="device-panel" data-panel="orin">

```bash
sudo docker run -it --rm --pull always --runtime=nvidia --network host \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  -v ~/.cache/vllm:/root/.cache/vllm \
  ghcr.io/nvidia-ai-iot/vllm:latest-jetson-orin \
  vllm serve Kbenkhaled/Qwen3.5-35B-A3B-quantized.w4a16 \
    --gpu-memory-utilization 0.8 --enable-prefix-caching \
    --reasoning-parser qwen3 \
    --enable-auto-tool-choice --tool-call-parser qwen3_coder
```

</div>
<div class="device-panel" data-panel="thor" style="display:none">

```bash
sudo docker run -it --rm --pull always --runtime=nvidia --network host \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  -v ~/.cache/vllm:/root/.cache/vllm \
  vllm/vllm-openai:latest \
  AxionML/Qwen3.5-35B-A3B-NVFP4 \
    --gpu-memory-utilization 0.8 --enable-prefix-caching \
    --reasoning-parser qwen3 \
    --enable-auto-tool-choice --tool-call-parser qwen3_coder
```

</div>
</div>

## Speculative Decoding with MTP

This model supports **Multi-Token Prediction (MTP)** speculative decoding, which can significantly improve generation throughput. To enable it, add the following flag to your `vllm serve` command:

```bash
--speculative-config '{"method": "mtp", "num_speculative_tokens": 4}'
```

## Qwen3.5 Family

| Model | Parameters | Active Params | Type | Best For |
|---|---|---|---|---|
| **Qwen3.5 35B-A3B** | 35B | 3B | MoE | Efficient high-performance inference |
| [Qwen3.5 27B](/models/qwen3-5-27b) | 27B | 27B | Dense | Maximum accuracy on demanding tasks |

## Additional Resources

- [Hugging Face Model](https://huggingface.co/Qwen/Qwen3.5-35B-A3B) - Original model weights
- [NVFP4 Checkpoint (Thor)](https://huggingface.co/AxionML/Qwen3.5-35B-A3B-NVFP4) - Quantized for Jetson Thor
- [GPTQ INT4 Checkpoint (Orin)](https://huggingface.co/Qwen/Qwen3.5-35B-A3B-GPTQ-Int4) - Quantized for Jetson AGX Orin
- [W4A16 Checkpoint (Orin)](https://huggingface.co/Kbenkhaled/Qwen3.5-35B-A3B-quantized.w4a16) - Quantized for Jetson Orin

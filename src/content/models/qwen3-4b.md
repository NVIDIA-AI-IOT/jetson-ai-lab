---
title: "Qwen3 4B"
model_id: "qwen3-4b"
short_description: "Alibaba's efficient 4 billion parameter instruction-tuned language model"
family: "Alibaba Qwen3"
icon: "🔮"
is_new: false
order: 1
type: "Text"
vision_capable: false
memory_requirements: "4GB RAM"
precision: "NVFP4 / W4A16 / AWQ"
parameters: "4B"
modalities: ["Text"]
context_length: "128K"
license: "Apache 2.0"
model_size: "2.5GB"
hf_checkpoint: "RedHatAI/Qwen3-4B-quantized.w4a16"
huggingface_url: "https://huggingface.co/Qwen/Qwen3-4B"
minimum_jetson: "Orin Nano"
# Optional: gray tabs via matrix_modules_disabled. Per-engine allowlists: supported_inference_engines[].modules_supported (from minimum_jetson).
benchmark:
  orin:
    concurrency1: 42.15
    concurrency8: 193.83
    ttftMs: 0
  thor:
    concurrency1: 56.46
    concurrency8: 273.37
    ttftMs: 0
supported_inference_engines:
  - engine: "vLLM"
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
        ghcr.io/nvidia-ai-iot/vllm:latest-jetson-orin \
        vllm serve RedHatAI/Qwen3-4B-quantized.w4a16
    serve_command_thor: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        vllm/vllm-openai:latest \
        RedHatAI/Qwen3-4B-quantized.w4a16
  - engine: "TensorRT Edge-LLM"
    type: "Container"
    modules_supported:
      - thor_t5000
      - orin_agx_64
      - orin_nx_16
      - orin_nano_8
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
        run-edgellm-model Qwen/Qwen3-4B-AWQ --builder onnx --stage serve
    serve_command_thor: |-
      sudo docker run -it --rm --pull always --runtime=nvidia --network host \
        -v "$HOME/run-edgellm-model:/usr/local/bin/run-edgellm-model:ro" \
        -v "tensorrt-edgellm-0100-build:/opt/TensorRT-Edge-LLM/build" \
        -v "$HOME/tensorrt-edgellm-workspace:/data/edgellm" \
        -v "$HOME/.cache/huggingface:/data/models/huggingface" \
        ghcr.io/nvidia-ai-iot/tensorrt_edge_llm:0.10.0-thor \
        run-edgellm-model baseten/Qwen3-4B-NVFP4-PTQ --builder onnx --stage serve
benchmark_key: "Qwen 3 4B"
benchmark_series:
  - "Qwen 3 8B"
---

Qwen3 is Alibaba Cloud's latest generation of large language models, offering state-of-the-art performance across a wide range of tasks. The Qwen3 4B model provides an excellent balance of capability and efficiency for edge deployment.

## Inputs and Outputs

**Input:** Text

**Output:** Text

## Intended Use Cases

- **Reasoning**: Advanced logical and analytical reasoning tasks
- **Function Calling**: Native support for tool use and function calling
- **Subject Matter Experts**: Fine-tuning for domain-specific expertise
- **Multilingual Instruction Following**: Following instructions across 100+ languages
- **Translation**: High-quality translation between supported languages

---
title: "Llama 3.1 8B"
model_id: "llama3-1-8b"
short_description: "Meta's efficient 8 billion parameter instruction-tuned language model optimized for Jetson"
family: "Meta Llama 3"
icon: "🦙"
is_new: false
order: 2
type: "Text"
vision_capable: false
memory_requirements: "8GB RAM"
precision: "NVFP4 / W4A16"
parameters: "8B"
modalities: ["Text"]
context_length: "128K"
license: "Llama 3.1 Community License"
model_size: "4.5GB"
hf_checkpoint: "RedHatAI/Meta-Llama-3.1-8B-Instruct-quantized.w4a16"
huggingface_url: "https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct"
build_nvidia_url: "https://build.nvidia.com/meta/llama-3_1-8b-instruct"
minimum_jetson: "Orin NX"
# Optional: gray tabs via matrix_modules_disabled. Per-engine allowlists: supported_inference_engines[].modules_supported (from minimum_jetson).
benchmark:
  orin:
    concurrency1: 28.14
    concurrency8: 112.33
    ttftMs: 0
  thor:
    concurrency1: 44
    concurrency8: 251
    ttftMs: 0
supported_inference_engines:
  - engine: "Ollama"
    type: "Container"
    modules_supported:
      - thor_t5000
      - thor_t4000
      - orin_agx_64
      - orin_nx_16
    install_command: |-
      curl -fsSL https://ollama.ai/install.sh | sh
    serve_command_orin: ollama pull llama3.1:8b && ollama serve
    serve_command_thor: ollama pull llama3.1:8b && ollama serve
  - engine: "vLLM"
    type: "Container"
    modules_supported:
      - thor_t5000
      - thor_t4000
      - orin_agx_64
      - orin_nx_16
    serve_command_orin: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        ghcr.io/nvidia-ai-iot/vllm:latest-jetson-orin \
        vllm serve RedHatAI/Meta-Llama-3.1-8B-Instruct-quantized.w4a16
    serve_command_thor: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        vllm/vllm-openai:latest \
        RedHatAI/Meta-Llama-3.1-8B-Instruct-quantized.w4a16
  - engine: "TensorRT Edge-LLM"
    type: "Container"
    modules_supported:
      - thor_t5000
      - orin_agx_64
      - orin_nx_16
    install_command: |-
      mkdir -p "$HOME/tensorrt-edgellm-workspace" "$HOME/.cache/huggingface"
      curl -fsSL https://www.jetson-ai-lab.com/code-samples/tensorrt_edge_llm/run_model.sh -o "$HOME/run-edgellm-model"
      chmod +x "$HOME/run-edgellm-model"
    serve_command_orin: |-
      sudo docker run -it --rm --pull always --runtime=nvidia --network host \
        -e HF_TOKEN="$HF_TOKEN" \
        -v "$HOME/run-edgellm-model:/usr/local/bin/run-edgellm-model:ro" \
        -v "tensorrt-edgellm-0100-build:/opt/TensorRT-Edge-LLM/build" \
        -v "$HOME/tensorrt-edgellm-workspace:/data/edgellm" \
        -v "$HOME/.cache/huggingface:/data/models/huggingface" \
        ghcr.io/nvidia-ai-iot/tensorrt_edge_llm:0.10.0-orin \
        run-edgellm-model RedHatAI/Meta-Llama-3.1-8B-Instruct-quantized.w4a16 --builder onnx --stage serve
    serve_command_thor: |-
      sudo docker run -it --rm --pull always --runtime=nvidia --network host \
        -e HF_TOKEN="$HF_TOKEN" \
        -v "$HOME/run-edgellm-model:/usr/local/bin/run-edgellm-model:ro" \
        -v "tensorrt-edgellm-0100-build:/opt/TensorRT-Edge-LLM/build" \
        -v "$HOME/tensorrt-edgellm-workspace:/data/edgellm" \
        -v "$HOME/.cache/huggingface:/data/models/huggingface" \
        ghcr.io/nvidia-ai-iot/tensorrt_edge_llm:0.10.0-thor \
        run-edgellm-model nvidia/Llama-3.1-8B-Instruct-NVFP4 --builder onnx --stage serve
one_shot_inference:
  modules_supported:
    - thor_t5000
    - thor_t4000
    - orin_agx_64
    - orin_nx_16
    - orin_nano_8
  run_command_orin: ollama run llama3.1:8b
  run_command_thor: ollama run llama3.1:8b
---

Meta's Llama 3.1 8B Instruct is a powerful instruction-tuned language model with 8 billion parameters. Published W4A16 and NVFP4 checkpoints provide memory-efficient deployment on Jetson.

The model excels at following instructions, answering questions, and generating coherent text across a wide range of tasks.

## Inputs and Outputs

**Input:** Text

**Output:** Text

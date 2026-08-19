---
title: "Qwen3.8 27B"
model_id: "qwen3-8-27b"
short_description: "Qwen's dense 27B vision-language model for coding, research, and long-horizon agents with controllable thinking and native speculative decoding through MTP"
family: "Alibaba Qwen3.8"
icon: "🔮"
is_new: true
order: -3
type: "Multimodal"
vision_capable: true
memory_requirements: "24GB RAM"
precision: "Q4_K_M GGUF"
parameters: "27B"
modalities: ["Text", "Image", "Video"]
context_length: "262K"
license: "Apache 2.0"
model_size: "18GB"
hf_checkpoint: "Qwen/Qwen3.8-27B"
huggingface_url: "https://huggingface.co/Qwen/Qwen3.8-27B"
minimum_jetson: "AGX Orin"
serving:
  entries:
    - engine: "llama.cpp"
      type: "Container"
      modules_supported:
        - thor_t5000
        - thor_t4000
        - orin_agx_64
      serve_command_thor: |-
        docker run --rm -d \
          --pull=always \
          --name qwen38-27b \
          --runtime nvidia \
          --network host \
          -v ~/.cache/huggingface:/data/models/huggingface \
          ghcr.io/nvidia-ai-iot/llama_cpp:latest-jetson-thor \
          llama-server \
            -hf unsloth/Qwen3.8-27B-GGUF:Q4_K_M \
            -ngl all \
            --spec-type draft-mtp \
            --temp 1.0 \
            --top-k 20 \
            --min-p 0.0 \
            --host 0.0.0.0 \
            --port 8080
      serve_command_orin: |-
        docker run --rm -d \
          --pull=always \
          --name qwen38-27b \
          --runtime nvidia \
          --network host \
          -v ~/.cache/huggingface:/data/models/huggingface \
          ghcr.io/nvidia-ai-iot/llama_cpp:latest-jetson-orin \
          llama-server \
            -hf unsloth/Qwen3.8-27B-GGUF:Q4_K_M \
            -ngl all \
            --spec-type draft-mtp \
            --temp 1.0 \
            --top-k 20 \
            --min-p 0.0 \
            --host 0.0.0.0 \
            --port 8080
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
          -v "$HOME/run-edgellm-model:/usr/local/bin/run-edgellm-model:ro" \
          -v "tensorrt-edgellm-0100-build:/opt/TensorRT-Edge-LLM/build" \
          -v "$HOME/tensorrt-edgellm-workspace:/data/edgellm" \
          -v "$HOME/.cache/huggingface:/data/models/huggingface" \
          ghcr.io/nvidia-ai-iot/tensorrt_edge_llm:0.10.0-thor \
          run-edgellm-model Inferact/Qwen3.8-27B-NVFP4 \
            --builder onnx --stage serve
---

Qwen3.8 27B is Qwen's dense, open-weight vision-language model for coding, professional work, research, and long-horizon agentic tasks. It brings the strongest generation of Qwen open models to a deployment-friendly size, with better planning and stronger handling of tool and environment feedback for more reliable multi-step task completion.

Thinking is enabled by default and can be disabled per request. Reasoning depth is adjustable with `xhigh`, `medium`, and `low` effort levels, while preserved thinking carries reasoning context across turns. The model also supports a native 262K context window and is trained with multi-step MTP, which the Jetson commands enable for faster generation.

## Modalities

Input: Text, image, and video

Output: Text

## TensorRT Edge-LLM

The TensorRT Edge-LLM command uses a public ModelOpt NVFP4 checkpoint and
serves text, image, and video requests. Native MTP is available as an explicit
text-only server mode by adding `--mtp` to the `run-edgellm-model` command.

The official fine-grained FP8 checkpoint is not a compatible 0.10.0 input;
use the ModelOpt NVFP4 checkpoint shown above instead.

## Additional Resources

- [Original checkpoint](https://huggingface.co/Qwen/Qwen3.8-27B)
- [ModelOpt NVFP4 checkpoint](https://huggingface.co/Inferact/Qwen3.8-27B-NVFP4)
- [Official FP8 checkpoint](https://huggingface.co/Qwen/Qwen3.8-27B-FP8)

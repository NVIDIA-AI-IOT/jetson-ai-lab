---
title: "Qwen3.8 27B"
model_id: "qwen3-8-27b"
short_description: "Qwen's dense 27B vision-language model for coding, research, and long-horizon agents with controllable thinking and native speculative decoding through MTP"
family: "Alibaba Qwen3.8"
icon: "🔮"
is_new: true
order: 1
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
---

Qwen3.8 27B is Qwen's dense, open-weight vision-language model for coding, professional work, research, and long-horizon agentic tasks. It brings the strongest generation of Qwen open models to a deployment-friendly size, with better planning and stronger handling of tool and environment feedback for more reliable multi-step task completion.

Thinking is enabled by default and can be disabled per request. Reasoning depth is adjustable with `xhigh`, `medium`, and `low` effort levels, while preserved thinking carries reasoning context across turns. The model also supports a native 262K context window and is trained with multi-step MTP, which the Jetson commands enable for faster generation.

## Modalities

Input: Text, image, and video

Output: Text

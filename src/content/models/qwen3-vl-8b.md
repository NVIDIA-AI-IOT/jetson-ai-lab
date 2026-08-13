---
title: "Qwen3 VL 8B"
model_id: "qwen3-vl-8b"
short_description: "Alibaba's 8 billion parameter vision-language model for advanced multimodal understanding"
family: "Alibaba Qwen3"
icon: "🔮"
is_new: false
order: 7
type: "Multimodal"
vision_capable: true
memory_requirements: "8GB RAM"
precision: "NVFP4 / W4A16 / AWQ"
parameters: "8B"
modalities: ["Text", "Image"]
context_length: "256K"
license: "Apache 2.0"
model_size: "5GB"
hf_checkpoint: "cpatonn/Qwen3-VL-8B-Instruct-AWQ-4bit"
minimum_jetson: "Orin NX"
# Optional: gray tabs via matrix_modules_disabled. Per-engine allowlists: supported_inference_engines[].modules_supported (from minimum_jetson).
supported_inference_engines:
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
        vllm serve cpatonn/Qwen3-VL-8B-Instruct-AWQ-4bit
    serve_command_thor: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        vllm/vllm-openai:latest \
        cpatonn/Qwen3-VL-8B-Instruct-AWQ-4bit
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
        -v "$HOME/run-edgellm-model:/usr/local/bin/run-edgellm-model:ro" \
        -v "tensorrt-edgellm-0100-build:/opt/TensorRT-Edge-LLM/build" \
        -v "$HOME/tensorrt-edgellm-workspace:/data/edgellm" \
        -v "$HOME/.cache/huggingface:/data/models/huggingface" \
        ghcr.io/nvidia-ai-iot/tensorrt_edge_llm:0.10.0-orin \
        run-edgellm-model Vishva007/Qwen3-VL-8B-Instruct-W4A16-AutoRound-GPTQ --builder onnx --stage serve
    serve_command_thor: |-
      sudo docker run -it --rm --pull always --runtime=nvidia --network host \
        -v "$HOME/run-edgellm-model:/usr/local/bin/run-edgellm-model:ro" \
        -v "tensorrt-edgellm-0100-build:/opt/TensorRT-Edge-LLM/build" \
        -v "$HOME/tensorrt-edgellm-workspace:/data/edgellm" \
        -v "$HOME/.cache/huggingface:/data/models/huggingface" \
        ghcr.io/nvidia-ai-iot/tensorrt_edge_llm:0.10.0-thor \
        run-edgellm-model cybermotaz/qwen3-vl-8b-thinking-nvfp4-w4a16 --builder onnx --stage serve
benchmark_key: "Qwen3-VL-8B"
benchmark_series:
  - "Qwen3-VL-4B"
---

Meet Qwen3-VL — the most powerful vision-language model in the Qwen series to date.

This generation delivers comprehensive upgrades across the board: superior text understanding & generation, deeper visual perception & reasoning, extended context length, enhanced spatial and video dynamics comprehension, and stronger agent interaction capabilities.

Available in Dense and MoE architectures that scale from edge to cloud, with Instruct and reasoning-enhanced Thinking editions for flexible, on-demand deployment.

## Inputs and Outputs

**Input:** Text and images

**Output:** Text

## Key Enhancements

- **Visual Agent**: Operates PC/mobile GUIs—recognizes elements, understands functions, invokes tools, completes tasks.
- **Visual Coding Boost**: Generates Draw.io/HTML/CSS/JS from images/videos.
- **Advanced Spatial Perception**: Judges object positions, viewpoints, and occlusions; provides stronger 2D grounding and enables 3D grounding for spatial reasoning and embodied AI.
- **Long Context & Video Understanding**: Native 256K context, expandable to 1M; handles books and hours-long video with full recall and second-level indexing.
- **Enhanced Multimodal Reasoning**: Excels in STEM/Math—causal analysis and logical, evidence-based answers.
- **Upgraded Visual Recognition**: Broader, higher-quality pretraining is able to "recognize everything"—celebrities, anime, products, landmarks, flora/fauna, etc.
- **Expanded OCR**: Supports 32 languages (up from 19); robust in low light, blur, and tilt; better with rare/ancient characters and jargon; improved long-document structure parsing.
- **Text Understanding on par with pure LLMs**: Seamless text–vision fusion for lossless, unified comprehension.

*Referenced from the [Qwen3-VL model card](https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct).*

## Additional Resources

- [W4A16 Checkpoint](https://huggingface.co/Vishva007/Qwen3-VL-8B-Instruct-W4A16-AutoRound-GPTQ)
- [NVFP4 Thinking Checkpoint](https://huggingface.co/cybermotaz/qwen3-vl-8b-thinking-nvfp4-w4a16)

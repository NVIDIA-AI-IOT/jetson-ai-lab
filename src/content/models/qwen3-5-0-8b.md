---
title: "Qwen3.5 0.8B"
model_id: "qwen3-5-0-8b"
short_description: "Alibaba's compact Qwen3.5 vision-language model for lightweight multimodal deployment"
family: "Alibaba Qwen3.5"
icon: "🔮"
is_new: false
order: 6
type: "Multimodal"
vision_capable: true
memory_requirements: "2GB RAM"
precision: "BF16"
parameters: "0.8B"
modalities: ["Text", "Image"]
context_length: "256K"
license: "Apache 2.0"
model_size: "1.7GB"
hf_checkpoint: "Qwen/Qwen3.5-0.8B"
huggingface_url: "https://huggingface.co/Qwen/Qwen3.5-0.8B"
minimum_jetson: "Orin Nano"
# Optional: gray tabs via matrix_modules_disabled. Per-engine allowlists: supported_inference_engines[].modules_supported (from minimum_jetson).
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
        -v ~/.cache/huggingface:/root/.cache/huggingface \
        -v ~/.cache/vllm:/root/.cache/vllm \
        ghcr.io/nvidia-ai-iot/vllm:latest-jetson-orin \
        vllm serve Qwen/Qwen3.5-0.8B \
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
        Qwen/Qwen3.5-0.8B \
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
        run-edgellm-model Vishva007/Qwen3.5-0.8B-W4A16-AutoRound-GPTQ --builder onnx --stage serve
    serve_command_thor: |-
      sudo docker run -it --rm --pull always --runtime=nvidia --network host \
        -v "$HOME/run-edgellm-model:/usr/local/bin/run-edgellm-model:ro" \
        -v "tensorrt-edgellm-0100-build:/opt/TensorRT-Edge-LLM/build" \
        -v "$HOME/tensorrt-edgellm-workspace:/data/edgellm" \
        -v "$HOME/.cache/huggingface:/data/models/huggingface" \
        ghcr.io/nvidia-ai-iot/tensorrt_edge_llm:0.10.0-thor \
        run-edgellm-model AxionML/Qwen3.5-0.8B-NVFP4 --builder onnx --stage serve
---

Qwen3.5 0.8B is the smallest vision-language model in the Qwen3.5 lineup. It is designed for lightweight local multimodal inference, fast iteration, and efficient Jetson deployment.

## Inputs and Outputs

**Input:** Text and images

**Output:** Text

## Intended Use Cases

- **Visual question answering**: Ask questions about images and receive text responses
- **Image understanding**: Captioning, scene description, and visual analysis
- **Tool calling**: OpenAI-compatible tool use via vLLM
- **Rapid prototyping**: Quick local multimodal experiments

## Additional Resources

- [Hugging Face Model](https://huggingface.co/Qwen/Qwen3.5-0.8B) - Original checkpoint

---
title: "Qwen3.5 9B"
model_id: "qwen3-5-9b"
short_description: "Alibaba's dense Qwen3.5 9B vision-language model with Jetson-specific checkpoints for Orin and Thor"
family: "Alibaba Qwen3.5"
icon: "🔮"
is_new: false
order: 3
type: "Multimodal"
vision_capable: true
memory_requirements: "8GB RAM"
precision: "NVFP4 / W4A16"
parameters: "9B"
modalities: ["Text", "Image"]
context_length: "256K"
license: "Apache 2.0"
model_size: "5GB"
hf_checkpoint: "Qwen/Qwen3.5-9B"
huggingface_url: "https://huggingface.co/Qwen/Qwen3.5-9B"
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
    serve_command_orin: >-
      sudo docker run -it --rm --pull always --runtime=nvidia --network host -v ~/.cache/huggingface:/root/.cache/huggingface -v ~/.cache/vllm:/root/.cache/vllm vllm/vllm-openai:latest RedHatAI/Qwen3.5-9B-quantized.w4a16 --max-model-len 8192 --gpu-memory-utilization 0.7 --reasoning-parser qwen3 --enable-auto-tool-choice --tool-call-parser qwen3_coder --speculative-config '{"method":"qwen3_next_mtp","num_speculative_tokens":3}'
    serve_command_thor: >-
      sudo docker run -it --rm --pull always --runtime=nvidia --network host -v ~/.cache/huggingface:/root/.cache/huggingface -v ~/.cache/vllm:/root/.cache/vllm vllm/vllm-openai:latest AxionML/Qwen3.5-9B-NVFP4 --max-model-len 8192 --gpu-memory-utilization 0.7 --reasoning-parser qwen3 --enable-auto-tool-choice --tool-call-parser qwen3_coder --speculative-config '{"method":"mtp","num_speculative_tokens":3}'
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
        run-edgellm-model Vishva007/Qwen3.5-9B-W4A16-AutoRound-GPTQ --builder onnx --stage serve
    serve_command_thor: |-
      sudo docker run -it --rm --pull always --runtime=nvidia --network host \
        -v "$HOME/run-edgellm-model:/usr/local/bin/run-edgellm-model:ro" \
        -v "tensorrt-edgellm-0100-build:/opt/TensorRT-Edge-LLM/build" \
        -v "$HOME/tensorrt-edgellm-workspace:/data/edgellm" \
        -v "$HOME/.cache/huggingface:/data/models/huggingface" \
        ghcr.io/nvidia-ai-iot/tensorrt_edge_llm:0.10.0-thor \
        run-edgellm-model AxionML/Qwen3.5-9B-NVFP4 --builder onnx --stage serve
benchmark_key: "Qwen3.5-9B"
---

Qwen3.5 9B is a dense vision-language model in the Qwen3.5 family aimed at stronger reasoning, visual understanding, and agentic behavior on Jetson. This entry uses a W4A16 checkpoint on Jetson Orin and an NVFP4 checkpoint on Jetson Thor.

## Inputs and Outputs

**Input:** Text and images

**Output:** Text

## Intended Use Cases

- **Visual reasoning**: Stronger multimodal reasoning over image and text inputs
- **Image understanding**: Detailed captioning, scene description, and analysis
- **Tool calling**: Native Qwen tool-call parsing in vLLM
- **Agents**: Local assistants and workflow automation

## Additional Resources

- [Original Model](https://huggingface.co/Qwen/Qwen3.5-9B) - Base Qwen3.5 9B checkpoint
- [W4A16 Checkpoint](https://huggingface.co/RedHatAI/Qwen3.5-9B-quantized.w4a16) - Jetson Orin checkpoint
- [NVFP4 Checkpoint](https://huggingface.co/AxionML/Qwen3.5-9B-NVFP4) - Jetson Thor checkpoint

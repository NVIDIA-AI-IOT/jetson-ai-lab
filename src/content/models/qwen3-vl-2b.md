---
title: "Qwen3 VL 2B"
model_id: "qwen3-vl-2b"
short_description: "Alibaba's compact 2B vision-language model for image understanding on Jetson"
family: "Alibaba Qwen3"
icon: "🔮"
is_new: false
order: 5
type: "Multimodal"
vision_capable: true
memory_requirements: "3GB RAM"
precision: "NVFP4 / W4A16"
parameters: "2B"
modalities: ["Text", "Image"]
context_length: "256K"
license: "Apache 2.0"
model_size: "1.5GB"
hf_checkpoint: "Qwen/Qwen3-VL-2B-Instruct"
huggingface_url: "https://huggingface.co/Qwen/Qwen3-VL-2B-Instruct"
minimum_jetson: "Orin Nano"
supported_inference_engines:
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
        run-edgellm-model Vishva007/Qwen3-VL-2B-Instruct-W4A16-AutoRound-GPTQ --builder onnx --stage serve
    serve_command_thor: |-
      sudo docker run -it --rm --pull always --runtime=nvidia --network host \
        -v "$HOME/run-edgellm-model:/usr/local/bin/run-edgellm-model:ro" \
        -v "tensorrt-edgellm-0100-build:/opt/TensorRT-Edge-LLM/build" \
        -v "$HOME/tensorrt-edgellm-workspace:/data/edgellm" \
        -v "$HOME/.cache/huggingface:/data/models/huggingface" \
        ghcr.io/nvidia-ai-iot/tensorrt_edge_llm:0.10.0-thor \
        run-edgellm-model cybermotaz/qwen3-vl-2b-thinking-nvfp4-w4a16 --builder onnx --stage serve
---

Qwen3 VL 2B provides compact text and image understanding for memory-constrained Jetson deployments.

## Inputs and Outputs

**Input:** Text and images

**Output:** Text

## Intended Use Cases

- **Visual question answering**: Answer questions about images
- **Image understanding**: Describe scenes and objects
- **Document analysis**: Extract and reason over visible content
- **Local assistants**: Serve multimodal conversations on-device

## Additional Resources

- [Original Model](https://huggingface.co/Qwen/Qwen3-VL-2B-Instruct)
- [W4A16 Checkpoint](https://huggingface.co/Vishva007/Qwen3-VL-2B-Instruct-W4A16-AutoRound-GPTQ)
- [NVFP4 Thinking Checkpoint](https://huggingface.co/cybermotaz/qwen3-vl-2b-thinking-nvfp4-w4a16)

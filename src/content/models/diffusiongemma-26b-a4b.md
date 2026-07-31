---
title: "DiffusionGemma 26B-A4B"
model_id: "diffusiongemma-26b-a4b"
short_description: "A diffusion language model with platform-specific NVFP4 and AWQ-INT4 checkpoints for Jetson Thor and Orin"
family: "Google Gemma4"
icon: "💎"
is_new: false
order: 5
type: "Text"
vision_capable: false
memory_requirements: "24GB RAM"
precision: "NVFP4 / AWQ-INT4"
parameters: "26B total / 4B active"
modalities: ["Text"]
context_length: "8K"
hf_checkpoint: "nvidia/diffusiongemma-26B-A4B-it-NVFP4"
huggingface_url: "https://huggingface.co/nvidia/diffusiongemma-26B-A4B-it-NVFP4"
minimum_jetson: "AGX Orin"
serving:
  entries:
    - engine: "vLLM"
      type: "Container"
      modules_supported:
        - thor_t5000
        - thor_t4000
        - orin_agx_64
      serve_command_orin: >-
        sudo docker run -it --rm --pull always --runtime=nvidia --network host vllm/vllm-openai:latest cyankiwi/diffusiongemma-26B-A4B-it-AWQ-INT4 --max-model-len 8192 --gpu-memory-utilization 0.7 --reasoning-parser gemma4 --enable-auto-tool-choice --tool-call-parser gemma4 --default-chat-template-kwargs '{"enable_thinking":true}'
      serve_command_thor: >-
        sudo docker run -it --rm --pull always --runtime=nvidia --network host -e VLLM_USE_V2_MODEL_RUNNER=1 vllm/vllm-openai:latest nvidia/diffusiongemma-26B-A4B-it-NVFP4 --trust-remote-code --max-model-len 8192 --gpu-memory-utilization 0.7 --attention-backend TRITON_ATTN --reasoning-parser gemma4 --enable-auto-tool-choice --tool-call-parser gemma4 --default-chat-template-kwargs '{"enable_thinking":true}' --override-generation-config '{"max_new_tokens":null}'
---

DiffusionGemma 26B-A4B can be served on Jetson Thor with the official NVIDIA NVFP4 checkpoint and on Jetson Orin with an AWQ-INT4 checkpoint.

## Inputs and Outputs

**Input:** Text

**Output:** Text

## Supported Platforms

- Jetson AGX Orin
- Jetson Thor

## Speculative Decoding

No compatible MTP assistant is configured for this model.

## Additional Resources

- [NVFP4 Checkpoint (Thor)](https://huggingface.co/nvidia/diffusiongemma-26B-A4B-it-NVFP4)
- [AWQ-INT4 Checkpoint (Orin)](https://huggingface.co/cyankiwi/diffusiongemma-26B-A4B-it-AWQ-INT4)

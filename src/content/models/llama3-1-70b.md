---
title: "Llama 3.1 70B"
model_id: "llama3-1-70b"
short_description: "Meta's flagship 70 billion parameter model delivering state-of-the-art performance on Jetson Thor"
family: "Meta Llama 3"
icon: "🦙"
is_new: false
order: 3
type: "Text"
memory_requirements: "48GB RAM"
precision: "W4A16"
model_size: "40GB"
hf_checkpoint: "RedHatAI/Meta-Llama-3.1-70B-Instruct-quantized.w4a16"
huggingface_url: "https://huggingface.co/meta-llama/Llama-3.1-70B-Instruct"
build_nvidia_url: "https://build.nvidia.com/meta/llama-3_1-70b-instruct"
minimum_jetson: "Thor"
benchmark:
  orin:
    concurrency1: 2.93
    concurrency8: 7.38
    ttftMs: 0
  thor:
    concurrency1: 6.27
    concurrency8: 41.5
    ttftMs: 0
supported_inference_engines:
  - engine: "Ollama"
    type: "Container"
    install_command: "curl -fsSL https://ollama.ai/install.sh | sh"
    run_command: "ollama run llama3.1:70b"
  - engine: "vLLM"
    type: "Container"
    run_command_orin: "sudo docker run -it --rm --pull always --runtime=nvidia --network host ghcr.io/nvidia-ai-iot/vllm:latest-jetson-orin vllm serve RedHatAI/Meta-Llama-3.1-70B-Instruct-quantized.w4a16"
    run_command_thor: "sudo docker run -it --rm --pull always --runtime=nvidia --network host ghcr.io/nvidia-ai-iot/vllm:latest-jetson-thor vllm serve RedHatAI/Meta-Llama-3.1-70B-Instruct-quantized.w4a16"
---

Meta's Llama 3.1 70B Instruct is the flagship model in the Llama 3.1 family, featuring 70 billion parameters for state-of-the-art performance. This quantized version (W4A16) enables deployment on Jetson Thor.

Ideal for complex reasoning tasks, detailed content generation, and applications requiring the highest quality outputs.


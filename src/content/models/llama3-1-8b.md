---
title: "Llama 3.1 8B"
model_id: "llama3-1-8b"
short_description: "Meta's efficient 8 billion parameter instruction-tuned language model optimized for Jetson"
family: "Meta Llama 3"
icon: "🦙"
is_new: false
order: 2
type: "Text"
memory_requirements: "8GB RAM"
precision: "W4A16"
model_size: "4.5GB"
hf_checkpoint: "RedHatAI/Meta-Llama-3.1-8B-Instruct-quantized.w4a16"
huggingface_url: "https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct"
build_nvidia_url: "https://build.nvidia.com/meta/llama-3_1-8b-instruct"
minimum_jetson: "Orin NX"
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
    install_command: "curl -fsSL https://ollama.ai/install.sh | sh"
    run_command: "ollama run llama3.1:8b"
  - engine: "vLLM"
    type: "Container"
    run_command_orin: "sudo docker run -it --rm --pull always --runtime=nvidia --network host ghcr.io/nvidia-ai-iot/vllm:latest-jetson-orin vllm serve RedHatAI/Meta-Llama-3.1-8B-Instruct-quantized.w4a16"
    run_command_thor: "sudo docker run -it --rm --pull always --runtime=nvidia --network host ghcr.io/nvidia-ai-iot/vllm:latest-jetson-thor vllm serve RedHatAI/Meta-Llama-3.1-8B-Instruct-quantized.w4a16"
---

Meta's Llama 3.1 8B Instruct is a powerful instruction-tuned language model with 8 billion parameters. This quantized version (W4A16) provides excellent performance while being memory efficient for edge deployment on Jetson devices.

The model excels at following instructions, answering questions, and generating coherent text across a wide range of tasks.


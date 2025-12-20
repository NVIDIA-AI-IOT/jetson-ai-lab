---
title: "Llama 3.2 3B"
model_id: "llama3-2-3b"
short_description: "Meta's compact 3 billion parameter model, ideal for resource-constrained Jetson deployments"
family: "Meta Llama 3"
icon: "🦙"
is_new: false
order: 1
type: "Text"
memory_requirements: "4GB RAM"
precision: "W4A16"
model_size: "2.0GB"
hf_checkpoint: "espressor/meta-llama.Llama-3.2-3B-Instruct_W4A16"
huggingface_url: "https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct"
minimum_jetson: "Orin Nano"
benchmark:
  orin:
    concurrency1: 52.58
    concurrency8: 240.68
    ttftMs: 0
  thor:
    concurrency1: 65.83
    concurrency8: 330.72
    ttftMs: 0
supported_inference_engines:
  - engine: "Ollama"
    type: "Container"
    install_command: "curl -fsSL https://ollama.ai/install.sh | sh"
    run_command: "ollama run llama3.2:3b"
  - engine: "vLLM"
    type: "Container"
    run_command_orin: "sudo docker run -it --rm --pull always --runtime=nvidia --network host ghcr.io/nvidia-ai-iot/vllm:latest-jetson-orin vllm serve espressor/meta-llama.Llama-3.2-3B-Instruct_W4A16"
    run_command_thor: "sudo docker run -it --rm --pull always --runtime=nvidia --network host ghcr.io/nvidia-ai-iot/vllm:latest-jetson-thor vllm serve espressor/meta-llama.Llama-3.2-3B-Instruct_W4A16"
---

Meta's Llama 3.2 3B is a compact yet capable language model optimized for edge deployment. With just 3 billion parameters, it offers an excellent balance between performance and resource efficiency.

Perfect for Jetson Orin Nano and other memory-constrained deployments while still delivering strong instruction-following capabilities.


---
title: "Llama 3.1 70B"
model_id: "llama3-1-70b"
short_description: "Meta's flagship 70 billion parameter model delivering state-of-the-art performance on Jetson Thor"
family: "Meta Llama 3"
icon: "🦙"
is_new: false
order: 3
type: "Text"
vision_capable: false
memory_requirements: "48GB RAM"
precision: "W4A16"
parameters: "70B"
modalities: ["Text"]
context_length: "128K"
license: "Llama 3.1 Community License"
model_size: "40GB"
hf_checkpoint: "RedHatAI/Meta-Llama-3.1-70B-Instruct-quantized.w4a16"
huggingface_url: "https://huggingface.co/meta-llama/Llama-3.1-70B-Instruct"
build_nvidia_url: "https://build.nvidia.com/meta/llama-3_1-70b-instruct"
minimum_jetson: "Thor"
# Optional: gray tabs via matrix_modules_disabled. Per-engine allowlists: supported_inference_engines[].modules_supported (from minimum_jetson).
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
    modules_supported:
      - thor_t5000
      - thor_t4000
    install_command: |-
      curl -fsSL https://ollama.ai/install.sh | sh
    serve_command_orin: ollama pull llama3.1:70b && ollama serve
    serve_command_thor: ollama pull llama3.1:70b && ollama serve
  - engine: "vLLM"
    type: "Container"
    modules_supported:
      - thor_t5000
      - thor_t4000
    serve_command_orin: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        ghcr.io/nvidia-ai-iot/vllm:latest-jetson-orin \
        vllm serve RedHatAI/Meta-Llama-3.1-70B-Instruct-quantized.w4a16
    serve_command_thor: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        vllm/vllm-openai:latest \
        vllm serve RedHatAI/Meta-Llama-3.1-70B-Instruct-quantized.w4a16
one_shot_inference:
  modules_supported:
    - thor_t5000
    - thor_t4000
    - orin_agx_64
    - orin_nx_16
    - orin_nano_8
  run_command_orin: ollama run llama3.1:70b
  run_command_thor: ollama run llama3.1:70b
---

Meta's Llama 3.1 70B Instruct is the flagship model in the Llama 3.1 family, featuring 70 billion parameters for state-of-the-art performance. This quantized version (W4A16) enables deployment on Jetson Thor.

Ideal for complex reasoning tasks, detailed content generation, and applications requiring the highest quality outputs.



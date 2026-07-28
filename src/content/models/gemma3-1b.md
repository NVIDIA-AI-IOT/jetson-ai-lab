---
title: "Gemma 3 1B"
model_id: "gemma3-1b"
short_description: "Google's efficient 1 billion parameter model balancing capability and resource usage"
family: "Google Gemma3"
icon: "💎"
is_new: false
order: 2
type: "Text"
vision_capable: false
memory_requirements: "2GB RAM"
precision: "FP16"
parameters: "1B"
modalities: ["Text"]
context_length: "32K"
license: "Gemma Terms of Service"
model_size: "1.2GB"
hf_checkpoint: "google/gemma-3-1b-it"
minimum_jetson: "Orin Nano"
# Optional: gray tabs via matrix_modules_disabled. Per-engine allowlists: supported_inference_engines[].modules_supported (from minimum_jetson).
supported_inference_engines:
  - engine: "Ollama"
    type: "Container"
    modules_supported:
      - thor_t5000
      - thor_t4000
      - orin_agx_64
      - orin_nx_16
      - orin_nano_8
    install_command: |-
      curl -fsSL https://ollama.ai/install.sh | sh
    serve_command_orin: ollama pull gemma3:1b && ollama serve
    serve_command_thor: ollama pull gemma3:1b && ollama serve
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
        ghcr.io/nvidia-ai-iot/vllm:latest-jetson-orin \
        vllm serve google/gemma-3-1b-it
    serve_command_thor: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        vllm/vllm-openai:latest \
        vllm serve google/gemma-3-1b-it
one_shot_inference:
  modules_supported:
    - thor_t5000
    - thor_t4000
    - orin_agx_64
    - orin_nx_16
    - orin_nano_8
  run_command_orin: ollama run gemma3:1b
  run_command_thor: ollama run gemma3:1b
---

Gemma is a family of lightweight, state-of-the-art open models from Google, built from the same research and technology used to create the Gemini models. **Gemma 3 1B** (`gemma-3-1b-it`) is listed here as a **text** model: it does not provide vision-language / image input support in this catalog. Larger Gemma 3 checkpoints may offer multimodal capabilities separately. Gemma 3 has a large context window, multilingual support in over 140 languages, and is available in more sizes than previous versions. This size is well-suited to text tasks such as question answering, summarization, and reasoning on resource-constrained Jetson devices.

## Inputs and outputs

**Input:**
- Text string, such as a question, a prompt, or a document to be summarized
- Total input context of 32K tokens for the 1B size

**Output:**
- Generated text in response to the input, such as an answer to a question or a summary of a document
- Total output context of 8192 tokens


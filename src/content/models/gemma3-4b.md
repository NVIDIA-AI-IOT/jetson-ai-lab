---
title: "Gemma 3 4B"
model_id: "gemma3-4b"
short_description: "Google's versatile 4 billion parameter model - the default Gemma 3 variant"
family: "Google Gemma3"
icon: "💎"
is_new: false
order: 3
type: "Multimodal"
vision_capable: true
memory_requirements: "4GB RAM"
precision: "W4A16"
parameters: "4B"
modalities: ["Text", "Image"]
context_length: "128K"
license: "Gemma Terms of Service"
model_size: "2.5GB"
hf_checkpoint: "RedHatAI/gemma-3-4b-it-quantized.w4a16"
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
    serve_command_orin: ollama pull gemma3:4b && ollama serve
    serve_command_thor: ollama pull gemma3:4b && ollama serve
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
        vllm serve RedHatAI/gemma-3-4b-it-quantized.w4a16
    serve_command_thor: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        vllm/vllm-openai:latest \
        RedHatAI/gemma-3-4b-it-quantized.w4a16
one_shot_inference:
  modules_supported:
    - thor_t5000
    - thor_t4000
    - orin_agx_64
    - orin_nx_16
    - orin_nano_8
  run_command_orin: ollama run gemma3:4b
  run_command_thor: ollama run gemma3:4b
---

Gemma is a family of lightweight, state-of-the-art open models from Google, built from the same research and technology used to create the Gemini models. Gemma 3 models are multimodal, handling text and image input and generating text output, with open weights for both pre-trained variants and instruction-tuned variants. Gemma 3 has a large, 128K context window, multilingual support in over 140 languages, and is available in more sizes than previous versions. Gemma 3 models are well-suited for a variety of text generation and image understanding tasks, including question answering, summarization, and reasoning. Their relatively small size makes it possible to deploy them in environments with limited resources such as laptops, desktops or your own cloud infrastructure, democratizing access to state of the art AI models and helping foster innovation for everyone.

## Inputs and outputs

**Input:**
- Text string, such as a question, a prompt, or a document to be summarized
- Images, normalized to 896 x 896 resolution and encoded to 256 tokens each
- Total input context of 128K tokens for the 4B size

**Output:**
- Generated text in response to the input, such as an answer to a question, analysis of image content, or a summary of a document
- Total output context of 8192 tokens


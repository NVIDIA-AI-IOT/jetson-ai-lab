---
title: "Gemma 3 27B"
model_id: "gemma3-27b"
short_description: "Google's flagship 27 billion parameter model delivering state-of-the-art Gemma performance"
family: "Google Gemma3"
icon: "💎"
is_new: false
order: 5
type: "Multimodal"
memory_requirements: "24GB RAM"
precision: "W4A16"
model_size: "15GB"
hf_checkpoint: "RedHatAI/gemma-3-27b-it-quantized.w4a16"
huggingface_url: "https://huggingface.co/google/gemma-3-27b-it"
minimum_jetson: "Orin AGX"
supported_inference_engines:
  - engine: "Ollama"
    type: "Container"
    install_command: "curl -fsSL https://ollama.ai/install.sh | sh"
    run_command: "ollama run gemma3:27b"
  - engine: "vLLM"
    type: "Container"
    run_command_orin: "sudo docker run -it --rm --pull always --runtime=nvidia --network host ghcr.io/nvidia-ai-iot/vllm:latest-jetson-orin vllm serve RedHatAI/gemma-3-27b-it-quantized.w4a16"
    run_command_thor: "sudo docker run -it --rm --pull always --runtime=nvidia --network host ghcr.io/nvidia-ai-iot/vllm:latest-jetson-thor vllm serve RedHatAI/gemma-3-27b-it-quantized.w4a16"
---

Gemma is a family of lightweight, state-of-the-art open models from Google, built from the same research and technology used to create the Gemini models. Gemma 3 models are multimodal, handling text and image input and generating text output, with open weights for both pre-trained variants and instruction-tuned variants. Gemma 3 has a large, 128K context window, multilingual support in over 140 languages, and is available in more sizes than previous versions. Gemma 3 models are well-suited for a variety of text generation and image understanding tasks, including question answering, summarization, and reasoning. Their relatively small size makes it possible to deploy them in environments with limited resources such as laptops, desktops or your own cloud infrastructure, democratizing access to state of the art AI models and helping foster innovation for everyone.

## Inputs and outputs

**Input:**
- Text string, such as a question, a prompt, or a document to be summarized
- Images, normalized to 896 x 896 resolution and encoded to 256 tokens each
- Total input context of 128K tokens for the 27B size

**Output:**
- Generated text in response to the input, such as an answer to a question, analysis of image content, or a summary of a document
- Total output context of 8192 tokens

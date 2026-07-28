---
title: "Ministral 3 3B Reasoning"
model_id: "ministral3-3b-reasoning"
short_description: "Mistral AI's compact 3 billion parameter model optimized for reasoning tasks"
family: "Mistral AI Ministral 3"
icon: "🌀"
is_new: false
order: 4
type: "Multimodal"
vision_capable: true
memory_requirements: "4GB RAM"
precision: "FP16"
parameters: "3B"
modalities: ["Text"]
context_length: "262K"
license: "Apache 2.0"
model_size: "2GB"
hf_checkpoint: "mistralai/Ministral-3-3B-Reasoning-2512"
minimum_jetson: "Orin Nano"
# Optional: gray tabs via matrix_modules_disabled. Per-engine allowlists use `serving.entries[].modules_supported`.
serving:
  entries:
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
          vllm serve mistralai/Ministral-3-3B-Reasoning-2512
      serve_command_thor: |-
        sudo docker run -it --rm --pull always \
          --runtime=nvidia --network host \
          vllm/vllm-openai:latest \
          vllm serve mistralai/Ministral-3-3B-Reasoning-2512
---

Mistral AI's Ministral 3 3B Reasoning is specifically optimized for logical reasoning, problem-solving, and analytical tasks.

> **Note:** Ollama does not currently publish a separate tag for the Reasoning variant. The [`ministral-3:3b`](https://ollama.com/library/ministral-3) tag maps to the Instruct checkpoint. Use vLLM with the `mistralai/Ministral-3-3B-Reasoning-2512` HuggingFace checkpoint for the Reasoning model.

The Ministral 3 Reasoning model offers the following capabilities:

- **Vision**: Enables the model to analyze images and provide insights based on visual content, in addition to text.
- **Multilingual**: Supports dozens of languages, including English, French, Spanish, German, Italian, Portuguese, Dutch, Chinese, Japanese, Korean, Arabic.
- **System Prompt**: Maintains strong adherence and support for system prompts.
- **Agentic**: Offers best-in-class agentic capabilities with native function calling and JSON outputting.
- **Edge-Optimized**: Delivers best-in-class performance at a small scale, deployable anywhere.
- **Apache 2.0 License**: Open-source license allowing usage and modification for both commercial and non-commercial purposes.
- **Large Context Window**: Supports a 256k context window.


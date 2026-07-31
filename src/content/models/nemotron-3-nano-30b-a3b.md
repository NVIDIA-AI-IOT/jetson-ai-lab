---
title: "Nemotron3 Nano 30B-A3B"
model_id: "nemotron-3-nano-30b-a3b"
short_description: "NVIDIA's flagship hybrid MoE reasoning model with 30B total / 3.5B active parameters"
family: "NVIDIA Nemotron"
icon: "⚡"
is_new: false
order: 1
type: "Text"
vision_capable: false
memory_requirements: "32GB RAM"
precision: "NVFP4 / AWQ"
parameters: "30B total / 3B activated"
modalities: ["Text"]
context_length: "256K"
license: "NVIDIA Nemotron Open Model License"
model_size: "17GB"
hf_checkpoint: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-NVFP4"
huggingface_url: "https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-NVFP4"
build_nvidia_url: "https://build.nvidia.com/nvidia/nemotron-3-nano-30b-a3b"
minimum_jetson: "AGX Orin"
# Optional: gray tabs for every engine (`matrix_modules_disabled`). Per-engine allowlists use `serving.entries[].modules_supported`.
serving:
  entries:
    - engine: "vLLM"
      type: "Container"
      # Demo: Orin Nano 8GB tab is gray for vLLM only; switch to Ollama to enable it.
      modules_supported:
        - thor_t5000
        - thor_t4000
        - orin_agx_64
        - orin_nx_16
      serve_command_orin: >-
        sudo docker run -it --rm --pull always --runtime=nvidia --network host vllm/vllm-openai:latest stelterlab/NVIDIA-Nemotron-3-Nano-30B-A3B-AWQ --max-model-len 8192 --gpu-memory-utilization 0.7 --reasoning-parser nemotron_v3 --enable-auto-tool-choice --tool-call-parser qwen3_coder
      serve_command_thor: >-
        sudo docker run -it --rm --pull always --runtime=nvidia --network host vllm/vllm-openai:latest nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-NVFP4 --trust-remote-code --max-model-len 8192 --gpu-memory-utilization 0.7 --reasoning-parser nemotron_v3 --enable-auto-tool-choice --tool-call-parser qwen3_coder
    - engine: "Ollama"
      type: "CLI"
      # Same CLI on AGX Orin 64GB-class and Thor (Jetson matrix tabs below).
      modules_supported:
        - thor_t5000
        - thor_t4000
        - orin_agx_64
        - orin_nx_16
        - orin_nano_8
      serve_command_orin: ollama pull nemotron-3-nano && ollama serve
      serve_command_thor: ollama pull nemotron-3-nano && ollama serve
one_shot_inference:
  modules_supported:
    - thor_t5000
    - thor_t4000
    - orin_agx_64
    - orin_nx_16
    - orin_nano_8
  run_command_orin: ollama run nemotron-3-nano
  run_command_thor: ollama run nemotron-3-nano
benchmark_key: "Nemotron 3 30B-A3B"
benchmark_series:
  - "Nemotron Nano 9B V2"
  - "Nemotron3 Nano 4B"
---

**Note:** The Thor command requires a [Hugging Face access token](https://huggingface.co/settings/tokens) with access to the gated NVFP4 checkpoint. The Orin command uses a community AWQ checkpoint that does not require authentication. If you see *"Free memory on device … is less than desired GPU memory utilization"*, lower `--gpu-memory-utilization` in the Advanced options.

## Architecture

The model employs a hybrid Mixture-of-Experts (MoE) architecture:
- 23 Mamba-2 and MoE layers
- 6 Attention layers
- 128 experts + 1 shared expert per MoE layer
- 6 experts activated per token
- **3.5B active parameters** / **30B total parameters**

## Inputs and Outputs

**Input:** Text

**Output:** Text

## Intended Use Cases

- **AI Agent Systems**: Build autonomous agents with strong reasoning capabilities
- **Chatbots**: General purpose conversational AI
- **RAG Systems**: Retrieval-augmented generation applications
- **Reasoning Tasks**: Complex problem-solving with configurable reasoning traces
- **Instruction Following**: General instruction-following tasks

## Supported Languages

English, Spanish, French, German, Japanese, Italian, and coding languages.

## Reasoning Configuration

The model's reasoning capabilities can be configured through a flag in the chat template:
- **With reasoning traces**: Higher-quality solutions for complex queries
- **Without reasoning traces**: Faster responses with slight accuracy trade-off for simpler tasks

### Skipping reasoning (minimize TTFT)

For low-latency or single-token tasks (e.g. picking a number for a pre-scripted response), disable reasoning so the model does not generate a `<think>` block first:

- **Per request**: Pass `extra_body={"chat_template_kwargs": {"enable_thinking": false}}` in your chat completion call, and use `max_tokens=1` (or 2) if you only need one token.
- **Server default**: Add `--default-chat-template-kwargs '{"enable_thinking": false}'` to the `vllm serve` command so all requests skip reasoning by default and TTFT stays minimal.

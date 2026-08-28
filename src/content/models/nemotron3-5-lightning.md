---
title: "Nemotron 3.5 Lightning"
model_id: "nemotron3-5-lightning"
short_description: "NVIDIA's fast open-weight model for responsive local agents, reasoning, coding, and tool use. It delivers performance comparable to the much larger Nemotron 3 Super."
family: "NVIDIA Nemotron"
icon: "⚡"
is_new: true
order: -2
type: "Text"
vision_capable: false
memory_requirements: "64GB RAM"
precision: "NVFP4"
parameters: "30B total / 3B active"
modalities: ["Text"]
context_length: "1M"
license: "OpenMDW 1.1"
hf_checkpoint: "nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-NVFP4"
huggingface_url: "https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-NVFP4"
minimum_jetson: "AGX Orin"
serving:
  entries:
    - engine: "vLLM"
      type: "Container"
      modules_supported:
        - thor_t5000
        - thor_t4000
        - orin_agx_64
      serve_command_thor: |-
        docker run --pull always --rm -it \
          --name nemotron35-vllm \
          --runtime=nvidia \
          --network host \
          -v $HOME/.cache/huggingface:/root/.cache/huggingface \
          -v $HOME/.cache/vllm:/root/.cache/vllm \
          vllm/vllm-openai:v0.27.1 \
          --model nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-NVFP4 \
          --served-model-name nemotron35 \
          --reasoning-parser nemotron_v3 \
          --enable-auto-tool-choice \
          --tool-call-parser qwen3_coder \
          --max-model-len 128000 \
          --kv-cache-dtype fp8 \
          --gpu-memory-utilization 0.7 \
          --trust-remote-code \
          --max-num-batched-tokens 16384 \
          --enable-prefix-caching \
          --speculative_config.method dspark \
          --speculative_config.model nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-NVFP4-DSpark \
          --speculative_config.num_speculative_tokens 5 \
          --mamba-backend flashinfer \
          --mamba-ssm-cache-dtype float16 \
          --enable-mamba-cache-stochastic-rounding \
          --mamba-cache-philox-rounds 5 \
          --mamba-cache-mode align
      serve_command_orin: |-
        docker run --pull always --rm -it \
          --name nemotron35-vllm \
          --runtime=nvidia \
          --network host \
          -v $HOME/.cache/huggingface:/root/.cache/huggingface \
          -v $HOME/.cache/vllm:/root/.cache/vllm \
          vllm/vllm-openai:v0.27.1 \
          --model nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-NVFP4 \
          --served-model-name nemotron35 \
          --reasoning-parser nemotron_v3 \
          --enable-auto-tool-choice \
          --tool-call-parser qwen3_coder \
          --max-model-len 128000 \
          --trust-remote-code \
          --kv-cache-dtype bfloat16 \
          --gpu-memory-utilization 0.7 \
          --max-num-batched-tokens 16384 \
          --enable-prefix-caching \
          --speculative_config.method dspark \
          --speculative_config.model nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-NVFP4-DSpark \
          --speculative_config.num_speculative_tokens 5 \
          --speculative_config.kv_cache_dtype bfloat16 \
          --mamba-backend flashinfer \
          --mamba-ssm-cache-dtype float16 \
          --enable-mamba-cache-stochastic-rounding \
          --mamba-cache-philox-rounds 5 \
          --mamba-cache-mode align
    - engine: "llama.cpp"
      type: "Container"
      modules_supported:
        - thor_t5000
        - thor_t4000
        - orin_agx_64
      serve_command_orin: |-
        docker run --rm -it \
          --pull=always \
          --runtime nvidia \
          --network host \
          -v ~/.cache/huggingface:/data/models/huggingface \
          ghcr.io/nvidia-ai-iot/llama_cpp:latest-jetson-orin \
          llama-server \
            -hf ggml-org/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-GGUF:Q4_K_M \
            -hfd apolo13x/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-DFlash-GGUF \
            --spec-type draft-dflash \
            -ngl all \
            -ngld all \
            -fa on \
            --temp 1.0 \
            --top-p 0.95 \
            --host 0.0.0.0 \
            --port 8080
      serve_command_thor: |-
        docker run --rm -it \
          --pull=always \
          --runtime nvidia \
          --network host \
          -v ~/.cache/huggingface:/data/models/huggingface \
          ghcr.io/nvidia-ai-iot/llama_cpp:latest-jetson-thor \
          llama-server \
            -hf ggml-org/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-GGUF:Q4_K_M \
            -hfd apolo13x/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-DFlash-GGUF \
            --spec-type draft-dflash \
            -ngl all \
            -ngld all \
            -fa on \
            --temp 1.0 \
            --top-p 0.95 \
            --host 0.0.0.0 \
            --port 8080
    - engine: "TensorRT Edge-LLM"
      type: "Container"
      modules_supported:
        - thor_t5000
        - thor_t4000
      install_command: |-
        mkdir -p "$HOME/tensorrt-edgellm-workspace" "$HOME/.cache/huggingface"
        # This production URL is published when this change is merged and deployed.
        curl -fsSL https://www.jetson-ai-lab.com/code-samples/tensorrt_edge_llm/run_nemotron35_lightning.sh -o "$HOME/run-nemotron35-lightning"
        chmod +x "$HOME/run-nemotron35-lightning"
      serve_command_thor: |-
        sudo docker run -it --rm --pull always --ipc=host --runtime=nvidia --network host -v "$HOME/run-nemotron35-lightning:/usr/local/bin/run-nemotron35-lightning:ro" -v "tensorrt-edgellm-0100-build:/opt/TensorRT-Edge-LLM/build" -v "$HOME/tensorrt-edgellm-workspace:/data/edgellm" -v "$HOME/.cache/huggingface:/data/models/huggingface" ghcr.io/nvidia-ai-iot/tensorrt_edge_llm:0.10.0-thor run-nemotron35-lightning --stage serve
---

NVIDIA Nemotron 3.5 Lightning is a fast, open-weight 30B Mixture-of-Experts model that activates only 3B parameters per token. It brings performance close to the much larger Nemotron 3 Super while remaining practical for local coding assistants, research agents, tool-calling workflows, and other always-on applications.

The model supports context lengths of up to one million tokens. Reasoning can be enabled or disabled, and a configurable reasoning budget lets users control how much reasoning the model performs before answering.

The best performance we saw with this model averaged 115 tokens/sec on Jetson AGX Thor and 89 tokens/sec on Jetson AGX Orin across multi-step agentic workloads involving reasoning and tool calls.

Nemotron 3.5 Lightning supports several speculative decoding options, including built-in Multi-Token Prediction, DSpark, and DFlash. We tested the available approaches and found DSpark with vLLM delivered the best performance on both Jetson AGX Thor and Jetson AGX Orin.

## Inputs and Outputs

Input: Text

Output: Text

## Supported Platforms

- Jetson AGX Orin 64GB
- Jetson AGX Thor T4000
- Jetson AGX Thor T5000 Developer Kit

## Why Nemotron 3.5 Lightning on Jetson

- Super-class capability: Performance close to Nemotron 3 Super in a model that is much faster and more practical to run locally.
- Responsive local agents: Strong performance for multi-step reasoning, tool calls, coding assistants, and research workflows.
- Controllable reasoning: Enable or disable reasoning and set a reasoning budget to balance quality, latency, and token usage.
- Long-context support: Work with context lengths of up to one million tokens when memory allows.
- Fast speculative decoding: Choose from MTP, DSpark, and DFlash, with DSpark providing the best results in our Jetson testing.

## Speculative Decoding on Jetson

Nemotron 3.5 Lightning includes Multi-Token Prediction and is released with dedicated DSpark and DFlash checkpoints. The vLLM commands use DSpark with five speculative tokens, which was the fastest configuration in our testing on both supported Jetson platforms. The `llama.cpp` commands use the DFlash checkpoint.

The vLLM server exposes an OpenAI-compatible API on port `8000` with reasoning parsing, automatic tool selection, and the Qwen3 Coder tool-call parser enabled. The `llama.cpp` server exposes its API on port `8080`.

## TensorRT Edge-LLM on Jetson Thor

The TensorRT Edge-LLM command is an experimental, **Thor-only** NVFP4 path. Its default engine is intentionally conservative: batch size 1, maximum input length 2048 tokens, and KV-cache capacity 2200 tokens. The model's 1M-token capability is not enabled by this engine configuration.

The Thor Edge-LLM route has received a **serving smoke pass**, not a full model-behavior validation: the initial model download, export and engine build, server startup, `/v1/models`, and a basic non-streaming chat completion were exercised on Jetson AGX Thor.

Reasoning on/off behavior, streaming, tool calling, and output-format integrity have not been validated for this TensorRT Edge-LLM 0.10.0 sample. Its server does not yet provide a reasoning parser, so reasoning may appear in assistant output. OpenAI `tools` requests are also unsupported because the shipped tokenizer configuration cannot apply its tool-aware chat template. Use the vLLM command above for validated tool calling, structured reasoning parsing, long-context tuning, or speculative decoding.

The helper serves on port `8000` by default. If that port is already in use, append `--port 8001` after `--stage serve` in the Docker command, then use port `8001` for the OpenAI-compatible API.

## Additional Resources

- [Nemotron 3.5 Lightning NVFP4](https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-NVFP4)
- [Nemotron 3.5 Lightning BF16 model card](https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16)
- [Nemotron 3.5 Lightning DSpark checkpoint](https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-NVFP4-DSpark)
- [vLLM](https://github.com/vllm-project/vllm)

---
title: "Qwen3.6 27B"
model_id: "qwen3-6-27b"
short_description: "Alibaba's dense 27 billion parameter language model with native tool calling and MTP speculative decoding"
family: "Alibaba Qwen3.6"
icon: "🔮"
is_new: true
order: 2
type: "Text"
vision_capable: false
memory_requirements: "18GB RAM"
precision: "NVFP4"
model_size: "19GB"
hf_checkpoint: "Qwen/Qwen3.6-27B"
huggingface_url: "https://huggingface.co/Qwen/Qwen3.6-27B"
minimum_jetson: "AGX Thor"
supported_inference_engines:
  - engine: "vLLM"
    type: "Container"
    modules_supported:
      - thor_t5000
      - thor_t4000
    serve_command_thor: |-
      sudo docker run -it --rm --pull always \
        --runtime=nvidia --network host \
        vllm/vllm-openai:latest \
        bash -c "pip install -q 'vllm[audio]' && vllm serve sakamakismile/Qwen3.6-27B-NVFP4 \
          --gpu-memory-utilization 0.8 \
          --enable-prefix-caching \
          --reasoning-parser qwen3 \
          --enable-auto-tool-choice \
          --tool-call-parser qwen3_coder"
benchmark:
  thor:
    concurrency1: 13
    concurrency8: 55
    ttftMs: 0
benchmark_key: "Qwen3.6-27B"
---

Qwen3.6 27B is a dense language model from Alibaba Cloud's Qwen3.6 family. With 27 billion parameters, it delivers strong performance across complex reasoning, coding, and language understanding tasks.

## Inputs and Outputs

**Input:** Text

**Output:** Text

## Intended Use Cases

- **Reasoning**: Advanced logical and analytical reasoning with chain-of-thought
- **Function Calling**: Native support for tool use and function calling
- **Multilingual Instruction Following**: Following instructions across 100+ languages
- **Code Generation**: Programming assistance in multiple languages
- **Translation**: High-quality translation between supported languages

## Running with vLLM

```bash
sudo docker run -it --rm --pull always --runtime=nvidia --network host \
  vllm/vllm-openai:latest \
  bash -c "pip install -q 'vllm[audio]' && vllm serve sakamakismile/Qwen3.6-27B-NVFP4 \
    --gpu-memory-utilization 0.8 --enable-prefix-caching \
    --reasoning-parser qwen3 \
    --enable-auto-tool-choice --tool-call-parser qwen3_coder"
```

## Speculative Decoding with MTP

This model supports **Multi-Token Prediction (MTP)** speculative decoding, which can significantly improve generation throughput. To enable it, add the following flag to your `vllm serve` command:

```bash
--speculative-config '{"method": "mtp", "num_speculative_tokens": 4}'
```

## Qwen3.6 Family

| Model | Parameters | Active Params | Type | Best For |
|---|---|---|---|---|
| [Qwen3.6 35B-A3B](/models/qwen3-6-35b-a3b) | 35B | 3B | MoE | Efficient high-performance inference |
| **Qwen3.6 27B** | 27B | 27B | Dense | Maximum accuracy on demanding tasks |

## Additional Resources

- [Hugging Face Model](https://huggingface.co/Qwen/Qwen3.6-27B) - Original model weights
- [NVFP4 Checkpoint (Thor)](https://huggingface.co/sakamakismile/Qwen3.6-27B-NVFP4) - Quantized for Jetson Thor

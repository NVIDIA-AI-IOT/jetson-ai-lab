---
title: "Qwen3.6 27B"
model_id: "qwen3-6-27b"
short_description: "Alibaba's dense 27 billion parameter language model with native tool calling and MTP speculative decoding"
family: "Alibaba Qwen3.6"
icon: "🔮"
is_new: false
order: 2
type: "Text"
vision_capable: false
memory_requirements: "18GB RAM"
precision: "NVFP4 / AWQ-INT4"
model_size: "19GB"
hf_checkpoint: "Qwen/Qwen3.6-27B"
huggingface_url: "https://huggingface.co/Qwen/Qwen3.6-27B"
minimum_jetson: "AGX Orin"
supported_inference_engines:
  - engine: "vLLM"
    type: "Container"
    modules_supported:
      - thor_t5000
      - thor_t4000
      - orin_agx_64
    serve_command_orin: >-
      sudo docker run -it --rm --pull always --runtime=nvidia --network host vllm/vllm-openai:latest cyankiwi/Qwen3.6-27B-AWQ-INT4 --max-model-len 8192 --gpu-memory-utilization 0.7 --reasoning-parser qwen3 --enable-auto-tool-choice --tool-call-parser qwen3_coder --speculative-config '{"method":"qwen3_next_mtp","num_speculative_tokens":3}'
    serve_command_thor: >-
      sudo docker run -it --rm --pull always --runtime=nvidia --network host vllm/vllm-openai:latest nvidia/Qwen3.6-27B-NVFP4 --max-model-len 8192 --gpu-memory-utilization 0.7 --reasoning-parser qwen3 --enable-auto-tool-choice --tool-call-parser qwen3_coder --speculative-config '{"method":"mtp","num_speculative_tokens":3}'
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

### Jetson Orin

```bash
sudo docker run -it --rm --pull always --runtime=nvidia --network host vllm/vllm-openai:latest cyankiwi/Qwen3.6-27B-AWQ-INT4 --max-model-len 8192 --gpu-memory-utilization 0.7 --reasoning-parser qwen3 --enable-auto-tool-choice --tool-call-parser qwen3_coder --speculative-config '{"method":"qwen3_next_mtp","num_speculative_tokens":3}'
```

### Jetson Thor

```bash
sudo docker run -it --rm --pull always --runtime=nvidia --network host vllm/vllm-openai:latest nvidia/Qwen3.6-27B-NVFP4 --max-model-len 8192 --gpu-memory-utilization 0.7 --reasoning-parser qwen3 --enable-auto-tool-choice --tool-call-parser qwen3_coder --speculative-config '{"method":"mtp","num_speculative_tokens":3}'
```

## Speculative Decoding with MTP

Both platform commands enable native **Multi-Token Prediction (MTP-3)** speculative decoding.

## Qwen3.6 Family

| Model | Parameters | Active Params | Type | Best For |
|---|---|---|---|---|
| [Qwen3.6 35B-A3B](/models/qwen3-6-35b-a3b) | 35B | 3B | MoE | Efficient high-performance inference |
| **Qwen3.6 27B** | 27B | 27B | Dense | Maximum accuracy on demanding tasks |

## Additional Resources

- [Hugging Face Model](https://huggingface.co/Qwen/Qwen3.6-27B) - Original model weights
- [NVFP4 Checkpoint (Thor)](https://huggingface.co/nvidia/Qwen3.6-27B-NVFP4) - Quantized for Jetson Thor
- [AWQ-INT4 Checkpoint (Orin)](https://huggingface.co/cyankiwi/Qwen3.6-27B-AWQ-INT4) - Quantized for Jetson Orin

---
title: "Qwen3.6 27B"
model_id: "qwen3-6-27b"
short_description: "Alibaba's dense 27B vision-language model with native tool calling and MTP speculative decoding"
family: "Alibaba Qwen3.6"
icon: "🔮"
is_new: false
order: 2
type: "Multimodal"
vision_capable: true
memory_requirements: "18GB RAM"
precision: "NVFP4 / AWQ-INT4"
parameters: "27B"
modalities: ["Text", "Image"]
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
      sudo docker run -it --rm --pull always --runtime=nvidia --network host -v ~/.cache/huggingface:/root/.cache/huggingface -v ~/.cache/vllm:/root/.cache/vllm vllm/vllm-openai:latest cyankiwi/Qwen3.6-27B-AWQ-INT4 --max-model-len 8192 --gpu-memory-utilization 0.7 --reasoning-parser qwen3 --enable-auto-tool-choice --tool-call-parser qwen3_coder --speculative-config '{"method":"qwen3_next_mtp","num_speculative_tokens":3}'
    serve_command_thor: >-
      sudo docker run -it --rm --pull always --runtime=nvidia --network host -v ~/.cache/huggingface:/root/.cache/huggingface -v ~/.cache/vllm:/root/.cache/vllm vllm/vllm-openai:latest nvidia/Qwen3.6-27B-NVFP4 --max-model-len 8192 --gpu-memory-utilization 0.7 --reasoning-parser qwen3 --enable-auto-tool-choice --tool-call-parser qwen3_coder --speculative-config '{"method":"mtp","num_speculative_tokens":3}'
  - engine: "TensorRT Edge-LLM"
    type: "Container"
    modules_supported:
      - thor_t5000
      - orin_agx_64
    install_command: |-
      mkdir -p "$HOME/tensorrt-edgellm-workspace" "$HOME/.cache/huggingface"
      curl -fsSL https://www.jetson-ai-lab.com/code-samples/tensorrt_edge_llm/run_model.sh -o "$HOME/run-edgellm-model"
      chmod +x "$HOME/run-edgellm-model"
    serve_command_orin: |-
      sudo docker run -it --rm --pull always --runtime=nvidia --network host \
        -v "$HOME/run-edgellm-model:/usr/local/bin/run-edgellm-model:ro" \
        -v "tensorrt-edgellm-0100-build:/opt/TensorRT-Edge-LLM/build" \
        -v "$HOME/tensorrt-edgellm-workspace:/data/edgellm" \
        -v "$HOME/.cache/huggingface:/data/models/huggingface" \
        ghcr.io/nvidia-ai-iot/tensorrt_edge_llm:0.10.0-orin \
        run-edgellm-model QuantTrio/Qwen3.6-27B-AWQ --builder onnx --stage serve
    serve_command_thor: |-
      sudo docker run -it --rm --pull always --runtime=nvidia --network host \
        -v "$HOME/run-edgellm-model:/usr/local/bin/run-edgellm-model:ro" \
        -v "tensorrt-edgellm-0100-build:/opt/TensorRT-Edge-LLM/build" \
        -v "$HOME/tensorrt-edgellm-workspace:/data/edgellm" \
        -v "$HOME/.cache/huggingface:/data/models/huggingface" \
        ghcr.io/nvidia-ai-iot/tensorrt_edge_llm:0.10.0-thor \
        run-edgellm-model natfii/Qwen3.6-27B-VLM-NVFP4-MTP --mtp --builder onnx --stage serve
benchmark:
  thor:
    concurrency1: 13
    concurrency8: 55
    ttftMs: 0
benchmark_key: "Qwen3.6-27B"
---

Qwen3.6 27B is a dense vision-language model from Alibaba Cloud's Qwen3.6 family. With 27 billion parameters, it combines visual understanding with complex reasoning, coding, and language tasks.

## Inputs and Outputs

**Input:** Text and images

**Output:** Text

## Intended Use Cases

- **Reasoning**: Advanced logical and analytical reasoning with chain-of-thought
- **Visual understanding**: Image description, question answering, and document analysis
- **Function Calling**: Native support for tool use and function calling
- **Multilingual Instruction Following**: Following instructions across 100+ languages
- **Code Generation**: Programming assistance in multiple languages
- **Translation**: High-quality translation between supported languages

## Running with vLLM

### Jetson Orin

```bash
sudo docker run -it --rm --pull always --runtime=nvidia --network host -v ~/.cache/huggingface:/root/.cache/huggingface -v ~/.cache/vllm:/root/.cache/vllm vllm/vllm-openai:latest cyankiwi/Qwen3.6-27B-AWQ-INT4 --max-model-len 8192 --gpu-memory-utilization 0.7 --reasoning-parser qwen3 --enable-auto-tool-choice --tool-call-parser qwen3_coder --speculative-config '{"method":"qwen3_next_mtp","num_speculative_tokens":3}'
```

### Jetson Thor

```bash
sudo docker run -it --rm --pull always --runtime=nvidia --network host -v ~/.cache/huggingface:/root/.cache/huggingface -v ~/.cache/vllm:/root/.cache/vllm vllm/vllm-openai:latest nvidia/Qwen3.6-27B-NVFP4 --max-model-len 8192 --gpu-memory-utilization 0.7 --reasoning-parser qwen3 --enable-auto-tool-choice --tool-call-parser qwen3_coder --speculative-config '{"method":"mtp","num_speculative_tokens":3}'
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
- [NVFP4 + MTP Checkpoint (Thor)](https://huggingface.co/natfii/Qwen3.6-27B-VLM-NVFP4-MTP) - Includes a compatible quantized MTP head
- [AWQ-INT4 Checkpoint (Orin)](https://huggingface.co/cyankiwi/Qwen3.6-27B-AWQ-INT4) - Quantized for Jetson Orin
- [AWQ Checkpoint (Orin)](https://huggingface.co/QuantTrio/Qwen3.6-27B-AWQ) - Quantized for Jetson AGX Orin

---
title: "Qwen3.8 Flash Next"
model_id: "qwen3-8-flash-next"
short_description: "Qwen's vision-language MoE model for reasoning, coding, and tool use on Jetson Thor, with NVFP4 quantization and MTP speculative decoding"
family: "Alibaba Qwen3.8"
icon: "🔮"
is_new: true
order: -4
type: "Multimodal"
vision_capable: true
memory_requirements: "128GB RAM"
precision: "NVFP4"
parameters: "125B MoE / 6B activated"
modalities: ["Text", "Image", "Video"]
context_length: "262K"
license: "Qwen Community 1.0"
model_size: "106GB"
hf_checkpoint: "local-inference-lab/Qwen3.8-Flash-Next-NVFP4"
huggingface_url: "https://huggingface.co/local-inference-lab/Qwen3.8-Flash-Next-NVFP4"
minimum_jetson: "Thor"
serving:
  entries:
    - engine: "vLLM"
      type: "Container"
      modules_supported:
        - thor_t5000
      serve_command_thor: |-
        sudo docker run -it --rm --pull always \
          --runtime=nvidia --gpus all --network host --ipc=host \
          -v "$HOME/.cache/huggingface:/root/.cache/huggingface" \
          -v "$HOME/.cache/vllm:/root/.cache/vllm" \
          ghcr.io/nvidia-ai-iot/vllm:qwen3.8-next-jetson-thor \
          local-inference-lab/Qwen3.8-Flash-Next-NVFP4 \
          --served-model-name Qwen3.8-Flash-Next \
          --gpu-memory-utilization 0.93 \
          --max-num-seqs 1 \
          --mamba-ssm-cache-dtype bfloat16 \
          --reasoning-parser qwen3 \
          --enable-auto-tool-choice --tool-call-parser qwen3_xml \
          --hf-overrides '{"architectures":["Qwen4ExpForConditionalGeneration"],"model_type":"qwen4_exp"}' \
          --speculative-config '{"method":"mtp","num_speculative_tokens":3,"model":"/opt/qwen38-mtp-model"}'
---

[Qwen3.8 Flash Next](https://huggingface.co/Qwen/Qwen3.8-Flash-Next) is Qwen's vision-language mixture-of-experts model for reasoning, coding, and tool use. It has 125B language-model parameters with 6B activated per token, plus 51B n-gram embedding parameters. Its native context window is 262,144 tokens.

## Modalities

Input: Text, image, and video

Output: Text

## What makes Flash Next different

Flash Next is an early preview of [Qwen's upcoming Qwen4 architecture](https://huggingface.co/Qwen/Qwen3.8-Flash-Next). It uses sparse attention to reduce the work needed to process long context, alongside n-gram embeddings that add model capacity with relatively little extra computation.

The model focuses on multi-step tasks that involve planning, calling tools, and acting on their results. Its preserved thinking keeps earlier reasoning available across conversation turns, helping it follow through on longer tasks. Thinking is enabled by default and can be disabled for direct responses.

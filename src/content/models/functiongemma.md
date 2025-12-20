---
title: "FunctionGemma"
model_id: "functiongemma"
short_description: "Google's specialized function calling model built on Gemma 3 270M, optimized for tool use"
family: "Google Gemma3"
icon: "💎"
is_new: true
order: 0.5
type: "Text"
memory_requirements: "1GB RAM"
precision: "FP8"
model_size: "0.5GB"
hf_checkpoint: "ggml-org/functiongemma-270m-it-GGUF"
huggingface_url: "https://huggingface.co/google/functiongemma-270m-it"
minimum_jetson: "Orin Nano"
supported_inference_engines:
  - engine: "llama.cpp"
    type: "Container"
    run_command_orin: "sudo docker run -it --rm --runtime=nvidia --network host ghcr.io/nvidia-ai-iot/llama_cpp:latest-jetson-orin llama-server --jinja -fa on -hf ggml-org/functiongemma-270m-it-GGUF --alias functiongemma"
    run_command_thor: "sudo docker run -it --rm --runtime=nvidia --network host ghcr.io/nvidia-ai-iot/llama_cpp:latest-jetson-thor llama-server --jinja -fa on -hf ggml-org/functiongemma-270m-it-GGUF --alias functiongemma"
---

FunctionGemma is a lightweight, open model from Google, built as a foundation for creating your own specialized function calling models. Built on the Gemma 3 270M model and with the same research and technology used to create the Gemini models, FunctionGemma has been trained specifically for function calling. The model has the same architecture as Gemma 3, but uses a different chat format optimized for tool use.

**Note:** FunctionGemma is not intended for use as a direct dialogue model. It is designed to be highly performant after further fine-tuning, as is typical of models this size. The model is well suited for text-only function calling scenarios.

This model is extremely good for applications like home assistant where based on voice actions, we pass it through text-to-speech (TTS) and then use the model for calling the appropriate tool. For example, commands like "close the lights," "open the garage," "set the thermostat to 72 degrees," or "turn on the coffee maker" can be processed efficiently. The model is capable of calling tools in parallel as well, making it efficient for handling multiple commands or complex multi-step actions.

## Supported Platforms

- ✅ Jetson Orin (Orin Nano, Orin NX, AGX Orin)
- ✅ Jetson Thor

You can use FunctionGemma with your favorite orchestration framework or any library/software that supports OpenAI-compatible API backends.

## Getting Started

### Quick Hello World Example

Here's a simple CLI example to get you started with function calling:

```bash
curl http://localhost:8080/v1/chat/completions -d '{
    "model": "functiongemma",
    "messages": [
        {"role": "system", "content": "You are a chatbot that uses tools/functions. Dont overthink things."},
        {"role": "user", "content": "What is the weather in Istanbul?"}
    ],
    "tools": [{
        "type":"function",
        "function":{
            "name":"get_current_weather",
            "description":"Get the current weather in a given location",
            "parameters":{
                "type":"object",
                "properties":{
                    "location":{
                        "type":"string",
                        "description":"The city and country/state, e.g. `San Francisco, CA`, or `Paris, France`"
                    }
                },
                "required":["location"]
            }
        }
    }]
}'
```

### Parallel Tool Calling

To enable parallel tool calling, simply add `"parallel_tool_calls": true` to your request payload:

```bash
curl http://localhost:8080/v1/chat/completions -d '{
    "model": "functiongemma",
    "parallel_tool_calls": true,
    "messages": [
        {"role": "user", "content": "Turn on the living room lights and set the temperature to 70"}
    ],
    "tools": [...]
}'
```

## Key Features

- 🎯 **Specialized for Function Calling**: Purpose-built for tool use and API calling
- ⚡ **Lightweight**: Only 270M parameters, runs efficiently on edge devices
- 🔄 **Parallel Execution**: Call multiple tools simultaneously

## Inputs and outputs

**Input:**
- Text string with system and user messages
- Tool/function definitions in OpenAI format
- Support for parallel tool calling with flag

**Output:**
- Structured function calls with appropriate parameters
- Compatible with OpenAI chat completions format
- JSON-formatted tool invocations


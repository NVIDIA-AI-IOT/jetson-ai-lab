---
title: "d1-omni-600M"
slug: "d1-omni-600M"
model_id: "d1-omni-600m"
short_description: "Liquid AI's compact zero-shot classification model for text, images, and audio, with a guide to running it on Jetson using PyTorch."
family: "Liquid AI d1"
is_new: true
order: -6
type: "Multimodal"
vision_capable: true
precision: "FP16"
parameters: "587M"
modalities: ["Text", "Image", "Audio"]
context_length: "16K"
license: "LFM Open License v1.0"
hf_checkpoint: "LiquidAI/d1-omni-600M"
huggingface_url: "https://huggingface.co/LiquidAI/d1-omni-600M"
minimum_jetson: "AGX Orin 64GB"
hide_run_button: true
supported_inference_engines:
  - engine: "Transformers"
    type: "Python"
    modules_supported:
      - orin_agx_64
      - thor_t5000
      - thor_t4000
---

## Get started with d1-omni-600M on Jetson

[d1-omni-600M](https://huggingface.co/LiquidAI/d1-omni-600M) is a compact zero-shot classification model from [Liquid AI](https://www.liquid.ai/blog/d1-open), built on LFM2.5-Encoder-350M with vision and audio encoders. Given text, images, or a voice clip and a set of questions, it returns structured answers in a single forward pass.

Describe your task and candidate labels in natural language to route support tickets, classify voice commands, moderate content, or inspect images. Changing tasks requires changing the questions and labels, without task-specific fine-tuning.

The model answers three types of questions: `noul` returns a probability for a yes/no question, `choice` selects from named options, and `score` returns a rating across ordered levels. A request can include text with images or text with audio. Images and audio cannot be combined in the same request.

This guide uses FP16 to run text, image, audio, and batch examples on the GPU. For the larger model and its reported Jetson latency, see [d1-3B on Jetson](/models/d1-3b/#model-details).

## 1. Prerequisites

| Requirement | Configuration |
| --- | --- |
| Hardware | Jetson AGX Thor, Jetson AGX Orin 64 GB, or Jetson Orin Nano |
| System software | [JetPack 7.2](https://developer.nvidia.com/embedded/jetpack/downloads/archive-7.2) / Jetson Linux 39.2 |
| Container | Docker installed and NVIDIA Container Toolkit configured for GPU access |

## 2. Start the container

NVIDIA's PyTorch container includes PyTorch built for the Jetson GPU.

```bash
docker run --pull always --rm -it --runtime nvidia --ipc=host \
  -v "$PWD":/workspace -w /workspace \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  nvcr.io/nvidia/pytorch:26.09-py3
```

Run the remaining commands inside the container. Files in `/workspace` and downloaded models stay on the host; installed packages disappear when this temporary container exits.

## 3. Install the dependencies

```bash
pip install "transformers==5.18.0" pillow soundfile
```

The remaining dependencies are already installed and configured in the container.

## 4. Run inference and check GPU execution

`from_pretrained()` downloads the checkpoint on the first run and reuses the mounted Hugging Face cache on later runs.

The audio example uses a 16 kHz mono clip. The model accepts up to 30 seconds of audio and was trained on English speech requests.

Save this as `example.py`. It is adapted from the "How to use" example in the [d1-omni-600M model card](https://huggingface.co/LiquidAI/d1-omni-600M).

```python
import io
from urllib.request import urlopen

import soundfile as sf
import torch
from transformers import AutoModel
from transformers.image_utils import load_image

assert torch.cuda.is_available(), "CUDA is not available"

model = AutoModel.from_pretrained("LiquidAI/d1-omni-600M", trust_remote_code=True, dtype=torch.float16).to("cuda")

# Text: several named questions over one state, answered in one pass
questions = {
    "refund": {
        "type": "noul",
        "instructions": "Is the customer asking for a refund?",
    },
    "team": {
        "type": "choice",
        "instructions": "Which team should handle this?",
        "criteria": {
            "billing": "Charges, refunds, invoices",
            "technical": "App or site faults",
            "fraud": "Suspected unauthorised use",
        },
    },
    "urgency": {
        "type": "score",
        "instructions": "How urgent is this?",
        "criteria": ["Can wait", "Today", "Blocking the customer now"],
    },
}
text_result = model.system_one("I was charged twice this month, please refund one of them.", questions)

# Image: the photo is the whole state
image = load_image("http://images.cocodataset.org/val2017/000000039769.jpg")  # two cats on a sofa
cats = {
    "type": "choice",
    "instructions": "How many cats are there?",
    "criteria": {"one": "One", "two": "Two", "more": "Three or more"},
}
image_result = model.system_one(None, {"cats": cats}, images=[image])

# Text + audio: one 16 kHz mono clip
url = "https://huggingface.co/datasets/Narsil/asr_dummy/resolve/main/1.flac"
audio, rate = sf.read(io.BytesIO(urlopen(url).read()), dtype="int16")
topic = {
    "type": "choice",
    "instructions": "What is the speaker talking about?",
    "criteria": {"food": "Food and meals", "travel": "Travel and transport", "weather": "The weather"},
}
audio_result = model.system_one("Voice note from a user.", {"topic": topic}, audio=audio)

# Batch: many requests in one call
tickets = ["Where is my parcel? It was due Monday.", "The app crashes when I open settings."]
batch_result = model.system_one_batch([(t, {"team": questions["team"]}) for t in tickets])

print("GPU:", torch.cuda.get_device_name())
print("Refund:", f'{text_result["answers"]["refund"]["noul"]:.2f}')
print("Team:", text_result["answers"]["team"]["choice"])
print("Urgency:", f'{text_result["answers"]["urgency"]["score"]:.2f}')
print("Cats:", image_result["answers"]["cats"]["choice"])
print("Topic:", audio_result["answers"]["topic"]["choice"])
print("Batch:", ", ".join(r["answers"]["team"]["choice"] for r in batch_result))
```

```bash
python example.py
```

Example output from a Jetson Thor run of the model-card example, formatted to match the print statements above:

```text
GPU: NVIDIA Thor
Refund: 1.00
Team: billing
Urgency: 1.80
Cats: two
Topic: food
Batch: technical, technical
```

Values can differ between devices. The GPU name should match your Jetson.

## Further reading

- [d1-omni-600M model card and API examples](https://huggingface.co/LiquidAI/d1-omni-600M)
- [Open d1: Edge decision models for text, vision, and audio](https://www.liquid.ai/blog/d1-open)
- [d1-3B on Jetson](/models/d1-3b/)

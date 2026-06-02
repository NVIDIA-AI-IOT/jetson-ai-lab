---
title: "Live VLM WebUI"
description: "A convenient interface for evaluating Vision Language Models in real-time with WebRTC webcam streaming, OpenAI-compatible API support, and interactive prompt editor."
category: "Applications"
section: "Vision Language Models"
order: 1
tags: ["vlm", "vision", "camera", "live-streaming", "webrtc", "ollama", "gemma", "qwen", "llama-vision", "multimodal"]
featured: false
authors:
  - name: "Chitoku YATO"
    github: "tokk-nv"
---

![Live VLM WebUI](https://github.com/NVIDIA-AI-IOT/live-vlm-webui/raw/main/docs/images/chrome_app-running_light-theme.jpg)

[Live VLM WebUI](https://github.com/NVIDIA-AI-IOT/live-vlm-webui) is a convenient interface for evaluating Vision Language Model in real-time:

- 🎥 **Multi-source video input**
  - WebRTC webcam streaming (stable)
  - 🧪 RTSP IP camera support (Beta)
- 🔌 **OpenAI-compatible API** - Works with Ollama, vLLM, NIM, or any vision API
  - 🔧 Flexible deployment - VLM backend: local inference or cloud APIs
- ✍️ **Interactive prompt editor** - 8 preset prompts + custom prompts
- ⚡ **Async processing** - Smooth video while VLM processes frames in background

---

## Prerequisites

**Supported Devices:**
- Jetson AGX Thor Developer Kit
- Jetson AGX Orin (64GB)
- Jetson AGX Orin (32GB)
- Jetson Orin Nano (8GB)

**JetPack Version:**
- JetPack 6 (L4T r36.x)
- JetPack 7 (L4T r38.x)

**Storage:** NVMe SSD **highly recommended**
- About `4 GB` for `live-vlm-webui` container
- Space for pulling (downloading) models on Ollama (if running locally)

---

## Overview

Vision Language Models are now available in sizes suitable for edge deployment, from 4b to 90b+ parameters. Open-weight models include Qwen 2.5/3 VL, Gemma 3, Llama 3.2/4 Vision, Phi-3.5-vision, and NVIDIA's Cosmos-Reason1 and Nemotron Nano VL.

### Available Open-Weight VLM Models

| Creator | Model Name | Sizes |
|---------|------------|-------|
| Alibaba | **Qwen 2.5 VL** | 3b, 7b, 32b, 72b |
| Alibaba | **Qwen 3 VL** | 2b, 4b, 8b, 30b, 32b, 235b |
| Google | **Gemma 3** | 4b, 12b, 27b |
| Meta | **Llama 3.2-Vision** | 11b, 90b |
| Meta | **Llama 4** | 16x17b, 128x17b |
| Microsoft | **Phi-3.5-vision** | 4.2b |
| NVIDIA | **Cosmos-Reason1** | 7b |
| NVIDIA | **Nemotron Nano 12B V2 VL** | 12b |

Testing VLMs in real-time presents specific challenges:

- Web interfaces like Open WebUI require manual image uploads (no streaming)
- Lack of unified benchmarking tools across platforms
- Limited real-time GPU monitoring integration

**Live VLM WebUI** addresses these gaps by providing a WebRTC-based interface for real-time vision inference testing with integrated system monitoring.

---

## Demo Video

Watch the Live VLM WebUI in action:

<video width="960" height="540" controls>
  <source src="https://github.com/user-attachments/assets/47a920da-b943-4494-9b28-c4ea86e192e4" type="video/mp4">
  Your browser does not support the video tag.
</video>

---

## Getting Started

### Step 1: Prepare VLM Backend (Ollama)

First, install Ollama as the backend to serve VLMs. Ollama official installer supports Jetson.

```bash
# Ollama installer for Linux/Mac
curl -fsSL https://ollama.com/install.sh | sh

# Download recommended model (lightweight)
ollama pull gemma3:4b

# Or other vision models
# ollama pull llama3.2-vision:11b
# ollama pull qwen2.5-vl:7b
```

> **Warning - Jetson Thor (JetPack 7.0) Users:** Ollama 0.12.10 has GPU inference issues on Jetson Thor. Use version 0.12.9:
> ```bash
> curl -fsSL https://ollama.com/install.sh | OLLAMA_VERSION=0.12.9 sh
> ```

### Step 2: Install Live VLM WebUI

```bash
git clone https://github.com/nvidia-ai-iot/live-vlm-webui.git
cd live-vlm-webui
./scripts/start_container.sh
```

### Step 3: Access the Web Interface

Open your web browser and navigate to:

- **Local URL**: `https://localhost:8090` (if running browser on same machine)
- **Network URL**: `https://<IP_ADDRESS>:8090` (from another device on same network)

```
Local URL: https://localhost:8090
Network URL: https://10.110.50.252:8090
```

> **Tip for Jetson Orin Nano Users:** It's recommended to use a PC connected on the same network and access the web UI remotely for better performance.

---

## How to Use Live VLM WebUI

### Step 4: Configure and Start

#### Accept the Self-signed SSL Certificate

1. Click "**Advanced**" button

   ![Chrome Advanced](https://raw.githubusercontent.com/NVIDIA-AI-IOT/live-vlm-webui/refs/heads/main/docs/images/chrome_advanced.png)

2. Click "**Proceed to <IP_ADDRESS> (unsafe)**"

   ![Chrome Proceed](https://raw.githubusercontent.com/NVIDIA-AI-IOT/live-vlm-webui/refs/heads/main/docs/images/chrome_proceed.png)

3. Allow camera access when prompted

   ![Chrome Webcam Access](https://raw.githubusercontent.com/NVIDIA-AI-IOT/live-vlm-webui/refs/heads/main/docs/images/chrome_webcam_access.png)

#### Verify VLM API Configuration

The interface auto-detects local VLM backends. Verify in the "**VLM API Configuration**" section:

- **API Endpoint**: `http://localhost:11434/v1` (Ollama) or `http://localhost:8000/v1` (vLLM)
- **Model**: Selected model name (e.g., `gemma3:4b`)

For cloud APIs, manually enter the endpoint and API key.

#### Start Camera and VLM Analysis

Click "**Start Camera and Start VLM Analysis**" and grant camera permissions. The interface begins streaming and analyzing frames based on the configured interval.

---

## Main Features

### Real-time Display

The main pane on the right displays the following information:

#### 1. Real-time AI Analysis Results

The **VLM Output Info** section shows:

- **Top-right**: Inference latency, average latency, total analysis count
- **Current VLM model** being used
- **Current prompt** text
- **Analysis result text** (with Markdown support)

#### 2. Live Video Stream

WebRTC streams your webcam video with:

- **Mirror button** (top-left) - Convenient mirror display when facing the camera
- **Overlay text** - Analysis results overlaid on video (if enabled in settings)

#### 3. GPU/CPU Monitoring

Real-time hardware usage monitoring:

- **GPU Usage** (using `jtop`)
- **VRAM Usage** (using `jtop`)
- **CPU Usage**
- **System RAM**

### Detailed Settings

The left settings menu allows you to customize configuration and behavior.

#### 1. Prompt Customization

The most important setting is the **Prompt Editor** at the bottom of the left menu.

**Quick Prompts** - 8 preset prompts ready to use:

- **Scene Description**: "Describe what you see in this image in one sentence."
- **Object Detection**: "List all objects you can see in this image, separated by commas."
- **Activity Recognition**: "Describe the person's activity and what they are doing."
- **Safety Monitoring**: "Are there any safety hazards visible? Answer with 'ALERT: description' or 'SAFE'."
- **Emotion Detection**: "Describe the facial expressions and emotions of people visible."
- **Accessibility**: "Provide a detailed description of the scene for a visually impaired person."
- **OCR / Text Recognition**: "Read and transcribe any text visible in the image."
- **Yes/No Question**: "Answer with Yes or No only: Is there a person visible?"

**Custom Prompt** - Enter your own unique prompts in the Custom Prompt field.

> **Tip:** Many models, including `gemma3:4b`, support multiple languages. Try instructing the model in different languages and output in the language.

**Real-time Prompt Engineering**

You can perform what we might call "real-time vision prompt engineering."

For example, using the object detection prompt as-is might produce:

> "Here is a list of objects I see in the image: person, desk, monitor..."

The model helpfully includes a preamble. If you want to feed this directly as CSV to a downstream application, this is inconvenient, so you can customize the prompt:

```text
List all objects you can see in this image, separated by commas.
Do not start with "Here is a list of..."
```

This suppresses the preamble. This real-time evaluation capability is one of the tool's unique advantages.

#### 2. Backend Configuration

The **VLM API Configuration** at the top of the left menu supports multiple VLM backends.

**API Base URL**

- Auto-detects if Ollama, vLLM, or SGLang is running locally on the same machine
- If not detected, you can specify cloud APIs (NVIDIA API Catalog is set by default)
- When using cloud APIs, an **API Key** field appears for entering your credentials

**Model Selection**

Queries the specified API and lists available models.

#### 3. Camera Settings

The **Camera and App Control** section in the middle of the left menu handles camera selection and related settings.

**Camera Selection**

Lists all cameras detected by your browser on the client PC. Most modern laptops should have a front-facing camera available. If using Jetson directly with a desktop browser, connect a USB camera.

You can switch cameras even during VLM analysis.

**Frame Processing Interval**

WebRTC camera frame processing (simply echoing frames from browser to UI server) and VLM analysis processing run asynchronously.

By default, after VLM analysis completes, it waits for the next frame number divisible by 30 before starting the next analysis.

If you want to slow down the analysis pace to have more time to read each result, increase this number.

**RTSP Stream (Beta)**

Tentative support for RTSP streams from IP surveillance cameras.

Testing hasn't been extensive across many cameras, so please report issues on GitHub if you encounter problems.

---

## Verified Platforms

| Platform | GPU | Status | Inference Speed |
|----------|-----|--------|-----------------|
| PC (RTX 6000 Ada) | RTX 6000 Ada | ✅ | <1 sec/frame (gemma3:4b) |
| Jetson Orin Nano 8GB | 1024-core Ampere | ✅ | 7-8 sec/frame (gemma3:4b) |
| Jetson Thor 128GB | 2560-core Blackwell | ✅ | 1-2 sec/frame (llama3.2-vision:11b) |
| DGX Spark | 6144-core Blackwell | ✅ | 1-2 sec/frame (llama3.2-vision:11b) |
| Mac (M3) | Apple Silicon | ✅ | 2-4 sec/frame (gemma3:4b) |
| Windows (WSL2) | RTX A3000 | ✅ | 2-4 sec/frame (gemma3:4b) |

### Jetson Orin Nano Performance

Even the most affordable Jetson, the **Jetson Orin Nano Developer Kit**, successfully runs `gemma3:4b` via Ollama!

While each frame takes 7-8 seconds to process, it runs continuously, opening up possibilities for real-time systems.

---

## Use Cases

### Model Benchmarking

Test and compare VLM performance across different scenarios:

- Frame processing latency measurement
- Object detection accuracy and spatial reasoning
- Structured output capabilities (JSON, CSV)
- OCR performance evaluation
- Multi-language support testing

Use real-time GPU/CPU metrics to compare models on the same hardware or evaluate the same model across platforms.

### Robotics Applications

VLM-based vision for robotic systems:

- Object recognition and spatial reasoning
- Scene understanding for navigation
- Human-robot interaction scenarios

### Prototyping and Development

Rapid iteration on vision-based applications:

- Real-time prompt engineering and testing
- Integration with existing inference backends
- Reference implementation for custom deployments

### Computer Vision Pipeline Alternatives

VLMs can replace or augment traditional CV pipelines in certain applications.
NVIDIA's [Video Search and Summarization (VSS)](https://docs.nvidia.com/vss/latest/index.html) demonstrates this approach in smart city deployments.

---

## Development: Building Your Own App

Live VLM WebUI is open-source and can be extended or integrated into your own applications.

### Architecture Overview

The system consists of three main components:

1. **Frontend (Web UI)** - HTML/CSS/JavaScript with WebRTC for video streaming
2. **Backend Server** - Python-based WebRTC server using `aiortc`
3. **VLM Backend** - Any OpenAI-compatible API (Ollama, vLLM, SGLang, cloud APIs)

### Key Python Modules

- **`server.py`** - Main WebRTC server with WebSocket support
- **`video_processor.py`** - Video frame processing and VLM integration
- **`gpu_monitor.py`** - Cross-platform GPU/system monitoring (Jetson support via jetson-stats)
- **`vlm_service.py`** - VLM API integration with async support

### Example: Custom Video Processing

You can extend `video_processor.py` to add custom frame processing:

```python
# Custom pre-processing before sending to VLM
def preprocess_frame(self, frame):
    # Add your custom image processing here
    # e.g., edge detection, filtering, ROI extraction
    processed = your_custom_function(frame)
    return processed
```

### Example: Custom Prompts via API

You can programmatically send prompts to the VLM backend:

```python
import aiohttp
import base64

async def analyze_image(image_path, prompt):
    with open(image_path, 'rb') as f:
        image_data = base64.b64encode(f.read()).decode('utf-8')

    async with aiohttp.ClientSession() as session:
        async with session.post(
            'http://localhost:11434/v1/chat/completions',
            json={
                'model': 'gemma3:4b',
                'messages': [{
                    'role': 'user',
                    'content': [
                        {'type': 'text', 'text': prompt},
                        {'type': 'image_url', 'image_url': {'url': f'data:image/jpeg;base64,{image_data}'}}
                    ]
                }]
            }
        ) as resp:
            result = await resp.json()
            return result['choices'][0]['message']['content']
```

### Integration with ROS 2

For robotics applications, you can integrate Live VLM WebUI with ROS 2:

1. Subscribe to ROS 2 camera topics
2. Convert ROS Image messages to OpenCV format
3. Feed frames to the VLM processing pipeline
4. Publish VLM responses as ROS 2 String messages

See the [jetson-containers](https://github.com/dusty-nv/jetson-containers) repository for ROS 2 integration examples.

---

## Project Structure

```
live-vlm-webui/
├── src/
│   └── live_vlm_webui/           # Main Python package
│       ├── __init__.py           # Package initialization
│       ├── server.py             # WebRTC server with WebSocket
│       ├── video_processor.py   # Frame processing & VLM integration
│       ├── gpu_monitor.py        # GPU/system monitoring (Jetson support)
│       ├── vlm_service.py        # VLM API client
│       └── static/
│           └── index.html        # Frontend web UI
│
├── scripts/                      # Utility scripts
│   ├── start_server.sh          # Quick start with SSL
│   ├── start_container.sh       # Docker launcher (auto-detection)
│   ├── stop_container.sh        # Stop Docker container
│   └── generate_cert.sh         # SSL certificate generator
│
├── docker/                       # Docker configurations
│   ├── Dockerfile.jetson-orin   # Jetson Orin (JetPack 6)
│   ├── Dockerfile.jetson-thor   # Jetson Thor (JetPack 7)
│   └── docker-compose.yml       # Multi-service stack
│
├── docs/                         # Documentation
│   ├── setup/                   # Setup guides
│   ├── usage/                   # Usage guides
│   └── troubleshooting.md       # Common issues & solutions
│
├── pyproject.toml               # Python package configuration
├── requirements.txt             # Python dependencies
└── README.md                    # Main documentation
```

---

## Summary

Live VLM WebUI provides real-time VLM testing capabilities with the following features:

- WebRTC-based low-latency video streaming
- Cross-platform support (x86_64, ARM64, Apple Silicon)
- Multiple backend support (Ollama, vLLM, SGLang, cloud APIs)
- Integrated GPU/CPU monitoring
- Preset and custom prompt support
- Apache 2.0 license

**Use Cases:**

- VLM performance benchmarking across hardware platforms
- Real-time inference testing with Ollama or vLLM
- Edge AI application prototyping on Jetson
- Vision model evaluation and comparison

---

## Troubleshooting

### Ollama GPU Error on Jetson Thor (JetPack 7.0)

**Problem:** Ollama 0.12.10 fails with GPU inference on Jetson Thor

**Solution:** Downgrade to Ollama 0.12.9:

```bash
# Stop and remove current Ollama
sudo systemctl stop ollama
sudo rm /usr/local/bin/ollama

# Install Ollama 0.12.9
curl -fsSL https://ollama.com/install.sh | OLLAMA_VERSION=0.12.9 sh
```

### Camera Not Accessible

**Problem:** Browser cannot access webcam or shows "Permission Denied"

**Solution:** Ensure you're using HTTPS (not HTTP):

- The `start_container.sh` script enables HTTPS by default
- Accept the self-signed certificate warning in your browser (click "Advanced" → "Proceed")
- Modern browsers require HTTPS for webcam access

### Cannot Connect to VLM Backend

**Problem:** "Failed to connect" or "Connection refused" errors

**Solution:**

1. **Verify VLM is running:**
   ```bash
   # For Ollama
   curl http://localhost:11434/v1/models

   # For vLLM
   curl http://localhost:8000/v1/models
   ```

2. **Check firewall settings:**
   ```bash
   sudo ufw allow 11434  # Ollama
   sudo ufw allow 8000   # vLLM
   ```

3. **If using Docker, ensure network mode:**
   ```bash
   # Use host network to access local services
   docker run --network host ...
   ```

### GPU Stats Show "N/A"

**Problem:** GPU monitoring shows "N/A" for all metrics

**Solution for Jetson:**

1. **Ensure jetson-stats is installed:**
   ```bash
   sudo pip3 install -U jetson-stats
   sudo reboot
   ```

2. **Grant container access to jtop socket:**
   ```bash
   # Already included in start_container.sh
   docker run -v /run/jtop.sock:/run/jtop.sock:ro ...
   ```

3. **For Jetson Thor, install from GitHub:**
   ```bash
   sudo pip3 install --break-system-packages git+https://github.com/rbonghi/jetson_stats.git
   sudo jtop --install-service
   sudo reboot
   ```

### Slow Performance / Low FPS

**Problem:** Video is laggy or VLM responses are slow

**Solutions:**

1. **Use a smaller model:**
   ```bash
   ollama pull gemma3:4b  # Instead of gemma3:11b
   ```

2. **Increase Frame Processing Interval:**
   - In Settings, set "Frame Processing Interval" to 60+ frames
   - This reduces how often frames are analyzed

3. **Reduce Max Tokens:**
   - Set "Max Tokens" to 50-100 instead of 512
   - Shorter responses = faster inference

4. **Check system resources:**
   ```bash
   jtop  # Monitor GPU/CPU usage
   ```

### JetPack 5.x Not Supported

**Problem:** Python 3.8 compatibility issues on JetPack 5.x

**Solution:**

- Upgrade to JetPack 6.x or JetPack 7.0
- Or use Docker method which handles Python environment automatically

For more troubleshooting tips, see the [official troubleshooting guide](https://github.com/NVIDIA-AI-IOT/live-vlm-webui/blob/main/docs/troubleshooting.md).

---

## Additional Resources

- **GitHub Repository**: [https://github.com/NVIDIA-AI-IOT/live-vlm-webui](https://github.com/NVIDIA-AI-IOT/live-vlm-webui)
- **PyPI Package**: [https://pypi.org/project/live-vlm-webui/](https://pypi.org/project/live-vlm-webui/)
- **Full Documentation**: [https://github.com/NVIDIA-AI-IOT/live-vlm-webui/tree/main/docs](https://github.com/NVIDIA-AI-IOT/live-vlm-webui/tree/main/docs)
- **Docker Setup Guide**: [https://github.com/NVIDIA-AI-IOT/live-vlm-webui/blob/main/docs/setup/docker.md](https://github.com/NVIDIA-AI-IOT/live-vlm-webui/blob/main/docs/setup/docker.md)
- **Ollama Documentation**: [https://ollama.ai/](https://ollama.ai/)
- **NVIDIA Jetson AI Lab**: [https://www.jetson-ai-lab.com/](https://www.jetson-ai-lab.com/)
- **Jetson Containers**: [https://github.com/dusty-nv/jetson-containers](https://github.com/dusty-nv/jetson-containers)

**Community & Support:**

Issues, PRs, and feedback are welcome on the [GitHub repository](https://github.com/NVIDIA-AI-IOT/live-vlm-webui)!

If you find this project useful, please consider giving it a star on GitHub!

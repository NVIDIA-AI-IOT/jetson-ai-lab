---
title: "Graph-as-Policy for SO-101 on Jetson AGX Orin"
description: "Sort colored cubes with an SO-101 arm using a typed graph of perception, VLM reasoning, inverse kinematics, and verification skills running entirely on one Jetson AGX Orin."
author: "Kabilan KB"
date: "2026-11-28"
origin: "community"
source: "GitHub"
link: "https://kabilankb.github.io/so101-gap/"
image: "https://kabilankb.github.io/so101-gap/media/graph_run.gif"
featured: false
jetson: ["Jetson AGX Orin"]
tags: ["Physical AI", "Robotics", "SO-101", "Graph-as-Policy", "VLM"]
---

Run a complete Graph-as-Policy workflow for the LeRobot SO-101 on a single Jetson AGX Orin 64GB. The system combines MuJoCo simulation, Grounding DINO, SAM3, Nemotron-3-Nano-Omni, inverse kinematics, and a live graph viewer.

The project includes hand-written and locally generated policy graphs, measured cube-sorting results, Docker Compose deployment, and reproducible setup instructions for Jetson.

### Highlights

- Executes simulation, graph runtime, vision models, and a local VLM on one Jetson
- Generates task graphs from natural-language instructions with Nemotron
- Records node inputs and outputs for transparent, inspectable execution
- Demonstrates four-cube sorting and single-cube tasks with measured results

### Resources

- [Project page](https://kabilankb.github.io/so101-gap/)
- [GitHub repository](https://github.com/kabilankb/so101-gap)

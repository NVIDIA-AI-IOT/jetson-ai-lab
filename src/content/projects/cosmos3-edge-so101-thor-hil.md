---
title: "Cosmos3-Edge SO-101 on Jetson Thor"
description: "A hardware-in-the-loop robotics setup that serves a Cosmos3-Edge SO-101 action policy on Jetson AGX Thor and closes the loop with an Isaac Lab digital twin."
author: "Kabilan KB"
date: "2026-09-19"
origin: "community"
source: "GitHub"
link: "https://github.com/kabilankb/so101-cosmos-nano-policy/tree/cosmos-edge/edge/thor-hil"
image: "https://github.com/kabilankb/so101-cosmos-nano-policy/raw/cosmos-edge/edge/thor-hil/docs/webui.png"
featured: false
jetson: ["Jetson Thor"]
tags: ["Physical AI", "Robotics", "VLA", "Cosmos", "Isaac Lab"]
---

Run the Cosmos3-Edge SO-101 policy natively on Jetson AGX Thor while an Isaac Lab 3.0 digital twin supplies camera observations and executes the returned action chunks.

The project includes Thor setup and serving scripts, an Isaac Lab client, checkpoint management, and a web UI for launching the policy server and monitoring evaluation runs.

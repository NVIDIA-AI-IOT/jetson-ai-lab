# Content Management Guide

This guide explains how to manage content for Jetson AI Lab using Markdown, MDX, and JSON files. Content is data-driven, so most updates require no changes to layout code.

The authoritative schemas live in `src/content/config.ts`. This guide summarizes them; if the two ever disagree, `config.ts` wins. See also `CONTRIBUTING.md`, `TUTORIAL_TEMPLATE.md`, and `docs/jetson-matrix-and-run-modal.md`.

## File Structure

```
src/
├── content/
│   ├── home.json        # Home page content (hero, features, stats, featured models)
│   ├── models/          # Model pages (Markdown + frontmatter)
│   ├── tutorials/       # Tutorials, grouped in subfolders (Markdown/MDX)
│   ├── projects/        # Community project entries
│   └── gtc26/           # GTC workshop lab content
├── data/
│   ├── benchmarks.json  # Benchmark chart data (joined to models by benchmark_key)
│   └── categories.json  # Tutorial category display metadata
└── pages/               # Astro routes (including tutorial page wrappers)
```

Active content collections are `tutorials`, `models`, `projects`, and `gtc26`.

## Home Page (`src/content/home.json`)

Edit `src/content/home.json` to update the hero, feature cards, stats, and featured models. Changes appear automatically. Match the existing JSON shape, for example:

```json
{
  "hero": {
    "title": "Experience Generative AI on Jetson",
    "subtitle": "Run the latest AI models locally",
    "description": "Discover optimized models for Jetson devices..."
  },
  "featuredModels": [
    {
      "title": "Gemma 3n",
      "description": "Google's latest lightweight language model...",
      "badge": "NEW",
      "performance": {
        "tokensPerSecond": "25-35 tokens/s",
        "memoryUsage": "4GB RAM",
        "quantization": "4-bit (GPTQ)",
        "modelSize": "2.1GB"
      },
      "devices": ["Jetson Orin", "Jetson Xavier"],
      "link": "/models/gemma-3n"
    }
  ]
}
```

## Models (`src/content/models/`)

Each model is a Markdown file whose frontmatter drives the Model Details sidebar and the "Run on Jetson" UI. Required fields are `title`, `short_description`, and `precision`.

A model must also provide runnable content, or the build fails: supply `serving.entries` and/or `supported_inference_engines`, meaningful `one_shot_inference` commands, or set `hide_run_button: true`.

Example frontmatter:

```yaml
---
title: "Gemma 3 4B"
short_description: "Google's versatile 4 billion parameter model"
family: "Google Gemma3"
precision: "W4A16"
parameters: "4B"
modalities: ["Text", "Image"]
context_length: "128K"
license: "Gemma Terms of Service"
minimum_jetson: "Orin Nano"
supported_inference_engines:
  - engine: "Ollama"
    type: "Container"
    modules_supported: [thor_t5000, orin_agx_64, orin_nano_8]
    serve_command_orin: ollama pull gemma3:4b && ollama serve
    serve_command_thor: ollama pull gemma3:4b && ollama serve
---
```

To wire benchmark charts, set `benchmark_key` to match a `name` in `src/data/benchmarks.json`. A mismatch does not fail the build; the chart simply will not render, so confirm it on `/models/<slug>`.

For inference commands, the module matrix, benchmark wiring, and OOM/blocked handling, follow `docs/jetson-matrix-and-run-modal.md`.

## Tutorials (`src/content/tutorials/`)

A tutorial needs two files:

1. Content in `src/content/tutorials/<subfolder>/<slug>.md` (or `.mdx` for interactive components).
2. A page wrapper in `src/pages/tutorials/<slug>.astro` that passes the slug to `TutorialLayout`.

Required frontmatter is `title`, `description`, `category`, and `tags`. Include `authors` when adding or substantially updating a tutorial.

```yaml
---
title: "Ollama on Jetson"
description: "Install and run Ollama on your Jetson device."
category: "Fundamentals"
section: "Inference Engines"
order: 3
tags: ["ollama", "llm", "jetson"]
authors:
  - name: "Dustin Franklin"
    github: "dusty-nv"
---
```

Valid `category` values: `Text`, `Image`, `Audio`, `Applications`, `VLM`, `VLA`, `Fundamentals`, `Setup`, `Workshops`, `Model Optimization`. Optional fields include `section`, `order`, `model`, `featured`, `isNew`, and `hero_image`. Use `TUTORIAL_TEMPLATE.md` for the page wrapper pattern and MDX components (tabs, admonitions, Mermaid).

## Community Projects (`src/content/projects/`)

Each project entry requires `title`, `description`, `author`, `date`, `source` (one of `GitHub`, `Hackster`, `YouTube`, `NVIDIA`, `JetsonHacks`, `Medium`, `Seeed`, `Other`), and `link` (a full URL). Optional fields include `image`, `video`, `featured`, `tags`, and `jetson`.

## Assets

- Store images and media under `public/` and reference them with absolute paths (for example `/images/models/model.jpg`).
- Place downloadable scripts under `public/code-samples/` and link to them from the relevant tutorial.

## Development

Run the development server for a live preview:

```bash
npm run dev
```

Before opening a pull request, run a full production build. It runs schema validation across all collections, which the dev server alone does not:

```bash
npm run build
```

## Best Practices

- Follow the structure of existing files in the same collection.
- Write concise, informative descriptions and use consistent tags.
- Include working code examples and verify commands on the hardware you name.
- Use descriptive image names and meaningful alternative text.

---
name: jetson-ai-lab-code-samples
description: Place downloadable tutorial scripts under public/code-samples/ and link them from tutorial pages. Use when adding, moving, or linking downloadable scripts, assets, or code files for Jetson AI Lab tutorials.
license: Apache-2.0
compatibility: Requires Node.js and npm for optional build verification.
---

# Jetson AI Lab: tutorial scripts and `public/code-samples/`

## Purpose

Runnable **Python**, **shell**, and other assets that users **download or curl** from tutorials must live under the repo’s static asset tree:

**`public/code-samples/<topic-folder>/`**

Astro copies `public/` to the site root, so these files are served at:

**`https://www.jetson-ai-lab.com/code-samples/<topic-folder>/<file>`**

(path **`/code-samples/...`** on the deployed site).

Do **not** use a folder named `code-sample` (singular) or skip `public/` for files meant to be fetched by users from the live site.

---

## Layout (existing examples)

Group files by tutorial or feature area (kebab-case folder names, consistent with the repo today):

| Folder | Example files |
|--------|----------------|
| `public/code-samples/finetune/` | `full_sft_finetuning.py`, `lora_finetuning.py`, `qlora_finetuning.py` |
| `public/code-samples/openclaw-orin-nano/` | `setup-openclaw-orin-nano.py`, `endurance-test.py`, `multi-agent-debate.py` |
| `public/code-samples/openpi_on_thor/` | `download.sh`, `build_engine.sh`, `pytorch_to_onnx.py`, Dockerfiles, etc. |

List the current tree with your OS or `git ls-files public/code-samples` before adding new paths.

---

## What to do

1. **Add** new scripts or small assets under the appropriate **`public/code-samples/<topic>/`** directory (create the directory if it is new).
2. **Reference** them from tutorial MD/MDX using either:
   - **Production URL:** `https://www.jetson-ai-lab.com/code-samples/<topic>/<filename>`  
     Example in repo: `src/content/tutorials/model-optimization/finetune-on-jetson.mdx` (wget lines for `full_sft_finetuning.py`, etc.).
   - **Raw GitHub URL** (for `curl | bash` or pipe-to-python):  
     `https://raw.githubusercontent.com/NVIDIA-AI-IOT/jetson-ai-lab/main/public/code-samples/<topic>/<filename>`  
     Example in repo: `src/content/tutorials/applications/openclaw.md`, `src/content/tutorials/vla/openpi_on_thor.md`.

3. **Prefer** keeping long scripts in **`public/code-samples/`** and linking them—avoid embedding huge scripts only inside MDX unless there is a strong reason.

---

## What not to do

- Do not put user-downloadable tutorial scripts under `src/` alone (they would not be served at `/code-samples/...` unless additionally copied to `public/`).
- Do not invent alternate roots like `static/code-sample/` for this site’s conventions.

---

## Verification

After adding or moving files under `public/code-samples/`:

1. Run **`npm run build`** from the repository root (see skill **`jetson-ai-lab-verify-build`**).
2. Optionally run the dev server and open `/code-samples/<topic>/<file>` locally to confirm the file is served.

---

## Source of truth

| Item | Path |
|------|------|
| Asset root | `public/code-samples/` |
| Finetune tutorial links | `src/content/tutorials/model-optimization/finetune-on-jetson.mdx` (~lines 107–110 for wget URLs) |
| OpenClaw raw GitHub links | `src/content/tutorials/applications/openclaw.md` |
| OpenPI Thor links | `src/content/tutorials/vla/openpi_on_thor.md` |

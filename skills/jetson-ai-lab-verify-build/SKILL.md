---
name: jetson-ai-lab-verify-build
description: Run npm run build on jetson-ai-lab and triage Astro content collection / MDX / model frontmatter / benchmarks.json failures after edits. Use when verifying the site builds after content, model, tutorial, benchmark, or asset changes.
license: Apache-2.0
compatibility: Requires Node.js and npm. Run from the repository root where package.json lives.
---

# Jetson AI Lab: verify the build

## When to run

Run a full static build **after** any change to:

- `src/content/models/*.md` (model catalog frontmatter / Run / Serve / one-shot)
- `src/content/tutorials/**/*.{md,mdx}`
- `src/content/projects/**`, `src/content/gtc26/**`, or any other `src/content/` collection
- `src/data/benchmarks.json` (benchmark numbers by model slug)
- `public/` (including `public/code-samples/`)

When writing or editing tutorials, include `authors` in frontmatter.

## Command

From the **repository root** (where `package.json` and `astro.config.mjs` live):

```bash
npm run build
```

Resolve all errors before merging. The dev server alone is **not** enough for content-schema issues — the production build is what runs Zod validation across all collections.

---

## Common failures

### Models collection (Zod / `superRefine`)

If you see an error path on **`supported_inference_engines`** or a message like:

> Provide supported_inference_engines and/or serving.entries (non-empty), one_shot_inference commands, or set hide_run_button: true.

Fix the offending file in **`src/content/models/`** per skill **`jetson-model-catalog-inference`**: provide either `serving.entries`, `supported_inference_engines`, a meaningful `one_shot_inference`, or set `hide_run_button: true`.

### Models collection (other Zod errors)

Other typical model-page schema failures:

- `Invalid url` on `huggingface_url` / `build_nvidia_url` → must be a full `https://...` URL, not a slug.
- `Required` on `title`, `short_description`, or `precision` → these three are the only top-level required fields.
- Type errors on `modalities` / `matrix_modules_disabled` → these must be **arrays of strings**, not comma-separated text.

### Benchmark data errors

`src/data/benchmarks.json` is checked while the site builds (schema in `src/lib/benchmarks.ts`). The error names the bad path, e.g. `qwen3-5-4b.thor.vLLM.MTP.throughput.c1: Expected number`, or a slug with no page in `src/content/models/`.

### MDX / Astro parse errors

Tutorial files under `src/content/tutorials/` are MDX. Common parse failures:

- Unescaped `$` or `{}` inside HTML tags mixed with Markdown can break the MDX parser. Keep shell variables **inside fenced code blocks** when possible, or use HTML entities.
- Stray `<` characters in inline prose are interpreted as JSX tag opens.

### Missing assets

Broken links to `/code-samples/...` usually mean the file is missing under **`public/code-samples/`** — see skill **`jetson-ai-lab-code-samples`**.

---

## Source of truth

| Item | Path |
|---|---|
| Build script | `package.json` (`scripts.build`) |
| Astro config | `astro.config.mjs` |
| Model validation | `src/content/config.ts` (`models` collection `superRefine`) |
| Benchmark data file | `src/data/benchmarks.json` |
| Model catalog skill | `skills/jetson-model-catalog-inference/SKILL.md` |
| Code samples skill | `skills/jetson-ai-lab-code-samples/SKILL.md` |

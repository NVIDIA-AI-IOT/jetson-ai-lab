---
name: jetson-model-catalog-inference
description: Configure Jetson AI Lab model pages — frontmatter for the Model Details sidebar (parameters, modalities, context length, license, precision pills), the Run on Jetson serve/call/one-shot UI, the three "block" levers (hide_run_button, matrix_modules_disabled, per-engine modules_supported), and the join to src/data/benchmarks.json (benchmark_key, benchmark_series, OOM vs DNR vs null). Use when adding or editing model pages, inference engines, serve/run commands, one-shot blocks, the details sidebar, benchmark wiring, or deciding whether to mark a Jetson module as OOM, blocked, or simply untested.
license: Apache-2.0
compatibility: Requires Node.js and npm for build verification of model schema changes.
---

# Jetson AI Lab: model catalog page configuration

## Reality check

- **Jetson AI Lab** is a **static Astro site**. It does **not** host inference APIs. Users copy commands from the site and run them on a Jetson (or other machine).
- Model pages are **Markdown files** in the Astro content collection **`models`**: `src/content/models/<slug>.md`.
- The file **`slug`** (filename without `.md`) becomes the URL segment: published route **`/models/<slug>`** (see `src/pages/models/[slug].astro`).
- Almost every visible element on a model page is driven by **YAML frontmatter** in that file (Hero, Model Details sidebar, Run on Jetson tabs, Call snippets, one-shot tabs, Benchmark chart). Body Markdown only fills the bottom **Model Details** prose section.

Do **not** invent a base URL for "the Jetson AI Lab inference API" — there isn't one.

---

## Page anatomy (top-to-bottom)

| Section | Driven by | Component / file |
|---|---|---|
| Hero (title, badges, "Command to Run on Jetson" / "Benchmark" / "Model Details" chips) | `title`, `is_new`, `type`, `short_description`, presence of engines and `benchmark_key` | `src/pages/models/[slug].astro` |
| Specs sidebar (Parameters, Modalities, Context Length, License, Precision pills) | `parameters` (or `model_size`), `modalities` (or `vision_capable`), `context_length`, `license`, `precision` (per-token) | `src/pages/models/[slug].astro` L137–193 |
| **Run on Jetson** → Serve matrix | `serving.entries` (preferred) or `supported_inference_engines`, plus `matrix_modules_disabled` | `ModelServeSection.astro` |
| Call the model | `client_call.{shell,python,intro}` (or auto-built from engines + `hf_checkpoint`) | `ModelCallSection.astro` |
| One-shot inference (per-module tabs) | `one_shot_inference.*` | `ModelOneShotSection.astro` + `src/lib/evalRunModal.ts` |
| Benchmark chart | `benchmark_key` (+ optional `benchmark_series`) → joins `src/data/benchmarks.json` | `ModelBenchmarkSection.astro` |
| Model Details prose + external links (`Try on build.nvidia.com`, `View on HuggingFace`) | Body Markdown + `build_nvidia_url`, `huggingface_url` (or `hf_checkpoint`) | `src/pages/models/[slug].astro` L242–289 |

---

## Frontmatter reference

Every model page is driven by its YAML frontmatter. Validation lives in **`src/content/config.ts`** (`modelsSchema`).

### Always-include tags

Either schema-required (build fails without them) or used by every model in the repo. Include all when adding a new model.

| Tag | Schema | What it does |
|---|---|---|
| `title` | **required** | Display name on the model page and catalog cards. |
| `short_description` | **required** | One-line summary in the catalog grid and Hero subtitle. |
| `precision` | **required** | Slash-or-comma separated quant tokens (e.g. `"NVFP4 / FP8 / Q4_K_M GGUF"`). Each token renders as a colored pill in the sidebar (`precisionPill` in `[slug].astro`). |
| `family` | optional but ubiquitous | Groups models in the catalog. Special value `"Google Gemma4"` triggers the Gemma 4 tutorial CTA banner above the prose. |
| `model_id`, `icon`, `catalog_added_at`, `order`, `type`, `hf_checkpoint`, `huggingface_url`, `minimum_jetson` | optional but expected | Catalog card / hero / external links. New model files must set `catalog_added_at: YYYY-MM-DD`; `is_new` is retained only for legacy entries. `huggingface_url` falls back to `https://huggingface.co/${hf_checkpoint}` when omitted. |

### Model Details sidebar tags (drive the dark spec card on the right of the Hero)

Skipping these causes the row to disappear from the sidebar (no error, just less polish).

| Tag | Sidebar row | Notes |
|---|---|---|
| `parameters` (or fallback to `model_size`) | "Parameters" | Free text, e.g. `"~9B"` or `"30B total / 3B active"`. |
| `modalities: [...]` | "Modalities" | Array of `"Text" \| "Image" \| "Audio" \| "Video"` — each renders with an icon. If omitted, falls back to `vision_capable` (Yes → "Text, Image", No → "Text"). |
| `vision_capable` (boolean) | (fallback for Modalities) | Set explicitly even when `modalities` is present — used elsewhere for catalog filters. |
| `context_length` | "Context Length" | Free text, e.g. `"128K"`, `"262K"`. |
| `license` | "License" | Free text, e.g. `"Apache 2.0"`, `"NVIDIA Open Model License"`. |
| `model_size` | (fallback for Parameters) | e.g. `"12GB"`. |
| `memory_requirements` | not shown in sidebar but used by other UI | e.g. `"16GB RAM"`. |

### Situational tags

Only add these when the model needs them.

| Tag | When to use | Repo usage |
|---|---|---|
| `build_nvidia_url` | Model has an NVIDIA Build page → adds the **Try on build.nvidia.com** button. | ~67% of models |
| `matrix_modules_disabled` | Some matrix module tabs should be grayed out / non-clickable for **every engine** of this model. | ~10% of models |
| `hide_run_button` | Hide the **entire** Run on Jetson UI (Serve + Call + one-shot) even when engine data is present. | ~5% of models |
| `benchmark_key` | Model has measured perf in `src/data/benchmarks.json`. Value must equal the `name` field of that benchmarks entry. | ~30% of models |
| `benchmark_series: [...]` | Show extra side-by-side comparison bars (e.g. compare against the previous generation of the same family). Each value is another `name` from `benchmarks.json`. | A handful |

### Inference blocks (at least one required unless `hide_run_button: true`)

| Block | Purpose |
|---|---|
| `serving.entries` | **New-style engine list — preferred for new models.** Overrides `supported_inference_engines` in the UI when non-empty. |
| `supported_inference_engines` | Legacy engine array. Still works and is the most common shape today. |
| `one_shot_inference` | One-shot run commands (shell/python/per-module variants). Renders a separate "One-shot inference" tabbed section below Call. |
| `client_call.{shell,python,intro}` | Optional override for the **Call the model** snippet. If omitted, the page auto-builds a curl example from engine commands and `hf_checkpoint`. |

---

## Run on Jetson: the three "block" levers (when to OOM vs hide vs gray)

These are **layered**. The serve matrix evaluates them in this order:

1. **`hide_run_button: true`** (frontmatter, top-level)
   - Hides the **entire** Run on Jetson section (Serve + Call + one-shot).
   - Use when the model exists in the catalog but is not yet launchable from the site (e.g. requires NGC download, gated checkpoint, pending validation).
   - Example: `src/content/models/cosmos-reason2-8b.md` — keeps engine data for documentation, but the run UI stays hidden.

2. **`matrix_modules_disabled: [moduleId, ...]`** (frontmatter, top-level)
   - Grays out the listed module tabs **across all engines** for this model. Tab is shown but not clickable.
   - Use when a Jetson module is theoretically possible but **not validated yet** for this model.

3. **`engines[].modules_supported: [moduleId, ...]`** (per-engine, inside `serving.entries[]` or `supported_inference_engines[]`)
   - Allowlist: only listed module ids are enabled **for that engine**. Cells outside the list show grayed for that engine row.
   - Omit the field entirely → engine supports all matrix modules. An empty array means the engine supports nothing (rare).
   - Use when the model runs everywhere but a specific engine only works on a subset (e.g. vLLM Thor-only, Ollama Orin+Thor).

**OOM is a different concept and lives in `src/data/benchmarks.json` — see [Benchmarks](#benchmarks-data) below.**

| You want to express… | Use… |
|---|---|
| "This model isn't ready to be run from the site at all" | `hide_run_button: true` |
| "This model can't run on Orin Nano (any engine)" | `matrix_modules_disabled: [orin_nano_8]` |
| "vLLM only works on Thor for this model; llama.cpp works everywhere" | `vLLM` entry: `modules_supported: [thor_t5000, thor_t4000]`; omit on `llama.cpp` |
| "We benchmarked this and it ran out of memory on T4000" | Add `"oom": ["t4000"]` to that quant in `benchmarks.json` (does **not** belong in model frontmatter) |
| "We benchmarked this and the model just doesn't run on Orin Nano" | Add `"dnr": ["orin_nano_8gb"]` to that quant in `benchmarks.json` |
| "We haven't measured this combination yet" | Set the value to `null` in `benchmarks.json`. No marker is drawn; the bar is just absent. |

---

## Inference data: serve matrix (engines)

Engine list is built by **`getSupportedInferenceEngines`** in `src/lib/modelFrontmatterAdapter.ts`:

- If `serving.entries` is present and non-empty → those entries are used (preferred for new work).
- Otherwise `supported_inference_engines` (legacy array) is used.

Each engine row maps to **`SupportedEngineEntry`** in `src/lib/inferenceCommands.ts`. Prefer:

- **`serve_command_orin`** / **`serve_command_thor`** for long-running serve commands (vLLM, Ollama, etc.).
- Legacy `run_command_orin` / `run_command_thor` are **deprecated** but still accepted as fallbacks.

Optional fields:

- **`modules_supported`** — see [block lever #3](#run-on-jetson-the-three-block-levers-when-to-oom-vs-hide-vs-gray) above.
- **`run_commands_by_module`**: per-cell override map `{ moduleId: command }` for Run matrix cells.
- **`install_command`** / **`install_command_orin`** / **`install_command_thor`**: prefixed as `# Installation` block above the serve command.

**Engine display order is fixed** by `sortEnginesForUi` in `modelFrontmatterAdapter.ts`: **vLLM → SGLang → llama.cpp → Ollama → Edge-LLM → everything else (alphabetical)**. Don't try to control order from frontmatter.

### Canonical Jetson module ids

Defined in **`JETSON_MATRIX_MODULES`** in `src/lib/inferenceCommands.ts`. Use these exact ids in `modules_supported` / `matrix_modules_disabled` / `one_shot_inference.modules_supported`.

| Module id | Matrix tab? | Platform |
|---|---|---|
| `thor_t5000` | Yes | thor |
| `thor_t4000` | Yes | thor |
| `orin_agx_64` | Yes | orin |
| `orin_nx_16` | Yes | orin |
| `orin_nano_8` | Yes | orin |
| `orin_agx_32` | data-only (no tab) | orin |
| `orin_nx_8` | data-only (no tab) | orin |
| `orin_nano_4` | data-only (no tab) | orin |

"Data-only" ids (`showInMatrixUi: false`) are valid frontmatter and resolve commands by `platformKey`, but no Serve/Run matrix tab is shown. Don't invent new ids — extending the list requires a code change in `JETSON_MATRIX_MODULES`.

**Examples in repo:**

- `serving.entries` (new style): `src/content/models/ministral3-8b-reasoning.md`
- Legacy `supported_inference_engines` with rich per-engine `modules_supported`: `src/content/models/nemotron-3-nano-omni.md`
- `hide_run_button: true`: `src/content/models/cosmos-reason2-8b.md`

---

## One-shot inference

Optional frontmatter block **`one_shot_inference`** (schema in `src/content/config.ts`). Fields:

- `run_command_orin`, `run_command_thor` — single-command run per platform.
- `shell`, `python` — non-platform-specific snippets.
- `shell_by_module`, `python_by_module` — per-module override maps keyed by canonical module id.
- `modules_supported` — restrict which module tabs appear.
- `intro` — optional Markdown intro shown above the tabs.

Visibility: **`ModelOneShotSection.astro`** shows the section when **at least one** of the above command fields is non-empty (`hasContent` check).

Snippet/module resolution lives in **`src/lib/evalRunModal.ts`** (see `evalSnippetByModule`, `evalMatrixModuleSpecs`).

---

## Call the model (`client_call`)

Optional frontmatter block — overrides the auto-generated curl example shown in **Call the model**.

```yaml
client_call:
  intro: "Once the server is up:"
  shell: |-
    curl -s http://${JETSON_HOST}:8080/v1/chat/completions \
      -H "Content-Type: application/json" \
      -d '{ "model": "my_model", "messages": [{"role":"user","content":"hi"}] }'
  python: |-
    import openai
    ...
```

Omit `client_call` entirely to let `ModelCallSection.astro` synthesize an example from `hf_checkpoint` and the first engine's serve command.

---

## Benchmarks data

Benchmark numbers do **not** live in model frontmatter. They live in **`src/data/benchmarks.json`** under `models[]`. The model page joins via the frontmatter field `benchmark_key`, which must match `models[].name` exactly.

### Adding benchmark data

1. Add an entry to `models[]` in `src/data/benchmarks.json`:

```json
{
  "family": "Family Name",
  "name": "Exact Name (this is the join key)",
  "releaseDate": "YYYY-MM-DD",
  "capabilities": { "language": true, "vision": false, "audio": false, "vla": false },
  "isl": 2048,
  "osl": 128,
  "engines": {
    "vLLM": {
      "NVFP4": {
        "concurrency1": { "t5000": 63.3, "t4000": 51.8, "agx_orin_64gb": null, "orin_nx_16gb": null, "orin_nano_8gb": null, "dgx_spark": 59.6 },
        "concurrency8": { "t5000": 181.2, "t4000": 147.4, "agx_orin_64gb": null, "orin_nx_16gb": null, "orin_nano_8gb": null, "dgx_spark": 191.2 }
      },
      "FP8": {
        "concurrency1": { "t5000": 54.7, "t4000": null, "agx_orin_64gb": null, "orin_nx_16gb": null, "orin_nano_8gb": null, "dgx_spark": 52.3 },
        "concurrency8": { "t5000": 129.8, "t4000": null, "agx_orin_64gb": null, "orin_nx_16gb": null, "orin_nano_8gb": null, "dgx_spark": 138.6 },
        "oom": ["t4000"]
      }
    },
    "Ollama": {
      "Q4_K_M": {
        "concurrency1": { "t5000": 27, "t4000": null, "agx_orin_64gb": 17, "orin_nx_16gb": null, "orin_nano_8gb": null, "dgx_spark": null },
        "concurrency8": { "t5000": 28, "t4000": null, "agx_orin_64gb": 17, "orin_nx_16gb": null, "orin_nano_8gb": null, "dgx_spark": null },
        "oom": ["orin_nx_16gb", "orin_nano_8gb"]
      }
    }
  }
}
```

2. In the model frontmatter add:

```yaml
benchmark_key: "Exact Name (this is the join key)"
benchmark_series:
  - "Predecessor Family Name"   # optional — overlays comparison bars
```

### Benchmark product ids ≠ matrix module ids (critical gotcha)

The benchmark axis uses different ids than the Run/Serve matrix:

| Hardware | Matrix module id (frontmatter) | Benchmark product id (`benchmarks.json`) |
|---|---|---|
| Jetson Thor T5000 | `thor_t5000` | `t5000` |
| Jetson Thor T4000 | `thor_t4000` | `t4000` |
| Jetson AGX Orin 64GB | `orin_agx_64` | `agx_orin_64gb` |
| Jetson Orin NX 16GB | `orin_nx_16` | `orin_nx_16gb` |
| Jetson Orin Nano 8GB | `orin_nano_8` | `orin_nano_8gb` |
| DGX Spark GB10 | _(not in matrix)_ | `dgx_spark` |

Use the right ids for the right file. Don't paste matrix ids into `benchmarks.json` or vice versa.

### `oom` vs `dnr` vs `null` (per-quant markers)

Inside any `engines[engine][quant]` you may add either array; both expect **benchmark product ids**:

| Marker | Frontmatter shape | UI rendering | Use when |
|---|---|---|---|
| Numeric value | `"t5000": 63.3` | Real bar at that value | We measured throughput. |
| `null` value | `"t5000": null` | No marker, no bar (label grayed) | We haven't measured this combo yet. |
| `"oom": [productId, ...]` | Sibling of `concurrency1` / `concurrency8` | Small green-tinted **OOM** pill in place of the bar | We attempted the run and it OOM'd. Soft failure — keep visible to communicate "tried, ran out of memory". |
| `"dnr": [productId, ...]` | Sibling of `concurrency1` / `concurrency8` | Red **✕** in place of the bar | Hard failure — model genuinely cannot run on this hardware (architectural / driver / unsupported precision). |

Rule of thumb: **OOM = "the box was the wrong size", DNR = "the box was the wrong shape", null = "we didn't try the box".**

OOM and DNR are read by `ModelBenchmarkSection.astro` (lines ~494–516). They have **no effect** on the Serve / Run matrix above — that only respects `hide_run_button` / `matrix_modules_disabled` / per-engine `modules_supported`.

### Comparison series (`benchmark_series`)

Each value in the array must be another `models[].name` from `benchmarks.json`. The page page renders them as paler bars next to the main model and auto-links them to the corresponding `/models/<slug>#model-benchmark` page when one exists.

---

## Discoverability artifacts (`/llms.txt`, `/llms-full.txt`)

Two text routes surface the model catalog to external clients (search agents, LLMs, plain `curl` consumers). **Both are auto-generated from the content collection at build time — adding a model page is enough; no manual index edit required.**

| Route | Source file | What it contains |
|---|---|---|
| `/llms.txt` | `src/pages/llms.txt.ts` | Short index. Curated tutorial header (static template literal) + auto-generated **Supported Models** section grouped by vendor. Models grouped by `family` per `MODEL_SECTIONS`, sorted by frontmatter `order`. |
| `/llms-full.txt` | `src/pages/llms-full.txt.ts` | Full long-form index. Iterates tutorials and models, emits documentation plus normalized serving commands, per-engine module support, one-shot commands, and explicit client-call examples. |

**When you add a new model:**

1. Set `family` to one of the existing families listed in `MODEL_SECTIONS` (in `src/pages/llms.txt.ts`). The model lands in the right section automatically.
2. Set `short_description` clearly — it is the line text rendered in `/llms.txt`.
3. Set `order` if you want a specific position within the family (lower = higher in the list).

**When you introduce a brand-new vendor / family** (no existing entry matches): edit `MODEL_SECTIONS` in `src/pages/llms.txt.ts` to add a new section and list its `family` values. Without this edit the new model still appears, but in a fallback `### Other Models` section at the bottom.

There is no static `public/llms.txt` — the dynamic route lives at `src/pages/llms.txt.ts`. Don't reintroduce a static file; Astro would let it shadow the route silently.

---

## Validation (build will fail if wrong)

`src/content/config.ts` `superRefine` on the models collection (skipped when `hide_run_button: true`):

You must provide **at least one** of:

1. Non-empty **`serving.entries`**, or
2. Non-empty **`supported_inference_engines`**, or
3. **`one_shot_inference`** with at least one **trimmed** non-empty command among `run_command_orin`, `run_command_thor`, `shell`, `python`, or values inside `shell_by_module` / `python_by_module`.

Otherwise Zod reports a custom error on `supported_inference_engines`:

> Provide supported_inference_engines and/or serving.entries (non-empty), one_shot_inference commands, or set hide_run_button: true.

---

## Checklist before you finish

- [ ] Required model fields present (`title`, `short_description`, `precision`).
- [ ] Sidebar fields filled where applicable (`parameters`, `modalities` or `vision_capable`, `context_length`, `license`, `memory_requirements`).
- [ ] Either `serving.entries` **or** `supported_inference_engines` **or** meaningful `one_shot_inference`, **or** `hide_run_button: true`.
- [ ] `serve_command_*` preferred over deprecated `run_command_*` for serve flows.
- [ ] All matrix ids in `modules_supported` / `matrix_modules_disabled` / `one_shot_inference.modules_supported` are from `JETSON_MATRIX_MODULES`.
- [ ] If `benchmark_key` is set, it exactly matches a `models[].name` in `src/data/benchmarks.json`. All product ids in `concurrency*` / `oom` / `dnr` arrays are valid benchmark product ids (not matrix ids).
- [ ] OOM vs DNR vs null chosen per the [marker semantics](#oom-vs-dnr-vs-null-per-quant-markers) above.
- [ ] `family` is set to a value listed in `MODEL_SECTIONS` (`src/pages/llms.txt.ts`). If the family is brand-new (new vendor), add a section to `MODEL_SECTIONS` so `/llms.txt` groups it correctly.
- [ ] Run **`npm run build`** (see skill **`jetson-ai-lab-verify-build`**).

---

## Source of truth (repo files)

| Purpose | Path |
|---|---|
| Model schema + Zod validation | `src/content/config.ts` (`modelsSchema.superRefine`) |
| Frontmatter → engine list adapter | `src/lib/modelFrontmatterAdapter.ts` (`getSupportedInferenceEngines`, `servingEntryToSupportedEngine`, `sortEnginesForUi`) |
| Engine types, matrix module ids, serve/run helpers | `src/lib/inferenceCommands.ts` (`SupportedEngineEntry`, `JETSON_MATRIX_MODULES`, `JETSON_MATRIX_TAB_MODULE_IDS`, matrix helpers) |
| Model page layout (Hero, sidebar, sections) | `src/pages/models/[slug].astro` |
| Serve matrix UI | `src/components/ModelServeSection.astro` |
| Call / client examples | `src/components/ModelCallSection.astro` |
| One-shot UI | `src/components/ModelOneShotSection.astro` |
| One-shot snippet logic | `src/lib/evalRunModal.ts` |
| Benchmark chart UI (OOM / DNR rendering) | `src/components/ModelBenchmarkSection.astro` |
| Benchmark data file | `src/data/benchmarks.json` |
| `/llms.txt` short index (auto-generated, vendor-grouped) | `src/pages/llms.txt.ts` (edit `MODEL_SECTIONS` for new vendors) |
| `/llms-full.txt` long-form index (auto-generated) | `src/pages/llms-full.txt.ts` |

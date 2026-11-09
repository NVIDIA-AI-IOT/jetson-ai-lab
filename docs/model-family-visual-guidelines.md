# Model-family shader design guidelines

This document is normative for every new model-family visual. It applies to human contributors and coding agents.

## Non-negotiable rules

1. **Research first-party material first.** Record official product pages, repositories, launch art, and brand assets in `officialReferences`. Do not derive identity from search thumbnails or third-party fan art.
2. **Keep identity and decoration separate.** Official logos remain separate image assets or accessible HTML. A shader is background decoration and must not impersonate, redraw, or replace a logo.
3. **Follow an evidence hierarchy.** Prefer, in order: an official family mark and palette; first-party launch/key visuals; recurring first-party product imagery; explicitly documented model behavior; then architecture only when a primary technical source makes the feature distinctive. Do not turn a generic architectural property or a marketing slogan into a purported model identity.
4. **Translate the evidence into one mathematical grammar.** A launch image may contribute its crop, rhythm, palette, or spatial composition without being copied literally. A documented behavior may contribute an action horizon, probability field, temporal sequence, or another reproducible structure. “It looks futuristic” is not a rationale.
5. **Ship deterministic code, not authored illustration files.** WebGL2/GLSL must produce the active decorative artwork. A checked-in raster is permitted only as a deterministic snapshot fallback for WebGL failure, reduced-motion, or first paint; it is not an independent creative master.
6. **Expose meaningful parameters.** Motion, geometry, density, crop, and intensity controls must map to visible concepts. A slider must not merely add noise or increase brightness under a misleading label.
7. **Keep motion quiet and bounded.** Default live rendering is at most 20 fps, pauses off-screen, respects reduced-motion, and has a committed WebP fallback. Avoid fast looping, flashing, and large layout-dependent GPU costs.
8. **Design for text.** The left copy region must retain contrast. Check hero, catalog, 64 px, 48 px, and 32 px identity use.
9. **State non-claims.** Record what is not official, what is metaphorical, and which parts must never be presented as a company mark.
10. **Document the decision.** Every manifest entry must include the rationale fields below. `npm run check:model-visuals` rejects incomplete entries.
11. **Require human review.** New entries remain `prototype` until a human reviews crop, motion, provenance, brand separation, and performance.
12. **Keep production presentation editorial.** Runtime tuning controls belong to the prototype lab. Reviewed catalog intensity is set in `src/data/modelVisualPresentation.ts`; production pages expose only the shared Model visual On/Off preference.

## Asset and ownership boundary

Model-family visuals in this repository are an engineering implementation, not a channel for uploading independently authored campaign art, illustrations, generated-image experiments, or unofficial replacement logos.

- The checked-in shader and renderer are the source of truth. Every decorative hero or catalog image must be reproducible from repository code and recorded parameters.
- Commit only the WebP snapshots that the site actually loads when WebGL is unavailable or before the first live frame. Do not commit candidate grids, rejected explorations, unused generation variants, strips, motifs, SVG intermediates, or hand-tuned raster masters.
- Decorative SVG exports are not shipping masters. If a visual can be expressed by the live shader, do not keep a parallel SVG interpretation in `public/`.
- Identity is separate from decoration. Do not reconstruct, trace, approximate, or invent a partner logo. If no approved first-party identity asset is available, render the provider/model name as text and omit the icon.
- A third-party official mark may be checked in only when its first-party source and usage basis are recorded, it is kept unmodified, and review confirms that local redistribution is appropriate. Its copyright and trademark remain with the owner and it is not covered by this repository's open-source license. A source URL alone is not redistribution permission.
- Do not hotlink production identity assets. External URLs change, leak requests to third parties, create availability dependencies, and do not solve licensing. Until a locally distributable official asset is approved, use text rather than a remote image.
- The manifest must distinguish `official` identity assets from procedural decoration and record the generator for every fallback. Terms such as `generated-companion` must not be used for logo-like substitutes.

This boundary does not claim that program output is legally non-creative. It establishes that the shipped visuals are reproducible UI code and deterministic runtime/fallback output, while brand assets remain separately governed third-party material.

## Required manifest rationale

```json
"designRationale": {
  "officialBasis": "First-party palette, mark, or launch-art observations.",
  "modelConcept": "The actual model behavior or architecture being represented.",
  "visualTranslation": "How that concept becomes deterministic geometry and motion.",
  "nonClaims": "What is decorative, unofficial, or intentionally not represented.",
  "generator": "The checked-in shader or procedural generator path."
}
```

All five values must be non-empty. The generator must exist in the repository. The entry must also include at least one first-party `officialReference`, explicit asset paths, a review status, renderer revision, runtime frame cap, and fallback behavior.

## Required workflow

1. Add or update the family in `artwork/model-family-visuals/manifest.json` before polishing pixels.
2. Add the shader under `src/shaders/` and register it in `ModelShaderCanvas.astro`.
3. Add the complete numeric preset to `src/data/modelShaderDefaults.json`, map its fallback assets in `src/data/modelVisuals.ts`, and add parameter controls to `/model-visuals-prototype/`. Models using a multi-variant family must declare both `visual_family` and `visual_variant`; do not infer either from `family`, title, or slug. Runtime pages, deterministic captures, and benchmarks must consume the shared preset rather than repeat numeric defaults.
4. Generate independent 1920×720 hero and 960×540 WebP fallbacks from the same shader and parameters used at runtime.
5. Run `npm run check:model-visuals`, `npm run build:model-visuals`, and `npm run build`.
6. Run the shader benchmark described below and compare the result with the checked-in reference baseline.
7. Inspect live and fallback versions. Record any intentional performance exception such as a different resolution scale.

## Runtime performance contract

A live family visual is decorative UI, not the primary workload. It must remain inexpensive when the browser shares a Jetson GPU with model inference. Every new shader and every material shader revision must therefore be measured, not approved from visual inspection alone.

### Reproducible shader benchmark

Use the checked-in WebGL2 timer-query harness:

```bash
npm run benchmark:model-shaders
```

Muse Glimmer and Ministral 3 use layered FBO plus instanced-geometry renderers and must be measured through the real model pages:

```bash
BENCHMARK_BASE_URL=http://10.110.51.105:8084 \
  npm run benchmark:layered-shaders
```

On a Linux workstation, run Chromium through a hardware-accelerated desktop session. The X299 reference command is:

```bash
DISPLAY=:0 XAUTHORITY=/run/user/1000/gdm/Xauthority \
  npm run benchmark:model-shaders
```

The harness renders each current default at a 1920×720 CSS target, draws only the rightmost 76% used by the shipping canvas, applies its configured internal resolution scale, performs warm-up draws, and measures 40 draws with `EXT_disjoint_timer_query_webgl2`. Run it at least three times and use the median. Save or report:

- date, GPU/device, driver, browser, and the printed WebGL renderer;
- shader revision, generation preset, internal resolution scale, and rendered megapixels;
- median GPU milliseconds per rendered frame and milliseconds per megapixel;
- configured frame cap and estimated shader duty (`GPU ms/frame × frames/second ÷ 10` percent);
- whether the renderer is the expected hardware GPU. Results from SwiftShader or another software renderer are invalid.

Do not compare results taken at different scales as if they represented shader complexity. Use GPU milliseconds per frame for the actual shipping cost and milliseconds per megapixel to detect expensive shader logic.

The timer query measures WebGL command execution only. It does **not** include CSS `filter: blur()`, layer composition, layout, paint, image fallback decoding, or other page work. When `soft_focus` is nonzero, also record a browser Performance trace with the blur enabled and disabled. Inspect the complete model page, not only an isolated canvas.

### Performance budgets

These are provisional budgets for one visible hero. A model page normally has only one live family canvas.

| Check | Preferred | Review required | Reject or redesign |
| --- | ---: | ---: | ---: |
| Internal render area at 1920×720 CSS size | ≤ 0.90 MP | 0.90–1.38 MP | > 1.38 MP |
| Reference RTX shader time | ≤ 0.10 ms/frame | 0.10–0.25 ms/frame | > 0.25 ms/frame |
| Reference RTX normalized cost | ≤ 0.15 ms/MP | 0.15–0.25 ms/MP | > 0.25 ms/MP |
| Target-device total GPU time, including composition | ≤ 2.5 ms/render | 2.5–5 ms/render | > 5 ms/render |
| Target-device estimated GPU duty at the shipping frame cap | ≤ 5% | 5–10% | > 10% |
| Shipping frame cap | 12–15 fps for slow fields | 20 fps when motion needs it | > 20 fps |

“Review required” is not an automatic failure. It requires a written visual reason and evidence that the same result cannot be achieved with a smaller canvas, lower resolution, lower frame cap, or cheaper algorithm. A result in the reject column must be optimized or use a static fallback before review.

The target-device test should use the slowest representative device available for the intended experience, hardware-accelerated Chromium, the actual model page, a 1920×720 hero at device-pixel-ratio 1, and stable power/thermal conditions. Record both an idle-browser run and, when practical, a run while the advertised model workload is active. The latter detects GPU contention that a workstation microbenchmark cannot expose.

### Current X299 reference baseline

Measured 2026-10-21 on an NVIDIA RTX 6000 Ada Generation with Chromium/ANGLE, using the current defaults and the median of four repeated runs:

The current implementation was independently re-run on 2026-10-22 and reproduced this baseline. The complete environment, commands, metrics, and measured values are recorded in [`model-family-shader-benchmark-2026-10-22.md`](./model-family-shader-benchmark-2026-10-22.md).

| Family shader / preset | Scale | Rendered MP | GPU ms/frame | GPU ms/MP | Status |
| --- | ---: | ---: | ---: | ---: | --- |
| Muse Glimmer | layered: 1.0× geometry / 0.10× background | 1.050 output | 0.031 | 0.029 | pass |
| Nemotron 3 | 1.00× | 1.050 | 0.079 | 0.076 | resolution exception; CSS blur excluded |
| Nemotron 3.5 | 1.00× | 1.050 | 0.037 | 0.036 | resolution exception; CSS blur excluded |
| Qwen 3 | 0.80× | 0.672 | 0.032 | 0.047 | pass |
| Qwen 3.5 | 0.80× | 0.672 | 0.031 | 0.047 | pass |
| Qwen 3.8 | 0.80× | 0.672 | 0.032 | 0.047 | pass |
| Ministral 3 | layered: 1.0× geometry / 0.5× background | 1.050 output | 0.020 | 0.020 | pass |
| Gemma 4 | 0.50× | 0.263 | 0.012 | 0.045 | pass |
| Meta Llama | 0.75× | 0.591 | 0.010 | 0.017 | pass |
| FLUX.3 Action | 0.75× | 0.591 | 0.010 | 0.016 | pass |
| Gemma 3 | 0.70× | 0.515 | 0.009 | 0.018 | pass |
| Cosmos 2 | 0.75× | 0.591 | 0.009 | 0.015 | pass |
| Cosmos 3 | 0.75× | 0.591 | 0.009 | 0.015 | pass |
| Liquid d1 | 0.75× | 0.591 | 0.007 | 0.012 | pass |
| gpt-oss | 1.00× | 1.050 | 0.006 | 0.006 | resolution exception; far-field early exit active |
| MiniMax | 0.75× | 0.591 | 0.006 | 0.010 | pass |

Run both harnesses with `npm run benchmark:all-model-shaders` (and set `BENCHMARK_BASE_URL` when the staged site is not at `http://127.0.0.1:4321`). This table is a regression baseline, not a prediction of Jetson performance. GPU timer queries exclude browser CSS compositing such as `filter: blur()`. Update it only after running the same harness and preserving the prior measurements in the change description.

### Optimization order

Apply optimizations in this order and remeasure after each material change:

1. Reduce the actual canvas bounds to the region containing artwork. The shared runner currently renders only the rightmost 76% while preserving the original full-width coordinate system. Returning black early still launches fragments; reduce this bound further only when the composition permits it.
2. Lower internal resolution. Fragment work changes approximately with the square of scale: 1.0→0.75 removes about 44% of pixels and 1.0→0.5 removes 75%.
3. Select the lowest visually adequate frame cap. Slow galaxies, waves, and mirror fields should normally use 12–15 fps.
4. Replace full-grid or all-edge searches with analytic indexing, spatial culling, or a small neighboring-candidate search. Avoid large nested loops per pixel.
5. Reuse computed geometry and noise; avoid repeated `sin` hashes, `exp`, `pow`, nearest-node scans, and trail loops when an analytic approximation is visually equivalent.
6. Prefer local `fwidth`/`smoothstep` antialiasing over whole-canvas blur. If blur is essential, use a low-resolution separable WebGL pass and measure it end to end; CSS blur is a separate compositor pass and is not free.
7. Preserve the existing off-screen pause, reduced-motion behavior, static fallback, and deterministic output. Never remove those protections to compensate for a heavier shader.

Muse Glimmer and Ministral 3 demonstrate the preferred layered solution for sparse, sharp geometry: background, dust, and halos render into a reduced-resolution FBO (0.10× for Muse and 0.5× for Ministral), while edges, nodes, signals, and rectangles use full-resolution instanced quads. The prototype exposes both Muse foreground resolution and the independent background scale for live visual comparison. Muse also keeps drift distance and drift speed independent: speed can be tested through 8× without enlarging the local node paths or changing signal cadence. On the RTX reference system, reducing Muse foreground geometry from 1.0× to 0.75× and 0.5× saved only about 7% and 10% respectively because instance upload, draws, and composition dominate; keep 1.0× as the shipping default unless target-device evidence justifies the visible loss. Nemotron's adaptive 3×3/5×5 candidate search and gpt-oss's coherent far-field early exit are additional examples to preserve.

The prototype also exposes a common `Dark overlay` presentation control for every family visual. It is a black DOM layer above the visual rather than shader arithmetic, so it can tune page contrast consistently without changing the procedural palette or WebGL timer result. Treat its browser-composition cost separately, just like CSS soft focus. For Ministral, reducing foreground geometry to 0.75× and 0.5× measured about 10% and 20% faster respectively, but the full-resolution default remains inexpensive at roughly 0.020 ms/frame and preserves the stepped boundaries.

## Current family decisions

- **Liquid AI d1:** three unequal input ribbons with different origins, widths, curves, and timing converge over a broad, edge-free sphere haze and resolve into a probability fan. The input-to-probability transition follows Liquid's official d1 explanation; the subdued background sphere references Liquid's System 1 communication without becoming a foreground mark. The drawing deliberately avoids claiming an internal model topology and is not a Liquid logo.
- **Meta Llama:** layered open blue paths communicate an extensible open-model ecosystem. They do not redraw the Meta infinity mark or claim to be an official Llama logo. Use text identity in catalog headings until a locally redistributable first-party mark has explicit approval.
- **Meta Muse Glimmer:** use the official launch key visual's sparse blue directed graph, luminous nodes, and fine particles as the family grammar. Slow node drift, following edges, burst-eased light orbs that decelerate into destination nodes, and a temporary branch/rejoin may suggest tool use and recovery, but must be labelled as metaphor rather than architecture. Do not use arrow glyphs for route motion. Use provider/model text until a locally redistributable first-party mark has explicit approval; never invent a Muse logo.
  - Reviewed default: background resolution `0.10×`, foreground resolution `1.00×`, soft focus `2.30px`, node-drift distance `1.18`, node-drift speed `3.05×`, burst cadence `1.78`, branch activity `1.50`, and dark overlay `0`.
- **OpenAI gpt-oss:** use a strongly oblique monochrome field of orderly, flat gray square tiles with restrained moving reflections. At a deliberately low cadence, only a very small number of foreground tiles may briefly shift toward the light blue used in official launch communication; distant tiles never pulse, tiles never rise, and blue remains an event highlight rather than the field's base color. Treat the grid as generic mathematical abstraction; do not map it to experts, layers, Harmony channels, or any literal model topology, and do not present it as an official gpt-oss logo. Use provider/model text until a locally redistributable first-party mark has explicit approval.
- **Mistral Ministral 3:** derive the background from the official Mistral 3 launch key visual's dark ground, pixel cadence, and yellow-orange-red progression. Use stepped ribbons rather than copying its central numeral-three composition or inventing a Ministral mark.
- **MiniMax M2:** nested magenta/coral feedback waves extend the cadence and gradient of the official MiniMax waveform into the M2.7 self-improvement loop.
- **FLUX.3 Action:** the black field, distributed observation panes, and pale-green technical guides are grounded in the official launch page's hero treatment. One continuous trajectory then adds the documented joint future-video/action behavior. It does not contain generated camera imagery or robot footage. Use provider/model text in the catalog until a locally redistributable first-party mark has explicit approval.
- Existing Qwen, Gemma, Nemotron, and Cosmos decisions remain recorded in the manifest and the system overview.

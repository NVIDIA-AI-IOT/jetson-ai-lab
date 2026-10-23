# Model-family shader benchmark — 2026-10-22

This is a verification run of the model-family shaders shipped by commit `d13a2275b88ca2f5d48eb29085b2024d988002f8`. The method and acceptance criteria are defined in [`model-family-visual-guidelines.md`](./model-family-visual-guidelines.md#runtime-performance-contract).

## Environment

- Host GPU: NVIDIA RTX 6000 Ada Generation, 49,140 MiB
- NVIDIA driver: 570.211.01
- OS/kernel: Linux 6.8.0-110-generic x86_64
- Browser: Chrome for Testing 143.0.7499.4, launched by Playwright 1.57.0
- WebGL renderer: `ANGLE (NVIDIA Corporation, NVIDIA RTX 6000 Ada Generation/PCIe/SSE2, OpenGL 4.5.0)`
- Display path: hardware-accelerated X11 session (`DISPLAY=:0`); this was not SwiftShader
- Target CSS hero: 1920×720; the live canvas covers the rightmost 76%
- Trials: 4; values below are medians across trials

## Method

The ordinary-shader harness performs eight warm-up draws, then measures 40 draws with `EXT_disjoint_timer_query_webgl2` at the shipping internal resolution scale. The layered harness loads the actual staged model page, waits for at least 45 GPU samples, takes the median of the latest 40 samples for each trial, and then takes the median across four trials.

`GPU ms/frame` measures WebGL command execution. `GPU ms/MP` normalizes the work by the rendered pixel count. `GPU duty at 20 fps` is `GPU ms/frame × 20 ÷ 10`. These figures exclude layout, paint, image decoding, CSS filters such as soft focus, and browser composition.

Commands:

```bash
DISPLAY=:0 XAUTHORITY=/run/user/1000/gdm/Xauthority \
  BENCHMARK_TRIALS=4 npm run benchmark:model-shaders

DISPLAY=:0 XAUTHORITY=/run/user/1000/gdm/Xauthority \
  BENCHMARK_BASE_URL=http://10.110.51.105:8086 \
  BENCHMARK_TRIALS=4 npm run benchmark:layered-shaders
```

## Results

| Family shader / preset | Scale | Rendered MP | GPU ms/frame | GPU ms/MP | GPU duty at 20 fps |
| --- | ---: | ---: | ---: | ---: | ---: |
| Nemotron 3 | 1.00× | 1.050 | 0.07948 | 0.07566 | 0.15895% |
| Nemotron 3.5 | 1.00× | 1.050 | 0.03745 | 0.03565 | 0.07491% |
| Qwen 3 | 0.80× | 0.672 | 0.03168 | 0.04713 | 0.06336% |
| Qwen 3.5 | 0.80× | 0.672 | 0.03167 | 0.04711 | 0.06333% |
| Qwen 3.8 | 0.80× | 0.672 | 0.03168 | 0.04713 | 0.06336% |
| Muse Glimmer | layered: 1.00× geometry / 0.10× background | 1.050 output | 0.03072 | 0.02924 | 0.06144% |
| Ministral 3 | layered: 1.00× geometry / 0.50× background | 1.050 output | 0.02048 | 0.01950 | 0.04096% |
| Gemma 4 | 0.50× | 0.263 | 0.01235 | 0.04700 | 0.02470% |
| Cosmos 2 | 0.75× | 0.591 | 0.01000 | 0.01692 | 0.01999% |
| Cosmos 3 | 0.75× | 0.591 | 0.00998 | 0.01690 | 0.01997% |
| Meta Llama | 0.75× | 0.591 | 0.00991 | 0.01677 | 0.01981% |
| Gemma 3 | 0.70× | 0.515 | 0.00977 | 0.01898 | 0.01953% |
| FLUX.3 Action | 0.75× | 0.591 | 0.00968 | 0.01638 | 0.01935% |
| Liquid d1 | 0.75× | 0.591 | 0.00792 | 0.01341 | 0.01585% |
| gpt-oss | 1.00× | 1.050 | 0.00604 | 0.00575 | 0.01208% |
| MiniMax | 0.75× | 0.591 | 0.00585 | 0.00990 | 0.01170% |

All measured shader times are within the preferred RTX budget of 0.10 ms/frame and 0.15 ms/MP. Nemotron 3, Nemotron 3.5, gpt-oss, and the full-resolution layered outputs retain their documented resolution exceptions or layered-renderer interpretation; their measured execution time is still below the preferred time budget.

These results verify the X299 reference baseline. They do not predict Jetson performance and do not include CSS soft-focus or full-page compositor cost. A target Jetson check must use the actual model page and record total GPU time under idle and, when practical, concurrent inference load as required by the normative guidelines.

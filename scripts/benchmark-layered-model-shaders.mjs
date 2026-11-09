import { chromium } from 'playwright';

const baseUrl = process.env.BENCHMARK_BASE_URL ?? 'http://127.0.0.1:4321';
const trials = Number(process.env.BENCHMARK_TRIALS ?? 4);
const backgroundScaleOverride = process.env.BENCHMARK_BACKGROUND_SCALE;
const geometryScaleOverride = process.env.BENCHMARK_GEOMETRY_SCALE;
const softFocusOverride = process.env.BENCHMARK_SOFT_FOCUS;
const jobs = [
  { id: 'muse-glimmer', slug: 'muse-glimmer-30b', backgroundScale: 0.1, geometryScale: 1, softFocus: 0 },
  { id: 'ministral3', slug: 'ministral3-14b-instruct', backgroundScale: 0.5, geometryScale: 1, softFocus: 0 },
];

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const browser = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1000 } });
  const results = Object.fromEntries(jobs.map(({ id }) => [id, []]));
  let renderer = 'unknown';
  for (let trial = 1; trial <= trials; trial++) {
    for (const job of jobs) {
      const backgroundScale = backgroundScaleOverride === undefined ? job.backgroundScale : Number(backgroundScaleOverride);
      const geometryScale = geometryScaleOverride === undefined ? job.geometryScale : Number(geometryScaleOverride);
      const softFocus = softFocusOverride === undefined ? job.softFocus : Number(softFocusOverride);
      await page.goto(`${baseUrl}/models/${job.slug}/?shader-benchmark=1&shader-background-scale=${backgroundScale}&shader-geometry-scale=${geometryScale}&shader-soft-focus=${softFocus}&trial=${trial}`, { waitUntil: 'networkidle' });
      await page.evaluate(() => {
        document.documentElement.style.overflow = 'hidden';
        const hero = document.querySelector('section[data-model-visual-hero]');
        if (hero instanceof HTMLElement) {
          hero.style.boxSizing = 'border-box';
          hero.style.height = '720px';
        }
      });
      await page.waitForFunction((expectedHeight) => document.querySelector('canvas[data-layered-renderer]')?.height === expectedHeight, Math.round(720 * geometryScale));
      const initialSamples = await page.locator('canvas[data-layered-renderer]').evaluate((canvas) => {
        try { return JSON.parse(canvas.dataset.gpuSamples ?? '[]').length; } catch { return 0; }
      });
      await page.waitForFunction((target) => {
        const canvas = document.querySelector('canvas[data-layered-renderer]');
        try { return JSON.parse(canvas?.dataset.gpuSamples ?? '[]').length >= target; } catch { return false; }
      }, initialSamples + 45, { timeout: 15000 });
      const measurement = await page.locator('canvas[data-layered-renderer]').evaluate((canvas) => {
        const samples = JSON.parse(canvas.dataset.gpuSamples ?? '[]').slice(-40).sort((a, b) => a - b);
        const gl = canvas.getContext('webgl2');
        const debug = gl?.getExtension('WEBGL_debug_renderer_info');
        return {
          renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'unknown',
          width: canvas.width,
          height: canvas.height,
          millisecondsPerFrame: (samples[19] + samples[20]) / 2,
          p10: samples[3],
          p90: samples[35],
        };
      });
      renderer = measurement.renderer;
      results[job.id].push(measurement);
    }
  }
  const summary = jobs.map(({ id }) => {
    const runs = results[id];
    const millisecondsPerFrame = median(runs.map((run) => run.millisecondsPerFrame));
    const megapixels = runs[0].width * runs[0].height / 1e6;
    return {
      id,
      backgroundScale: backgroundScaleOverride === undefined
        ? jobs.find((job) => job.id === id)?.backgroundScale
        : Number(backgroundScaleOverride),
      geometryScale: geometryScaleOverride === undefined
        ? jobs.find((job) => job.id === id)?.geometryScale
        : Number(geometryScaleOverride),
      softFocus: softFocusOverride === undefined
        ? jobs.find((job) => job.id === id)?.softFocus
        : Number(softFocusOverride),
      trials,
      width: runs[0].width,
      height: runs[0].height,
      megapixels,
      millisecondsPerFrame,
      millisecondsPerMegapixel: millisecondsPerFrame / megapixels,
      estimatedShaderDutyAt20FpsPercent: millisecondsPerFrame * 20 / 10,
      runs,
    };
  });
  console.log(JSON.stringify({ renderer, baseUrl, heroCssSize: '1920x720', canvasCoverage: 0.76, backgroundScaleOverride: backgroundScaleOverride ?? null, geometryScaleOverride: geometryScaleOverride ?? null, softFocusOverride: softFocusOverride ?? null, results: summary }, null, 2));
} finally {
  await browser.close();
}

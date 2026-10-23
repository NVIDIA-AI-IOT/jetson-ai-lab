import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { modelShaderDefaults } from '../src/data/modelShaderDefaults.mjs';

const root = process.cwd();
const width = 1920;
const height = 720;
const canvasCoverage = 0.76;
const iterations = 40;
const trials = Number(process.env.BENCHMARK_TRIALS ?? 4);
const jobs = [
  { id: 'qwen-3', shader: 'qwen-isometric.frag.glsl', scale: 0.8, uniforms: modelShaderDefaults('qwen', '3') },
  { id: 'qwen-3.5', shader: 'qwen-isometric.frag.glsl', scale: 0.8, uniforms: modelShaderDefaults('qwen', '3.5') },
  { id: 'qwen-3.8', shader: 'qwen-isometric.frag.glsl', scale: 0.8, uniforms: modelShaderDefaults('qwen', '3.8') },
  { id: 'gemma-3', shader: 'gemma-streams.frag.glsl', scale: 0.7, uniforms: modelShaderDefaults('gemma', '3') },
  { id: 'gemma-4', shader: 'gemma-streams.frag.glsl', scale: 0.5, uniforms: modelShaderDefaults('gemma', '4') },
  { id: 'liquid-d1', shader: 'liquid-decision.frag.glsl', scale: 0.75, uniforms: modelShaderDefaults('liquid') },
  { id: 'meta-llama', shader: 'llama-orbit.frag.glsl', scale: 0.75, uniforms: modelShaderDefaults('llama') },
  { id: 'gpt-oss', shader: 'gpt-oss-harmony.frag.glsl', scale: 1, uniforms: modelShaderDefaults('gpt-oss') },
  { id: 'minimax', shader: 'minimax-recursion.frag.glsl', scale: 0.75, uniforms: modelShaderDefaults('minimax') },
  { id: 'flux-action', shader: 'flux3-action-field.frag.glsl', scale: 0.75, uniforms: modelShaderDefaults('flux-action') },
  { id: 'nemotron-3', shader: 'nemotron-microcube.frag.glsl', scale: 1, uniforms: modelShaderDefaults('nemotron', '3') },
  { id: 'nemotron-3.5', shader: 'nemotron-microcube.frag.glsl', scale: 1, uniforms: modelShaderDefaults('nemotron', '3.5') },
  { id: 'cosmos-2', shader: 'cosmos-galaxy.frag.glsl', scale: 0.75, uniforms: modelShaderDefaults('cosmos', '2') },
  { id: 'cosmos-3', shader: 'cosmos-galaxy.frag.glsl', scale: 0.75, uniforms: modelShaderDefaults('cosmos', '3') },
];

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const vertexShader = `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;

const browser = await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage();
  const renderer = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { powerPreference: 'high-performance' });
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    return debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });

  const results = [];
  for (const job of jobs) {
    const fragmentShader = await readFile(path.join(root, 'src/shaders', job.shader), 'utf8');
    const runs = [];
    for (let trial = 1; trial <= trials; trial++) {
      const result = await page.evaluate(async ({ vertexShader, fragmentShader, uniforms, width, height, scale, canvasCoverage, iterations }) => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * canvasCoverage * scale);
      canvas.height = Math.round(height * scale);
      document.body.replaceChildren(canvas);
      const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'high-performance' });
      const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
      if (!ext) throw new Error('EXT_disjoint_timer_query_webgl2 unavailable');

      const compile = (type, source) => {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
        return shader;
      };
      const program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexShader));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentShader));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), canvas.width, canvas.height);
      const layoutResolution = gl.getUniformLocation(program, 'u_layout_resolution');
      if (layoutResolution) gl.uniform2f(layoutResolution, canvas.width / canvasCoverage, canvas.height);
      const viewport = gl.getUniformLocation(program, 'u_viewport');
      if (viewport) gl.uniform2f(viewport, 1 - canvasCoverage, canvasCoverage);
      for (const [key, value] of Object.entries(uniforms)) {
        const location = gl.getUniformLocation(program, `u_${key}`);
        if (location) gl.uniform1f(location, value);
      }
      const time = gl.getUniformLocation(program, 'u_time');
      gl.viewport(0, 0, canvas.width, canvas.height);
      for (let index = 0; index < 8; index++) {
        if (time) gl.uniform1f(time, index * 0.013);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      gl.finish();

      const query = gl.createQuery();
      gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
      for (let index = 0; index < iterations; index++) {
        if (time) gl.uniform1f(time, 3 + index * 0.013);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      gl.endQuery(ext.TIME_ELAPSED_EXT);
      gl.flush();
      await new Promise((resolve, reject) => {
        const started = performance.now();
        const poll = () => {
          const available = gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE);
          const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
          if (available && !disjoint) return resolve();
          if (performance.now() - started > 15000) return reject(new Error('GPU timer query timed out'));
          setTimeout(poll, 4);
        };
        poll();
      });
      const nanoseconds = gl.getQueryParameter(query, gl.QUERY_RESULT);
      return {
        width: canvas.width,
        height: canvas.height,
        megapixels: canvas.width * canvas.height / 1e6,
        millisecondsPerFrame: nanoseconds / iterations / 1e6,
      };
      }, { vertexShader, fragmentShader, uniforms: job.uniforms, width, height, scale: job.scale, canvasCoverage, iterations });
      runs.push(result);
    }
    const result = {
      ...runs[0],
      millisecondsPerFrame: median(runs.map((run) => run.millisecondsPerFrame)),
    };
    results.push({
      id: job.id,
      scale: job.scale,
      trials,
      ...result,
      millisecondsPerMegapixel: result.millisecondsPerFrame / result.megapixels,
      estimatedShaderDutyAt20FpsPercent: result.millisecondsPerFrame * 20 / 10,
      runs: runs.map(({ millisecondsPerFrame }) => millisecondsPerFrame),
    });
  }
  results.sort((a, b) => b.millisecondsPerFrame - a.millisecondsPerFrame);
  console.log(JSON.stringify({ renderer, canvasCoverage, iterations, trials, results }, null, 2));
} finally {
  await browser.close();
}

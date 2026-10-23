import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { modelShaderDefaults } from '../src/data/modelShaderDefaults.mjs';

const root = process.cwd();
const temporary = await mkdtemp(path.join(os.tmpdir(), 'jal-nvidia-visuals-'));
const vertexShader = `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;
const jobs = [
  {
    family: 'nvidia-cosmos', outputSuffix: '3', shader: 'cosmos-galaxy.frag.glsl', time: 24.0, background: '#020706',
    uniforms: modelShaderDefaults('cosmos', '3'),
  },
  {
    family: 'nvidia-cosmos', outputSuffix: '2', shader: 'cosmos-galaxy.frag.glsl', time: 24.0, background: '#020706',
    uniforms: modelShaderDefaults('cosmos', '2'),
  },
  {
    family: 'nvidia-nemotron', shader: 'nemotron-microcube.frag.glsl', time: 60.0, background: '#020807',
    uniforms: modelShaderDefaults('nemotron', '3.5'),
    softFocus: 2,
  },
];

function documentFor(width, height, fragmentShader, time, background, uniforms) {
  return `<!doctype html><html><body style="margin:0;background:${background};overflow:hidden"><canvas id="canvas" width="${width}" height="${height}"></canvas><script>
  try {
    const canvas = document.getElementById('canvas');
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL2 unavailable');
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, ${JSON.stringify(vertexShader)}));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, ${JSON.stringify(fragmentShader)}));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const location = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), canvas.width, canvas.height);
    gl.uniform1f(gl.getUniformLocation(program, 'u_time'), ${time});
    const uniforms = ${JSON.stringify(uniforms)};
    Object.entries(uniforms).forEach(([name, value]) => gl.uniform1f(gl.getUniformLocation(program, 'u_' + name), value));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.finish();
    window.__renderComplete = true;
  } catch (error) {
    window.__renderError = String(error && (error.stack || error.message) || error);
  }
  </script></body></html>`;
}

async function render(browser, job, name, width, height, fragmentShader) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(documentFor(width, height, fragmentShader, job.time, job.background, job.uniforms), { waitUntil: 'load' });
  await page.waitForFunction(() => window.__renderComplete === true || Boolean(window.__renderError));
  const renderError = await page.evaluate(() => window.__renderError || null);
  if (renderError) throw new Error(renderError);
  const pngPath = path.join(temporary, `${job.family}-${name}.png`);
  await page.locator('#canvas').screenshot({ path: pngPath, animations: 'disabled' });
  const outputRoot = path.join(root, 'public/images/model-families', job.family);
  await mkdir(outputRoot, { recursive: true });
  const image = sharp(pngPath);
  if (job.softFocus) image.blur(job.softFocus);
  const outputName = job.outputSuffix ? `${name}-${job.outputSuffix}` : name;
  await image.webp({ quality: 88, effort: 6 }).toFile(path.join(outputRoot, `${outputName}.webp`));
  await page.close();
  console.log(`webgl:${job.family}/${outputName}.webp (${width}x${height})`);
}

let browser;
try {
  browser = await chromium.launch({
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  for (const job of jobs) {
    const fragmentShader = await readFile(path.join(root, 'src/shaders', job.shader), 'utf8');
    await render(browser, job, 'hero', 1920, 720, fragmentShader);
    await render(browser, job, 'catalog', 960, 540, fragmentShader);
  }
} finally {
  await browser?.close();
  await rm(temporary, { recursive: true, force: true });
}

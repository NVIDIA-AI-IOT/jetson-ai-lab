import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { modelShaderDefaults } from '../src/data/modelShaderDefaults.mjs';

const root = process.cwd();
const outputRoot = path.join(root, 'public/images/model-families/gemma');
const temporary = await mkdtemp(path.join(os.tmpdir(), 'jal-gemma-visuals-'));
const fragmentShader = await readFile(path.join(root, 'src/shaders/gemma-streams.frag.glsl'), 'utf8');
const vertexShader = `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;

function documentFor(width, height, uniforms) {
  return `<!doctype html><html><body style="margin:0;background:#03132f;overflow:hidden"><canvas id="canvas" width="${width}" height="${height}"></canvas><script>
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
    gl.uniform1f(gl.getUniformLocation(program, 'u_time'), 11.0);
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

async function render(browser, name, width, height, variant) {
  const uniforms = modelShaderDefaults('gemma', variant);
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(documentFor(width, height, uniforms), { waitUntil: 'load' });
  await page.waitForFunction(() => window.__renderComplete === true || Boolean(window.__renderError));
  const renderError = await page.evaluate(() => window.__renderError || null);
  if (renderError) throw new Error(renderError);
  const pngPath = path.join(temporary, `${name}.png`);
  await page.locator('#canvas').screenshot({ path: pngPath, animations: 'disabled' });
  await mkdir(outputRoot, { recursive: true });
  await sharp(pngPath).webp({ quality: 88, effort: 6 }).toFile(path.join(outputRoot, `${name}.webp`));
  await page.close();
  console.log(`webgl:gemma/${name}.webp (${width}x${height}, generation ${variant})`);
}

let browser;
try {
  browser = await chromium.launch({
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  await render(browser, 'hero-3', 1920, 720, '3');
  await render(browser, 'catalog-3', 960, 540, '3');
  await render(browser, 'hero-4', 1920, 720, '4');
  await render(browser, 'catalog-4', 960, 540, '4');
} finally {
  await browser?.close();
  await rm(temporary, { recursive: true, force: true });
}

import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { modelShaderDefaults } from '../src/data/modelShaderDefaults.mjs';

const root = process.cwd();
const outputRoot = path.join(root, 'public/images/model-families/qwen');
const temporary = await mkdtemp(path.join(os.tmpdir(), 'jal-model-visuals-'));

const vertexShader = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const legacyFragmentShader = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
out vec4 outColor;

vec2 bezier(vec2 a, vec2 b, vec2 c, vec2 d, float t) {
  float s = 1.0 - t;
  return s*s*s*a + 3.0*s*s*t*b + 3.0*s*t*t*c + t*t*t*d;
}

vec2 curveDistance(vec2 p, vec2 a, vec2 b, vec2 c, vec2 d) {
  float best = 10.0;
  float bestT = 0.0;
  for (int i = 0; i <= 96; i++) {
    float t = float(i) / 96.0;
    float distanceToCurve = distance(p, bezier(a, b, c, d, t));
    if (distanceToCurve < best) {
      best = distanceToCurve;
      bestT = t;
    }
  }
  return vec2(best, bestT);
}

vec2 foldedDistance(
  vec2 p,
  vec2 a0, vec2 a1, vec2 a2, vec2 a3,
  vec2 b1, vec2 b2, vec2 b3
) {
  vec2 first = curveDistance(p, a0, a1, a2, a3);
  vec2 second = curveDistance(p, a3, b1, b2, b3);
  second.y = 0.5 + second.y * 0.5;
  first.y *= 0.5;
  return first.x < second.x ? first : second;
}

float roundedBox(vec2 p, vec2 halfSize, float radius) {
  vec2 q = abs(p) - halfSize + radius;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
}

vec2 rotate2d(vec2 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c) * p;
}

vec3 over(vec3 base, vec3 layer, float alpha) {
  return mix(base, layer, clamp(alpha, 0.0, 1.0));
}

vec3 ribbonLayer(vec3 base, vec2 field, float width, vec3 colorA, vec3 colorB, float phase) {
  float distanceToCenter = field.x;
  float t = field.y;
  float body = 1.0 - smoothstep(width * 0.68, width, distanceToCenter);
  float dissolvedEdge = 1.0 - smoothstep(width, width * 2.7, distanceToCenter);
  float edge = exp(-pow((distanceToCenter - width * 0.78) / (width * 0.13), 2.0));
  float fold = 0.52 + 0.48 * cos((t + phase) * 6.2831853);
  float filaments = 0.5 + 0.5 * sin(t * 116.0 + distanceToCenter * 820.0 + phase * 13.0);
  vec3 surface = mix(colorA, colorB, smoothstep(0.05, 0.95, t));
  surface *= 0.54 + fold * 0.35;
  surface += vec3(0.26, 0.34, 0.7) * edge * 0.72;
  surface += vec3(0.2, 0.25, 0.58) * filaments * body * 0.11;
  base = over(base, surface, dissolvedEdge * 0.17);
  base = over(base, surface, body * 0.58);
  return base;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv.y = 1.0 - uv.y;

  vec3 color = vec3(0.012, 0.012, 0.027);
  float rightField = smoothstep(0.29, 0.78, uv.x);
  color += vec3(0.025, 0.018, 0.09) * rightField * (0.5 + 0.5 * uv.y);

  // Abstract glass panes: no embedded screenshots or product UI.
  vec2 pane1 = rotate2d(uv - vec2(0.66, 0.35), -0.09);
  vec2 pane2 = rotate2d(uv - vec2(0.75, 0.49), 0.045);
  vec2 pane3 = rotate2d(uv - vec2(0.84, 0.31), -0.035);
  float panelDistances[3] = float[3](
    roundedBox(pane1, vec2(0.078, 0.19), 0.008),
    roundedBox(pane2, vec2(0.07, 0.18), 0.008),
    roundedBox(pane3, vec2(0.072, 0.17), 0.008)
  );
  for (int panel = 0; panel < 3; panel++) {
    float fill = 1.0 - smoothstep(-0.006, 0.018, panelDistances[panel]);
    float rim = exp(-pow(panelDistances[panel] / 0.004, 2.0));
    color = over(color, vec3(0.19, 0.22, 0.58), fill * 0.075);
    color += vec3(0.32, 0.48, 1.0) * rim * 0.19;
  }

  vec2 upper = foldedDistance(
    uv,
    vec2(0.30, 0.73), vec2(0.44, 0.66), vec2(0.58, 0.65), vec2(0.67, 0.52),
    vec2(0.73, 0.28), vec2(0.84, 0.2), vec2(1.07, 0.12)
  );
  vec2 lower = foldedDistance(
    uv,
    vec2(0.32, 0.42), vec2(0.49, 0.35), vec2(0.62, 0.41), vec2(0.72, 0.54),
    vec2(0.79, 0.78), vec2(0.91, 0.66), vec2(1.07, 0.82)
  );
  vec2 middle = foldedDistance(
    uv,
    vec2(0.31, 0.66), vec2(0.47, 0.79), vec2(0.63, 0.69), vec2(0.75, 0.52),
    vec2(0.85, 0.4), vec2(0.94, 0.5), vec2(1.07, 0.39)
  );

  color = ribbonLayer(color, upper, 0.046, vec3(0.18, 0.12, 0.48), vec3(0.33, 0.63, 1.0), 0.08);
  color = ribbonLayer(color, lower, 0.052, vec3(0.2, 0.19, 0.6), vec3(0.66, 0.38, 0.92), 0.37);
  color = ribbonLayer(color, middle, 0.044, vec3(0.16, 0.38, 0.76), vec3(0.52, 0.38, 0.96), 0.69);

  // Deterministic micro-dither prevents large gradients from banding after WebP encoding.
  float noise = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  color += (noise - 0.5) / 255.0;
outColor = vec4(pow(max(color, 0.0), vec3(0.92)), 1.0);
}`;

// The checked-in shader is shared by the live prototype and deterministic
// offline captures, so both presentations use exactly the same visual grammar.
const fragmentShader = await readFile(path.join(root, 'src/shaders/qwen-isometric.frag.glsl'), 'utf8');

function documentFor(width, height, uniforms, catalogSpread = 0) {
	return `<!doctype html><html><body style="margin:0;background:#030307;overflow:hidden"><canvas id="canvas" width="${width}" height="${height}" style="display:block;width:${width}px;height:${height}px"></canvas><script>
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
	gl.uniform1f(gl.getUniformLocation(program, 'u_time'), 7.0);
	const uniforms = ${JSON.stringify(uniforms)};
	Object.entries(uniforms).forEach(([name, value]) => gl.uniform1f(gl.getUniformLocation(program, 'u_' + name), value));
	gl.uniform1f(gl.getUniformLocation(program, 'u_catalog_spread'), ${catalogSpread});
	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.drawArrays(gl.TRIANGLES, 0, 3);
	gl.finish();
	window.__renderComplete = true;
	} catch (error) {
		window.__renderError = String(error && (error.stack || error.message) || error);
	}
	</script></body></html>`;
}

async function render(browser, name, width, height, variant, catalogSpread = 0) {
	const uniforms = modelShaderDefaults('qwen', variant);
	const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
	await page.setContent(documentFor(width, height, uniforms, catalogSpread), { waitUntil: 'load' });
	await page.waitForFunction(() => window.__renderComplete === true || Boolean(window.__renderError));
	const renderError = await page.evaluate(() => window.__renderError || null);
	if (renderError) throw new Error(renderError);
	const pngPath = path.join(temporary, `${name}.png`);
	await page.locator('#canvas').screenshot({ path: pngPath, animations: 'disabled' });
	await mkdir(outputRoot, { recursive: true });
	await sharp(pngPath).webp({ quality: 88, effort: 6 }).toFile(path.join(outputRoot, `${name}.webp`));
	await page.close();
	console.log(`webgl:qwen/${name}.webp (${width}x${height}, generation ${variant})`);
}

let browser;
try {
	browser = await chromium.launch({
		headless: true,
		args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
	});
	await render(browser, 'hero-3', 1920, 720, '3');
	await render(browser, 'catalog-3', 960, 540, '3');
	await render(browser, 'hero-3-5', 1920, 720, '3.5');
	await render(browser, 'catalog-3-5', 960, 540, '3.5');
	await render(browser, 'hero-3-8', 1920, 720, '3.8');
	await render(browser, 'catalog-3-8', 960, 540, '3.8');
} finally {
	await browser?.close();
	await rm(temporary, { recursive: true, force: true });
}

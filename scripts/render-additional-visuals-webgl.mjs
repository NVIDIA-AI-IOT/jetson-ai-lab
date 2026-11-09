import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { modelShaderDefaults } from '../src/data/modelShaderDefaults.mjs';

const root = process.cwd();
const temporary = await mkdtemp(path.join(os.tmpdir(), 'jal-additional-visuals-'));
const vertexShader = `#version 300 es
in vec2 a_position;
void main(){gl_Position=vec4(a_position,0.0,1.0);}`;
const jobs = [
  { family:'liquid-d1', shader:'liquid-decision.frag.glsl', time:13, background:'#0D0913', uniforms:modelShaderDefaults('liquid') },
  { family:'meta-llama', shader:'llama-orbit.frag.glsl', time:9, background:'#06183F', uniforms:modelShaderDefaults('llama') },
  { family:'meta-muse-glimmer', shader:'muse-glimmer-graph.frag.glsl', time:21, background:'#02050D', uniforms:modelShaderDefaults('muse-glimmer') },
  { family:'openai-gpt-oss', shader:'gpt-oss-harmony.frag.glsl', time:16, background:'#080909', uniforms:modelShaderDefaults('gpt-oss') },
  { family:'mistral-ministral3', shader:'ministral3-stepwind.frag.glsl', time:18, background:'#12121F', uniforms:modelShaderDefaults('ministral3') },
  { family:'minimax-m2', shader:'minimax-recursion.frag.glsl', time:15, background:'#210318', uniforms:modelShaderDefaults('minimax') },
  { family:'flux3-action', shader:'flux3-action-field.frag.glsl', time:18, background:'#050707', uniforms:modelShaderDefaults('flux-action') },
];

function pageFor(width,height,fragment,time,background,uniforms){return `<!doctype html><html><body style="margin:0;background:${background};overflow:hidden"><canvas id="c" width="${width}" height="${height}"></canvas><script>try {
const gl=c.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:true});
function sh(t,s){const x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(x));return x}
const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,${JSON.stringify(vertexShader)}));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,${JSON.stringify(fragment)}));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));gl.useProgram(p);
const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);const a=gl.getAttribLocation(p,'a_position');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
gl.uniform2f(gl.getUniformLocation(p,'u_resolution'),c.width,c.height);gl.uniform1f(gl.getUniformLocation(p,'u_time'),${time});for(const [k,v] of Object.entries(${JSON.stringify(uniforms)}))gl.uniform1f(gl.getUniformLocation(p,'u_'+k),v);gl.viewport(0,0,c.width,c.height);gl.drawArrays(gl.TRIANGLES,0,3);gl.finish();window.done=true;} catch(error) { window.renderError=String(error?.stack||error); }
</script></body></html>`}

let browser;
try {
  browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
  for(const job of jobs){
    const shader=await readFile(path.join(root,'src/shaders',job.shader),'utf8');
    const outputs = [['hero',1920,720],['catalog',960,540]];
    for(const [name,width,height] of outputs){
      const page=await browser.newPage({viewport:{width,height}});await page.setContent(pageFor(width,height,shader,job.time,job.background,job.uniforms));await page.waitForFunction(()=>window.done===true||Boolean(window.renderError));const renderError=await page.evaluate(()=>window.renderError||null);if(renderError)throw new Error(`${job.family}: ${renderError}`);
      const png=path.join(temporary,`${job.family}-${name}.png`);await page.locator('#c').screenshot({path:png});const dest=path.join(root,'public/images/model-families',job.family);await mkdir(dest,{recursive:true});await sharp(png).webp({quality:88,effort:6}).toFile(path.join(dest,`${name}.webp`));await page.close();console.log(`webgl:${job.family}/${name}.webp (${width}x${height})`);
    }
  }
} finally { await browser?.close(); await rm(temporary,{recursive:true,force:true}); }

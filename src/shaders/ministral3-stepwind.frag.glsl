#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_layout_resolution;
uniform vec2 u_viewport;
uniform float u_time;
uniform float u_drift_speed;
uniform float u_step_scale;
uniform float u_depth;
out vec4 outColor;

float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float box(vec2 p, vec2 center, vec2 halfSize, float softness) {
  vec2 d = abs(p - center) - halfSize;
  float outside = length(max(d, 0.0));
  return 1.0 - smoothstep(0.0, softness, outside + min(max(d.x, d.y), 0.0));
}

vec3 mistralRamp(float t) {
  vec3 red = vec3(0.94, 0.055, 0.015);
  vec3 orange = vec3(1.0, 0.31, 0.015);
  vec3 yellow = vec3(1.0, 0.82, 0.02);
  return t < 0.5 ? mix(red, orange, t * 2.0) : mix(orange, yellow, (t - 0.5) * 2.0);
}

void main() {
  float viewportScale = u_viewport.y > 0.0 ? u_viewport.y : 1.0;
  vec2 uv = vec2(u_viewport.x + gl_FragCoord.x / u_resolution.x * viewportScale, gl_FragCoord.y / u_resolution.y);
  uv.y = 1.0 - uv.y;
  vec2 layoutResolution = u_layout_resolution.x > 0.0 ? u_layout_resolution : u_resolution;
  float aspect = layoutResolution.x / layoutResolution.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec3 color = mix(vec3(0.018, 0.018, 0.035), vec3(0.045, 0.040, 0.055), uv.x);

  float time = u_time * (0.025 + 0.055 * u_drift_speed);
  float scale = max(u_step_scale, 0.35);
  for (int band = 0; band < 9; ++band) {
    float fi = float(band);
    float phase = time + fi * 0.43;
    float baseY = 0.16 + fi * 0.085;
    float depth = (fi / 8.0 - 0.5) * 0.11 * u_depth;
    for (int stepIndex = 0; stepIndex < 12; ++stepIndex) {
      float sj = float(stepIndex);
      float xUv = 0.34 + sj * 0.060 + sin(phase + sj * 0.36) * 0.012;
      float stair = floor((sin(phase * 0.8 + sj * 0.62) * 0.5 + 0.5) * 4.0) / 4.0;
      float y = baseY + (stair - 0.5) * 0.11 * scale + depth;
      vec2 center = vec2(xUv * aspect, y);
      vec2 size = vec2((0.043 + 0.010 * sin(fi + sj)) * aspect, 0.025) * scale;
      float tile = box(p, center, size, 0.0025);
      float shade = clamp(0.10 + fi / 9.0 + sj * 0.018, 0.0, 1.0);
      vec3 tileColor = mistralRamp(shade);
      float pulse = 0.72 + 0.28 * sin(phase * 0.7 + sj * 0.25 + fi);
      color += tileColor * tile * pulse * (0.38 + 0.34 * u_depth);
    }
  }

  // Sparse square dust extends the official pixel grammar without reproducing
  // the Mistral mark itself.
  vec2 cell = floor(uv * vec2(180.0, 92.0));
  float chance = smoothstep(0.985, 1.0, hash21(cell));
  vec2 local = fract(uv * vec2(180.0, 92.0)) - 0.5;
  float speck = box(local, vec2(0.0), vec2(0.12), 0.08) * chance;
  color += mistralRamp(hash21(cell + 7.0)) * speck * smoothstep(0.28, 0.55, uv.x) * 0.32;

  color *= mix(0.20, 1.0, smoothstep(0.14, 0.52, uv.x));
  outColor = vec4(pow(max(color, 0.0), vec3(0.94)), 1.0);
}

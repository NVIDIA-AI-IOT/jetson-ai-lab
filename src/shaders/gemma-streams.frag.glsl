#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_layout_resolution;
uniform vec2 u_viewport;
uniform float u_time;
uniform float u_generation;
uniform float u_breeze_speed;
uniform float u_streak_width;
uniform float u_streak_bend;
uniform float u_streak_intensity;
out vec4 outColor;

float hash11(float value) {
  return fract(sin(value * 127.1) * 43758.5453123);
}

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  float viewportScale = u_viewport.y > 0.0 ? u_viewport.y : 1.0;
  vec2 uv = vec2(u_viewport.x + gl_FragCoord.x / u_resolution.x * viewportScale, gl_FragCoord.y / u_resolution.y);
  uv.y = 1.0 - uv.y;
  float gemma3 = 1.0 - step(3.5, u_generation);
  float strandCount = mix(12.0, 6.0, gemma3);
  float generationStrength = mix(1.0, 0.62, gemma3);

  vec3 color = mix(
    vec3(0.003, 0.014, 0.048),
    vec3(0.012, 0.073, 0.170),
    uv.x * 0.72 + uv.y * 0.10
  );
  color *= mix(1.0, 0.74, gemma3);

  for (int index = 0; index < 12; index++) {
    float id = float(index);
    if (id >= strandCount) continue;

    float seed = hash11(id + 2.0);
    float phase = id * 1.37
      + u_time * u_breeze_speed * mix(0.34, 0.62, seed);
    float direction = mod(id, 2.0) < 1.0 ? 1.0 : -1.0;
    float x = uv.x;

    float base = mix(0.145 + id * 0.064, 0.20 + id * 0.115, gemma3);
    float primaryWave = sin(x * mix(2.2, 3.7, seed) + phase)
      * mix(0.125, 0.075, gemma3);
    float secondaryWave = sin(x * 1.08 - phase * 0.38 + id * 0.73)
      * mix(0.064, 0.038, gemma3);
    float arc = direction * pow(x - 0.60, 2.0) * mix(0.30, 0.14, gemma3);
    float sweep = direction * (x - 0.62) * mix(0.10, 0.20, gemma3);
    float centerLine = base
      + (primaryWave + secondaryWave + arc + sweep) * u_streak_bend;

    float distanceToLine = abs(uv.y - centerLine);
    float width = mix(0.010, 0.026, hash11(id + 22.0)) * u_streak_width;
    float ribbon = exp(-pow(distanceToLine / max(width, 0.001), 2.0));
    float halo = exp(-pow(distanceToLine / max(width * 4.8, 0.001), 2.0));
    float longitudinal = smoothstep(-0.10, 0.16, x)
      * (1.0 - smoothstep(0.84, 1.16, x));
    float shimmer = 0.72 + 0.28 * sin(phase * 0.61 + x * 4.2 + id);

    vec3 strandColor = mix(
      vec3(0.28, 0.63, 1.0),
      vec3(0.72, 0.90, 1.0),
      seed
    );
    color += strandColor * halo * longitudinal * 0.085 * u_streak_intensity * generationStrength;
    color += mix(strandColor, vec3(0.90, 0.96, 1.0), 0.20 + gemma3 * 0.20)
      * ribbon * longitudinal * shimmer * 0.36 * u_streak_intensity * generationStrength;

    // Gemma 4's official launch art adds blue particulate structure. Sparse
    // highlights travel along the same curves rather than introducing a new
    // color identity or a second logo.
    if (u_generation >= 3.5) {
      float cells = 34.0;
      float cellX = floor(x * cells + seed * 9.0);
      float cellCenter = (cellX + 0.5 - seed * 9.0) / cells;
      float along = exp(-pow((x - cellCenter) * cells / 0.34, 2.0));
      float sparkleSeed = hash11(cellX + id * 41.0);
      float sparkle = step(0.70, sparkleSeed) * along
        * exp(-pow(distanceToLine / max(width * 0.54, 0.001), 2.0));
      color += vec3(0.34, 0.66, 1.0) * sparkle * 0.34 * u_streak_intensity;
    }
  }

  color *= mix(0.50, 1.0, smoothstep(0.08, 0.54, uv.x));
  float grain = hash21(gl_FragCoord.xy) - 0.5;
  color += grain / 520.0;
  color *= 1.0 - smoothstep(0.88, 1.42, length((uv - 0.5) * vec2(0.70, 1.0))) * 0.18;
  outColor = vec4(pow(max(color, 0.0), vec3(0.94)), 1.0);
}

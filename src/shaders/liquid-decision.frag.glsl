#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_layout_resolution;
uniform vec2 u_viewport;
uniform float u_time;
uniform float u_convergence;
uniform float u_field_density;
uniform float u_field_orbit;
uniform float u_pulse;
uniform float u_sphere_haze;
uniform float u_flow_amplitude;
out vec4 outColor;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float ribbon(float distanceToCenter, float width) {
  return exp(-pow(abs(distanceToCenter) / width, 2.0));
}

mat2 rotate2d(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

float particleLayer(vec2 position, float density, float seed) {
  vec2 grid = position * (82.0 * max(density, 0.05));
  vec2 cell = floor(grid);
  vec2 local = fract(grid) - 0.5;
  vec2 jitter = vec2(hash21(cell + seed), hash21(cell + seed + 19.17)) - 0.5;
  vec2 particlePosition = local - jitter * 0.42;
  float squareDistance = max(abs(particlePosition.x), abs(particlePosition.y));
  float square = 1.0 - smoothstep(0.24, 0.32, squareDistance);
  float occupancy = smoothstep(0.955, 1.0, hash21(cell + seed + 43.2));
  return square * occupancy;
}

float smootherstep01(float x) {
  x = clamp(x, 0.0, 1.0);
  return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

float junctionY(float t) {
  // All incoming and outgoing ribbons share this moving anchor. The whole
  // junction can breathe vertically without allowing the output to detach.
  return -0.018 + 0.010 * u_flow_amplitude * sin(t * 0.42);
}

float inputCurve(float x, int lane, float t, float convergence) {
  float sourceX = -1.52;
  float sourceY = 0.36;
  float phase = 0.1;
  float frequency = 2.05;
  float drift = 0.014;

  if (lane == 0) {
    sourceX = -1.52;
    sourceY = 0.36;
    phase = 0.1;
    frequency = 2.05;
    drift = 0.014;
  } else if (lane == 1) {
    sourceX = -1.20;
    sourceY = -0.015;
    phase = 1.2;
    frequency = 1.65;
    drift = 0.018;
  } else {
    sourceX = -0.88;
    sourceY = -0.43;
    phase = 2.35;
    frequency = 2.35;
    drift = 0.012;
  }

  // One quintic interpolation replaces the former staged bends. Its slope is
  // zero at both ends, while the low-amplitude drift also fades to zero at
  // the source and merge. The result reads as a supple ribbon rather than a
  // polyline with animated elbows.
  float progress = clamp((x - sourceX) / (0.20 - sourceX), 0.0, 1.0);
  float gather = smootherstep01(progress) * clamp(convergence, 0.0, 1.0);
  float mergeY = junctionY(t);
  float driftEnvelope = 16.0 * progress * progress * (1.0 - progress) * (1.0 - progress);
  float gentleDrift = sin(x * frequency - t * 0.34 + phase) * drift * driftEnvelope * u_flow_amplitude;
  return mix(sourceY, mergeY, gather) + gentleDrift;
}

void main() {
  float viewportScale = u_viewport.y > 0.0 ? u_viewport.y : 1.0;
  vec2 uv = vec2(u_viewport.x + gl_FragCoord.x / u_resolution.x * viewportScale, gl_FragCoord.y / u_resolution.y);
  uv.y = 1.0 - uv.y;
  vec2 layoutResolution = u_layout_resolution.x > 0.0 ? u_layout_resolution : u_resolution;
  float aspect = layoutResolution.x / layoutResolution.y;
  vec2 p = vec2((uv.x - 0.72) * aspect, uv.y - 0.5);
  // u_time already includes the UI's Flow Speed multiplier. Keep the local
  // clock close to real time so 1.00 reads as motion rather than a still.
  float t = u_time * 0.82;

  vec3 color = vec3(0.012, 0.006, 0.025);

  // A broad, edge-free sphere haze sits behind the flow. This is a restrained
  // reference to Liquid's System 1 sphere imagery, not a foreground badge or
  // a literal diagram of the model. Uneven illumination keeps it from reading
  // as a flat geometric disc.
  vec2 sphereP = p - vec2(0.14, -0.015);
  float sphereDistance = length(sphereP);
  float sphereBody = exp(-sphereDistance * sphereDistance * 12.0);
  float sphereHalo = exp(-sphereDistance * sphereDistance * 3.4);
  float sphereLight = exp(-dot(sphereP - vec2(-0.075, 0.090), sphereP - vec2(-0.075, 0.090)) * 23.0);
  float sphereShade = 0.64 + 0.36 * smoothstep(-0.22, 0.22, -sphereP.x + sphereP.y * 0.34);
  float sphereBreathe = 0.90 + 0.10 * sin(t * 0.62);
  color += vec3(0.22, 0.075, 0.48) * sphereHalo * 0.105 * u_sphere_haze;
  color += vec3(0.34, 0.12, 0.66) * sphereBody * sphereShade * 0.135 * u_sphere_haze;
  color += vec3(0.72, 0.42, 0.96) * sphereLight * sphereBody * 0.085 * sphereBreathe * u_sphere_haze;
  vec3 shades[3] = vec3[3](
    vec3(0.47, 0.20, 0.98),
    vec3(0.70, 0.32, 1.00),
    vec3(0.91, 0.62, 1.00)
  );
  float widths[3] = float[3](0.019, 0.029, 0.014);
  float starts[3] = float[3](-1.52, -1.20, -0.88);
  float ends[3] = float[3](0.29, 0.30, 0.28);

  // Unequal ribbons arrive from different origins, with distinct curvature,
  // width, and timing. They approach a decision aperture without forming a
  // symmetric three-pronged icon.
  for (int i = 0; i < 3; ++i) {
    float y = inputCurve(p.x, i, t, u_convergence);
    float gateIn = smoothstep(starts[i] - 0.08, starts[i] + 0.13, p.x);
    float gateOut = 1.0 - smoothstep(ends[i] - 0.12, ends[i] + 0.10, p.x);
    float bundleT = smoothstep(-0.22, 0.14, p.x) * u_convergence;
    float bundledWidth = mix(widths[i], 0.0075, bundleT);
    float mask = ribbon(p.y - y, bundledWidth) * gateIn * gateOut;
    float halo = ribbon(p.y - y, bundledWidth * mix(3.8, 2.8, bundleT)) * gateIn * gateOut;
    float flowPulse = 0.76 + 0.24 * sin(p.x * 7.0 - t * 2.15 + float(i) * 1.15);
    color += shades[i] * halo * 0.065;
    color += shades[i] * mask * (0.36 + float(i) * 0.07) * flowPulse;
  }

  // Hold the converged inputs together as one quiet spine before the
  // probability traces separate. This avoids three independently clipped
  // ribbon ends looking loose or accidental on the right side.
  float spineGate = smoothstep(0.02, 0.15, p.x) * (1.0 - smoothstep(0.28, 0.38, p.x));
  float mergeX = 0.20;
  float spineWave = sin(p.x * 2.7 - t * 0.32) - sin(mergeX * 2.7 - t * 0.32);
  float spineY = junctionY(t) + 0.004 * u_flow_amplitude * spineWave;
  float spineHalo = ribbon(p.y - spineY, 0.025) * spineGate;
  float spineCore = ribbon(p.y - spineY, 0.0075) * spineGate;
  color += vec3(0.72, 0.36, 0.98) * spineHalo * 0.075;
  color += vec3(0.91, 0.70, 1.00) * spineCore * 0.48;

  // The convergence point remains deliberately soft: no outlined aperture or
  // tilted ellipse competes with the asymmetric ribbons.
  float decisionGlow = exp(-dot(sphereP, sphereP) * 38.0);
  color += vec3(0.68, 0.34, 0.96) * decisionGlow * 0.075 * u_pulse;

  // The output reads as one weighted stream. Five probability traces remain
  // inside it, but stay close enough to behave as internal texture: their
  // breathing changes the stream's apparent width instead of opening into a
  // loose set of parallel wires.
  float outputGate = smoothstep(0.16, 0.31, p.x);
  // Subtract the wave value at mergeX so the output is mathematically pinned
  // to the same moving junction as the three inputs and the quiet spine.
  float outputWave = sin(p.x * 1.65 - t * 0.58) - sin(mergeX * 1.65 - t * 0.58);
  float outputCenter = junctionY(t) + 0.010 * u_flow_amplitude * outputWave;
  float outputBreath = 0.5 + 0.5 * sin(p.x * 1.15 - t * 0.72);
  float outputBodyWidth = 0.017 + 0.004 * outputBreath;
  float outputHalo = ribbon(p.y - outputCenter, outputBodyWidth * 2.8) * outputGate;
  float outputBody = ribbon(p.y - outputCenter, outputBodyWidth) * outputGate;
  float outputCore = ribbon(p.y - outputCenter, 0.0065) * outputGate;
  float streamPulse = 0.78 + 0.22 * sin(p.x * 7.8 - t * 2.35);
  color += vec3(0.50, 0.20, 0.91) * outputHalo * 0.070;
  color += vec3(0.70, 0.34, 0.98) * outputBody * 0.20;
  color += vec3(0.94, 0.76, 1.00) * outputCore * 0.26 * streamPulse;

  for (int i = 0; i < 5; ++i) {
    float fi = float(i) - 2.0;
    float settle = smoothstep(0.20, 0.62, p.x);
    float tightSpacing = (0.0022 + 0.0013 * outputBreath) * settle;
    float localDrift = 0.0014 * u_flow_amplitude * sin(p.x * (1.7 + fi * 0.025) - t * 0.70 + fi * 0.48);
    float y = outputCenter + fi * tightSpacing + localDrift * settle;
    float trace = ribbon(p.y - y, 0.0024 + 0.0003 * abs(fi)) * outputGate;
    float confidence = 1.0 - abs(fi) * 0.13;
    color += mix(vec3(0.53, 0.25, 0.95), vec3(0.96, 0.81, 1.0), confidence)
      * trace * (0.10 + confidence * 0.18);
  }

  // Two sparse point layers orbit around the sphere haze at slightly
  // different rates, producing depth without implying model topology.
  vec2 particleCenter = p - vec2(0.14, -0.015);
  float orbitAngle = t * 0.13 * u_field_orbit;
  vec2 nearOrbit = rotate2d(orbitAngle) * particleCenter;
  vec2 farOrbit = rotate2d(-orbitAngle * 0.58) * particleCenter;
  float dots = particleLayer(nearOrbit * vec2(0.82, 1.24), u_field_density, 3.7);
  float farDots = particleLayer(farOrbit * vec2(0.68, 1.08), u_field_density * 0.72, 11.9);
  float field = exp(-length((p - vec2(0.04, 0.0)) * vec2(0.80, 1.25)) * 1.45);
  float probabilityBand = smoothstep(-0.75, 0.20, p.x) * (1.0 - smoothstep(0.35, 1.1, p.x));
  color += vec3(0.58, 0.38, 0.84) * dots * field * probabilityBand * 0.44;
  color += vec3(0.38, 0.24, 0.64) * farDots * field * probabilityBand * 0.22;

  color *= mix(0.42, 1.0, smoothstep(0.12, 0.52, uv.x));
  color += (hash21(gl_FragCoord.xy) - 0.5) / 520.0;
  outColor = vec4(pow(max(color, 0.0), vec3(0.9)), 1.0);
}

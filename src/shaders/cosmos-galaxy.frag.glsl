#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_layout_resolution;
uniform vec2 u_viewport;
uniform float u_time;
uniform float u_center_x;
uniform float u_center_y;
uniform float u_scale;
uniform float u_arm_width;
uniform float u_brightness;
uniform float u_view_tilt;
uniform float u_view_angle;
uniform float u_galaxy_rotation;
uniform float u_generation;
uniform float u_particle_twinkle;
uniform float u_spectral_intensity;
uniform float u_spectral_offset;
uniform float u_spectral_width;
uniform float u_spectral_hue;
uniform float u_spectral_brightness;
uniform float u_spectral_paleness;
out vec4 outColor;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float valueNoise(vec2 p) {
  vec2 cell = floor(p);
  vec2 local = fract(p);
  vec2 blend = local * local * (3.0 - 2.0 * local);
  float a = hash21(cell);
  float b = hash21(cell + vec2(1.0, 0.0));
  float c = hash21(cell + vec2(0.0, 1.0));
  float d = hash21(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, blend.x), mix(c, d, blend.x), blend.y);
}

float armField(float phase, float radius, float halfWidth) {
  // Convert angular separation into an approximate perpendicular distance in
  // the galaxy plane. This makes Arm width expand the visible ribbon itself;
  // the old phase-only falloff mostly made a larger population of particles
  // pass the density threshold without clearly widening the arm silhouette.
  float distanceToArm = abs(sin(phase)) * max(radius, 0.045);
  float normalizedDistance = distanceToArm / max(halfWidth, 0.001);
  return exp(-0.5 * normalizedDistance * normalizedDistance);
}

mat2 rotate2d(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

void main() {
  float viewportScale = u_viewport.y > 0.0 ? u_viewport.y : 1.0;
  vec2 uv = vec2(u_viewport.x + gl_FragCoord.x / u_resolution.x * viewportScale, gl_FragCoord.y / u_resolution.y);
  uv.y = 1.0 - uv.y;
  vec2 layoutResolution = u_layout_resolution.x > 0.0 ? u_layout_resolution : u_resolution;
  float aspect = layoutResolution.x / layoutResolution.y;
  vec2 center = vec2(u_center_x * aspect, u_center_y);
  vec2 screen = (vec2(uv.x * aspect, uv.y) - center) / max(u_scale, 0.01);

  // Undo the screen-space camera orientation, then lift the compressed axis
  // back into the galaxy plane. Sampling the galaxy in this plane produces an
  // oblique projected disc rather than a face-on procedural texture.
  vec2 viewed = rotate2d(-u_view_angle) * screen;
  float tiltCompression = max(cos(u_view_tilt), 0.24);
  vec2 galaxyPlane = vec2(viewed.x, viewed.y / tiltCompression);

  // Rotate the complete galaxy-space field around its own core. The arms,
  // filaments, and deterministic particle clumps now remain attached to one
  // another instead of changing only the logarithmic arm phase.
  float rotation = u_galaxy_rotation + u_time * 0.26;
  vec2 p = rotate2d(-rotation) * galaxyPlane;

  float angle = atan(p.y, p.x);
  float radius = length(p);
  float logarithmicPhase = angle - 4.55 * log(radius + 0.055);
  float radialFade = (1.0 - smoothstep(0.05, 0.68, radius)) * smoothstep(0.012, 0.075, radius);
  float outerFade = (1.0 - smoothstep(0.12, 0.82, radius)) * smoothstep(0.04, 0.13, radius);

  float broadArms = armField(logarithmicPhase, radius, 0.045 * u_arm_width) * radialFade;
  float diffuseArms = armField(logarithmicPhase + 0.06, radius, 0.085 * u_arm_width) * outerFade;
  float outerArms = armField(logarithmicPhase - 0.04, radius, 0.13 * u_arm_width) * outerFade;
  float filamentA = armField(logarithmicPhase + 0.13, radius, 0.0065 * u_arm_width) * radialFade;
  float filamentB = armField(logarithmicPhase - 0.17, radius, 0.009 * u_arm_width) * radialFade;
  float generation3 = smoothstep(2.1, 2.9, u_generation);
  // Cosmos 3 receives a parallel cool spiral displaced to one side of the
  // green arms. Keeping the phase separation large and fading it in away from
  // the core prevents green + violet additive highlights from turning white.
  float violetRadialGate = smoothstep(0.115, 0.22, radius) * (1.0 - smoothstep(0.58, 0.76, radius));
  float spectralOffset = max(u_spectral_offset, 0.01);
  float spectralWidth = max(u_spectral_width, 0.05);
  float violetBandA = armField(logarithmicPhase + spectralOffset + 0.02, radius, 0.014 * u_arm_width * spectralWidth) * outerFade * violetRadialGate;
  float violetBandB = armField(logarithmicPhase + spectralOffset - 0.07, radius, 0.024 * u_arm_width * spectralWidth) * outerFade * violetRadialGate;
  float violetStreakA = armField(logarithmicPhase + spectralOffset + 0.04, radius, 0.0055 * u_arm_width * spectralWidth) * outerFade * violetRadialGate;
  float violetStreakB = armField(logarithmicPhase + spectralOffset - 0.04, radius, 0.0080 * u_arm_width * spectralWidth) * outerFade * violetRadialGate;
  // Smooth galaxy-space noise moves continuously with the rotating disc.
  // The old floor/hash field jumped at every cell boundary and appeared to
  // twinkle at sub-pixel scale. The control can selectively restore a small
  // amount of that granular texture without changing arm geometry.
  float twinkle = clamp(u_particle_twinkle, 0.0, 1.0);
  float smoothViolet = valueNoise((p + 1.0) * 165.0);
  float granularViolet = hash21(floor((p + 1.0) * 310.0));
  float violetBreakup = mix(0.34, 1.0,
    mix(smoothViolet, granularViolet, twinkle));
  float smoothDust = valueNoise((p + 1.0) * 245.0);
  float granularDust = hash21(floor((p + 1.0) * 520.0));
  float dust = mix(smoothDust, granularDust, twinkle);
  float clumps = smoothstep(0.52, 0.96, dust) * broadArms;

  vec3 color = vec3(0.004, 0.009, 0.015);
  float rightField = smoothstep(0.12, 0.78, uv.x);
  color += vec3(0.01, 0.045, 0.021) * rightField;
  color += vec3(0.014, 0.052, 0.024) * outerArms * 0.24 * u_brightness;
  color += vec3(0.035, 0.12, 0.018) * diffuseArms * 0.28 * u_brightness;
  color += vec3(0.12, 0.34, 0.035) * broadArms * 0.46 * u_brightness;
  color += vec3(0.34, 0.72, 0.09) * filamentA * 0.68 * u_brightness;
  color += vec3(0.72, 0.56, 0.16) * filamentB * 0.42 * u_brightness;
  color += vec3(0.64, 0.9, 0.24) * clumps * 0.58 * u_brightness;
  // Cosmos 3 keeps the same two-arm silhouette as Cosmos 2, but adds a
  // second, cool spectral structure inside each arm rather than inventing a
  // third arm. The broken streaks read as a newer layered generation while
  // the official green galaxy remains dominant.
  float spectralStrength = generation3 * u_spectral_intensity;
  float violetBody = clamp((violetBandA * 0.72 + violetBandB * 0.46)
    * (0.58 + 0.42 * violetBreakup) * spectralStrength, 0.0, 0.88);
  float violetFilament = clamp((violetStreakA * 0.86 + violetStreakB * 0.58)
    * violetBreakup * spectralStrength, 0.0, 1.0);
  float spectralHue = clamp(u_spectral_hue, -1.0, 1.0);
  vec3 violetBaseNeutral = vec3(0.17, 0.035, 0.34);
  vec3 violetBaseCool = vec3(0.025, 0.075, 0.50);
  vec3 violetBaseWarm = vec3(0.42, 0.020, 0.22);
  vec3 violetLightNeutral = vec3(0.52, 0.16, 0.88);
  vec3 violetLightCool = vec3(0.10, 0.36, 1.00);
  vec3 violetLightWarm = vec3(1.00, 0.16, 0.62);
  vec3 violetBase = spectralHue < 0.0
    ? mix(violetBaseNeutral, violetBaseCool, -spectralHue)
    : mix(violetBaseNeutral, violetBaseWarm, spectralHue);
  vec3 violetLight = spectralHue < 0.0
    ? mix(violetLightNeutral, violetLightCool, -spectralHue)
    : mix(violetLightNeutral, violetLightWarm, spectralHue);
  float spectralPaleness = clamp(u_spectral_paleness, 0.0, 1.0);
  violetBase = mix(violetBase, vec3(0.48, 0.30, 0.68), spectralPaleness);
  violetLight = mix(violetLight, vec3(0.82, 0.58, 1.00), spectralPaleness);
  float spectralBrightness = max(u_spectral_brightness, 0.0) * u_brightness;
  violetBase *= spectralBrightness;
  violetLight *= spectralBrightness;
  // Hue replacement, rather than additive RGB, keeps both the original
  // yellow-green arms and the displaced violet arms saturated.
  color = mix(color, violetBase, violetBody * 0.62);
  color = mix(color, violetLight, violetFilament * 0.76);

  float core = exp(-radius * 18.0);
  float halo = exp(-radius * 5.4);
  color += vec3(0.94, 0.76, 0.27) * core * 1.2;
  color += vec3(0.16, 0.46, 0.04) * halo * 0.34;

  // Sparse deterministic stars stay fixed while the arm phase may rotate.
  vec2 starCell = floor(vec2(uv.x * aspect, uv.y) * 260.0);
  float starSeed = hash21(starCell);
  float stars = smoothstep(0.994, 1.0, starSeed);
  float leftFade = smoothstep(0.2, 0.58, uv.x);
  color += vec3(0.54, 0.74, 0.48) * stars * (0.12 + leftFade * 0.32);

  // Preserve title contrast while keeping the offset galaxy fully inside frame.
  color *= mix(0.72, 1.0, smoothstep(0.14, 0.52, uv.x));
  float grain = hash21(gl_FragCoord.xy) - 0.5;
  color += grain / 390.0;
  outColor = vec4(pow(max(color, 0.0), vec3(0.92)), 1.0);
}

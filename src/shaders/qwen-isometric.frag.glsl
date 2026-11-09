#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_layout_resolution;
uniform vec2 u_viewport;
uniform float u_time;
uniform float u_center_x;
uniform float u_center_y;
uniform float u_scale;
uniform float u_motion;
uniform float u_generation;
uniform float u_catalog_spread;
out vec4 outColor;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

vec2 drift(float phase) {
  // `u_time` already includes the prototype's Drift speed multiplier. Keep
  // the shader's base rate high enough that 1x is visibly animated while the
  // reviewed sub-1x defaults retain their restrained, slow movement.
  float slowTime = u_time * 0.6;
  return vec2(
    sin(slowTime + phase) * 0.030 * u_motion,
    cos(slowTime * 0.73 + phase * 1.37) * 0.042 * u_motion
  );
}

float edgeDistance(vec2 p, vec2 a, vec2 b) {
  vec2 edge = b - a;
  vec2 point = p - a;
  return (edge.x * point.y - edge.y * point.x) / length(edge);
}

float quadDistance(vec2 p, vec2 a, vec2 b, vec2 c, vec2 d) {
  return min(min(edgeDistance(p, a, b), edgeDistance(p, b, c)),
             min(edgeDistance(p, c, d), edgeDistance(p, d, a)));
}

vec3 compositeQuad(vec3 base, vec2 p, vec2 a, vec2 b, vec2 c, vec2 d, vec3 tint, float alpha, float rimStrength) {
  float distanceToQuad = quadDistance(p, a, b, c, d);
  float fill = smoothstep(-0.0025, 0.0025, distanceToQuad);
  float rim = exp(-abs(distanceToQuad) * 520.0);
  base = mix(base, tint, fill * alpha);
  base += tint * rim * rimStrength;
  return base;
}

vec3 slab(vec3 base, vec2 p, vec2 center, float width, float height, float depth, vec3 tint, float alpha) {
  // Two oblique basis vectors create a repeatable isometric projection.
  vec2 horizontal = vec2(width, -width * 0.235);
  vec2 vertical = vec2(height * 0.48, height);
  vec2 a = center - horizontal - vertical;
  vec2 b = center + horizontal - vertical;
  vec2 c = center + horizontal + vertical;
  vec2 d = center - horizontal + vertical;
  vec2 down = vec2(0.0, depth);

  // Thickness faces are painted first, then the glass-like top plane.
  base = compositeQuad(base, p, d, c, c + down, d + down, tint * vec3(0.34, 0.46, 0.8), alpha * 0.72, 0.05);
  base = compositeQuad(base, p, b, c, c + down, b + down, tint * vec3(0.28, 0.42, 0.76), alpha * 0.56, 0.045);
  base = compositeQuad(base, p, a, b, c, d, tint, alpha, 0.11);

  // A restrained inner reflection gives depth without becoming illustration.
  vec2 insetA = mix(a, center, 0.09);
  vec2 insetB = mix(b, center, 0.09);
  vec2 insetC = mix(c, center, 0.09);
  vec2 insetD = mix(d, center, 0.09);
  float reflection = smoothstep(-0.0018, 0.0018, quadDistance(p, insetA, insetB, insetC, insetD));
  float sweep = smoothstep(0.08, 0.92, (p.x - a.x) / max(0.001, c.x - a.x));
  base += tint * reflection * sweep * 0.035;
  return base;
}

vec2 spreadCenter(vec2 center, float spread) {
  return vec2(center.x, 0.5 + (center.y - 0.5) * spread);
}

void main() {
  float viewportScale = u_viewport.y > 0.0 ? u_viewport.y : 1.0;
  vec2 rawUv = vec2(u_viewport.x + gl_FragCoord.x / u_resolution.x * viewportScale, gl_FragCoord.y / u_resolution.y);
  rawUv.y = 1.0 - rawUv.y;
  vec2 compositionCenter = vec2(u_center_x, u_center_y);
  vec2 uv = compositionCenter + (rawUv - compositionCenter) / max(u_scale, 0.01);

  vec3 color = vec3(0.006, 0.009, 0.022);
  float generation35 = smoothstep(3.12, 3.46, u_generation);
  float generation38 = smoothstep(3.62, 3.78, u_generation);
  float rightReveal = smoothstep(0.24, 0.68, rawUv.x);
  float focus = exp(-length((rawUv - compositionCenter) * vec2(0.78, 1.32)) * 2.4);
  color += vec3(0.015, 0.055, 0.19) * rightReveal;
  color += vec3(0.025, 0.11, 0.42) * focus * 0.34;

  // Back-to-front stack of long rectangular planes. Their shared projection
  // extends the current Qwen mark's three-axis, hexagonal/isometric character.
  vec3 deepBlue = mix(vec3(0.20, 0.18, 0.78), vec3(0.11, 0.29, 0.92), generation35);
  vec3 clearBlue = mix(vec3(0.29, 0.22, 0.86), vec3(0.08, 0.43, 1.0), generation35);
  vec3 violetBlue = mix(vec3(0.24, 0.16, 0.72), vec3(0.16, 0.25, 0.88), generation35);
  clearBlue = mix(clearBlue, vec3(0.05, 0.52, 1.0), generation38);
  violetBlue = mix(violetBlue, vec3(0.20, 0.19, 0.96), generation38);
  float spread = 1.0 + 0.34 * u_catalog_spread;
  color = slab(color, uv, spreadCenter(vec2(0.70, 0.22), spread) + drift(0.2), 0.16, 0.033, 0.012, deepBlue, 0.18);
  color = slab(color, uv, spreadCenter(vec2(0.84, 0.29), spread) + drift(1.1), 0.19, 0.037, 0.014, clearBlue, 0.22);
  color = slab(color, uv, spreadCenter(vec2(0.62, 0.34), spread) + drift(2.0), 0.22, 0.044, 0.017, violetBlue, 0.28);
  color = slab(color, uv, spreadCenter(vec2(0.79, 0.43), spread) + drift(2.9), 0.31, 0.055, 0.022, mix(deepBlue, clearBlue, 0.64), 0.42);
  color = slab(color, uv, spreadCenter(vec2(0.65, 0.53), spread) + drift(3.8), 0.27, 0.052, 0.021, mix(violetBlue, deepBlue, 0.5), 0.38);
  color = slab(color, uv, spreadCenter(vec2(0.86, 0.62), spread) + drift(4.7), 0.24, 0.046, 0.019, clearBlue, 0.35);
  color = slab(color, uv, spreadCenter(vec2(0.72, 0.72), spread) + drift(5.6), 0.19, 0.039, 0.015, violetBlue, 0.25);

  // Keep the left side quiet for model name and controls.
  color *= mix(0.62, 1.0, smoothstep(0.16, 0.54, rawUv.x));
  float grain = hash21(gl_FragCoord.xy) - 0.5;
  color += grain / 360.0;
  color *= 1.0 - smoothstep(0.84, 1.34, length((rawUv - 0.5) * vec2(0.72, 1.0))) * 0.3;
  outColor = vec4(pow(max(color, 0.0), vec3(0.92)), 1.0);
}

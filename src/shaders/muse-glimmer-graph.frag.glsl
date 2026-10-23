#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_layout_resolution;
uniform vec2 u_viewport;
uniform float u_time;
uniform float u_node_drift;
uniform float u_node_drift_speed;
uniform float u_signal_speed;
uniform float u_branch_activity;
out vec4 outColor;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec2 baseNode(int index) {
  if (index == 0) return vec2(0.18, 0.49);
  if (index == 1) return vec2(0.29, 0.74);
  if (index == 2) return vec2(0.34, 0.27);
  if (index == 3) return vec2(0.43, 0.52);
  if (index == 4) return vec2(0.50, 0.84);
  if (index == 5) return vec2(0.54, 0.35);
  if (index == 6) return vec2(0.63, 0.62);
  if (index == 7) return vec2(0.67, 0.17);
  if (index == 8) return vec2(0.71, 0.42);
  if (index == 9) return vec2(0.76, 0.79);
  if (index == 10) return vec2(0.81, 0.27);
  if (index == 11) return vec2(0.85, 0.57);
  if (index == 12) return vec2(0.89, 0.88);
  if (index == 13) return vec2(0.91, 0.38);
  if (index == 14) return vec2(0.96, 0.68);
  return vec2(0.98, 0.20);
}

vec2 nodePosition(int index, float aspect) {
  float fi = float(index);
  vec2 drift = vec2(
    sin(u_time * u_node_drift_speed * (0.071 + fi * 0.003) + fi * 1.73),
    cos(u_time * u_node_drift_speed * (0.063 + fi * 0.004) + fi * 2.11)
  );
  vec2 base = baseNode(index);
  return vec2(base.x * aspect, base.y)
    + vec2(drift.x * aspect, drift.y) * 0.010 * u_node_drift;
}

ivec2 edgeNodes(int index) {
  if (index == 0) return ivec2(0, 1);
  if (index == 1) return ivec2(0, 2);
  if (index == 2) return ivec2(0, 3);
  if (index == 3) return ivec2(1, 3);
  if (index == 4) return ivec2(1, 4);
  if (index == 5) return ivec2(2, 3);
  if (index == 6) return ivec2(2, 5);
  if (index == 7) return ivec2(3, 4);
  if (index == 8) return ivec2(3, 5);
  if (index == 9) return ivec2(3, 6);
  if (index == 10) return ivec2(4, 6);
  if (index == 11) return ivec2(4, 9);
  if (index == 12) return ivec2(5, 6);
  if (index == 13) return ivec2(5, 7);
  if (index == 14) return ivec2(5, 8);
  if (index == 15) return ivec2(6, 8);
  if (index == 16) return ivec2(6, 9);
  if (index == 17) return ivec2(6, 11);
  if (index == 18) return ivec2(7, 8);
  if (index == 19) return ivec2(7, 10);
  if (index == 20) return ivec2(7, 15);
  if (index == 21) return ivec2(8, 10);
  if (index == 22) return ivec2(8, 11);
  if (index == 23) return ivec2(9, 11);
  if (index == 24) return ivec2(9, 12);
  if (index == 25) return ivec2(9, 14);
  if (index == 26) return ivec2(10, 11);
  if (index == 27) return ivec2(10, 13);
  if (index == 28) return ivec2(10, 15);
  if (index == 29) return ivec2(11, 13);
  if (index == 30) return ivec2(11, 14);
  return ivec2(13, 15);
}

float segmentDistance(vec2 p, vec2 a, vec2 b, out float along) {
  vec2 ab = b - a;
  along = clamp(dot(p - a, ab) / max(dot(ab, ab), 0.00001), 0.0, 1.0);
  return length(p - (a + ab * along));
}

float lineSegment(vec2 p, vec2 a, vec2 b, float width) {
  float along;
  float distanceToLine = segmentDistance(p, a, b, along);
  return exp(-pow(distanceToLine / width, 2.0))
    * smoothstep(0.0, 0.035, along)
    * (1.0 - smoothstep(0.965, 1.0, along));
}

float burstOrb(vec2 p, vec2 a, vec2 b, float cycle) {
  // Ease-out motion: a signal is ejected rapidly from its source node, then
  // loses speed as it approaches the destination. Faint delayed samples form
  // a short luminous tail without introducing an arrow glyph.
  float visibility = smoothstep(0.0, 0.055, cycle)
    * (1.0 - smoothstep(0.80, 0.98, cycle));
  float light = 0.0;
  for (int trail = 0; trail < 5; ++trail) {
    float delayedCycle = max(cycle - float(trail) * 0.010, 0.0);
    float progress = 1.0 - pow(1.0 - delayedCycle, 3.4);
    vec2 center = mix(a, b, progress);
    float distanceToOrb = length(p - center);
    float trailFade = exp(-float(trail) * 0.72);
    float core = exp(-pow(distanceToOrb / 0.0052, 2.0));
    float halo = exp(-distanceToOrb * 88.0) * 0.18;
    light += (core + halo) * trailFade;
  }
  return light * visibility;
}

void main() {
  float viewportScale = u_viewport.y > 0.0 ? u_viewport.y : 1.0;
  vec2 uv = vec2(u_viewport.x + gl_FragCoord.x / u_resolution.x * viewportScale, gl_FragCoord.y / u_resolution.y);
  uv.y = 1.0 - uv.y;
  vec2 layoutResolution = u_layout_resolution.x > 0.0 ? u_layout_resolution : u_resolution;
  float aspect = layoutResolution.x / layoutResolution.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec3 color = mix(vec3(0.0015, 0.003, 0.008), vec3(0.003, 0.010, 0.024), uv.x);

  // The official launch KV is a sparse directed graph. Nodes drift slowly;
  // edges are recomputed from those positions rather than moving independently.
  for (int edge = 0; edge < 32; ++edge) {
    ivec2 pair = edgeNodes(edge);
    vec2 a = nodePosition(pair.x, aspect);
    vec2 b = nodePosition(pair.y, aspect);
    float along;
    float distanceToLine = segmentDistance(p, a, b, along);
    float endpointFade = smoothstep(0.0, 0.025, along) * (1.0 - smoothstep(0.975, 1.0, along));
    float seed = hash21(vec2(float(edge), 4.1));
    float intensity = 0.48 + seed * 0.42;
    float core = exp(-pow(distanceToLine / (0.00115 + seed * 0.00065), 2.0)) * endpointFade;
    float halo = exp(-pow(distanceToLine / 0.0065, 2.0)) * endpointFade;
    vec3 edgeColor = mix(vec3(0.08, 0.26, 0.92), vec3(0.00, 0.63, 1.00), seed);
    color += edgeColor * halo * 0.075;
    color += edgeColor * core * intensity;

    float signalCycle = fract(u_time * (0.055 + 0.090 * u_signal_speed) + seed);
    color += mix(edgeColor, vec3(0.72, 0.91, 1.0), 0.38)
      * burstOrb(p, a, b, signalCycle) * 0.86;
  }

  // A temporary tool branch appears, produces a result, and reconnects. This
  // is a visual metaphor for invocation/recovery, not an architecture diagram.
  float branchCycle = 0.5 + 0.5 * sin(u_time * 0.22 - 0.9);
  float branchVisibility = smoothstep(0.54, 0.76, branchCycle)
    * (1.0 - smoothstep(0.91, 1.0, branchCycle)) * u_branch_activity;
  vec2 branchRoot = nodePosition(6, aspect);
  vec2 branchNode = vec2(0.72 * aspect, 0.08)
    + vec2(sin(u_time * u_node_drift_speed * 0.09) * aspect, cos(u_time * u_node_drift_speed * 0.08)) * 0.009 * u_node_drift;
  vec2 returnNode = nodePosition(11, aspect);
  float branchOut = lineSegment(p, branchRoot, branchNode, 0.0015);
  float branchBack = lineSegment(p, branchNode, returnNode, 0.00125);
  color += vec3(0.18, 0.58, 1.0) * branchOut * branchVisibility * 0.85;
  color += vec3(0.08, 0.76, 1.0) * branchBack * branchVisibility * 0.72;
  color += vec3(0.60, 0.88, 1.0)
    * burstOrb(p, branchRoot, branchNode, fract(u_time * (0.085 + 0.11 * u_signal_speed)))
    * branchVisibility;

  for (int index = 0; index < 16; ++index) {
    vec2 node = nodePosition(index, aspect);
    float fi = float(index);
    float distanceToNode = length(p - node);
    float size = index == 0 ? 0.010 : 0.0048 + hash21(vec2(fi, 8.3)) * 0.0038;
    float halo = exp(-distanceToNode * (28.0 + fi * 1.8));
    float core = exp(-pow(distanceToNode / size, 2.0));
    vec3 nodeColor = mix(vec3(0.28, 0.42, 1.0), vec3(0.18, 0.83, 1.0), fi / 15.0);
    color += nodeColor * halo * 0.14;
    color += mix(nodeColor, vec3(0.93, 0.98, 1.0), 0.68) * core * 1.16;
  }

  float branchDistance = length(p - branchNode);
  color += vec3(0.35, 0.76, 1.0) * exp(-branchDistance * 42.0) * branchVisibility * 0.18;
  color += vec3(0.90, 0.98, 1.0) * exp(-pow(branchDistance / 0.006, 2.0)) * branchVisibility;

  // Deterministic glimmer dust clusters around the routed nodes.
  vec2 dustCell = floor(uv * vec2(270.0, 220.0));
  vec2 dustPointUv = (dustCell + vec2(hash21(dustCell), hash21(dustCell + 9.7))) / vec2(270.0, 220.0);
  vec2 dustPoint = vec2(dustPointUv.x * aspect, dustPointUv.y);
  float nearest = 10.0;
  for (int index = 0; index < 16; ++index) nearest = min(nearest, length(dustPoint - nodePosition(index, aspect)));
  float dustChance = smoothstep(0.965, 1.0, hash21(dustCell + 23.4));
  float dustShape = exp(-length((p - dustPoint) * vec2(270.0, 220.0)) * 4.0);
  float dustField = exp(-nearest * 20.0);
  color += vec3(0.24, 0.68, 1.0) * dustChance * dustShape * dustField * 0.72;

  color *= mix(0.24, 1.0, smoothstep(0.12, 0.56, uv.x));
  color += (hash21(gl_FragCoord.xy) - 0.5) / 600.0;
  outColor = vec4(pow(max(color, 0.0), vec3(0.92)), 1.0);
}

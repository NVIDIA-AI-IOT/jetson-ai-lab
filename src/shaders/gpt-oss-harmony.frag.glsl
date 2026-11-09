#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_layout_resolution;
uniform vec2 u_viewport;
uniform float u_time;
uniform float u_grid_angle;
uniform float u_grid_density;
uniform float u_tile_contrast;
uniform float u_pulse_rate;
uniform float u_pulse_activity;
uniform float u_blue_highlight;
uniform float u_distance_fog;
out vec4 outColor;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

mat2 rotate2d(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

float pulseAmount(vec2 id) {
  // The original flip experiment was intentionally conspicuous. This version
  // uses event periods about ten times longer and a hash gate, leaving only an
  // occasional foreground tile with a quiet color response.
  float activity = clamp(u_pulse_activity, 0.0, 1.0);
  float basePeriod = mix(180.0, 70.0, activity);
  float period = basePeriod / max(u_pulse_rate, 0.01);
  // Cadence changes the interval but intentionally not the visible pulse
  // duration. Increasing it therefore makes activity easier to discover
  // instead of merely making equally rare pulses finish more quickly.
  float eventTime = mod(u_time + hash21(id) * period, period);
  float enabled = step(0.82 - 0.32 * activity,
    hash21(id + vec2(41.7, 19.3)));
  float rise = smoothstep(0.0, 0.28, eventTime);
  float fall = 1.0 - smoothstep(0.72, 2.05, eventTime);
  return rise * fall * enabled;
}

void main() {
  float viewportScale = u_viewport.y > 0.0 ? u_viewport.y : 1.0;
  vec2 uv = vec2(u_viewport.x + gl_FragCoord.x / u_resolution.x * viewportScale, gl_FragCoord.y / u_resolution.y);
  uv.y = 1.0 - uv.y;
  vec3 color = mix(vec3(0.006), vec3(0.020), uv.x);

  // Rotate the complete camera framing before unprojecting the ground plane.
  // The resulting tiles are analytic perspective cells, not a literal model
  // topology or expert diagram.
  vec2 cameraUv = rotate2d(-0.10 * u_grid_angle) * (uv - vec2(0.68, 0.52)) + vec2(0.68, 0.52);
  float horizon = 0.19 + 0.035 * u_grid_angle;
  float depthT = (cameraUv.y - horizon) / (1.02 - horizon);
  float validDepth = step(0.018, depthT) * (1.0 - step(1.08, depthT));
  float inverseDepth = 1.0 / max(depthT, 0.018);

  // An offset vanishing point and a yaw term give the grid a strong diagonal,
  // low side-view composition. Density changes cell count without changing
  // the camera crop.
  float vanishingX = 0.83;
  float worldX = (cameraUv.x - vanishingX) * inverseDepth * 1.15;
  float worldZ = (inverseDepth - 1.0) * 0.72;
  float gridColumns = 7.0 + 3.2 * u_grid_density;
  float gridRows = 4.8 + 2.2 * u_grid_density;
  vec2 gridPoint = vec2(
    worldX * gridColumns + worldZ * 1.55 * u_grid_angle,
    worldZ * gridRows
  );

  float planeWidth = 1.0 - smoothstep(1.05, 1.38, abs(worldX));
  float nearFade = 1.0 - smoothstep(0.93, 1.06, depthT);
  float fogAmount = clamp(u_distance_fog, 0.0, 2.0) * 0.5;
  float fogStart = mix(0.025, 0.22, fogAmount);
  float fogClear = mix(0.16, 0.62, fogAmount);
  float distanceVisibility = smoothstep(fogStart, fogClear, depthT);
  float planeMask = validDepth * planeWidth * nearFade * distanceVisibility;

  // The fog makes this region visually empty, so avoid evaluating tile IDs,
  // hashes, animation, reflection, seams, and pulse color there. Fragments are
  // still rasterized for the full canvas, but the expensive part of the
  // procedural field now runs only where foreground detail is visible.
  if (planeMask < 0.002) {
    vec3 distantColor = vec3(0.006, 0.007, 0.008);
    distantColor *= mix(0.18, 1.0, smoothstep(0.12, 0.48, uv.x));
    distantColor += (hash21(gl_FragCoord.xy + floor(u_time)) - 0.5) / 900.0;
    outColor = vec4(pow(max(distantColor, 0.0), vec3(0.94)), 1.0);
    return;
  }

  vec2 cellId = floor(gridPoint);
  vec2 cell = fract(gridPoint) - 0.5;
  float edgeDistance = max(abs(cell.x), abs(cell.y));
  float perspectiveSoftness = 0.018 + (1.0 - depthT) * 0.055;
  float tile = 1.0 - smoothstep(0.39, 0.39 + perspectiveSoftness, edgeDistance);

  float randomTone = hash21(cellId);
  // depthT approaches one at the camera. The pulse is explicitly suppressed
  // in the distant two thirds of the plane where it would turn into flicker.
  float foregroundOnly = smoothstep(0.62, 0.82, depthT);
  float tilePulse = pulseAmount(cellId) * foregroundOnly;
  float slowShimmer = 0.5 + 0.5 * sin(u_time * 0.12 + randomTone * 6.2831 + cellId.x * 0.09);
  float gray = mix(0.10, 0.56, randomTone) * mix(0.72, 1.08, slowShimmer);
  gray = mix(0.18, gray, u_tile_contrast);

  // A soft directional reflection travels across the physical plane while the
  // tiles themselves remain orderly and monochrome.
  float reflectionPhase = gridPoint.x * 0.11 + gridPoint.y * 0.055 - u_time * 0.055;
  float reflection = exp(-pow(sin(reflectionPhase), 2.0) / 0.035);
  gray += reflection * 0.16 * u_tile_contrast;

  vec3 neutralTile = vec3(gray) * mix(0.55, 1.0, depthT);
  vec3 launchBlue = vec3(0.20, 0.63, 1.0);
  float blueResponse = tilePulse * u_blue_highlight;
  vec3 pulseTile = neutralTile * vec3(0.88, 0.97, 1.08)
    + launchBlue * 0.14;
  vec3 tileColor = mix(neutralTile, pulseTile,
    clamp(blueResponse, 0.0, 1.0));
  color = mix(color, tileColor, tile * planeMask * 0.92);

  // Thin inter-tile shadow and a faint horizon haze make the angle legible
  // without outlining a box or adding another brand mark.
  float seam = smoothstep(0.39, 0.45, edgeDistance) * (1.0 - smoothstep(0.45, 0.50, edgeDistance));
  color += vec3(0.05) * seam * planeMask * 0.25;
  color += launchBlue * seam * planeMask * blueResponse * 0.055;
  color += vec3(0.12) * exp(-pow((cameraUv.y - horizon) / 0.055, 2.0)) * 0.10;

  // Atmospheric distance fade hides the sub-pixel grid near the horizon.
  // It is chiefly a presentation treatment: fragment work is unchanged, but
  // distant aliasing and low-resolution breakup become much less noticeable.
  float hazeVisibility = mix(0.12, 1.0, distanceVisibility);
  color = mix(vec3(0.006, 0.007, 0.008), color, hazeVisibility);

  color *= mix(0.18, 1.0, smoothstep(0.12, 0.48, uv.x));
  color += (hash21(gl_FragCoord.xy + floor(u_time)) - 0.5) / 700.0;
  outColor = vec4(pow(max(color, 0.0), vec3(0.94)), 1.0);
}

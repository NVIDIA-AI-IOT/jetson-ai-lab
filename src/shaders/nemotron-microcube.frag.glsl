#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_layout_resolution;
uniform vec2 u_viewport;
uniform float u_time;
uniform float u_center_x;
uniform float u_center_y;
uniform float u_scale;
uniform float u_surface_angle;
uniform float u_tile_count;
uniform float u_wave_scale;
uniform float u_wave_amplitude;
uniform float u_mirror_tilt;
out vec4 outColor;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// z(x,y,t), dz/dx, dz/dy. Geometry and reflection share one wave.
vec3 waveGeometry(vec2 p) {
  float scale = max(u_wave_scale, 0.05);
  vec2 kA = vec2(2.75, 1.72) / scale;
  vec2 kB = vec2(-1.18, 2.46) / scale;
  float phaseA = dot(p, kA) - u_time * 0.44;
  float phaseB = dot(p, kB) + u_time * 0.27 + 1.2;
  // World-space height is intentionally larger than its screen projection:
  // this gives the mirrors a legible physical tilt without making them jump
  // multiple raster cells as the wave passes.
  float amplitude = 0.068 * u_wave_amplitude;
  float z = amplitude * (sin(phaseA) * 0.72 + sin(phaseB) * 0.28);
  vec2 gradient = amplitude * (
    cos(phaseA) * 0.72 * kA + cos(phaseB) * 0.28 * kB
  );
  return vec3(z, gradient);
}

mat2 inverseBasis(vec2 xAxis, vec2 yAxis) {
  float determinant = xAxis.x * yAxis.y - xAxis.y * yAxis.x;
  return mat2(yAxis.y, -xAxis.y, -yAxis.x, xAxis.x) / determinant;
}

void main() {
  float viewportScale = u_viewport.y > 0.0 ? u_viewport.y : 1.0;
  vec2 uv = vec2(u_viewport.x + gl_FragCoord.x / u_resolution.x * viewportScale, gl_FragCoord.y / u_resolution.y);
  uv.y = 1.0 - uv.y;

  // The left edge is intentionally black beneath hero copy. Avoid the
  // inverse-surface solve and mirror search for the fully hidden part.
  if (uv.x < 0.12) {
    vec3 darkField = vec3(0.0015, 0.006, 0.004);
    darkField += (hash21(gl_FragCoord.xy) - 0.5) / 520.0;
    outColor = vec4(pow(max(darkField, 0.0), vec3(0.9)), 1.0);
    return;
  }

  vec2 layoutResolution = u_layout_resolution.x > 0.0 ? u_layout_resolution : u_resolution;
  float aspect = layoutResolution.x / layoutResolution.y;
  vec2 screen = vec2((uv.x - u_center_x) * aspect, uv.y - u_center_y)
    / max(u_scale, 0.01);

  float angle = u_surface_angle;
  vec2 axisU = vec2(cos(angle), sin(angle));
  vec2 axisV = vec2(-sin(angle) * 0.58, cos(angle) * 0.58);
  mat2 surfaceToScreen = mat2(axisU, axisV);
  mat2 screenToSurface = inverseBasis(axisU, axisV);
  vec2 restingSurface = screenToSurface * screen;
  vec2 zProjection = vec2(-0.18, -0.25);

  // At high Z displacement the projected mirror can travel several resting
  // cells. Approximate the inverse displaced surface before choosing nearby
  // candidates, so the 5.0 tuning range remains continuous rather than
  // opening holes in the grid.
  vec2 estimatedSurface = restingSurface;
  for (int inverseStep = 0; inverseStep < 3; ++inverseStep) {
    float estimatedHeight = waveGeometry(estimatedSurface).x;
    vec2 nextEstimate = screenToSurface
      * (screen - zProjection * estimatedHeight * 1.7);
    estimatedSurface = mix(estimatedSurface, nextEstimate, 0.58);
  }
  float count = max(u_tile_count, 1.0);
  vec2 homeCell = floor(estimatedSurface * count);

  // Z is projected toward the camera, moving every mirror center on screen.
  float selectedMask = 0.0;
  float selectedHeight = -1e4;
  float selectedRim = 0.0;
  float selectedSeed = 0.0;
  vec2 selectedCellCenter = vec2(0.0);
  vec2 selectedLocal = vec2(0.0);
  vec2 selectedGradient = vec2(0.0);
  float contactShadow = 0.0;

  // Search a small neighborhood around the inverse-projected estimate. The
  // tuned low-density, close view needs only 3x3. Increasing density or
  // zooming out automatically restores 5x5 coverage around the perimeter.
  int searchRadius = (count <= 7.0 && u_scale >= 1.0) ? 1 : 2;
  for (int oy = -2; oy <= 2; ++oy) {
    for (int ox = -2; ox <= 2; ++ox) {
      if (abs(ox) > searchRadius || abs(oy) > searchRadius) continue;
      vec2 cell = homeCell + vec2(float(ox), float(oy));
      vec2 center = (cell + 0.5) / count;
      vec3 geometry = waveGeometry(center);
      float height = geometry.x;
      vec2 gradient = geometry.yz * u_mirror_tilt;
      vec2 projectedCenter = surfaceToScreen * center
        + zProjection * height * 1.7;

      // Height derivatives tilt the physical square. Projecting its tangent
      // basis shears/foreshortens the silhouette using the same geometry.
      vec2 basisX = (surfaceToScreen * vec2(1.0, 0.0)
        + zProjection * gradient.x * 0.42) / count;
      vec2 basisY = (surfaceToScreen * vec2(0.0, 1.0)
        + zProjection * gradient.y * 0.42) / count;
      mat2 projectedToLocal = inverseBasis(basisX, basisY);
      vec2 local = projectedToLocal * (screen - projectedCenter);
      float squareDistance = max(abs(local.x), abs(local.y));
      float mask = 1.0 - smoothstep(0.405, 0.465, squareDistance);

      vec2 shadowOffset = vec2(0.018, 0.024) * (0.25 + abs(height) * 10.0);
      vec2 shadowLocal = projectedToLocal * (screen - projectedCenter - shadowOffset);
      float shadowShape = 1.0 - smoothstep(0.43, 0.54,
        max(abs(shadowLocal.x), abs(shadowLocal.y)));
      contactShadow = max(contactShadow, shadowShape * (1.0 - mask));

      if (mask > 0.0 && (selectedMask <= 0.0 || height > selectedHeight)) {
        selectedMask = mask;
        selectedHeight = height;
        selectedRim = exp(-abs(squareDistance - 0.425) * 58.0) * mask;
        selectedSeed = hash21(cell);
        selectedCellCenter = center;
        selectedLocal = local;
        selectedGradient = gradient;
      }
    }
  }

  // Feather the first computed columns into the intentionally empty copy
  // area so the optimization boundary never appears as a vertical seam.
  float detailReveal = smoothstep(0.12, 0.32, uv.x);
  selectedMask *= detailReveal;
  selectedRim *= detailReveal;
  contactShadow *= detailReveal;

  vec3 color = vec3(0.0015, 0.006, 0.004);
  float surfaceGlow = exp(-length(screen * vec2(0.66, 1.05)) * 0.82);
  color += vec3(0.006, 0.04, 0.014) * surfaceGlow;

  if (selectedMask > 0.0) {
    vec3 normal = normalize(vec3(-selectedGradient.x, -selectedGradient.y, 1.0));
    vec3 viewDirection = normalize(vec3(-0.24, 0.18, 1.0));
    vec3 surfacePosition = vec3(selectedCellCenter, selectedHeight);
    vec3 keyPosition = vec3(
      0.28 + cos(u_time * 0.19) * 0.72,
      -0.16 + sin(u_time * 0.15) * 0.54,
      0.78
    );
    vec3 fillPosition = vec3(
      -0.72 + sin(u_time * 0.11) * 0.34,
      0.52 + cos(u_time * 0.13) * 0.28,
      1.08
    );
    vec3 keyLight = normalize(keyPosition - surfacePosition);
    vec3 fillLight = normalize(fillPosition - surfacePosition);
    float keySpecular = pow(max(0.0,
      dot(reflect(-keyLight, normal), viewDirection)), 30.0);
    float fillSpecular = pow(max(0.0,
      dot(reflect(-fillLight, normal), viewDirection)), 42.0);
    float diffuse = max(0.0, dot(normal, keyLight));

    // Keep every physical mirror faintly legible even when neither moving
    // light is reflected toward the camera. This is deliberately a low,
    // view-dependent environment reflection rather than another light hotspot.
    float ambientFacing = 0.52 + 0.48 * max(0.0, dot(normal, viewDirection));
    vec3 ambientMirror = mix(
      vec3(0.010, 0.050, 0.027),
      vec3(0.020, 0.105, 0.057),
      ambientFacing
    );
    color += ambientMirror * selectedMask * (0.58 + selectedSeed * 0.08);

    vec3 glassTint = mix(vec3(0.014, 0.085, 0.050),
      vec3(0.035, 0.20, 0.14), diffuse);
    float glassAlpha = 0.15 + diffuse * 0.11 + selectedSeed * 0.018;
    color = mix(color, glassTint, selectedMask * glassAlpha);
    color += vec3(0.01, 0.74, 0.86) * fillSpecular * selectedMask * 0.46;

    float raisedEdge = smoothstep(-0.12, 0.42,
      dot(selectedLocal, normalize(selectedGradient + vec2(0.001))));
    // #76B900 expressed before the final display-gamma transform below.
    // Both the raised rim and the strongest key reflection share this hue,
    // instead of drifting toward fluorescent yellow-green as they add up.
    vec3 nvidiaGreenLinear = vec3(0.424774, 0.700078, 0.0);
    color += mix(vec3(0.012, 0.12, 0.05), nvidiaGreenLinear, raisedEdge)
      * selectedRim * (0.08 + keySpecular * 0.48);
    float nvidiaGreenHighlight = smoothstep(0.018, 0.34, keySpecular)
      * selectedMask;
    color = mix(color, nvidiaGreenLinear, nvidiaGreenHighlight);
  } else {
    color += vec3(0.003, 0.025, 0.017);
  }

  color *= 1.0 - contactShadow * 0.68;
  color *= mix(0.38, 1.0, smoothstep(0.16, 0.53, uv.x));
  color += (hash21(gl_FragCoord.xy) - 0.5) / 420.0;
  outColor = vec4(pow(max(color, 0.0), vec3(0.9)), 1.0);
}

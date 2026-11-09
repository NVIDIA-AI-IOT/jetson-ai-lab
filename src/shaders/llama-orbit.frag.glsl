#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_layout_resolution;
uniform vec2 u_viewport;
uniform float u_time;
uniform float u_openness;
uniform float u_layers;
uniform float u_orbit_speed;
out vec4 outColor;

float hash21(vec2 p) { return fract(sin(dot(p, vec2(91.7, 287.3))) * 43758.5453); }

void main() {
  float viewportScale = u_viewport.y > 0.0 ? u_viewport.y : 1.0;
  vec2 uv = vec2(u_viewport.x + gl_FragCoord.x / u_resolution.x * viewportScale, gl_FragCoord.y / u_resolution.y); uv.y = 1.0 - uv.y;
  vec2 layoutResolution = u_layout_resolution.x > 0.0 ? u_layout_resolution : u_resolution;
  float aspect = layoutResolution.x / layoutResolution.y;
  vec2 p = vec2((uv.x - 0.73) * aspect, uv.y - 0.5);
  float t = u_time * u_orbit_speed;
  vec3 color = vec3(0.004, 0.018, 0.055);
  for (int i = 0; i < 7; i++) {
    float enabled = step(float(i), u_layers - 0.5);
    float fi = float(i);
    float a = atan(p.y, p.x);
    float r = length(p * vec2(0.72, 1.0));
    float target = 0.25 + fi * 0.042 + sin(a * (2.0 + mod(fi,2.0)) + t + fi) * (0.035 * u_openness);
    float arcGap = smoothstep(-0.72, -0.18, cos(a - 0.35 - fi*0.13));
    float line = exp(-pow((r-target)/0.008, 2.0)) * mix(1.0, arcGap, 0.38*u_openness) * enabled;
    color += mix(vec3(0.05,0.34,0.96), vec3(0.12,0.78,1.0), fi/6.0) * line * 0.62;
  }
  float nodeAngle = t * 0.72;
  vec2 node = vec2(cos(nodeAngle), sin(nodeAngle)) * vec2(0.31/0.72, 0.31);
  color += vec3(0.42,0.9,1.0) * exp(-length(p-node)*44.0);
  vec2 starCell = floor(vec2(uv.x*aspect,uv.y)*180.0);
  color += vec3(0.1,0.35,0.75) * smoothstep(0.992,1.0,hash21(starCell))*0.3;
  color *= mix(0.4,1.0,smoothstep(0.15,0.55,uv.x));
  outColor = vec4(pow(max(color,0.0),vec3(0.92)),1.0);
}

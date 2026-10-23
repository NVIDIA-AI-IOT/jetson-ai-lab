#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_layout_resolution;
uniform vec2 u_viewport;
uniform float u_time;
uniform float u_loop_depth;
uniform float u_wave_height;
uniform float u_iteration_speed;
out vec4 outColor;

float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }

void main() {
  float viewportScale=u_viewport.y>0.0?u_viewport.y:1.0;
  vec2 uv=vec2(u_viewport.x+gl_FragCoord.x/u_resolution.x*viewportScale,gl_FragCoord.y/u_resolution.y); uv.y=1.0-uv.y;
  vec2 layoutResolution=u_layout_resolution.x>0.0?u_layout_resolution:u_resolution;
  float aspect=layoutResolution.x/layoutResolution.y;
  vec2 p=vec2((uv.x-0.72)*aspect,uv.y-0.5);
  float t=u_time*u_iteration_speed;
  vec3 color=vec3(0.032,0.004,0.025);
  for(int i=0;i<10;i++) {
    float fi=float(i);
    float enabled=step(fi,u_loop_depth-0.5);
    float scale=1.0+fi*0.16;
    float x=p.x*scale+fi*0.035;
    float wave=sin(x*5.2+t+fi*0.62)*u_wave_height/(1.0+fi*0.18);
    float envelope=exp(-abs(x)*0.72);
    float line=exp(-pow((p.y-wave*envelope)/(0.014+fi*0.0015),2.0))*enabled;
    vec3 c=mix(vec3(1.0,0.08,0.52),vec3(1.0,0.34,0.18),fi/9.0);
    color+=c*line*(0.44-fi*0.018);
  }
  float feedback=exp(-length(p-vec2(0.02,0.0))*9.0)*(0.6+0.4*sin(t*1.7));
  color+=vec3(1.0,0.22,0.35)*feedback*0.34;
  vec2 cell=floor(vec2(uv.x*aspect,uv.y)*150.0);
  color+=vec3(0.45,0.05,0.25)*smoothstep(0.99,1.0,hash21(cell))*0.32;
  color*=mix(0.38,1.0,smoothstep(0.15,0.54,uv.x));
  outColor=vec4(pow(max(color,0.0),vec3(0.9)),1.0);
}

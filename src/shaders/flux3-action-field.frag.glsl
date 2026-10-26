#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_layout_resolution;
uniform vec2 u_viewport;
uniform float u_time;
uniform float u_horizon;
uniform float u_frame_depth;
uniform float u_action_energy;
out vec4 outColor;

float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float box(vec2 p,vec2 b){vec2 d=abs(p)-b;return length(max(d,0.0))+min(max(d.x,d.y),0.0);}

void main(){
  float viewportScale=u_viewport.y>0.0?u_viewport.y:1.0;
  vec2 uv=vec2(u_viewport.x+gl_FragCoord.x/u_resolution.x*viewportScale,gl_FragCoord.y/u_resolution.y); uv.y=1.0-uv.y;
  vec2 layoutResolution=u_layout_resolution.x>0.0?u_layout_resolution:u_resolution;
  float aspect=layoutResolution.x/layoutResolution.y;
  vec2 p=vec2((uv.x-0.72)*aspect,uv.y-0.5);
  float t=u_time*0.22;
  vec3 color=vec3(0.004,0.006,0.006);
  for(int i=0;i<9;i++){
    float fi=float(i);
    float enabled=step(fi,u_horizon-0.5);
    float z=fract(fi/9.0+t*0.08);
    vec2 center=vec2((z-0.5)*1.12, sin(fi*1.7+t)*0.18)*(0.62+z*0.55);
    vec2 size=vec2(0.13,0.085)*(0.55+z*u_frame_depth);
    float d=box(p-center,size);
    float edge=exp(-abs(d)*170.0)*enabled;
    float pane=(1.0-smoothstep(-0.01,0.012,d))*enabled;
    vec3 tint=mix(vec3(0.08,0.16,0.14),vec3(0.36,0.48,0.38),hash21(vec2(fi,3.0)));
    color+=tint*pane*0.15+vec3(0.48,0.66,0.55)*edge*0.5;
  }
  float actionY=sin(p.x*7.0-t*2.2)*0.07+sin(p.x*2.4+t)*0.035;
  float actionLine=exp(-pow((p.y-actionY)/0.012,2.0))*smoothstep(-0.25,0.55,p.x);
  color+=vec3(0.48,0.95,0.68)*actionLine*u_action_energy;
  float joints=0.0;
  for(int i=0;i<6;i++){
    float x=-0.12+float(i)*0.13;
    joints+=exp(-length(p-vec2(x,actionY))*42.0);
  }
  color+=vec3(0.75,1.0,0.82)*joints*0.45*u_action_energy;
  vec2 cell=floor(vec2(uv.x*aspect,uv.y)*190.0);
  color+=vec3(0.16,0.28,0.21)*smoothstep(0.994,1.0,hash21(cell))*0.38;
  color*=mix(0.3,1.0,smoothstep(0.17,0.55,uv.x));
  outColor=vec4(pow(max(color,0.0),vec3(0.92)),1.0);
}

#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_viewport;
uniform float u_time;
uniform float u_drift_speed;
uniform float u_step_scale;
uniform float u_depth;
out vec2 v_local;
out vec3 v_color;
out float v_pulse;
vec2 corner(int i){if(i==0)return vec2(-1.,-1.);if(i==1)return vec2(1.,-1.);if(i==2)return vec2(-1.,1.);if(i==3)return vec2(-1.,1.);if(i==4)return vec2(1.,-1.);return vec2(1.,1.);}
vec3 ramp(float t){vec3 r=vec3(.94,.055,.015),o=vec3(1.,.31,.015),y=vec3(1.,.82,.02);return t<.5?mix(r,o,t*2.):mix(o,y,(t-.5)*2.);}
void main(){int band=gl_InstanceID/12;int stepIndex=gl_InstanceID-band*12;float fi=float(band),sj=float(stepIndex);float time=u_time*(.025+.055*u_drift_speed),scale=max(u_step_scale,.35),phase=time+fi*.43;float x=.34+sj*.060+sin(phase+sj*.36)*.012;float stair=floor((sin(phase*.8+sj*.62)*.5+.5)*4.)/4.;float y=.16+fi*.085+(stair-.5)*.11*scale+(fi/8.-.5)*.11*u_depth;vec2 halfSize=vec2(.043+.010*sin(fi+sj),.025)*scale;vec2 q=corner(gl_VertexID);v_local=q;vec2 expanded=halfSize+vec2(.0028);vec2 fullUv=vec2(x,y)+q*expanded;vec2 localUv=vec2((fullUv.x-u_viewport.x)/u_viewport.y,fullUv.y);gl_Position=vec4(localUv.x*2.-1.,1.-localUv.y*2.,0.,1.);float shade=clamp(.10+fi/9.+sj*.018,0.,1.);v_color=ramp(shade);v_pulse=.72+.28*sin(phase*.7+sj*.25+fi);}

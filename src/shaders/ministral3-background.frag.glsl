#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_viewport;
out vec4 outColor;
float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 ramp(float t){vec3 r=vec3(.94,.055,.015),o=vec3(1.,.31,.015),y=vec3(1.,.82,.02);return t<.5?mix(r,o,t*2.):mix(o,y,(t-.5)*2.);}
void main(){float s=u_viewport.y>0.?u_viewport.y:1.;vec2 uv=vec2(u_viewport.x+gl_FragCoord.x/u_resolution.x*s,gl_FragCoord.y/u_resolution.y);uv.y=1.-uv.y;vec3 color=mix(vec3(.018,.018,.035),vec3(.045,.040,.055),uv.x);vec2 cell=floor(uv*vec2(180.,92.));float chance=smoothstep(.985,1.,hash21(cell));vec2 local=fract(uv*vec2(180.,92.))-.5;float speck=(1.-smoothstep(.10,.18,max(abs(local.x),abs(local.y))))*chance;color+=ramp(hash21(cell+7.))*speck*smoothstep(.28,.55,uv.x)*.32;color*=mix(.20,1.,smoothstep(.14,.52,uv.x));outColor=vec4(pow(max(color,0.),vec3(.94)),1.);}

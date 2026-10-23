#version 300 es
precision highp float;
precision highp int;
uniform vec2 u_resolution;
uniform vec2 u_viewport;
uniform int u_geometry_kind;
layout(location=0) in vec4 a_geometry;
layout(location=1) in vec4 a_color;
out vec2 v_local;
out vec3 v_color;
out float v_alpha;
vec2 corner(int i){if(i==0)return vec2(-1.,-1.);if(i==1)return vec2(1.,-1.);if(i==2)return vec2(-1.,1.);if(i==3)return vec2(-1.,1.);if(i==4)return vec2(1.,-1.);return vec2(1.,1.);}
vec2 localUv(vec2 uv){return vec2((uv.x-u_viewport.x)/u_viewport.y,uv.y);}
void main(){
  vec2 q=corner(gl_VertexID);v_local=q;v_color=a_color.rgb;v_alpha=a_color.a;
  if(u_geometry_kind==0){
    vec2 a=localUv(a_geometry.xy),b=localUv(a_geometry.zw);vec2 ap=a*u_resolution,bp=b*u_resolution;vec2 tangent=normalize(bp-ap),normal=vec2(-tangent.y,tangent.x);vec2 pos=mix(ap,bp,(q.x+1.)*.5)+normal*q.y*1.35;gl_Position=vec4(pos/u_resolution*2.-1.,0.,1.);gl_Position.y=-gl_Position.y;
  }else{
    vec2 cp=localUv(a_geometry.xy)*u_resolution;vec2 pos=cp+q*a_geometry.z;gl_Position=vec4(pos/u_resolution*2.-1.,0.,1.);gl_Position.y=-gl_Position.y;
  }
}

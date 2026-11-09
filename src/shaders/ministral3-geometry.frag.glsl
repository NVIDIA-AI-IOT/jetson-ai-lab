#version 300 es
precision highp float;
uniform float u_depth;
in vec2 v_local;
in vec3 v_color;
in float v_pulse;
out vec4 outColor;
void main(){float edge=max(abs(v_local.x),abs(v_local.y));float alpha=1.-smoothstep(.88,1.,edge);outColor=vec4(v_color,alpha*v_pulse*(.38+.34*u_depth));}

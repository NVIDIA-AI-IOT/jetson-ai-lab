#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_layout_resolution;
uniform vec2 u_viewport;
uniform float u_time;
uniform float u_node_drift;
uniform float u_node_drift_speed;
uniform float u_branch_activity;
out vec4 outColor;

float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 baseNode(int i) {
  if(i==0)return vec2(.18,.49);if(i==1)return vec2(.29,.74);if(i==2)return vec2(.34,.27);if(i==3)return vec2(.43,.52);
  if(i==4)return vec2(.50,.84);if(i==5)return vec2(.54,.35);if(i==6)return vec2(.63,.62);if(i==7)return vec2(.67,.17);
  if(i==8)return vec2(.71,.42);if(i==9)return vec2(.76,.79);if(i==10)return vec2(.81,.27);if(i==11)return vec2(.85,.57);
  if(i==12)return vec2(.89,.88);if(i==13)return vec2(.91,.38);if(i==14)return vec2(.96,.68);return vec2(.98,.20);
}
vec2 nodePosition(int i,float aspect){float f=float(i);float t=u_time*u_node_drift_speed;vec2 d=vec2(sin(t*(.071+f*.003)+f*1.73),cos(t*(.063+f*.004)+f*2.11));vec2 b=baseNode(i);return vec2(b.x*aspect,b.y)+vec2(d.x*aspect,d.y)*.010*u_node_drift;}
ivec2 edgeNodes(int i){
  if(i==0)return ivec2(0,1);if(i==1)return ivec2(0,2);if(i==2)return ivec2(0,3);if(i==3)return ivec2(1,3);
  if(i==4)return ivec2(1,4);if(i==5)return ivec2(2,3);if(i==6)return ivec2(2,5);if(i==7)return ivec2(3,4);
  if(i==8)return ivec2(3,5);if(i==9)return ivec2(3,6);if(i==10)return ivec2(4,6);if(i==11)return ivec2(4,9);
  if(i==12)return ivec2(5,6);if(i==13)return ivec2(5,7);if(i==14)return ivec2(5,8);if(i==15)return ivec2(6,8);
  if(i==16)return ivec2(6,9);if(i==17)return ivec2(6,11);if(i==18)return ivec2(7,8);if(i==19)return ivec2(7,10);
  if(i==20)return ivec2(7,15);if(i==21)return ivec2(8,10);if(i==22)return ivec2(8,11);if(i==23)return ivec2(9,11);
  if(i==24)return ivec2(9,12);if(i==25)return ivec2(9,14);if(i==26)return ivec2(10,11);if(i==27)return ivec2(10,13);
  if(i==28)return ivec2(10,15);if(i==29)return ivec2(11,13);if(i==30)return ivec2(11,14);return ivec2(13,15);
}
float segmentDistance(vec2 p,vec2 a,vec2 b,out float along){vec2 ab=b-a;along=clamp(dot(p-a,ab)/max(dot(ab,ab),.00001),0.,1.);return length(p-(a+ab*along));}
void main(){
  float viewportScale=u_viewport.y>0.?u_viewport.y:1.;
  vec2 uv=vec2(u_viewport.x+gl_FragCoord.x/u_resolution.x*viewportScale,gl_FragCoord.y/u_resolution.y);uv.y=1.-uv.y;
  vec2 lr=u_layout_resolution.x>0.?u_layout_resolution:u_resolution;float aspect=lr.x/lr.y;vec2 p=vec2(uv.x*aspect,uv.y);
  vec3 color=mix(vec3(.0015,.003,.008),vec3(.003,.010,.024),uv.x);
  for(int edge=0;edge<32;++edge){ivec2 pair=edgeNodes(edge);vec2 a=nodePosition(pair.x,aspect),b=nodePosition(pair.y,aspect);float along;float d=segmentDistance(p,a,b,along);float fade=smoothstep(0.,.035,along)*(1.-smoothstep(.965,1.,along));float seed=hash21(vec2(float(edge),4.1));vec3 ec=mix(vec3(.08,.26,.92),vec3(0.,.63,1.),seed);color+=ec*exp(-pow(d/.0075,2.))*fade*.11;}
  for(int i=0;i<16;++i){vec2 n=nodePosition(i,aspect);float f=float(i);float d=length(p-n);vec3 nc=mix(vec3(.28,.42,1.),vec3(.18,.83,1.),f/15.);color+=nc*exp(-d*(24.+f*1.25))*.15;}
  vec2 cell=floor(uv*vec2(220.,160.));vec2 duv=(cell+vec2(hash21(cell),hash21(cell+9.7)))/vec2(220.,160.);vec2 dp=vec2(duv.x*aspect,duv.y);float nearest=10.;for(int i=0;i<16;++i)nearest=min(nearest,length(dp-nodePosition(i,aspect)));float dust=smoothstep(.968,1.,hash21(cell+23.4))*exp(-length((p-dp)*vec2(220.,160.))*3.2)*exp(-nearest*20.);color+=vec3(.24,.68,1.)*dust*.64;
  color*=mix(.24,1.,smoothstep(.12,.56,uv.x));outColor=vec4(pow(max(color,0.),vec3(.92)),1.);
}

import {rimRadius, bowlHeight, SINKHOLE_INNER, SINKHOLE_DEPTH} from './stalheart/sinkhole-shape.js';

// Metres and seconds. The same geometry contract drives rendering and flight.
export const FUSE=65, FLARE_COUNT=10, EGG_COUNT=1600, HOLE_SCALE=24;
export const CHAMBER={x:0,y:-208,z:-79,r:90,ry:58,opening:.1};
export const QUEEN={x:0,y:-219,z:-101,scale:620,baseY:-254};
export const START={x:0,y:11,z:23};
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const elbow=12*Math.PI/2, upperStart=8+elbow, dropTurn=upperStart+55;
export const SHAFT_START=dropTurn+elbow;
export const SHAFT_TOP=-HOLE_SCALE*SINKHOLE_DEPTH-8-24;
export const CHAMBER_LIP=CHAMBER.y+CHAMBER.ry*Math.cos(CHAMBER.opening);
export const ROUTE_END=SHAFT_START+(SHAFT_TOP-CHAMBER_LIP);

// The bowl remains exterior. Darkness starts only after crossing its throat.
export const SINKHOLE_THROAT=-HOLE_SCALE*SINKHOLE_DEPTH;
export function exteriorExposure(y){return smooth(SINKHOLE_THROAT-7,SINKHOLE_THROAT-1,y);}

export function center(s){
  s=clamp(s,0,ROUTE_END);const throat=-HOLE_SCALE*SINKHOLE_DEPTH;
  if(s<=8)return {x:0,y:throat-s,z:0};
  if(s<upperStart){const a=(s-8)/12;return {x:0,y:throat-8-12*Math.sin(a),z:-12*(1-Math.cos(a))};}
  if(s<dropTurn){const u=(s-upperStart)/55;return {x:4*Math.sin(Math.PI*u)**2,y:throat-20,z:-12-(s-upperStart)};}
  if(s<SHAFT_START){const a=(s-dropTurn)/12;return {x:0,y:throat-20-12*(1-Math.cos(a)),z:-67-12*Math.sin(a)};}
  return {x:0,y:SHAFT_TOP-(s-SHAFT_START),z:-79};
}
function normalize(p){const n=Math.hypot(p.x,p.y,p.z)||1;return {x:p.x/n,y:p.y/n,z:p.z/n};}
export function frameAt(s,branch='main'){
  const a=branchCenter(branch,s-.05),b=branchCenter(branch,s+.05),t=normalize({x:b.x-a.x,y:b.y-a.y,z:b.z-a.z});
  const u=normalize({x:1-t.x*t.x,y:-t.x*t.y,z:-t.x*t.z});
  const v={x:t.y*u.z-t.z*u.y,y:t.z*u.x-t.x*u.z,z:t.x*u.y-t.y*u.x};
  return {c:branchCenter(branch,s),t,u,v};
}
export function radius(s,branch='main'){if(branch!=='main'){const b=BRANCHES.find(b=>b.id===branch);return b.id==='blind'?9.4-3.5*smooth(b.length-18,b.length,s):8.8;}return HOLE_SCALE*SINKHOLE_INNER+(9.4-HOLE_SCALE*SINKHOLE_INNER)*smooth(0,12,s)+(CHAMBER.r*Math.sin(CHAMBER.opening)-9.4)*smooth(SHAFT_START,ROUTE_END,s);}
export function wallRadius(s,a,branch='main'){
  const noise=.065*Math.sin(a*5+s*.11)+.045*Math.cos(a*9-s*.07)+.045*Math.sin(s*.83+a*7)+.025*Math.cos(s*1.4-a*13);
  const rim=branch==='main'?(rimRadius(a)-1)*(1-smooth(0,8,s)):0;
  return radius(s,branch)*(1+rim+noise*(branch==='main'?smooth(0,8,s)*(1-smooth(ROUTE_END-12,ROUTE_END,s)):1));
}
export function ringPoint(s,a,inset=0,branch='main'){const f=frameAt(s,branch),r=wallRadius(s,a,branch)-inset;return {x:f.c.x+r*(f.u.x*Math.cos(a)+f.v.x*Math.sin(a)),y:f.c.y+r*(f.u.y*Math.cos(a)+f.v.y*Math.sin(a)),z:f.c.z+r*(f.u.z*Math.cos(a)+f.v.z*Math.sin(a))};}
// The three sub-tunnels share a real junction, with two open routes to the Queen.
export const BRANCHES=[
  {id:'main',toQueen:true,length:ROUTE_END},
  {id:'left',toQueen:true,controls:[center(48),{x:-12,y:-35,z:-44},{x:-34,y:-44,z:-68},{x:-37,y:-65,z:-89},{x:-37,y:-114,z:-89},{x:-35,y:-151,z:-88},{x:-29,y:-178,z:-85}]},
  {id:'blind',toQueen:false,controls:[center(48),{x:19,y:-34,z:-42},{x:40,y:-40,z:-57},{x:58,y:-52,z:-65},{x:64,y:-65,z:-63}]}
];
function catmull(a,b,c,d,t){return {x:.5*((2*b.x)+(-a.x+c.x)*t+(2*a.x-5*b.x+4*c.x-d.x)*t*t+(-a.x+3*b.x-3*c.x+d.x)*t*t*t),y:.5*((2*b.y)+(-a.y+c.y)*t+(2*a.y-5*b.y+4*c.y-d.y)*t*t+(-a.y+3*b.y-3*c.y+d.y)*t*t*t),z:.5*((2*b.z)+(-a.z+c.z)*t+(2*a.z-5*b.z+4*c.z-d.z)*t*t+(-a.z+3*b.z-3*c.z+d.z)*t*t*t)};}
for(const b of BRANCHES.slice(1)){
  b.samples=[{s:0,p:b.controls[0]}];let length=0,last=b.controls[0];
  for(let i=0;i<b.controls.length-1;i++)for(let j=1;j<=40;j++){
    const p=catmull(b.controls[Math.max(0,i-1)],b.controls[i],b.controls[i+1],b.controls[Math.min(b.controls.length-1,i+2)],j/40);length+=distance(last,p);b.samples.push({s:length,p});last=p;
  }b.length=length;
}
export function branchCenter(id,s){
  if(id==='main')return center(s);const b=BRANCHES.find(b=>b.id===id);s=clamp(s,0,b.length);let lo=0,hi=b.samples.length-1;
  while(lo<hi){const mid=(lo+hi)>>1;if(b.samples[mid].s<s)lo=mid+1;else hi=mid;}
  const a=b.samples[Math.max(0,lo-1)],c=b.samples[lo],t=(s-a.s)/(c.s-a.s||1);return {x:a.p.x+(c.p.x-a.p.x)*t,y:a.p.y+(c.p.y-a.p.y)*t,z:a.p.z+(c.p.z-a.p.z)*t};
}
for(const b of BRANCHES){b.route=Array.from({length:Math.ceil(b.length)+1},(_,i)=>({s:Math.min(i,b.length),p:branchCenter(b.id,Math.min(i,b.length))}));b.bounds={min:{x:Infinity,y:Infinity,z:Infinity},max:{x:-Infinity,y:-Infinity,z:-Infinity}};for(const n of b.route)for(const a of ['x','y','z']){b.bounds.min[a]=Math.min(b.bounds.min[a],n.p[a]-12);b.bounds.max[a]=Math.max(b.bounds.max[a],n.p[a]+12);}}
function nearestOn(b,p){
  let best=Infinity,result;
  for(let i=1;i<b.route.length;i++){
    const a=b.route[i-1],c=b.route[i],x=c.p.x-a.p.x,y=c.p.y-a.p.y,z=c.p.z-a.p.z;
    const t=clamp(((p.x-a.p.x)*x+(p.y-a.p.y)*y+(p.z-a.p.z)*z)/(x*x+y*y+z*z),0,1);
    const at={x:a.p.x+x*t,y:a.p.y+y*t,z:a.p.z+z*t},d=distance(p,at);
    if(d<best){best=d;result={s:a.s+(c.s-a.s)*t,c:at,d,branch:b.id};}
  }return result;
}
export function nearestRoute(p){let best=null;for(const b of BRANCHES){const n=nearestOn(b,p);if(!best||n.d<best.d)best=n;}return best;}
function wallAngle(p,n){const f=frameAt(n.s,n.branch),x=p.x-n.c.x,y=p.y-n.c.y,z=p.z-n.c.z;return Math.atan2(x*f.v.x+y*f.v.y+z*f.v.z,x*f.u.x+y*f.u.y+z*f.u.z);}
export function isTunnelInterior(p,margin=0,exclude=null){
  for(const b of BRANCHES){if(b.id===exclude||['x','y','z'].some(a=>p[a]<b.bounds.min[a]||p[a]>b.bounds.max[a]))continue;const n=nearestOn(b,p);if(n.d<wallRadius(n.s,wallAngle(p,n),b.id)-margin)return true;}return false;
}
export function chamberFloor(x,z){const q=((x-CHAMBER.x)/CHAMBER.r)**2+((z-CHAMBER.z)/CHAMBER.r)**2;return CHAMBER.y-CHAMBER.ry*Math.sqrt(Math.max(0,1-q));}
export function inChamber(p,margin=0){return ((p.x-CHAMBER.x)/(CHAMBER.r-margin))**2+((p.y-CHAMBER.y)/(CHAMBER.ry-margin))**2+((p.z-CHAMBER.z)/(CHAMBER.r-margin))**2<=1;}
export function surfaceHeight(x,z){const a=Math.atan2(z,x),r=Math.hypot(x,z)/(HOLE_SCALE*rimRadius(a));if(r>=1)return 0;if(r<SINKHOLE_INNER)return -Infinity;return HOLE_SCALE*bowlHeight(a,r);}
export function confine(p,margin=.65){
  if(p.y>=-HOLE_SCALE*SINKHOLE_DEPTH+.4){
    const floor=surfaceHeight(p.x,p.z)+margin;
    const old={...p};p.y=clamp(p.y,floor,32);p.x=clamp(p.x,-65,65);p.z=clamp(p.z,-65,65);return distance(old,p)>.001;
  }
  if(isTunnelInterior(p,margin)||inChamber(p,margin))return false;
  let tube=null,tubeDistance=Infinity;
  for(const b of BRANCHES){const n=nearestOn(b,p),limit=wallRadius(n.s,wallAngle(p,n),b.id)-margin,d=n.d||1;const c={x:n.c.x+(p.x-n.c.x)/d*limit,y:n.c.y+(p.y-n.c.y)/d*limit,z:n.c.z+(p.z-n.c.z)/d*limit};const correction=distance(p,c);if(correction<tubeDistance){tubeDistance=correction;tube=c;}}
  const rx=CHAMBER.r-margin,ry=CHAMBER.ry-margin,ex=(p.x-CHAMBER.x)/rx,ey=(p.y-CHAMBER.y)/ry,ez=(p.z-CHAMBER.z)/rx,k=Math.hypot(ex,ey,ez);
  const chamber={x:CHAMBER.x+ex/k*rx,y:CHAMBER.y+ey/k*ry,z:CHAMBER.z+ez/k*rx};
  const correction=distance(p,tube)<distance(p,chamber)?tube:chamber;
  p.x=correction.x;p.y=correction.y;p.z=correction.z;return true;
}
export function pointSegmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy+(p.z-a.z)*dz)/(dx*dx+dy*dy+dz*dz||1),0,1);return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy,p.z-a.z-t*dz);}
// A broad region around the Queen, never a world-space waypoint or exact socket.
export function closeToQueen(p){return p.y<QUEEN.y+9&&p.y>QUEEN.baseY-8&&Math.hypot(p.x-QUEEN.x,p.z-QUEEN.z)<49&&inChamber(p,1);}
export const MAX_HP=12;
export function createMission(){return {phase:'descent',integrity:MAX_HP,hits:0,lampState:'working',lampRecoverAt:0,lidarAvailable:false,lidarProcessingAt:0,lidar:false,lidarMode:0,payload:true,armProgress:0,bombPosition:null,fuse:FUSE,time:0,nursery:false,shaftSeen:false,deadEndSeen:false,flares:FLARE_COUNT,extracted:false,signalLost:false,detonated:false,outcome:null};}
export function recordImpact(m){
  if(m.outcome||m.extracted||m.signalLost||m.integrity<=0)return [];
  m.integrity=Math.max(0,m.integrity-1);m.hits++;
  if(m.hits===1){m.lampState='recovering';m.lampRecoverAt=m.time+3.5;return ['lamp-glitch'];}
  if(m.hits===2){m.lampState='failed';m.lampRecoverAt=0;return ['lamp-failed'];}
  return [];
}
export function useFlare(m){if(m.outcome||m.extracted||m.signalLost||m.flares<=0)return false;m.flares--;return true;}
export function tickMission(m,dt,p,arming){
  if(m.outcome)return [];const events=[];m.time+=dt;
  if(m.lampState==='recovering'&&m.time>=m.lampRecoverAt){m.lampState='working';events.push('lamp-restored');}
  if(!m.lidarAvailable&&!m.lidarProcessingAt&&p.y<=-86){m.lidarProcessingAt=m.time+4;events.push('lidar-processing');}
  if(!m.lidarAvailable&&m.lidarProcessingAt&&m.time>=m.lidarProcessingAt){m.lidarAvailable=true;events.push('lidar-ready');}
  if(!m.deadEndSeen){const n=nearestRoute(p),b=BRANCHES.find(b=>b.id===n.branch);if(b.id==='blind'&&n.s>b.length-13){m.deadEndSeen=true;events.push('dead-end');}}
  if(!m.shaftSeen&&p.z<-67&&p.y<-42){m.shaftSeen=true;events.push('shaft');}
  if(!m.nursery&&p.y<CHAMBER_LIP-5){m.nursery=true;m.phase='nursery';events.push('nursery');}
  if(m.payload&&closeToQueen(p)&&arming){m.armProgress=Math.min(1,m.armProgress+dt/3);if(m.armProgress>=1){m.payload=false;m.bombPosition={x:p.x,y:p.y-.8,z:p.z};m.phase='escape';events.push('armed');}}
  else if(m.payload)m.armProgress=Math.max(0,m.armProgress-dt*.5);
  if(!m.payload){
    // Arming finishes at the end of this tick; the fuse starts on the next one.
    if(!events.includes('armed'))m.fuse=Math.max(0,m.fuse-dt);
    if(m.fuse>0&&!m.extracted&&!m.signalLost&&m.integrity>0&&p.y>2&&Math.hypot(p.x,p.z)<38){m.extracted=true;m.phase='surface';events.push('extracted');}
    if(!m.extracted&&!m.signalLost&&m.integrity<=0){m.signalLost=true;events.push('signal-lost');}
    if(m.fuse<=0){m.detonated=true;m.outcome=m.extracted?'rescued':'sacrifice';events.push('detonated');}
  }
  else if(m.integrity<=0){m.outcome='lost';events.push('lost');}
  return events;
}

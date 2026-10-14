import {rimRadius, bowlHeight, SINKHOLE_INNER, SINKHOLE_DEPTH} from './stalheart/sinkhole-shape.js';

// Metres and seconds. The same geometry contract drives rendering and flight.
export const FUSE=105, FLARE_COUNT=6, EGG_COUNT=1600, HOLE_SCALE=24;
export const CHAMBER={x:0,y:-208,z:-79,r:76,ry:58,opening:.1};
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

export function center(s){
  s=clamp(s,0,ROUTE_END);const throat=-HOLE_SCALE*SINKHOLE_DEPTH;
  if(s<=8)return {x:0,y:throat-s,z:0};
  if(s<upperStart){const a=(s-8)/12;return {x:0,y:throat-8-12*Math.sin(a),z:-12*(1-Math.cos(a))};}
  if(s<dropTurn){const u=(s-upperStart)/55;return {x:4*Math.sin(Math.PI*u)**2,y:throat-20,z:-12-(s-upperStart)};}
  if(s<SHAFT_START){const a=(s-dropTurn)/12;return {x:0,y:throat-20-12*(1-Math.cos(a)),z:-67-12*Math.sin(a)};}
  return {x:0,y:SHAFT_TOP-(s-SHAFT_START),z:-79};
}
function normalize(p){const n=Math.hypot(p.x,p.y,p.z)||1;return {x:p.x/n,y:p.y/n,z:p.z/n};}
export function frameAt(s){
  const a=center(s-.05),b=center(s+.05),t=normalize({x:b.x-a.x,y:b.y-a.y,z:b.z-a.z});
  const u=normalize({x:1-t.x*t.x,y:-t.x*t.y,z:-t.x*t.z});
  const v={x:t.y*u.z-t.z*u.y,y:t.z*u.x-t.x*u.z,z:t.x*u.y-t.y*u.x};
  return {c:center(s),t,u,v};
}
export function radius(s){return HOLE_SCALE*SINKHOLE_INNER+(6.8-HOLE_SCALE*SINKHOLE_INNER)*smooth(0,12,s)+(CHAMBER.r*Math.sin(CHAMBER.opening)-6.8)*smooth(SHAFT_START,ROUTE_END,s);}
export function wallRadius(s,a){
  const noise=.065*Math.sin(a*5+s*.11)+.045*Math.cos(a*9-s*.07)+.045*Math.sin(s*.83+a*7)+.025*Math.cos(s*1.4-a*13);
  const rim=(rimRadius(a)-1)*(1-smooth(0,8,s));
  return radius(s)*(1+rim+noise*smooth(0,8,s)*(1-smooth(ROUTE_END-12,ROUTE_END,s)));
}
export function ringPoint(s,a,inset=0){const f=frameAt(s),r=wallRadius(s,a)-inset;return {x:f.c.x+r*(f.u.x*Math.cos(a)+f.v.x*Math.sin(a)),y:f.c.y+r*(f.u.y*Math.cos(a)+f.v.y*Math.sin(a)),z:f.c.z+r*(f.u.z*Math.cos(a)+f.v.z*Math.sin(a))};}
const route=Array.from({length:Math.ceil(ROUTE_END)+1},(_,i)=>({s:Math.min(i,ROUTE_END),p:center(Math.min(i,ROUTE_END))}));
export function nearestRoute(p){
  let best=Infinity,result;
  for(let i=1;i<route.length;i++){
    const a=route[i-1],b=route[i],x=b.p.x-a.p.x,y=b.p.y-a.p.y,z=b.p.z-a.p.z;
    const t=clamp(((p.x-a.p.x)*x+(p.y-a.p.y)*y+(p.z-a.p.z)*z)/(x*x+y*y+z*z),0,1);
    const c={x:a.p.x+x*t,y:a.p.y+y*t,z:a.p.z+z*t},d=distance(p,c);
    if(d<best){best=d;result={s:a.s+(b.s-a.s)*t,c,d};}
  }
  return result;
}
export function chamberFloor(x,z){const q=((x-CHAMBER.x)/CHAMBER.r)**2+((z-CHAMBER.z)/CHAMBER.r)**2;return CHAMBER.y-CHAMBER.ry*Math.sqrt(Math.max(0,1-q));}
export function inChamber(p,margin=0){return ((p.x-CHAMBER.x)/(CHAMBER.r-margin))**2+((p.y-CHAMBER.y)/(CHAMBER.ry-margin))**2+((p.z-CHAMBER.z)/(CHAMBER.r-margin))**2<=1;}
export function surfaceHeight(x,z){const a=Math.atan2(z,x),r=Math.hypot(x,z)/(HOLE_SCALE*rimRadius(a));if(r>=1)return 0;if(r<SINKHOLE_INNER)return -Infinity;return HOLE_SCALE*bowlHeight(a,r);}
export function confine(p){
  if(p.y>=-HOLE_SCALE*SINKHOLE_DEPTH+.4){
    const floor=surfaceHeight(p.x,p.z)+.65;
    const old={...p};p.y=clamp(p.y,floor,32);p.x=clamp(p.x,-65,65);p.z=clamp(p.z,-65,65);return distance(old,p)>.001;
  }
  const n=nearestRoute(p),f=frameAt(n.s),dx=p.x-n.c.x,dy=p.y-n.c.y,dz=p.z-n.c.z;
  const a=Math.atan2(dx*f.v.x+dy*f.v.y+dz*f.v.z,dx*f.u.x+dy*f.u.y+dz*f.u.z),limit=wallRadius(n.s,a)-.65;
  if(n.d<=limit||inChamber(p,.65))return false;
  const tube={x:n.c.x+dx/n.d*limit,y:n.c.y+dy/n.d*limit,z:n.c.z+dz/n.d*limit};
  const rx=CHAMBER.r-.65,ry=CHAMBER.ry-.65,ex=(p.x-CHAMBER.x)/rx,ey=(p.y-CHAMBER.y)/ry,ez=(p.z-CHAMBER.z)/rx,k=Math.hypot(ex,ey,ez);
  const chamber={x:CHAMBER.x+ex/k*rx,y:CHAMBER.y+ey/k*ry,z:CHAMBER.z+ez/k*rx};
  const correction=distance(p,tube)<distance(p,chamber)?tube:chamber;
  p.x=correction.x;p.y=correction.y;p.z=correction.z;return true;
}
export function pointSegmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy+(p.z-a.z)*dz)/(dx*dx+dy*dy+dz*dz||1),0,1);return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy,p.z-a.z-t*dz);}
// A broad region around the Queen, never a world-space waypoint or exact socket.
export function closeToQueen(p){return p.y<QUEEN.y+9&&p.y>QUEEN.baseY-8&&Math.hypot(p.x-QUEEN.x,p.z-QUEEN.z)<49&&inChamber(p,1);}
export function createMission(){return {phase:'descent',integrity:100,lightFailed:false,lidar:false,payload:true,armProgress:0,bombPosition:null,fuse:FUSE,time:0,nursery:false,shaftSeen:false,flares:FLARE_COUNT,outcome:null};}
export function useFlare(m){if(m.outcome||m.flares<=0)return false;m.flares--;return true;}
export function tickMission(m,dt,p,arming){
  if(m.outcome)return [];const events=[];m.time+=dt;
  if(!m.lightFailed&&p.z<-30&&p.y<-25){m.lightFailed=true;events.push('blackout');}
  if(!m.shaftSeen&&p.z<-67&&p.y<-42){m.shaftSeen=true;events.push('shaft');}
  if(!m.nursery&&p.y<CHAMBER_LIP-5){m.nursery=true;m.phase='nursery';events.push('nursery');}
  if(m.payload&&closeToQueen(p)&&arming){m.armProgress=Math.min(1,m.armProgress+dt/3);if(m.armProgress>=1){m.payload=false;m.bombPosition={x:p.x,y:p.y-.8,z:p.z};m.phase='escape';events.push('armed');}}
  else if(m.payload)m.armProgress=Math.max(0,m.armProgress-dt*.5);
  if(!m.payload){m.fuse=Math.max(0,m.fuse-dt);if(m.integrity<=0||m.fuse<=0){m.outcome='sacrifice';events.push('sacrifice');}else if(p.y>2&&Math.hypot(p.x,p.z)<38){m.outcome='rescued';events.push('rescued');}}
  else if(m.integrity<=0){m.outcome='lost';events.push('lost');}
  return events;
}

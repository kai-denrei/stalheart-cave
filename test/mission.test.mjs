import test from 'node:test';
import assert from 'node:assert/strict';
import {center,frameAt,ringPoint,wallRadius,confine,createMission,tickMission,FUSE,pointSegmentDistance,closeToQueen,useFlare,QUEEN,CHAMBER,ROUTE_END,SHAFT_START,SHAFT_TOP,CHAMBER_LIP,HOLE_SCALE,recordImpact,BRANCHES,branchCenter,inChamber,isTunnelInterior} from '../src/mission.js';
import {rimRadius,bowlHeight,SINKHOLE_INNER,SINKHOLE_DEPTH} from '../src/stalheart/sinkhole-shape.js';

const placement={x:QUEEN.x+37,y:QUEEN.y,z:QUEEN.z+8};
test('LiDAR starts unavailable and is processed halfway down',()=>{
  const m=createMission();tickMission(m,1,center(49),false);assert.equal(m.lidarAvailable,false);assert.equal(m.cameraState,'working');
  const events=tickMission(m,1,center(SHAFT_START+43),false);assert.ok(events.includes('lidar-processing'));assert.equal(m.lidarAvailable,false);
  assert.ok(tickMission(m,4,center(SHAFT_START+45),false).includes('lidar-ready'));assert.equal(m.lidarAvailable,true);
});
test('first impact interrupts and restores video; second permanently fails, with emergency processing',()=>{
  const m=createMission();assert.deepEqual(recordImpact(m),['camera-glitch']);assert.equal(m.cameraState,'recovering');
  tickMission(m,3,center(20),false);assert.equal(m.cameraState,'recovering');assert.ok(tickMission(m,.6,center(20),false).includes('camera-restored'));assert.equal(m.cameraState,'working');
  assert.deepEqual(recordImpact(m),['camera-failed','lidar-processing']);tickMission(m,4,center(20),false);assert.equal(m.cameraState,'failed');assert.equal(m.lidarAvailable,true);
  tickMission(m,20,center(20),false);assert.equal(m.cameraState,'failed');assert.equal(createMission().cameraHits,0);
});
test('three sub-tunnels join at the fork; two physically enter the Queen chamber, one is sealed',()=>{
  assert.equal(BRANCHES.length,3);assert.equal(BRANCHES.filter(b=>b.toQueen).length,2);
  for(const b of BRANCHES){for(let s=0;s<b.length;s+=.8){const p=branchCenter(b.id,s);assert.ok(isTunnelInterior(p,.65));assert.equal(confine(p),false,`${b.id} blocked at ${s}`);}const end=branchCenter(b.id,b.length);if(b.id!=='main')assert.equal(inChamber(end),b.toQueen);}
  const blind=BRANCHES.find(b=>b.id==='blind'),f=frameAt(blind.length,'blind'),p=branchCenter('blind',blind.length);p.x+=f.t.x*25;p.y+=f.t.y*25;p.z+=f.t.z*25;assert.equal(confine(p),true);
});
test('the shared sinkhole throat joins the tunnel exactly, with no black cap',()=>{
  for(let a=0;a<Math.PI*2;a+=.13){const p=ringPoint(0,a);assert.ok(Math.abs(p.x-Math.cos(a)*rimRadius(a)*HOLE_SCALE*SINKHOLE_INNER)<1e-8);assert.ok(Math.abs(p.z-Math.sin(a)*rimRadius(a)*HOLE_SCALE*SINKHOLE_INNER)<1e-8);assert.equal(p.y,-HOLE_SCALE*SINKHOLE_DEPTH);assert.equal(bowlHeight(a,SINKHOLE_INNER),-SINKHOLE_DEPTH);}
});
test('a continuous 105 m shaft is genuinely straight down and joins the chamber aperture',()=>{
  assert.ok(SHAFT_TOP-CHAMBER_LIP>100);
  for(let s=SHAFT_START+1;s<=ROUTE_END;s+=3){const c=center(s),f=frameAt(s);assert.equal(c.x,0);assert.equal(c.z,-79);assert.ok(f.t.y<-.9999);}
  const end=center(ROUTE_END);assert.equal(end.y,CHAMBER_LIP);assert.ok(Math.abs(wallRadius(ROUTE_END,1)-CHAMBER.r*Math.sin(CHAMBER.opening))<1e-8);
});
test('bomb placement accepts different positions close to the Queen, rejects distant ones, and stores the chosen point',()=>{
  for(const p of [placement,{x:-39,y:-225,z:-98},{x:6,y:-245,z:-65}]){
    assert.equal(closeToQueen(p),true);const m=createMission();const events=tickMission(m,3,p,true);assert.ok(events.includes('armed'));assert.equal(m.bombPosition.x,p.x);assert.equal(m.bombPosition.z,p.z);
  }
  const m=createMission();tickMission(m,4,{x:65,y:-210,z:-80},true);assert.equal(m.payload,true);assert.equal(m.armProgress,0);
  tickMission(m,1,placement,true);tickMission(m,1,placement,false);assert.equal(m.armProgress,0);
});
test('exactly six flares, no spending after the ending, and a full restock on restart',()=>{
  const m=createMission();for(let i=0;i<6;i++){assert.equal(useFlare(m),true);assert.equal(m.flares,5-i);}assert.equal(useFlare(m),false);
  const reset=createMission();assert.equal(reset.flares,6);reset.outcome='lost';assert.equal(useFlare(reset),false);assert.equal(reset.flares,6);
});
test('only reaching the real surface rescues ISAO; fuse and hull loss preserve all endings',()=>{
  const m=createMission();tickMission(m,3,placement,true);assert.deepEqual(tickMission(m,.1,center(3),false),[]);assert.deepEqual(tickMission(m,.1,{x:0,y:3,z:0},false),['extracted']);assert.equal(m.outcome,null);assert.equal(m.detonated,false);
  assert.ok(tickMission(m,FUSE,{x:0,y:3,z:0},false).includes('detonated'));assert.equal(m.outcome,'rescued');
  const sacrificed=createMission();tickMission(sacrificed,3,placement,true);sacrificed.integrity=0;assert.ok(tickMission(sacrificed,.1,center(100),false).includes('signal-lost'));assert.equal(sacrificed.outcome,null);tickMission(sacrificed,FUSE,center(100),false);assert.equal(sacrificed.outcome,'sacrifice');
  const lost=createMission();lost.integrity=0;assert.deepEqual(tickMission(lost,.1,center(10),false),['lost']);
  const timed=createMission();tickMission(timed,3,placement,true);assert.ok(tickMission(timed,FUSE,center(100),false).includes('detonated'));assert.equal(timed.outcome,'sacrifice');
});
test('arming starts a fresh fuse and reaching the surface at zero is too late',()=>{
  const m=createMission();tickMission(m,3,placement,true);assert.equal(m.fuse,FUSE);assert.equal(m.detonated,false);
  const events=tickMission(m,FUSE,{x:0,y:3,z:0},false);assert.ok(events.includes('detonated'));assert.equal(m.outcome,'sacrifice');
});
test('the full centerline is traversable in both directions without a collision correction',()=>{
  for(let s=0;s<=ROUTE_END;s+=.23){const c=center(s);assert.equal(confine(c),false,`route blocked at ${s}`);}
  const bad={x:180,y:-208,z:-79};assert.equal(confine(bad),true);assert.ok(bad.x<90);
});
test('limb contact checks the entire segment',()=>{assert.equal(pointSegmentDistance({x:0,y:1,z:0},{x:-5,y:0,z:0},{x:5,y:0,z:0}),1);});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {exteriorExposure,SINKHOLE_THROAT} from '../src/mission.js';
import {impactCue,createQuietWindow} from '../src/audio-cues.js';
import {smokeParticle,SMOKE_SOURCE_Y,SMOKE_SURFACE_DELAY} from '../src/smoke.js';
import {createReedActor} from '../src/reed.js';

test('the slope and throat stay exterior; darkness begins below the actual opening',()=>{
  for(const y of [4,0,-6,-12,SINKHOLE_THROAT,SINKHOLE_THROAT-1])assert.equal(exteriorExposure(y),1);
  assert.ok(exteriorExposure(SINKHOLE_THROAT-7)>.9);assert.equal(exteriorExposure(SINKHOLE_THROAT-38),0);
  let previous=1;for(let s=0;s<=65;s++){const exposure=exteriorExposure(SINKHOLE_THROAT-1-s*.25,s);assert.ok(exposure<=previous);previous=exposure;}assert.equal(previous,0);
});
test('collision cues distinguish rock, tentacles, and every slime body',()=>{
  assert.equal(impactCue('wall'),'isao_hit_wall');assert.equal(impactCue('tentacle'),'isao_hit_tentacle');
  for(const kind of ['cutis','gorogoro','reed','egg','queen'])assert.equal(impactCue(kind),'isao_hit_enemy');
});
test('reverb waits for silence, stays underground, and respects cooldown and mute',()=>{
  const q=createQuietWindow();q.activity(0,10);
  assert.equal(q.due(27,true),false);assert.equal(q.due(28,false),false);assert.equal(q.due(28,true,false),false);assert.equal(q.due(28,true),true);
  assert.equal(q.due(60,true),false);assert.equal(q.due(63,true),true);
  q.activity(64,5);assert.equal(q.due(80,true),false);q.reset();assert.equal(q.quietFor(0),0);
});
test('smoke is born below the throat and stays in a narrow conduit before erupting',()=>{
  const p=new Float64Array(5);assert.ok(SMOKE_SOURCE_Y<SINKHOLE_THROAT-10);
  for(let seed=0;seed<1;seed+=.01){smokeParticle(seed,0,p);assert.equal(p[1],SMOKE_SOURCE_Y);assert.equal(p[4],0);
    for(let time=0;time<SMOKE_SURFACE_DELAY;time+=.01){smokeParticle(seed,time,p);assert.ok(p[1]<0,'no above-ground cloud at detonation');if(p[1]<=SINKHOLE_THROAT)assert.ok(Math.hypot(p[0],p[2])+p[3]/2<4.3,'puff fits inside the throat');}
  }
  smokeParticle(.1,.7,p);assert.ok(p[1]>5&&p[1]<30);assert.ok(p[3]>10);assert.ok(p[4]>0);
});
test('the smoke retains a connected vent but accumulates and spreads at ground level',()=>{
  const p=new Float64Array(5);let previousRadius=0;
  for(const age of [1.2,2,3,4,6]){let radius=0,ground=0,vent=0;
    for(let seed=0;seed<1;seed+=.001){smokeParticle(seed,age,p);if(p[4]<.01)continue;assert.ok(p[1]<30,'no rising smoke tower');if(p[1]>0){radius=Math.max(radius,Math.hypot(p[0],p[2]));if(p[1]<12)ground++;if(Math.hypot(p[0],p[2])<10)vent++;}}
    assert.ok(ground>300,'dense low cloud');assert.ok(vent>5,'smoke still joins the opening');assert.ok(radius>previousRadius,'cloud spreads outwards');previousRadius=radius;
  }
});
test('Reed uses the native physical reach, pull and settle cycle with moving skin',async()=>{
  const bin=await readFile(new URL('../assets/models/reed.bin',import.meta.url)),meta=JSON.parse(await readFile(new URL('../assets/models/reed.json',import.meta.url),'utf8'));
  const actor=createReedActor(bin.buffer.slice(bin.byteOffset,bin.byteOffset+bin.byteLength),meta),phases=new Set(),rest=actor.body.surface.positions.slice(),start=actor.body.center.clone();
  for(let i=0;i<180;i++){actor.update(1/60);phases.add(actor.motion.pursuit.phase);}
  assert.deepEqual([...phases].sort(),['pull','reach','settle']);assert.ok(actor.motion.pursuit.burst>=2);assert.ok(actor.body.isFinite());assert.ok(actor.body.center.distanceTo(start)>.001);assert.notDeepEqual(actor.body.surface.positions,rest);
  actor.reset();assert.ok(actor.body.isFinite());assert.equal(actor.motion.pursuit.burst,0);
});

import {IVORY_SPOTS,GORO_SPOTS,REED_SPOTS,MAIN_TENTACLES,LEFT_TENTACLES,BLIND_TENTACLES,colonyDistance,colonyPresence} from '../src/cave-pacing.js';
import {createAlienSoundscape} from '../src/audio-cues.js';
test('fauna inside the first fifty metres (owner, 2026-10-16), tentacles as way-marks from thirty, and colony life that builds gradually, with sparse bioluminescence',()=>{
  const bodies=[...IVORY_SPOTS,...GORO_SPOTS,...REED_SPOTS];
  for(const p of bodies)assert.ok(colonyDistance(p.s,p.branch)>=14);
  assert.ok(bodies.filter(p=>(p.branch??'main')==='main'&&p.s<50).length>=4,'an assortment near the entrance');assert.ok(REED_SPOTS.some(p=>p.branch==='main'&&p.s<50),'a Reed near the entrance');
  for(const [branch,positions] of [['main',MAIN_TENTACLES],['left',LEFT_TENTACLES],['blind',BLIND_TENTACLES]])for(const s of positions)assert.ok(colonyDistance(s,branch)>=28);
  assert.ok(MAIN_TENTACLES.filter(s=>s<60).length>=2,'tentacles mark the way in before the colony');
  assert.equal(colonyPresence(48),0);assert.ok(colonyPresence(80)<colonyPresence(120));assert.equal(colonyPresence(155),1);
  const glowing=bodies.filter(p=>p.bio).length;assert.ok(glowing>0&&glowing<bodies.length/2);
});
test('alien calls wait for the quiet approach and become more frequent deeper down',()=>{
  const sound=createAlienSoundscape();assert.equal(sound.due(100,40),null);assert.equal(sound.due(100,120,'main',false),null);
  const early=sound.due(100,60);assert.ok(early.volume<.04);assert.equal(sound.due(115,60),null);
  const deep=sound.due(115,160);assert.ok(deep.volume>early.volume&&deep.volume<.07);assert.ok(deep.cutoff<1000&&deep.rate<1&&Math.abs(deep.pan)>.6);
  sound.reset();assert.equal(sound.due(10,160),null);
});

import {createQueenActor} from '../src/queen-motion.js';
test('the Queen slowly reaches, plants and pulls with the native six-limb Ovum body',async()=>{
  const bin=await readFile(new URL('../assets/models/ovum.bin',import.meta.url)),meta=JSON.parse(await readFile(new URL('../assets/models/ovum.json',import.meta.url),'utf8'));
  const actor=createQueenActor(bin.buffer.slice(bin.byteOffset,bin.byteOffset+bin.byteLength),meta),rest=actor.body.surface.positions.slice(),phases=new Set();
  for(let i=0;i<1800;i++){actor.update(1/60);phases.add(actor.motion.pursuit.phase);}
  assert.equal(actor.body.cage.limbCount,6);assert.equal(actor.stats().clockScale,.2);assert.ok(actor.body.isFinite());assert.notDeepEqual(actor.body.surface.positions,rest);assert.deepEqual([...phases].sort(),['pull','reach','settle']);
  actor.reset();assert.ok(actor.body.isFinite());assert.equal(actor.motion.pursuit.burst,0);
});

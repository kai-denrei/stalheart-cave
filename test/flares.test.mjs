import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {createFlareBody,stepFlare} from '../src/flare-physics.js';
import {createFlares} from '../src/flares.js';
import {center,ringPoint,FLARE_COUNT} from '../src/mission.js';

test('flares accelerate down the shaft under gravity, independent of update rate',()=>{
  const start=center(140),a=createFlareBody(start),b=createFlareBody(start);
  stepFlare(a,2);for(let i=0;i<120;i++)stepFlare(b,1/60);
  assert.ok(Math.abs(a.position.y-(start.y-.45-.4*2-9.81*2))<.1);
  assert.ok(Math.abs(a.position.y-b.position.y)<1e-8);
  assert.ok(a.velocity.y<-20);assert.equal(a.resting,false);
});
test('a flare touching a vertical shaft wall keeps falling into the chamber',()=>{
  const body=createFlareBody(ringPoint(140,0,.25));stepFlare(body,3);
  assert.ok(body.position.y<-125);assert.ok(body.velocity.y<-29);assert.equal(body.resting,false);
  stepFlare(body,3);assert.ok(body.position.y<-250,'no wall attachment along the shaft');
});
test('flares bounce and settle on passage and chamber floors',()=>{
  for(const p of [center(49),{x:30,y:-195,z:-65},{x:28,y:8,z:0}]){
    const body=createFlareBody(p);stepFlare(body,15);assert.equal(body.resting,true);
    assert.ok(body.position.y<p.y);const rest={...body.position};stepFlare(body,10);assert.deepEqual(body.position,rest);
  }
});
test('all ten physical flares illuminate their falling positions and reset together',()=>{
  const uniforms={uFlarePositions:{value:Array.from({length:FLARE_COUNT},()=>new THREE.Vector3())},uFlareStrengths:{value:Array(FLARE_COUNT).fill(0)}};
  const flares=createFlares(new THREE.Scene(),uniforms),camera=new THREE.PerspectiveCamera(),p=center(140);
  for(let i=0;i<10;i++)assert.equal(flares.drop(p,0,0),true);
  assert.equal(flares.drop(p,0,0),false);flares.update(2,camera);
  assert.equal(flares.stats().length,10);
  for(let i=0;i<10;i++){const f=flares.stats()[i];assert.ok(f.position[1]<p.y-20);assert.deepEqual(uniforms.uFlarePositions.value[i].toArray(),f.position);assert.ok(uniforms.uFlareStrengths.value[i]>0);}
  flares.reset();assert.equal(flares.stats().length,0);assert.deepEqual(uniforms.uFlareStrengths.value,Array(10).fill(0));assert.equal(flares.drop(p,3,0),true);
});

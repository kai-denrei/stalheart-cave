import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlight,fly} from '../src/flight.js';
function run(f,input,yaw=0,loaded=true,seconds=2){for(let t=0;t<seconds;t+=1/60)fly(f,1/60,input,yaw,loaded);return f;}
test('forward follows yaw and keeps altitude; down/up affect only altitude',()=>{
  const f=run(createFlight({x:0,y:10,z:0}),{forward:1},Math.PI/2);assert.ok(f.position.x< -7);assert.equal(f.position.y,10);assert.ok(Math.abs(f.position.z)<1e-8);
  const down=run(createFlight({x:0,y:10,z:0}),{vertical:-1});assert.ok(down.position.y<5);assert.equal(down.position.x,0);assert.equal(down.position.z,0);
  const up=run(createFlight({x:0,y:0,z:0}),{vertical:1});assert.ok(up.position.y>7);assert.equal(up.position.z,0);
});
test('release brakes into a stable hover with finite inertia and leveling',()=>{
  const f=run(createFlight({x:0,y:0,z:0}),{forward:1});assert.ok(Math.abs(f.pitch)>.01);
  const z=f.position.z;run(f,{},0,true,3);assert.ok(Math.abs(f.velocity.z)<.001);assert.ok(Math.abs(f.position.z-z)>0);assert.ok(Math.abs(f.pitch)<.001);assert.equal(f.position.y,0);
});
test('diagonal speed is bounded, acceleration is limited, and dropping weight improves climb',()=>{
  const f=run(createFlight({x:0,y:0,z:0}),{forward:1,right:1});assert.ok(Math.hypot(f.velocity.x,f.velocity.z)<=6.7+.001);
  assert.ok(Math.hypot(f.acceleration.x,f.acceleration.z)<=10+.001);
  const loaded=run(createFlight({x:0,y:0,z:0}),{vertical:1},0,true,4),empty=run(createFlight({x:0,y:0,z:0}),{vertical:1},0,false,4);assert.ok(empty.position.y>loaded.position.y+3);
});

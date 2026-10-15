import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {createCaveNetwork} from '../src/cave.js';
import {branchCenter,frameAt,isTunnelInterior,inChamber} from '../src/mission.js';

test('junction floors and walls close where the navigable cave ends, without visible holes',()=>{
  const scene=new THREE.Scene(),meshes=[],stone=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
  createCaveNetwork({scene,stone,body:(geometry,material,parent)=>{const mesh=new THREE.Mesh(geometry,material);parent.add(mesh);meshes.push(mesh);return mesh;}});scene.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(),p=new THREE.Vector3(),d=new THREE.Vector3(),probe=new THREE.Vector3(),leaks=[];
  for(const [branch,s] of [['main',35],['main',43],['main',48],['main',55],['main',65],['left',5],['left',15],['blind',5],['blind',15]]){
    const f=frameAt(s,branch);p.copy(branchCenter(branch,s));
    for(let i=0;i<24;i++){
      const a=i/24*Math.PI*2;d.copy(f.u).multiplyScalar(Math.cos(a)).addScaledVector(f.v,Math.sin(a));let exit=0;
      for(let t=.25;t<70;t+=.25){probe.copy(p).addScaledVector(d,t);if(!isTunnelInterior(probe)&&!inChamber(probe)){exit=t;break;}}
      if(!exit)continue;ray.set(p,d);ray.near=.01;ray.far=75;const hit=ray.intersectObjects(meshes,false)[0];
      if(!hit||hit.distance>exit+1)leaks.push({branch,s,angle:a,expected:exit,rendered:hit?.distance});
    }
  }
  assert.deepEqual(leaks,[],'every visible wall has a rendered surface at the collision boundary');
});

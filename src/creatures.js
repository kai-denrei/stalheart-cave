import * as THREE from '../vendor/three.module.js';
import {CutisSwarm} from './fx/cutis-maku/swarm.js';
import {DEFAULT_CONFIG} from './fx/cutis-maku/config.js';
import {createSwarmGeometry} from './fx/cutis-maku/geometry.js';
import {deformInto} from './fx/cutis-maku/deform.js';
import {PEARL_TIERS} from './stalheart/pearl-enemies.js';
import {frameAt,ringPoint} from './mission.js';

export function createTunnelCreatures({scene,body,points,material}){
  const ivory=PEARL_TIERS.find(t=>t.id==='white'),creatures=[];
  const configs=[{s:34,a:Math.PI/2},{s:58,a:Math.PI/2},{s:76,a:Math.PI/2},{s:129,a:0},{s:175,a:Math.PI}];
  for(const [index,spot] of configs.entries()){
    const config={...DEFAULT_CONFIG,...ivory.values,r0:.7,reach:5.5,cycleDuration:9,transferEase:1,frameStep:1};
    const swarm=new CutisSwarm(config,{capacity:1});swarm.populate(1);swarm.reachLimit=()=>4.1;
    const source=createSwarmGeometry(swarm,{lod:{force:2}}),rest=source.levels[2].geometry.attributes.position;
    const geometry=new THREE.BufferGeometry();geometry.setIndex(source.levels[2].geometry.index.clone());geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(rest.count*3),3));
    const directions=Array.from({length:rest.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(rest,i).normalize().toArray());source.dispose();
    const f=frameAt(spot.s),root=new THREE.Vector3().copy(ringPoint(spot.s,spot.a,.35));
    const up=new THREE.Vector3().copy(f.u).multiplyScalar(-Math.cos(spot.a)).addScaledVector(new THREE.Vector3().copy(f.v),-Math.sin(spot.a));
    const z=new THREE.Vector3().copy(f.t),x=new THREE.Vector3().crossVectors(up,z).normalize();
    const group=new THREE.Group();group.name=ivory.name;group.position.copy(root);group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,up,z));scene.add(group);
    const mesh=body(geometry,material(ivory.values.skinTint,.48),group,0);mesh.frustumCulled=false;points(geometry,group);
    creatures.push({swarm,geometry,directions,group,root,index,phase:0});
  }
  const out=[0,0,0,0,0],point=new THREE.Vector3();let lastTime=0;
  function update(time){
    const dt=Math.max(0,Math.min(.05,time-lastTime));lastTime=time;
    for(const c of creatures){
      c.swarm.setTarget(0,Math.sin(time*.05+c.index)*1.5,Math.cos(time*.05+c.index)*2.5);c.swarm.advance(dt);c.phase=c.swarm.phase[0];
      const p=c.geometry.attributes.position;
      for(let i=0;i<c.directions.length;i++){deformInto(c.swarm,0,c.directions[i],out);p.setXYZ(i,out[0],out[1],out[2]);}
      p.needsUpdate=true;c.geometry.computeVertexNormals();c.geometry.computeBoundingSphere();
    }
  }
  function contacts(position){
    for(const c of creatures){if(position.distanceTo(c.root)>6)continue;c.group.updateWorldMatrix(true,false);const p=c.geometry.attributes.position;
      for(let i=0;i<p.count;i+=3){point.fromBufferAttribute(p,i).applyMatrix4(c.group.matrixWorld);if(point.distanceTo(position)<.7)return {root:c.root,kind:'cutis'};}
    }return null;
  }
  function reset(){lastTime=0;for(const c of creatures){c.swarm.populate(1);c.phase=0;}}
  return {update,contacts,reset,stats:()=>({cutisCount:creatures.length,cutisType:ivory.name,cutisPhases:creatures.map(c=>c.phase)})};
}

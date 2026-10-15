import * as THREE from '../vendor/three.module.js';
import {CHAMBER,QUEEN,EGG_COUNT,chamberFloor,clamp,isTunnelInterior} from './mission.js';

export async function createNursery({scene,body,points,sample,stone,flesh,rand}){
  // A 180 m chamber with an open ceiling connected directly to the drop shaft.
  const shell=new THREE.SphereGeometry(1,112,72,0,Math.PI*2,CHAMBER.opening,Math.PI-CHAMBER.opening);
  shell.scale(CHAMBER.r,CHAMBER.ry,CHAMBER.r);shell.translate(CHAMBER.x,CHAMBER.y,CHAMBER.z);
  // Cut the second route into the chamber wall, rather than leaving a solid cap.
  const surface=shell.attributes.position,open=[];
  for(let i=0;i<shell.index.count;i+=3){const a=shell.index.getX(i),b=shell.index.getX(i+1),c=shell.index.getX(i+2),p={x:(surface.getX(a)+surface.getX(b)+surface.getX(c))/3,y:(surface.getY(a)+surface.getY(b)+surface.getY(c))/3,z:(surface.getZ(a)+surface.getZ(b)+surface.getZ(c))/3};if(!isTunnelInterior(p,.15))open.push(a,b,c);}
  shell.setIndex(open);
  body(shell,stone,scene,135000);
  const eggGeo=new THREE.SphereGeometry(1,12,10),ep=eggGeo.attributes.position;
  for(let i=0;i<ep.count;i++){const y=ep.getY(i);ep.setXYZ(i,ep.getX(i)*(1-.22*y),y*1.6,ep.getZ(i)*(1-.22*y));}eggGeo.computeVertexNormals();
  const eggs=new THREE.InstancedMesh(eggGeo,flesh,EGG_COUNT);eggs.name='Nursery eggs';scene.add(eggs);
  const eggSample=sample(eggGeo,150).attributes.position.array,eggPoints=new Float32Array(EGG_COUNT*eggSample.length);
  const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),scale=new THREE.Vector3(),v=new THREE.Vector3(),bounds=[];
  for(let i=0;i<EGG_COUNT;i++){
    // Clusters cover the floor and rise around the walls; leave room to hover.
    const a=rand()*Math.PI*2,r=Math.sqrt(rand())*CHAMBER.r*.91,size=.48+rand()*.76;
    const x=CHAMBER.x+Math.cos(a)*r,z=CHAMBER.z+Math.sin(a)*r;
    const p=new THREE.Vector3(x,chamberFloor(x,z)+size*1.65,z);
    bounds.push({kind:'egg',p:p.clone(),r:new THREE.Vector3(size+.55,size*1.6+.55,size+.55)});
    q.setFromEuler(new THREE.Euler((rand()-.5)*.5,rand()*6.28,(rand()-.5)*.5));scale.setScalar(size);matrix.compose(p,q,scale);eggs.setMatrixAt(i,matrix);
    for(let j=0;j<eggSample.length;j+=3)v.fromArray(eggSample,j).applyMatrix4(matrix).toArray(eggPoints,i*eggSample.length+j);
  }
  points(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(eggPoints,3)));
  const [metaResponse,binResponse]=await Promise.all([fetch('./assets/models/ovum.json'),fetch('./assets/models/ovum.bin')]);
  if(!metaResponse.ok||!binResponse.ok)throw new Error('Ovum geometry could not be loaded.');
  const meta=await metaResponse.json(),bin=await binResponse.arrayBuffer(),layout=meta.layout;
  const queenGeo=new THREE.BufferGeometry();
  const positions=new Float32Array(bin,layout.positions.offset,layout.positions.length).slice();
  // Preserve the six authored tentacles; swell just the abdomen around its midline.
  for(let i=0;i<positions.length;i+=3){const x=positions[i],z=positions[i+2],r=Math.hypot(x,z),weight=Math.exp(-Math.pow(r/.037,4));positions[i]=x*(1+.32*weight);positions[i+2]=z*(1+.48*weight);positions[i+1]+=(.011+(positions[i+1]-.046)*.44)*weight;}
  queenGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));queenGeo.setIndex(new THREE.BufferAttribute(new Uint32Array(bin,layout.indices.offset,layout.indices.length),1));queenGeo.computeVertexNormals();
  const queen=new THREE.Group();queen.name='Ovum Queen';queen.position.set(QUEEN.x,QUEEN.baseY,QUEEN.z);queen.scale.setScalar(QUEEN.scale);scene.add(queen);body(queenGeo,flesh,queen,110000);
  const queenBound={kind:'queen',p:new THREE.Vector3(QUEEN.x,QUEEN.y,QUEEN.z),r:new THREE.Vector3(24,32,22)};bounds.push(queenBound);
  // A metre-space vertex grid also catches contact with the Queen's authored limbs.
  const queenCells=new Map(),qp=queenGeo.attributes.position;
  for(let i=0;i<qp.count;i++){
    const v=new THREE.Vector3().fromBufferAttribute(qp,i).multiplyScalar(QUEEN.scale),key=`${Math.floor(v.x)},${Math.floor(v.y)},${Math.floor(v.z)}`;
    if(!queenCells.has(key))queenCells.set(key,[]);queenCells.get(key).push(v);
  }
  const local=new THREE.Vector3(),near=new THREE.Vector3(),contact={kind:'queen',root:queenBound.p};
  // Egg duct extends from the swollen underside; eggs emerge, fall, and settle.
  const ductCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,-230,QUEEN.z+7),new THREE.Vector3(0,-239,QUEEN.z+15),new THREE.Vector3(0,-246,QUEEN.z+20)]);
  const duct=body(new THREE.TubeGeometry(ductCurve,28,1.9,10,false),flesh,scene,6000);
  const laying=[];
  for(let i=0;i<24;i++){const mesh=body(eggGeo,flesh,scene,380);mesh.visible=false;laying.push(mesh);}
  // Roots attach the six-limbed mother to the surrounding chamber.
  for(let i=0;i<16;i++){
    const a=i/16*Math.PI*2,x=CHAMBER.x+Math.cos(a)*68,z=CHAMBER.z+Math.sin(a)*68;
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(Math.cos(a)*22,QUEEN.baseY+12,QUEEN.z+Math.sin(a)*21),new THREE.Vector3(Math.cos(a)*46,QUEEN.baseY+9+rand()*8,CHAMBER.z+Math.sin(a)*46),new THREE.Vector3(x,chamberFloor(x,z)+2,z)]);
    body(new THREE.TubeGeometry(curve,26,.35+rand()*.6,6,false),flesh,scene,1300);
  }
  let laidCount=0;
  function update(time){
    const cycle=time%8/8,contraction=Math.sin(Math.PI*clamp((cycle-.1)/.7,0,1))**4;
    queen.scale.set(QUEEN.scale*(1+.016*Math.sin(time*.55)),QUEEN.scale*(1+.026*Math.sin(time*.55)-.025*contraction),QUEEN.scale*(1+.025*contraction));
    // The anchored mother creeps and turns slowly, rather than only breathing.
    const dx=3.4*Math.sin(time*.045),dz=2.5*Math.sin(time*.037);
    queen.position.set(QUEEN.x+dx,QUEEN.baseY+.65*Math.sin(time*.09),QUEEN.z+dz);
    queen.rotation.y=.055*Math.sin(time*.055);queen.rotation.z=Math.sin(time*.13)*.014;
    queenBound.p.set(QUEEN.x+dx,QUEEN.y,QUEEN.z+dz);duct.position.set(dx,0,dz);duct.scale.x=1+.14*contraction;
    laidCount=Math.floor(time/8)+1;
    for(let i=0;i<laying.length;i++){
      const elapsed=time-i*8,mesh=laying[i];mesh.visible=elapsed>=0;if(elapsed<0)continue;const age=elapsed%(laying.length*8);
      const t=clamp(age/5,0,1),a=i*2.39996,r=3+Math.sqrt(i)*1.3;
      const x=dx+Math.cos(a)*r*t,z=QUEEN.z+dz+20+Math.sin(a)*r*t;
      mesh.position.set(x,THREE.MathUtils.lerp(-242,chamberFloor(x,z)+2.4,t*t),z);
      mesh.scale.setScalar(1.45);mesh.scale.y=1.45*(1+.16*Math.sin(age*2)*Math.exp(-age*.6));mesh.rotation.z=Math.sin(a)*.14*t;
    }
  }
  function constrain(p){
    if(p.y>CHAMBER.y+38)return false;
    for(const shape of bounds){
      if(Math.abs(p.z-shape.p.z)>shape.r.z||Math.abs(p.x-shape.p.x)>shape.r.x)continue;
      const x=(p.x-shape.p.x)/shape.r.x,y=(p.y-shape.p.y)/shape.r.y,z=(p.z-shape.p.z)/shape.r.z,d=Math.hypot(x,y,z);
      if(d<1){const n=Math.max(d,.0001);p.set(shape.p.x+x/n*shape.r.x,shape.p.y+(d===0?1:y/n)*shape.r.y,shape.p.z+z/n*shape.r.z);return {kind:shape.kind,root:shape.p};}
    }
    for(const egg of laying){if(egg.visible&&p.distanceTo(egg.position)<2.3){near.subVectors(p,egg.position).normalize();if(near.lengthSq()<.01)near.set(0,1,0);p.copy(egg.position).addScaledVector(near,2.3);return {kind:'egg',root:egg.position};}}
    queen.updateWorldMatrix(true,false);local.copy(p);queen.worldToLocal(local).multiplyScalar(QUEEN.scale);
    for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){
      const cell=queenCells.get(`${Math.floor(local.x)+x},${Math.floor(local.y)+y},${Math.floor(local.z)+z}`);if(!cell)continue;
      for(const v of cell)if(local.distanceToSquared(v)<.8*.8){near.subVectors(local,v).normalize();if(near.lengthSq()<.01)near.set(0,1,0);local.copy(v).addScaledVector(near,.85).divideScalar(QUEEN.scale);p.copy(queen.localToWorld(local));return contact;}
    }
    return false;
  }
  return {update,constrain,queen,contactSamples:()=>({egg:bounds[0].p.toArray(),queen:queenBound.p.toArray()}),stats:()=>({eggs:EGG_COUNT,laidEggs:laidCount,queenScale:QUEEN.scale,chamberWidth:CHAMBER.r*2,queenPosition:queen.position.toArray(),queenRotation:queen.rotation.y})};
}

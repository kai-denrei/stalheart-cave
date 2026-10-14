import * as THREE from '../vendor/three.module.js';
import {BRANCHES,ringPoint,branchCenter,frameAt,radius,isTunnelInterior,inChamber} from './mission.js';

export function createCaveNetwork({body,stone,scene}){
  const triangles=[];
  for(const branch of BRANCHES){
    const rings=Math.ceil(branch.length/.72),sides=72,positions=[],indices=[];
    for(let i=0;i<=rings;i++)for(let j=0;j<=sides;j++){const p=ringPoint(i/rings*branch.length,j/sides*Math.PI*2,0,branch.id);positions.push(p.x,p.y,p.z);}
    function add(a,b,c){
      const p={x:(positions[a*3]+positions[b*3]+positions[c*3])/3,y:(positions[a*3+1]+positions[b*3+1]+positions[c*3+1])/3,z:(positions[a*3+2]+positions[b*3+2]+positions[c*3+2])/3};
      if(isTunnelInterior(p,.12,branch.id)||inChamber(p,.12))return;indices.push(a,b,c);
    }
    for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){const v=i*(sides+1)+j;add(v,v+sides+1,v+1);add(v+1,v+sides+1,v+sides+2);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const mesh=body(geometry,stone,scene,branch.id==='main'?190000:branch.id==='left'?140000:65000);mesh.name=`Cave / ${branch.id}`;triangles.push(indices.length/3);
    if(!branch.toQueen){
      const c=branchCenter(branch.id,branch.length),f=frameAt(branch.length,branch.id),r=radius(branch.length,branch.id);
      const cap=new THREE.SphereGeometry(r,48,24),p=cap.attributes.position;
      const u=new THREE.Vector3().copy(f.u),v=new THREE.Vector3().copy(f.v),t=new THREE.Vector3().copy(f.t),basis=new THREE.Matrix4().makeBasis(u,t,v);
      cap.applyMatrix4(basis);cap.translate(c.x,c.y,c.z);const kept=[];
      for(let i=0;i<cap.index.count;i+=3){const a=cap.index.getX(i),b=cap.index.getX(i+1),d=cap.index.getX(i+2),x=(p.getX(a)+p.getX(b)+p.getX(d))/3-c.x,y=(p.getY(a)+p.getY(b)+p.getY(d))/3-c.y,z=(p.getZ(a)+p.getZ(b)+p.getZ(d))/3-c.z;if(x*f.t.x+y*f.t.y+z*f.t.z>=0)kept.push(a,b,d);}
      cap.setIndex(kept);body(cap,stone,scene,7500).name='Sealed dead end';
    }
  }
  return {stats:()=>({tunnelBranches:BRANCHES.length,queenRoutes:BRANCHES.filter(b=>b.toQueen).length,tunnelTriangles:triangles})};
}

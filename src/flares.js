import * as THREE from '../vendor/three.module.js';
import {FLARE_COUNT,nearestRoute,frameAt,ringPoint,CHAMBER_LIP,chamberFloor,clamp,surfaceHeight} from './mission.js';

export function createFlares(scene,uniforms){
  const flares=[];
  for(let i=0;i<FLARE_COUNT;i++){
    const group=new THREE.Group();scene.add(group);group.visible=false;
    const core=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.38,8),new THREE.MeshBasicMaterial({color:0xff4433,fog:false}));core.rotation.z=.5;group.add(core);
    const halo=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{strength:{value:1}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform float strength;void main(){float d=length(vUv-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(1.,.055,.02,exp(-d*5.)*strength);}' }));group.add(halo);
    const light=new THREE.PointLight(0xff2116,0,16,1.3);scene.add(light);
    flares.push({group,halo,light,active:false,from:new THREE.Vector3(),to:new THREE.Vector3(),at:0});
  }
  function drop(position,time,heading){
    const flare=flares.find(f=>!f.active);if(!flare)return false;
    flare.active=true;flare.at=time;flare.from.copy(position);flare.from.y-=.5;
    if(position.y<CHAMBER_LIP-4){
      flare.to.copy(position);flare.to.x+=Math.cos(heading)*2;flare.to.z-=Math.sin(heading)*2;flare.to.y=chamberFloor(flare.to.x,flare.to.z)+.4;
    }else if(position.y>-12){
      flare.to.copy(position);flare.to.x+=2;const ground=surfaceHeight(flare.to.x,flare.to.z);if(Number.isFinite(ground))flare.to.y=ground+.4;else flare.to.copy(ringPoint(0,0,.2));
    }else{
      const n=nearestRoute(position),f=frameAt(n.s,n.branch),dx=position.x-f.c.x,dy=position.y-f.c.y,dz=position.z-f.c.z;
      const a=Math.hypot(dx,dy,dz)>.8?Math.atan2(dx*f.v.x+dy*f.v.y+dz*f.v.z,dx*f.u.x+dy*f.u.y+dz*f.u.z):0;
      flare.to.copy(ringPoint(n.s+.8,a,.2,n.branch));
    }
    flare.group.visible=true;return true;
  }
  function update(time,camera){
    for(let i=0;i<flares.length;i++){
      const f=flares[i];if(!f.active)continue;
      const duration=Math.max(.8,Math.sqrt(f.from.distanceTo(f.to)/4)),t=clamp((time-f.at)/duration,0,1);
      f.group.position.lerpVectors(f.from,f.to,t);f.group.position.y+=Math.sin(t*Math.PI)*.3;
      f.halo.quaternion.copy(camera.quaternion);const flicker=.88+.09*Math.sin(time*17+i)+.03*Math.sin(time*31+i);
      f.halo.material.uniforms.strength.value=flicker;f.light.position.copy(f.group.position);f.light.intensity=55*flicker;
      uniforms.uFlarePositions.value[i].copy(f.group.position);uniforms.uFlareStrengths.value[i]=flicker;
    }
  }
  function reset(){for(let i=0;i<flares.length;i++){const f=flares[i];f.active=false;f.group.visible=false;f.light.intensity=0;uniforms.uFlareStrengths.value[i]=0;}}
  return {drop,update,reset,stats:()=>flares.filter(f=>f.active).map(f=>({position:f.group.position.toArray(),rest:f.to.toArray()}))};
}

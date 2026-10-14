import * as THREE from '../vendor/three.module.js';
import {smooth} from './mission.js';

export function createDetonation(scene,entrance,tank){
  let started=null,age=0;
  const positions=new Float32Array(320*3),seeds=new Float32Array(320);
  for(let i=0;i<320;i++){const a=i*2.39996,r=1.2+(i%17)*.21;positions[i*3]=Math.cos(a)*r;positions[i*3+1]=-3;positions[i*3+2]=Math.sin(a)*r;seeds[i]=((i*73)%317)/317;}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));
  const uniforms={uAge:{value:0},uHeight:{value:innerHeight}};
  const smoke=new THREE.Points(geometry,new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,depthTest:true,
    vertexShader:`attribute float aSeed;uniform float uAge;uniform float uHeight;varying float vAlpha;varying float vSeed;
      void main(){float t=max(0.,uAge-.3-aSeed*3.);vec3 p=position;p.y+=t*(2.1+aSeed*1.7);p.x+=sin(aSeed*53.)*t*.45;p.z+=cos(aSeed*29.)*t*.4;vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;float size=2.8+t*.9;gl_PointSize=clamp(size*uHeight/max(1.,-view.z),1.,300.);vAlpha=step(.3+aSeed*3.,uAge)*smoothstep(0.,.8,t)*(1.-smoothstep(11.,22.,t))*.23;vSeed=aSeed;}`,
    fragmentShader:`varying float vAlpha;varying float vSeed;void main(){vec2 p=gl_PointCoord*2.-1.;float r=length(p);if(r>1.)discard;float n=.78+.22*sin(p.x*13.+vSeed*41.)*cos(p.y*12.-vSeed*31.);float a=(1.-smoothstep(.35,1.,r))*vAlpha*n;gl_FragColor=vec4(mix(vec3(.15,.18,.19),vec3(.48,.51,.50),vSeed),a);}`
  }));smoke.frustumCulled=false;smoke.visible=false;smoke.renderOrder=4;scene.add(smoke);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.035,6,96),new THREE.MeshBasicMaterial({color:0xaaa789,transparent:true,opacity:0,depthWrite:false}));ring.rotation.x=Math.PI/2;ring.position.y=.08;scene.add(ring);
  const flash=new THREE.PointLight(0xffd8a3,0,95,1);flash.position.set(0,1,0);scene.add(flash);
  const dustPositions=new Float32Array(180*3);
  for(let i=0;i<180;i++){const a=i*2.39996,r=19+(i%13)*.9;dustPositions[i*3]=Math.cos(a)*r;dustPositions[i*3+1]=.3;dustPositions[i*3+2]=Math.sin(a)*r;}
  const dust=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(dustPositions,3)),new THREE.PointsMaterial({color:0x9eaaa2,size:.65,transparent:true,opacity:0,depthWrite:false}));scene.add(dust);
  const tankY=tank.position.y;
  function start(time){started=time;age=0;smoke.visible=true;}
  function update(time,reducedMotion=false){
    if(started===null)return;age=Math.max(0,time-started);uniforms.uAge.value=age;uniforms.uHeight.value=innerHeight;
    const quake=(1-smooth(0,4.5,age))*(reducedMotion?.02:.24);
    entrance.group.position.y=Math.sin(age*31)*quake;entrance.group.rotation.x=Math.sin(age*23)*quake*.016;entrance.group.rotation.z=Math.cos(age*19)*quake*.014;
    tank.position.y=tankY+Math.sin(age*29)*quake*.6;
    flash.intensity=420*Math.exp(-age*7);ring.scale.setScalar(4+age*13);ring.material.opacity=Math.max(0,.5-age*.23);
    dust.material.opacity=Math.max(0,.5-age*.08);dust.position.y=Math.min(5,age*1.3);dust.scale.setScalar(1+age*.12);
  }
  function reset(){started=null;age=0;smoke.visible=false;uniforms.uAge.value=0;flash.intensity=0;ring.material.opacity=0;dust.material.opacity=0;dust.position.y=0;dust.scale.setScalar(1);entrance.group.position.y=0;entrance.group.rotation.set(0,0,0);tank.position.y=tankY;}
  return {start,update,reset,stats:()=>({detonationActive:started!==null,detonationAge:age,smokeVisible:smoke.visible&&age>.5,smokeParticles:smoke.visible?320:0,groundDisplacement:entrance.group.position.y})};
}

import * as THREE from '../vendor/three.module.js';
import {smooth} from './mission.js';

export function createDetonation(scene,entrance){
  let started=null,age=0;
  const positions=new Float32Array(3200*3),seeds=new Float32Array(3200);
  for(let i=0;i<3200;i++){const a=i*2.39996,r=Math.sqrt(((i*73)%3199)/3199)*1.7;positions[i*3]=Math.cos(a)*r;positions[i*3+1]=-15;positions[i*3+2]=Math.sin(a)*r;seeds[i]=((i*73)%3199)/3199;}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));
  const uniforms={uAge:{value:0},uHeight:{value:innerHeight}};
  const smoke=new THREE.Points(geometry,new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,depthTest:true,
    vertexShader:`attribute float aSeed;uniform float uAge;uniform float uHeight;varying float vAlpha;varying float vSeed;
      void main(){
        float vent=step(.65,aSeed),birth=.015+mix(aSeed*.09,(aSeed-.65)*1.8,vent);
        float elapsed=max(0.,uAge-birth),t=mix(elapsed,mod(elapsed,.85),vent),brake=mix(18.,35.,vent),impulse=1.-exp(-brake*t);vec3 p=position;
        p.y+=mix((1400.+aSeed*900.)/brake*impulse+t*4.,t*(150.+aSeed*100.)-t*t*20.,vent);
        float spread=mix((1.-exp(-12.*t))*(18.+aSeed*43.),2.+t*(8.+aSeed*4.),vent);
        p.x+=sin(aSeed*153.)*spread+sin(t*1.4+aSeed*31.)*t*1.8;
        p.z+=cos(aSeed*129.)*spread+cos(t*1.2+aSeed*43.)*t*1.8;
        vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
        float size=mix(3.+impulse*(15.+aSeed*22.)+t*2.,5.+t*19.,vent);gl_PointSize=clamp(size*uHeight/max(1.,-view.z),1.,300.);
        float fade=mix(1.-smoothstep(10.,17.,elapsed),1.-smoothstep(7.,12.,uAge),vent);
        vAlpha=step(birth,uAge)*smoothstep(0.,.012,t)*fade*.22;vSeed=aSeed;

      }`,
    fragmentShader:`varying float vAlpha;varying float vSeed;
      void main(){vec2 p=gl_PointCoord*2.-1.;float r=length(p);
        float n=.5+.19*sin(p.x*9.+sin(p.y*7.)+vSeed*41.)+.16*cos(p.y*13.-vSeed*31.)+.1*sin(p.x*23.+p.y*17.);
        float edge=r+(1.-n)*.26;if(edge>1.)discard;
        float a=(1.-smoothstep(.2,1.,edge))*vAlpha*(.55+n*.65);
        vec3 col=mix(vec3(.075,.085,.08),vec3(.34,.36,.33),n*.65+vSeed*.3);gl_FragColor=vec4(col,a);
      }`

  }));smoke.frustumCulled=false;smoke.visible=false;smoke.renderOrder=4;scene.add(smoke);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.987,1,128),new THREE.MeshBasicMaterial({color:0xaaa789,transparent:true,opacity:0,depthWrite:false}));ring.rotation.x=Math.PI/2;ring.position.y=.08;scene.add(ring);
  const flash=new THREE.PointLight(0xffd8a3,0,95,1);flash.position.set(0,1,0);scene.add(flash);
  const dustPositions=new Float32Array(720*3);
  for(let i=0;i<720;i++){const a=i*2.39996,r=19+(i%13)*.9;dustPositions[i*3]=Math.cos(a)*r;dustPositions[i*3+1]=.3;dustPositions[i*3+2]=Math.sin(a)*r;}
  const dust=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(dustPositions,3)),new THREE.PointsMaterial({color:0x9eaaa2,size:.8,transparent:true,opacity:0,depthWrite:false}));scene.add(dust);

  function start(time){started=time;age=0;smoke.visible=true;}
  function update(time,reducedMotion=false){
    if(started===null)return;age=Math.max(0,time-started);uniforms.uAge.value=age;uniforms.uHeight.value=innerHeight;
    const quake=(1-smooth(0,5,age))*(reducedMotion?.035:2.4);
    entrance.group.position.y=Math.sin(age*31)*quake;entrance.group.rotation.x=Math.sin(age*23)*quake*.016;entrance.group.rotation.z=Math.cos(age*19)*quake*.014;

    flash.intensity=9000*Math.exp(-age*9);ring.scale.setScalar(4+age*210);ring.material.opacity=.28*(1-smooth(0,.7,age));
    dust.material.opacity=Math.max(0,.65-age*.2);dust.position.y=Math.min(18,age*22);dust.scale.setScalar(1+age*3.5);
  }
  function reset(){started=null;age=0;smoke.visible=false;uniforms.uAge.value=0;flash.intensity=0;ring.material.opacity=0;dust.material.opacity=0;dust.position.y=0;dust.scale.setScalar(1);entrance.group.position.y=0;entrance.group.rotation.set(0,0,0);}
  return {start,update,reset,stats:()=>({detonationActive:started!==null,detonationAge:age,smokeVisible:smoke.visible&&age>.5,smokeParticles:smoke.visible?3200:0,smokeOriginDepth:15,smokeLaunchSpeed:1400,smokeReleaseWindow:.09,groundDisplacement:entrance.group.position.y})};
}

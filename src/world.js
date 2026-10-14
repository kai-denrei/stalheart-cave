import * as THREE from '../vendor/three.module.js';
import { center, radius, frameAt, ringPoint, ROUTE_END, SHAFT_TOP, CHAMBER_LIP, chamberFloor, smooth, pointSegmentDistance } from './mission.js';
import {createSinkholeEntrance} from './sinkhole.js';
import {createNursery} from './nursery.js';
import {createFlares} from './flares.js';

const TAU=Math.PI*2;
function random(seed=9317){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
const rand=random();
const vec=(p)=>new THREE.Vector3(p.x,p.y,p.z);

export async function createWorld(canvas){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
  renderer.setSize(innerWidth,innerHeight);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.2;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x020504);
  scene.fog=new THREE.FogExp2(0x020504,.035);
  const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.08,340);
  camera.rotation.order='YXZ';scene.add(camera);
  const uniforms={uTime:{value:0},uLidar:{value:0},uScanTime:{value:-100},uScanOrigin:{value:new THREE.Vector3()},uPreview:{value:0},uFlarePositions:{value:Array.from({length:6},()=>new THREE.Vector3())},uFlareStrengths:{value:Array(6).fill(0)}};
  const surfaces=[];
  function material(color,roughness=.93,rock=false){
    const mat=new THREE.MeshStandardMaterial({color,roughness,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
    mat.onBeforeCompile=shader=>{
      shader.uniforms.uLidar=uniforms.uLidar;shader.uniforms.uFlarePositions=uniforms.uFlarePositions;shader.uniforms.uFlareStrengths=uniforms.uFlareStrengths;
      shader.vertexShader='varying vec3 vFlareWorld;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','vec4 flarePosition=vec4(transformed,1.);\n#ifdef USE_INSTANCING\nflarePosition=instanceMatrix*flarePosition;\n#endif\nvFlareWorld=(modelMatrix*flarePosition).xyz;\n#include <project_vertex>');
      shader.fragmentShader='uniform float uLidar;uniform vec3 uFlarePositions[6];uniform float uFlareStrengths[6];varying vec3 vFlareWorld;\n'+shader.fragmentShader;
      if(rock){
        shader.vertexShader='varying vec3 vRock;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRock=position;');
        shader.fragmentShader=`varying vec3 vRock;
          float hashRock(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
          float noiseRock(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hashRock(i),hashRock(i+vec3(1,0,0)),f.x),mix(hashRock(i+vec3(0,1,0)),hashRock(i+vec3(1,1,0)),f.x),f.y),mix(mix(hashRock(i+vec3(0,0,1)),hashRock(i+vec3(1,0,1)),f.x),mix(hashRock(i+vec3(0,1,1)),hashRock(i+vec3(1,1,1)),f.x),f.y),f.z);}
        `+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat strata=noiseRock(vRock*1.8)*.5+noiseRock(vRock*7.)*.3+noiseRock(vRock*23.)*.2;diffuseColor.rgb*=.25+strata*1.25;');
        shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=normalize(normal+vec3(dFdx(strata),dFdy(strata),0.)*2.);');
      }
      shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>','#include <dithering_fragment>\n if(uLidar > .5){float light=0.;for(int i=0;i<6;i++)light+=uFlareStrengths[i]*(1.-smoothstep(2.,12.,distance(vFlareWorld,uFlarePositions[i])));gl_FragColor.rgb=mix(vec3(.002,.005,.004),gl_FragColor.rgb,clamp(light,0.,1.));}');
    };return mat;
  }
  const stone=material(0x62675a,.93,true),flesh=material(0x535b43,.55),metal=material(0x55645e,.6);
  const pointMaterial=new THREE.ShaderMaterial({
    uniforms,transparent:true,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending,
    vertexShader:`
      uniform float uTime; uniform float uLidar; uniform float uScanTime; uniform vec3 uScanOrigin; uniform float uPreview;
      attribute float aSeed; varying float vAlpha; varying float vDistance; varying float vSeed;
      void main(){
        vec4 world=modelMatrix*vec4(position,1.);vec4 view=viewMatrix*world;
        float d=length(view.xyz);float scanD=distance(world.xyz,uScanOrigin);float age=uTime-uScanTime-scanD/72.;
        float echo=step(0.,age)*exp(-max(0.,age)*.22)*step(scanD,170.);
        float proximity=(1.-smoothstep(7.,23.,d))*.43;
        float pulse=1.-smoothstep(0.,1.8,abs(scanD-(uTime-uScanTime)*72.));
        vAlpha=max(proximity,echo*.9)+pulse*.35;
        vAlpha=max(vAlpha,uPreview*(.52+.18*sin(aSeed*70.)));
        vAlpha*=uLidar*(.6+.4*aSeed)*(1.-smoothstep(125.,180.,d));
        vDistance=d;vSeed=aSeed;
        gl_Position=projectionMatrix*view;
        gl_PointSize=clamp((34.+aSeed*17.)/max(1.,-view.z),1.05,3.3);
      }`,
    fragmentShader:`
      varying float vAlpha;varying float vDistance;varying float vSeed;
      void main(){
        if(vAlpha<.02) discard;
        vec2 c=gl_PointCoord-.5;if(dot(c,c)>.25)discard;
        float d=vDistance;
        vec3 near=vec3(.94,.43,.23),mid=vec3(.79,.77,.38),green=vec3(.36,.7,.48),far=vec3(.19,.47,.62),deep=vec3(.27,.3,.57);
        vec3 col=mix(near,mid,smoothstep(2.,12.,d));col=mix(col,green,smoothstep(12.,26.,d));col=mix(col,far,smoothstep(26.,47.,d));col=mix(col,deep,smoothstep(47.,85.,d));
        gl_FragColor=vec4(col*(1.05+vSeed*.3),min(1.,vAlpha*1.15));
      }`
  });
  function points(geometry,parent=scene){
    if(!geometry.getAttribute('aSeed')){const a=new Float32Array(geometry.getAttribute('position').count);for(let i=0;i<a.length;i++)a[i]=rand();geometry.setAttribute('aSeed',new THREE.BufferAttribute(a,1));}
    const p=new THREE.Points(geometry,pointMaterial);p.frustumCulled=false;parent.add(p);return p;
  }
  function sample(geometry,count){
    const p=geometry.attributes.position,indices=geometry.index?.array;
    const triangles=indices?indices.length/3:p.count/3;
    const areas=new Float64Array(triangles);let area=0;
    const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),ab=new THREE.Vector3(),ac=new THREE.Vector3();
    for(let i=0;i<triangles;i++){a.fromBufferAttribute(p,indices?indices[i*3]:i*3);b.fromBufferAttribute(p,indices?indices[i*3+1]:i*3+1);c.fromBufferAttribute(p,indices?indices[i*3+2]:i*3+2);area+=ab.subVectors(b,a).cross(ac.subVectors(c,a)).length()*.5;areas[i]=area;}
    const out=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      const r=rand()*area;let lo=0,hi=triangles-1;while(lo<hi){const mid=(lo+hi)>>1;if(areas[mid]<r)lo=mid+1;else hi=mid;}
      a.fromBufferAttribute(p,indices?indices[lo*3]:lo*3);b.fromBufferAttribute(p,indices?indices[lo*3+1]:lo*3+1);c.fromBufferAttribute(p,indices?indices[lo*3+2]:lo*3+2);
      const u=Math.sqrt(rand()),v=rand();out[i*3]=a.x*(1-u)+b.x*u*(1-v)+c.x*u*v;out[i*3+1]=a.y*(1-u)+b.y*u*(1-v)+c.y*u*v;out[i*3+2]=a.z*(1-u)+b.z*u*(1-v)+c.z*u*v;
    }
    return new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(out,3));
  }
  function body(geometry,mat,parent=scene,samples=1500){const mesh=new THREE.Mesh(geometry,mat);parent.add(mesh);surfaces.push(mesh);if(samples)points(sample(geometry,samples),mesh);return mesh;}

  const entrance=createSinkholeEntrance(scene);
  const ringCount=340,sides=72,pos=[],indices=[];
  for(let i=0;i<=ringCount;i++){
    const s=i/ringCount*ROUTE_END;
    for(let j=0;j<=sides;j++){
      const p=ringPoint(s,j/sides*TAU);pos.push(p.x,p.y,p.z);
      if(i<ringCount&&j<sides){const v=i*(sides+1)+j;indices.push(v,v+sides+1,v+1,v+1,v+sides+1,v+sides+2);}
    }
  }
  const cave=new THREE.BufferGeometry();cave.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));cave.setIndex(indices);cave.computeVertexNormals();body(cave,stone,scene,200000);
  const nursery=await createNursery({scene,body,points,sample,stone,flesh,rand});
  const flares=createFlares(scene,uniforms);

  // Only surface light fades in the throat; darkness below still requires the lamp.
  const surfaceHemi=new THREE.HemisphereLight(0x7097bb,0x0a1018,.9);scene.add(surfaceHemi);
  const surfaceSun=new THREE.DirectionalLight(0xb8d4e1,1.3);surfaceSun.position.set(20,50,10);scene.add(surfaceSun);
  const rimLight=new THREE.PointLight(0x6ce8ed,50,60,1.5);rimLight.position.set(0,7,0);scene.add(rimLight);
  const tank=new THREE.Group();tank.position.set(-22,2,20);tank.rotation.y=-.5;scene.add(tank);
  const hull=new THREE.Mesh(new THREE.BoxGeometry(11,2.3,6),metal);tank.add(hull);
  const turret=new THREE.Mesh(new THREE.BoxGeometry(3.6,1.2,3),metal);turret.position.y=1.7;tank.add(turret);
  for(const x of [-5.7,5.7]){const skirt=new THREE.Mesh(new THREE.BoxGeometry(1.8,1.4,7),metal);skirt.position.set(x,-.5,0);tank.add(skirt);}
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.18,.28,5,8),metal);barrel.rotation.x=Math.PI/2;barrel.position.set(0,1.8,-3);tank.add(barrel);
  const lamp=new THREE.SpotLight(0xd3dec0,110,42,Math.PI*.24,.7,1.35);camera.add(lamp);lamp.position.set(.12,-.12,0);camera.add(lamp.target);lamp.target.position.set(0,-.05,-10);
  const fill=new THREE.PointLight(0x8da88a,.5,4);camera.add(fill);

  const limbs=[];
  function addLimb(s,angle,phase){
    const f=frameAt(s),root=vec(ringPoint(s,angle,.3)),length=radius(s)*1.95;
    const inward=vec(f.u).multiplyScalar(-Math.cos(angle)).addScaledVector(vec(f.v),-Math.sin(angle));
    const side=vec(f.u).multiplyScalar(-Math.sin(angle)).addScaledVector(vec(f.v),Math.cos(angle));
    const segments=32,radial=9,arr=new Float32Array((segments+1)*(radial+1)*3),idx=[];
    for(let i=0;i<segments;i++)for(let j=0;j<radial;j++){const k=i*(radial+1)+j;idx.push(k,k+radial+1,k+1,k+1,k+radial+1,k+radial+2);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(arr,3));geo.setIndex(idx);
    const mesh=new THREE.Mesh(geo,flesh);scene.add(mesh);mesh.frustumCulled=false;points(geo);
    limbs.push({s,angle,length,phase,root,inward,side,along:vec(f.t),geo,arr,segments,radial,path:[]});
  }
  for(const [i,s] of [48,65,80,108,137,165,191].entries()){addLimb(s,i%2?2.7:.35,i*1.7);addLimb(s+4,i%2?-.7:3.8,i*1.7+2.9);}
  const tangent=new THREE.Vector3(),axis=new THREE.Vector3(),normal=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),alternative=new THREE.Vector3(0,0,1);
  function animateLimbs(time){
    for(const l of limbs){
      l.path.length=0;
      const reach=l.length*(.52+.43*Math.sin(time*.43+l.phase));
      for(let i=0;i<=l.segments;i++){
        const u=i/l.segments;
        l.path.push(l.root.clone().addScaledVector(l.inward,reach*u).addScaledVector(l.side,Math.sin(u*4.8+time*.52+l.phase)*u*1.7).addScaledVector(l.along,Math.sin(u*3.5+l.phase+time*.3)*u*2.8));
      }
      for(let i=0;i<=l.segments;i++){
        const p=l.path[i];tangent.subVectors(l.path[Math.min(i+1,l.segments)],l.path[Math.max(0,i-1)]).normalize();axis.crossVectors(tangent,Math.abs(tangent.y)>.94?alternative:up).normalize();normal.crossVectors(tangent,axis).normalize();
        const r=.075+.78*Math.pow(1-i/l.segments,1.4);
        for(let j=0;j<=l.radial;j++){const a=j/l.radial*TAU,k=(i*(l.radial+1)+j)*3;l.arr[k]=p.x+r*(axis.x*Math.cos(a)+normal.x*Math.sin(a));l.arr[k+1]=p.y+r*(axis.y*Math.cos(a)+normal.y*Math.sin(a));l.arr[k+2]=p.z+r*(axis.z*Math.cos(a)+normal.z*Math.sin(a));}
      }
      l.geo.attributes.position.needsUpdate=true;l.geo.computeVertexNormals();
    }
  }
  const arm=new THREE.Group();camera.add(arm);arm.position.set(.69,-.65,-1.2);arm.rotation.z=-.22;arm.scale.setScalar(.48);
  const casing=new THREE.Mesh(new THREE.BoxGeometry(.19,.25,.56),new THREE.MeshStandardMaterial({color:0x69776e,roughness:.6}));arm.add(casing);
  const nozzle=new THREE.Mesh(new THREE.CylinderGeometry(.05,.08,.34,10),new THREE.MeshStandardMaterial({color:0x948e65,metalness:.5,roughness:.4}));nozzle.rotation.x=Math.PI/2;nozzle.position.set(0,-.05,-.4);arm.add(nozzle);
  const tip=new THREE.Mesh(new THREE.TorusGeometry(.047,.008,5,12),new THREE.MeshBasicMaterial({color:0xb4b590}));tip.position.set(0,-.05,-.574);arm.add(tip);
  const payload=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.75,12),metal);payload.rotation.x=Math.PI/2;payload.position.set(-.6,-.1,.02);arm.add(payload);
  const drop=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,1.2,12),metal);drop.visible=false;scene.add(drop);
  const dropGlow=new THREE.Mesh(new THREE.SphereGeometry(.08,8,6),new THREE.MeshBasicMaterial({color:0xf15a3a}));dropGlow.position.y=.61;drop.add(dropGlow);
  let dropTime=null,dropFloor=0;
  const dustPos=new Float32Array(1800*3);
  for(let i=0;i<1800;i++){const s=rand()*ROUTE_END,f=frameAt(s),a=rand()*TAU,r=rand()*radius(s)*.85;dustPos[i*3]=f.c.x+r*(f.u.x*Math.cos(a)+f.v.x*Math.sin(a));dustPos[i*3+1]=f.c.y+r*(f.u.y*Math.cos(a)+f.v.y*Math.sin(a));dustPos[i*3+2]=f.c.z+r*(f.u.z*Math.cos(a)+f.v.z*Math.sin(a));}
  const dust=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(dustPos,3)),new THREE.PointsMaterial({color:0x7f9877,size:.025,transparent:true,opacity:.27}));scene.add(dust);
  function scan(time){uniforms.uScanTime.value=time;uniforms.uScanOrigin.value.copy(camera.position);}
  function update(time,mission,preview=false){
    uniforms.uTime.value=time;uniforms.uLidar.value=mission.lidar&&!preview?1:0;uniforms.uPreview.value=0;
    const surface=smooth(-22,-2,camera.position.y);surfaceHemi.intensity=surface*.9;surfaceSun.intensity=surface*1.3;
    scene.background.setRGB(.002+surface*.003,.005+surface*.004,.004+surface*.012);
    scene.fog.density=(mission.lidar||preview)? .002 : .035*(1-surface)+.005;
    lamp.intensity=mission.lightFailed||preview?0:110*((camera.position.z<-25&&Math.sin(time*30)>.35)?.1:1);
    fill.intensity=mission.lightFailed?.04:.4;arm.visible=!preview;payload.visible=mission.payload;dust.visible=!mission.lidar&&!preview;
    animateLimbs(time);nursery.update(time);flares.update(time,camera);
    drop.visible=!mission.payload;
    if(mission.bombPosition){
      if(dropTime===null){dropTime=time;dropFloor=chamberFloor(mission.bombPosition.x,mission.bombPosition.z)+.7;}
      drop.position.copy(mission.bombPosition);drop.position.y=Math.max(dropFloor,mission.bombPosition.y-(time-dropTime)**2*3);dropGlow.visible=Math.sin(time*5)>0;
    }
  }
  function contacts(p){
    for(const l of limbs){if(p.distanceTo(l.root)>l.length+2)continue;for(let i=1;i<l.path.length;i++)if(pointSegmentDistance(p,l.path[i-1],l.path[i])<.62+.7*(1-i/l.path.length))return l;}return null;
  }
  function reset(){flares.reset();dropTime=null;drop.visible=false;uniforms.uScanTime.value=-100;}
  function render(){renderer.render(scene,camera);}
  function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
  return {camera,renderer,scene,update,render,resize,scan,contacts,constrainBodies:nursery.constrain,reset,uniforms,dropFlare:flares.drop,stats:()=>({...nursery.stats(),flares:flares.stats(),sinkhole:entrance.source,shaftDepth:SHAFT_TOP-CHAMBER_LIP,tentacles:limbs.length})};
}

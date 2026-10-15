import assert from 'node:assert/strict';
import {mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {serve} from './serve.mjs';
import {launchChrome} from './chrome-proc.mjs';

await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});
const server=serve(0);await once(server,'listening');
const profile=await mkdtemp(join(tmpdir(),'below-chrome-'));
const chrome=launchChrome(['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--window-size=1440,960','--autoplay-policy=no-user-gesture-required','--no-first-run']);
let ws;const errors=[];let serial=0;const pending=new Map();
try{
  const port=await chrome.port;
  const tab=await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
  ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p?.reject(new Error(JSON.stringify(m.error))):p?.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);if(m.method==='Log.entryAdded'&&m.params.entry.level==='error')errors.push(m.params.entry);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const key=async(code,type='keyDown')=>send('Input.dispatchKeyEvent',{type,code,key:({KeyW:'w',KeyE:'e',KeyQ:'q',KeyP:'p',KeyF:'f',ShiftLeft:'Shift',Space:' '})[code]||code,windowsVirtualKeyCode:({KeyW:87,KeyE:69,KeyQ:81,KeyP:80,KeyF:70,ShiftLeft:16,Space:32})[code]||0});
  const snap=()=>evaluate('window.__below.snapshot()');
  const capture=async name=>{await wait(200);const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(new URL(`../artifacts/${name}.png`,import.meta.url),Buffer.from(r.data,'base64'));};
  await send('Runtime.enable');await send('Log.enable');await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:960,deviceScaleFactor:1,mobile:false});
  const testUrl=new URL(process.env.BELOW_TEST_URL||`http://127.0.0.1:${server.address().port}/`);testUrl.searchParams.set('test','1');
  await send('Page.navigate',{url:testUrl.href});
  for(let i=0;i<200;i++){if(await evaluate('!!window.__below'))break;await wait(100);}
  assert.ok(await evaluate('!!window.__below'),'world boots');await capture('01-briefing');
  const button=await evaluate('(()=>{const r=document.getElementById("begin").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()');
  await send('Input.dispatchMouseEvent',{type:'mousePressed',...button,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...button,button:'left',clickCount:1});await wait(300);
  assert.equal((await snap()).mode,'playing');assert.equal((await snap()).isaoModel,'isao_birudoron_lod1');assert.equal((await snap()).rotorClip,true);assert.equal((await snap()).cutisCount,12);assert.equal((await snap()).cutisType,'Cutis-Soft Ivory');assert.ok((await snap()).cameraDistance>2);await capture('02-third-person-isao');
  for(let i=0;i<100&&!(await snap()).audio.loadedCues.includes('alien_reverb');i++)await wait(100);
  for(const cue of ['isao_hit_wall','isao_hit_enemy','isao_hit_tentacle','queen_laying_eggs','alien_reverb'])assert.ok((await snap()).audio.loadedCues.includes(cue));
  for(const [p,exposure] of [[[0,1,0],1],[[0,-10,0],1],[[0,-13.2,0],1],[[0,-21,0],0]]){
    await evaluate(`__below.pose(...${JSON.stringify(p)});__below.advance(.05)`);assert.ok(Math.abs((await snap()).exteriorExposure-exposure)<.01);
  }
  await evaluate('__below.pose(0,-10,0);__below.advance(.05)');await capture('refined-slope-light');
  await evaluate('__below.pose(0,-21,0);__below.advance(.05)');await capture('refined-below-throat');
  await evaluate('__below.start();__below.pose(0,8,0);__below.advance(.05)');
  for(const [kind,cue] of [['wall','isao_hit_wall'],['tentacle','isao_hit_tentacle'],['reed','isao_hit_enemy']]){
    const before=(await snap()).audio.cueCounts[cue]||0;await evaluate(`__below.hit(${JSON.stringify(kind)});__below.advance(.05);__below.pause();document.getElementById("pause").hidden=true`);assert.equal((await snap()).audio.cueCounts[cue],before+1);assert.equal((await snap()).hitHaloVisible,true);assert.ok((await snap()).hitHaloStrength>.5);
    if(kind==='wall')await capture('refined-hit-halo');await evaluate('__below.resume()');
    await evaluate('__below.advance(1)');assert.equal((await snap()).hitHaloVisible,false);
  }
  await evaluate('__below.start();__below.pose(43,-190,-38);__below.look(.6,-.36);__below.advance(.1)');assert.equal((await snap()).audio.cueCounts.queen_laying_eggs,1);await evaluate('__below.advance(.2)');assert.equal((await snap()).audio.cueCounts.queen_laying_eggs,1);
  const reed=(await snap()).reedMotion;await evaluate('__below.advance(1)');assert.notDeepEqual((await snap()).reedMotion,reed);for(const r of (await snap()).reedMotion)assert.ok(r.surfaceRevision>0);
  await evaluate('__below.pose(65,-200,-30);__below.advance(36)');assert.equal((await snap()).audio.cueCounts.alien_reverb,1,'quiet underground scene plays the supplied reverb');
  await evaluate('__below.blastFrame(.2)');assert.equal((await snap()).firstSmokeAboveGround,null);await capture('refined-blast-inside-throat');
  await evaluate('__below.blastFrame(.55)');assert.ok((await snap()).firstSmokeAboveGround>0);await capture('refined-blast-emerging');
  await evaluate('__below.blastFrame(2)');await capture('refined-blast-plume');
  assert.deepEqual(errors,[],'no browser/WebGL errors');console.log(JSON.stringify({refinements:'PASS',sounds:5,exposure:true,hitHalo:true,nativeReed:true,undergroundSmoke:true,errors}));
}finally{ws?.close();chrome.kill();await new Promise(r=>server.close(r));await rm(profile,{recursive:true,force:true});}

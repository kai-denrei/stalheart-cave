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
  const initial=await snap();assert.ok(initial.mazeAddedLength>55);assert.equal(initial.surfaceJoins,'clipped shared boundaries');
  const [a,b]=initial.hiveEntrances;assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)>90);
  await evaluate('__below.start();__below.place(35);__below.look(-1.1,-.4);__below.advance(.1)');await capture('hive-extended-maze');
  await evaluate('__below.place(48);__below.look(1.2,-.3);__below.advance(.1);__below.dropFlare();__below.advance(2)');assert.equal((await snap()).mission.flares,9);await capture('hive-junction-flare');
  await evaluate(`(async()=>{const {BRANCHES,branchCenter,frameAt}=await import('./src/mission.js');const branch=BRANCHES.find(b=>b.id==='left'),s=branch.length-20,p=branchCenter('left',s),f=frameAt(s,'left');__below.pose(p.x,p.y,p.z);__below.look(Math.atan2(-f.t.x,-f.t.z),-.5);__below.advance(4.3);__below.selectView(0);__below.scan();__below.advance(2)})()`);await capture('hive-far-wall-entrance');
  await evaluate('__below.pose(43,-190,-38);__below.look(.6,-.36);__below.advance(4.5);__below.selectView(0);__below.scan();__below.advance(2)');
  const queen=await snap();assert.equal(queen.queenMotion.clockScale,.2);await capture('hive-queen-reach');
  await evaluate('__below.advance(8);__below.scan();__below.advance(2)');const moved=await snap();assert.notDeepEqual(moved.queenSkinSample,queen.queenSkinSample);assert.notDeepEqual(moved.queenSurveySample,queen.queenSurveySample);assert.ok(moved.queenMotion.surfaceRevision>queen.queenMotion.surfaceRevision);await capture('hive-queen-pull');
  for(const age of [.2,.55,2,6]){await evaluate(`__below.blastFrame(${age})`);await capture(`hive-ground-smoke-${age}`);}
  assert.deepEqual(errors,[]);console.log(JSON.stringify({hiveRefinements:'PASS',mazeAddedLength:initial.mazeAddedLength,hiveEntrances:initial.hiveEntrances,nativeQueen:true,surfaceJoins:true,errors}));
}finally{ws?.close();chrome.kill();await new Promise(r=>server.close(r));await rm(profile,{recursive:true,force:true});}

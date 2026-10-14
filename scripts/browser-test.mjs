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
  const key=async(code,type='keyDown')=>send('Input.dispatchKeyEvent',{type,code,key:({KeyW:'w',KeyE:'e',KeyQ:'q',KeyP:'p',KeyF:'f',Space:' '})[code]||code,windowsVirtualKeyCode:({KeyW:87,KeyE:69,KeyQ:81,KeyP:80,KeyF:70,Space:32})[code]||0});
  const snap=()=>evaluate('window.__below.snapshot()');
  const capture=async name=>{await wait(200);const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(new URL(`../artifacts/${name}.png`,import.meta.url),Buffer.from(r.data,'base64'));};
  await send('Runtime.enable');await send('Log.enable');await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:960,deviceScaleFactor:1,mobile:false});
  const testUrl=new URL(process.env.BELOW_TEST_URL||`http://127.0.0.1:${server.address().port}/`);testUrl.searchParams.set('test','1');
  await send('Page.navigate',{url:testUrl.href});
  for(let i=0;i<100;i++){if(await evaluate('!!window.__below'))break;await wait(100);}
  assert.ok(await evaluate('!!window.__below'),'world boots');await capture('01-briefing');
  const button=await evaluate('(()=>{const r=document.getElementById("begin").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()');
  await send('Input.dispatchMouseEvent',{type:'mousePressed',...button,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...button,button:'left',clickCount:1});await wait(300);
  assert.equal((await snap()).mode,'playing');await capture('02-stalheart-sinkhole');
  const start=await snap();await key('KeyW');await wait(600);await key('KeyW','keyUp');assert.ok((await snap()).position[2]<start.position[2]-.5,'keyboard flight');
  await evaluate('__below.place(49);__below.look(0,0);__below.advance(.1)');assert.equal((await snap()).mission.lightFailed,true);
  await key('KeyQ');await key('KeyQ','keyUp');await wait(900);assert.equal((await snap()).mission.lidar,true);await capture('03-living-walls');
  await key('KeyF');await key('KeyF','keyUp');await evaluate('__below.advance(3)');assert.equal((await snap()).mission.flares,5);assert.equal((await snap()).flares.length,1);await capture('04-flare');
  await evaluate('__below.place(137);__below.look(0,-1.5);__below.advance(.1);__below.scan()');await wait(1400);await capture('05-vertical-shaft');
  await key('KeyF');await key('KeyF','keyUp');await evaluate('__below.advance(3)');const shaftFlare=(await snap()).flares[1];assert.ok(shaftFlare.position[1]>-100,'flare lodges in shaft instead of falling to chamber');
  await key('KeyP');const paused=await snap();await wait(200);assert.equal((await snap()).mission.time,paused.mission.time);assert.deepEqual((await snap()).flares,paused.flares);assert.equal(paused.mode,'paused');
  await key('KeyP','keyUp');await key('KeyP');await key('KeyP','keyUp');await wait(100);assert.equal((await snap()).mode,'playing');
  for(let i=0;i<5;i++){await key('KeyF');await key('KeyF','keyUp');}assert.equal((await snap()).mission.flares,0);assert.equal((await snap()).flares.length,6);
  await evaluate('__below.pose(43,-190,-38);__below.look(.6,-.36);__below.advance(.2);__below.scan()');await wait(1700);await capture('06-queen-chamber');
  const nursery=await snap();assert.equal(nursery.mission.nursery,true);assert.equal(nursery.eggs,1600);assert.equal(nursery.chamberWidth,152);assert.equal(nursery.queenScale,620);assert.equal(nursery.tentacles,14);
  assert.equal(await evaluate('document.getElementById("interaction").hidden'),true,'no proximity placement prompt');
  const laidBefore=nursery.laidEggs;await evaluate('__below.advance(8.2)');assert.ok((await snap()).laidEggs>laidBefore,'Queen keeps laying eggs');
  await evaluate('__below.pose(36,-239,-63);__below.look(.77,.03);__below.scan()');await wait(1300);await capture('07-egg-laying');
  await evaluate('__below.nearQueen()');const chosen=(await snap()).position;await key('KeyE');await evaluate('__below.advance(3.2)');await key('KeyE','keyUp');
  assert.equal((await snap()).mission.payload,false);assert.equal((await snap()).mission.bombPosition.x,chosen[0]);await capture('08-extraction');
  await evaluate('__below.pose(0,3,0);__below.advance(.1)');assert.equal((await snap()).mission.outcome,'rescued');await capture('09-rescued');
  await evaluate('__below.start()');await wait(150);assert.equal((await snap()).mission.flares,6);assert.equal((await snap()).flares.length,0);
  await evaluate('__below.pose(-39,-225,-98)');await key('KeyE');await evaluate('__below.advance(3.2)');await key('KeyE','keyUp');assert.equal((await snap()).mission.bombPosition.x,-39,'second placement point is accepted');
  await evaluate('__below.advance(106)');assert.equal((await snap()).mission.outcome,'sacrifice');await capture('10-sacrifice');
  await evaluate('__below.start()');await wait(150);await evaluate('__below.hurt(100);__below.advance(.1)');assert.equal((await snap()).mission.outcome,'lost');
  // Fly the whole route, including both elbows and a down/up traversal of the shaft.
  await evaluate('__below.start()');await wait(150);
  const flight=await evaluate(`(async()=>{
    const {center,ROUTE_END,distance,frameAt}=await import('./src/mission.js');
    const press=(code,type='keydown')=>document.dispatchEvent(new KeyboardEvent(type,{code}));
    let steps=0;const milestones=[];
    function go(goal,limit=140){
      press('KeyW');press('ShiftLeft');let n=0;
      while(n++<limit&&__below.snapshot().mode==='playing'){
        const state=__below.snapshot(),a=state.position,p={x:a[0],y:a[1],z:a[2]};if(distance(p,goal)<1.3)break;
        const dx=goal.x-p.x,dy=goal.y-p.y,dz=goal.z-p.z;__below.look(-Math.atan2(dx,-dz),Math.atan2(dy,Math.hypot(dx,dz)));__below.advance(.08);steps++;
        if(state.mission.lightFailed)__below.scan();
      }
      if(n>=limit)milestones.push({stuck:goal,state:__below.snapshot()});
    }
    go({x:0,y:1,z:0});go(center(0));
    for(let s=4;s<ROUTE_END;s+=4){const f=frameAt(s),p={...f.c};p.x+=f.u.x*1.5;p.y+=f.u.y*1.5;p.z+=f.u.z*1.5;go(p);if([44,96,148,196].includes(s))__below.dropFlare();}
    go(center(ROUTE_END));go({x:30,y:-175,z:-60});go({x:38,y:-205,z:-77});go({x:37,y:-219,z:-93});
    press('KeyW','keyup');press('ShiftLeft','keyup');__below.advance(1);press('KeyE');__below.advance(3.2);press('KeyE','keyup');const planted=__below.snapshot();
    go({x:38,y:-205,z:-77});go({x:30,y:-175,z:-60});go(center(ROUTE_END));
    for(let s=ROUTE_END-4;s>0;s-=4){const f=frameAt(s),p={...f.c};p.x+=f.u.x*1.5;p.y+=f.u.y*1.5;p.z+=f.u.z*1.5;go(p);}
    go(center(0));go({x:0,y:4,z:0});press('KeyW','keyup');press('ShiftLeft','keyup');return {planted,finished:__below.snapshot(),steps,milestones};
  })()`);
  await writeFile(new URL('../artifacts/flight-report.json',import.meta.url),JSON.stringify(flight,null,2));
  assert.equal(flight.planted.mission.payload,false,'complete flight reaches Queen');
  assert.equal(flight.finished.mission.outcome,'rescued','complete flight returns up the shaft');
  assert.deepEqual(errors,[],'no browser/WebGL errors');
  const report={result:'PASS',checks:['Stalheart sinkhole','keyboard flight','LiDAR','longer tentacles','six persistent flares','pause freezes flares','vertical shaft','152 m chamber / 1600 eggs','egg laying','no placement marker','two free bomb positions','all endings','restart restocks flares','continuous return flight','console clean'],flight,snapshot:await snap(),errors};
  await writeFile(new URL('../artifacts/browser-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{
  ws?.close();chrome.kill();await new Promise(r=>server.close(r));await rm(profile,{recursive:true,force:true});
}

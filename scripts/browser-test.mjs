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
  assert.equal((await snap()).mode,'playing');assert.equal((await snap()).isaoModel,'isao_birudoron_lod1');assert.equal((await snap()).rotorClip,true);assert.equal((await snap()).cutisCount,8);assert.equal((await snap()).cutisType,'Cutis-Soft Ivory');assert.ok((await snap()).cameraDistance>2);await capture('02-third-person-isao');
  const start=await snap();await key('KeyW');await wait(600);await key('KeyW','keyUp');const moved=await snap();assert.ok(moved.position[2]<start.position[2]-.5,'keyboard flight');assert.ok(Math.abs(moved.position[1]-start.position[1])<.01,'W does not change altitude');
  await key('ShiftLeft');await wait(600);await key('ShiftLeft','keyUp');assert.ok((await snap()).position[1]<moved.position[1]-.5,'Shift descends');await evaluate('__below.advance(.8)');const low=await snap();await key('Space');await wait(650);await key('Space','keyUp');assert.ok((await snap()).position[1]>low.position[1]+.5,'Space climbs');
  await evaluate('__below.place(38);__below.look(0,-.55);__below.advance(.2)');await capture('03-cutis-ivory');
  await evaluate('__below.place(49);__below.look(0,0);__below.advance(.1)');assert.equal((await snap()).mission.lidarAvailable,false);
  await evaluate('__below.hit(2);__below.advance(.05)');assert.equal((await snap()).mission.cameraState,'recovering');await capture('04-camera-glitch');await evaluate('__below.advance(3.6)');assert.equal((await snap()).mission.cameraState,'working');
  await evaluate('__below.hit(2);__below.advance(.05)');assert.equal((await snap()).mission.cameraState,'failed');await capture('05-camera-failed');await evaluate('__below.advance(4.2)');assert.equal((await snap()).mission.lidarAvailable,true);
  await key('KeyQ');await key('KeyQ','keyUp');await wait(900);assert.equal((await snap()).mission.lidar,true);await capture('06-lidar-restores-view');
  for(const mode of [1,2,0]){await evaluate(`__below.selectView(${mode});__below.advance(.05)`);assert.equal((await snap()).mission.lidarMode,mode);}await evaluate('__below.selectView("optical")');assert.equal((await snap()).mission.lidar,true,'failed optics cannot be selected');
  await key('KeyF');await key('KeyF','keyUp');await evaluate('__below.advance(3)');assert.equal((await snap()).mission.flares,5);assert.equal((await snap()).flares.length,1);await capture('04-flare');
  await evaluate('__below.place(137);__below.look(0,-1.5);__below.advance(.1);__below.scan()');await wait(1400);await capture('05-vertical-shaft');
  await key('KeyF');await key('KeyF','keyUp');await evaluate('__below.advance(3)');const shaftFlare=(await snap()).flares[1];assert.ok(shaftFlare.position[1]>-100,'flare lodges in shaft instead of falling to chamber');
  await key('KeyP');const paused=await snap();await wait(200);assert.equal((await snap()).mission.time,paused.mission.time);assert.deepEqual((await snap()).flares,paused.flares);assert.equal(paused.mode,'paused');
  await key('KeyP','keyUp');await key('KeyP');await key('KeyP','keyUp');await wait(100);assert.equal((await snap()).mode,'playing');
  for(let i=0;i<5;i++){await key('KeyF');await key('KeyF','keyUp');}assert.equal((await snap()).mission.flares,0);assert.equal((await snap()).flares.length,6);
  await evaluate('__below.pose(43,-190,-38);__below.look(.6,-.36);__below.advance(.2);__below.scan()');await wait(1700);await capture('06-queen-chamber');
  const nursery=await snap();assert.equal(nursery.tunnelBranches,3);assert.equal(nursery.queenRoutes,2);assert.equal(nursery.gorogoroCount,3);assert.equal(nursery.reedCount,2);assert.equal(nursery.mission.nursery,true);assert.equal(nursery.eggs,1600);assert.equal(nursery.chamberWidth,180);assert.equal(nursery.queenScale,620);assert.equal(nursery.tentacles,38);
  assert.equal(await evaluate('document.getElementById("interaction").hidden'),true,'no proximity placement prompt');
  const laidBefore=nursery.laidEggs;await evaluate('__below.advance(8.2)');assert.ok((await snap()).laidEggs>laidBefore,'Queen keeps laying eggs');assert.notDeepEqual((await snap()).queenPosition,nursery.queenPosition,'Queen moves slowly');assert.notEqual((await snap()).queenRotation,nursery.queenRotation,'Queen turns');
  await evaluate('__below.pose(36,-239,-63);__below.look(.77,.03);__below.scan()');await wait(1300);await capture('07-egg-laying');
  await evaluate('__below.nearQueen()');const chosen=(await snap()).position;await key('KeyE');await evaluate('__below.advance(3.2)');await key('KeyE','keyUp');
  assert.equal((await snap()).mission.payload,false);assert.equal((await snap()).mission.bombPosition.x,chosen[0]);await capture('08-extraction');
  await evaluate('__below.pose(0,3,0);__below.advance(.1)');assert.equal((await snap()).mode,'surface');assert.equal((await snap()).mission.extracted,true);assert.equal((await snap()).mission.outcome,null);assert.equal((await snap()).detonationActive,false);await capture('09-surface-countdown');
  const remaining=(await snap()).mission.fuse;await evaluate(`__below.advance(${remaining+.08})`);assert.equal((await snap()).mode,'detonation');assert.equal((await snap()).mission.outcome,'rescued');await evaluate('__below.advance(1)');assert.ok(Math.abs((await snap()).groundDisplacement)>.001);await capture('10-ground-tremor');await evaluate('__below.advance(3)');assert.equal((await snap()).smokeVisible,true);assert.equal((await snap()).smokeParticles,3200);assert.equal((await snap()).smokeOriginDepth,15);await capture('11-venting-smoke');await evaluate('__below.advance(11)');assert.equal((await snap()).mode,'ended');
  await evaluate('__below.start()');await wait(150);assert.equal((await snap()).mission.flares,6);assert.equal((await snap()).flares.length,0);
  await evaluate('__below.pose(-39,-225,-98)');await key('KeyE');await evaluate('__below.advance(3.2)');await key('KeyE','keyUp');assert.equal((await snap()).mission.bombPosition.x,-39,'second placement point is accepted');
  await evaluate('__below.advance(66)');assert.equal((await snap()).mission.outcome,'sacrifice');assert.equal((await snap()).mode,'detonation');await evaluate('__below.advance(4)');assert.equal((await snap()).smokeVisible,true);await capture('12-sacrifice-blast');await evaluate('__below.advance(11)');assert.equal((await snap()).mode,'ended');
  await evaluate('__below.start()');await wait(150);await evaluate('__below.hurt(100);__below.advance(.1)');assert.equal((await snap()).mission.outcome,'lost');
  // Fly the whole route, including both elbows and a down/up traversal of the shaft.
  await evaluate('__below.start()');await wait(150);
  const flight=await evaluate(`(async()=>{
    const {center,ROUTE_END,distance,frameAt}=await import('./src/mission.js');
    const press=(code,type='keydown')=>document.dispatchEvent(new KeyboardEvent(type,{code}));
    let steps=0;const milestones=[];
    function go(goal,limit=140){
      let n=0;
      while(n++<limit&&__below.snapshot().mode==='playing'){
        const state=__below.snapshot(),a=state.position,p={x:a[0],y:a[1],z:a[2]};if(distance(p,goal)<1.3)break;
        const dx=goal.x-p.x,dy=goal.y-p.y,dz=goal.z-p.z,horizontal=Math.hypot(dx,dz);
        if(horizontal>1){__below.look(-Math.atan2(dx,-dz),-.45);press('KeyW');}else press('KeyW','keyup');
        press('Space',dy>.6?'keydown':'keyup');press('ShiftLeft',dy<-.6?'keydown':'keyup');__below.advance(.08);steps++;
        if(state.mission.lidarAvailable)__below.scan();
      }
      if(n>=limit)milestones.push({stuck:goal,state:__below.snapshot()});
    }
    go({x:0,y:1,z:0});go(center(0));
    for(let s=4;s<ROUTE_END;s+=4){const f=frameAt(s),p={...f.c};p.x+=f.u.x*1.5;p.y+=f.u.y*1.5;p.z+=f.u.z*1.5;go(p);if([44,96,148,196].includes(s))__below.dropFlare();}
    go(center(ROUTE_END));go({x:30,y:-175,z:-60});go({x:38,y:-205,z:-77});go({x:37,y:-219,z:-93});
    press('KeyW','keyup');press('ShiftLeft','keyup');press('Space','keyup');__below.advance(1);press('KeyE');__below.advance(3.2);press('KeyE','keyup');const planted=__below.snapshot();
    go({x:38,y:-205,z:-77});go({x:30,y:-175,z:-60});go({x:0,y:-164,z:-79});go(center(ROUTE_END));
    for(let s=ROUTE_END-4;s>0;s-=4){const f=frameAt(s),p={...f.c};p.x+=f.u.x*1.5;p.y+=f.u.y*1.5;p.z+=f.u.z*1.5;go(p);}
    go(center(0));go({x:0,y:4,z:0});press('KeyW','keyup');press('ShiftLeft','keyup');press('Space','keyup');return {planted,finished:__below.snapshot(),steps,milestones};
  })()`);
  await writeFile(new URL('../artifacts/flight-report.json',import.meta.url),JSON.stringify(flight,null,2));
  assert.equal(flight.planted.mission.payload,false,'complete flight reaches Queen');
  assert.equal(flight.finished.mission.extracted,true,'complete flight returns up the shaft');assert.ok(flight.finished.mission.fuse>0&&flight.finished.mission.fuse<30,'return is possible with a tight margin');
  await evaluate(`__below.advance(${flight.finished.mission.fuse+15})`);assert.equal((await snap()).mission.outcome,'rescued');assert.equal((await snap()).mode,'ended');
  await evaluate('__below.start()');await wait(150);
  const branches=await evaluate(`(async()=>{
    const {branchCenter,BRANCHES,center,distance}=await import('./src/mission.js');
    const press=(code,type='keydown')=>document.dispatchEvent(new KeyboardEvent(type,{code}));
    const stuck=[];
    function go(goal){let n=0;while(n++<180&&__below.snapshot().mode==='playing'){
      const state=__below.snapshot(),a=state.position,p={x:a[0],y:a[1],z:a[2]};if(distance(p,goal)<1.3)break;
      const dx=goal.x-p.x,dy=goal.y-p.y,dz=goal.z-p.z;
      if(Math.hypot(dx,dz)>1){__below.look(-Math.atan2(dx,-dz),-.35);press('KeyW');}else press('KeyW','keyup');
      press('Space',dy>.6?'keydown':'keyup');press('ShiftLeft',dy<-.6?'keydown':'keyup');__below.advance(.08);
      if(state.mission.lidarAvailable)__below.scan();
    }if(n>=180)stuck.push({goal,state:__below.snapshot()});}
    function stop(){for(const code of ['KeyW','Space','ShiftLeft'])press(code,'keyup');}
    __below.pose(0,-33.2,-36);
    const blind=BRANCHES.find(b=>b.id==='blind'),left=BRANCHES.find(b=>b.id==='left');
    for(let s=0;s<blind.length;s+=3)go(branchCenter('blind',s));go(branchCenter('blind',blind.length));stop();const deadEnd=__below.snapshot();
    for(let s=blind.length-3;s>0;s-=3)go(branchCenter('blind',s));go(center(48));stop();
    // Reset damage between independent branch traversals; begin at the shared junction.
    __below.start();__below.pose(0,-33.2,-36);
    for(let s=0;s<left.length;s+=3)go(branchCenter('left',s));go(branchCenter('left',left.length));
    go({x:-38,y:-204,z:-93});go({x:-39,y:-219,z:-98});stop();__below.advance(1);press('KeyE');__below.advance(3.2);press('KeyE','keyup');const planted=__below.snapshot();
    go({x:-38,y:-204,z:-93});go(branchCenter('left',left.length));
    for(let s=left.length-3;s>0;s-=3)go(branchCenter('left',s));go(center(48));
    for(let s=44;s>=0;s-=4)go(center(s));go({x:0,y:4,z:0});stop();return {deadEnd,planted,finished:__below.snapshot(),stuck};
  })()`);
  await writeFile(new URL('../artifacts/branch-report.json',import.meta.url),JSON.stringify(branches,null,2));
  assert.deepEqual(branches.stuck,[],'branch portals permit physical flight');
  assert.equal(branches.deadEnd.mission.deadEndSeen,true,'third tunnel terminates without a Queen');
  assert.equal(branches.deadEnd.mission.nursery,false,'blind route does not reach chamber');
  assert.equal(branches.planted.mission.payload,false,'second route reaches Queen');
  assert.equal(branches.finished.mission.extracted,true,'second route permits a timed return');
  assert.ok(branches.finished.mission.fuse>0,'second route fits fuse');
  assert.deepEqual(errors,[],'no browser/WebGL errors');
  const report={result:'PASS',checks:['third-person ISAO model and rotors','yaw-relative WASD','Shift down / Space up','8 Ivory, 3 native Gorogoro, 2 Reed','slow Queen movement','65-second fuse','countdown continues after escape','ground tremor / 3200 smoke puffs from inside sinkhole','Stalheart sinkhole','keyboard flight','two impact camera failures / three LiDAR modes','38 longer tentacles','six persistent flares','pause freezes flares','vertical shaft','180 m chamber / 1600 eggs','egg laying','no placement marker','two free bomb positions','all endings','restart restocks flares','continuous return flight','console clean'],flight,branches,snapshot:await snap(),errors};
  await writeFile(new URL('../artifacts/browser-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify({result:report.result,checks:report.checks,returnMargin:flight.finished.mission.fuse,secondRouteMargin:branches.finished.mission.fuse,hull:flight.finished.mission.integrity,milestones:flight.milestones,errors},null,2));
}finally{
  ws?.close();chrome.kill();await new Promise(r=>server.close(r));await rm(profile,{recursive:true,force:true});
}

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
const chrome=launchChrome(['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--window-size=1440,960','--autoplay-policy=no-user-gesture-required','--no-first-run'],{watchdogMs:600000});
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
  if(!process.env.BELOW_ROUTE_ONLY){
  const start=await snap();await key('KeyW');await wait(600);await key('KeyW','keyUp');const moved=await snap();assert.ok(moved.position[2]<start.position[2]-.5,'keyboard flight');assert.ok(Math.abs(moved.position[1]-start.position[1])<.01,'W does not change altitude');
  await key('ShiftLeft');await wait(600);await key('ShiftLeft','keyUp');assert.ok((await snap()).position[1]<moved.position[1]-.5,'Shift descends');await evaluate('__below.advance(.8)');const low=await snap();await key('Space');await wait(650);await key('Space','keyUp');assert.ok((await snap()).position[1]>low.position[1]+.5,'Space climbs');
  await evaluate('__below.place(38);__below.look(0,-.55);__below.advance(.2)');await capture('03-cutis-ivory');
  await evaluate('__below.start();__below.pose(0,8,0);__below.advance(.05)');
  assert.equal((await snap()).mission.integrity,12);assert.ok((await snap()).lampIntensity>0);
  await evaluate('__below.hit();__below.advance(.05)');assert.equal((await snap()).mission.integrity,11);assert.equal((await snap()).mission.lampState,'recovering');assert.equal((await snap()).lampIntensity,0);await capture('04-lamp-flicker');
  await evaluate('__below.advance(3.6)');assert.equal((await snap()).mission.lampState,'working');assert.ok((await snap()).lampIntensity>0);
  await evaluate('__below.hit();__below.advance(.05)');assert.equal((await snap()).mission.integrity,10);assert.equal((await snap()).mission.lampState,'failed');await evaluate('__below.advance(4.2)');assert.equal((await snap()).mission.lidarAvailable,false);
  await evaluate('__below.place(49);__below.look(0,-.2)');await capture('05-light-failed');
  await key('KeyF');await key('KeyF','keyUp');await evaluate('__below.advance(3)');assert.equal((await snap()).mission.flares,9);assert.equal((await snap()).flares.length,1);await capture('04-flare');
  await key('KeyQ');await key('KeyQ','keyUp');assert.equal((await snap()).mission.lidar,false,'LiDAR remains locked before halfway');
  await evaluate('__below.place(155);__below.advance(4.3)');assert.equal((await snap()).mission.lidarAvailable,true);
  await key('KeyQ');await key('KeyQ','keyUp');await wait(900);assert.equal((await snap()).mission.lidar,true);await capture('06-lidar-restores-view');
  for(const mode of [1,2,0]){await evaluate(`__below.selectView(${mode});__below.advance(.05)`);assert.equal((await snap()).mission.lidarMode,mode);}await evaluate('__below.selectView("optical")');assert.equal((await snap()).mission.lidar,false,'optics still see flares after lamp failure');await evaluate('__below.selectView(0)');
  await evaluate('__below.place(137);__below.look(0,-1.5);__below.advance(.1);__below.scan()');await wait(1400);await capture('05-vertical-shaft');
  await key('KeyF');await key('KeyF','keyUp');await evaluate('__below.advance(3)');const shaftFlare=(await snap()).flares[1];assert.ok(shaftFlare.position[1]<-110,'flare accelerates down the shaft under gravity');assert.ok(shaftFlare.velocity[1]<-20,'flare does not attach to shaft wall');
  await key('KeyP');const paused=await snap();await wait(200);assert.equal((await snap()).mission.time,paused.mission.time);assert.deepEqual((await snap()).flares,paused.flares);assert.equal(paused.mode,'paused');
  await key('KeyP','keyUp');await key('KeyP');await key('KeyP','keyUp');await wait(100);assert.equal((await snap()).mode,'playing');
  for(let i=0;i<9;i++){await key('KeyF');await key('KeyF','keyUp');}assert.equal((await snap()).mission.flares,0);assert.equal((await snap()).flares.length,10);
  await evaluate('__below.pose(43,-190,-38);__below.look(.6,-.36);__below.advance(.2);__below.scan()');await wait(1700);await capture('06-queen-chamber');
  const nursery=await snap();assert.equal(nursery.tunnelBranches,3);assert.equal(nursery.queenRoutes,2);assert.equal(nursery.gorogoroCount,5);assert.equal(nursery.reedCount,4);assert.equal(nursery.mission.nursery,true);assert.equal(nursery.eggs,1600);assert.equal(nursery.chamberWidth,180);assert.equal(nursery.queenScale,620);assert.equal(nursery.tentacles,64);
  assert.equal(await evaluate('document.getElementById("interaction").hidden'),true,'no proximity placement prompt');
  await evaluate('__below.pause();document.getElementById("pause").hidden=true;__below.surveyFrame(0)');await capture('wave-00-emission');
  await evaluate('__below.surveyFrame(.65)');await capture('wave-01-near');
  await evaluate('__below.surveyFrame(1.7)');await capture('wave-02-chamber');await evaluate('__below.resume()');
  const laidBefore=nursery.laidEggs;await evaluate('__below.advance(8.2)');assert.ok((await snap()).laidEggs>laidBefore,'Queen keeps laying eggs');assert.notDeepEqual((await snap()).queenPosition,nursery.queenPosition,'Queen moves slowly');assert.notEqual((await snap()).queenRotation,nursery.queenRotation,'Queen turns');
  await evaluate('__below.pose(36,-239,-63);__below.look(.77,.03);__below.scan()');await wait(1300);await capture('07-egg-laying');
  await evaluate('__below.nearQueen()');const chosen=(await snap()).position;await key('KeyE');await evaluate('__below.advance(3.2)');await key('KeyE','keyUp');
  assert.equal((await snap()).mission.payload,false);assert.equal((await snap()).mission.bombPosition.x,chosen[0]);await capture('08-extraction');
  await evaluate('__below.pose(0,3,0);__below.advance(.1)');assert.equal((await snap()).mode,'surface');assert.equal((await snap()).mission.extracted,true);assert.equal((await snap()).mission.outcome,null);assert.equal((await snap()).detonationActive,false);await capture('09-surface-countdown');
  const remaining=(await snap()).mission.fuse;await evaluate(`__below.advance(${remaining-4.1})`);assert.equal((await snap()).audio.countdownPlays,1);assert.ok((await snap()).audio.countdownLoaded);assert.ok((await snap()).audio.countdownOffset<.1);await key('KeyP');assert.equal((await snap()).audio.paused,true);await key('KeyP','keyUp');await key('KeyP');await key('KeyP','keyUp');assert.equal((await snap()).audio.paused,false);await evaluate('__below.advance(4.18)');assert.equal((await snap()).mode,'detonation');assert.equal((await snap()).mission.outcome,'rescued');assert.equal((await snap()).smokeLaunchSpeed,1400);assert.equal((await snap()).smokeReleaseWindow,.32);await capture('10-blast-onset');await evaluate('__below.advance(1)');assert.ok(Math.abs((await snap()).groundDisplacement)>.001);await capture('10-ground-tremor');await evaluate('__below.advance(3)');assert.equal((await snap()).smokeVisible,true);assert.equal((await snap()).smokeParticles,3200);assert.ok(Math.abs((await snap()).smokeOriginDepth-25.2)<.001);await capture('11-venting-smoke');await evaluate('__below.advance(11)');assert.equal((await snap()).mode,'ended');
  await evaluate('__below.start()');await wait(150);assert.equal((await snap()).mission.flares,10);assert.equal((await snap()).flares.length,0);
  await evaluate('__below.pose(-39,-225,-98)');await key('KeyE');await evaluate('__below.advance(3.2)');await key('KeyE','keyUp');assert.equal((await snap()).mission.bombPosition.x,-39,'second placement point is accepted');
  await evaluate('__below.advance(66)');assert.equal((await snap()).mission.outcome,'sacrifice');assert.equal((await snap()).mode,'detonation');await evaluate('__below.advance(4)');assert.equal((await snap()).smokeVisible,true);await capture('12-sacrifice-blast');await evaluate('__below.advance(11)');assert.equal((await snap()).mode,'ended');
  await evaluate('__below.start()');await wait(150);await evaluate('__below.hurt(100);__below.advance(.1)');assert.equal((await snap()).mission.outcome,'lost');
  for(const kind of ['wall','tentacle','enemy','egg','queen']){
    await evaluate('__below.start();__below.advance(.1)');
    await evaluate(kind==='wall'?'__below.pose(60,-33.2,-36);__below.advance(.05)':`(()=>{const p=__below.contactSamples()[${JSON.stringify(kind)}];__below.pose(...p);__below.advance(.05)})()`);
    const state=await snap();assert.equal(state.mission.integrity,11,`${kind} contact costs exactly one HP`);assert.equal(state.mission.lampState,'recovering',`${kind} contact damages lamp`);assert.equal(state.mission.lastContact,kind==='enemy'?'gorogoro':kind,`${kind} uses actual collision geometry`);
  }
  }
  // Fly the whole route, including both elbows and a down/up traversal of the shaft.
  await evaluate('__below.start()');await wait(150);
  const flight=await evaluate(`(async()=>{
    const {center,ROUTE_END,distance,frameAt,smooth}=await import('./src/mission.js');
    const press=(code,type='keydown')=>document.dispatchEvent(new KeyboardEvent(type,{code}));
    let steps=0;const milestones=[];
    // Fly above the bulk of the reaching appendages, staying inside the same tunnel.
    function lane(s){const f=frameAt(s),offset=-5*smooth(0,18,s);return {x:f.c.x+f.v.x*offset,y:f.c.y+f.v.y*offset,z:f.c.z+f.v.z*offset};}
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
    for(let s=4;s<ROUTE_END;s+=4){go(lane(s));if([44,96,148,196].includes(s))__below.dropFlare();}
    go(center(ROUTE_END));go({x:30,y:-175,z:-60});go({x:38,y:-205,z:-77});go({x:37,y:-219,z:-93});
    press('KeyW','keyup');press('ShiftLeft','keyup');press('Space','keyup');__below.advance(1);press('KeyE');__below.advance(3.2);press('KeyE','keyup');const planted=__below.snapshot();
    go({x:38,y:-205,z:-77});go({x:30,y:-175,z:-60});go({x:0,y:-164,z:-79});go(center(ROUTE_END));
    for(let s=ROUTE_END-4;s>0;s-=4){go(lane(s));}
    go(center(0));go({x:0,y:4,z:0});press('KeyW','keyup');press('ShiftLeft','keyup');press('Space','keyup');return {planted,finished:__below.snapshot(),steps,milestones};
  })()`);
  console.log('Main route completed');await writeFile(new URL('../artifacts/flight-report.json',import.meta.url),JSON.stringify(flight,null,2));
  assert.equal(flight.planted.mission.payload,false,'complete flight reaches Queen');
  assert.equal(flight.finished.mission.extracted,true,'complete flight returns up the shaft');assert.ok(flight.finished.mission.fuse>0&&flight.finished.mission.fuse<30,'return is possible with a tight margin');
  await evaluate(`__below.advance(${flight.finished.mission.fuse+15})`);assert.equal((await snap()).mission.outcome,'rescued');assert.equal((await snap()).mode,'ended');
  await evaluate('__below.start()');await wait(150);
  const branches=await evaluate(`(async()=>{
    const {branchCenter,BRANCHES,center,distance,frameAt,smooth}=await import('./src/mission.js');
    const press=(code,type='keydown')=>document.dispatchEvent(new KeyboardEvent(type,{code}));
    const stuck=[];
    function lane(s,branch){const f=frameAt(s,branch),offset=-4.5;return {x:f.c.x+f.v.x*offset,y:f.c.y+f.v.y*offset,z:f.c.z+f.v.z*offset};}
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
    for(let s=0;s<blind.length;s+=3)go(lane(s,'blind'));go(branchCenter('blind',blind.length));stop();const deadEnd=__below.snapshot();
    for(let s=blind.length-3;s>0;s-=3)go(lane(s,'blind'));go(center(48));stop();
    // Reset damage between independent branch traversals; begin at the shared junction.
    __below.start();__below.pose(0,-33.2,-36);
    for(let s=0;s<left.length;s+=3)go(lane(s,'left'));go(branchCenter('left',left.length));
    go({x:-38,y:-204,z:-93});go({x:-39,y:-219,z:-98});stop();__below.advance(1);press('KeyE');__below.advance(3.2);press('KeyE','keyup');const planted=__below.snapshot();
    go({x:-38,y:-204,z:-93});go(branchCenter('left',left.length));
    for(let s=left.length-3;s>0;s-=3)go(lane(s,'left'));go(center(48));
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
  const report={result:'PASS',suite:process.env.BELOW_ROUTE_ONLY?'routes':'full',checks:['third-person ISAO model and rotors','yaw-relative WASD','Shift down / Space up','12 Ivory, 5 native Gorogoro, 4 Reed','slow Queen movement','65-second fuse','countdown continues after escape','ground tremor / 3200 smoke puffs from inside sinkhole','Stalheart sinkhole','keyboard flight','12 HP / two lamp failures / three dim LiDAR modes','64 faster tentacles','ten gravity-driven flares','pause freezes flares','vertical shaft','180 m chamber / 1600 eggs','egg laying','no placement marker','two free bomb positions','all endings','restart restocks flares','continuous return flight','console clean'],flight,branches,snapshot:await snap(),errors};
  await writeFile(new URL('../artifacts/browser-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify({result:report.result,checks:report.checks,returnMargin:flight.finished.mission.fuse,secondRouteMargin:branches.finished.mission.fuse,hull:flight.finished.mission.integrity,milestones:flight.milestones,errors},null,2));
}finally{
  ws?.close();chrome.kill();await new Promise(r=>server.close(r));await rm(profile,{recursive:true,force:true});
}

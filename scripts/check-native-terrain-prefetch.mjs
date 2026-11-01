// Real stream policies/manifests, deterministic preparation delays; not device FPS.
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createRequire} from 'node:module';import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'native-terrain-')),originalNow=Date.now;
let clock=100000;Date.now=()=>clock;
const tick=async()=>{for(let i=0;i<30;i++)await Promise.resolve()};
try{
 await build({stdin:{contents:"export * from './src/road-art-stream';export * from './src/terrain-art-streams';export * from './src/east-approach';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'stream.cjs'),logLevel:'error'});
 const m=createRequire(import.meta.url)(path.join(temp,'stream.cjs')),s=m.EAST_TERRAIN_SCALE;
 const patches=Array.from({length:60},(_,i)=>({key:'tile'+i,x:600+i*400/s,y:600,width:400/s,height:400/s,bytes:1048576}));
 const run=async native=>{
  clock=100000;let jobs=[],calls=[],released=[],missingMs=0;
  const stream=new m.RoadArtStream((sources,priority)=>new Promise(resolve=>{const key=Object.keys(sources)[0];calls.push({key,at:clock,priority});jobs.push({key,resolve,at:clock+1600})}),keys=>released.push(...keys),{patches,sources:Object.fromEntries(patches.map(p=>[p.key,p.key])),maxBytes:16*1048576,policy:native?m.NATIVE_TERRAIN_STREAM_POLICY:undefined},undefined,undefined);
  // No promotion callback needed in this fixture: delays represent indivisible preparation.
  const update=x=>stream.update({x,y:0,width:500,height:300},1,clock);
  update(0);let settled=false;const boot=stream.settled().then(()=>settled=true);await tick();assert(!settled);
  for(let i=0;i<300&&!settled;i++){clock+=50;for(const j of jobs.filter(j=>j.at<=clock))j.resolve();jobs=jobs.filter(j=>j.at>clock);await tick()}
  await boot;assert.equal(stream.visibleMissing,0);assert.equal(stream.pendingCount,0);const bootCount=calls.length;
  // 441.75 world units/second: actual unencumbered sprint speed.
  const start=clock;for(let ms=0;ms<=16000;ms+=50){clock=start+ms;for(const j of jobs.filter(j=>j.at<=clock))j.resolve();jobs=jobs.filter(j=>j.at>clock);await tick();update(ms*.44175);missingMs+=stream.visibleMissing*50;const stats=stream.stats();assert(stats.bytes<=stats.budgetBytes);assert(stats.pending<=2)}
  const lead=stream.stats().leadWorldUnits;
  // A teleport or zoom must not extrapolate a giant direction vector.
  clock+=200;update(100000);assert.equal(stream.stats().leadWorldUnits,0);
  stream.dispose();for(const j of jobs)j.resolve();await tick();assert.equal(stream.residentCount,0);
  return {bootCount,missingMs,lead,requests:calls.length};
 };
 const before=await run(false),after=await run(true);assert(after.bootCount>before.bootCount,'Wider prepared startup buffer');assert(after.lead>before.lead*1.9);assert(after.missingMs<=before.missingMs);
 // Native residency survives small reversals for four seconds, but never
 // prevents an unprepared visible tile from taking priority.
 clock=180000;let residencyCalls=[],residencyJobs=[];
 const residentPatches=[0,500,-600].map((x,i)=>({key:'r'+i,x:600+x/s,y:600,width:100/s,height:100/s,bytes:1}));
 const resident=new m.RoadArtStream(src=>new Promise(resolve=>{residencyCalls.push(Object.keys(src)[0]);residencyJobs.push(resolve)}),()=>{}, {patches:residentPatches,sources:Object.fromEntries(residentPatches.map(p=>[p.key,p.key])),maxBytes:2,policy:m.NATIVE_TERRAIN_STREAM_POLICY});
 const shift=x=>resident.update({x,y:0,width:100,height:100},1,clock);
 shift(0);for(const resolve of residencyJobs.splice(0))resolve();await resident.settled();assert.equal(residencyCalls.length,2);
 clock+=3500;shift(-150);assert.equal(residencyCalls.length,2,'Recently prepared offscreen detail survives reversal');
 clock+=200;shift(-600);assert(residencyCalls.includes('r2'),'Visible demand overrides the residency grace');for(const resolve of residencyJobs.splice(0))resolve();await resident.settled();assert.equal(resident.visibleMissing,0);resident.dispose();
 // Startup failure and completion traces: actual request pipeline, bounded retry.
 let jobs=[],events=[];clock=200000;
 const stream=new m.RoadArtStream(src=>new Promise((resolve,reject)=>jobs.push({key:Object.keys(src)[0],resolve,reject})),()=>{}, {patches:patches.slice(0,4),sources:Object.fromEntries(patches.map(p=>[p.key,p.key])),maxBytes:8*1048576,policy:m.NATIVE_TERRAIN_STREAM_POLICY},undefined,{recording:true,session:1,trace:(at,stage,ms,detail)=>events.push({stage,detail})});
 stream.update({x:0,y:0,width:500,height:300},1,clock);const drain=stream.settled();await tick();assert(events.some(e=>e.stage==='stream-visible-miss'));
 clock+=700;for(const job of jobs.splice(0))job.key==='tile0'?job.reject(Error('fixture failed')):job.resolve();await tick();for(const job of jobs.splice(0))job.resolve();await tick();await drain;assert.equal(stream.visibleMissing,1,'Failure settles rather than hanging or claiming complete');assert(events.some(e=>e.stage==='stream-ready'&&e.detail.visibleWaitMs===700));stream.dispose();
 // Actual production manifests over a recorded route, with rapid reversals and
 // zoom transitions. Check native budgets, visible coverage after settle, and
 // no re-request on an unchanged view after startup.
 const fixture=JSON.parse(fs.readFileSync('scripts/fixtures/terrain-churn-route.json','utf8'));
 let requests=0;const streams=m.createTerrainArtStreams(async()=>{requests++},()=>{},undefined,undefined,'native');
 let peak=0;for(const [i,p] of fixture.positions.entries()){
  const ppu=i%11===0?.3:1.5,view={x:p[1]-844/ppu,y:p[2]-390/ppu,width:1688/ppu,height:780/ppu};clock+=200;
  for(const name of ['roads','camp','rivers'])streams[name].update(view,ppu,clock);
  await streams.settled();
  for(const name of ['roads','camp','rivers']){const st=streams[name].stats();assert.equal(st.missing,0);assert(st.bytes<=st.budgetBytes);peak=Math.max(peak,st.bytes)}
 }
 streams.dispose();
 const failed=m.createTerrainArtStreams(async()=>{throw Error('decode failed')},()=>{},undefined,undefined,'native');
 failed.camp.update({x:0,y:0,width:1000,height:500},2,clock+=200);
 await assert.rejects(failed.settled(),/Nearby terrain detail/);failed.dispose();
 console.log(JSON.stringify({passed:true,syntheticSprint:{before,after,delayMs:1600},manifestPositions:fixture.positions.length,manifestRequests:requests,peakLayerMiB:peak/1048576,scope:'Host policy/lifecycle checks, not physical iPhone FPS or GPU residency.'},null,2));
}finally{Date.now=originalNow;fs.rmSync(temp,{recursive:true,force:true})}

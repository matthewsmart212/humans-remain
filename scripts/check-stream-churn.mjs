import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'stream-churn-')),realNow=Date.now;
let clock=1000000;Date.now=()=>clock;
const settle=async()=>{for(let i=0;i<20;i++)await Promise.resolve()};
try{
 const contents="export * from './src/road-art-stream';export * from './src/terrain-art-streams';export * from './src/east-approach';";
 const bundle=async(name,source)=>{const outfile=path.join(temp,name+'.cjs');await build({stdin:{contents,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile,plugins:source?[{name:'baseline-stream',setup(b){b.onLoad({filter:/\/road-art-stream\.ts$/},()=>({contents:source,loader:'ts',resolveDir:path.resolve('src')}))}}]:[]});return createRequire(import.meta.url)(outfile)};
 const m=await bundle('current'),s=m.EAST_TERRAIN_SCALE;
 const patch=(key,x,bytes=1)=>({key,x:600+x/s,y:600,width:100/s,height:100/s,bytes});
 const setup=(patches,maxBytes)=>{
  const jobs=[],calls=[],released=[];
  const stream=new m.RoadArtStream((sources,priority)=>new Promise(resolve=>{const key=Object.keys(sources)[0];calls.push({key,priority,at:clock});jobs.push({key,resolve})}),keys=>released.push(...keys),{patches,sources:Object.fromEntries(patches.map(p=>[p.key,'/'+p.key])),maxBytes});
  const update=(x,delta=200)=>{clock+=delta;stream.update({x,y:0,width:100,height:100},1,clock)};
  const finish=async key=>{const i=jobs.findIndex(j=>j.key===key);assert(i>=0,'Expected pending '+key);jobs.splice(i,1)[0].resolve();await settle()};
  return {stream,jobs,calls,released,update,finish};
 };
 const a=setup([patch('a',0),patch('b',500),patch('c',-600)],2);
 a.update(0);await a.finish('a');await a.finish('b');const initial=a.calls.length;
 for(let i=0;i<5;i++){a.update(i%2?-1:-50);await settle()}
 assert.equal(a.calls.length,initial,'Small reversals cannot replace recently prepared offscreen tiles');
 a.update(-600);assert(a.calls.some(c=>c.key==='c'&&c.priority==='foreground'),'Visible terrain bypasses retention');await a.finish('c');assert.equal(a.stream.visibleMissing,0);
 const evicted=a.released.at(-1),evictedX=evicted==='a'?0:500;
 a.update(evictedX);assert(a.calls.filter(c=>c.key===evicted).length===2,'Visible terrain bypasses reload cooldown');await a.finish(evicted);assert.equal(a.stream.visibleMissing,0);a.stream.dispose();
 const cooldown=setup([patch('a',0),patch('b',500),patch('c',-600)],2);
 cooldown.update(0);await cooldown.finish('a');await cooldown.finish('b');cooldown.update(-150,2000);await cooldown.finish('c');assert(cooldown.released.includes('b'));
 cooldown.update(50,1600);assert.equal(cooldown.calls.filter(c=>c.key==='b').length,1,'Background reload stays deferred after residency grace but before cooldown expires');
 cooldown.update(50,600);assert.equal(cooldown.calls.filter(c=>c.key==='b').length,2,'Background prefetch resumes after cooldown');assert.equal(cooldown.calls.at(-1).priority,'background');await cooldown.finish('b');cooldown.stream.dispose();
 const b=setup([patch('a',0,1),patch('b',500,2),patch('c',1400,3)],3);
 b.update(0);await b.finish('a');b.update(1400);
 assert.equal(b.released.length,0,'No partial eviction when pending bytes still prevent a load');assert(!b.calls.some(c=>c.key==='c'));
 await b.finish('b');assert(b.calls.some(c=>c.key==='c'));await b.finish('c');assert.equal(b.stream.visibleMissing,0);assert(b.stream.residentBytes+b.stream.pendingBytes<=3);b.stream.dispose();
 const atomic=setup([patch('a',0),patch('b',500)],2);atomic.update(0);
 for(const job of atomic.jobs.splice(0))job.resolve();
 for(let i=0;i<20;i++){await Promise.resolve();assert(atomic.stream.residentBytes+atomic.stream.pendingBytes<=2,'Completion must not double-count resident and pending bytes')}
 atomic.stream.dispose();
 const fixture=JSON.parse(fs.readFileSync('scripts/fixtures/terrain-churn-route.json','utf8'));
 // Deterministic scheduler comparison only: interpolate 1 Hz positions, assume
 // 100 ms loads, three shared downloads, and sample the real stream at 50 ms.
 // This cannot estimate GPU/display FPS or reproduce the original network.
 const replay=async api=>{
  clock=2000000;const origin=clock,points=fixture.positions,first=points[0][0],last=points.at(-1)[0];
  const queued=[],active=[],loadedAt=new Map(),requests=[];let releases=0,quickReloads=0,missingChunkMs=0,peakMiB=0;
  const pump=()=>{while(active.length<3&&queued.length){const i=queued.findIndex(j=>j.priority==='foreground'),job=queued.splice(i<0?0:i,1)[0];active.push({...job,due:clock+100})}};
  const streams=api.createTerrainArtStreams((sources,priority)=>new Promise(resolve=>{const key=Object.keys(sources)[0];if(loadedAt.has(key)&&clock-loadedAt.get(key)<2000)quickReloads++;loadedAt.set(key,clock);requests.push(key);queued.push({key,priority,resolve});pump()}),keys=>{releases+=keys.length},keys=>{for(const job of queued)if(keys.includes(job.key))job.priority='foreground'});
  const scale=Math.max(fixture.buffer[0]/1800,fixture.buffer[1]/900)*fixture.zoom,width=fixture.buffer[0]/scale,height=fixture.buffer[1]/scale;
  let index=0;
  for(let at=first;at<=last;at+=50){
   clock=origin+at-first;
   for(let i=active.length-1;i>=0;i--)if(active[i].due<=clock)active.splice(i,1)[0].resolve();await settle();pump();
   while(index+1<points.length-1&&points[index+1][0]<=at)index++;
   const p=points[index],q=points[index+1],mix=Math.min(1,(at-p[0])/(q[0]-p[0])),x=p[1]+(q[1]-p[1])*mix,y=p[2]+(q[2]-p[2])*mix,view={x:x-width/2,y:y-height*.53,width,height};
   for(const layer of ['roads','camp','rivers']){const stream=streams[layer];stream.update(view,scale,clock);const stats=stream.stats(clock);assert(stats.bytes<=stats.budgetBytes,'Actual manifest byte budget');assert(stats.pending<=2);if(at-first>1000)missingChunkMs+=stats.missing*50;peakMiB=Math.max(peakMiB,stats.bytes/1048576)}
  }
  const stats=Object.fromEntries(['roads','camp','rivers'].map(layer=>[layer,streams[layer].stats(clock)]));streams.dispose();
  for(const job of [...active,...queued])job.resolve();active.length=0;queued.length=0;await settle();
  return {requests:requests.length,uniqueTiles:new Set(requests).size,releases,quickReloads,missingChunkMs,peakLayerMiB:+peakMiB.toFixed(2),failures:Object.values(stats).reduce((n,s)=>n+s.failures,0)};
 };
 const current=await replay(m);assert.equal(current.failures,0);
 let baseline;
 const arg=process.argv.indexOf('--compare-ref');if(arg>=0){const ref=process.argv[arg+1];assert.match(ref,/^[a-f0-9]{40}$/);const source=execFileSync('git',['show',ref+':src/road-art-stream.ts'],{encoding:'utf8'});baseline=await replay(await bundle('baseline',source));assert(current.requests<baseline.requests,'Fewer loads along the supplied route');assert(current.quickReloads<baseline.quickReloads,'Fewer rapid repeat loads');assert(current.missingChunkMs<=baseline.missingChunkMs,'No extra missing visible detail in this replay')}
 console.log(JSON.stringify({passed:true,checks:['recent offscreen residency','foreground bypass of residency and cooldown','atomic pending/resident accounting','no partial futile evictions','actual terrain manifest budgets and shared download queue'],replay:{baseline,current,scope:'Scheduler simulation of a recorded route with interpolated positions and fixed network latency; not a phone FPS benchmark.'}},null,2));
}finally{Date.now=realNow;fs.rmSync(temp,{recursive:true,force:true})}

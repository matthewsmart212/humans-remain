import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'performance-v2-'));
const originalObserver=globalThis.PerformanceObserver;
try{
 await build({stdin:{contents:"export * from './src/performance-recording';export * from './src/browser-performance';export * from './src/road-art-stream';export * from './src/east-approach';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'check.cjs')});
 const m=createRequire(import.meta.url)(path.join(temp,'check.cjs')),r=new m.GamePerformanceRecorder();
 const frame=(at,draw=2,phases={})=>{assert(r.beginFrame(at,'playing'));for(const [name,ms]of Object.entries(phases))r.phase(name,ms);r.endFrame(1,draw,1)};
 r.start(0,{});frame(0);frame(16);frame(32,146,{textureDrawMs:100,textureFlushMs:40,worldDrawMs:6,shaderBuildMs:2});frame(199);
 r.setActivity('paused',200);frame(10000,150,{worldDrawMs:150});frame(10160);r.stop(10161);
 const report=JSON.parse(r.exportJson());assert.equal(report.schema,'safety-last-performance/v2');assert.equal(report.renderPhases.length,report.frames.length);
 const hitch=report.slowFrames.find(s=>s.frameMs===167);assert.equal(hitch.previous.elapsedMs,32);assert.equal(hitch.previous.phases.textureDrawMs,100);assert.equal(hitch.previous.phases.textureFlushMs,40);assert.equal(hitch.current.renderCpuMs,2);
 assert.equal(report.slowFrames.find(s=>s.frameMs===160).previous,null,'Never attribute to an unrelated frame before pause/resume');
 assert.equal(report.phaseSummary.textureDrawMs.maxMs,100);assert.equal(report.phaseSummary.shaderBuildMs.maxMs,2);assert.match(report.diagnostics.phaseTiming,/nested/);
 assert.equal(r.bufferBytes,6840000);
 const old=r.session;r.start(20000,{});r.trace(20001,'stale',1,{},old);
 for(let i=0;i<m.PERFORMANCE_TRACE_LIMIT+17;i++)r.trace(20000+i,'test',1,{index:i});
 r.stop(23000);const ring=JSON.parse(r.exportJson());assert.equal(ring.traceEvents.length,m.PERFORMANCE_TRACE_LIMIT);assert.equal(ring.traceEvents[0].detail.index,17);assert.equal(ring.traceEvents.at(-1).detail.index,m.PERFORMANCE_TRACE_LIMIT+16);assert.equal(ring.diagnostics.traceEventsDropped,17);assert(!ring.traceEvents.some(e=>e.stage==='stale'));
 r.start(30000,{});for(let i=0;i<500;i++)frame(30000+i*40,20,{worldDrawMs:20});r.stop(50000);const capped=JSON.parse(r.exportJson());assert.equal(capped.slowFrames.length,128);assert.equal(capped.diagnostics.slowFramesOmitted,371);
 const zero=new m.GamePerformanceRecorder();zero.phase('worldDrawMs',100);zero.trace(0,'off');assert.equal(zero.bufferBytes,0);zero.setOverlay(true);zero.beginFrame(0,'playing');assert.equal(zero.tracing,false);assert.equal(zero.bufferBytes,0);
 // Observers/listeners exist only during recording; no URL/script attribution.
 const observers=[],listeners=new Map();
 globalThis.PerformanceObserver=class{static supportedEntryTypes=['longtask','long-animation-frame'];constructor(callback){this.callback=callback;this.disconnected=false;observers.push(this)}observe(options){assert.equal(options.buffered,false)}disconnect(){this.disconnected=true}};
 const browser=new m.GamePerformanceRecorder(),cleanup=m.observeBrowserPerformance(browser,{addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)});
 assert.equal(observers.length,0);browser.start(0,{});assert.equal(observers.length,2);assert.equal(listeners.size,2);
 observers[0].callback({getEntries:()=>[{startTime:10,duration:160}]});listeners.get('webglcontextlost')({type:'webglcontextlost'});browser.stop(200);
 assert(observers.every(o=>o.disconnected));assert.equal(listeners.size,0);const browserReport=JSON.parse(browser.exportJson());assert(browserReport.traceEvents.some(e=>e.stage==='browser-longtask'&&e.durationMs===160));assert(browserReport.traceEvents.some(e=>e.stage==='webglcontextlost'));cleanup();
 delete globalThis.PerformanceObserver;const safari=new m.GamePerformanceRecorder(),stop=m.observeBrowserPerformance(safari,{});safari.start(0,{});safari.stop(1);assert.deepEqual(JSON.parse(safari.exportJson()).traceEvents[0].detail,{longTasks:false,longAnimationFrames:false});stop();
 // Reproduce a real budget priority edge case with one stale prefetch in flight:
 // 3 units: A ready (2), B pending (1); camera now needs C (2). A is still a
 // wanted prefetch, but C must evict A rather than wait for B's network timeout.
 const s=m.EAST_TERRAIN_SCALE,patch=(key,x,bytes)=>({key,x:600+x/s,y:600,width:100/s,height:100/s,bytes}),patches=[patch('a',500,2),patch('b',-400,1),patch('c',1900,2)];
 const jobs=new Map(),released=[],clock=Date.now(),settle=async()=>{for(let i=0;i<15;i++)await Promise.resolve()};
 const streaming=new m.GamePerformanceRecorder();streaming.start(performance.now(),{});
 const stream=new m.RoadArtStream(sources=>new Promise((resolve,reject)=>jobs.set(Object.keys(sources)[0],{resolve,reject})),keys=>released.push(...keys),{patches,sources:{a:'/a',b:'/b',c:'/c'},maxBytes:3,name:'test'},undefined,streaming);
 stream.update({x:100,y:0,width:700,height:100},1,clock);assert(jobs.has('a'));jobs.get('a').resolve();await settle();assert(jobs.has('b'));
 stream.update({x:1200,y:0,width:800,height:100},1,clock+201);assert(jobs.has('c'),'Visible C starts despite stale B occupying the remaining byte');assert(released.includes('a'),'Only offscreen A is evicted');assert(stream.residentBytes+stream.pendingBytes<=3);
 const waiting=stream.stats();assert.equal(waiting.missing,1);assert.equal(waiting.missingDetails[0].key,'c');assert.equal(waiting.missingDetails[0].state,'loading-or-warming');
 jobs.get('c').reject(Error('offline'));await settle();assert.equal(stream.stats().missingDetails[0].state,'retry-backoff');assert.equal(stream.stats().failures,1);assert(stream.stats().missingDetails[0].retryInMs>0);
 stream.dispose();jobs.get('b').resolve();await settle();streaming.stop(performance.now());const streamReport=JSON.parse(streaming.exportJson());assert(streamReport.traceEvents.some(e=>e.stage==='stream-failed'&&e.detail.key==='c'));assert(streamReport.traceEvents.some(e=>e.stage==='stream-evict'&&e.detail.key==='a'));
 console.log(JSON.stringify({passed:true,checks:['v2 phase timing and previous-frame hitch alignment','no links across pause/resume','bounded slow-frame summaries and trace ring with explicit truncation','recording session isolation','zero off/overlay timing buffers','opt-in browser observers and unsupported Safari reporting','visible streaming priority under stale prefetch pressure','pending/retry/failure/eviction evidence'],timingBufferBytes:6840000,physicalDeviceTested:false},null,2));
}finally{if(originalObserver)globalThis.PerformanceObserver=originalObserver;else delete globalThis.PerformanceObserver;fs.rmSync(temp,{recursive:true,force:true})}

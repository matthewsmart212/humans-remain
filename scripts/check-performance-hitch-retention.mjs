import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createRequire} from 'node:module';import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'hitch-retention-'));
try{
 await build({stdin:{contents:"export * from './src/performance-recording';export * from './src/performance-trace-history';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'check.cjs')});
 const m=createRequire(import.meta.url)(path.join(temp,'check.cjs'));
 const r=new m.GamePerformanceRecorder(),frame=(at,render=2)=>{r.beginFrame(at,'playing');r.phase('submitFlushMs',Math.max(0,render-2));r.endFrame(1,render,1)};
 r.start(0,{});r.trace(0,'browser-capabilities',0,{longTasks:false});frame(0);frame(16);
 r.trace(20,'download',6,{key:'early-tile'});frame(32,100);frame(149);
 r.trace(150,'context-sample',12);r.trace(160,'stream-failed',0,{key:'failed-tile'});
 for(let i=0;i<4000;i++)r.trace(10000+i,'download-start',0,{key:'routine-'+i});
 // Completion arrives much later than the CPU hitch. Its overlapping span
 // must still be preserved, without claiming that async work caused the hitch.
 r.trace(25,'stream-ready',14000,{key:'late-completion'});r.stop(15000);
 const log=JSON.parse(r.exportJson()),capture=log.hitchCaptures.find(c=>c.worstFrameIndex===2);
 assert(capture);assert(capture.traceEvents.some(e=>e.detail.key==='early-tile'));
 assert(capture.traceEvents.some(e=>e.stage==='context-sample'&&e.durationMs===12));
 assert(capture.traceEvents.some(e=>e.detail.key==='late-completion'));
 assert(!log.traceEvents.some(e=>e.detail.key==='early-tile'),'Ordinary ring really rolled over');
 assert(log.importantTraceEvents.some(e=>e.stage==='stream-failed'));
 assert(log.importantTraceEvents.some(e=>e.stage==='resume-frame'),'Excluded resume callback CPU evidence also survives');
 assert.deepEqual(log.browserCapabilities,{longTasks:false});
 const slow=log.slowFrames.find(f=>f.frameMs===117);assert.equal(slow.previous.renderCpuMs,100);assert(slow.captureIds.includes(capture.id));
 const retained=new Set([...log.traceEvents,...log.importantTraceEvents,...log.hitchCaptures.flatMap(c=>c.traceEvents)].map(e=>e.id));
 assert.equal(log.diagnostics.traceEventsDropped,log.diagnostics.traceEventsTotal-retained.size);
 assert(log.diagnostics.recentTraceEventsOverwritten>log.diagnostics.traceEventsDropped);
 assert.equal(r.bufferBytes,6840000,'No new per-frame timing buffers');
 const oldSession=r.session;r.start(20000,{});r.trace(20001,'stream-failed',0,{},oldSession);r.stop(20002);
 const fresh=JSON.parse(r.exportJson());assert.equal(fresh.hitchCaptures.length,0);assert.equal(fresh.importantTraceEvents.length,0);assert.equal(fresh.browserCapabilities,null);
 // Preserve the worst windows, bound all collections, and expose truncation.
 const h=new m.PerformanceTraceHistory();
 for(let i=0;i<40;i++){const at=i*4000;h.capture(at,at-16,40+i,i);for(let j=0;j<300;j++)h.add(at+j,'download',0,{key:String(j)})}
 for(let i=0;i<200;i++)h.add(200000+i,'stream-failed',0,{});
 const capped=h.snapshot();assert.equal(capped.hitchCaptures.length,m.PERFORMANCE_HITCH_LIMIT);
 assert(capped.hitchCaptures.every(c=>c.peakMs>=48&&c.traceEvents.length<=m.PERFORMANCE_HITCH_TRACE_LIMIT));
 assert(capped.hitchCaptures.some(c=>c.traceEventsOmitted>0));assert.equal(capped.retention.hitchCapturesOmitted,8);
 assert.equal(capped.importantTraceEvents.length,m.PERFORMANCE_IMPORTANT_TRACE_LIMIT);assert.equal(capped.retention.importantTraceEventsOverwritten,72);
 const storm=new m.GamePerformanceRecorder();storm.start(0,{});
 for(let i=0;i<10000;i++){storm.beginFrame(i*40,'playing');storm.trace(i*40,'texture-warm',2,{key:'tile'});storm.endFrame(1,20,1)}
 storm.stop(400000);const bounded=JSON.parse(storm.exportJson());assert(bounded.hitchCaptures.length<=32);assert(bounded.hitchCaptures.every(c=>c.toMs-c.fromMs<=5000));
 console.log(JSON.stringify({passed:true,checks:['early hitch evidence survives 4,000 later events','async completions attach to overlapping windows','important failures and browser capabilities survive','previous-render links identify preserved evidence','unique event loss counts and per-window truncation','session isolation','worst-window and event caps','bounded capture during sustained slow gameplay','unchanged timing-buffer allocation']},null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}

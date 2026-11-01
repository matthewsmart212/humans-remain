import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {analyzePerformanceReport,validatePerformanceReport} from './analyze-performance-log.mjs';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'frame-detail-'));
try{
 await build({stdin:{contents:"export * from './src/performance-recording';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'test.cjs')});
 const m=createRequire(import.meta.url)(path.join(temp,'test.cjs'));
 const r=new m.GamePerformanceRecorder({frames:100,wallMs:900000});
 const context={playerX:120,playerY:300,cameraX:121,cameraY:301,zoom:1,atlasZoom:.5,enemyCount:8,mapVisible:true,mapReady:true,worldDrawn:false,pinching:true,moving:false,sprinting:false};
 // Disabled and overlay-only calls do not allocate or accumulate detail.
 r.frameContext(context);r.system('simulationMs',25);assert.equal(r.bufferBytes,0);
 r.setOverlay(true);r.beginFrame(0,'playing');r.frameContext(context);r.system('simulationMs',25);r.endFrame(1,2,1);assert.equal(r.bufferBytes,0);
 r.start(0,{platform:'ios',developmentBuild:true});
 const frame=(at,detail,simulation=2,draw=3,auxiliary=0)=>{
  assert(r.beginFrame(at,'playing'));if(detail)r.frameContext(detail);r.system('simulationMs',simulation);r.system('simCombatMs',simulation*.5);r.system('simCombatMs',simulation*.25);r.phase('worldDrawMs',draw);r.system('mapPrefetchMs',auxiliary);r.endFrame(simulation,draw,1);
 };
 frame(0,context);frame(16,context,80,10,6);frame(116,{...context,playerX:121,atlasZoom:.4},1,2);
 // A new frame cannot inherit an unsupported/omitted field or flag.
 frame(132,{playerX:NaN,playerY:Infinity,zoom:1});
 r.setActivity('paused',140);frame(10000,{...context,mapVisible:false});frame(10020,{...context,mapVisible:false});
 r.trace(10021,'native-ui-cadence',0,{intervals:30,windowMs:500,worstFrameMs:60,over33ms:2,over50ms:1,over100ms:0,deliveryDelayMs:7});
 r.trace(10022,'native-ui-cadence',0,{intervals:30,windowMs:600,worstFrameMs:80,over33ms:3,over50ms:2,over100ms:0,deliveryDelayMs:12});
 r.stop(10030);const report=JSON.parse(r.exportJson());
 assert.equal(report.frames.length,4);assert.equal(report.frameContexts.length,4);assert.equal(report.systemTimings.length,4);
 const column=(row,name)=>row[report.systemTimingColumns.indexOf(name)];
 assert.equal(column(report.systemTimings[0],'simulationMs'),80);assert.equal(column(report.systemTimings[0],'simCombatMs'),60,'Multiple fixed simulation steps accumulate inside one frame');
 assert.equal(column(report.systemTimings[1],'simCombatMs'),.75,'New frame resets timing totals');
 const hitch=report.slowFrames.find(event=>event.frameMs===100);
 assert.equal(hitch.previous.measuredCpuMs,96);assert.equal(hitch.previous.auxiliaryCpuMs,6);assert.equal(hitch.previous.context.playerX,120);assert.equal(hitch.previous.systems.simulationMs,80);assert.equal(hitch.current.context.playerX,121);assert.equal(hitch.current.context.pinching,true);assert.equal(hitch.current.context.worldDrawn,false);assert.equal(hitch.current.context.visibleSprites,null);
 const missing=report.frameContexts[2];assert.equal(missing[0],null);assert.equal(missing[1],null);assert.equal(missing[report.frameContextColumns.indexOf('knownFlags')],0);
 assert.deepEqual(report.timeline.map(bucket=>bucket.fromMs),[0,10000],'Paused buckets are not fabricated');assert.equal(report.timeline[0].worstFrameIndex,1);assert.equal(report.timeline[0].worstFrameMs,100);
 const capture=report.analysis.hitches[0];assert.equal(capture.atSeconds,.116,'Hitch timestamp is the actual worst frame, not beginning of its evidence window');assert.equal(capture.previousFrame.updateCpuMs,80);assert.equal(capture.frame.updateCpuMs,1);assert.equal(capture.outsidePreviousMeasuredWorkMs,4);
 assert.equal(report.uiCadence.intervals,60);assert.equal(report.uiCadence.worstFrameMs,80);assert.equal(report.uiCadence.over50ms,3);assert.equal(report.uiCadence.maxDeliveryDelayMs,12);assert.equal(report.uiCadence.meanFrameMs,18.333);
 assert.equal(r.bufferBytes,100*((m.PERFORMANCE_COLUMNS.length+m.PERFORMANCE_PHASES.length+m.PERFORMANCE_CONTEXT_COLUMNS.length+m.PERFORMANCE_SYSTEMS.length)*4+1));
 assert.equal(validatePerformanceReport(report),report);const text=analyzePerformanceReport(report);assert.match(text,/0.116s/);assert.match(text,/player \(121.00, 300.00\)/);assert.match(text,/Previous: update 80.00 ms/);assert.match(text,/not assign a cause/);
 assert.throws(()=>validatePerformanceReport({...report,schema:'other'}),/Expected/);assert.throws(()=>validatePerformanceReport({...report,systemTimings:[]}),/misaligned/);assert.throws(()=>validatePerformanceReport({...report,frames:[[NaN]]}),/numeric row/);
 // Legacy v2 remains readable without exact context or system/UI data.
 const legacy={...report};delete legacy.frameContexts;delete legacy.systemTimings;delete legacy.uiCadence;assert.match(analyzePerformanceReport(legacy),/Native UI callback cadence is unavailable/);
 // Missing CPU work must not be asserted as a renderer/GPU bottleneck.
 const waiting=new m.GamePerformanceRecorder();waiting.start(0,{});for(let i=0;i<20;i++){waiting.beginFrame(i*100,'playing');waiting.endFrame(.1,1,1)}waiting.stop(2000);
 assert(waiting.analysis().findings.some(finding=>finding.includes('outside measured update/drawing')));assert(waiting.analysis().findings.every(finding=>!finding.includes('Drawing dominates')));
 const oldSession=r.session;r.start(20000,{});r.trace(20001,'native-ui-cadence',0,{intervals:100,windowMs:2000},oldSession);r.stop(20002);const empty=JSON.parse(r.exportJson());assert.equal(empty.uiCadence,null);assert.equal(empty.frameContexts.length,0);assert(empty.analysis.findings.some(finding=>finding.includes('No active frame intervals')));
 console.log(JSON.stringify({passed:true,checks:['exact aligned context with unknown/null fields','accumulated nested system timings and frame reset','current/preceding hitch attribution','truthful incomplete CPU attribution','no fabricated paused timeline buckets','run-wide delivered UI batch aggregates','session isolation and disabled allocation','bounded detail storage','legacy-compatible analyzer with malformed-input checks'],maxBufferBytes:17400000,physicalDeviceTested:false},null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}

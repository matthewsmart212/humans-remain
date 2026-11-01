import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'native-map-performance-'));
try{
 await build({stdin:{contents:"export * from './native/frame-diagnostics';export * from './src/performance-recording';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'test.cjs')});
 const {GamePerformanceRecorder,NativeFrameDiagnostics,nativeMapCoversWorld}=createRequire(import.meta.url)(path.join(temp,'test.cjs'));
 for(const zoom of [1,.7,.65,.56001])assert.equal(nativeMapCoversWorld(zoom,true),false,'Draw gameplay throughout the crossfade');
 for(const zoom of [.56,.4,.02]){assert(nativeMapCoversWorld(zoom,true));assert(!nativeMapCoversWorld(zoom,false),'Missing map artwork must not suppress gameplay drawing')}
 const recorder=new GamePerformanceRecorder(),native=new NativeFrameDiagnostics(recorder);
 const detail={atlasZoom:.3,mapVisible:true,mapReady:true,worldDrawn:false,pinching:true,simulationMs:1,terrainMs:0,publishMs:0};
 native.frame(0,1,0,detail);assert.equal(recorder.hasLog,false,'No buffers allocated with recording off');
 recorder.start(100,{});recorder.trace(100,'native-pinch-start',0,{atlasZoom:.7});
 native.frame(100,240,10,{...detail,simulationMs:239,worldDrawn:true,atlasZoom:.71});native.frame(373,1,0,detail);
 recorder.trace(374,'native-map-open',0,{atlasZoom:.3});
 native.reset();native.frame(5000,1,0,detail);
 // Important interaction markers survive routine terrain traffic.
 for(let i=0;i<3000;i++)recorder.trace(6000+i,'stream-ready',0,{});
 recorder.stop(10000);const log=JSON.parse(recorder.exportJson());
 assert(log.importantTraceEvents.some(e=>e.stage==='native-pinch-start'));
 assert(log.importantTraceEvents.some(e=>e.stage==='native-map-open'));
 // Capture a gap separately so it is in the recent ring for precise assertions.
 recorder.start(11000,{});native.frame(11000,240,10,{...detail,simulationMs:239,atlasZoom:.71});native.frame(11273,1,0,detail);recorder.stop(11274);
 const traces=JSON.parse(recorder.exportJson()).traceEvents,gap=traces.find(e=>e.stage==='native-frame-gap');
 assert.equal(gap.detail.frameMs,273);assert.equal(gap.detail.previousUpdateMs,240);assert.equal(gap.detail.previousAtlasZoom,.71);assert.equal(gap.detail.atlasZoom,.3);assert.equal(gap.detail.outsideMeasuredWorkMs,23);
 assert(traces.some(e=>e.stage==='native-update'&&e.detail.simulationMs===239));
 recorder.start(20000,{});native.frame(20000,1,0,detail);native.reset();native.frame(30000,1,0,detail);recorder.stop(30001);
 assert(!JSON.parse(recorder.exportJson()).traceEvents.some(e=>e.stage==='native-frame-gap'),'No gaps across pause/resume or recorder sessions');
 console.log(JSON.stringify({passed:true,checks:['only opaque ready maps suppress world drawing','actual atlas zoom and preceding callback attribution','expensive simulation evidence','gesture retention after trace rollover','pause and session isolation','no recording-off buffers'],physicalIPhoneTested:false},null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}

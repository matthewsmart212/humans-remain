import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'terrain-streaming-'));
const original={fetch:globalThis.fetch,window:globalThis.window,type:process.type,bitmap:globalThis.createImageBitmap};
const tick=async()=>{for(let i=0;i<16;i++)await Promise.resolve()};
try{
 await build({stdin:{contents:"export * from './src/performance-recording';export * from './src/world-assets';export * from './src/road-art-stream';export * from './src/east-approach';export * from './src/web-artwork-decoder';export * from './src/skia-web';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/river-art';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=require(path.join(temp,'model.cjs')),s=m.EAST_TERRAIN_SCALE;
 const patches=['a','b','c','d','e','f'].map((key,i)=>({key,x:600+i*1000/s,y:600,width:1000/s,height:1000/s}));
 const sources=Object.fromEntries(patches.map(p=>[p.key,'/'+p.key]));
 let jobs=[],calls=[],released=[],now=Date.now();
 const stream=new m.RoadArtStream(src=>new Promise(resolve=>{const key=Object.keys(src)[0];calls.push(key);jobs.push({key,resolve})}),keys=>released.push(...keys),{patches,sources,limit:3});
 const view=x=>({x,y:400,width:100,height:100});
 const drain=async()=>{for(let n=0;jobs.length&&n<20;n++){const batch=jobs;jobs=[];for(const j of batch)j.resolve();await tick();assert(stream.residentCount+stream.pendingCount<=3,'Resident plus in-flight texture budget');assert(stream.pendingCount<=2)}assert.equal(jobs.length,0)};
 stream.update(view(400),1,now);assert(calls.includes('b'),'Prefetch a section 500 world units ahead of the viewport');await drain();
 stream.update(view(1850),1,now+=201);await drain();assert.equal(stream.residentCount,3);assert(!released.includes('a'),'Keep the recently passed section');
 const beforeReversal=calls.length;
 for(let i=0;i<12;i++){stream.update(view(i%2?400:1850),1,now+=201);await drain()}
 assert.equal(calls.length,beforeReversal,'Crossing back and forth must reuse recent textures');
 stream.update(view(2850),1,now+=201);await drain();assert(stream.residentCount<=3);assert(released.includes('a'));
 stream.update(view(2850),.44,now+=201);assert(stream.residentCount>0,'Small zoom oscillation keeps detail');
 stream.update(view(2850),.1,now+=201);assert.equal(stream.residentCount,0);stream.dispose();
 // Queued completions cannot repopulate a renderer after a teleport/disposal.
 let finish;const staleReleased=[];
 const stale=new m.RoadArtStream(src=>new Promise(r=>finish=r),keys=>staleReleased.push(...keys),{patches:patches.slice(0,1),sources,limit:1});
 stale.update(view(100),1);stale.dispose();finish();await tick();assert.equal(stale.residentCount,0);assert.deepEqual(staleReleased,['a']);
 // Browser decoding stays asynchronous; fallback, cancellation and failed
 // texture creation all preserve ownership of the decoded bitmap.
 const bytes=new Uint8Array([1,2,3]),signal=new AbortController().signal;
 let resolveBitmap,closes=0,encodedCalls=0,textureCalls=0;
 const bitmap={width:1,height:1,close(){closes++}};
 globalThis.createImageBitmap=()=>new Promise(r=>resolveBitmap=r);
 const decoding=m.decodeWebArtwork(bytes,signal,()=>{encodedCalls++;return 'encoded'},b=>{assert.equal(b,bitmap);textureCalls++;return 'texture'});
 await tick();assert.equal(textureCalls,0);resolveBitmap(bitmap);const decoded=await decoding;assert.equal(decoded.image,'texture');assert.equal(encodedCalls,0);assert.equal(closes,0);decoded.bitmap.close();
 globalThis.createImageBitmap=async()=>{throw Error('Unsupported browser codec')};
 assert.equal((await m.decodeWebArtwork(bytes,signal,()=>{encodedCalls++;return 'fallback'},()=>{throw Error('must not run')})).image,'fallback');
 globalThis.createImageBitmap=async()=>bitmap;
 assert.equal((await m.decodeWebArtwork(bytes,signal,()=> 'fallback',()=>{throw Error('Texture unavailable')})).image,'fallback');assert.equal(closes,2);
 const cancelled=new AbortController();globalThis.createImageBitmap=()=>new Promise(r=>resolveBitmap=r);
 const abandoned=m.decodeWebArtwork(bytes,cancelled.signal,()=>{throw Error('No fallback on abort')},()=>{throw Error('No texture on abort')});
 const aborted=assert.rejects(abandoned,{name:'AbortError'});cancelled.abort();await aborted;resolveBitmap(bitmap);await tick();assert.equal(closes,3,'Late bitmap is closed after cancellation');
 // Exercise the production renderer: two downloaded images become drawable
 // only after separate warm-up frames, and their pixels match ordinary loading.
 delete globalThis.createImageBitmap;delete globalThis.CanvasKit;globalThis.window={};process.type='renderer';globalThis.devicePixelRatio=1;
 globalThis.fetch=async url=>String(url).startsWith('blob:')?original.fetch(url):new Response(fs.readFileSync(path.resolve('public'+String(url))));
 const canvas={width:0,height:0,clientWidth:360,clientHeight:240,dataset:{}},world=m.createWorld(m.emptyLayout());
 const first=m.RIVER_SECTIONS[0],second=m.RIVER_SECTIONS[1],art={streamA:m.RIVER_DETAIL_IMAGES[first.key],streamB:m.RIVER_DETAIL_IMAGES[second.key]};
 let surface,seen=[],drawOnly='';const diagnostics=new m.GamePerformanceRecorder();diagnostics.start(performance.now(),{platform:'software-test'});
 const renderer=await m.createWebWorld(canvas,(ctx,_atlas,imgs)=>{
  seen=Object.keys(imgs);ctx.clearRect(0,0,360,240);ctx.fillStyle='#33291e';ctx.fillRect(0,0,360,240);
  const key=drawOnly||'streamA';if(imgs[key])ctx.drawImage(imgs[key],0,0,360,240);
 },{},{sources:{},streamRoads:false,streamRivers:false,diagnostics});
 const draw=()=>{const start=performance.now();diagnostics.beginFrame(start,'playing');renderer.draw(world);diagnostics.endFrame(0,performance.now()-start,0)};
 globalThis.CanvasKit.MakeSWCanvasSurface=c=>(surface=globalThis.CanvasKit.MakeSurface(c.width,c.height));
 const snapshot=()=>{const im=surface.makeImageSnapshot();const bytes=Buffer.from(im.encodeToBytes());im.delete();return bytes};
 draw();
 const readyA=renderer.warmImages({streamA:art.streamA}),readyB=renderer.warmImages({streamB:art.streamB});
 await new Promise(r=>setTimeout(r,20));draw();assert(!seen.includes('streamA')&&!seen.includes('streamB'),'No unprepared detail reaches the scene');await tick();
 draw();assert.equal(seen.filter(k=>k.startsWith('stream')).length,1,'Only one texture becomes drawable per frame');await tick();
 await Promise.all([readyA,readyB]);draw();assert(seen.includes('streamA')&&seen.includes('streamB'));const warmed=snapshot();
 await renderer.loadImages({reference:art.streamA});drawOnly='reference';draw();assert(warmed.equals(snapshot()),'Preparing a texture does not change its pixels');
 renderer.releaseImages(['streamA']);drawOnly='streamA';draw();assert(!seen.includes('streamA'));assert(seen.includes('reference'),'Shared-image alias survives release');
 const reuse=renderer.warmImages({streamA:art.streamA});await reuse;draw();assert(warmed.equals(snapshot()),'Already warm shared artwork returns without another upload');
 diagnostics.stop(performance.now());const trace=JSON.parse(diagnostics.exportJson());assert.equal(trace.traceEvents.filter(e=>e.stage==='texture-warm').length,2);assert(trace.traceEvents.some(e=>e.stage==='decode'&&e.detail.mode==='skia-encoded'));assert(trace.phaseSummary.textureDrawMs.maxMs>0);assert(trace.phaseSummary.submitFlushMs.maxMs>0);assert.equal(renderer.textureStats().graphics.gpuCacheBytes,null);assert.equal(renderer.textureStats().artwork.warming,0);
 renderer.dispose();renderer.dispose();
 const report={result:'pass',prefetchBeyondOldBoundary:true,reversalLoads:0,residentAndPendingLimit:3,zoomHysteresis:true,lateCompletionCleanup:true,asyncBrowserDecode:true,codecFallback:true,abortCleanup:true,textureWarmupPerFrame:1,detailHiddenUntilPrepared:true,pixelsPreserved:true,verification:'Production CanvasKit software renderer and deterministic lifecycle checks; browser GPU and physical iPhone performance remain unverified.'};
 fs.mkdirSync('docs/qa/map-streaming-v1',{recursive:true});fs.writeFileSync('docs/qa/map-streaming-v1/checks.json',JSON.stringify(report,null,2)+'\n');console.log(report);
}finally{globalThis.fetch=original.fetch;globalThis.window=original.window;process.type=original.type;if(original.bitmap)globalThis.createImageBitmap=original.bitmap;else delete globalThis.createImageBitmap;fs.rmSync(temp,{recursive:true,force:true})}

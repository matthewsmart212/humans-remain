// Deterministic admission/lifecycle checks. Host timings are not iPhone FPS.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'native-preparation-')),require=createRequire(import.meta.url);
try{
 await build({stdin:{contents:"export * from './native/frame-work-scheduler';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'scheduler.cjs'),logLevel:'error'});
 const {NativeFrameWorkScheduler}=require(path.join(temp,'scheduler.cjs'));
 let now=0;const calls=[],traces=[],clock=()=>now;
 const recorder={recording:true,trace:(at,name,ms,data)=>traces.push({at,name,ms,data})};
 const scheduler=new NativeFrameWorkScheduler(recorder,clock);
 let map=20,images=3;
 scheduler.register({name:'map',peek:()=>map?{kind:'append',priority:'prefetch',initialMs:1}:null,run:()=>{map--;calls.push('map');now+=1}});
 scheduler.register({name:'artwork',maxPerFrame:1,peek:()=>images?{kind:'decode',priority:'foreground',initialMs:2}:null,run:()=>{images--;calls.push('artwork');now+=2}});
 now=13;scheduler.drain(0);
 assert.equal(calls.length,0,'No source starts on an already late frame');
 now=17;scheduler.drain(16);
 assert.equal(calls[0],'artwork','Visible artwork precedes young prefetch work');
 assert.equal(calls.filter(x=>x==='artwork').length,1,'At most one image decode per frame');
 assert(now<=26,'Both sources share one preparation allowance');
 now=33;scheduler.drain(32);
 assert.equal(calls.filter(x=>x==='artwork').length,2);

 // The cost learned during standalone boot must affect later admission.
 let expensive=1;const costly=new NativeFrameWorkScheduler(recorder,clock);
 costly.observe('image','large',7);
 costly.register({name:'image',peek:()=>expensive?{kind:'large',priority:'foreground',initialMs:.1}:null,run:()=>{expensive--;calls.push('large');now+=7}});
 now=105;costly.drain(100);assert.equal(expensive,1,'Measured cost overrides an optimistic initial hint');
 now=400;costly.drain(385);assert.equal(expensive,1,'Even overdue work never starts after the deadline');
 now=422;costly.drain(416);assert.equal(expensive,0,'Overdue work can borrow full-frame headroom after sustained 6 ms gameplay');
 assert.equal(costly.stats().overdueUnits,1);assert.equal(costly.stats().overruns,1);
 assert(traces.some(t=>t.data.overdueUnits===1&&t.data.overrun),'Oversize admission is explicitly observable');

 // An operation slower than a complete frame must eventually load even with
 // sustained 6 ms gameplay and an endlessly populated cheap map queue.
 let huge=2;const unavoidable=new NativeFrameWorkScheduler(recorder,clock),forcedAt=[];
 unavoidable.observe('huge','decode',20);
 unavoidable.register({name:'huge',maxPerFrame:1,peek:()=>huge?{kind:'decode',priority:'foreground',initialMs:1}:null,run:()=>{huge--;forcedAt.push(now);now+=20}});
 unavoidable.register({name:'cheap-map',peek:()=>({kind:'append',priority:'prefetch',initialMs:.5}),run:()=>{now+=.5}});
 for(let frame=0;frame<180&&huge;frame++){const start=3000+frame*17;now=start+6;unavoidable.drain(start)}
 assert.equal(huge,0,'Cost history cannot permanently block visible loading on moderately loaded frames');
 assert(forcedAt[1]-forcedAt[0]>=500,'Slower-than-frame exceptions are rate limited');
 assert.equal(unavoidable.stats().unavoidableUnits,2);
 assert(traces.filter(t=>t.data.unavoidableUnits===1).length===2);
 unavoidable.dispose();

 // A continually populated foreground queue cannot starve background work.
 let background=1,foreground=100;const fairness=new NativeFrameWorkScheduler(undefined,clock),order=[];
 fairness.register({name:'foreground',maxPerFrame:1,peek:()=>foreground?{kind:'unit',priority:'foreground',initialMs:7}:null,run:()=>{foreground--;order.push('foreground');now+=7}});
 fairness.register({name:'background',maxPerFrame:1,peek:()=>background?{kind:'unit',priority:'prefetch',initialMs:7}:null,run:()=>{background--;order.push('background');now+=7}});
 for(let frame=0;frame<20&&background;frame++){const start=1000+frame*17;now=start+1;fairness.drain(start)}
 assert.equal(background,0,'Aged prefetch competes fairly when useful headroom exists');
 assert(order.indexOf('background')>=1,'New foreground work retains initial priority');

 let units=0;const lifecycle=new NativeFrameWorkScheduler(undefined,clock);
 const remove=lifecycle.register({name:'unit',peek:()=>({kind:'unit',priority:'foreground',initialMs:1}),run:()=>{units++;now++}});
 now=2006;lifecycle.drain(2000,1000/120);assert.equal(units,0,'120 Hz budgets do not reuse the 60 Hz allowance');
 now=2021;lifecycle.drain(2020,1000/120);assert(units>0&&now<=2025);
 remove();const before=units;now=2040;lifecycle.drain(2040);assert.equal(units,before);
 lifecycle.dispose();lifecycle.register({name:'closed',peek:()=>({kind:'unit',priority:'foreground',initialMs:1}),run:()=>units++});lifecycle.drain(2040);assert.equal(units,before,'Unregistered/disposed sources cannot run');

 // Production renderer queue: startup warm must finish without a game loop;
 // managed mode must never start a second independent rAF decode pump.
 const raf=[],decoded=[],imagesByUri=new Map();
 globalThis.requestAnimationFrame=fn=>(raf.push(fn),raf.length);
 globalThis.__preparationSkia={
  Data:{fromURI:async uri=>({uri,dispose(){}})},
  Typeface:{MakeFreeTypeFaceFromData:()=>({dispose(){}})},Font:()=>({dispose(){}}),Paint:()=>({dispose(){}}),XYWHRect:(x,y,width,height)=>({x,y,width,height}),
  Image:{MakeImageFromEncoded:data=>{const image={uri:data.uri,width:()=>512,height:()=>512};imagesByUri.set(data.uri,image);return image}},
  Surface:{Make:()=>({getCanvas:()=>({drawImageRect:image=>decoded.push(image.uri)}),dispose(){}})},
 };
 await build({stdin:{contents:"export * from './native/game-renderer';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'renderer.cjs'),logLevel:'error',plugins:[{name:'native-platform-fixture',setup(b){
  const modules={
   '@shopify/react-native-skia':'export const Skia=globalThis.__preparationSkia;',
   'react-native':'export const PixelRatio={get:()=>2};',
   'expo-asset':'const asset=uri=>({uri,localUri:uri,downloadAsync:async()=>{}});export const Asset={fromModule:asset,fromURI:asset};',
  };
  b.onResolve({filter:/^(@shopify\/react-native-skia|react-native|expo-asset)$/},a=>({path:a.path,namespace:'native-fixture'}));
  b.onLoad({filter:/.*/,namespace:'native-fixture'},a=>({contents:modules[a.path],loader:'js'}));
  b.onLoad({filter:/\.(webp|png|jpg|ttf)$/},a=>({contents:`module.exports=${JSON.stringify(a.path)};`,loader:'js'}));
  b.onLoad({filter:/[\/]skia-adapter\.ts$/},()=>({contents:'export const createSkiaAdapter=()=>({releaseImage(){},disposeLighting(){},shaderFieldBytes:()=>0});',loader:'js'}));
  b.onLoad({filter:/[\/]terrain-art-streams\.ts$/},()=>({contents:'const stream=()=>({update(){},stats:()=>({})});export const createTerrainArtStreams=(_load,_release,_promote,_diagnostics,profile)=>{globalThis.__terrainProfile=profile;return {roads:stream(),camp:stream(),rivers:stream(),settled:()=>globalThis.__terrainGate,dispose(){}}};',loader:'js'}));
 }}]});
 const {createNativeRenderer}=require(path.join(temp,'renderer.cjs'));
 const shared=new NativeFrameWorkScheduler(),renderer=await createNativeRenderer(undefined,undefined,shared);
 const flush=async()=>{for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve))};
 const boot=renderer.warmImages({boot:'fixture://boot'});await flush();
 assert.equal(decoded.length,0);assert.equal(raf.length,1);
 raf.shift()(performance.now());await boot;assert.deepEqual(decoded,['fixture://boot']);
 assert.equal(globalThis.__terrainProfile,'native','Only the native renderer opts into the larger buffer');
 const draw=renderer.draw;let releaseTerrain,previewDisposed=false,prepared=false;
 globalThis.__terrainGate=new Promise(resolve=>releaseTerrain=resolve);
 renderer.draw=()=>({dispose(){previewDisposed=true}});
 const terrain=renderer.prepareTerrain({},844,390).then(()=>prepared=true);await flush();
 assert(previewDisposed,'Temporary startup picture releases its references');assert(!prepared,'Renderer waits for admitted detail loads');
 releaseTerrain();await terrain;assert(prepared);renderer.draw=draw;
 renderer.setFrameManaged(true);
 const gameplay=renderer.warmImages({visible:'fixture://visible'},'foreground');await flush();
 assert.equal(raf.length,0,'Managed warm does not schedule an independent callback');
 shared.drain(performance.now()-20);assert.equal(decoded.length,1,'Busy gameplay frame leaves the image queued');
 shared.drain(performance.now());await gameplay;assert.deepEqual(decoded,['fixture://boot','fixture://visible']);
 const far=renderer.warmImages({far:'fixture://far'},'background'),near=renderer.warmImages({near:'fixture://near'},'background');await flush();
 const promoted=renderer.warmImages({near:'fixture://near'},'foreground');await flush();
 shared.drain(performance.now());await promoted;assert.equal(decoded.at(-1),'fixture://near','A visible request promotes an already queued background decode');
 shared.drain(performance.now());await Promise.all([far,near]);assert.equal(decoded.at(-1),'fixture://far');
 const pending=renderer.warmImages({abandoned:'fixture://abandoned'}).catch(e=>e.message);await flush();renderer.dispose();
 assert.equal(await pending,'Renderer closed');shared.drain(performance.now());assert.equal(decoded.length,4,'Disposed queues cannot decode or publish stale images');
 shared.dispose();scheduler.dispose();costly.dispose();fairness.dispose();
 console.log(JSON.stringify({passed:true,checks:['late-frame skip','shared map/decode allowance','observed cost admission','one image per frame','foreground and aged-prefetch fairness','full-frame borrowing and rate-limited indivisible jobs','refresh-aware budget','unregister/dispose','startup without game loop','no independent gameplay warm pump','queued decode promotion','pending warm rejection'],physicalIPhoneTested:false}));
}finally{fs.rmSync(temp,{recursive:true,force:true})}

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'performance-check-'));
const effects=[];
globalThis.__performanceReact={createElement:(type,props,...children)=>({type,props:{...props,children}}),useRef:value=>({current:value}),useState:value=>[typeof value==='function'?value():value,()=>{}],useEffect:fn=>effects.push(fn),useMemo:fn=>fn(),useId:()=> 'test-title'};
globalThis.__performanceFiles=[];globalThis.__performanceShares=[];globalThis.__sharingAvailable=true;globalThis.__nativeModules={SourceCode:{scriptURL:'http://192.168.1.20:8081/index.bundle?platform=ios&dev=true'}};
try{
 const aliases={react:'module.exports=globalThis.__performanceReact;',
  'react/jsx-runtime':"export const jsx=(type,props)=>({type,props});export const jsxs=jsx;export const Fragment='fragment';",
  'react-native':"export const View='view',Text='text',Pressable='pressable',ScrollView='scroll';export const StyleSheet={create:x=>x};export const NativeModules=globalThis.__nativeModules;",
  'lucide-react':"export const Plus='svg',Trash2='svg',HeartPulse='svg',Activity='svg',ArrowLeft='svg',Download='svg',Square='svg',Play='svg',Pause='svg',RotateCcw='svg',Minimize2='svg',Maximize2='svg';",
  'expo-file-system':"export const Paths={cache:'file:///cache/'};export class File{constructor(dir,name){this.uri=dir+name}write(text){globalThis.__performanceFiles.push({uri:this.uri,text})}}",
  'expo-sharing':"export const isAvailableAsync=async()=>globalThis.__sharingAvailable;export const shareAsync=async(uri,options)=>globalThis.__performanceShares.push({uri,options});"};
 await build({stdin:{contents:`export * from './src/performance-recording';export * from './src/performance-context';export * from './src/use-performance-snapshot';export * from './src/GamePerformance';export {default as Menu} from './src/GamePlayMenu';export {default as NativePanel,NativePerformanceOverlay,NativePerformanceMenuOptions,exportNativePerformanceLog,saveNativePerformanceLogToComputer} from './native/PerformancePanel';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'test.cjs'),plugins:[{name:'platform-boundaries',setup(b){b.onResolve({filter:/^(react(?:\/jsx-runtime)?|react-native|lucide-react|expo-file-system|expo-sharing)$/},a=>({path:a.path,namespace:'platform'}));b.onLoad({filter:/.*/,namespace:'platform'},a=>({contents:aliases[a.path],loader:'js'}));}}]});
 const m=require(path.join(temp,'test.cjs')),Recorder=m.GamePerformanceRecorder;
 const frame=(r,at,activity='playing',update=1.5,draw=3,steps=1)=>{if(r.beginFrame(at,activity))r.endFrame(update,draw,steps)};
 const off=new Recorder();let notifications=0;off.subscribe(()=>notifications++);
 for(let i=0;i<10000;i++)frame(off,i*16.6667);
 assert.equal(off.bufferBytes,0);assert.equal(off.hasLog,false);assert.equal(notifications,0);assert.equal(off.sampleDue(10000),false);assert.equal(off.read(10000).live,null);
 // Overlay alone does not allocate a recording or store context/history.
 off.setOverlay(true);for(let i=0;i<=120;i++)frame(off,i*1000/60);
 assert(Math.abs(off.read(2000).live.fps-60)<.001);assert.equal(off.bufferBytes,0);assert.equal(notifications,1,'Never notify React on frames');
 off.setOverlay(false);assert.equal(off.enabled,false);
 for(const hz of [30,60,120]){
  const r=new Recorder();r.start(0,{platform:'test'});for(let i=0;i<=hz*2;i++)frame(r,i*1000/hz);r.stop(2000);
  assert.equal(r.summary().frames,hz*2);assert(Math.abs(r.summary().averageFps-hz)<.001);assert.equal(r.summary().activeSeconds,2);assert.equal(r.summary().meanRenderCpuMs,3);assert.equal(r.summary().meanUpdateCpuMs,1.5);
 }
 const r=new Recorder();let updates=0;r.subscribe(()=>updates++);r.start(0,{platform:'unit-test',renderer:'cpu-only'});
 for(let i=0;i<=120;i++){const at=i*1000/60;frame(r,at);if(r.sampleDue(at))r.sample(at,{scene:'camp',x:i})}
 assert.throws(()=>r.exportJson(),/Stop recording/);assert.equal(r.summary(),null);assert.equal(updates,1);
 frame(r,2200,'playing',8,27,6); // A real, unclamped 200ms hitch.
 r.setActivity('paused',2210);frame(r,12000,'paused');r.setActivity('background',12001);r.setActivity('paused',30000);
 frame(r,30100);frame(r,30100+1000/60);
 r.setActivity('bag',30120);frame(r,70000,'bag');frame(r,70100);frame(r,70100+1000/60);
 r.stop(70130);r.stop(80000);assert.equal(updates,2,'Start/stop only; frames and samples never notify React');
 const summary=r.summary(),json=r.exportJson(),report=JSON.parse(json);
 assert.equal(summary.frames,123);assert.equal(summary.worstFrameMs,200);assert.equal(summary.over100ms,1);assert.equal(summary.simulationClampedMs,100);assert.equal(summary.wallSeconds,70.13);assert(summary.activeSeconds<2.24);assert.equal(summary.p95FrameMs,16.667);
 assert.equal(report.frames.length,123);assert.deepEqual(report.frameColumns,m.PERFORMANCE_COLUMNS);assert.equal(report.contextSamples.length,3);assert(report.events.some(e=>e.detail==='background'));assert(report.events.some(e=>e.detail==='bag'));assert.equal(report.events.at(-1).type,'stop');assert.match(report.measurement.renderCpu,/not GPU/);
 assert(report.frames.every(row=>row.length===6&&row.every(Number.isFinite)));assert(report.renderPhases.every(row=>row.length===m.PERFORMANCE_PHASES.length&&row.every(Number.isFinite)));assert.match(r.filename(),/^humans-remain-performance-.*\.json$/);
 assert.equal(r.summary(),summary,'Percentiles cached after Stop, not re-sorted per UI update');
 // A context request cannot grow the history faster than 1Hz.
 const context=new Recorder();context.start(0,{});for(let at=0;at<900000;at+=10){frame(context,at);context.sample(at,{scene:'camp'})}context.stop(900000);
 assert.equal(JSON.parse(context.exportJson()).contextSamples.length,900);
 const capped=new Recorder({frames:3,wallMs:900000});capped.start(0,{});for(let at=0;at<200;at+=10)frame(capped,at);
 assert.equal(capped.recording,false);assert.equal(capped.summary().frames,3);assert.equal(capped.bufferBytes,3*((6+m.PERFORMANCE_PHASES.length)*4+1));assert.match(capped.summary().stopReason,/buffer/);
 const deadline=new Recorder({frames:100,wallMs:100});deadline.start(0,{});frame(deadline,0);frame(deadline,16);frame(deadline,120,'paused');assert.equal(deadline.recording,false);assert.equal(deadline.summary().frames,1);
 const malformed=new Recorder();malformed.start(0,{});frame(malformed,0);frame(malformed,16,'playing',NaN,-8);malformed.stop(17);assert.equal(malformed.summary().meanRenderCpuMs,0);assert.equal(malformed.summary().meanUpdateCpuMs,0);
 r.start(100000,{});assert.equal(r.read(100000).frames,0);assert.equal(r.summary(),null);r.stop(100001);assert.equal(r.summary().frames,0);assert.equal(JSON.parse(r.exportJson()).frames.length,0);
 // Use the real platform components/handlers, mocking only React/native/OS APIs.
 const nodes=n=>!n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)];
 const text=n=>n==null||typeof n==='boolean'?'':typeof n==='string'||typeof n==='number'?String(n):Array.isArray(n)?n.map(text).join(''):text(n.props?.children);
 const find=(tree,label)=>nodes(tree).find(n=>(n.type==='button'||n.type==='pressable')&&(label instanceof RegExp?label.test(text(n)):text(n).includes(label)));
 for(const platform of ['web','native']){
  const diagnostics=new Recorder();let started=0,back=0,opened=0;
  const props={recorder:diagnostics,onStart:()=>{started++;diagnostics.start(0,{})},onBack:()=>back++,defeated:false,wide:true};
  const menu=platform==='web'?m.PerformanceMenuOptions({recorder:diagnostics,onOpen:()=>opened++}):m.NativePerformanceMenuOptions({recorder:diagnostics,onOpen:()=>opened++});
  const toggle=find(menu,'Show FPS');toggle.props[platform==='web'?'onClick':'onPress']();assert(diagnostics.overlay);
  find(menu,/performance/i).props[platform==='web'?'onClick':'onPress']();assert.equal(opened,1);
  const panel=()=>platform==='web'?m.GamePerformancePanel(props):m.NativePanel(props);
  let ui=panel();find(ui,'Start recording').props[platform==='web'?'onClick':'onPress']();assert.equal(started,1);assert(diagnostics.recording);
  ui=panel();assert(!find(ui,'Export log'),'No expensive export during active recording');find(ui,'Stop recording').props[platform==='web'?'onClick':'onPress']();assert(!diagnostics.recording);
  ui=panel();assert(find(ui,'Export log'));find(ui,'Back to pause').props[platform==='web'?'onClick':'onPress']();assert.equal(back,1);
  props.defeated=true;ui=panel();assert(find(ui,'New recording').props.disabled,'Cannot resume a defeated run');
  assert(nodes(ui).filter(n=>n.type==='pressable').every(n=>{const styles=[n.props.style].flat().filter(Boolean);return styles.some(s=>s.minHeight>=44)}),'Native tap targets >=44 points');
 }
 const stopped=new Recorder();stopped.start(0,{});frame(stopped,0);frame(stopped,16);stopped.stop(20);
 await m.exportNativePerformanceLog(stopped);assert.equal(globalThis.__performanceFiles.length,1);assert.equal(JSON.parse(globalThis.__performanceFiles[0].text).summary.frames,1);assert.equal(globalThis.__performanceShares[0].options.mimeType,'application/json');assert.match(globalThis.__performanceShares[0].uri,/\.json$/);
 globalThis.__sharingAvailable=false;await assert.rejects(()=>m.exportNativePerformanceLog(stopped),/unavailable/);assert.equal(globalThis.__performanceFiles.length,1,'No file written when sharing unavailable');
 // A development build posts the log to the Expo server that served it, which writes performance-logs/.
 const originalFetch=globalThis.fetch;let posted;
 globalThis.fetch=async(url,init)=>{posted={url,init};return{ok:true,status:200,text:async()=>JSON.stringify({ok:true,latest:'performance-logs/latest.json'})}};
 assert.equal(await m.saveNativePerformanceLogToComputer(stopped),'performance-logs/latest.json');
 assert.equal(posted.url,'http://192.168.1.20:8081/__performance-log');assert.equal(posted.init.method,'POST');assert.equal(JSON.parse(posted.init.body).summary.frames,1);
 globalThis.fetch=async()=>({ok:false,status:404,text:async()=>'Not found'});await assert.rejects(()=>m.saveNativePerformanceLogToComputer(stopped),/restart/,'An Expo server without the log route asks for a restart');
 globalThis.__nativeModules.SourceCode.scriptURL=undefined;await assert.rejects(()=>m.saveNativePerformanceLogToComputer(stopped),/Export log/,'Without a dev server the log is exported instead');
 globalThis.fetch=originalFetch;
 // Native/web use the same report; exercise browser download and share routes.
 const originalNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator'),originalDocument=globalThis.document,originalTimeout=globalThis.setTimeout;
 let shared,downloaded=false;Object.defineProperty(globalThis,'navigator',{value:{canShare:()=>true,share:async data=>{shared=data}},configurable:true});
 await m.exportPerformanceLog(stopped);assert.equal(shared.files[0].type,'application/json');assert.equal(JSON.parse(await shared.files[0].text()).summary.frames,1);
 globalThis.navigator.canShare=()=>false;globalThis.document={body:{appendChild(){}},createElement:()=>({click(){downloaded=true},remove(){}})};globalThis.setTimeout=fn=>{fn();return 0};await m.exportPerformanceLog(stopped);assert(downloaded);
 globalThis.document=originalDocument;globalThis.setTimeout=originalTimeout;if(originalNavigator)Object.defineProperty(globalThis,'navigator',originalNavigator);else delete globalThis.navigator;
 // The hook installs zero polling intervals when disabled and 500ms while on.
 const interval=globalThis.setInterval,clear=globalThis.clearInterval;let intervals=0,clears=0;globalThis.setInterval=(fn,ms)=>{assert.equal(ms,500);intervals++;return 1};globalThis.clearInterval=()=>clears++;
 for(const enabled of [false,true]){effects.length=0;const recorder=new Recorder();recorder.setOverlay(enabled);m.usePerformanceSnapshot(recorder);const cleanups=effects.map(f=>f());assert.equal(intervals,enabled?1:0);for(const cleanup of cleanups)cleanup?.()}
 assert.equal(clears,1);globalThis.setInterval=interval;globalThis.clearInterval=clear;
 // Collector-only benchmark. No claim that this models phone/GPU/React overhead.
 const bench=(kind)=>{const samples=[];for(let run=0;run<7;run++){const recorder=new Recorder();if(kind==='recording')recorder.start(0,{});if(kind==='overlay')recorder.setOverlay(true);let active=0;const begin=performance.now();for(let i=0;i<100000;i++){if(kind==='baseline'){active+=i&1;continue}if(recorder.beginFrame(i*4,'playing')){recorder.endFrame(1.5,3,1);active++}if(recorder.sampleDue(i*4))recorder.sample(i*4,{scene:'camp',placed:15000})}samples.push((performance.now()-begin)/100000);assert(active>=0)}samples.sort((a,b)=>a-b);return samples[3]};
 const benchmark=Object.fromEntries(['baseline','off','overlay','recording'].map(kind=>[kind,bench(kind)]));
 const result={passed:true,collectorMedianMsPerFrame:benchmark,bufferBytes:120000*((6+m.PERFORMANCE_PHASES.length)*4+1),checks:['off by default, zero recording buffer and UI polling','30/60/120Hz cadence','unclamped hitch and percentiles','pause, bag and background excluded','bounded frame buffer, samples and recording duration','no per-frame React notifications','export only after Stop','zero-frame logs, replacement and finite numbers','web/native menu handlers, toggle, start/stop and export states','native file/share adapter and web download/share adapters','dev-build log saved to this computer through the Expo server','44-point native tap targets'],limitations:['No browser UI or physical iPhone session in this check.','Benchmark covers collector code only on the build host, not total diagnostics overhead or GPU/display FPS.']};
 fs.mkdirSync('docs/qa/performance-v2',{recursive:true});fs.writeFileSync('docs/qa/performance-v2/checks.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}

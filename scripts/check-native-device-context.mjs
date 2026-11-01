import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'native-device-context-'));
try{
 await build({entryPoints:['native/device-context.ts'],bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs'),logLevel:'error'});
 const {NativeDeviceContextSampler,deviceContextDetail}=createRequire(import.meta.url)(path.join(temp,'model.cjs'));
 const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};
 let now=1000,nextTimer=0;const timers=new Map(),calls=[],traces=[];
 const clock={now:()=>now,later:(callback,delay)=>{const id=++nextTimer;timers.set(id,{callback,at:now+delay});return id},cancel:id=>timers.delete(id)};
 const advance=async ms=>{now+=ms;for(const [id,timer] of [...timers])if(timer.at<=now){timers.delete(id);timer.callback()}await flush()};
 const recorder={recording:true,session:1,activity:'playing',trace:(...args)=>traces.push(args),read:()=>({activity:recorder.activity})};
 const bridge={sample:(session,sequence)=>new Promise((resolve,reject)=>calls.push({session,sequence,resolve,reject}))};
 const valid=call=>({session:call.session,sequence:call.sequence,nativeUptimeMs:123400,nativeSampleMs:.04,thermalState:'fair',lowPowerMode:true,memoryStatus:0,memoryAvailable:true,residentBytes:120000000,physicalFootprintBytes:140000000});
 const sampler=new NativeDeviceContextSampler(recorder,bridge,'ios',clock);
 sampler.configure(false);await advance(5000);assert.equal(calls.length,0);assert.equal(timers.size,0);
 sampler.configure(true);await flush();assert.equal(calls.length,1);assert.equal(timers.size,0);
 for(let i=0;i<10;i++){await advance(2000);sampler.configure(true)}
 assert.equal(calls.length,1,'A stalled native request never queues more requests or timer ticks');
 sampler.configure(false);calls[0].resolve(valid(calls[0]));await flush();assert.equal(timers.size,0);
 assert(!traces.some(t=>t[1]==='native-device-context'),'Background/paused request results are ignored');
 sampler.configure(true);await flush();assert.equal(calls.length,2);
 recorder.recording=false;sampler.configure(true);recorder.session=2;recorder.recording=true;sampler.configure(true);await flush();
 assert.equal(calls.length,2,'A new session waits for the previous request to finish');
 calls[1].resolve(valid(calls[1]));await flush();await advance(0);assert.equal(calls.length,3);
 assert.equal(calls[2].session,2);assert.equal(calls[2].sequence,1);
 now+=7;calls[2].resolve(valid(calls[2]));await flush();
 const sample=traces.find(t=>t[1]==='native-device-context');assert(sample);assert.equal(sample[4],2);assert.equal(sample[2],7);
 assert.equal(sample[3].residentBytes,120000000);assert.equal(sample[3].physicalFootprintBytes,140000000);assert.equal(sample[3].thermalState,'fair');
 assert.equal(sample[3].session,2);assert.equal(sample[3].sequence,1);assert.equal(sample[3].lowPowerMode,true);
 assert(!('gpuMs' in sample[3])&&!('fps' in sample[3]),'Native context does not fabricate GPU/display measurements');
 await advance(1999);assert.equal(calls.length,3);await advance(1);assert.equal(calls.length,4);
 const noMemory={...valid(calls[3]),memoryStatus:5,memoryAvailable:false};delete noMemory.residentBytes;delete noMemory.physicalFootprintBytes;
 calls[3].resolve(noMemory);await flush();const latest=traces.filter(t=>t[1]==='native-device-context').at(-1);
 assert.equal(latest[3].memoryAvailable,false);assert(!('residentBytes' in latest[3]),'Unavailable memory is not reported as zero');
 assert.equal(deviceContextDetail({...noMemory,memoryAvailable:true}),null,'Incomplete successful memory payloads are rejected');
 assert.equal(deviceContextDetail({...noMemory,nativeUptimeMs:NaN}),null);
 recorder.activity='paused';await advance(2000);assert.equal(calls.length,4,'Synchronous pause activity suppresses sampling before a React commit');
 sampler.configure(false);assert.equal(timers.size,0);recorder.activity='playing';sampler.configure(true);await flush();
 for(let i=0;i<3;i++){calls.at(-1).reject(Error('unavailable'));await flush();if(i<2)await advance(2000)}
 assert.equal(timers.size,0,'Repeated native failure stops diagnostic work for this activation');
 assert.equal(traces.filter(t=>t[1]==='native-device-context-error').length,3);
 sampler.stop();await advance(20000);assert.equal(timers.size,0);
 const count=calls.length;recorder.session=3;
 const missing=new NativeDeviceContextSampler(recorder,null,'ios',clock);missing.configure(true);missing.configure(true);await advance(10000);
 const capability=traces.filter(t=>t[1]==='native-device-context-capability'&&t[4]===3);
 assert.equal(capability.length,1);assert.equal(capability[0][3].available,false);assert.equal(timers.size,0);assert.equal(calls.length,count);
 missing.stop();

 // Resolve the actual local Expo module using the installed SDK's autolinker.
 // This validates registration/pod discovery, not compilation by Xcode.
 const resolve=JSON.parse(execFileSync(process.execPath,['node_modules/expo-modules-autolinking/bin/expo-modules-autolinking','resolve','--platform','apple','--json'],{cwd:'native',encoding:'utf8',maxBuffer:8*1024*1024}));
 const local=resolve.modules.find(m=>m.packageName==='game-diagnostics');assert(local,'The app-local module is discovered');
 assert(local.modules.some(m=>m==='GameDiagnosticsModule'||m.class==='GameDiagnosticsModule'),'The Swift class is registered');
 assert(local.pods.some(p=>p.podName==='GameDiagnostics'),'The local pod is linked');
 console.log(JSON.stringify({passed:true,checks:['recording/foreground gating','one request across session switches','stale results ignored','sample cadence','missing module fallback','memory validity','bounded failures','Expo module registration'],nativeCompilationTested:false,physicalIPhoneTested:false}));
}finally{fs.rmSync(temp,{recursive:true,force:true})}

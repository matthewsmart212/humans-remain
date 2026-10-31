import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire}from'node:module';import{build}from'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'road-stream-'));
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/road-art-stream';export * from './src/world-road-pilot';export * from './src/east-approach';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'test.cjs')});
 const m=createRequire(import.meta.url)(path.join(temp,'test.cjs'));let pending=[],released=[],loaded=[],time=Date.now();
 const stream=new m.RoadArtStream(s=>new Promise((resolve,reject)=>pending.push({key:Object.keys(s)[0],resolve,reject})),keys=>released.push(...keys));
 const all={x:-1000,y:2000,width:900,height:1200};
 const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};
 stream.update(all,1,time);assert.equal(pending.length,2);
 while(pending.length){const jobs=pending;pending=[];for(const j of jobs){loaded.push(j.key);j.resolve()}await settle();assert(stream.pendingCount<=2);assert(stream.residentBytes+stream.pendingBytes<=48*1024*1024)}
 const initialCount=stream.residentCount;assert(initialCount>0);assert.equal(loaded.length,initialCount);
 stream.update(all,.1,time+=201);assert.equal(stream.residentCount,0);assert.equal(released.length,initialCount);
 stream.update(all,1,time+=201);assert.equal(pending.length,2);
 stream.update({x:50000,y:50000,width:100,height:100},1,time+=201);
 for(const j of pending)j.resolve();pending=[];await settle();assert.equal(stream.residentCount,0);assert.equal(stream.pendingCount,0);assert.equal(released.length,initialCount+2);
 stream.update(all,1,time+=201);const failures=pending;pending=[];for(const j of failures)j.reject(Error('offline'));await settle();
 assert(!pending.some(j=>failures.some(f=>f.key===j.key)),'Immediate retry loop');
 stream.dispose();for(const j of pending)j.resolve();pending=[];await settle();assert.equal(stream.residentCount,0);assert.equal(stream.pendingCount,0);
 const result={result:'pass',residentBudgetMiB:48,concurrentFetchLimit:2,zoomOutReleases:true,staleCompletionsRelease:true,failedRequestsBackOff:true,disposeReleases:true};
 fs.writeFileSync('docs/qa/complete-roads-v1/stream-checks.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{fs.rmSync(temp,{recursive:true,force:true})}

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'world-surface-')),require=createRequire(import.meta.url);
try{
 await build({entryPoints:['src/web-world-surface.ts'],bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'surface.cjs')});
 const {createWebWorldSurface}=require(path.join(temp,'surface.cjs'));
 globalThis.devicePixelRatio=3;
 let handles=0,contexts=0,liveContexts=0,liveSurfaces=0,peakSurfaces=0,deleted=0,abandoned=0,budget=0,failGPU=false;
 const canvas={clientWidth:390,clientHeight:700,width:0,height:0,dataset:{}},events=[];
 const makeSurface=()=>{liveSurfaces++;peakSurfaces=Math.max(peakSurfaces,liveSurfaces);return{dispose(){events.push('surface');assert.equal(liveSurfaces,1);liveSurfaces--}}};
 const kit={ColorSpace:{SRGB:{}},GetWebGLContext(){handles++;return failGPU?0:7},MakeWebGLContext(){contexts++;liveContexts++;return{setResourceCacheLimitBytes(n){budget=n},getResourceCacheLimitBytes(){return budget},getResourceCacheUsageBytes(){return 1234},releaseResourcesAndAbandonContext(){events.push('abandon');abandoned++},delete(){events.push('context');liveContexts--}}},MakeOnScreenGLSurface(context,w,h){assert.equal(liveSurfaces,0,'Old framebuffer freed before allocating its replacement');assert.equal(w,canvas.width);assert.equal(h,canvas.height);return makeSurface()},MakeSWCanvasSurface:makeSurface,deleteContext(){events.push('handle');deleted++}};
 const owner=createWebWorldSurface(kit,canvas);
 const first=owner.ensure(0);assert.equal(canvas.width,780);assert.equal(canvas.dataset.skiaBackend,'webgl');assert.equal(budget,192*1024*1024);assert.deepEqual(owner.stats(),{backend:"webgl",gpuCacheBytes:1234,gpuCacheLimitBytes:budget,bufferWidth:780,bufferHeight:1400});
 owner.setActive(false);assert.equal(budget,0,'Hidden tabs release disposable GPU cache');owner.setActive(false);owner.setActive(true);assert.equal(budget,192*1024*1024);assert.equal(owner.ensure(1),first,'Returning to the tab reuses its framebuffer and context');
 // Repeat portrait/landscape and the intermediate Safari toolbar dimensions.
 for(let i=0;i<100;i++){
  const start=1000+i*1000;
  canvas.clientWidth=i%2?390:844;canvas.clientHeight=i%2?700:300;
  const old=owner.ensure(start);canvas.clientHeight+=5;assert.equal(owner.ensure(start+40),old);
  assert.equal(owner.ensure(start+100),old,'Animated viewport does not allocate every frame');
  const next=owner.ensure(start+161);assert.notEqual(next,old);assert.equal(owner.ensure(start+200),next);
 }
 assert.equal(handles,1);assert.equal(contexts,1);assert.equal(liveContexts,1);assert.equal(peakSurfaces,1);
 canvas.clientWidth=0;assert.equal(owner.ensure(200000),null,'Hidden canvas allocates nothing');canvas.clientWidth=390;
 owner.dispose();owner.dispose();assert.equal(liveSurfaces,0);assert.equal(liveContexts,0);assert.equal(abandoned,1);assert.equal(deleted,1);assert.deepEqual(events.slice(-4),['surface','abandon','context','handle']);assert.throws(()=>owner.ensure(),/closed/);
 failGPU=true;const fallback=createWebWorldSurface(kit,canvas),software=fallback.ensure(0);assert(software);assert.equal(canvas.dataset.skiaBackend,'software');canvas.clientWidth=844;assert.notEqual(fallback.ensure(1),software,'Raster snapshots resize synchronously without a GPU framebuffer animation');fallback.dispose();assert.equal(liveSurfaces,0);
 failGPU=false;kit.MakeWebGLContext=()=>null;const failed=createWebWorldSurface(kit,canvas);assert.throws(()=>failed.ensure(0),/context could not open/);assert.equal(deleted,2,'Failed GPU initialization releases its handle without replacing the DOM canvas');failed.dispose();
 // Retry while loading/unmounting, before the first actual canvas frame.
 const unused=createWebWorldSurface(kit,canvas),before=handles;unused.dispose();assert.equal(handles,before);
 // Match the installed CanvasKit wrappers: they activate the context and call
 // the raw getter, but drop its return value. Check the actual compatibility path.
 let activated=false;
 kit.MakeWebGLContext=()=>({setResourceCacheLimitBytes(n){budget=n},getResourceCacheUsageBytes(){activated=true;this._getResourceCacheUsageBytes()},getResourceCacheLimitBytes(){activated=true;this._getResourceCacheLimitBytes()},_getResourceCacheUsageBytes(){assert(activated);return 5678},_getResourceCacheLimitBytes(){assert(activated);return budget},releaseResourcesAndAbandonContext(){},delete(){}});
 const compatibility=createWebWorldSurface(kit,canvas);compatibility.ensure(0);assert.equal(compatibility.stats().gpuCacheBytes,5678);assert.equal(compatibility.stats().gpuCacheLimitBytes,192*1024*1024);compatibility.dispose();
 kit.MakeWebGLContext=()=>({setResourceCacheLimitBytes(){},getResourceCacheUsageBytes(){return undefined},getResourceCacheLimitBytes(){throw Error('Unavailable')},releaseResourcesAndAbandonContext(){},delete(){}});
 const unavailable=createWebWorldSurface(kit,canvas);unavailable.ensure(0);assert.equal(unavailable.stats().gpuCacheBytes,null);assert.equal(unavailable.stats().gpuCacheLimitBytes,null);unavailable.dispose();
 console.log('PASS: 100 rotations with one graphics context, one live framebuffer, debounced toolbar resize, bounded GPU cache, software fallback and complete/idempotent cleanup.');
}finally{delete globalThis.devicePixelRatio;fs.rmSync(temp,{recursive:true,force:true})}

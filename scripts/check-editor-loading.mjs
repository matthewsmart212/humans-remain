import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {build} from 'esbuild';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require('sharp'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'editor-loading-')),originalFetch=globalThis.fetch,originalWindow=globalThis.window,originalProcessType=process.type;
try{
 await build({stdin:{contents:`export * from './src/world-assets';export * from './src/artwork-loading';export * from './src/editor-image-sources';export * from './src/world-layout';export * from './src/imported-art';export * from './src/skia-web';export * from './src/placed-world-renderer';export * from './src/survival-engine';export * from './src/terrain-art';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'test.cjs')});
 const m=require(path.join(temp,'test.cjs'));
 // A network request or its body can stall, even when the server has sent 200 OK.
 let aborted=false;
 globalThis.fetch=async(_url,{signal})=>{signal.addEventListener('abort',()=>aborted=true);return new Promise(()=>{})};
 await assert.rejects(m.fetchArtworkBytes('/stalled',undefined,25),/stalled/);assert(aborted);
 globalThis.fetch=async()=>({ok:true,arrayBuffer:()=>new Promise(()=>{})});await assert.rejects(m.fetchArtworkBytes('/stalled-body',undefined,25),/stalled/);
 let fetches=0;
 globalThis.fetch=async()=>{fetches++;return new Response('Not found',{status:404})};await assert.rejects(m.fetchArtworkBytes('/missing',undefined,100),/404/);assert.equal(fetches,1,'Permanent missing files are not retried');
 // A failed request/body must recover in place, without restarting the world.
 fetches=0;globalThis.fetch=async()=>{if(++fetches===1)throw new TypeError('Load failed');return new Response(new Uint8Array([1,2,3]))};assert.deepEqual(await m.fetchArtworkBytes('/interrupted'),new Uint8Array([1,2,3]));assert.equal(fetches,2);
 fetches=0;globalThis.fetch=async()=>{fetches++;return fetches===1?{ok:true,arrayBuffer:async()=>{throw new TypeError('Load failed')}}:new Response(new Uint8Array([4]))};assert.deepEqual(await m.fetchArtworkBytes('/interrupted-body'),new Uint8Array([4]));assert.equal(fetches,2);
 fetches=0;globalThis.fetch=async()=>++fetches<3?new Response('Temporarily unavailable',{status:503}):new Response(new Uint8Array([5]));assert.deepEqual(await m.fetchArtworkBytes('/temporary-server-error'),new Uint8Array([5]));assert.equal(fetches,3);
 fetches=0;globalThis.fetch=async()=>{fetches++;throw new TypeError('Load failed')};await assert.rejects(m.fetchArtworkBytes('/offline'),/interrupted/);assert.equal(fetches,3,'Retries are bounded');
 const duringRetry=new AbortController();fetches=0;globalThis.fetch=async()=>{fetches++;throw new TypeError('Load failed')};const retrying=m.fetchArtworkBytes('/cancel-retry',duringRetry.signal);queueMicrotask(()=>duringRetry.abort());await assert.rejects(retrying,{name:'AbortError'});assert.equal(fetches,1,'Cancellation stops retries immediately');
 const cancelled=new AbortController();const waiting=m.loadingDeadline(new Promise(()=>{}),10000,cancelled.signal);cancelled.abort();await assert.rejects(waiting,{name:'AbortError'});
 // Foreground and background requests share a bounded pool and a single decode per URL.
 let active=0,peak=0;const calls=[],released=[],progress=[];
 const pool=m.createArtworkLoader(async(url)=>{calls.push(url);active++;peak=Math.max(peak,active);await new Promise(resolve=>setTimeout(resolve,5));active--;return{url}},image=>released.push(image.url),3);
 await Promise.all([pool.load({a:'/a',alias:'/a',b:'/b',c:'/c'},p=>progress.push(p)),pool.load({d:'/d',a2:'/a',e:'/e'})]);assert.equal(peak,3);assert.equal(calls.length,5);assert.equal(pool.images.a,pool.images.a2);assert.equal(pool.images.a,pool.images.alias);assert.deepEqual(progress.at(-1),{loaded:3,total:3});
 await pool.load({a:'/a'});assert.equal(calls.length,5);pool.release(['alias','a']);assert(!released.includes('/a'),'A shared texture survives while another key uses it');pool.release(['a2']);assert(released.includes('/a'));pool.dispose();pool.dispose();assert.equal(released.length,5);
 let attempt=0;const retry=m.createArtworkLoader(async()=>{if(!attempt++)throw Error('offline');return'loaded'},()=>{});await assert.rejects(retry.load({image:'/retry'}),/offline/);await retry.load({image:'/retry'});assert.equal(retry.images.image,'loaded');retry.dispose();
 let finishDecode;const lateDisposed=[];const late=m.createArtworkLoader(()=>new Promise(resolve=>finishDecode=resolve),image=>lateDisposed.push(image),1),lateTask=late.load({a:'/slow',b:'/queued'});const rejected=assert.rejects(lateTask,{name:'AbortError'});late.dispose();finishDecode('late image');await rejected;await new Promise(resolve=>setTimeout(resolve,0));assert.deepEqual(lateDisposed,['late image']);assert.deepEqual(late.images,{});
 assert(!Object.keys(m.EDITOR_IMAGE_SOURCES).some(k=>k.startsWith('showcase')||k.startsWith('hearth')||k.startsWith('homeTerrain')));
 assert(m.editorTerrainDetail().worldGroundWarm);assert(m.editorTerrainDetail().worldGroundBrown);assert(!('homeGround' in m.editorTerrainDetail()));assert.deepEqual(m.editorTerrainDetail({url:'/custom-map.png'}),{});
 // Decode and draw the user's actual saved scene through the production CanvasKit renderer.
 const [artworkPath,layoutPath,qaDir]=process.argv.slice(2);
 if(artworkPath&&layoutPath){
  m.installImportedArt(JSON.parse(fs.readFileSync(artworkPath)).records);const layout=JSON.parse(fs.readFileSync(layoutPath)).draft,layoutJSON=JSON.stringify(layout),requested=[],updates=[];
  const resolve=url=>url.startsWith('/api/asset-files/')?path.resolve(qaDir,path.basename(url)+'.image'):path.resolve('public'+url);
  let failGraphics=3;delete globalThis.CanvasKit;
  // Exercise CanvasKit's browser fetch/streaming path instead of its Node filesystem loader.
  globalThis.window={};process.type='renderer';
  globalThis.fetch=async url=>{if(String(url).startsWith('blob:'))return originalFetch(url);requested.push(String(url));if(String(url).endsWith('.wasm')&&failGraphics>0){failGraphics--;return new Response('Temporary failure',{status:503})}return new Response(fs.readFileSync(resolve(String(url))))};
  globalThis.devicePixelRatio=1;let surface;
  const canvas={width:0,height:0,clientWidth:1200,clientHeight:800,dataset:{}};
  await assert.rejects(m.createWebWorld(canvas,()=>{}),/503/);
  const r=await m.createWebWorld(canvas,(ctx,atlas,imgs,w)=>m.drawWorldEditor(ctx,atlas,imgs,w,{x:1700,y:1600,zoom:.3,follow:false,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false}),m.editorEntryArtwork(layout),{sources:m.EDITOR_ENTRY_IMAGES,onProgress:(stage,p)=>updates.push({stage,...p})});
  const kit=globalThis.CanvasKit;assert(kit,'graphics download and initialization recovered on retry');kit.MakeSWCanvasSurface=canvas=>(surface=kit.MakeSurface(canvas.width,canvas.height));
  const coreRequests=[...requested],scene=m.createWorld(layout);r.draw(scene);
  const saveShot=name=>{const image=surface.makeImageSnapshot();fs.writeFileSync(path.join(qaDir,name),Buffer.from(image.encodeToBytes()));image.delete()};
  saveShot('editor-before-hd.png');assert(!coreRequests.some(url=>m.HOME_TERRAIN_TILES.some(t=>t.image===url)),'editor opens before any large terrain tile is requested');assert.equal(updates.at(-1).loaded,updates.at(-1).total);
  for(const [key,url]of Object.entries(m.editorTerrainDetail(layout.terrainImage))){await r.loadImages({[key]:url});r.draw(scene)}saveShot('editor-after-hd.png');
  let startBytes=0,decodedBytes=0;
  for(const url of new Set(coreRequests)){if(url.endsWith('.wasm'))continue;startBytes+=fs.statSync(resolve(url)).size;if(!/json$|ttf$/.test(url)){const meta=await sharp(resolve(url)).metadata();decodedBytes+=meta.width*meta.height*4}}
  assert(startBytes<30*1048576,'scene-specific startup stays below 30 MB');assert(decodedBytes<220*1048576,'no old scene textures in memory');
  assert.equal(JSON.stringify(layout),layoutJSON);r.dispose();r.dispose();
  console.log(`PASS: graphics engine recovers after a failed first download; real saved camp opens and draws before HD downloads; ${(startBytes/1048576).toFixed(1)} MB startup artwork, ${(decodedBytes/1048576).toFixed(1)} MB decoded. Original HD terrain sharpens in place; all draft placements unchanged.`);
 }
 console.log('PASS: stalled fetch/body deadlines, HTTP failures, cancellation, three-request limit, shared URL decoding, progress, retry after failure, queued/late resource cleanup.');
}finally{globalThis.fetch=originalFetch;globalThis.window=originalWindow;process.type=originalProcessType;fs.rmSync(temp,{recursive:true,force:true})}

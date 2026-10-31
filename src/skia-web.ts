import {createTerrainArtStreams} from './terrain-art-streams';
import {RIVER_DETAIL_IMAGES} from './river-art';
// CanvasKit is bundled on our own origin; no CDN dependency during a run.
import CanvasKitInit from 'canvaskit-wasm/bin/full/canvaskit';
import {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';
import {JsiSkSurface} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkSurface';
import {JsiSkImage} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkImage';
import {createSkiaAdapter} from './skia-adapter';
import {campLights} from './camp-lighting';
import type {World} from './survival-engine';
import type {Atlas} from './packaging-renderer';
import {EDITOR_ENTRY_IMAGES} from './editor-image-sources';
type WorldDraw=(ctx:CanvasRenderingContext2D,atlas:Atlas,imgs:Record<string,HTMLImageElement>,world:World)=>void;
import type {SkImage} from '@shopify/react-native-skia';
import {createArtworkLoader,fetchArtworkBytes,loadingDeadline,artworkFailureDetails,type ArtworkProgress,type ArtworkPriority} from './artwork-loading';
import {ROAD_PILOT_IMAGES} from './world-road-pilot';
import {decodeWebArtwork} from './web-artwork-decoder';
import {createWebWorldSurface} from './web-world-surface';
import type {TerrainView} from './outdoor-terrain';
import {TERRAIN_CHUNK_IMAGES,streamPatches,RIVER_TEXTURE_SIZES} from './terrain-stream-art';
import type {GamePerformanceRecorder,PerformancePhase} from './performance-recording';
import {observeBrowserPerformance} from './browser-performance';
import {GameplayArtwork,gameplayImageSources,PLAYER_MOVEMENT_IMAGES} from './gameplay-artwork';
type LoadOptions={sources?:Record<string,string>;streamRoads?:boolean;streamRivers?:boolean;signal?:AbortSignal;diagnostics?:GamePerformanceRecorder;onProgress?:(stage:string,progress?:ArtworkProgress)=>void};
let graphics:Promise<void>|undefined;
async function loadGraphics(signal?:AbortSignal){
 if((globalThis as any).CanvasKit)return;
 // A failed download can be retried; the library's shared rejected promise could not.
 graphics??=(async()=>{
  const bytes=await fetchArtworkBytes('/skia/canvaskit.wasm'),url=URL.createObjectURL(new Blob([bytes],{type:'application/wasm'}));
  try{(globalThis as any).CanvasKit=await loadingDeadline(CanvasKitInit({locateFile:()=>url}),45000)}finally{URL.revokeObjectURL(url)}
 })().catch(e=>{graphics=undefined;throw e});
 await loadingDeadline(graphics,60000,signal,'The graphics engine could not finish loading. Please retry.');
}
export async function createWebWorld(canvas:HTMLCanvasElement,showcase:WorldDraw,extraImages:Record<string,string>={},options:LoadOptions={}){
 options.onProgress?.('Starting the graphics engine…');
 const [,fontBytes]=await Promise.all([loadGraphics(options.signal),fetchArtworkBytes('/fonts/barlow-condensed-black.ttf',options.signal)]);
 const kit=(globalThis as any).CanvasKit,skia=JsiSkApi(kit);
 options.onProgress?.('Preparing the workshop…');
 const atlas={} as Atlas;
 const fontData=skia.Data.fromBytes(fontBytes),face=skia.Typeface.MakeFreeTypeFaceFromData(fontData);fontData.dispose();if(!face)throw Error('Font unavailable');const font=skia.Font(face,30);
 let adapter:ReturnType<typeof createSkiaAdapter>;
 const diagnostics=options.diagnostics,keyByUrl=new Map<string,string>(),loading=new Map<string,{stage:string;since:number}>();
 const rememberSources=(sources:Record<string,string>)=>{for(const [key,url]of Object.entries(sources))if(!keyByUrl.has(url))keyByUrl.set(url,key)};
 const terrainUrls=new Set([...Object.values(ROAD_PILOT_IMAGES),...Object.values(RIVER_DETAIL_IMAGES),...Object.values(TERRAIN_CHUNK_IMAGES)]),bitmaps=new WeakMap<SkImage,ImageBitmap>();
 const loader=createArtworkLoader<SkImage>(async(url,signal)=>{
  const key=(keyByUrl.get(url)||'unmapped-artwork').slice(0,96),started=performance.now(),session=diagnostics?.session;
  loading.set(key,{stage:'download',since:started});
  if(diagnostics?.recording)diagnostics.trace(started,'download-start',0,{key},session);
  try{
  const bytes=await fetchArtworkBytes(url,signal),decodeStart=performance.now();
  if(diagnostics?.recording)diagnostics.trace(started,'download',decodeStart-started,{key,encodedBytes:bytes.byteLength},session);
  loading.set(key,{stage:'decode',since:decodeStart});
  const decoded=await decodeWebArtwork<SkImage>(bytes,signal,encoded=>{
   const data=skia.Data.fromBytes(encoded);
   try{const image=skia.Image.MakeImageFromEncoded(data);if(!image)throw Error('An artwork image could not be opened. Please retry.');return image}finally{data.dispose()}
  },terrainUrls.has(url)&&canvas.dataset.skiaBackend==='webgl'?bitmap=>new JsiSkImage(kit,kit.MakeLazyImageFromTextureSource(bitmap,undefined,false)):undefined);
  if(decoded.bitmap)bitmaps.set(decoded.image,decoded.bitmap);
  if(diagnostics?.recording)diagnostics.trace(decodeStart,'decode',performance.now()-decodeStart,{key,mode:decoded.mode,fallback:decoded.fallback||'none',width:decoded.image.width(),height:decoded.image.height()},session);
  return decoded.image;
  }catch(error){if(diagnostics?.recording)diagnostics.trace(started,'artwork-failed',performance.now()-started,{key,stage:loading.get(key)?.stage||'unknown',aborted:signal.aborted,...artworkFailureDetails(error)},session);throw error}finally{loading.delete(key)}
 },im=>{adapter?.releaseImage(im);try{im.dispose()}finally{bitmaps.get(im)?.close();bitmaps.delete(im)}});
 // Decoded images are private until their requested preparation is complete.
 // In particular, streamed detail cannot bypass the one-texture-per-frame queue
 // simply because its download resolved before the next frame.
 const imgs:Record<string,SkImage>={};
 const publishImages=(sources:Record<string,string>)=>{for(const key of Object.keys(sources))if(loader.images[key])imgs[key]=loader.images[key]};
 const loadImages:typeof loader.load=async(sources,progress,priority)=>{rememberSources(sources);await loader.load(sources,p=>{publishImages(sources);progress?.(p)},priority);publishImages(sources)};
 const cancel=()=>loader.dispose();options.signal?.addEventListener('abort',cancel,{once:true});if(options.signal?.aborted)cancel();
 try{await loadImages({... (options.sources??EDITOR_ENTRY_IMAGES),...extraImages},progress=>options.onProgress?.('Loading your camp artwork…',progress));adapter=createSkiaAdapter(skia,diagnostics)}catch(e){loader.dispose();options.signal?.removeEventListener('abort',cancel);font.dispose();face.dispose();throw e}
 const {SkiaContext,warmLighting,disposeLighting}=adapter;
 const drawingSurface=createWebWorldSurface(kit,canvas);
 let surface:JsiSkSurface|undefined,rawSurface:unknown;
 let disposed=false;
 const warmedImages=new WeakSet<SkImage>(),warming=new Map<string,{resolve:()=>void;reject:(error:Error)=>void}[]>(),urgentWarm=new Set<string>();
 const warmSince=new Map<string,number>(),preparationPaint=skia.Paint();
 const warmImages=async(sources:Record<string,string>,priority:ArtworkPriority='foreground')=>{
  if(disposed)throw Error('Renderer closed');
  rememberSources(sources);
  if(priority==='foreground')for(const key of Object.keys(sources))urgentWarm.add(key);
  try{
  await loader.load(sources,undefined,priority);
  await Promise.all(Object.keys(sources).map(key=>loader.images[key]&&warmedImages.has(loader.images[key])?Promise.resolve():new Promise<void>((resolve,reject)=>{if(disposed){reject(Error('Renderer closed'));return}if(!warmSince.has(key))warmSince.set(key,performance.now());warming.set(key,[...(warming.get(key)||[]),{resolve,reject}])})));
  if(disposed)throw Error('Renderer closed');
  publishImages(sources);
  }finally{for(const key of Object.keys(sources))urgentWarm.delete(key)}
 };
 const releaseImages=(keys:string[])=>{for(const key of keys){delete imgs[key];urgentWarm.delete(key);warmSince.delete(key);for(const waiter of warming.get(key)||[])waiter.reject(Error('Map artwork released'));warming.delete(key)}loader.release(keys)};
 const streamSources={...TERRAIN_CHUNK_IMAGES,...RIVER_DETAIL_IMAGES};
 const promote=(keys:string[])=>{for(const key of keys)urgentWarm.add(key);loader.promote(Object.fromEntries(keys.map(k=>[k,streamSources[k]])))};
 const {roads,camp,rivers}=createTerrainArtStreams(warmImages,releaseImages,promote,diagnostics);
 const gameplay=new GameplayArtwork(sources=>warmImages(sources),releaseImages,new Set(Object.keys({...(options.sources??EDITOR_ENTRY_IMAGES),...PLAYER_MOVEMENT_IMAGES,...extraImages})));
 const stopObserving=diagnostics?observeBrowserPerformance(diagnostics,canvas):undefined;
 return {
  loadImages,
  warmImages,
  releaseImages,
  prepareGameplay:(w:World)=>gameplay.update(gameplayImageSources(w),performance.now(),true),
  updateGameplay:(w:World,active:boolean)=>{void gameplay.update(active?gameplayImageSources(w):{}).catch(()=>{/* A later update retries interrupted optional artwork. */})},
  setActive(active:boolean){drawingSurface.setActive(active);if(!active)gameplay.clear()},
  textureStats:()=>{const now=performance.now();return {graphics:{...drawingSurface.stats(),shaderFieldBytes:adapter.shaderFieldBytes()},roads:roads.stats(),camp:camp.stats(),rivers:rivers.stats(),artwork:{...loader.stats(),warming:warming.size,loading:[...loading].slice(0,12).map(([key,value])=>({key,stage:value.stage,ageMs:Math.round(now-value.since)})),warmQueue:[...warming.keys()].slice(0,12).map(key=>({key,priority:urgentWarm.has(key)?'foreground':'background',ageMs:Math.round(now-(warmSince.get(key)||now))}))}}},
  draw(w:World,overview=false){if(disposed)return;
   const tracing=diagnostics?.tracing;let stamp=tracing?performance.now():0;
   const mark=(phase:PerformancePhase)=>{if(tracing){const end=performance.now();diagnostics!.phase(phase,end-stamp);stamp=end}};
   const raw=drawingSurface.ensure();if(!raw)return;
   if(rawSurface!==raw){rawSurface=raw;surface=new JsiSkSurface(kit,raw);warmLighting(surface.getCanvas(),campLights(w));if(diagnostics?.recording)diagnostics.trace(performance.now(),'surface-created',0,{width:canvas.width,height:canvas.height,backend:canvas.dataset.skiaBackend||'unknown'})}
   mark('surfaceMs');
   const width=canvas.width,height=canvas.height;
   if(!surface)return;
   // Warm one texture on the real drawing surface. Flush before the world
   // covers the pixel so Skia cannot discard an occluded warm-up draw.
   let warmKey=warming.keys().next().value as string|undefined;
   for(const key of warming.keys())if(urgentWarm.has(key)){warmKey=key;break}
   if(warmKey&&loader.images[warmKey]){
    const im=loader.images[warmKey],started=diagnostics?.recording?performance.now():0;
    surface.getCanvas().drawImageRect(im,skia.XYWHRect(0,0,im.width(),im.height()),skia.XYWHRect(0,0,1,1),preparationPaint);mark('textureDrawMs');surface.flush();mark('textureFlushMs');
    if(diagnostics?.recording)diagnostics.trace(started,'texture-warm',performance.now()-started,{key:warmKey,width:im.width(),height:im.height(),estimatedBytes:im.width()*im.height()*4,queueMs:Math.max(0,started-(warmSince.get(warmKey)||started)),priority:urgentWarm.has(warmKey)?'foreground':'background'});
   }
   if(tracing)stamp=performance.now();
   const c=surface.getCanvas(),ctx=new SkiaContext(c,width,height,font);c.save();
   if(options.streamRoads!==false)(ctx as unknown as {requestRoadArtwork:(v:TerrainView)=>void}).requestRoadArtwork=v=>roads.update(v,width/v.width);
   (ctx as unknown as {requestCampArtwork:(v:TerrainView)=>void}).requestCampArtwork=v=>camp.update(v,width/v.width);
   if(options.streamRivers!==false)(ctx as unknown as {requestRiverArtwork:(v:TerrainView)=>void}).requestRiverArtwork=v=>rivers.update(v,width/v.width);
   (ctx as unknown as {riverTime:number}).riverTime=performance.now()/1000;
   try{showcase(ctx as unknown as CanvasRenderingContext2D,atlas,imgs as unknown as Record<string,HTMLImageElement>,w)}finally{c.restore();mark('worldDrawMs');try{surface.flush();mark('submitFlushMs')}finally{ctx.dispose();mark('cleanupMs')}}
   if(warmKey){
    const im=loader.images[warmKey];
    if(im){
     // Reused ground squares share one decoded image and one GPU upload.
     warmedImages.add(im);
     for(const [key,waiters] of warming)if(loader.images[key]===im){for(const waiter of waiters)waiter.resolve();warming.delete(key);urgentWarm.delete(key);warmSince.delete(key)}
    }else{for(const waiter of warming.get(warmKey)||[])waiter.reject(Error('Map artwork is unavailable'));warming.delete(warmKey);warmSince.delete(warmKey)}
   }
  },
  dispose(){if(disposed)return;disposed=true;stopObserving?.();gameplay.dispose();roads.dispose();camp.dispose();rivers.dispose();for(const waiters of warming.values())for(const waiter of waiters)waiter.reject(Error('Renderer closed'));warming.clear();urgentWarm.clear();warmSince.clear();options.signal?.removeEventListener('abort',cancel);loader.dispose();for(const key of Object.keys(imgs))delete imgs[key];preparationPaint.dispose();disposeLighting();font.dispose();face.dispose();drawingSurface.dispose();surface=undefined;rawSurface=undefined}
 };
}

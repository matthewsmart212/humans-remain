import {CAMP_RESTORATION_ART} from './camp-restoration-art';
import {WORKSHOP_NATIVE_ART} from './workshop-animation-art';
import {FURNACE_NATIVE_ART} from './furnace-animation-art';
import {HOUND_NATIVE_ART} from './hound-art';
import {BRUTE_NATIVE_ART} from './brute-art';
import {WALKER_NATIVE_ART} from './walker-art';
import {SKITTER_NATIVE_ART} from './skitter-art';
import {Skia,type SkImage} from '@shopify/react-native-skia';
import {Asset} from 'expo-asset';
import {PixelRatio} from 'react-native';
import {FORAGE_NATIVE_ART} from './forage-art';
import {BUNDLED_ART} from './bundled-art';
import {ENGINEER_NATIVE_ART} from './engineer-art';
import {HUNTER_NATIVE_ART} from './hunter-art';
import {BOW_NATIVE_ART} from './bow-art';
import {PROVISION_NATIVE_ART} from './food-art';
import {PROVISIONS,PROVISION_IDS} from '../src/food-provisions-data';
const provisionModules:Record<string,number>=Object.fromEntries(PROVISION_IDS.map(id=>[PROVISIONS[id].image,PROVISION_NATIVE_ART[id]]));
import {BACKPACK_NATIVE_ART} from './backpack-art';
export {BACKPACK_NATIVE_ART};
import {createArtworkLoader,loadingDeadline,artworkFailureDetails,type ArtworkPriority} from '../src/artwork-loading';
import {createSkiaAdapter} from '../src/skia-adapter';
import {createTerrainArtStreams} from '../src/terrain-art-streams';
import {TERRAIN_CHUNK_IMAGES} from '../src/terrain-stream-art';
import {RIVER_DETAIL_IMAGES} from '../src/river-art';
import {drawWorldEditor,type EditorView} from '../src/placed-world-renderer';
import type {World} from '../src/survival-engine';
import type {CoopPeer} from '../src/coop-protocol';
import type {Atlas} from '../src/packaging-renderer';
import type {TerrainView} from '../src/outdoor-terrain';
import {WORLD_URL} from './config';
import type {GamePerformanceRecorder} from '../src/performance-recording';
import {NativeFrameWorkScheduler} from './frame-work-scheduler';

export const PLAY_VIEW:EditorView={x:0,y:0,zoom:1,follow:true,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:true,hideFoliage:false};

const mark=(name:string,error:unknown):never=>{const e=error instanceof Error?error:Error(String(error));e.message=`${name}: ${e.message}`;throw e};
const open=<T,>(name:string,run:()=>T):T=>{try{return run()}catch(e){return mark(name,e)}};
export async function createNativeRenderer(view:EditorView={...PLAY_VIEW},diagnostics?:GamePerformanceRecorder,sharedPreparation?:NativeFrameWorkScheduler){
 const asset=open('Font module',()=>Asset.fromModule(require('../public/fonts/barlow-condensed-black.ttf')));
 try{await asset.downloadAsync()}catch(e){mark('Font download',e)}
 const bytes=await Skia.Data.fromURI(asset.localUri||asset.uri).catch(e=>mark('Font data',e));
 const face=open('Font typeface',()=>{try{return Skia.Typeface.MakeFreeTypeFaceFromData(bytes)}finally{bytes.dispose()}});
 if(!face)throw Error('The game font could not open.');
 const font=open('Font face',()=>Skia.Font(face,30));
 const adapter=open('Skia adapter',()=>createSkiaAdapter(Skia,diagnostics));
 const keyByUrl=new Map<string,string>();
 let disposed=false,revision=0;
 const prepared:Record<string,SkImage>={};
 // Decode into Skia's process-wide bitmap cache on this thread. A GPU surface
 // here would upload a texture into the JS thread's own GPU context, which the
 // UI-thread renderer cannot use; it would only duplicate texture memory.
 const preparationSurface=open('Preparation surface',()=>Skia.Surface.Make(1,1)),preparationPaint=Skia.Paint();
 if(!preparationSurface){preparationPaint.dispose();adapter.disposeLighting();font.dispose();face.dispose();throw Error('The image preparation surface is unavailable.')}
 // Pictures retain their own image references on the render thread. Removing a
 // streamed image from the loader releases our ownership; Skia/JS GC releases
 // its native handle once the last submitted Picture has finished using it.
 const loader=createArtworkLoader<SkImage>(async(url,signal)=>{
  const started=diagnostics?.recording?performance.now():undefined,session=diagnostics?.session,key=(keyByUrl.get(url)||'unmapped-artwork').slice(0,96);
  try{
  const module=FURNACE_NATIVE_ART[url]??WORKSHOP_NATIVE_ART[url]??HUNTER_NATIVE_ART[url]??ENGINEER_NATIVE_ART[url]??HOUND_NATIVE_ART[url]??BRUTE_NATIVE_ART[url]??SKITTER_NATIVE_ART[url]??WALKER_NATIVE_ART[url]??FORAGE_NATIVE_ART[url]??provisionModules[url]??BOW_NATIVE_ART[url]??(CAMP_RESTORATION_ART[url]??BUNDLED_ART[url])??BACKPACK_NATIVE_ART[url],a=module?Asset.fromModule(module):Asset.fromURI(url.startsWith('/')?WORLD_URL+url:url);
  await loadingDeadline(a.downloadAsync(),45000,signal);
  const data=await loadingDeadline(Skia.Data.fromURI(a.localUri||a.uri),45000,signal);
  try{const image=Skia.Image.MakeImageFromEncoded(data);if(!image)throw Error('An artwork image could not open.');if(started!==undefined)diagnostics!.trace(started,'native-artwork-load',performance.now()-started,{key,mode:'skia-encoded',width:image.width(),height:image.height()},session);return image}finally{data.dispose()}
  }catch(error){if(started!==undefined)diagnostics!.trace(started,'artwork-failed',performance.now()-started,{key,aborted:signal.aborted,...artworkFailureDetails(error)},session);throw error}
 },image=>adapter.releaseImage(image),3);
 // Startup can warm before a gameplay frame exists. Once frame-managed, map
 // raster work and image preparation share the remaining gameplay allowance.
 const warmed=new WeakSet<SkImage>(),pendingWarm=new WeakMap<SkImage,Promise<void>>();
 const queue:{key:string;queuedAt:number;image:SkImage;resolve:()=>void;reject:(e:Error)=>void;priority:ArtworkPriority}[]=[];
 const preparation=sharedPreparation??new NativeFrameWorkScheduler(diagnostics);
 let frameManaged=false,standaloneScheduled=false;
 const nextWarm=()=>{const urgent=queue.findIndex(j=>j.priority==='foreground');return urgent<0?0:urgent};
 const warmKind=(image:SkImage)=>'decode:'+Math.max(0,Math.min(8,Math.ceil(Math.log2(Math.max(1,image.width()*image.height())/262144))));
 const warmOne=(standalone=false)=>{
   if(disposed||!queue.length)return;
   const job=queue.splice(nextWarm(),1)[0],at=performance.now();
   try{if(!warmed.has(job.image)){
    const started=diagnostics?.recording?performance.now():undefined;
    preparationSurface.getCanvas().drawImageRect(job.image,Skia.XYWHRect(0,0,job.image.width(),job.image.height()),Skia.XYWHRect(0,0,1,1),preparationPaint);warmed.add(job.image);
    if(started!==undefined)diagnostics!.trace(started,'native-texture-warm',performance.now()-started,{key:job.key,mode:'raster-decode',width:job.image.width(),height:job.image.height(),queueMs:Math.max(0,started-job.queuedAt),priority:job.priority});
   }job.resolve()}catch(e){job.reject(e instanceof Error?e:Error(String(e)))}
   finally{if(standalone)preparation.observe('artwork',warmKind(job.image),performance.now()-at)}
 };
 const scheduleStandalone=()=>{
  if(disposed||frameManaged||standaloneScheduled||!queue.length)return;
  standaloneScheduled=true;
  requestAnimationFrame(()=>{standaloneScheduled=false;if(disposed||frameManaged)return;warmOne(true);scheduleStandalone()});
 };
 const unregisterPreparation=preparation.register({name:'artwork',maxPerFrame:1,peek:()=>{
  if(disposed||!frameManaged||!queue.length)return null;
  const job=queue[nextWarm()];return{kind:warmKind(job.image),priority:job.priority==='foreground'?'foreground':'prefetch',initialMs:2};
 },run:()=>warmOne()});
 /** Switch only after boot/restoration finishes. Returning to standalone mode
  * lets an explicit paused reload settle without waiting for a playing frame. */
 const setFrameManaged=(managed:boolean)=>{frameManaged=managed&&!!sharedPreparation;if(!frameManaged)scheduleStandalone()};
 const warmImages=async(sources:Record<string,string>,priority:ArtworkPriority='foreground')=>{
  for(const [key,url]of Object.entries(sources))if(!keyByUrl.has(url))keyByUrl.set(url,key);
  await loader.load(sources,undefined,priority);
  await Promise.all(Object.keys(sources).map(key=>{
   const image=loader.images[key];if(warmed.has(image))return Promise.resolve();
   const existing=pendingWarm.get(image);if(existing){if(priority==='foreground'){const job=queue.find(job=>job.image===image);if(job)job.priority='foreground'}return existing}
   const task=new Promise<void>((resolve,reject)=>{if(disposed){reject(Error('Renderer closed'));return}queue.push({key,queuedAt:performance.now(),image,resolve,reject,priority});scheduleStandalone()});
   pendingWarm.set(image,task);void task.finally(()=>pendingWarm.delete(image)).catch(()=>{});return task;
  }));
  if(disposed)throw Error('Renderer closed');
  for(const key of Object.keys(sources))if(loader.images[key])prepared[key]=loader.images[key];
  revision++;
 };
 const releaseImages=(keys:string[])=>{for(const key of keys)delete prepared[key];loader.release(keys);revision++};
 const streamSources={...TERRAIN_CHUNK_IMAGES,...RIVER_DETAIL_IMAGES};
 const streams=open('Terrain streams',()=>createTerrainArtStreams(warmImages,releaseImages,keys=>{loader.promote(Object.fromEntries(keys.map(k=>[k,streamSources[k]])));const images=new Set(keys.map(k=>loader.images[k]));for(const job of queue)if(images.has(job.image))job.priority='foreground'},diagnostics,'native'));
 return {
  warmImages,releaseImages,setFrameManaged,get revision(){return revision},
  async prepareTerrain(world:World,width:number,height:number){
   // Use the actual draw/culling/LOD hooks to select exactly the same artwork
   // as gameplay. Finish warming the admitted buffer before removing loading.
   const preview=this.draw(world,width,height);preview.dispose();
   await streams.settled();
  },
  textureStats:()=>({graphics:{backend:'native-skia',shaderFieldBytes:adapter.shaderFieldBytes()},roads:streams.roads.stats(),camp:streams.camp.stats(),rivers:streams.rivers.stats(),artwork:{...loader.stats(),warming:queue.length,warmQueue:queue.slice(0,12).map(job=>({key:job.key,priority:job.priority,ageMs:Math.round(performance.now()-job.queuedAt)}))}}),
  draw(world:World,width:number,height:number,fade=0,peers:readonly CoopPeer[]=[]){
   const recorder=Skia.PictureRecorder(),canvas=recorder.beginRecording(Skia.XYWHRect(0,0,width,height));
   const density=Math.min(2,PixelRatio.get());
   // Match web's physical-pixel camera/LOD thresholds, then map the Picture
   // back into React Native points. The world footprint stays identical.
   canvas.scale(1/density,1/density);
   const ctx=new adapter.SkiaContext(canvas,width*density,height*density,font);
   const hooks=ctx as unknown as {requestRoadArtwork:(v:TerrainView)=>void;requestCampArtwork:(v:TerrainView)=>void;requestRiverArtwork:(v:TerrainView)=>void;riverTime:number;pixelRatio:number};
   hooks.pixelRatio=density;
   hooks.requestRoadArtwork=v=>streams.roads.update(v,width*density/v.width);
   hooks.requestCampArtwork=v=>streams.camp.update(v,width*density/v.width);
   hooks.requestRiverArtwork=v=>streams.rivers.update(v,width*density/v.width);
   hooks.riverTime=world.tick/60;
   const started=diagnostics?.tracing?performance.now():undefined;
   try{drawWorldEditor(ctx as unknown as CanvasRenderingContext2D,{} as Atlas,prepared as unknown as Record<string,HTMLImageElement>,world,view,fade,peers);return recorder.finishRecordingAsPicture()}finally{if(started!==undefined)diagnostics!.phase('worldDrawMs',performance.now()-started);const cleanup=started!==undefined?performance.now():undefined;ctx.dispose();recorder.dispose();if(cleanup!==undefined)diagnostics!.phase('cleanupMs',performance.now()-cleanup)}
  },
  dispose(){if(disposed)return;disposed=true;unregisterPreparation();if(!sharedPreparation)preparation.dispose();streams.dispose();for(const job of queue.splice(0))job.reject(Error('Renderer closed'));loader.dispose();for(const key of Object.keys(prepared))delete prepared[key];preparationSurface.dispose();preparationPaint.dispose();adapter.disposeLighting();font.dispose();face.dispose()}
 };
}

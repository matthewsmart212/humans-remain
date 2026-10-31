import type {CanvasKit,GrDirectContext,Surface,WebGLContextHandle} from 'canvaskit-wasm';

// Some shipped CanvasKit wrappers activate the context but accidentally omit
// `return`. Keep that activation, then use the guarded underlying getter. Never
// change the vendor prototype or report an unavailable measurement as zero.
function cacheBytes(context:GrDirectContext|null,kind:'Usage'|'Limit'):number|null{
 if(!context)return null;
 try{
  const publicValue=kind==='Usage'?context.getResourceCacheUsageBytes():context.getResourceCacheLimitBytes();
  if(Number.isFinite(publicValue)&&publicValue>=0)return publicValue;
  const raw=context as unknown as Record<string,(()=>number)|undefined>,fallback=raw[`_getResourceCache${kind}Bytes`];
  const value=fallback?.call(context);return typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
 }catch{return null}
}

// Resize the framebuffer, not the graphics context. MakeWebGLCanvasSurface is
// convenient for a one-off canvas, but creates a new GrDirectContext each call;
// disposing its returned Surface does not dispose that context or its textures.
export function createWebWorldSurface(kit:CanvasKit,canvas:HTMLCanvasElement){
 let surface:Surface|null=null,context:GrDirectContext|null=null,handle:WebGLContextHandle=0;
 let initialized=false,disposed=false,active=true,pending:{width:number;height:number;since:number}|undefined;
 const releaseContext=()=>{
  try{if(context)try{context.releaseResourcesAndAbandonContext()}finally{context.delete()}}
  finally{context=null;if(handle>0)kit.deleteContext(handle);handle=0}
 };
 const initialize=()=>{
  initialized=true;
  try{
   handle=kit.GetWebGLContext(canvas,{alpha:0,antialias:0,depth:0});
   if(handle>0)context=kit.MakeWebGLContext(handle);
   // Bound disposable GPU cache separately from the visible streamed artwork.
   // Visible camp sprites, sharp terrain chunks and the shared shader fields
   // can exceed 96 MiB together. That cap can evict still-visible textures during
   // a frame. Keep a bounded 192 MiB working set, separate from stream budgets.
   context?.setResourceCacheLimitBytes(active?192*1024*1024:0);
  }catch{const opened=handle>0;releaseContext();if(opened)throw Error('The graphics context could not open. Please retry loading.')}
  if(!context&&handle>0){releaseContext();throw Error('The graphics context could not open. Please retry loading.')}
  canvas.dataset.skiaBackend=context?'webgl':'software';
 };
 return {
  setActive(value:boolean){if(disposed||value===active)return;active=value;context?.setResourceCacheLimitBytes(active?192*1024*1024:0)},
  stats:()=>({backend:context?'webgl' as const:'software' as const,gpuCacheBytes:cacheBytes(context,'Usage'),gpuCacheLimitBytes:cacheBytes(context,'Limit'),bufferWidth:canvas.width,bufferHeight:canvas.height}),
  ensure(now=performance.now()){
   if(disposed)throw Error('Renderer closed');
   const ratio=Math.min(globalThis.devicePixelRatio||1,2);
   const width=Math.round(canvas.clientWidth*ratio),height=Math.round(canvas.clientHeight*ratio);
   if(!width||!height)return null;
   if(!initialized)initialize();
   if(surface&&canvas.width===width&&canvas.height===height){pending=undefined;return surface}
   if(surface&&context){
    // iOS animates both orientation and browser chrome. Wait for the viewport
    // to settle rather than allocating a new framebuffer on every frame.
    if(pending?.width!==width||pending?.height!==height)pending={width,height,since:now};
    if(now-pending.since<120)return surface;
   }
   surface?.dispose();surface=null;pending=undefined;
   canvas.width=width;canvas.height=height;
   // Never use the convenience helper here: it also replaces the DOM canvas
   // on a GPU failure, disconnecting React's ref and pointer input handlers.
   surface=context?kit.MakeOnScreenGLSurface(context,width,height,kit.ColorSpace.SRGB):kit.MakeSWCanvasSurface(canvas);
   if(!surface)throw Error('Skia surface unavailable');
   return surface;
  },
  dispose(){if(disposed)return;disposed=true;try{surface?.dispose()}finally{surface=null;releaseContext()}},
 };
}

export type ArtworkProgress={loaded:number;total:number};
export type ArtworkPriority='foreground'|'background';
const aborted=(signal?:AbortSignal)=>signal?.reason instanceof Error?signal.reason:Object.assign(new Error('Loading cancelled'),{name:'AbortError'});

/** Bounded failure category for local logs, without copying URLs or messages. */
export function artworkFailureDetails(error:unknown){
 const name=error instanceof Error?error.name:'Unknown',message=error instanceof Error?error.message:'',status=message.match(/download failed \((\d{3})\)/)?.[1];
 return {errorName:name.slice(0,40),failure:name==='AbortError'?'aborted':status?'http':/stalled|too long|timeout/i.test(message)?'timeout':name==='TypeError'?'network-or-api':'decode-or-render',httpStatus:status?Number(status):0};
}

/** Includes response bodies and module initialization: a stalled operation cannot hide the editor forever. */
export function loadingDeadline<T>(task:Promise<T>,timeoutMs:number,signal?:AbortSignal,message='Loading took too long. Please retry.'){
 return new Promise<T>((resolve,reject)=>{
  let finished=false;const finish=(error:unknown,value?:T)=>{if(finished)return;finished=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);error?reject(error):resolve(value!)};
  const cancel=()=>finish(aborted(signal)),timer=setTimeout(()=>finish(new Error(message)),timeoutMs);
  task.then(value=>finish(null,value),error=>finish(error));signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
 });
}

export async function fetchArtworkBytes(url:string,signal?:AbortSignal,timeoutMs=45000){
 const controller=new AbortController(),cancel=()=>controller.abort(aborted(signal));signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
 try{return await loadingDeadline((async()=>{
  // Safari reports interrupted requests (including response bodies) as
  // TypeError: Load failed. Retry this image without discarding the rest of
  // the camp. All attempts and backoff share the original bounded deadline.
  for(let attempt=0;;attempt++){
   if(controller.signal.aborted)throw aborted(controller.signal);
   let retryable=false;
   try{
    const response=await fetch(url,{signal:controller.signal});
    if(!response.ok){
     retryable=response.status===408||response.status===429||response.status>=500;
     void response.body?.cancel().catch(()=>{});
     throw new Error(`An artwork download failed (${response.status}). Please retry.`);
    }
    return new Uint8Array(await response.arrayBuffer());
   }catch(error){
    if(controller.signal.aborted)throw aborted(controller.signal);
    const network=error instanceof TypeError||error instanceof Error&&['NetworkError','AbortError'].includes(error.name);
    if(attempt>=2||!retryable&&!network){
     if(network)throw new TypeError('An artwork download was interrupted after multiple attempts. Check your connection and retry.',{cause:error});
     throw error;
    }
    await new Promise<void>((resolve,reject)=>{
     const done=()=>{controller.signal.removeEventListener('abort',stop);resolve()},timer=setTimeout(done,250*2**attempt);
     const stop=()=>{clearTimeout(timer);controller.signal.removeEventListener('abort',stop);reject(aborted(controller.signal))};
     controller.signal.addEventListener('abort',stop,{once:true});if(controller.signal.aborted)stop();
    });
   }
  }
 })(),timeoutMs,controller.signal,'An artwork download stalled. Please retry.');
 }finally{controller.abort();signal?.removeEventListener('abort',cancel)}
}

/** One small queue for startup, background terrain and newly placed assets; shared URLs decode once. */
export function createArtworkLoader<T>(decode:(url:string,signal:AbortSignal)=>Promise<T>,release:(image:T)=>void,concurrency=3){
 const images:Record<string,T>={},cache=new Map<string,T>(),pending=new Map<string,Promise<T>>(),controller=new AbortController();
 type Job={url:string;priority:ArtworkPriority;run:()=>Promise<void>;reject:(reason:unknown)=>void};
 const queue:Job[]=[];let active=0,disposed=false;
 const pump=()=>{while(!disposed&&active<concurrency&&queue.length){const urgent=queue.findIndex(job=>job.priority==='foreground'),job=queue.splice(urgent<0?0:urgent,1)[0];active++;void job.run().finally(()=>{active--;pump()})}};
 const get=(url:string,priority:ArtworkPriority)=>{
  if(cache.has(url))return Promise.resolve(cache.get(url)!);const existing=pending.get(url);
  if(existing){if(priority==='foreground'){const job=queue.find(job=>job.url===url);if(job)job.priority=priority}return existing}
  const task=new Promise<T>((resolve,reject)=>{
   queue.push({url,priority,reject,run:async()=>{try{if(disposed)throw aborted(controller.signal);const image=await decode(url,controller.signal);if(disposed){release(image);throw aborted(controller.signal)}cache.set(url,image);resolve(image)}catch(e){reject(e)}}});pump();
  });pending.set(url,task);void task.finally(()=>{if(pending.get(url)===task)pending.delete(url)}).catch(()=>{});return task;
 };
 return {images,
  stats:()=>({active,queued:queue.length,queuedForeground:queue.filter(job=>job.priority==='foreground').length,cachedImages:cache.size}),
  promote(sources:Record<string,string>){const urls=new Set(Object.values(sources));for(const job of queue)if(urls.has(job.url))job.priority='foreground';pump()},
  async load(sources:Record<string,string>,onProgress?:(p:ArtworkProgress)=>void,priority:ArtworkPriority='foreground'){
   if(disposed)throw aborted(controller.signal);
   const groups=new Map<string,string[]>();for(const [key,url]of Object.entries(sources))if(!images[key])groups.set(url,[...(groups.get(url)||[]),key]);
   let loaded=0;const total=groups.size;onProgress?.({loaded,total});
   await Promise.all([...groups].map(async([url,keys])=>{const image=await get(url,priority);if(disposed)throw aborted(controller.signal);for(const key of keys)images[key]=image;onProgress?.({loaded:++loaded,total})}));
  },
  release(keys:string[]){
   for(const key of keys)delete images[key];
   const used=new Set(Object.values(images));
   for(const [url,image]of cache)if(!used.has(image)){cache.delete(url);release(image)}
  },
  dispose(){if(disposed)return;disposed=true;controller.abort();for(const job of queue.splice(0))job.reject(aborted(controller.signal));for(const image of cache.values())release(image);cache.clear();for(const key of Object.keys(images))delete images[key]},
 };
}

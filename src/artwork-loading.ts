export type ArtworkProgress={loaded:number;total:number};
export type ArtworkPriority='foreground'|'background';
const aborted=(signal?:AbortSignal)=>signal?.reason instanceof Error?signal.reason:Object.assign(new Error('Loading cancelled'),{name:'AbortError'});

/** Bounded failure category for local logs, without copying URLs or messages. */
export function artworkFailureDetails(error:unknown){
 const name=error instanceof Error?error.name:'Unknown',message=error instanceof Error?error.message:'',status=message.match(/download failed \((\d{3})\)/)?.[1];
 return {errorName:name.slice(0,40),failure:name==='AbortError'?'aborted':status?'http':/stalled|too long|timeout/i.test(message)?'timeout':name==='TypeError'?'network-or-api':'decode-or-render',httpStatus:status?Number(status):0};
}

/** Bound image decoding, native asset operations and graphics startup. */
export function loadingDeadline<T>(task:Promise<T>,timeoutMs:number,signal?:AbortSignal,message='Loading took too long. Please retry.'){
 return new Promise<T>((resolve,reject)=>{
  let finished=false;
  const finish=(error:unknown,value?:T)=>{
   if(finished)return;
   finished=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);
   error?reject(error):resolve(value!);
  };
  const cancel=()=>finish(aborted(signal));
  const timer=setTimeout(()=>finish(new Error(message)),timeoutMs);
  task.then(value=>finish(null,value),error=>finish(error));
  signal?.addEventListener('abort',cancel,{once:true});
  if(signal?.aborted)cancel();
 });
}

/** Bound the total request, but restart the HTTP attempt if it stalls.
 * Mobile Safari can leave fetch() or its response body pending indefinitely.
 * Progress chunks reset the inactivity clock on a legitimately slow download.
 */
const retryPause=(delay:number,signal?:AbortSignal)=>new Promise<void>((resolve,reject)=>{
 if(signal?.aborted){reject(aborted(signal));return}
 let timer:ReturnType<typeof setTimeout>;
 const stop=()=>{clearTimeout(timer);reject(aborted(signal))};
 const finish=()=>{signal?.removeEventListener('abort',stop);resolve()};
 timer=setTimeout(finish,delay);signal?.addEventListener('abort',stop,{once:true});
});

export async function fetchArtworkBytes(url:string,signal?:AbortSignal,timeoutMs=90000):Promise<Uint8Array<ArrayBuffer>>{
 const deadline=Date.now()+timeoutMs;
 const stalled=()=>new Error('An artwork download stalled. Please retry.');
 let previous:unknown;
 for(let attempt=0;attempt<3;attempt++){
  if(signal?.aborted)throw aborted(signal);
  const budget=deadline-Date.now();
  if(budget<=0)break;
  const request=new AbortController(),parentCancelled=()=>request.abort(aborted(signal));
  signal?.addEventListener('abort',parentCancelled,{once:true});
  let idleTimer:ReturnType<typeof setTimeout>|undefined;
  let timedOut=false,retryable=false;
  const expire=()=>{timedOut=true;request.abort(stalled())};
  const absoluteTimer=setTimeout(expire,budget);
  // An inactivity budget, not a per-image-size deadline.
  const pulse=()=>{clearTimeout(idleTimer);idleTimer=setTimeout(expire,Math.min(22000,Math.max(1,deadline-Date.now())))};
  try{
   pulse();
   const response=await fetch(url,{signal:request.signal,cache:attempt?'reload':'default'});
   if(!response.ok){
    retryable=response.status===408||response.status===429||response.status>=500;
    void response.body?.cancel().catch(()=>{});
    throw new Error(`An artwork download failed (${response.status}). Please retry.`);
   }
   pulse();
   if(response.body&&typeof response.body.getReader==='function'){
    const reader=response.body.getReader(),chunks:Uint8Array[]=[];
    let length=0;
    try{
     while(true){
      const part=await reader.read();
      if(part.done)break;
      if(part.value?.byteLength){chunks.push(part.value);length+=part.value.byteLength;pulse()}
     }
    }finally{reader.releaseLock()}
    const result=new Uint8Array(length);let offset=0;
    for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.byteLength}
    return result;
   }
   return new Uint8Array(await response.arrayBuffer());
  }catch(error){
   if(signal?.aborted)throw aborted(signal);
   const network=error instanceof TypeError||error instanceof Error&&['NetworkError','AbortError'].includes(error.name);
   retryable=retryable||timedOut||network;
   previous=timedOut?stalled():network?new TypeError('An artwork download was interrupted. Please retry.',{cause:error}):error;
   if(!retryable||attempt===2||Date.now()>=deadline)throw previous;
  }finally{
   clearTimeout(absoluteTimer);clearTimeout(idleTimer);
   signal?.removeEventListener('abort',parentCancelled);
   request.abort();
  }
  await retryPause(450*(attempt+1),signal);
 }
 throw previous??stalled();
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

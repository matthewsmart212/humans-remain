/** Decode on zoom intent, then reuse that same image when the atlas opens. */
const cache=new Map<string,Promise<HTMLImageElement>>();
export function loadPlayerMapImage(url:string){
 const existing=cache.get(url);if(existing)return existing;
 const image=new Image();image.decoding='async';
 const task=new Promise<HTMLImageElement>((resolve,reject)=>{
  image.onload=()=>{const decoded=typeof image.decode==='function'?image.decode():Promise.resolve();void decoded.then(()=>resolve(image),()=>resolve(image))};
  image.onerror=()=>reject(Error('Map image unavailable'));image.src=url;
 });
 cache.set(url,task);if(cache.size>4)cache.delete(cache.keys().next().value!);
 void task.catch(()=>{if(cache.get(url)===task)cache.delete(url)});return task;
}
export function prefetchPlayerMapImages(urls:string[]){for(const url of urls.slice(0,4))if(!cache.has(url))void loadPlayerMapImage(url).catch(()=>{})}

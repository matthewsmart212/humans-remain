import {loadingDeadline} from './artwork-loading';

/** Decode streamed terrain with the browser before its first GPU draw. Encoded
 * Skia images defer that work until drawing. Keep that compatible fallback for
 * software rendering and browsers which cannot decode an ImageBitmap. */
export async function decodeWebArtwork<T>(
 bytes:Uint8Array<ArrayBuffer>,signal:AbortSignal,
 encoded:(bytes:Uint8Array<ArrayBuffer>)=>T,
 texture?:((bitmap:ImageBitmap)=>T),
):Promise<{image:T;bitmap?:ImageBitmap;mode:'browser-bitmap'|'skia-encoded';fallback?:string}>{
 if(signal.aborted)throw signal.reason??new DOMException('Loading cancelled','AbortError');
 let fallback=texture?'bitmap-api-unavailable':'texture-source-unavailable';
 if(texture&&typeof globalThis.createImageBitmap==='function'){
  let bitmap:ImageBitmap|undefined;
  try{
   const pending=globalThis.createImageBitmap(new Blob([bytes]),{premultiplyAlpha:'none'});
   try{bitmap=await loadingDeadline(pending,45000,signal,'Terrain decoding took too long.')}
   catch(error){void pending.then(late=>late.close(),()=>{});throw error}
   if(signal.aborted)throw signal.reason??new DOMException('Loading cancelled','AbortError');
   return {image:texture(bitmap),bitmap,mode:'browser-bitmap'};
  }catch(error){
   bitmap?.close();
   if(signal.aborted)throw signal.reason??error;
   fallback='bitmap-decode-or-texture-failed';
   // The same bytes remain available; a codec/API limitation is not a failed map.
  }
 }
 return {image:encoded(bytes),mode:'skia-encoded',fallback};
}

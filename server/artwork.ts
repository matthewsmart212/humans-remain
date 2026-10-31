import {resolveArtworkReskin} from '../src/artwork-reskins';
import {isLibraryAssetId} from '../src/asset-library-policy';
import {animationAreaError} from '../src/asset-animation';
import {collisionError} from '../src/asset-collision';
import {readCustomAssets,artworkEntry} from './custom-assets';
import {MAX_ART_FILE,type ArtworkRecord,type ArtworkConfig,type ArtworkFile} from '../src/artwork-model';
import {MAX_TERRAIN_FILE,MAX_TERRAIN_PIXELS,MAX_TERRAIN_EDGE} from '../src/terrain-limits';
export type Statement={bind:(...values:unknown[])=>Statement;all:()=>Promise<{results:any[]}>;run:()=>Promise<any>};
export type ArtEnv={DB:{prepare:(sql:string)=>Statement};ARTWORK?:{put:(key:string,value:ArrayBuffer|ReadableStream<Uint8Array>,options?:any)=>Promise<any>;get:(key:string)=>Promise<any>;delete:(key:string)=>Promise<any>}};
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const idOK=(s:unknown)=>typeof s==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(s);
const fileDto=(r:any):ArtworkFile=>({id:r.id,url:'/api/asset-files/'+r.id,name:r.name,mime:r.mime,width:r.width,height:r.height,bytes:r.bytes});
export async function readArtwork(DB:ArtEnv['DB'],includeRetired=false):Promise<ArtworkRecord[]>{
 const rows=(await DB.prepare('SELECT a.entry_id,a.revision,a.config_json,a.created_at FROM asset_artwork a JOIN (SELECT entry_id,MAX(revision) AS revision FROM asset_artwork GROUP BY entry_id) latest ON a.entry_id=latest.entry_id AND a.revision=latest.revision').all()).results;
 const custom=new Map((await readCustomAssets(DB,includeRetired)).map(a=>[a.id,a]));
 return rows.filter(r=>includeRetired||isLibraryAssetId(r.entry_id)).map(r=>({id:r.entry_id,revision:r.revision,updatedAt:r.created_at,config:JSON.parse(r.config_json),...(custom.has(r.entry_id)?{customAsset:custom.get(r.entry_id)}:{})})).map(resolveArtworkReskin);
}
// Only raster formats are accepted. Dimensions come from the bytes, never browser metadata.
export function imageInfo(b:Uint8Array):{mime:string;width:number;height:number}|null{
 const d=new DataView(b.buffer,b.byteOffset,b.byteLength),str=(a:number,n:number)=>String.fromCharCode(...b.subarray(a,a+n));
 if(b.length>=33&&b[0]===137&&str(1,3)==='PNG'&&str(12,4)==='IHDR')return{mime:'image/png',width:d.getUint32(16),height:d.getUint32(20)};
 if(b.length>=30&&str(0,4)==='RIFF'&&str(8,4)==='WEBP'){
  const t=str(12,4);if(t==='VP8X')return{mime:'image/webp',width:1+b[24]+(b[25]<<8)+(b[26]<<16),height:1+b[27]+(b[28]<<8)+(b[29]<<16)};
  if(t==='VP8 '&&b[23]===157&&b[24]===1&&b[25]===42)return{mime:'image/webp',width:d.getUint16(26,true)&16383,height:d.getUint16(28,true)&16383};
  if(t==='VP8L'&&b[20]===47)return{mime:'image/webp',width:1+(b[21]|((b[22]&63)<<8)),height:1+((b[22]>>6)|(b[23]<<2)|((b[24]&15)<<10))};
 }
 if(b[0]===255&&b[1]===216){let p=2;while(p+9<b.length){if(b[p]!==255)return null;const marker=b[p+1];if(marker===217||marker===218)return null;if(marker===216||marker===1){p+=2;continue}const len=d.getUint16(p+2);if(len<2||p+2+len>b.length)return null;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker))return{mime:'image/jpeg',width:d.getUint16(p+7),height:d.getUint16(p+5)};p+=len+2}}
 return null;
}
async function limitedBody(request:Request,max:number){if(Number(request.headers.get('Content-Length'))>max)throw Error('File too large');const reader=request.body?.getReader();if(!reader)throw Error('Empty upload');const chunks:Uint8Array[]=[];let size=0;while(true){const{done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Error('File too large')}chunks.push(value)}const out=new Uint8Array(size);let pos=0;for(const c of chunks){out.set(c,pos);pos+=c.length}return out;}
// Browser File fetches have a platform-enforced Content-Length. Inspect only a
// bounded prefix on a cloned branch, then store the original known-length stream.
// Do not buffer/copy a 50MB PNG inside the 128MB Worker isolate.
async function terrainBody(request:Request){
 const length=Number(request.headers.get('Content-Length'));
 if(!Number.isSafeInteger(length)||length<=0){
  const bytes=await limitedBody(request,MAX_TERRAIN_FILE);
  return {info:imageInfo(bytes),value:bytes.buffer as ArrayBuffer,size:bytes.length};
 }
 if(length>MAX_TERRAIN_FILE)throw Error('File too large');
 const claimed=request.headers.get('X-File-Size');
 if(claimed!==null&&Number(claimed)!==length)throw Error('File size mismatch');
 const reader=request.clone().body?.getReader();if(!reader)throw Error('Empty upload');
 const limit=512*1024;let prefix=new Uint8Array(0),info:ReturnType<typeof imageInfo>=null;
 try{
  while(prefix.length<limit){
   const {done,value}=await reader.read();if(done)break;
   const next=new Uint8Array(Math.min(limit,prefix.length+value.length));next.set(prefix);next.set(value.subarray(0,next.length-prefix.length),prefix.length);prefix=next;
   info=imageInfo(prefix);if(info)break;
  }
 }finally{void reader.cancel().catch(()=>{})}
 return {info,value:request.body!,size:length};
}
export async function handleArtwork(request:Request,env:ArtEnv,canEdit:boolean):Promise<Response>{
 const url=new URL(request.url);
 try{
  if(url.pathname.startsWith('/api/asset-files/')){
   if(!['GET','HEAD'].includes(request.method))return json({error:'Read only'},405);
   const id=url.pathname.slice('/api/asset-files/'.length);if(!idOK(id))return json({error:'Not found'},404);
   const row=(await env.DB.prepare('SELECT * FROM asset_art_files WHERE id=?').bind(id).all()).results[0];if(!row)return json({error:'Not found'},404);
   // Pending uploads remain owner-only until referenced by a saved version.
   if(!canEdit&&!row.published)return json({error:'Not found'},404);
   const file=await env.ARTWORK?.get(row.object_key);if(!file)return json({error:'Artwork unavailable'},404);
   return new Response(request.method==='HEAD'?null:file.body,{headers:{'Content-Type':row.mime,'X-Content-Type-Options':'nosniff','Cache-Control':row.published?'public,max-age=31536000,immutable':'private,no-store',...(url.searchParams.has('download')?{'Content-Disposition':`attachment; filename="${row.name.replace(/[^a-zA-Z0-9_.-]/g,'_')}"`}:{})}});
  }
  // Saved worlds can still reference retired artwork, including fixed tier frames.
  // Keep the palette filtered, but hydrate the complete runtime registry before
  // validating or migrating a camp. Retirement must never make a saved world invalid.
  if(request.method==='GET')return json({records:await readArtwork(env.DB,url.pathname==='/api/asset-artwork'&&url.searchParams.get('scope')==='world'),customAssets:await readCustomAssets(env.DB),canEdit});
  if(!canEdit)return json({error:'Sign in as the site owner to import artwork.'},403);
  if(request.headers.get('Origin')!==url.origin)return json({error:'Origin not allowed'},403);
  if(request.method==='POST'&&url.pathname==='/api/custom-assets'){
   if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'JSON required'},415);
   let value:any;try{value=JSON.parse(new TextDecoder().decode(await limitedBody(request,2048)))}catch{return json({error:'Enter an asset name of 1–80 characters.'},400)}
   const name=typeof value?.name==='string'?value.name.trim():'';
   if(!name||name.length>80||/[\x00-\x1f\x7f]/.test(name))return json({error:'Enter an asset name of 1–80 characters.'},400);
   const asset={id:'misc_'+crypto.randomUUID(),name,createdAt:new Date().toISOString()};
   await env.DB.prepare('INSERT INTO custom_assets (id,name,created_at) VALUES (?,?,?)').bind(asset.id,asset.name,asset.createdAt).run();
   return json({asset},201);
  }
  if(request.method==='POST'&&['/api/asset-files','/api/world-terrain'].includes(url.pathname)){
   if(!env.ARTWORK)return json({error:'Image storage is unavailable. Please retry.'},503);
   const terrain=url.pathname==='/api/world-terrain';const entryId=terrain?'world-terrain':request.headers.get('X-Asset-Id');if(!terrain&&!await artworkEntry(env.DB,entryId))return json({error:'Choose an artwork entry.'},400);
   let upload:{info:ReturnType<typeof imageInfo>;value:ArrayBuffer|ReadableStream<Uint8Array>;size:number};
   try{if(terrain)upload=await terrainBody(request);else{const bytes=await limitedBody(request,MAX_ART_FILE);upload={info:imageInfo(bytes),value:bytes.buffer as ArrayBuffer,size:bytes.length}}}catch{return json({error:terrain?'Background images must be 64 MB or smaller and have a valid file size.':'Each image must be 20 MB or smaller.'},413)}
   const info=upload.info,maxPixels=terrain?MAX_TERRAIN_PIXELS:16777216;
   if(!info||!info.width||!info.height||info.width>MAX_TERRAIN_EDGE||info.height>MAX_TERRAIN_EDGE||info.width*info.height>maxPixels){void request.body?.cancel().catch(()=>{});return json({error:`Use a PNG, WebP or JPEG image up to ${terrain?'32':'16'} megapixels and 8192 px per edge.`},400)}
   let name='asset';try{name=decodeURIComponent(request.headers.get('X-File-Name')||'asset').replace(/[\x00-\x1f]/g,'').slice(0,150)}catch{}
   const id=crypto.randomUUID(),key='catalogue/'+entryId+'/'+id;
   let value=upload.value,complete:Promise<void>|undefined;
   const Fixed=(globalThis as unknown as {FixedLengthStream?:new(n:number)=>{readable:ReadableStream<Uint8Array>;writable:WritableStream<Uint8Array>}}).FixedLengthStream;
   if(terrain&&value instanceof ReadableStream&&Fixed){const fixed=new Fixed(upload.size);complete=value.pipeTo(fixed.writable);void complete.catch(()=>{});value=fixed.readable;}
   try{await env.ARTWORK.put(key,value,{httpMetadata:{contentType:info.mime}});if(complete)await complete}catch(error){if(value instanceof ReadableStream)void value.cancel().catch(()=>{});throw error}
   try{await env.DB.prepare('INSERT INTO asset_art_files (id,entry_id,object_key,name,mime,width,height,bytes,published,created_at) VALUES (?,?,?,?,?,?,?,?,0,?)').bind(id,entryId,key,name,info.mime,info.width,info.height,upload.size,new Date().toISOString()).run()}catch(error){await env.ARTWORK.delete(key);throw error}
   return json(fileDto({id,name,...info,bytes:upload.size}),201);
  }
  if(request.method!=='PUT'||url.pathname!=='/api/asset-artwork')return json({error:'Method not allowed'},405);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'JSON required'},415);
  const raw=await request.text();if(raw.length>30000)return json({error:'Configuration too large'},413);
  let v:any;try{v=JSON.parse(raw)}catch{return json({error:'Invalid configuration'},400)}
  const entry=await artworkEntry(env.DB,v?.id),c=v?.config;
  const finite=(n:any,lo:number,hi:number)=>typeof n==='number'&&Number.isFinite(n)&&n>=lo&&n<=hi;
  if(!entry||!Number.isInteger(v.revision)||v.revision<0||!c||!['sprite','building'].includes(c.kind)||!idOK(c.base)||!Array.isArray(c.frames)||c.frames.length===1||c.frames.length>24||!c.frames.every(idOK)||new Set(c.frames).size!==c.frames.length||!finite(c.fps,1,24)||!finite(c.worldWidth,12,1800)||!Array.isArray(c.anchor)||c.anchor.length!==2||!c.anchor.every((x:any)=>finite(x,0,1))||typeof c.solid!=='boolean'||!finite(c.footprint?.width,.01,1)||!finite(c.footprint?.depth,.01,1))return json({error:'Check the image type, frames, scale and footprint.'},400);
  if(c.allowTransparency!==undefined&&typeof c.allowTransparency!=='boolean')return json({error:'Automatic transparency must be on or off.'},400);
  if(c.collision!==undefined){const error=collisionError(c.collision);if(error)return json({error},400);}
  if(c.animationMode!==undefined&&!['loop','step-on'].includes(c.animationMode))return json({error:'Choose Loop or Step on for animation playback.'},400);
  if(c.animationArea!==undefined){const error=animationAreaError(c.animationArea);if(error)return json({error},400);}
  if(c.animationMode==='step-on'&&(c.frames.length<2||!c.animationArea))return json({error:'Step-on animation needs at least two frames and a drawn activation area.'},400);
  const wanted=[c.base,...c.frames,...(c.roof?[c.roof]:[]),...(c.unlit?[c.unlit]:[])];if(!wanted.every(idOK)||c.frames.length&&c.base!==c.frames[0])return json({error:'The first animation frame must be the main image.'},400);
  const files=(await env.DB.prepare('SELECT * FROM asset_art_files WHERE entry_id=?').bind(entry.id).all()).results,map=new Map(files.map(f=>[f.id,fileDto(f)]));
  if(wanted.some(id=>!map.has(id)))return json({error:'Upload every image to this asset before saving.'},400);
  const base=map.get(c.base)!;if(wanted.some(id=>{const f=map.get(id)!;return f.width!==base.width||f.height!==base.height}))return json({error:'Frames, roof and idle image must use matching canvas dimensions and alignment.'},400);
  if(c.kind==='building'){
   const b=c.building;if(!c.roof||!b||!['south','north','east','west'].includes(b.doorSide)||!['left','top','right','bottom','doorStart','doorEnd'].every(k=>finite(b[k],0,1))||b.right-b.left<.1||b.bottom-b.top<.1||b.doorEnd<=b.doorStart||c.worldWidth<240)return json({error:'Buildings need an interior, matching roof image, usable floor bounds and doorway.'},400);
   const length=['north','south'].includes(b.doorSide)?(b.right-b.left)*c.worldWidth:(b.bottom-b.top)*c.worldWidth*base.height/base.width;
   if((b.doorEnd-b.doorStart)*length<58)return json({error:'Widen the doorway or building: leave at least 58 world units for the 38-unit-wide worker and wall clearance.'},400);
  }
  const config:ArtworkConfig={kind:c.kind,base,frames:c.frames.map((id:string)=>map.get(id)!),...(c.roof?{roof:map.get(c.roof)!}:{}),...(c.unlit?{unlit:map.get(c.unlit)!}:{}),fps:c.fps,...(c.animationMode?{animationMode:c.animationMode}:{}),...(c.animationArea?{animationArea:{points:c.animationArea.points.map((p:number[])=>[p[0],p[1]] as [number,number])}}:{}),worldWidth:c.worldWidth,anchor:c.anchor,solid:c.solid,allowTransparency:c.allowTransparency!==false,footprint:{width:c.footprint.width,depth:c.footprint.depth},...(c.collision!==undefined?{collision:{lineWidth:c.collision.lineWidth,paths:c.collision.paths.map((p:any)=>({closed:p.closed,points:p.points.map((v:any)=>[v[0],v[1]] as [number,number])}))}}:{}),...(c.kind==='building'?{building:{...c.building}}:{})};
  // Publish immutable files before switching the live manifest; failed saves keep the old version.
  for(const id of new Set(wanted))await env.DB.prepare('UPDATE asset_art_files SET published=1 WHERE id=?').bind(id).run();
  const at=new Date().toISOString();
  const saved=await env.DB.prepare('INSERT INTO asset_artwork (id,entry_id,revision,config_json,created_at) SELECT ?,?,?,?,? WHERE COALESCE((SELECT MAX(revision) FROM asset_artwork WHERE entry_id=?),0)=?').bind(crypto.randomUUID(),entry.id,v.revision+1,JSON.stringify(config),at,entry.id,v.revision).run();
  if(saved.meta?.changes!==1)return json({error:'This asset changed in another tab. Reload before saving your new version.'},409);
  // Referenced bytes are public like the existing catalogue artwork; edits remain owner-only.
  const customAsset=(await readCustomAssets(env.DB)).find(a=>a.id===entry.id);
  return json({record:resolveArtworkReskin({id:entry.id,revision:v.revision+1,updatedAt:at,config,...(customAsset?{customAsset}:{})})});
 }catch(error){console.error('Artwork storage error',error);return json({error:'Artwork could not be saved or loaded. Your existing version is kept. Please retry.'},503)}
}

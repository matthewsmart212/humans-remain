import game from '../server/checklist';
import snapshot from '../native/assets/world-snapshot.json';
import sourceFiles from './github-artwork.json';
import {resolveArtworkReskin} from '../src/artwork-reskins';
import type {ArtworkFile,ArtworkRecord} from '../src/artwork-model';

type Env=Parameters<typeof game.fetch>[1];
type DB=Env['DB'];
type Statement=ReturnType<DB['prepare']>;
type BatchDB=DB&{batch?:(statements:Statement[])=>Promise<unknown>};
const SOURCE_COMMIT='ff4770765510a3fbc5260955208f68cbd8c6b56d';
const sourceManifest=sourceFiles as Record<string,{repositoryPath:string;sha256:string;bytes:number}>;
const records=(snapshot.records as unknown as ArtworkRecord[]).map(resolveArtworkReskin);
const artwork=new Map<string,{entryId:string;file:ArtworkFile}>();
for(const record of records){
 const c=record.config;
 for(const file of [c.base,...c.frames,c.roof,c.unlit])if(file){
  const existing=artwork.get(file.id);
  if(existing&&existing.file.url!==file.url)throw Error('Bundled artwork ID has conflicting URLs: '+file.id);
  artwork.set(file.id,{entryId:record.id,file});
 }
}
if(snapshot.layout.terrainImage){const file=snapshot.layout.terrainImage;artwork.set(file.id,{entryId:'world-terrain',file})}
const initializing=new WeakMap<object,Promise<void>>();

/** Install release reference content once. No player progress or old editor
 * history is imported, and a nonempty destination world is never replaced. */
export function initializeReplica(db:BatchDB):Promise<void>{
 const inFlight=initializing.get(db);if(inFlight)return inFlight;
 const work=(async()=>{
  const current=(await db.prepare("SELECT revision,draft_json,applied_json FROM world_layout WHERE id='main'").all()).results[0] as {revision:number;draft_json:string|null;applied_json:string|null}|undefined;
  if(current&&(current.revision>0||current.draft_json||current.applied_json))return;
  const statements:Statement[]=[];
  statements.push(db.prepare("INSERT OR IGNORE INTO world_layout (id,revision) VALUES ('main',0)"));
  for(const record of records){
   if(record.customAsset){const a=record.customAsset;statements.push(db.prepare('INSERT OR IGNORE INTO custom_assets (id,name,created_at) VALUES (?,?,?)').bind(a.id,a.name,a.createdAt))}
   statements.push(db.prepare('INSERT OR IGNORE INTO asset_artwork (id,entry_id,revision,config_json,created_at) VALUES (?,?,?,?,?)').bind('bundled-'+record.id+'-'+record.revision,record.id,record.revision,JSON.stringify(record.config),record.updatedAt));
  }
  for(const [id,{entryId,file}]of artwork){
   statements.push(db.prepare('INSERT OR IGNORE INTO asset_art_files (id,entry_id,object_key,name,mime,width,height,bytes,published,created_at) VALUES (?,?,?,?,?,?,?,?,1,?)').bind(id,entryId,'bundled/'+id,file.name,file.mime,file.width,file.height,file.bytes,snapshot.layout.updatedAt));
  }
  // Insert-only batches are safe to resume after an interrupted first request.
  // The world row is the completion marker and is always written last.
  for(let i=0;i<statements.length;i+=20){
   const batch=statements.slice(i,i+20);
   if(db.batch)await db.batch(batch);else for(const statement of batch)await statement.run();
  }
  const layout=JSON.stringify(snapshot.layout);
  await db.prepare("UPDATE world_layout SET draft_json=?,applied_json=?,revision=1,updated_at=? WHERE id='main' AND revision=0 AND draft_json IS NULL AND applied_json IS NULL").bind(layout,layout,snapshot.layout.updatedAt).run();
 })();
 initializing.set(db,work);void work.catch(()=>initializing.delete(db));return work;
}

const downloading=new Map<string,Promise<ArrayBuffer>>();
async function originalArtwork(id:string,env:Env):Promise<ArrayBuffer>{
 const pending=downloading.get(id);if(pending)return pending;
 const work=(async()=>{
  const source=sourceManifest[id];if(!source)throw Error('Bundled artwork source is missing');
  const url='https://media.githubusercontent.com/media/matthewsmart212/humans-remain/'+SOURCE_COMMIT+'/'+source.repositoryPath;
  const response=await fetch(url);if(!response.ok)throw Error('Bundled artwork download failed');
  const bytes=await response.arrayBuffer();
  if(bytes.byteLength!==source.bytes)throw Error('Bundled artwork length mismatch');
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  if(digest!==source.sha256)throw Error('Bundled artwork checksum mismatch');
  // Cache exact committed bytes in the new Site's own artwork bucket. The
  // old Site's database, storage and publication are never accessed or changed.
  if(env.ARTWORK)await env.ARTWORK.put('bundled/'+id,bytes,{httpMetadata:{contentType:artwork.get(id)?.file.mime}});
  return bytes;
 })();
 downloading.set(id,work);void work.finally(()=>downloading.delete(id)).catch(()=>{});return work;
}

export async function bundledArtwork(request:Request,env:Env):Promise<Response|null>{
 const url=new URL(request.url);
 if(!['GET','HEAD'].includes(request.method)||!url.pathname.startsWith('/api/asset-files/'))return null;
 const id=url.pathname.slice('/api/asset-files/'.length),entry=artwork.get(id);if(!entry)return null;
 const file=entry.file;
 if(!file.url.startsWith('/api/asset-files/'))return env.ASSETS?env.ASSETS.fetch(new Request(new URL(file.url,url.origin),request)):new Response('Artwork unavailable',{status:503});
 const headers=new Headers({'Content-Type':file.mime,'X-Content-Type-Options':'nosniff','Cache-Control':'public,max-age=31536000,immutable'});
 if(url.searchParams.has('download'))headers.set('Content-Disposition','attachment; filename="'+file.name.replace(/[^a-zA-Z0-9_.-]/g,'_')+'"');
 if(request.method==='HEAD')return new Response(null,{headers});
 const cached=await env.ARTWORK?.get('bundled/'+id);
 if(cached)return new Response(cached.body,{headers});
 return new Response(await originalArtwork(id,env),{headers});
}

export default {async fetch(request:Request,env:Env):Promise<Response>{
 try{
  await initializeReplica(env.DB);
  return await bundledArtwork(request,env)??await game.fetch(request,env);
 }catch(error){
  console.error('Game release initialization failed',error);
  return new Response('The game could not finish preparing. Please retry.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8','Cache-Control':'no-store'}});
 }
}};

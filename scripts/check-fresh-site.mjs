import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';

const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'humans-remain-site-check-'));
const entry=path.join(temporary,'worker.mjs');
await build({entryPoints:['deploy/replica-worker.ts'],outfile:entry,bundle:true,platform:'node',format:'esm',target:'es2022',define:{__INDEX_HTML__:'"verified game index"'},logLevel:'silent'});
const {initializeReplica,bundledArtwork,default:worker}=await import(pathToFileURL(entry).href);
const snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json','utf8'));
function database(){
 const sqlite=new DatabaseSync(':memory:');
 for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync(path.join('drizzle',file),'utf8'));
 return sqlite;
}
function adapter(sqlite,failAt=0){
 let batches=0;
 return {prepare(sql){
  const statement=sqlite.prepare(sql);
  const bound=values=>({bind:(...args)=>bound(args),all:async()=>({results:statement.all(...values)}),run:async()=>({meta:{changes:Number(statement.run(...values).changes)}}),_run:()=>statement.run(...values)});
  return bound([]);
 },async batch(statements){
  if(++batches===failAt)throw Error('Simulated interrupted initialization');
  sqlite.exec('BEGIN');try{const results=statements.map(s=>s._run());sqlite.exec('COMMIT');return results}catch(error){sqlite.exec('ROLLBACK');throw error}
 }};
}
const sqlite=database();
await assert.rejects(initializeReplica(adapter(sqlite,2)),/interrupted/);
assert.equal(sqlite.prepare("SELECT revision FROM world_layout WHERE id='main'").get().revision,0,'Incomplete reference import must remain resumable');
await Promise.all([initializeReplica(adapter(sqlite)),initializeReplica(adapter(sqlite))]);
const world=sqlite.prepare("SELECT * FROM world_layout WHERE id='main'").get();
assert.equal(world.revision,1);assert.deepEqual(JSON.parse(world.applied_json),snapshot.layout);
assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM asset_artwork').get().n,snapshot.records.length);
assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM base_checklist').get().n,0,'Old checklist/save data is not imported');
const artCount=sqlite.prepare('SELECT COUNT(*) AS n FROM asset_art_files').get().n;
sqlite.prepare("UPDATE world_layout SET revision=8,draft_json=? WHERE id='main'").run('{"ownerEdit":true}');
await initializeReplica(adapter(sqlite));
assert.equal(sqlite.prepare("SELECT draft_json FROM world_layout WHERE id='main'").get().draft_json,'{"ownerEdit":true}','Later initialization cannot replace owner edits');
assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM asset_art_files').get().n,artCount);

const args=process.argv.slice(2),value=key=>args[args.indexOf(key)+1];
const artDirectory=args.includes('--art-directory')?value('--art-directory'):'public/api/asset-files';
const built=args.includes('--built-game')?value('--built-game'):'dist';
const id='0e6f4385-99d4-4bd1-990e-1f3cb3fa87ea',original=fs.readFileSync(path.join(artDirectory,id));
const originalFetch=globalThis.fetch,cache=new Map();let downloads=0;
const env={DB:adapter(sqlite),ARTWORK:{get:async key=>cache.has(key)?{body:cache.get(key)}:null,put:async(key,bytes)=>cache.set(key,new Uint8Array(bytes))},ASSETS:{fetch:async request=>{
 const file=path.join(built,'client',new URL(request.url).pathname);
 assert(fs.existsSync(file),'Referenced shipped image must exist: '+file);return new Response(null,{status:200});
}}};
try{
 globalThis.fetch=async url=>{downloads++;assert(String(url).startsWith('https://media.githubusercontent.com/media/matthewsmart212/humans-remain/ff4770765510a3fbc5260955208f68cbd8c6b56d/'));return new Response(original)};
 let image=await bundledArtwork(new Request('https://new-site.test/api/asset-files/'+id),env);
 assert.deepEqual(Buffer.from(await image.arrayBuffer()),original);assert.equal(downloads,1);assert(cache.has('bundled/'+id));
 globalThis.fetch=async()=>{throw Error('A cached asset must not need GitHub')};
 image=await bundledArtwork(new Request('https://new-site.test/api/asset-files/'+id),env);
 assert.deepEqual(Buffer.from(await image.arrayBuffer()),original);
 const badCache=new Map();globalThis.fetch=async()=>new Response(new Uint8Array(original.length));
 await assert.rejects(bundledArtwork(new Request('https://new-site.test/api/asset-files/'+id),{...env,ARTWORK:{get:async()=>null,put:async(key,bytes)=>badCache.set(key,bytes)}}),/checksum/);
 assert.equal(badCache.size,0,'Bad source bytes must never enter destination storage');
 assert.equal(await bundledArtwork(new Request('https://new-site.test/api/asset-files/not-a-bundled-id'),env),null,'New user uploads retain the existing R2 route');
 for(const row of sqlite.prepare('SELECT config_json FROM asset_artwork').all()){
  const c=JSON.parse(row.config_json);
  for(const file of [c.base,...c.frames,c.roof,c.unlit].filter(Boolean))if(!file.url.startsWith('/api/asset-files/')){
   const response=await bundledArtwork(new Request('https://new-site.test/api/asset-files/'+file.id),env);assert.equal(response.status,200);
  }
 }
 const fresh=database(),response=await worker.fetch(new Request('https://new-site.test/api/world-layout'),{...env,DB:adapter(fresh)});
 assert.equal(response.status,200);const body=await response.json();assert.equal(body.applied.items.length,snapshot.layout.items.length);assert.equal(body.revision,1);
 const unauthorized=await worker.fetch(new Request('https://new-site.test/api/world-layout',{method:'PUT',headers:{'Content-Type':'application/json','Origin':'https://new-site.test'},body:JSON.stringify({action:'save',revision:1,layout:snapshot.layout})}),{...env,DB:adapter(fresh)});
 assert.equal(unauthorized.status,403,'Existing owner authorization must remain enforced');
 fresh.close();
 console.log(JSON.stringify({passed:true,authoredObjects:snapshot.layout.items.length,artworkRecords:snapshot.records.length,bundledFiles:artCount,checks:['fresh SQLite schema','interrupted/concurrent initialization','owner-edit preservation','no player/checklist save import','exact artwork bytes','R2 caching','checksum rejection','static asset coverage','world API','owner-only writes']}));
}finally{globalThis.fetch=originalFetch;sqlite.close()}

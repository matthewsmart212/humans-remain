// Exercise the current production Worker with a disposable local database.
// No hosted world, account, artwork file, or player save is modified.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';

const fixtureDir=path.resolve(process.argv[2]||'docs/qa/circular-wall-v1');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const source=read(path.join(fixtureDir,'source-world.json'));
const artwork=read(path.join(fixtureDir,'source-artwork.json'));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'camp-perimeter-server-'));
const sql=new DatabaseSync(':memory:');
try{
 await build({stdin:{contents:"export {default as worker} from './server/checklist';export * from './src/camp-perimeter';export * from './src/imported-art';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',define:{__INDEX_HTML__:JSON.stringify('<!doctype html>')},outfile:path.join(temp,'model.mjs'),logLevel:'error'});
 const m=await import(pathToFileURL(path.join(temp,'model.mjs')));
 for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync('drizzle/'+file,'utf8'));
 for(const a of artwork.customAssets)sql.prepare('INSERT INTO custom_assets(id,name,created_at) VALUES (?,?,?)').run(a.id,a.name,a.createdAt);
 for(const a of artwork.records)sql.prepare('INSERT INTO asset_artwork(id,entry_id,revision,config_json,created_at) VALUES (?,?,?,?,?)').run(a.id,a.id,a.revision,JSON.stringify(a.config),a.updatedAt);
 const terrain=source.draft.terrainImage;
 sql.prepare('INSERT INTO asset_art_files(id,entry_id,object_key,name,mime,width,height,bytes,published,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(terrain.id,'world-terrain','local-test-terrain',terrain.name,terrain.mime,terrain.width,terrain.height,terrain.bytes,1,source.updatedAt);
 const DB={prepare(q){let params=[];return{bind(...p){params=p;return this},async all(){return{results:sql.prepare(q).all(...params)}},async run(){const r=sql.prepare(q).run(...params);return{meta:{changes:Number(r.changes)}}}}}};
 const env={DB,SITE_OWNER_EMAIL:'owner@example.test'},origin='https://test.local';
 const owner={'oai-authenticated-user-id':'site-scoped-owner-subject','oai-authenticated-user-email':'owner@example.test'};
 const call=(p,o={})=>m.worker.fetch(new Request(origin+p,o),env);
 const save=(layout,revision)=>call('/api/world-layout',{method:'PUT',headers:{...owner,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({layout,revision,action:'save'})});
 const loaded=async()=>await(await call('/api/world-layout')).json();
 m.installImportedArt(artwork.records);
 const circular=m.addApprovedCampPerimeter(source.draft);
 assert.equal(circular.campPerimeterVersion,5);
 assert.equal((await save({...circular,campPerimeterVersion:6},0)).status,400,'Unknown versions remain invalid');

 // Historical saved JSON remains readable without requiring retired gates to
 // be new catalogue placements. Round-trip the complete current v4/v5 worlds.
 const old=read('docs/qa/camp-moss-no-gates-v1/layout-before.json').draft;
 const legacy={...old,name:'Legacy perimeter persistence check',items:old.items.filter(p=>p.id.startsWith('camp-original-gate-')||p.assetId==='base_hearth_t1')};
 delete legacy.terrainImage;delete legacy.terrainBorder;
 sql.prepare("UPDATE world_layout SET draft_json=? WHERE id='main'").run(JSON.stringify(legacy));
 assert.deepEqual((await loaded()).draft,legacy,'Historical gate-bearing saves remain readable');
 for(const [index,layout] of [source.draft,circular].entries()){
  const response=await save(layout,index);
  assert.equal(response.status,200,`Version ${layout.campPerimeterVersion}: ${await response.clone().text()}`);
  const stored=await loaded();
  assert.equal(stored.revision,index+1);
  assert.equal(stored.draft.campPerimeterVersion,layout.campPerimeterVersion);
  assert.deepEqual(stored.draft.items,layout.items,'Every placement survives the server round-trip');
  assert.deepEqual(stored.draft.spawn,layout.spawn);
 }
 assert.equal((await save(circular,1)).status,409,'A stale tab cannot overwrite the current world');
 assert.equal((await save({...circular,campPerimeterVersion:6},2)).status,400);
 const final=await loaded();assert.equal(final.revision,2);assert.equal(final.draft.campPerimeterVersion,5);
 assert.deepEqual(final.draft.items,circular.items);
 const html=await(await call('/checklist.html')).text();
 assert(!html.includes('Northeast matching timber gate'));
 assert(!html.includes('Heavy weathered fortification pier'));
 console.log(JSON.stringify({result:'pass',sourceRevision:source.revision,artworkRecords:artwork.records.length,legacyVersion3Readable:true,version4Placements:source.draft.items.length,version5Placements:circular.items.length,exactPlacementRoundTrips:true,unknownVersion6Rejected:true,staleWritesRejected:true,retiredGatesHidden:true,database:'disposable in-memory SQLite'},null,2));
}finally{sql.close();fs.rmSync(temp,{recursive:true,force:true})}

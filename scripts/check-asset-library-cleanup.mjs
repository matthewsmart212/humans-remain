import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';

const archive='docs/archive/asset-library-cleanup-2026-10-10';
const read=name=>JSON.parse(fs.readFileSync(`${archive}/${name}.json`));
const snapshot=read('draft'),sourceArt=read('artwork'),report=read('report');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'camp-library-'));
const db=new DatabaseSync(':memory:');
try{
 await build({stdin:{contents:`export * from './src/world-assets';export * from './src/world-layout';export * from './src/world-tiers';export * from './src/imported-art';export * from './src/catalogue-model';export * from './src/asset-library-policy';export {default as worker} from './server/checklist';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',define:{__INDEX_HTML__:JSON.stringify('<!doctype html>')},outfile:path.join(temp,'test.mjs')});
 const m=await import(pathToFileURL(path.join(temp,'test.mjs')));
 for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync('drizzle/'+file,'utf8'));
 for(const a of sourceArt.customAssets)db.prepare('INSERT INTO custom_assets (id,name,created_at) VALUES (?,?,?)').run(a.id,a.name,a.createdAt);
 for(const a of sourceArt.records)db.prepare('INSERT INTO asset_artwork (id,entry_id,revision,config_json,created_at) VALUES (?,?,?,?,?)').run(a.id,a.id,a.revision,JSON.stringify(a.config),a.updatedAt);
 db.prepare("UPDATE world_layout SET draft_json=?,revision=?,updated_at=? WHERE id='main'").run(JSON.stringify(snapshot.draft),snapshot.revision,snapshot.updatedAt);
 for(const id of ['base_hearth_t1','base_shelter_t2','base_walls_t3'])db.prepare('INSERT INTO base_checklist(id,art,updated_at) VALUES (?,1,?)').run(id,snapshot.updatedAt);
 const DB={prepare(sql){
  let args=[];
  return {
   bind(...values){args=values;return this},
   async all(){return{results:db.prepare(sql).all(...args)}},
   async run(){const result=db.prepare(sql).run(...args);return{meta:{changes:Number(result.changes)}}},
  };
 }};
 const env={DB,SITE_OWNER_ID:'migration-test-owner'},get=p=>m.worker.fetch(new Request('https://test.local'+p),env);
 const mutate=(p,method,body,owner=true)=>m.worker.fetch(new Request('https://test.local'+p,{method,headers:{Origin:'https://test.local','Content-Type':'application/json',...(owner?{'oai-authenticated-user-id':'migration-test-owner'}:{})},body:JSON.stringify(body)}),env);
 const active=await(await get('/api/asset-artwork')).json();
 assert.deepEqual(active.customAssets.map(a=>a.id).sort(),report.retainedCustomIds.toSorted());
 assert(active.records.every(r=>m.isLibraryAssetId(r.id)));
 m.installImportedArt(active.records);
 const expected=new Set([...snapshot.draft.items.map(p=>p.assetId),'art-scrapling-scrapling']);
 const palette=m.libraryAssets(m.WORLD_ASSETS);
 assert.equal(expected.size,19);assert.equal(palette.length,19);
 assert.deepEqual(palette.map(a=>a.id).sort(),[...expected].sort(),'Palette is exactly the placed assets plus Scrapling');
 assert.deepEqual(m.entries.map(e=>e.id).sort(),report.retainedBuiltInIds.toSorted());
 assert.equal(m.systemEntries.length,0);
 for(const id of [...report.removedCatalogueIds,...report.removedCustomIds])assert(!m.isLibraryAssetId(id),`Retired entry remains visible: ${id}`);
 const validation=m.validateLayout(snapshot.draft);assert.deepEqual(validation.errors,[]);assert.deepEqual(validation.layout,snapshot.draft,'Validation preserves every saved placement and property');
 const draftBefore=JSON.stringify(snapshot.draft),walls=snapshot.draft.items.filter(p=>m.wallIdentity(p.assetId));
 assert.equal(walls.length,11);
 for(const p of snapshot.draft.items){assert(m.ASSET_BY_ID.has(p.assetId));assert(m.placementGeometryAsset(p));assert(Object.values(m.placementBounds(p)).every(Number.isFinite));}
 assert.deepEqual(m.tierOptions('base_shelter_t1').map(t=>t.tier),[1]);
 assert.deepEqual(m.tierOptions('base_hearth_t1').map(t=>t.tier),[1]);
 for(const wall of walls)assert.deepEqual(m.tierOptions(wall.assetId).map(t=>[t.tier,t.available]),[[1,true],[2,true]]);
 const t2=m.changePlacementTier(snapshot.draft,walls[0].id,2);
 for(let i=0;i<snapshot.draft.items.length;i++){
  const before=snapshot.draft.items[i],after=t2.items[i];
  assert.deepEqual(m.placementBounds(after),m.placementBounds(before));
  assert.deepEqual(m.placementBodies(after),m.placementBodies(before));
  if(m.wallIdentity(before.assetId)){assert.equal(m.wallIdentity(after.assetId).tier,2);assert.deepEqual({...after,assetId:before.assetId},before);}
  else assert.deepEqual(after,before);
 }
 assert.deepEqual(m.changePlacementTier(t2,walls[0].id,1),snapshot.draft,'Round-trip wall tier change preserves locked, rotated and mirrored placements');
 assert.throws(()=>m.changePlacementTier(snapshot.draft,walls[0].id,3));
 assert.equal(JSON.stringify(snapshot.draft),draftBefore,'Tier checks never mutate the saved draft');
 const cloud=await(await get('/api/world-layout')).json();assert.deepEqual(cloud.draft,snapshot.draft);assert.equal(cloud.revision,50);
 const html=await(await get('/checklist.html')).text();assert.equal((html.match(/<article id="asset-/g)||[]).length,19);assert(!html.includes('Systems and testing'));assert(!html.includes('Canvas tent'));assert(!html.includes('Reinforced masonry wall'));
 for(const id of expected)assert(html.includes(`asset-${id}`),id);
 for(const id of report.removedCustomIds)assert(!html.includes(id));
 const marks=await(await get('/api/base-checklist')).json();assert.deepEqual(marks.rows.map(r=>r.id),['base_hearth_t1']);
 assert.equal((await mutate('/api/base-checklist','PUT',{id:'base_shelter_t2',field:'art',checked:true})).status,400);
 assert.equal((await mutate('/api/custom-assets','POST',{name:'New camp prop'},false)).status,403);
 const added=await mutate('/api/custom-assets','POST',{name:'New camp prop'});assert.equal(added.status,201);const {asset}=await added.json();
 assert((await(await get('/api/asset-artwork')).json()).customAssets.some(a=>a.id===asset.id),'New upload is visible before placement');
 db.prepare('INSERT INTO asset_art_files(id,entry_id,object_key,name,mime,width,height,bytes,published,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run('new-prop-file',asset.id,'test','prop.webp','image/webp',100,100,100,0,snapshot.updatedAt);
 const saved=await mutate('/api/asset-artwork','PUT',{id:asset.id,revision:0,config:{kind:'sprite',base:'new-prop-file',frames:[],fps:8,worldWidth:80,anchor:[.5,.9],solid:false,footprint:{width:.6,depth:.2}}});assert.equal(saved.status,200,await saved.clone().text());
 const after=await(await get('/api/asset-artwork')).json();m.installImportedArt(after.records);assert(m.libraryAssets(m.WORLD_ASSETS).some(a=>a.id===asset.id));
 assert.deepEqual(m.validateLayout(m.starterLayout()).errors,[],'Original survival starter still resolves its internal artwork');
 // Every visible artwork, roof, chest state and flame frame is still packaged.
 for(const a of palette){for(const url of [a.image,a.roof,a.unlit,a.ground?.image,...(a.frames||[]),...(a.openFrames||[])].filter(Boolean))if(url.startsWith('/survival/'))assert(fs.existsSync('public'+url),url);}
 console.log('PASS: 19 library assets; 22 placements unchanged; all 11 wall copies switch T1/T2 with identical geometry; retired entries absent from API/public library; new uploads work; original survival assets still resolve.');
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true})}

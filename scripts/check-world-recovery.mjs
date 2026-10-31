// Reproduce v105 using the real pre-update camp and the production API, then
// exercise the same fetch/hydration/recovery/migration path used by the editor.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'camp-recovery-'));
const sql=new DatabaseSync(':memory:'),originalFetch=globalThis.fetch;
try{
 const worker=(await import(pathToFileURL(process.cwd()+'/dist/server/index.js'))).default;
 await build({stdin:{contents:`export * from './src/world-layout';export * from './src/world-assets';export * from './src/imported-art';export * from './src/world-draft-recovery';export * from './src/camp-perimeter';export * from './src/asset-library-policy';export * from './src/survival-engine';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:temp+'/client.mjs'});
 const m=await import(pathToFileURL(temp+'/client.mjs'));
 for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync('drizzle/'+f,'utf8'));
 const before=JSON.parse(fs.readFileSync('docs/qa/camp-perimeter-v3/layout-before.json'));
 const artwork=JSON.parse(fs.readFileSync('docs/qa/camp-perimeter-v3/artwork-before.json'));
 for(const a of artwork.customAssets)sql.prepare('INSERT INTO custom_assets (id,name,created_at) VALUES (?,?,?)').run(a.id,a.name,a.createdAt);
 for(const a of artwork.records)sql.prepare('INSERT INTO asset_artwork (id,entry_id,revision,config_json,created_at) VALUES (?,?,?,?,?)').run(a.id,a.id,a.revision,JSON.stringify(a.config),a.updatedAt);
 const t=before.draft.terrainImage;
 if(t)sql.prepare('INSERT INTO asset_art_files (id,entry_id,object_key,name,mime,width,height,bytes,published,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(t.id,'world-terrain','test-terrain',t.name,t.mime,t.width,t.height,t.bytes,1,before.updatedAt);
 sql.prepare("UPDATE world_layout SET draft_json=?,revision=?,updated_at=? WHERE id='main'").run(JSON.stringify(before.draft),before.revision,before.updatedAt);
 const DB={prepare(q){let args=[];return{bind(...a){args=a;return this},async all(){return{results:sql.prepare(q).all(...args)}},async run(){const r=sql.prepare(q).run(...args);return{meta:{changes:Number(r.changes)}}}}}};
 const origin='https://recovery.test',env={DB,SITE_OWNER_EMAIL:'owner@example.test'};
 globalThis.fetch=(url,options)=>worker.fetch(new Request(new URL(url,origin),options),env);
 const memory=initial=>{const values=new Map(Object.entries(initial||{}));return{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}};

 // The original endpoint is a palette, not a sufficient saved-world registry.
 const palette=await(await fetch('/api/asset-artwork')).json();
 const retiredWalls=new Set(JSON.parse(fs.readFileSync('src/wall-artwork-replacements.json')).map(a=>a.entryId));
 // Recreate the old incomplete registry even though restored walls are visible again.
 m.installImportedArt(palette.records.filter(a=>!retiredWalls.has(a.id)));
 assert(palette.records.some(a=>retiredWalls.has(a.id)),'restored walls are visible in the palette');
 assert(!m.validateLayout(before.draft).layout,'v105 rejected the entire camp when seven retired wall records were omitted');
 const intact=memory({[m.LAYOUT_KEY]:JSON.stringify(before.draft)});
 const unreadable=m.readEditorDraft(intact);
 assert.equal(unreadable.layout,null);
 assert.throws(()=>m.resolveEditorDraft(unreadable,null),/kept unchanged/);
 assert.throws(()=>m.offlineEditorDraft(unreadable),/not been replaced/);
 assert.equal(intact.getItem(m.LAYOUT_KEY),JSON.stringify(before.draft),'failed reads preserve saved bytes');

 // Actual client fetchArtwork() must ask the Worker for legacy runtime records.
 const runtime=await m.fetchArtwork();
 assert.equal(runtime.records.length,13);
 assert(runtime.customAssets.some(a=>retiredWalls.has(a.id)),'original walls are restored to the picker');
 m.installImportedArt(runtime.records);
 assert(m.libraryAssets(m.WORLD_ASSETS).every(a=>m.isLibraryAssetId(a.id)));
 const saved=await m.fetchWorldLayout();
 assert.equal(saved.revision,64);assert.equal(saved.draft.items.length,1368);
 assert.deepEqual(m.validateLayout(saved.draft).errors,[]);

 const badCache=m.emptyLayout();badCache.updatedAt='2099-01-01T00:00:00.000Z';
 const storage=memory({[m.LAYOUT_KEY]:JSON.stringify(badCache)});
 const local=m.readEditorDraft(storage);
 assert(local.unconfirmedEmpty);
 const recovered=m.resolveEditorDraft(local,saved.draft);
 assert.deepEqual(recovered,saved.draft,'newer empty fallback must not hide the actual camp');
 assert.deepEqual(m.resolveEditorDraft(m.readEditorDraft(memory()),saved.draft),saved.draft,'fresh devices load the camp');
 assert.deepEqual(m.resolveEditorDraft(m.readEditorDraft(intact),saved.draft),saved.draft,'existing local camp loads');
 assert.throws(()=>m.resolveEditorDraft(local,{...saved.draft,items:[{...saved.draft.items[0],assetId:'missing-art'}]}),/could not be loaded/);
 assert.equal(storage.getItem(m.LAYOUT_KEY),JSON.stringify(badCache),'failed hydration cannot rewrite the cache');
 const newer={...saved.draft,name:'My unsynced camp edits',updatedAt:badCache.updatedAt};
 assert.equal(m.resolveEditorDraft({layout:newer,raw:JSON.stringify(newer),unconfirmedEmpty:false},saved.draft),newer,'newer real local edits win');
 assert.deepEqual(m.offlineEditorDraft(m.readEditorDraft(intact)),saved.draft,'valid camp remains usable offline');
 assert.throws(()=>m.offlineEditorDraft(local),/not been replaced/);

 const migrated=m.addApprovedCampPerimeter(recovered);
 const expectedCount=1357+JSON.parse(fs.readFileSync('src/camp-original-wall-layout.json')).length;assert.equal(migrated.items.length,expectedCount);assert.equal(migrated.campPerimeterVersion,4);
 const oldIds=new Set(JSON.parse(fs.readFileSync('src/wall-artwork-replacements.json')).map(a=>a.entryId));
 const unchanged=saved.draft.items.filter(p=>!oldIds.has(p.assetId));
 assert.equal(unchanged.length,1357);
 for(const p of unchanged)assert.deepEqual(migrated.items.find(q=>q.id===p.id),p);
 assert.equal(migrated.items.filter(p=>m.ASSET_BY_ID.get(p.assetId)?.gate).length,0);
 assert.equal(m.addApprovedCampPerimeter(migrated),migrated);
 assert.equal(m.createWorld(migrated).layout.items.length,expectedCount);
 m.persistEditorDraft(migrated,storage);
 assert.deepEqual(m.readEditorDraft(storage).layout,migrated,'recovered camp survives reload');

 // Explicit future clears and invalid cache backups are distinct from fallback.
 const clear={...m.emptyLayout(),updatedAt:badCache.updatedAt};
 m.persistEditorDraft(clear,storage);
 assert.equal(storage.getItem(m.DRAFT_BACKUP_KEY),JSON.stringify(migrated));
 assert(!m.readEditorDraft(storage).unconfirmedEmpty);
 assert.deepEqual(m.resolveEditorDraft(m.readEditorDraft(storage),saved.draft),clear,'intentional clear is retained');
 const invalid=memory({[m.LAYOUT_KEY]:'broken local JSON'});
 m.persistEditorDraft(recovered,invalid);
 assert.equal(invalid.getItem(m.DRAFT_BACKUP_KEY),'broken local JSON');

 // Validate both old saved camps and migrated ones through the deployed handler.
 const owner={'oai-authenticated-user-id':'owner-recovery-test','oai-authenticated-user-email':'owner@example.test',Origin:origin,'Content-Type':'application/json'};
 const save=(layout,revision)=>fetch('/api/world-layout',{method:'PUT',headers:owner,body:JSON.stringify({layout,revision,action:'save'})});
 let r=await save(saved.draft,64);assert.equal(r.status,200,await r.clone().text());
 r=await save(migrated,65);assert.equal(r.status,200,await r.clone().text());
 assert.equal((await save(migrated,65)).status,409);
 const reloaded=await m.fetchWorldLayout();
 assert.equal(reloaded.revision,66);assert.equal(reloaded.draft.items.length,expectedCount);assert.equal(reloaded.draft.campPerimeterVersion,4);
 assert.deepEqual(reloaded.draft.items,migrated.items);
 console.log('PASS: reproduced v105, hydrated all 1,368 saved objects via production API, recovered newer empty cache, preserved 1,357 non-wall objects, restored/saved/reloaded the original walls with open, gate-free entrances; invalid loads preserve data, deliberate clears and unsynced edits survive.');
}finally{globalThis.fetch=originalFetch;sql.close();fs.rmSync(temp,{recursive:true,force:true})}

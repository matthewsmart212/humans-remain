import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';import {pathToFileURL} from 'node:url';
const sharp=createRequire(import.meta.url)('sharp'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'hq-support-'));
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/world-layout';export * from './src/headquarters-dressing';export * from './src/imported-art';export * from './src/placed-world-renderer';export * from './src/survival-engine';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'test.mjs')});
 const m=await import(pathToFileURL(path.join(temp,'test.mjs')));m.installImportedArt(JSON.parse(fs.readFileSync('../props-artwork.json')).records);
 const cloud=JSON.parse(fs.readFileSync('../props-layout.json')).draft;assert.equal(m.addApprovedHeadquartersProps(cloud),cloud,'older cloud-only layout without furniture is untouched');
 const fixture=JSON.parse(fs.readFileSync('../hq-support-qa/staging.json')).scene;delete fixture.hqPropsVersion;fixture.items=fixture.items.filter(p=>!p.id.startsWith('hq-props-v1-'));
 const before=JSON.stringify(fixture),dressed=m.addApprovedHeadquartersProps(fixture);assert.equal(JSON.stringify(fixture),before);assert.equal(dressed.items.length,fixture.items.length+4);assert.equal(dressed.hqPropsVersion,3);assert.equal(m.addApprovedHeadquartersProps(dressed),dressed,'no duplicates on reload');
 for(const p of fixture.items)assert.deepEqual(dressed.items.find(q=>p.id===q.id),p,'existing placements are unchanged');
 assert.deepEqual(m.validateLayout(dressed).errors,[]);const restored=m.validateLayout(JSON.parse(JSON.stringify(dressed))).layout;assert.equal(restored.hqPropsVersion,3);assert.equal(m.addApprovedHeadquartersProps(restored),restored,'export/reload preserves one-time marker');
 const removed={...dressed,items:dressed.items.filter(p=>p.assetId!=='art_hq_boots')};assert.equal(m.addApprovedHeadquartersProps(removed),removed,'removed props do not reappear');
 const blank=m.emptyLayout();assert.equal(m.addApprovedHeadquartersProps(blank),blank);
 assert(m.validateLayout({...dressed,hqPropsVersion:4}).errors.length,'reject invalid marker');
 const old=JSON.parse(fs.readFileSync('../hq-support-qa/staging.json')).scene;old.hqPropsVersion=2;
 const corrected=m.addApprovedHeadquartersProps(old);assert.equal(corrected.hqPropsVersion,3);assert(!corrected.items.some(p=>p.id==='hq-props-v1-art_hq_woven_rug'));
 for(const p of old.items)if(p.id!=='hq-props-v1-art_hq_woven_rug')assert.deepEqual(corrected.items.find(q=>p.id===q.id),p,'rug removal preserves every other item');
 assert.equal(m.addApprovedHeadquartersProps(corrected),corrected,'rug removal only runs once');
 const manualRug={...old,items:[...old.items,{...old.items.find(p=>p.id==='hq-props-v1-art_hq_woven_rug'),id:'manual-rug'}]};assert(m.addApprovedHeadquartersProps(manualRug).items.some(p=>p.id==='manual-rug'),'manually placed rug stays untouched');
 const definitions=JSON.parse(fs.readFileSync('src/hq-support-art.json'));assert.equal(definitions.length,5);
 for(const d of definitions){const a=m.ASSET_BY_ID.get(d.id),p=dressed.items.find(p=>p.assetId===d.id),meta=await sharp('public'+a.image).metadata();assert(meta.hasAlpha);assert.deepEqual([meta.width,meta.height],m.imageDimensions[a.image]);if(d.id!=='art_hq_woven_rug'){assert.equal(p.locked,true);assert.equal(p.solid,false);assert.deepEqual(m.placementBodies(p),[],'no new invisible movement blockers')}assert(Object.values(m.requiredImages([d.id])).includes(a.image));}
 // Opaque roof remains above all furnished props.
 const hq=dressed.items.find(p=>p.assetId==='base_shelter_t1');hq.roof='shown';const w=m.createWorld(dressed),urls=m.requiredImages(dressed.items.map(p=>p.assetId)),imgs=Object.fromEntries(Object.entries(urls).map(([k,url])=>[k,{url}])),calls=[];
 const ctx=new Proxy({},{get:(_,key)=>key==='drawImage'?im=>calls.push(im.url):()=>{}});const draws=m.placedDrawables(ctx,imgs,w,true);draws.push({y:10000,draw:()=>calls.push('player')});draws.sort(m.compareWorldDrawables).forEach(d=>d.draw());
 const roof=m.ASSET_BY_ID.get(hq.assetId).roof,base=m.ASSET_BY_ID.get(hq.assetId).image;
 assert(calls.indexOf(base)<calls.indexOf('player'));assert.equal(calls.at(-1),roof);
 console.log('PASS: rug removed once; manually placed rugs preserved; all other headquarters props unchanged; opaque roof above all props.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}

import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {build} from 'esbuild';import {pathToFileURL} from 'node:url';import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'hq-storage-'));
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/world-layout';export * from './src/survival-engine';export * from './src/chest-animation';export * from './src/placed-world-renderer';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'check.mjs')});
 const m=await import(pathToFileURL(path.join(temp,'check.mjs'))),a=m.ASSET_BY_ID.get('art_hq_storage_chest');assert.equal(a.openFrames.length,3);assert(!a.frames,'Opening must not autoplay');
 const l=m.emptyLayout();l.items=[{...m.newPlacement(a.id,1400,1400),rotation:33,flipX:true,locked:true},m.newPlacement(a.id,1900,1400)];
 const before=JSON.stringify(l),w=m.createWorld(l),first=l.items[0],other=l.items[1];const bounds=m.placementBounds(first),collision=m.placementBodies(first);
 const urls=m.requiredImages([a.id]);for(const f of a.openFrames){assert(Object.values(urls).includes(f));const meta=await sharp('public'+f).metadata();assert.deepEqual([meta.width,meta.height],[960,960]);assert(meta.hasAlpha)}
 assert.equal(m.chestFrame(w,first.id,3),0);m.toggleChest(w,first.id);w.tick=12;assert.equal(m.chestFrame(w,first.id,3),1);w.tick=24;assert.equal(m.chestFrame(w,first.id,3),2);w.tick=999;assert.equal(m.chestFrame(w,first.id,3),2,'holds open');assert.equal(m.chestFrame(w,other.id,3),0,'instances independent');
 m.toggleChest(w,first.id);w.tick+=12;const midpoint=m.chestAmount(w,first.id);m.toggleChest(w,first.id);assert.equal(m.chestAmount(w,first.id),midpoint,'reversal does not jump');w.tick+=12;assert.equal(m.chestFrame(w,first.id,3),2);m.toggleChest(w,first.id);w.tick+=24;assert.equal(m.chestFrame(w,first.id,3),0);
 assert.equal(JSON.stringify(l),before,'interaction never moves, resizes, unlocks or writes a placement');assert.deepEqual(m.placementBounds(first),bounds);assert.deepEqual(m.placementBodies(first),collision);
 // Exercise actual placed-object renderer, including normal frame fallback.
 const images=Object.fromEntries(Object.entries(urls).map(([key,url])=>[key,{url}]));const draws=[];const ctx=new Proxy({}, {get:(_,key)=>key==='drawImage'?(im,...args)=>draws.push({url:im.url,args}):()=>{}});
 m.toggleChest(w,first.id);w.tick+=24;for(const d of m.placedDrawables(ctx,images,w,true))d.draw();assert(draws.some(d=>d.url===a.openFrames[2]));assert(draws.some(d=>d.url===a.openFrames[0]));
 // PNG masters must share an identical fixed lower body and companion cubby.
 const raws=await Promise.all([0,1,2].map(i=>sharp(`artwork-archive/hq-furniture-v2/storage-station-${i}.png`).raw().toBuffer()));
 for(let y=740;y<860;y++)for(let x=50;x<700;x++){const k=(y*960+x)*4;for(const r of raws.slice(1))assert(raws[0].subarray(k,k+4).equals(r.subarray(k,k+4)),'lower base is fixed')}
 for(let y=210;y<390;y++)for(let x=750;x<930;x++){const k=(y*960+x)*4;for(const r of raws.slice(1))assert(raws[0].subarray(k,k+4).equals(r.subarray(k,k+4)),'companion props stay fixed')}
 console.log('PASS: 3 aligned transparent frames; non-looping open/close/reversal; independent chests; actual renderer selects states; locked transforms and collision unchanged; immutable lower base and props.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}

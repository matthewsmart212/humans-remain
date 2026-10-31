import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),sharp=require('sharp');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'world-scenery-check-')),out='docs/qa/world-scenery-v1';
fs.mkdirSync(out,{recursive:true});
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/world-layout';export * from './src/scenery-catalogue';export * from './src/asset-library-policy';export * from './src/editor-image-sources';export * from './src/foliage-display';export * from './src/foliage-motion';export * from './src/foliage-renderer';export * from './src/studio-play';export * from './src/catalogue-model';export * from './src/asset-collision';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=require(path.join(temp,'model.cjs')),art=JSON.parse(fs.readFileSync('src/world-scenery-art.json'));
 assert.equal(art.length,26);assert.equal(art.filter(x=>x.kind==='foliage').length,20);
 assert.equal(m.sceneryEntries.length,26+JSON.parse(fs.readFileSync('src/world-rock-art.json')).length);assert.equal(new Set(m.entries.map(e=>e.id)).size,m.entries.length);
 const library=m.libraryAssets(m.WORLD_ASSETS);let bytes=0,pixels=0;
 for(const s of art){
  const a=m.ASSET_BY_ID.get(s.id);assert(a);assert(library.some(x=>x.id===s.id));assert.equal(a.width,s.worldWidth);
  const file='public'+s.image,meta=await sharp(file).metadata();assert(meta.hasAlpha);assert.deepEqual([meta.width,meta.height],s.size);bytes+=fs.statSync(file).size;pixels+=meta.width*meta.height;
  assert(!Object.values(m.EDITOR_ENTRY_IMAGES).includes(s.image),'Unused catalogue art does not increase startup requests');
  const p=m.newPlacement(s.id,1200,1200),layout={...m.emptyLayout(),spawn:{x:1200,y:1200},items:[p]},original=JSON.stringify(layout);
  assert.deepEqual(m.validateLayout(layout).errors,[]);
  assert.equal(Object.keys(m.requiredImages(Array(500).fill(s.id))).length,1,'Instances share one image');
  if(s.kind==='foliage'){
   assert(a.foliage);assert(m.isFoliageAsset(a));assert(!p.solid);assert(!m.layoutBlocked(layout,1200,1200,3));
   const w=m.createCampPlaySession(layout);Object.assign(w.player,{x:1210,y:1198,moving:true,direction:'right'});
   for(let i=0;i<30;i++){w.tick++;m.stepFoliage(w,1/60)}assert(w.foliageMotions?.[p.id]);
   const mesh=m.foliageMesh(p,a,w.foliageMotions[p.id],1);assert(mesh.positions.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)));
   w.weather={...w.weather,reducedMotion:true};m.stepFoliage(w,1/60);assert.equal(w.foliageMotions,undefined);
   assert(!m.foliageVisible(p,{x:5000,y:5000,width:600,height:400}));
  }else{
   assert(!a.foliage);assert(p.solid);assert(a.collision?.paths[0]?.closed);
   assert.equal(m.collisionError(a.collision),'',s.name+' blocker is a valid simple polygon');
   const b=m.placementBounds(p),points=a.collision.paths[0].points,centre=points.reduce((c,v)=>[c[0]+v[0]/points.length,c[1]+v[1]/points.length],[0,0]);
   assert(m.layoutBlocked(layout,b.x+b.width*centre[0],b.y+b.height*centre[1],3));
   assert(!m.layoutBlocked(layout,1200,1200-a.height*.92,3),'Rock/log footprint does not block empty air above it');
   for(const rotation of [0,90,225])for(const flipX of [false,true])for(const scale of [.5,1,2]){
    const transformed={...p,rotation,flipX,scale},bounds=m.placementBounds(transformed);
    const [x,y]=m.placementPoint(transformed,bounds.x+bounds.width*centre[0],bounds.y+bounds.height*centre[1]);
    assert(m.layoutBlocked({...layout,items:[transformed]},x,y,1),s.name+' transformed ground footprint');
   }
  }
  assert.equal(JSON.stringify(layout),original);
 }
 assert(bytes<3000000,'Scenery compressed transfer budget');assert(pixels*4<32*1048576,'Scenery decoded texture budget');
 // Large instance sets deduplicate by URL and never affect the saved camp.
 const ids=Array.from({length:2600},(_,i)=>art[i%art.length].id);assert.equal(Object.keys(m.requiredImages(ids)).length,26);
 const report={result:'pass',foliage:20,staticProps:6,compressedBytes:bytes,maxDecodedMiB:pixels*4/1048576,uniqueTexturesFor2600Instances:26,extraStartupImagesWhenUnplaced:0,checks:['catalogue visibility and unique IDs','transparent exports','correct image metadata','shared textures','no unused startup requests','walk-through foliage','contact bending','reduced motion','offscreen foliage culling','ground-only prop collision','draft immutability'],limits:'Software checks only; no physical iPhone or browser GPU measurement. No automatic map population.'};
 fs.writeFileSync(out+'/checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}

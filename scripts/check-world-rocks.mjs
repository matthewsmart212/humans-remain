import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),sharp=require('sharp'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'rocks-check-'));
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/world-layout';export * from './src/asset-collision';export * from './src/asset-library-policy';export * from './src/editor-image-sources';export * from './src/catalogue-model';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=require(path.join(temp,'model.cjs')),art=JSON.parse(fs.readFileSync('src/world-rock-art.json')),library=m.libraryAssets(m.WORLD_ASSETS);
 assert.equal(art.length,20);assert.equal(art.filter(a=>a.walkable).length,3);assert.equal(new Set(m.entries.map(e=>e.id)).size,m.entries.length);
 let bytes=0,pixels=0,transforms=0;
 for(const s of art){
  const a=m.ASSET_BY_ID.get(s.id),p=m.newPlacement(s.id,1200,1200);assert(a&&library.some(x=>x.id===a.id));
  const layout={...m.emptyLayout(),spawn:{x:1500,y:1500},items:[p]},original=JSON.stringify(layout);assert.deepEqual(m.validateLayout(layout).errors,[]);
  const file='public'+s.image,meta=await sharp(file).metadata();assert(meta.hasAlpha);assert.deepEqual([meta.width,meta.height],s.size);bytes+=fs.statSync(file).size;pixels+=meta.width*meta.height;
  assert(!Object.values(m.EDITOR_ENTRY_IMAGES).includes(s.image),'Unplaced rocks add no startup image');assert.equal(Object.keys(m.requiredImages(Array(1000).fill(s.id))).length,1);
  if(s.walkable){
   assert(!p.solid&&a.groundDetail&&!a.foliage);assert.deepEqual(a.body,[]);assert.deepEqual(a.collision.paths,[]);assert.equal(p.layer,-6);assert.equal(p.allowTransparency,false);
   assert(!m.layoutBlocked(layout,1200,1200,19));assert(m.compareWorldDrawables({layer:p.layer,y:1400},{y:1000})<0,'Ground stones stay below characters');
  }else{
   assert(p.solid&&!a.groundDetail&&!a.foliage);assert.equal(m.collisionError(a.collision),'',s.name);assert(a.collision.paths[0].closed);
   const points=a.collision.paths[0].points,c=points.reduce((n,p)=>[n[0]+p[0]/points.length,n[1]+p[1]/points.length],[0,0]);
   for(const rotation of [0,90,225])for(const flipX of [false,true])for(const scale of [.5,1,2]){
    const t={...p,rotation,flipX,scale},b=m.placementBounds(t),[x,y]=m.placementPoint(t,b.x+b.width*c[0],b.y+b.height*c[1]);
    assert(m.layoutBlocked({...layout,items:[t]},x,y,1),s.name+' transformed footprint');transforms++;
   }
   assert(!m.layoutBlocked(layout,p.x,p.y-a.height,1),'Empty space above the rock remains walkable');
  }
  assert.equal(JSON.stringify(layout),original);
 }
 assert(bytes<3000000,'Compressed rock budget');assert(pixels*4<24*1048576,'Decoded rock budget');
 assert.equal(Object.keys(m.requiredImages(Array.from({length:2000},(_,i)=>art[i%20].id))).length,20);
 const result={result:'pass',newRocks:20,solidRocks:17,walkablePatches:3,transformedCollisionCases:transforms,bytes,decodedMiB:pixels*4/1048576,texturesFor2000Instances:20,unusedStartupRequests:0,checks:['Catalogue visibility and IDs','Transparent exports and dimensions','Placement validation','Collision polygons','Scale, rotation and mirroring','Walkable ground details render below the player','Shared images','Saved layout immutability'],deviceFPSMeasured:false};
 fs.mkdirSync('docs/qa/world-rocks-v1',{recursive:true});fs.writeFileSync('docs/qa/world-rocks-v1/checks.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}

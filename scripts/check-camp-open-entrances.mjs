// Local fixtures only: never replace the owner's live world with this test data.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'camp-open-')),qa='docs/qa/camp-moss-no-gates-v1';
fs.mkdirSync(qa,{recursive:true});
try{
 await build({stdin:{contents:`export * from './src/world-layout';export * from './src/world-assets';export * from './src/imported-art';export * from './src/camp-perimeter';export * from './src/camp-gates';export * from './src/studio-play';export * from './src/survival-engine';export * from './src/world-bounds';export * from './src/asset-library-policy';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:temp+'/test.mjs'});
 const m=await import(pathToFileURL(temp+'/test.mjs'));
 const art=JSON.parse(fs.readFileSync(qa+'/source-artwork.json'));
 m.installImportedArt(art.records);
 const before=JSON.parse(fs.readFileSync(qa+'/source-layout.json')).draft;
 const saved=JSON.stringify(before),after=m.addApprovedCampPerimeter(before);
 assert.equal(before.campPerimeterVersion,3);assert.equal(JSON.stringify(before),saved);
 assert.deepEqual(m.validateLayout(before).errors,[],'legacy gate IDs still hydrate');
 assert.equal(after.campPerimeterVersion,4);assert.equal(m.addApprovedCampPerimeter(after),after);
 assert.deepEqual(m.validateLayout(after).errors,[]);assert(m.validateLayout({...after,campPerimeterVersion:5}).errors.length);
 const gates=before.items.filter(p=>m.ASSET_BY_ID.get(p.assetId)?.gate);assert.equal(gates.length,6);
 assert.equal(after.items.length,before.items.length-6);
 assert.deepEqual(after.items,before.items.filter(p=>!gates.includes(p)),'every wall, building, plant and puddle is unchanged');
 assert(!after.items.some(p=>m.ASSET_BY_ID.get(p.assetId)?.gate));
 assert(!m.libraryAssets(m.WORLD_ASSETS).some(p=>p.gate),'retired gates are not offered for placement');
 // Fresh devices, local cached layouts, and intentionally moved/deleted walls.
 assert.deepEqual(m.addApprovedCampPerimeter(JSON.parse(JSON.stringify(after))),after);
 const wallIds=new Set(JSON.parse(fs.readFileSync('src/wall-artwork-replacements.json')).map(p=>p.entryId));
 const firstWall=before.items.find(p=>wallIds.has(p.assetId));
 const changed={...before,items:before.items.filter(p=>p.id!==firstWall.id).map(p=>wallIds.has(p.assetId)?{...p,x:p.x+9}:p)};
 const changedAfter=m.addApprovedCampPerimeter(changed);
 assert.deepEqual(changedAfter.items,changed.items.filter(p=>!m.ASSET_BY_ID.get(p.assetId)?.gate),'do not restore/reposition v3 walls');
 const removedWall={...after,items:after.items.filter(p=>p.id!==firstWall.id)};assert.equal(m.addApprovedCampPerimeter(removedWall),removedWall);
 const custom={...before,terrainImage:{...before.terrainImage,url:'/api/asset-files/future-user-terrain'}};assert.equal(m.addApprovedCampPerimeter(custom),custom);
 const empty=m.emptyLayout();assert.equal(m.addApprovedCampPerimeter(empty),empty);
 const reports=[];
 for(const gate of gates){
  const a=m.ASSET_BY_ID.get(gate.assetId),q=m.gateLocal(gate,a,0),cx=(q.a.x+q.b.x)/2,cy=(q.a.y+q.b.y)/2,dx=q.b.x-q.a.x,dy=q.b.y-q.a.y,len=Math.hypot(dx,dy),n={x:-dy/len,y:dx/len};
  const origin={x:cx-n.x*145,y:cy-n.y*145},target={x:cx+n.x*190,y:cy+n.y*190};
  const w=m.createCampPlaySession(after,origin);
  assert.equal(m.nearbyGate(w),null,'no stale interaction prompt');
  for(let d=-145;d<=190;d+=8)assert(!m.worldBlocked(w,cx+n.x*d,cy+n.y*d,19),gate.assetId+' road blocked at '+d);
  const route=m.pathTo(origin,target,w,2500);assert(route.length>0);assert(route.every(v=>!m.worldBlocked(w,v.x,v.y,19)));
  for(const direction of [1,-1]){
   Object.assign(w.player,direction===1?origin:target);
   for(let i=0;i<90;i++)m.stepCampPlaySession(w,{x:n.x*direction,y:n.y*direction},true,false);
   assert(((w.player.x-cx)*n.x+(w.player.y-cy)*n.y)*direction>100,'sprint through both ways');
  }
  reports.push({entrance:gate.assetId,roadClear:true,sprintBothDirections:true,noPrompt:true,pathCells:route.length});
 }
 const bounds=m.campBounds(after);assert(bounds.left<0&&bounds.right>3900);
 assert.equal(new Set(m.WORLD_ASSETS.map(a=>a.id)).size,m.WORLD_ASSETS.length);
 fs.writeFileSync(qa+'/layout-before.json',JSON.stringify({fixtureOnly:true,draft:before},null,2));
 fs.writeFileSync(qa+'/artwork-before.json',JSON.stringify(art,null,2));
 fs.writeFileSync(qa+'/layout-after.json',JSON.stringify({fixtureOnly:true,draft:after},null,2));
 fs.writeFileSync(qa+'/verification.json',JSON.stringify({result:'pass',gatesRemoved:gates.length,placementsPreserved:after.items.length,originalWalls:after.items.filter(p=>wallIds.has(p.assetId)).length,entrances:reports},null,2));
 console.log('PASS: six gates removed, all other placements identical, six roads clear both ways, no gate prompts, no re-addition on reload, custom terrains and v3 wall edits preserved.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}

// Verify the actual current saved camp upgrades without rewriting prior edits.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const out='docs/qa/foliage-v2',temp=fs.mkdtempSync(path.join(os.tmpdir(),'foliage-expansion-'));
try{
 await build({stdin:{contents:`export * from './src/world-assets';export * from './src/world-layout';export * from './src/imported-art';export * from './src/foliage-trial';export * from './src/foliage-motion';export * from './src/foliage-renderer';export * from './src/studio-play';export * from './src/survival-engine';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'test.mjs')});
 const m=await import(pathToFileURL(path.join(temp,'test.mjs')));
 const source=JSON.parse(fs.readFileSync(out+'/camp-before.json')).draft;
 m.installImportedArt(JSON.parse(fs.readFileSync(out+'/artwork-before.json')).records);
 const before=JSON.stringify(source),layout=m.addApprovedFoliageExpansion(m.addApprovedFoliageTrial(source));
 const added=layout.items.filter(p=>p.id.startsWith(m.FOLIAGE_EXPANSION_PREFIX)),fire=layout.items.find(p=>p.role==='hearth');
 assert.equal(added.length,48);assert.equal(layout.items.filter(p=>m.ASSET_BY_ID.get(p.assetId)?.foliage).length,60);
 assert.deepEqual(layout.items.slice(0,source.items.length),source.items,'Every existing edit is retained');assert.equal(JSON.stringify(source),before);
 for(const key of ['spawn','terrainImage','terrainBorder','hqPropsVersion','campCentreVersion'])assert.deepEqual(layout[key],source[key],key);
 assert.equal(layout.foliageTrialVersion,2);assert.deepEqual(m.validateLayout(layout).errors,[]);assert.equal(m.validateLayout(layout).layout.foliageTrialVersion,2);
 assert.equal(m.addApprovedFoliageExpansion(layout),layout,'Upgrade never duplicates');
 const deleted={...layout,items:layout.items.filter(p=>!m.ASSET_BY_ID.get(p.assetId)?.foliage)};
 assert.equal(m.addApprovedFoliageExpansion(m.addApprovedFoliageTrial(deleted)),deleted,'Neither trial resurrects deleted plants');
 const edited={...source,items:source.items.map(p=>p.id==='camp-foliage-v1-1'?{...p,x:p.x+17,scale:1.23}:p)};
 assert.deepEqual(m.addApprovedFoliageExpansion(edited).items.slice(0,edited.items.length),edited.items);
 assert.equal(m.addApprovedFoliageExpansion(m.emptyLayout()).items.length,0);
 const movedFire={...source,items:source.items.map(p=>p===fire?{...p,x:1000}:p)};
 assert.equal(m.addApprovedFoliageExpansion(movedFire),movedFire);
 const blocker={...m.newPlacement('base_hearth_t1',added[0].x,added[0].y),id:'owner-new-blocker'};
 const blocked={...source,items:[...source.items,blocker]},careful=m.addApprovedFoliageExpansion(blocked);
 assert(!careful.items.some(p=>p.id===added[0].id),'Never decorate over new blockers');assert.deepEqual(careful.items.slice(0,blocked.items.length),blocked.items);
 for(const p of added){
  assert.equal(p.solid,false);assert.equal(p.layer,0);assert.deepEqual(m.placementBodies(p),[]);
  const b=m.placementBounds(p);
  if(p.y>fire.y)assert(b.x+b.width<fire.x-120||b.x>fire.x+120,'South cooking/drop corridor stays visually open');
 }
 // Collision map must remain exactly identical across the entire trial area.
 for(let x=fire.x-650;x<fire.x+650;x+=19)for(let y=fire.y-350;y<fire.y+470;y+=19)assert.equal(m.layoutBlocked(layout,x,y),m.layoutBlocked(source,x,y));
 const newAssets=[...new Set(added.filter(p=>!['art_foliage_broadleaf','art_foliage_fern','art_foliage_grass'].includes(p.assetId)).map(p=>p.assetId))];assert.equal(newAssets.length,4);
 let bytes=0;for(const id of newAssets){
  const a=m.ASSET_BY_ID.get(id),p=added.find(p=>p.assetId===id),file='public'+a.image,meta=await sharp(file).metadata();
  assert(meta.hasAlpha);assert(meta.width<=384&&meta.height<=420);bytes+=fs.statSync(file).size;
  const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(let x=0;x<info.width;x++){assert.equal(data[x*4+3],0);assert.equal(data[((info.height-1)*info.width+x)*4+3],0)}
  for(let y=0;y<info.height;y++){assert.equal(data[(y*info.width)*4+3],0);assert.equal(data[(y*info.width+info.width-1)*4+3],0)}
  const flat=structuredClone(m.foliageMesh(p,a,{x:0,y:0},0,true)),bent=m.foliageMesh(p,a,{x:.8,y:.3},1);
  for(let i=25;i<35;i++)assert.deepEqual(bent.positions[i],flat.positions[i],'All new plant roots stay fixed');
  assert(m.placementPoint(p,bent.positions[2].x,bent.positions[2].y)[0]>m.placementPoint(p,flat.positions[2].x,flat.positions[2].y)[0],'Mirrored/rotated plants still bend in the world push direction');
 }
 assert(bytes<600000,'Four extra textures stay lightweight');
 const w=m.createCampPlaySession(layout),p=added[0];Object.assign(w.player,{x:p.x-14,y:p.y,moving:true,direction:'right'});
 for(let i=0;i<32;i++){w.tick++;m.stepFoliage(w,m.STEP)}assert(w.foliageMotions[p.id].x>0);
 fs.writeFileSync(out+'/verification.json',JSON.stringify({result:'pass',preservedPlacements:source.items.length,addedPlants:added.length,totalPlants:60,newDesigns:4,newRuntimeBytes:bytes,checks:['current saved camp preserved','moved/deleted plants retained','v1/v2 deletion persistence','new blockers respected','same passability','south approach clear','transparent artwork edges','rooted motion on four new designs'],limits:'Software Skia rendering and automated checks; browser/iPhone QA unavailable.'},null,2)+'\n');
 console.log(`PASS expanded foliage: ${source.items.length} saved placements preserved, ${added.length} additions, 60 total plants, 4 new textures (${bytes} bytes); migration, deletion persistence, object clearance, collision equality, alpha and fixed-root interaction.`);
}finally{fs.rmSync(temp,{recursive:true,force:true})}

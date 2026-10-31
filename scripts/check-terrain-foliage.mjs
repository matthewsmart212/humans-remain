// Verify the additive terrain-style foliage upgrade against the version 99 fixture.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const out='docs/qa/foliage-v3',temp=fs.mkdtempSync(path.join(os.tmpdir(),'terrain-foliage-'));
try{
 await build({stdin:{contents:`export * from './src/world-assets';export * from './src/world-layout';export * from './src/imported-art';export * from './src/foliage-trial';export * from './src/foliage-motion';export * from './src/foliage-renderer';export * from './src/studio-play';export * from './src/survival-engine';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'test.mjs')});
 const m=await import(pathToFileURL(path.join(temp,'test.mjs')));
 const fixture=JSON.parse(fs.readFileSync(out+'/camp-before.json')),source=fixture.draft;
 m.installImportedArt(JSON.parse(fs.readFileSync(out+'/artwork-before.json')).records);
 const upgrade=l=>m.addApprovedTerrainFoliage(m.addApprovedFoliageExpansion(m.addApprovedFoliageTrial(l)));
 const before=JSON.stringify(source),layout=upgrade(source),added=layout.items.filter(p=>p.id.startsWith(m.TERRAIN_FOLIAGE_PREFIX)),fire=source.items.find(p=>p.role==='hearth');
 assert.equal(added.length,24);assert.equal(layout.items.length,109);assert.equal(layout.items.filter(p=>m.ASSET_BY_ID.get(p.assetId)?.foliage).length,84);
 assert.deepEqual(layout.items.slice(0,source.items.length),source.items,'Every existing placement retained');assert.equal(JSON.stringify(source),before);
 for(const key of ['spawn','terrainImage','terrainBorder','hqPropsVersion','campCentreVersion'])assert.deepEqual(layout[key],source[key],key);
 assert.equal(layout.foliageTrialVersion,3);assert.deepEqual(m.validateLayout(layout).errors,[]);assert.equal(m.validateLayout(layout).layout.foliageTrialVersion,3);
 assert.equal(upgrade(layout),layout,'No duplicate migration');
 const deleted={...layout,items:layout.items.filter(p=>!m.ASSET_BY_ID.get(p.assetId)?.foliage)};assert.equal(upgrade(deleted),deleted,'Deleted plants stay deleted across every migration');
 const edited={...source,items:source.items.map(p=>p.id==='camp-foliage-v2-1'?{...p,x:p.x+17,scale:1.23}:p)};assert.deepEqual(upgrade(edited).items.slice(0,edited.items.length),edited.items);
 assert.equal(m.addApprovedTerrainFoliage(m.emptyLayout()).items.length,0);
 const movedFire={...source,items:source.items.map(p=>p===fire?{...p,x:1000}:p)};assert.equal(m.addApprovedTerrainFoliage(movedFire),movedFire);
 const blocker={...m.newPlacement('base_hearth_t1',added[0].x,added[0].y),id:'owner-new-blocker'};
 const blocked={...source,items:[...source.items,blocker]},careful=upgrade(blocked);assert(!careful.items.some(p=>p.id===added[0].id),'New blockers respected');assert.deepEqual(careful.items.slice(0,blocked.items.length),blocked.items);
 for(const p of added){
  assert.equal(p.solid,false);assert.equal(p.layer,0);assert.deepEqual(m.placementBodies(p),[]);
  const b=m.placementBounds(p);if(p.y>fire.y)assert(b.x+b.width<fire.x-120||b.x>fire.x+120,'South cooking/drop corridor stays open');
 }
 for(let x=fire.x-650;x<fire.x+650;x+=19)for(let y=fire.y-450;y<fire.y+570;y+=19)assert.equal(m.layoutBlocked(layout,x,y),m.layoutBlocked(source,x,y),'Passability unchanged');
 const ids=[...new Set(added.map(p=>p.assetId))];assert.equal(ids.length,3);let bytes=0;
 for(const id of ids){
  const a=m.ASSET_BY_ID.get(id),p=added.find(p=>p.assetId===id),file='public'+a.image,meta=await sharp(file).metadata();assert(meta.hasAlpha);assert(meta.width<=384&&meta.height<=384);bytes+=fs.statSync(file).size;
  const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(let x=0;x<info.width;x++){assert.equal(data[x*4+3],0);assert.equal(data[((info.height-1)*info.width+x)*4+3],0)}
  for(let y=0;y<info.height;y++){assert.equal(data[(y*info.width)*4+3],0);assert.equal(data[(y*info.width+info.width-1)*4+3],0)}
  const flat=structuredClone(m.foliageMesh(p,a,{x:0,y:0},0,true)),bent=m.foliageMesh(p,a,{x:.8,y:.3},1);
  for(let i=25;i<35;i++)assert.deepEqual(bent.positions[i],flat.positions[i],'All roots stay fixed');
  assert(m.placementPoint(p,bent.positions[2].x,bent.positions[2].y)[0]>m.placementPoint(p,flat.positions[2].x,flat.positions[2].y)[0],'Rotated and mirrored plants follow the push direction');
 }
 assert(bytes<350000,'Three textures remain lightweight');
 const w=m.createCampPlaySession(layout),p=added[0];Object.assign(w.player,{x:p.x-14,y:p.y,moving:true,direction:'right'});
 for(let i=0;i<32;i++){w.tick++;m.stepFoliage(w,m.STEP)}assert(w.foliageMotions[p.id].x>0,'Broad leaves react to walk-through contact');
 fs.writeFileSync(out+'/verification.json',JSON.stringify({result:'pass',preservedPlacements:source.items.length,addedPlants:added.length,totalPlants:84,newDesigns:3,newRuntimeBytes:bytes,fixture:fixture.fixtureNote,checks:['existing placements unchanged','moved/deleted plants retained','all migration versions idempotent','new blockers respected','identical collision map','south approach clear','transparent borders','fixed roots and directional contact'],limits:'Software Skia rendering and automated checks; browser/iPhone QA unavailable.'},null,2)+'\n');
 console.log(`PASS terrain foliage: ${source.items.length} placements preserved, ${added.length} additions, 84 plants, 3 new textures (${bytes} bytes); migration, deletion, collision equality, alpha and rooted contact.`);
}finally{fs.rmSync(temp,{recursive:true,force:true})}

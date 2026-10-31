import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';
import {build} from 'esbuild';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'camp-garden-'));
try{
 await build({stdin:{contents:`export * from './src/authored-world';export * from './src/imported-art';export * from './src/world-layout';export * from './src/world-assets';export * from './src/world-tiers';export * from './src/camp-garden-art';export * from './src/camp-garden-placement';export * from './src/camp-collision';export * from './src/studio-play';export * from './src/survival-engine';export * from './src/run-save';export * from './src/scene-travel';export * from './src/camp-smithy';export * from './src/camp-furnace';export * from './src/warehouse';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(tmp,'model.cjs'),logLevel:'error'});
 const m=createRequire(import.meta.url)(path.join(tmp,'model.cjs')),snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));
 m.installImportedArt(snapshot.records);
 const raw=structuredClone(snapshot.layout);delete raw.campGardenVersion;raw.items=raw.items.filter(p=>!m.GARDEN_IDS.has(p.assetId));
 const original=JSON.stringify(raw),layout=m.prepareAuthoredWorld(raw),garden=layout.items.find(p=>p.id===m.GARDEN_PLACEMENT_ID);
 assert(garden,'The approved outer camp strip must fit the garden');assert.equal(garden.assetId,m.GARDEN_ART[0].id);assert.equal(garden.locked,true);
 assert.equal(JSON.stringify(raw),original,'Do not mutate the authored input');assert.deepEqual(layout.items.filter(p=>p!==garden),raw.items,'Keep every existing placement unchanged');
 assert.equal(m.prepareAuthoredWorld(layout),layout);assert.equal(m.validateLayout(layout).layout.campGardenVersion,1);assert.deepEqual(m.validateLayout(layout).errors,[]);
 const removed={...layout,items:layout.items.filter(p=>p!==garden)};assert.equal(m.prepareAuthoredWorld(removed),removed,'Owner removal must survive reload');
 const moved={...layout,items:layout.items.map(p=>p===garden?{...p,x:p.x+20}:p)};assert.equal(m.prepareAuthoredWorld(moved),moved,'Owner move must survive reload');
 const occupied={...raw,items:[...raw.items,{...m.newPlacement('base_workshop_t1',garden.x,garden.y),id:'new-owner-building'}]};assert.equal(m.addApprovedCampGarden(occupied),occupied,'New owner construction takes priority');
 const unrelated={...raw,items:raw.items.filter(p=>p.assetId!=='base_medical_t2')};assert.equal(m.addApprovedCampGarden(unrelated),unrelated);
 assert.deepEqual(m.tierOptions(garden.assetId).map(o=>o.tier),[0,1,2,3]);
 const ground=m.placementBounds(garden),bodies=m.placementBodies(garden);
 assert(bodies.some(c=>m.hitCollider(c,ground.x+ground.width*.5,ground.y+ground.height*.8,1)),'Ground beds block walking');
 assert(!bodies.some(c=>m.hitCollider(c,ground.x+ground.width*.5,ground.y+ground.height*.3,1)),'Roof pixels do not make an invisible wall');
 for(const a of m.GARDEN_ART){
  assert(fs.existsSync('public'+a.image),a.image);
  const next=m.changePlacementTier(layout,garden.id,a.tier),p=next.items.find(p=>p.id===garden.id);
  assert.equal(p.assetId,a.id);assert.deepEqual(m.placementBounds(p),ground);assert.deepEqual(m.placementBodies(p),bodies);
  assert.equal(p.x,garden.x);assert.equal(p.y,garden.y);assert.equal(p.scale,garden.scale);assert.equal(p.locked,true);
  assert.equal(m.validateLayout(next).errors.length,0);
  const w=m.createCampPlaySession(next);
  for(const target of [next.spawn,m.smithyDock(m.smithies(next)[0]),m.furnaceDock(m.furnaces(next)[0]),m.warehouseDock(m.warehouses(next)[0])]){
   const route=m.pathTo(w.player,target,w,10000,23);assert(m.distance(w.player,target)<145||route.length&&m.distance(route.at(-1),target)<145,`Camp route remains open at tier ${a.tier}: ${JSON.stringify(target)}`);
  }
 }
 const w=m.createCampPlaySession(raw,undefined,'survival'),travel=new m.SceneTravel(w,{pin(){},prepare:async()=>{},ready:()=>true});
 const resumed=m.decodeRun(m.encodeRun(travel));assert(resumed.worlds[0][1].layout.items.some(p=>p.id===garden.id),'Continue upgrades the old camp artwork');
 const blocked=m.createCampPlaySession(raw,undefined,'survival');Object.assign(blocked.player,{x:ground.x+ground.width*.5,y:ground.y+ground.height*.8});
 const safe=m.decodeRun(m.encodeRun(new m.SceneTravel(blocked,{pin(){},prepare:async()=>{},ready:()=>true}))).worlds[0][1];
 assert(!safe.layout.items.some(p=>p.id===garden.id),'Do not trap a returning player standing in the new lot');assert.equal(safe.player.x,blocked.player.x);
 const report={passed:true,placement:{x:garden.x,y:garden.y},states:4,checks:['Transparent artwork registered','One outer-strip placement; all existing objects retained','Idempotent addition; owner moves/removals and occupied lots respected','Four tiers share dimensions, anchor and ground collision','Spawn, smithy, furnace and warehouse routes remain open at every tier','Old survival saves gain artwork without trapping or moving the player']};
 fs.mkdirSync('docs/qa/camp-garden-v1',{recursive:true});fs.writeFileSync('docs/qa/camp-garden-v1/checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(tmp,{recursive:true,force:true})}

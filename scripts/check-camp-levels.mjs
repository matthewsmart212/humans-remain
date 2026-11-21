import {collectStarterTools, establishBuilding, reachCampLevel, supply, visitHQ} from './fixtures/camp-progression.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'camp-access-'));
try{
 await build({stdin:{contents:`export * from './src/camp-levels';export * from './src/camp-restoration';export * from './src/loot-chest';export * from './src/building-repair';export * from './src/run-progression';export * from './src/headquarters-plans';export * from './src/headquarters-model';export * from './src/run-save';export * from './src/scene-travel';export * from './src/studio-play';export * from './src/authored-world';export * from './src/imported-art';export * from './src/expedition-inventory';export * from './src/camp-materials';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(dir,'model.cjs'),logLevel:'error'});
 const m=createRequire(import.meta.url)(path.join(dir,'model.cjs')),snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));
 m.installImportedArt(snapshot.records);const layout=m.prepareAuthoredWorld(snapshot.layout),resources={pin(){},prepare:async()=>{},ready:()=>true};
 const make = () => {
  const world = m.createCampPlaySession(layout, undefined, 'survival');
  collectStarterTools(m, world);
  return world;
 };
 const stock = w => JSON.stringify([w.bag,w.stock,w.gear]);
 const save = w => m.encodeRun(new m.SceneTravel(w,resources));
 const load = w => m.decodeRun(save(w)).worlds[0][1];
 const stages = [[], ['well','fire'], ['warehouse','garden'], ['workshop','furnace'], ['bunker','treatment']];
 const oldRun = make();
 const oldCache = {id:'expedition-repair-cache',assetId:'art_hq_storage_chest',x:2551,y:2094,scale:.65,solid:false,role:'prop',locked:true,roof:'auto'};
 assert(!oldRun.layout.items.some(p => p.id === oldCache.id));
 oldRun.layout.items.push(oldCache, {...oldCache,id:'editor-supply-chest'});
 const continued = load(oldRun);
 assert(!continued.layout.items.some(p => p.id === oldCache.id));
 assert(continued.layout.items.some(p => p.id === 'editor-supply-chest'));

 let w = make();
 visitHQ(m,w);
 assert.equal(m.campAccessLevel(w),0);
 assert(!m.expandCamp(w));
 assert.deepEqual(m.CAMP_MILESTONES[1].requires,[]);
 assert.deepEqual(m.CAMP_MILESTONES[1].cost, m.CAMP_REPAIRS.headquarters.cost);
 establishBuilding(m,w,'headquarters');
 let previousCost = m.CAMP_REPAIRS.headquarters.cost;
 for (let level = 1; level <= 4; level++) {
  assert.equal(m.campAccessLevel(w),level);
  assert.deepEqual(m.CAMP_BUILDING_IDS.filter(id => m.CAMP_REPAIRS[id].level === level).sort(), [...stages[level]].sort());
  for (const id of stages.slice(level+1).flat()) {
   const site = m.campRepairSite(w,id);
   w.stationPanel = undefined;
   Object.assign(w.player,{x:site.x,y:site.y,equipped:'repairHammer'});
   supply(m,w,m.CAMP_REPAIRS[id].cost);
   const before = stock(w);
   assert(!m.beginBuildingRepair(w,id), id + ' hammer job is locked');
   assert(!m.restoreCampBuilding(w,id), id + ' payment is locked');
   assert.equal(stock(w),before);
  }
  const milestone = m.CAMP_MILESTONES[level+1];
  if (milestone) {
   assert.deepEqual([...milestone.requires].sort(), [...stages[level]].sort());
   assert(milestone.cost.pallets > previousCost.pallets);
   previousCost = milestone.cost;
  }
  for (const id of stages[level]) {
   if (milestone) {
    visitHQ(m,w);
    supply(m,w,milestone.cost);
    const before = stock(w);
    assert(!m.expandCamp(w), id + ' is still broken');
    assert.equal(stock(w),before);
   }
   establishBuilding(m,w,id);
   assert(m.buildingRestored(load(w),id));
  }
  if (!milestone) break;
  visitHQ(m,w);
  for (const failure of ['night','dead','downed','over','far','closed','scene','site','destroyed','insufficient']) {
   const test = load(w);
   visitHQ(m,test);
   supply(m,test,milestone.cost);
   const site = m.campRepairSite(test,stages[level][0]);
   if (failure==='night'||failure==='over') test.phase=failure;
   if (failure==='dead') test.player.hp=0;
   if (failure==='downed') test.player.downedUntil=999;
   if (failure==='far') test.player.x+=1000;
   if (failure==='closed') test.stationPanel=undefined;
   if (failure==='scene') test.scene={id:'bunker'};
   if (failure==='site') test.layout={...test.layout,items:test.layout.items.filter(p=>p.id!==site.placement.id)};
   if (failure==='destroyed') test.progression.buildingHp[stages[level][0]]=0;
   if (failure==='insufficient') m.setItemCount(test,'pallets',milestone.cost.pallets-1);
   const before=stock(test);
   assert(!m.expandCamp(test),level+' '+failure);
   assert.equal(stock(test),before);
  }
  for (const [id,n] of Object.entries(milestone.cost)) {
   m.setItemCount(w,id,1);
   m.setStoredCount(w,id,n-1);
  }
  assert(m.expandCamp(w));
  for (const kind of Object.keys(milestone.cost)) assert.equal(m.materialTotal(w,kind),0);
  const paid = stock(w);
  assert(!m.expandCamp(w));
  assert.equal(stock(w),paid);
  w = load(w);
 }
 assert.equal(m.campAccessLevel(w),4);
 assert.equal(m.campAccessLevel(m.createCampPlaySession(layout)),4);
 visitHQ(m,w);
 assert(!m.expandCamp(w));
 for (const value of [null,5,-1,1.5,'2']) {
  const data=JSON.parse(save(w));
  data.worlds[0][1].progression.campLevel=value;
  assert.throws(()=>m.decodeRun(JSON.stringify(data)),/camp level/);
 }
 const legacy=make();
 reachCampLevel(m,legacy,1);
 legacy.progression.version=1;
 legacy.progression.restoredBuildings.push('workshop');
 assert.equal(m.campAccessLevel(load(legacy)),3);
 delete legacy.progression.restoredBuildings;
 assert.equal(m.campAccessLevel(load(legacy)),4);
 const report = {
  passed:true,
  checks:[
   'Each camp level permits its repair pair and blocks all later sites',
   'HQ expansion requires both intact prerequisite sites and the full escalating materials',
   'Rejected actions preserve inventory; successful upgrades consume backpack and stored materials exactly once',
   'All four levels and purchased facilities survive reloads, including migration of earlier camps'
  ],
  camp2Cost:m.CAMP_MILESTONES[2].cost,
  milestones:m.CAMP_MILESTONES,
  browserTested:false,
  physicalIPhoneTested:false
 };
 const reportDir='docs/qa/camp-levels-v1';
 fs.mkdirSync(reportDir,{recursive:true});
 fs.writeFileSync(path.join(reportDir,'checks.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(dir,{recursive:true,force:true})}

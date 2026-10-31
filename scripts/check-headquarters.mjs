import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'headquarters-'));
try{
 await build({stdin:{contents:`export * from './src/headquarters-model';export * from './src/headquarters-plans';export * from './src/headquarters-journal';export * from './src/run-progression';export * from './src/run-save';export * from './src/studio-play';export * from './src/imported-art';export * from './src/authored-world';export * from './src/scene-travel';export * from './src/world-scenes';export * from './src/camp-furnace';export * from './src/expedition-inventory';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(tmp,'model.cjs'),logLevel:'error'});
 const m=createRequire(import.meta.url)(path.join(tmp,'model.cjs'));
 const snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));m.installImportedArt(snapshot.records);
 const layout=m.prepareAuthoredWorld(snapshot.layout),make=()=>{const w=m.createCampPlaySession(layout,undefined,'survival');delete w.progression.restoredBuildings;w.progression.campLevel=1;delete w.waypoint;delete w.progression.trackedObjective;return w;};
 const resources={pin(){},prepare:async()=>{},ready:()=>true};
 const atHQ=w=>{Object.assign(w.player,m.headquartersDock(m.headquartersBench(w)));assert(m.openHeadquarters(w))};
 const saved=w=>m.encodeRun(new m.SceneTravel(w,resources));
 const restored=w=>m.decodeRun(saved(w)).worlds[0][1];
 const checks=[];
 const fund=(w,cost)=>{for(const [id,n]of Object.entries(cost))m.setStoredCount(w,id,n)};
 let mixed=make();atHQ(mixed);
 m.setItemCount(mixed,'pallets',3);m.setItemCount(mixed,'stone',2);fund(mixed,{pallets:5,stone:1});
 const insufficient=JSON.stringify([mixed.bag,mixed.stock]);assert(!m.expandCamp(mixed));assert.equal(JSON.stringify([mixed.bag,mixed.stock]),insufficient);
 m.setStoredCount(mixed,'stone',2);assert(m.expandCamp(mixed));
 assert(m.costRows(mixed,{pallets:8,stone:4}).every(row=>row.have===0));
 const paid=JSON.stringify([mixed.bag,mixed.stock]);assert(!m.expandCamp(mixed));assert.equal(JSON.stringify([mixed.bag,mixed.stock]),paid);
 checks.push('Camp upgrades combine backpack and shared stores, reject incomplete costs without spending, and charge once');
 // An established HQ can be repaired directly with the hammer, without
 // changing its main Plans action or turning instant repairs into hold jobs.
 let w=make();atHQ(w);w.stationPanel=undefined;w.player.equipped='repairHammer';
 w.progression.hqHp=150;w.progression.defence=0;fund(w,m.REPAIR_CAMP_COST);
 assert.equal(m.buildingRepairStatus(w,'headquarters'),'Ready');assert(m.restoreCampBuilding(w,'headquarters'));
 assert.equal(w.progression.hqHp,w.progression.hqMax);assert.equal(w.progression.defence,w.progression.defenceMax);assert(!w.buildingRepair);
 assert(m.costRows(w,m.REPAIR_CAMP_COST).every(row=>row.have===0));
 const hqPaid=JSON.stringify([w.bag,w.stock]);assert(!m.restoreCampBuilding(w,'headquarters'));assert.equal(JSON.stringify([w.bag,w.stock]),hqPaid);
 for(const failure of ['far','no-hammer','wrong-tool','other-menu','dead','downed','over','scene','missing-site','materials','hurt','dodge','grab','repair-job']){
  const test=make();atHQ(test);test.stationPanel=undefined;test.player.equipped='repairHammer';test.progression.hqHp=150;test.progression.defence=0;fund(test,m.REPAIR_CAMP_COST);
  if(failure==='far')test.player.x+=1000;if(failure==='no-hammer')test.gear.bag.repairHammer=0;if(failure==='wrong-tool')test.player.equipped='woodenAxe';if(failure==='other-menu')test.stationPanel='fire';
  if(failure==='dead')test.player.hp=0;if(failure==='downed')test.player.downedUntil=100;if(failure==='over')test.phase='over';if(failure==='scene')test.scene={id:'bunker'};
  if(failure==='missing-site'){const site=m.buildingPlacement(test,m.buildingFor('headquarters'));test.layout={...test.layout,items:test.layout.items.filter(p=>p.id!==site.id)}}
  if(failure==='materials')m.setStoredCount(test,'pallets',0);if(failure==='hurt')test.player.hurtUntil=1;if(failure==='dodge')test.dodge={started:0,angle:0};if(failure==='grab')test.bruteGrab={};if(failure==='repair-job')test.buildingRepair={};
  const before=JSON.stringify([test.bag,test.stock]);assert(!m.restoreCampBuilding(test,'headquarters'),'HQ '+failure);assert.equal(JSON.stringify([test.bag,test.stock]),before,'HQ '+failure+' cannot spend materials');
 }
 const abandoned=m.createCampPlaySession(layout,undefined,'survival');atHQ(abandoned);abandoned.stationPanel=undefined;abandoned.player.equipped='repairHammer';fund(abandoned,{pallets:4});
 assert(!m.restoreCampBuilding(abandoned,'headquarters'),'The first HQ restoration still requires its menu');atHQ(abandoned);abandoned.gear.bag.repairHammer=0;abandoned.player.equipped='woodenAxe';
 assert(m.restoreCampBuilding(abandoned,'headquarters'));assert.equal(abandoned.progression.campLevel,1);assert(!abandoned.buildingRepair);
 abandoned.progression.hqHp=150;fund(abandoned,m.REPAIR_CAMP_COST);assert(m.restoreCampBuilding(abandoned,'headquarters'),'Menu repair still works without equipping a hammer');
 checks.push('HQ restores instantly from its menu or its equipped-hammer action, repairs health and defences once, rejects invalid on-site actions without charging, and retains the first-restoration menu exception');
 const catalogue=m.orderedCataloguePlans(make()),firstLocked=catalogue.findIndex(p=>m.planCampLevel(p)===2);
 assert(firstLocked>0);assert(catalogue.slice(0,firstLocked).every(p=>m.planCampLevel(p)===1));assert(catalogue.slice(firstLocked).every(p=>m.planCampLevel(p)===2));
 assert.deepEqual(catalogue.slice(0,6).map(p=>p.id),['workshop','well','equipment-woodenAxe','shelter','warehouse','bunker']);
 checks.push('Available catalogue plans precede locked plans, with the familiar starter buildings and equipment first');
 const starter=make();atHQ(starter);assert(m.trackObjective(starter,'metalworking'));
 assert.equal(m.trackedObjectiveStatus(starter).step,'Reach Camp level 2');assert.equal(m.trackedObjectiveStatus(starter).planId,'shelter');
 assert(m.markTrackedObjective(starter));assert.deepEqual(starter.waypoint,{...m.headquartersDock(m.headquartersBench(starter)),sceneId:'camp'});
 assert(m.journalObjectives(starter).find(o=>o.id==='metalworking').steps.every(step=>!step.done));
 checks.push('Journal and tracked HUD resolve the camp upgrade prerequisite before the furnace without granting progress');
 w=make();atHQ(w);assert(!m.blueprintLearned(w,'metalworking'));
 fund(w,{pallets:8,stone:4});assert(m.expandCamp(w));
 assert(m.blueprintLearned(w,'metalworking'));assert(m.blueprintLearned(w,'reinforced-camp'));
 assert.deepEqual(w.progression.blueprints,[]);assert(!w.progression.repairPart);
 assert(!m.learnBlueprint(w,'metalworking'),'Ordinary plans need no learn step');
 assert(m.blueprintLearned(restored(w),'metalworking'));
 checks.push('Camp level automatically unlocks standard plans, without a research payment or recovered-note gate');

 for(const failure of ['menu','far','no-hammer','wrong-tool','dead','downed','over','missing-site','materials']){
  w=make();atHQ(w);fund(w,{pallets:8,stone:4});assert(m.expandCamp(w));fund(w,m.RESTORE_FURNACE_COST);
  w.stationPanel=undefined;const site=m.campRepairSite(w,'furnace');Object.assign(w.player,{x:site.x,y:site.y});w.player.equipped='repairHammer';
  if(failure==='menu')w.stationPanel='headquarters';if(failure==='far')w.player.x+=1000;
  if(failure==='no-hammer')w.gear.bag.repairHammer=0;if(failure==='wrong-tool')w.player.equipped='woodenAxe';
  if(failure==='dead')w.player.hp=0;if(failure==='downed')w.player.downedUntil=100;if(failure==='over')w.phase='over';
  if(failure==='missing-site')w.layout={...w.layout,items:w.layout.items.filter(p=>p.id!==site.placement.id)};
  if(failure==='materials')m.setStoredCount(w,'scrap',3);
  const before=JSON.stringify([w.bag,w.stock]);assert(!m.restoreFurnace(w),failure);
  assert.equal(JSON.stringify([w.bag,w.stock]),before,failure+' must not spend resources');assert(!w.progression.furnaceRestored);
 }
 w=make();atHQ(w);fund(w,{pallets:8,stone:4});assert(m.expandCamp(w));fund(w,m.RESTORE_FURNACE_COST);
 assert(!m.restoreFurnace(w,true),'HQ cannot remotely repair an existing furnace');
 w.stationPanel=undefined;const site=m.campRepairSite(w,'furnace');Object.assign(w.player,{x:site.x,y:site.y});w.player.equipped='repairHammer';
 const location=JSON.stringify([w.player.x,w.player.y]),authored=JSON.stringify(w.layout);
 assert.equal(m.furnaceBuildStatus(w),'Ready');assert(m.restoreFurnace(w));
 assert.equal(JSON.stringify([w.player.x,w.player.y]),location);assert.equal(JSON.stringify(w.layout),authored);
 for(const row of m.costRows(w,m.RESTORE_FURNACE_COST))assert.equal(row.have,0);
 const after=JSON.stringify([w.bag,w.stock]);assert(!m.restoreFurnace(w));assert.equal(JSON.stringify([w.bag,w.stock]),after);
 assert(!w.progression.repairPart);assert(w.progression.furnaceRestored);assert(m.recipeUnlocked(w,'metalPickaxe'));assert(restored(w).progression.furnaceRestored);
 checks.push('Furnace repair requires camp access, a held hammer, proximity and full materials; HQ cannot repair it remotely; legacy saves remain valid');

 for(const fortified of [false,true]){
  w=make();delete w.progression.blueprints;delete w.progression.campLevel;
  Object.assign(w.progression,{repairPart:true,furnaceRestored:true,metalCrafted:true,fortified});
  w=restored(w);assert(m.blueprintLearned(w,'metalworking'));assert(m.blueprintLearned(w,'reinforced-camp'));
 }
 for(const blueprints of [['unknown'],['metalworking','metalworking'],'metalworking',null]){
  const data=JSON.parse(saved(make()));data.worlds[0][1].progression.blueprints=blueprints;
  assert.throws(()=>m.decodeRun(JSON.stringify(data)),/blueprints/);
 }
 checks.push('Legacy saves keep working facilities and access; malformed blueprint IDs are rejected');

 w=make();atHQ(w);fund(w,{pallets:8,stone:4});assert(m.expandCamp(w));
 assert(m.trackObjective(w,'metalworking'));assert.equal(m.trackedObjectiveStatus(w).step,'Repair the furnace on site');
 assert(m.markTrackedObjective(w));assert(w.waypoint);w.waypoint=undefined;
 const journal=m.journalObjectives(w).find(o=>o.id==='metalworking');assert(journal.steps.every(step=>!step.done));
 Object.assign(w.progression,{furnaceRestored:true,ingotsSmelted:1,craftedMetalPickaxe:true});
 assert(m.objectiveComplete(m.journalObjectives(w).find(o=>o.id==='metalworking')));
 assert(m.objectiveComplete(m.journalObjectives(restored(w)).find(o=>o.id==='metalworking')));
 for(const [key,value]of [['trackedObjective','invalid'],['ingotsSmelted',-1],['ingotsSmelted',1.5],['craftedMetalPickaxe','yes']]){
  const data=JSON.parse(saved(w));data.worlds[0][1].progression[key]=value;assert.throws(()=>m.decodeRun(JSON.stringify(data)),/journal/);
 }
 assert(m.trackObjective(w));assert.equal(m.trackedObjectiveStatus(w),undefined);assert(m.trackObjective(w,'defences'));
 checks.push('Optional tracking, next-step map links and completed objectives persist; malformed journal saves reject');
 const portal=m.scenePortals(w)[0];Object.assign(w.player,portal.area.reduce((p,[x,y])=>({x:p.x+x/portal.area.length,y:p.y+y/portal.area.length}),{x:0,y:0}));
 w.stationPanel=undefined;w.stepOnMotions={[portal.animationPlacementId]:{position:99,active:true}};
 const travel=new m.SceneTravel(w,resources);for(let i=0;i<40;i++)travel.tick(1/60);
 assert.equal(travel.current.scene?.id,'bunker');assert(m.blueprintLearned(travel.current,'metalworking'));
 const reloaded=new m.SceneTravel(make(),resources);await reloaded.restore(m.decodeRun(m.encodeRun(travel)));
 assert(m.blueprintLearned(reloaded.current,'metalworking'));assert(m.blueprintLearned(reloaded.returnToCamp(),'metalworking'));assert.equal(reloaded.current.progression.trackedObjective,'defences');
 checks.push('Camp plans and journal tracking survive bunker travel, save reload and returning to camp');

 w=make();atHQ(w);const unchanged=JSON.stringify(w),plans=m.headquartersPlans(w);
 for(const b of m.HQ_BUILDINGS){m.buildingArt(w,b);m.buildingStatus(w,b);assert(plans.some(p=>p.id===m.planForBuilding(w,b.id)))}
 for(const p of plans)m.planStatus(w,p);
 assert.deepEqual(m.discoveries(w).map(e=>e.id),['camp']);
 assert(plans.filter(p=>p.building==='garden').every(p=>p.preview&&!p.cost&&!p.learn));
 assert.equal(JSON.stringify(w),unchanged,'Browsing must not grant items, blueprints or waypoints');
 assert.equal(w.waypoint,undefined);assert(m.markBuilding(w,'garden'));assert.equal(w.waypoint.sceneId,'camp');
 checks.push('Browsing is read-only, previews cannot charge resources, discoveries contain only known events and navigation is voluntary');

 Object.assign(w.progression,{repairPart:true,furnaceRestored:true,metalCrafted:true,fortified:true});
 const arts=[m.HQ_MAP,m.HQ_PAPER,m.HQ_BENCH_ART,...m.HQ_CATEGORIES.map(c=>c.image),...m.HQ_BUILDINGS.flatMap(b=>Object.values(m.buildingArt(w,b)).filter(v=>typeof v==='string')),...plans.flatMap(p=>[p.art.image,p.art.overlay]),...m.discoveries(w).map(e=>e.image)].filter(Boolean);
 const registry=['native/bundled-art.ts','native/backpack-art.ts','native/HeadquartersPanel.tsx','native/camp-restoration-art.ts'].map(p=>fs.readFileSync(p,'utf8')).join('\n');
 for(const image of new Set(arts)){
  if(image.startsWith('/survival/'))assert(fs.existsSync('public'+image),'Missing web art '+image);
  assert(registry.includes(JSON.stringify(image))||registry.includes("'"+image+"'"),'Missing offline native art '+image);
 }
 checks.push('All headquarters, equipment and discovery illustrations resolve on web and in the offline native bundle');
 const report={passed:true,checks};fs.mkdirSync('docs/qa/headquarters-menu-v4',{recursive:true});fs.writeFileSync('docs/qa/headquarters-menu-v4/checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(tmp,{recursive:true,force:true})}

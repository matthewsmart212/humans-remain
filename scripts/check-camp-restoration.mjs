import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'camp-restoration-'));
try{
 const modules=['camp-restoration','camp-levels','run-progression','run-save','scene-travel','studio-play','authored-world','imported-art','expedition-inventory','camp-materials','camp-smithy','camp-furnace','camp-storage','warehouse-storage','warehouse','world-scenes','world-layout','world-assets','camp-lighting','survival-engine','camp-kitchen','camp-stations','headquarters-model','placed-world-renderer'];
 await build({stdin:{contents:modules.map(id=>`export * from './src/${id}';`).join(''),resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(dir,'model.cjs'),logLevel:'error'});
 const m=createRequire(import.meta.url)(path.join(dir,'model.cjs')),snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));
 m.installImportedArt(snapshot.records);const layout=m.prepareAuthoredWorld(snapshot.layout),authored=JSON.stringify(layout),resources={pin(){},prepare:async()=>{},ready:()=>true};
 const make=()=>m.createCampPlaySession(layout,undefined,'survival');
 const hq=w=>{w.stationPanel=undefined;Object.assign(w.player,m.headquartersDock(m.headquartersBench(w)));assert(m.openHeadquarters(w))};
 const fund=(w,cost)=>{for(const [id,n] of Object.entries(cost))m.setItemCount(w,id,n)};
 const repair=(w,id)=>{w.stationPanel=undefined;w.player.equipped='repairHammer';const site=m.campRepairSite(w,id);Object.assign(w.player,{x:site.x,y:site.y});fund(w,m.CAMP_REPAIRS[id].cost);assert(m.restoreCampBuilding(w,id),id)};
 const save=w=>m.encodeRun(new m.SceneTravel(w,resources)),load=w=>m.decodeRun(save(w)).worlds[0][1];
 const funds=w=>JSON.stringify([w.bag,w.stock,w.gear]);
 const checks=[];
 let w=make();assert.equal(m.campAccessLevel(w),0);assert.equal(w.camp.hearth.fuel,0);assert(!w.waypoint);assert(w.gear.bag.woodenAxe>0);
 for(const id of m.CAMP_BUILDING_IDS){assert(!m.buildingRestored(w,id),id);assert(m.campBuildingPlacements(w.layout).some(p=>p.id===id),id+' site');}
 assert.deepEqual(load(w).progression.restoredBuildings,[]);assert.equal(m.campAccessLevel(load(w)),0);
 hq(w);fund(w,{pallets:20,stone:20,scrap:20});const before=funds(w);
 for(const id of m.CAMP_BUILDING_IDS.filter(id=>id!=='headquarters'))assert(!m.restoreCampBuilding(w,id),id+' cannot bypass HQ');
 assert(!m.expandCamp(w));assert(!m.repairCamp(w));assert(!m.recipeUnlocked(w,'woodenPickaxe'));assert.equal(funds(w),before);
 checks.push('New runs start with all nine ruins, no working facilities, and HQ as the only repair');
 for(const failure of ['closed','far','dead','downed','over','scene','missing-site','materials']){
  w=make();hq(w);fund(w,m.CAMP_REPAIRS.headquarters.cost);
  if(failure==='closed')w.stationPanel=undefined;if(failure==='far')w.player.x+=1000;if(failure==='dead')w.player.hp=0;if(failure==='downed')w.player.downedUntil=99;if(failure==='over')w.phase='over';if(failure==='scene')w.scene={id:'bunker'};
  if(failure==='missing-site')w.layout={...w.layout,items:w.layout.items.filter(p=>p.assetId!==m.CAMP_REPAIRS.headquarters.assetId)};
  if(failure==='materials')m.setItemCount(w,'pallets',3);
  const prior=funds(w);assert(!m.restoreCampBuilding(w,'headquarters'),failure);assert.equal(funds(w),prior,failure);assert.equal(m.campAccessLevel(w),0);
 }
 w=make();hq(w);fund(w,{pallets:4});const position=JSON.stringify(w.player),map=JSON.stringify(w.layout);assert(m.restoreCampBuilding(w,'headquarters'));assert.equal(m.campAccessLevel(w),1);assert.equal(m.itemCount(w,'pallets'),0);assert.equal(JSON.stringify(w.player),position);assert.equal(JSON.stringify(w.layout),map);
 fund(w,{pallets:4});const paid=funds(w);assert(!m.restoreCampBuilding(w,'headquarters'));assert.equal(funds(w),paid);assert.equal(m.campAccessLevel(load(w)),1);
 checks.push('HQ validates proximity, life, site and full cost; pays once; unlocks Level 1 without moving the player or layout');
 const smithy=m.smithies(w.layout)[0];w.stationPanel=undefined;Object.assign(w.player,m.smithyDock(smithy));assert(!m.openSmithy(w,smithy.id));assert(!m.craftSmithyGear(w,'woodenPickaxe'));
 Object.assign(w.player,m.warehouseDock(m.warehouses(w.layout)[0]));w.stationPanel='warehouse';assert.equal(m.transferWarehouse(w,'pallets',false,1),0);
 w.thirst=10;Object.assign(w.player,m.stationFront(w.camp,'well'));assert(!m.doAction(w,'drink'));Object.assign(w.player,m.stationFront(w.camp,'hearth'));assert(!m.feedFire(w));assert(!m.queueFood(w,'chicken'));assert.deepEqual(m.scenePortals(w),[]);
 repair(w,'workshop');w.stationPanel=undefined;Object.assign(w.player,m.smithyDock(smithy));assert(m.openSmithy(w,smithy.id));fund(w,{pallets:3});assert(m.craftSmithyGear(w,'woodenPickaxe'));assert(w.gear.bag.woodenPickaxe>0);assert(!m.recipeUnlocked(w,'metalPickaxe'));
 checks.push('Broken workshop, warehouse, water, fire and bunker cannot be used; logs alone restore workshop and craft the first pickaxe');
 for(const id of ['warehouse','well','fire','bunker','garden','treatment']){const unchanged=JSON.stringify(w.layout);repair(w,id);assert(m.buildingRestored(w,id));assert.equal(JSON.stringify(w.layout),unchanged);assert(m.buildingRestored(load(w),id));}
 Object.assign(w.player,m.stationFront(w.camp,'well'));assert(m.doAction(w,'drink'));assert.equal(w.thirst,100);
 Object.assign(w.player,m.stationFront(w.camp,'hearth'));fund(w,{pallets:1});assert(m.feedFire(w));assert(m.scenePortals(w).length>0);
 hq(w);fund(w,m.CAMP_EXPANSION_COST);assert(m.expandCamp(w));repair(w,'furnace');assert(m.recipeUnlocked(w,'metalPickaxe'));assert.equal(m.campAccessLevel(load(w)),2);
 checks.push('All repairs persist, re-enable their facilities, and permit Camp Level 2 and furnace progression');
 const portal=m.scenePortals(w)[0];w.stationPanel=undefined;Object.assign(w.player,portal.area.reduce((p,[x,y])=>({x:p.x+x/portal.area.length,y:p.y+y/portal.area.length}),{x:0,y:0}));w.stepOnMotions={[portal.animationPlacementId]:{position:99,active:true}};
 const travel=new m.SceneTravel(w,resources);for(let i=0;i<40;i++)travel.tick(1/60);assert.equal(travel.current.scene?.id,'bunker');const reopened=new m.SceneTravel(make(),resources);await reopened.restore(m.decodeRun(m.encodeRun(travel)));assert.deepEqual(reopened.returnToCamp().progression.restoredBuildings,w.progression.restoredBuildings);
 checks.push('Repair progress survives interior travel, saving below ground and returning to camp');
 for(const level of [1,2]){w=make();delete w.progression.restoredBuildings;w.progression.campLevel=level;w.progression.furnaceRestored=level===2;w=load(w);assert.equal(m.campAccessLevel(w),level);for(const id of m.CAMP_BUILDING_IDS.filter(id=>id!=='furnace'))assert(m.buildingRestored(w,id));}
 for(const ids of [null,'headquarters',['unknown'],['headquarters','headquarters'],['workshop']]){w=make();const data=JSON.parse(save(w));data.worlds[0][1].progression.restoredBuildings=ids;assert.throws(()=>m.decodeRun(JSON.stringify(data)),/building repairs/);}
 const sandbox=m.createCampPlaySession(layout);assert.equal(m.campAccessLevel(sandbox),2);for(const id of m.CAMP_BUILDING_IDS)assert(m.buildingRestored(sandbox,id));
 checks.push('Existing saves and sandbox keep their facilities; malformed repair saves are rejected');
 w=make();const paths=m.requiredImages(w.layout.items.map(p=>p.assetId)),imgs=Object.fromEntries(Object.entries(paths).map(([key,src])=>[key,{src}]));
 for(const id of m.CAMP_BUILDING_IDS){assert(fs.existsSync('public'+m.BROKEN_CAMP_ART[id]));assert(Object.values(paths).includes(m.BROKEN_CAMP_ART[id]));}
 for(const {placement:p,id} of m.campBuildingPlacements(w.layout))for(const transform of [{},{rotation:90,flipX:true,scale:.8}]){
  const placed={...p,...transform},one={...w,layout:{...w.layout,items:[placed]}},b=m.placementBounds(placed),calls=[];
  const ctx=new Proxy({drawImage(...args){calls.push(args)}},{get:(o,k)=>k in o?o[k]:()=>{}});
  const readyImages={...imgs};delete readyImages[m.assetImageKey(m.ASSET_BY_ID.get(p.assetId).image)];
  m.placedDrawables(ctx,readyImages,one).forEach(d=>d.draw());const sprite=m.campBuildingArt(one,p.assetId);const base=calls.find(c=>c[0]?.src===sprite.image);assert(base,id+' rendered broken');assert.deepEqual(base.slice(1),[b.x,b.y,b.width,b.height],id+' uses exact authored canvas bounds');
 }
 assert.equal(JSON.stringify(layout),authored);checks.push('All ruin sprites preload and render to exact authored bounds, including rotated/flipped placements; editor layout stays untouched');
 const report={passed:true,checks};fs.mkdirSync('docs/qa/camp-restoration-v1',{recursive:true});fs.writeFileSync('docs/qa/camp-restoration-v1/checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(dir,{recursive:true,force:true})}

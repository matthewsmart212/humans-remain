import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'camp-access-'));
try{
 await build({stdin:{contents:`export * from './src/camp-levels';export * from './src/run-progression';export * from './src/headquarters-plans';export * from './src/headquarters-model';export * from './src/run-save';export * from './src/scene-travel';export * from './src/studio-play';export * from './src/authored-world';export * from './src/imported-art';export * from './src/expedition-inventory';export * from './src/camp-materials';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(dir,'model.cjs'),logLevel:'error'});
 const m=createRequire(import.meta.url)(path.join(dir,'model.cjs')),snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));
 m.installImportedArt(snapshot.records);const layout=m.prepareAuthoredWorld(snapshot.layout),resources={pin(){},prepare:async()=>{},ready:()=>true};
 const make=()=>{const w=m.createCampPlaySession(layout,undefined,'survival');delete w.progression.restoredBuildings;w.progression.campLevel=1;delete w.waypoint;Object.assign(w.player,m.headquartersDock(m.headquartersBench(w)));assert(m.openHeadquarters(w));return w};
 const fund=w=>{for(const [k,n]of Object.entries(m.CAMP_EXPANSION_COST))m.setStoredCount(w,k,n)};
 const stock=w=>JSON.stringify([w.bag,w.stock]);
 const save=w=>m.encodeRun(new m.SceneTravel(w,resources));
 const load=w=>m.decodeRun(save(w)).worlds[0][1];
 const checks=[];
 let w=make();assert.equal(m.campAccessLevel(w),1);assert(m.recipeUnlocked(w,'woodenPickaxe'));assert(!m.recipeUnlocked(w,'metalPickaxe'));assert.equal(m.campExpansionStatus(w),'Need expansion materials');
 assert(Object.values(m.CAMP_EXPANSION_COST).every(n=>n>0));assert.deepEqual(Object.keys(m.CAMP_EXPANSION_COST).sort(),['pallets','stone']);
 assert.deepEqual(m.campFacilities(w),{workshop:true,warehouse:true});
 assert(!m.expandCamp(w));checks.push('Fresh camp uses real starter supplies and has no metalworking dependency cycle');
 for(const flag of ['night','dead','downed','over','far','closed','scene','workshop','warehouse','insufficient']){
  w=make();fund(w);
  if(flag==='night')w.phase='night';if(flag==='dead')w.player.hp=0;if(flag==='downed')w.player.downedUntil=10;if(flag==='over')w.phase='over';if(flag==='far')w.player.x+=1000;if(flag==='closed')w.stationPanel=undefined;if(flag==='scene')w.scene={id:'bunker'};
  if(flag==='workshop')w.layout={...w.layout,items:w.layout.items.filter(p=>p.assetId!=='base_workshop_t1')};
  if(flag==='warehouse')w.layout={...w.layout,items:w.layout.items.filter(p=>p.assetId!=='misc_ceaf1a05-5426-45df-8a51-d3e2e07c6f9f')};
  if(flag==='insufficient')m.setStoredCount(w,'stone',3);
  const before=stock(w);assert(!m.expandCamp(w),flag);assert.equal(stock(w),before,flag+' must not spend supplies');assert.equal(m.campAccessLevel(w),1);
 }
 checks.push('Remote, closed, unavailable, dead/downed, night, missing-facility and insufficient-supply actions are atomic');
 w=make();m.setItemCount(w,'pallets',3);m.setItemCount(w,'stone',1);m.setStoredCount(w,'pallets',5);m.setStoredCount(w,'stone',3);
 const gear=JSON.stringify(w.gear);assert(m.expandCamp(w));assert.equal(m.campAccessLevel(w),2);for(const kind of ['pallets','stone'])assert.equal(m.materialTotal(w,kind),0);
 assert.equal(JSON.stringify(w.gear),gear);assert.deepEqual(w.progression.blueprints,[]);assert(!w.progression.repairPart&&!w.progression.furnaceRestored&&!w.progression.metalCrafted);assert.equal(w.waypoint,undefined);
 fund(w);const paid=stock(w);assert(!m.expandCamp(w));assert.equal(stock(w),paid);assert.equal(load(w).progression.campLevel,2);
 checks.push('Mixed backpack/store expansion pays once, persists, and unlocks standard plans without granting buildings, gear or waypoints');
 w=make();Object.assign(w.player,w.progression.cache);w.stationPanel=undefined;assert(m.recoverRepairPart(w));Object.assign(w.player,m.headquartersDock(m.headquartersBench(w)));m.openHeadquarters(w);
 assert.equal(m.campAccessLevel(w),1);assert(!m.learnBlueprint(w,'metalworking'));fund(w);assert(m.expandCamp(w));assert(m.blueprintLearned(w,'metalworking'));assert(!m.learnBlueprint(w,'metalworking'),'Camp level grants standard plans automatically');assert(!m.recipeUnlocked(w,'scrapKnife'),'A learned plan cannot replace a working furnace');
 checks.push('Bellows can be discovered before expansion; camp level grants knowledge while physical construction still costs materials');
 for(const flags of [{},{repairPart:true},{furnaceRestored:true},{blueprints:['metalworking']},{fortified:true},{metalCrafted:true}]){
  w=make();delete w.progression.campLevel;Object.assign(w.progression,flags);const old=JSON.parse(save(w));
  const restored=m.decodeRun(JSON.stringify(old)).worlds[0][1];assert.equal(restored.progression.campLevel,Object.keys(flags).length?2:1);
 }
 w=make();w.progression.furnaceRestored=true;assert.equal(load(w).progression.campLevel,2,'Working legacy facilities retain their earned minimum access');
 for(const value of [null,3,-1,1.5,'2']){w=make();const data=JSON.parse(save(w));data.worlds[0][1].progression.campLevel=value;assert.throws(()=>m.decodeRun(JSON.stringify(data)),/camp level/);}
 const sandbox=m.createCampPlaySession(layout);assert.equal(m.campAccessLevel(sandbox),2);assert(m.recipeUnlocked(sandbox,'scrapKnife'));
 checks.push('Legacy discovered/learned/restored access migrates; malformed levels reject; sandbox remains unlocked');
 w=make();const before=JSON.stringify(w);const family=m.cataloguePlans(w);assert.equal(family.filter(p=>p.building==='garden').length,1);assert.equal(family.filter(p=>p.building==='furnace').length,1);
 for(const p of m.headquartersPlans(w)){m.planCampLevel(p);m.planStatus(w,p);if(p.preview)assert(!p.cost&&!p.learn)}assert.equal(JSON.stringify(w),before);
 assert.equal(m.planCampLevel(m.headquartersPlans(w).find(p=>p.gearId==='scrapKnife')),2);
 assert.equal(m.planStatus(w,m.headquartersPlans(w).find(p=>p.gearId==='scrapKnife')),'Requires Camp level 2');
 checks.push('Read-only family catalogue groups named upgrades and separates non-payable previews from live camp access');
 const report={passed:true,checks,camp2Cost:m.CAMP_EXPANSION_COST,browserTested:false,physicalIPhoneTested:false};fs.mkdirSync('docs/qa/camp-levels-v1',{recursive:true});fs.writeFileSync('docs/qa/camp-levels-v1/checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(dir,{recursive:true,force:true})}

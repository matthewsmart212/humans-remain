import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'on-site-repairs-'));
try{
 const modules=['building-attack-site','building-repair','building-damage','building-condition-renderer','camp-siege','studio-combat','play-interaction','scrap-bomber','survival-engine','studio-play','run-progression','camp-restoration','camp-levels','camp-materials','expedition-inventory','player-gear','quick-items','field-kit','backpack','run-save','scene-travel','imported-art','authored-world','world-layout','world-assets','headquarters-roof','placed-world-renderer'];
 await build({stdin:{contents:modules.map(id=>`export * from './src/${id}';`).join(''),resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs'),logLevel:'error'});
 const m=createRequire(import.meta.url)(path.join(temp,'model.cjs')),snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));
 m.installImportedArt(snapshot.records);const layout=m.prepareAuthoredWorld(snapshot.layout),make=()=>m.createCampPlaySession(layout,undefined,'survival');
 const hq=w=>{w.stationPanel=undefined;Object.assign(w.player,m.headquartersDock(m.headquartersBench(w)));assert(m.openHeadquarters(w))};
 const visit=(w,id)=>{const site=m.campRepairSite(w,id);assert(site,id+' has a repair socket');w.stationPanel=undefined;Object.assign(w.player,{x:site.x,y:site.y});return site};
 const fund=(w,id)=>{for(const kind of ['pallets','stone','scrap','ironIngot']){m.setItemCount(w,kind,0);m.setStoredCount(w,kind,0)}for(const [kind,n]of Object.entries(m.CAMP_REPAIRS[id].cost)){m.setItemCount(w,kind,1);m.setStoredCount(w,kind,n-1)}};
 const resources={pin(){},prepare:async()=>{},ready:()=>true},roundTrip=w=>m.decodeRun(m.encodeRun(new m.SceneTravel(w,resources))).worlds[0][1];
 const advance=(w,ticks)=>{for(let tick=0;tick<ticks;tick++){w.tick++;m.stepBuildingRepair(w,{x:0,y:0})}};
 const work=(w,ticks)=>{m.holdBuildingRepair(w,true);advance(w,ticks)};
 let w=make();assert.equal(w.gear.bag.repairHammer,1);assert.equal(w.gear.bag.woodenPickaxe,1);assert.equal(w.gear.bag.woodenAxe,1);assert.equal(w.gear.bag.woodenSpear,0);assert(m.availableQuickItems({axes:w.gear.bag,cooked:0}).some(i=>i.id==='repairHammer'));
 assert(m.selectQuickItem(w,'repairHammer'));hq(w);w.stationPanel=undefined;assert.equal(m.playInteraction(w)?.key,'headquarters','Equipped hammer must not hide first HQ repair');assert.equal(m.selectedQuickItem(w),'repairHammer');assert(!m.requestAttack(w),'Repair hammer is not a punch or weapon');
 const bag=m.backpackItems({...new m.FieldKitController().sample(w)});assert(bag.some(i=>i.id==='repairHammer'&&!i.droppable));
 for(const id of m.CAMP_BUILDING_IDS.filter(id=>id!=='headquarters')){visit(w,id);fund(w,id);assert(!m.restoreCampBuilding(w,id),id+' is gated by HQ');}
 hq(w);fund(w,'headquarters');
 w.gear.bag.repairHammer=0;w.player.equipped='woodenAxe';
 assert.equal(m.buildingRepairStatus(w,'headquarters'),'Ready','HQ menu does not require a hammer');
 assert(!m.beginBuildingRepair(w,'headquarters'),'HQ never starts a held repair');
 assert(m.restoreCampBuilding(w,'headquarters'));assert(!w.buildingRepair);assert.equal(m.campAccessLevel(w),1);
 const paid=JSON.stringify([w.bag,w.stock]);assert(!m.restoreCampBuilding(w,'headquarters'));assert.equal(JSON.stringify([w.bag,w.stock]),paid,'Repeated menu repair cannot charge twice');
 w.progression.hqHp=30;w.progression.defence=0;
 for(const [kind,n] of Object.entries(m.REPAIR_CAMP_COST))m.setItemCount(w,kind,n);
 w.stationPanel=undefined;assert.equal(m.playInteraction(w)?.key,'headquarters','Damaged HQ still opens its menu');assert(!m.restoreCampBuilding(w,'headquarters'),'Without a hammer, HQ repairs still require the menu');
 hq(w);m.setItemCount(w,'pallets',0);assert(!m.restoreCampBuilding(w,'headquarters'),'Insufficient resources cannot repair HQ');
 for(const [kind,n] of Object.entries(m.REPAIR_CAMP_COST))m.setItemCount(w,kind,n);
 assert(m.restoreCampBuilding(w,'headquarters'));assert.equal(w.progression.hqHp,w.progression.hqMax);assert.equal(w.progression.defence,w.progression.defenceMax);assert(!w.buildingRepair);
 w.gear.bag.repairHammer=1;

 for(const id of m.CAMP_BUILDING_IDS.filter(id=>id!=='headquarters'&&id!=='furnace')){
  hq(w);fund(w,id);const before=JSON.stringify([w.bag,w.stock]);assert(!m.restoreCampBuilding(w,id),'HQ cannot repair '+id);assert.equal(JSON.stringify([w.bag,w.stock]),before);
  const site=visit(w,id),position=[w.player.x,w.player.y];w.player.equipped='woodenAxe';assert.equal(m.buildingRepairStatus(w,id),'Equip repair hammer');
  const controller=new m.FieldKitController();let action=controller.sample(w).action;assert.equal(controller.sample(w).repairAction,undefined,'Ruins do not duplicate the primary repair in a second button');assert(action.key.startsWith('broken:'),id+' is the visible interaction');assert.equal(action.label,'EQUIP');assert(action.target.revealed,'Proximity shows the repair card without a hammer');assert(action.target.repairInfo.materials.length);assert(controller.press(w,action));controller.release();
  action=controller.sample(w).action;assert.equal(action.label,'REPAIR');assert(!action.disabled,id+' has sufficient combined materials');assert(action.target.detail,'Repair requirements are available on interaction');
  assert(controller.press(w,action));assert(controller.holdingRepair);assert(!m.buildingRestored(w,id),'No instant repair');assert(w.buildingRepair);advance(w,120);assert(Math.abs(m.repairProgress(w)-1/3)<.001);controller.release();assert(!controller.holdingRepair);advance(w,60);assert(Math.abs(m.repairProgress(w)-1/6)<.001,'Release drains progress');assert.equal(m.materialTotal(w,'pallets'),m.CAMP_REPAIRS[id].cost.pallets??0,'Partial work never charges');action=controller.sample(w).action;assert(controller.press(w,action));advance(w,299);assert(w.buildingRepair,'Still not fully repaired');assert(!m.buildingRestored(w,id));advance(w,2);controller.release();assert(m.buildingRestored(w,id));assert.deepEqual([w.player.x,w.player.y],position);
  assert(m.costRows(w,m.CAMP_REPAIRS[id].cost).every(row=>row.have===0),id+' charges once');assert(!m.restoreCampBuilding(w,id));assert(m.buildingRestored(roundTrip(w),id));
 }
 visit(w,'furnace');fund(w,'furnace');w.player.equipped='repairHammer';assert.equal(m.buildingRepairStatus(w,'furnace'),'Requires Camp level 2');
 hq(w);for(const [kind,n]of Object.entries(m.CAMP_EXPANSION_COST))m.setItemCount(w,kind,n);assert(m.expandCamp(w));
 for(const failure of ['far','no-hammer','wrong-tool','menu','dead','downed','scene','materials']){
  const test=roundTrip(w);visit(test,'furnace');fund(test,'furnace');test.player.equipped='repairHammer';
  if(failure==='far')test.player.y+=200;if(failure==='no-hammer')test.gear.bag.repairHammer=0;if(failure==='wrong-tool')test.player.equipped='woodenAxe';if(failure==='menu')test.stationPanel='headquarters';if(failure==='dead')test.player.hp=0;if(failure==='downed')test.player.downedUntil=10;if(failure==='scene')test.scene={id:'bunker'};if(failure==='materials')m.setStoredCount(test,'scrap',0);
  const before=JSON.stringify([test.bag,test.stock]);assert(!m.restoreCampBuilding(test,'furnace'),failure);assert.equal(JSON.stringify([test.bag,test.stock]),before);
 }
 const blocked=roundTrip(w),socket=visit(blocked,'furnace');fund(blocked,'furnace');blocked.player.equipped='repairHammer';blocked.player.y+=80;
 blocked.layout={...blocked.layout,items:[...blocked.layout.items,{id:'repair-line-of-sight-wall',assetId:'base_well_t1',x:socket.x,y:socket.y+40,scale:1,solid:true,role:'prop',roof:'hidden',frame:{sourceAssetId:'base_well_t1',width:80,height:8,anchor:[.5,.5]},collision:{lineWidth:.01,paths:[{closed:true,points:[[0,0],[1,0],[1,1],[0,1]]}]}}]};
 assert(!m.atCampRepairSite(blocked,'furnace'),'Repairs cannot reach through a wall');assert(!m.restoreCampBuilding(blocked,'furnace'));
 visit(w,'furnace');fund(w,'furnace');w.player.equipped='repairHammer';assert(m.restoreCampBuilding(w,'furnace'));assert(roundTrip(w).progression.furnaceRestored);
 // Warehouse proximity shows shared stock immediately, without mixing it
 // with backpack amounts or replacing the more important repair information.
 const stockWorld=roundTrip(w),stockKit=new m.FieldKitController();visit(stockWorld,'warehouse');stockWorld.enemies=[];stockWorld.loot=[];stockWorld.player.hurtUntil=0;stockWorld.player.equipped='repairHammer';
 for(const [id,count]of Object.entries({pallets:12,stone:0,scrap:34})){m.setStoredCount(stockWorld,id,count);m.setItemCount(stockWorld,id,2)}
 const stocked=stockKit.sample(stockWorld);assert.equal(stocked.action.label,'STORE');assert.deepEqual(stocked.warehouseStock,{pallets:12,stone:0,scrap:34},'The proximity caption uses exact warehouse quantities, including zero');
 assert(m.sameFieldKit(stocked,stockKit.sample(stockWorld)),'Unchanged warehouse stock avoids an unnecessary update');m.setStoredCount(stockWorld,'stone',7);
 const changedStock=stockKit.sample(stockWorld);assert.equal(changedStock.warehouseStock.stone,7);assert(!m.sameFieldKit(stocked,changedStock),'A stock-only change refreshes the HUD');
 assert(m.damageBuilding(stockWorld,'warehouse',1));const damagedStock=stockKit.sample(stockWorld);assert(damagedStock.repairAction);assert.equal(damagedStock.warehouseStock,undefined,'Repair information takes priority even for a single point of damage');
 stockWorld.player.equipped='woodenAxe';const noHammerStock=stockKit.sample(stockWorld);assert.equal(noHammerStock.warehouseStock,undefined,'Unequipping the hammer cannot make damaged warehouse stock reappear');assert.equal(noHammerStock.action.label,'STORE','The damaged warehouse can still be opened without a hammer');assert(noHammerStock.action.target.revealed&&noHammerStock.action.target.repairInfo,'The repair caption remains visible without a hammer');assert(/hammer/i.test(noHammerStock.action.target.repairInfo.hint),'The repair caption explains the missing equipped hammer');
 stockWorld.progression.buildingHp.warehouse=m.buildingMaxHp(stockWorld,'warehouse');assert.deepEqual(stockKit.sample(stockWorld).warehouseStock,{pallets:12,stone:7,scrap:34},'Stock returns once the warehouse is fully repaired');
 stockWorld.stationPanel='warehouse';assert.equal(stockKit.sample(stockWorld).warehouseStock,undefined,'Opening the warehouse hides the world caption');stockWorld.stationPanel=undefined;stockWorld.player.y+=500;assert.equal(stockKit.sample(stockWorld).warehouseStock,undefined,'Leaving interaction range hides the stock caption');
 // Usable buildings keep their station action even with the repair hammer held.
 const damagedStation=id=>{const test=roundTrip(w);visit(test,id);fund(test,id);test.player.equipped='repairHammer';test.player.hurtUntil=0;test.enemies=[];test.loot=[];test.thirst=70;assert(m.damageBuilding(test,id,Math.floor(m.buildingMaxHp(test,id)/2)));return test};
 for(const [id,label,panel]of [['fire','FIRE','fire'],['well','DRINK',undefined],['warehouse','STORE','warehouse'],['furnace','FURNACE','furnace'],['workshop','CRAFT','smithy']]){
  const test=damagedStation(id),kit=new m.FieldKitController(),shown=kit.sample(test),before=JSON.stringify([test.bag,test.stock]);
  assert.equal(shown.action.label,label,id+' retains its normal primary action with a hammer');
  assert(shown.repairAction&&!shown.repairAction.disabled,id+' exposes a separate affordable repair');
  assert.equal(shown.repairAction.target.buildingId,id);assert(shown.repairAction.target.revealed,'Repair costs are visible before pressing');
  assert(kit.press(test,shown.action),id+' can be used without unequipping the hammer');kit.release('primary');
  assert.equal(test.player.equipped,'repairHammer');assert(!test.buildingRepair,'Normal use cannot start a repair');
  assert.equal(JSON.stringify([test.bag,test.stock]),before,'Normal use cannot spend repair materials');
  if(panel)assert.equal(test.stationPanel,panel);else assert(test.thirst>70,'Well still restores water');
 }
 const fullWell=damagedStation('well');fullWell.thirst=100;const fullKit=new m.FieldKitController(),full=fullKit.sample(fullWell);
 assert.equal(full.action.label,'DRINK');assert(full.action.disabled,'Hydration controls the Drink action');assert(full.repairAction&&!full.repairAction.disabled,'A full water stat cannot disable repairs');
 // The hammer keeps station access during a nearby threat, but actual danger interrupts menus.
 for(const interruption of ['hit','downed','range']){
  const test=damagedStation('fire'),kit=new m.FieldKitController();assert(m.spawnCombatEnemyAt(test,'scrap-walker',{x:test.player.x+120,y:test.player.y}));
  const shown=kit.sample(test);assert(shown.combat);assert.equal(shown.action.label,'FIRE');assert(shown.repairAction,'A nearby robot does not hide the repair companion');
  assert(kit.press(test,shown.action));kit.release('primary');assert.equal(kit.sample(test).stationPanel,'fire','A nearby robot alone does not immediately close the hammer user’s station');
  if(interruption==='hit')m.damagePlayer(test,1);if(interruption==='downed')test.player.downedUntil=m.timeOf(test)+10;if(interruption==='range')test.player.y+=400;
  assert.equal(kit.sample(test).stationPanel,undefined,interruption+' closes the station');
 }
 // Held work belongs to the secondary button; unrelated releases cannot stop it.
 const fire=damagedStation('fire'),fireKit=new m.FieldKitController(),repairStart=fireKit.sample(fire),fireCost={...m.buildingRepairCost(fire,'fire')};
 const fireBefore=Object.fromEntries(Object.keys(fireCost).map(id=>[id,m.materialTotal(fire,id)]));
 assert(fireKit.pressRepair(fire,repairStart.repairAction));assert(fireKit.holdingRepair);assert(!fireKit.pressRepair(fire,repairStart.repairAction),'Repeated press cannot start or pay twice');
 assert(!fireKit.press(fire,repairStart.action),'A second contact cannot open a menu during the held repair');fireKit.release('primary');assert(fireKit.holdingRepair,'The rejected primary contact cannot release the repairing finger');
 const holding=fireKit.sample(fire);assert.equal(holding.action.label,'FIRE');assert.equal(holding.repairAction.target.repairState,'holding');
 advance(fire,60);const progressed=fireKit.sample(fire);assert.equal(progressed.action.key,holding.action.key);assert(progressed.repairAction.target.progress>holding.repairAction.target.progress);assert(!m.sameFieldKit(holding,progressed),'Secondary progress refreshes an otherwise unchanged station HUD');
 assert.deepEqual(Object.fromEntries(Object.keys(fireCost).map(id=>[id,m.materialTotal(fire,id)])),fireBefore,'Partial secondary repair uses no materials');
 fireKit.release('repair');advance(fire,30);const falling=fireKit.sample(fire);assert.equal(falling.action.label,'FIRE');assert.equal(falling.repairAction.target.repairState,'falling');assert(falling.repairAction.target.progress<progressed.repairAction.target.progress);
 assert(fireKit.pressRepair(fire,falling.repairAction));advance(fire,241);fireKit.release('repair');
 assert.equal(m.buildingHp(fire,'fire'),m.buildingMaxHp(fire,'fire'));assert(!fire.buildingRepair);assert.equal(fireKit.sample(fire).repairAction,undefined,'The repair button disappears on completion');
 for(const [id,n]of Object.entries(fireCost))assert.equal(m.materialTotal(fire,id),fireBefore[id]-n,'Completed secondary repair charges exactly once');
 const firePaid=JSON.stringify([fire.bag,fire.stock]);assert(!fireKit.pressRepair(fire,falling.repairAction),'A stale completed repair action is rejected');assert.equal(JSON.stringify([fire.bag,fire.stock]),firePaid);
 // Releasing then choosing the normal menu safely cancels unfinished work.
 const interruptedFire=damagedStation('fire'),menuKit=new m.FieldKitController(),menuBefore=JSON.stringify([interruptedFire.bag,interruptedFire.stock]);
 assert(menuKit.pressRepair(interruptedFire,menuKit.sample(interruptedFire).repairAction));advance(interruptedFire,60);menuKit.release('repair');
 assert(menuKit.press(interruptedFire,menuKit.sample(interruptedFire).action));menuKit.release('primary');advance(interruptedFire,1);
 assert.equal(interruptedFire.stationPanel,'fire');assert(!interruptedFire.buildingRepair);assert.equal(JSON.stringify([interruptedFire.bag,interruptedFire.stock]),menuBefore);
 // A new pickup cannot steal the active secondary repair or move it into the primary hex.
 const pickupFire=damagedStation('fire'),pickupKit=new m.FieldKitController();
 assert(pickupKit.pressRepair(pickupFire,pickupKit.sample(pickupFire).repairAction));advance(pickupFire,30);
 const beforePickup=pickupKit.sample(pickupFire),pickupMaterials=JSON.stringify([pickupFire.bag,pickupFire.stock]);
 pickupFire.loot=[{id:9999,x:pickupFire.player.x,y:pickupFire.player.y,kind:'pallets',appearance:'logs',amount:1}];
 const withPickup=pickupKit.sample(pickupFire);assert.equal(withPickup.action.label,'COLLECT');assert(withPickup.repairAction,'Nearby loot must not unmount the repairing button');
 assert.equal(withPickup.repairAction.key,beforePickup.repairAction.key);assert.equal(withPickup.repairAction.target.id,beforePickup.repairAction.target.id,'The active repair retains its captured target identity');
 pickupKit.release('primary');assert(pickupKit.holdingRepair);advance(pickupFire,30);assert(pickupKit.sample(pickupFire).repairAction.target.progress>beforePickup.repairAction.target.progress,'Held secondary work continues through unrelated primary focus changes');
 assert.equal(JSON.stringify([pickupFire.bag,pickupFire.stock]),pickupMaterials,'Focus changes cannot spend repair materials');
 pickupFire.player.equipped='woodenAxe';assert.equal(pickupKit.sample(pickupFire).repairAction,undefined,'Pinning does not keep a repair action after unequipping the hammer');advance(pickupFire,1);assert(!pickupFire.buildingRepair);assert.equal(JSON.stringify([pickupFire.bag,pickupFire.stock]),pickupMaterials);

 // Revalidate a displayed secondary action after equipment, range or stock changes.
 for(const failure of ['tool','range','materials','other-world']){
  const test=damagedStation('fire'),kit=new m.FieldKitController(),shown=kit.sample(test).repairAction;
  if(failure==='tool')test.player.equipped='woodenAxe';if(failure==='range')test.player.y+=400;if(failure==='materials'){m.setItemCount(test,'pallets',0);m.setStoredCount(test,'pallets',0)}
  const target=failure==='other-world'?damagedStation('fire'):test,before=JSON.stringify([target.bag,target.stock]);
  assert(!kit.pressRepair(target,shown),failure+' invalidates the displayed repair');assert(!target.buildingRepair);assert.equal(JSON.stringify([target.bag,target.stock]),before);
  if(failure==='tool')assert.equal(kit.sample(test).repairAction,undefined,'Unequipping removes the extra repair button');
 }
 // HQ damage repairs directly and instantly while Plans remains the main action.
 const directHQ=roundTrip(w);hq(directHQ);directHQ.stationPanel=undefined;directHQ.player.equipped='repairHammer';directHQ.player.hurtUntil=0;directHQ.progression.hqHp=150;directHQ.progression.defence=0;
 for(const [id,n]of Object.entries(m.REPAIR_CAMP_COST)){m.setItemCount(directHQ,id,n);m.setStoredCount(directHQ,id,0)}
 const hqKit=new m.FieldKitController(),hqShown=hqKit.sample(directHQ);assert.equal(hqShown.action.label,'PLANS');assert(hqShown.repairAction&&!hqShown.repairAction.disabled);
 assert(hqKit.press(directHQ,hqShown.action));hqKit.release('primary');assert.equal(directHQ.stationPanel,'headquarters','Plans still opens while a damaged HQ and hammer offer direct repair');assert(!directHQ.buildingRepair);directHQ.stationPanel=undefined;
 assert(hqKit.pressRepair(directHQ,hqShown.repairAction));hqKit.release('repair');assert(!directHQ.buildingRepair,'HQ repair remains instant');assert.equal(directHQ.stationPanel,undefined,'Direct HQ repair does not open a menu');
 assert.equal(directHQ.progression.hqHp,directHQ.progression.hqMax);assert.equal(directHQ.progression.defence,directHQ.progression.defenceMax);assert.equal(hqKit.sample(directHQ).action.label,'PLANS');assert.equal(hqKit.sample(directHQ).repairAction,undefined);
 assert(m.costRows(directHQ,m.REPAIR_CAMP_COST).every(row=>row.have===0));const hqPaid=JSON.stringify([directHQ.bag,directHQ.stock]);assert(!hqKit.pressRepair(directHQ,hqShown.repairAction));assert.equal(JSON.stringify([directHQ.bag,directHQ.stock]),hqPaid);
 // Damage persists independently of construction and does not remove unlocks.
 visit(w,'workshop');w.player.equipped='repairHammer';w.player.hurtUntil=0;
 assert(m.damageBuilding(w,'workshop',90));assert.equal(m.buildingHp(w,'workshop'),90);assert(m.buildingRestored(w,'workshop'));
 assert.equal(m.buildingHp(roundTrip(w),'workshop'),90);
 assert.equal(m.buildingRepairCost(w,'workshop').pallets,2);
 fund(w,'workshop');const counts=()=>JSON.stringify([w.bag,w.stock]);let before=counts();
 assert(m.beginBuildingRepair(w,'workshop'));assert(!m.beginBuildingRepair(w,'workshop'));assert.equal(counts(),before);
 advance(w,300);assert.equal(m.repairProgress(w),0,'A prepared repair never runs on its own');work(w,60);assert(m.repairProgress(w)>.2&&m.repairProgress(w)<.3);
 const interruptedSave=roundTrip(w);assert(!interruptedSave.buildingRepair);assert.equal(m.buildingHp(interruptedSave,'workshop'),90);
 m.stepBuildingRepair(w,{x:1,y:0});assert(!w.buildingRepair);assert.equal(counts(),before);
 assert(m.beginBuildingRepair(w,'workshop'));w.player.hp-=1;w.tick++;m.stepBuildingRepair(w,{x:0,y:0});assert(!w.buildingRepair);assert.equal(counts(),before);
 assert(m.beginBuildingRepair(w,'workshop'));w.player.equipped='woodenAxe';w.tick++;m.stepBuildingRepair(w,{x:0,y:0});assert(!w.buildingRepair);assert.equal(counts(),before);
 w.player.equipped='repairHammer';assert(m.beginBuildingRepair(w,'workshop'));work(w,241);assert.equal(m.buildingHp(w,'workshop'),180);assert.equal(m.materialTotal(w,'pallets'),1);assert(w.repairCheckpoint);
 assert(m.damageBuilding(w,'workshop',999));assert(!m.buildingRestored(w,'workshop'));assert(m.buildingEstablished(w,'workshop'));assert.equal(m.campAccessLevel(w),2);assert.equal(m.campBuildingArt(w,'base_workshop_t1').image,m.BROKEN_CAMP_ART.workshop);assert(!m.recipeUnlocked(w,'woodenAxe'));
 assert.equal(m.buildingHp(roundTrip(w),'workshop'),0);fund(w,'workshop');assert(m.beginBuildingRepair(w,'workshop'));work(w,241);assert(m.buildingRestored(w,'workshop'));assert(m.recipeUnlocked(w,'woodenAxe'));assert.equal(w.progression.restoredBuildings.filter(id=>id==='workshop').length,1);
 // Each night-raid species attacks a real authored building, with player aggro and line-of-sight.
 for(const kind of ['scrap-walker','scrap-hound','scrap-bomber']){
  const raid=roundTrip(w),site=visit(raid,'workshop');raid.player.x+=2000;raid.player.hurtUntil=0;raid.phase='night';
  const e=m.spawnCombatEnemyAt(raid,kind,{x:site.x,y:site.y+60});assert(e);e.siegeNight=1;e.attackAt=0;
  const hp=m.buildingHp(raid,'workshop');for(let tick=0;tick<300&&e.hp>0;tick++){raid.tick++;m.stepSiegeWalker(raid,e,true)}
  assert(m.buildingHp(raid,'workshop')<hp,kind+' damages workshop');assert.equal(e.siegeBuilding,'workshop');
  if(kind!=='scrap-bomber'){Object.assign(raid.player,{x:e.x,y:e.y+60});assert.equal(m.stepSiegeWalker(raid,e),false,kind+' returns to player combat')}
 }
 // No hit can reach through an intervening wall.
 const wall=roundTrip(w),wallSite=visit(wall,'workshop');wall.player.x+=2000;
 const attacker=m.spawnCombatEnemyAt(wall,'scrap-walker',{x:wallSite.x,y:wallSite.y+70});attacker.siegeNight=1;attacker.siegeTarget=true;attacker.siegeBuilding='workshop';attacker.repathAt=Infinity;attacker.motion.phase='windup';attacker.motion.since=-10;
 wall.layout={...wall.layout,items:[...wall.layout.items,{id:'raid-wall',assetId:'base_well_t1',x:wallSite.x,y:wallSite.y+35,scale:1,solid:true,role:'prop',roof:'hidden',frame:{sourceAssetId:'base_well_t1',width:120,height:10,anchor:[.5,.5]},collision:{lineWidth:.01,paths:[{closed:true,points:[[0,0],[1,0],[1,1],[0,1]]}]}}]};
 const safeHp=m.buildingHp(wall,'workshop');for(let tick=0;tick<60;tick++){wall.tick++;m.stepSiegeWalker(wall,attacker,true)}assert.equal(m.buildingHp(wall,'workshop'),safeHp);
 // Building health stays separate from the hold progress rendered by the HUD.
 visit(w,'well');fund(w,'well');m.damageBuilding(w,'well',50);w.player.hurtUntil=0;assert(m.beginBuildingRepair(w,'well'));work(w,60);
 const labels=[],bars=[],ctx=new Proxy({fillText(text){labels.push(text)},fillRect(...rect){bars.push(rect)}},{get:(o,k)=>k in o?o[k]:()=>{}});w.buildingHits={well:m.timeOf(w)};m.drawBuildingCondition(ctx,w,1);assert.equal(bars.length,0,'A held repair has no duplicate world health indicator');m.cancelBuildingRepair(w);m.damageBuilding(w,'well',1);m.drawBuildingCondition(ctx,w,1);assert(bars.length>0,'A fresh hit still renders building health');assert.equal(labels.length,0,'World damage bars contain no duplicated names, health numbers or equipment instructions');
 m.holdBuildingRepair(w,false);
 const malformed=JSON.parse(m.encodeRun(new m.SceneTravel(w,resources)));malformed.worlds[0][1].progression.buildingHp={workshop:-1};assert.throws(()=>m.decodeRun(JSON.stringify(malformed)));
 const old=make();delete old.progression.starterRepairHammer;delete old.gear.bag.repairHammer;delete old.gear.chest.repairHammer;
 let migrated=roundTrip(old);assert.equal(migrated.gear.bag.repairHammer,1);assert(migrated.progression.starterRepairHammer);migrated.gear.bag.repairHammer=0;migrated.gear.chest.repairHammer=1;migrated=roundTrip(migrated);assert.equal(migrated.gear.bag.repairHammer,0);assert.equal(migrated.gear.chest.repairHammer,1,'Migration cannot duplicate stored hammers');
 // Upgrade existing saves once without replacing their earned/stored tools.
 const legacy=make();delete legacy.progression.starterPickaxe;legacy.gear.bag.woodenPickaxe=0;legacy.gear.bag.woodenSpear=1;
 let upgraded=roundTrip(legacy);assert.equal(upgraded.gear.bag.woodenPickaxe,1);assert.equal(upgraded.gear.bag.woodenSpear,1);assert(upgraded.progression.starterPickaxe);
 upgraded.gear.bag.woodenPickaxe=0;upgraded=roundTrip(upgraded);assert.equal(upgraded.gear.bag.woodenPickaxe,0,'Starter grant is one-time');
 legacy.gear.chest.woodenPickaxe=1;assert.equal(roundTrip(legacy).gear.bag.woodenPickaxe,0,'Respect chest pickaxe');legacy.gear.chest.woodenPickaxe=0;legacy.gear.bag.metalPickaxe=1;assert.equal(roundTrip(legacy).gear.bag.woodenPickaxe,0,'Respect upgraded pickaxe');
 // HQ attackers must travel through the doorway and strike at the planning table.
 for(const kind of ['scrap-walker','scrap-hound','scrap-bomber']){
  const raid=make(),site=m.buildingAttackSite(raid,'headquarters'),bench=m.headquartersBench(raid),roof=raid.layout.items.find(p=>p.assetId==='base_shelter_t1');
  raid.player.x+=3000;raid.player.y+=3000;raid.phase='night';raid.progression.defence=0;
  assert(m.distance(site,m.headquartersDock(bench))<1);assert(m.distance(site,raid.progression.camp)>300);
  const e=m.spawnCombatEnemyAt(raid,kind,{...raid.progression.camp});assert(e);e.siegeNight=1;e.attackAt=0;
  const hp=raid.progression.hqHp;for(let tick=0;tick<30;tick++){raid.tick++;m.stepSiegeWalker(raid,e,true)}assert.equal(raid.progression.hqHp,hp,'No hits on the old empty camp point');
  for(let tick=0;tick<1800&&raid.progression.hqHp===hp;tick++){raid.tick++;m.stepSiegeWalker(raid,e,true)}
  assert(raid.progression.hqHp<hp,kind+' reaches and attacks the table');assert(m.distance(e,site)<site.reach,kind+' gets close to the table');
  if(kind!=='scrap-bomber')assert(m.headquartersRaidVisible(roof,raid),'Raid reveals the HQ interior from outside');
  if(kind==='scrap-walker'){const impact=raid.effects.find(f=>f.type==='enemy-strike');assert(impact&&m.distance(impact,site.impact)<100,'Punch impacts land at table height');assert.equal(e.motion.direction,m.facing(site.impact.x-e.x,site.impact.y-e.y),'Walker faces the resized planning table')}
 }
 // The south-facing facade disappears on the stairs, including rotated halls.
 const hqPlacement=layout.items.find(p=>p.assetId==='base_shelter_t1');
 for(const transform of [{},{rotation:90,flipX:true,scale:.8}]){
  const p={...hqPlacement,...transform},b=m.placementBounds(p),[x,y]=m.placementPoint(p,b.x+b.width*.5,b.y+b.height*.96),one=make();one.player.x=x;one.player.y=y;one.layout={...one.layout,items:[p]};
  assert(m.withinRoofApproach(p,x,y));assert(m.headquartersRoofBottom(p)<b.y+b.height);
  const sources=m.requiredImages([p.assetId]),images=Object.fromEntries(Object.entries(sources).map(([k,src])=>[k,{src}])),clips=[],alphas=[];
  const ctx=new Proxy({globalAlpha:1,lineTo(...args){clips.push(args)},drawImage(image){if(image.src===m.BROKEN_CAMP_ART.headquarters)alphas.push(this.globalAlpha)}},{get:(o,k)=>k in o?o[k]:()=>{}});
  const draws=m.placedDrawables(ctx,images,one);assert(draws.some(d=>!d.roof&&d.y<one.player.y),'Interior floor stays below a survivor on the approach');draws.filter(d=>d.roof).forEach(d=>d.draw());
  assert(!draws.some(d=>d.roof),'The roof and front panels are absent on the approach');assert.equal(alphas.length,0,'No exterior stair pixels can paint over the survivor');
 }
 console.log('PASS: Separate usable-station repair actions, hammer menu access during nearby threats, channel-owned release, secondary progress refresh, stale-action rejection, instant HQ repair, hold/release decay and resume, no idle progress, resources only at 100%, HQ table arrival/strikes, starter pickaxe migration, timed repairs, visible progress, interruption without payment, persistent building damage/destruction, Walker/Hound/Bomber attacks, player aggro, line-of-sight, starter hammer, one-time save migration, equip/repair gameplay actions, all on-site ruins, access/tool/material/proximity guards, atomic costs, save reloads and rotated stair/roof layering.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}

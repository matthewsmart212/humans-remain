import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'fishing-inventory-'));
try{
 await build({stdin:{contents:[
  'survival-engine','player-gear','expedition-inventory','quick-items','backpack',
  'chest-inventory','world-layout','station-access','camp-stations','camp-kitchen',
  'campfire-view','campfire-menu','food-items','bonfire-food-renderer','resource-outlines',
  'fishing-art','fishing-rewards','field-kit',
 ].map(name=>`export * from './src/${name}';`).join('\n'),resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temporary,'game.cjs'),logLevel:'error'});
 const m=createRequire(import.meta.url)(path.join(temporary,'game.cjs'));
 const near=(actual,expected)=>assert(Math.abs(actual-expected)<1e-7,`${actual} should equal ${expected}`);
 const make=(layout)=>{
  const w=m.createWorld(layout);w.animals=[];w.enemies=[];w.loot=[];w.breakables=[];
  for(const side of ['bag','chest'])for(const id of Object.keys(m.GEAR))m.gear(w)[side][id]=0;
  for(const kind of m.INVENTORY_KINDS){m.setItemCount(w,kind,0);m.setStoredCount(w,kind,0)}
  w.fire={cookUntil:0,ready:false,queue:[],rack:[],updatedAt:0};w.camp.hearth.fuel=0;
  if(!layout)Object.assign(w.player,m.stationFront(w.camp,'hearth'));
  return w;
 };
 const advance=(w,seconds)=>{w.tick+=Math.round(seconds*60);m.stepKitchen(w)};
 const snapshot=w=>JSON.stringify({bag:w.bag,stock:w.stock,cookedFish:w.cookedFish,cookedCarp:w.cookedCarp,cookedPike:w.cookedPike,gear:w.gear,pantry:w.kit?.pantry,fishing:w.fishing});

 // Older worlds have no fish counters or rod. Reading them cannot grant gear.
 const legacy=make();delete legacy.bag.rawFish;delete legacy.stock.rawFish;delete legacy.cookedFish;
 delete legacy.kit.pantry.cookedFish;delete legacy.gear.bag.fishingRod;delete legacy.gear.chest.fishingRod;
 assert.equal(m.itemCount(legacy,'rawFish'),0);assert.equal(m.itemCount(legacy,'cookedFish'),0);
 assert.equal(m.storedCount(legacy,'rawFish'),0);assert.equal(m.storedCount(legacy,'cookedFish'),0);
 near(m.packWeight(legacy),0);assert(!m.hasGear(legacy,'fishingRod'));
 assert(!m.newGear().bag.fishingRod&&!m.newGear().chest.fishingRod,'Fresh worlds do not bypass the tackle-box claim');
 assert(!m.selectQuickItem(legacy,'fishingRod'));assert(!m.selectQuickItem(legacy,'fishMeal'));
 legacy.gear.bag.fishingRod=1;near(m.packWeight(legacy),.8);
 assert(m.equipGear(legacy,'fishingRod'));assert.equal(m.selectedQuickItem(legacy),'fishingRod');
 assert(m.equipGear(legacy,'fishingRod'));assert.equal(m.selectedQuickItem(legacy),'fists');
 const quick=m.availableQuickItems({cooked:0,axes:legacy.gear.bag});
 assert.equal(quick[0].id,'fists');assert(quick.some(item=>item.id==='fishingRod'));assert(!quick.some(item=>item.id==='fishMeal'));

 // The rod and each prepared fish portion share the ordinary pack budget.
 const full=make();full.gear.bag.fishingRod=1;m.setItemCount(full,'fuel',281);
 assert.equal(m.addInventory(full,'rawFish',2),1);near(m.packWeight(full),23.83);
 assert.equal(m.addInventory(full,'rawFish',1),0);assert.equal(m.addInventory(full,'cookedFish',1),0);
 assert.equal(m.itemCount(full,'rawFish'),1);assert(m.packWeight(full)<=m.PACK_CAPACITY);

 // Cold fire and a full backpack cannot delete or duplicate a queued catch.
 const cold=make();assert.equal(m.addInventory(cold,'rawFish',1),1);
 assert.equal(m.queueCampfireFood(cold,'fish',1),1);advance(cold,30);
 const job=cold.fire.queue[0];assert.equal(job.remaining,12);assert.equal(m.itemCount(cold,'rawFish'),0);
 m.setItemCount(cold,'fuel',300);assert(!m.cancelCooking(cold,job.id));assert.equal(cold.fire.queue[0].id,job.id);
 m.setItemCount(cold,'fuel',0);assert(m.cancelCooking(cold,job.id));assert(!m.cancelCooking(cold,job.id));
 assert.equal(m.itemCount(cold,'rawFish'),1);assert.equal(cold.fire.queue.length,0);

 // Cook actual fish, land the cooked food, pick it up, equip it and eat it.
 const cooked=make();m.addInventory(cooked,'rawFish',2);cooked.camp.hearth.fuel=30;
 assert(m.campfireView(cooked).food.find(food=>food.species==='fish').canCook);
 assert.equal(m.queueCampfireFood(cooked,'fish',2),2);assert.equal(m.itemCount(cooked,'rawFish'),0);
 advance(cooked,24);assert.equal(cooked.fire.queue.length,0);assert.equal(cooked.loot.length,2);
 assert(cooked.loot.every(loot=>loot.kind==='cookedFish'&&loot.amount===1));
 advance(cooked,1);while(cooked.loot.length){Object.assign(cooked.player,cooked.loot[0]);assert(m.pickup(cooked))}
 assert.equal(m.itemCount(cooked,'cookedFish'),2);assert(!m.pickup(cooked));
 assert.equal(m.quickItemCount('fishMeal',0,0,0,0,{},2),2);
 assert(m.selectQuickItem(cooked,'fishMeal'));assert.equal(m.heldMeal(cooked),'fish');
 cooked.hunger=20;cooked.player.hp=70;
 assert(m.useBackpackItem(cooked,'fishMeal'));assert.equal(cooked.hunger,50);assert.equal(cooked.player.hp,76);
 assert(!m.useBackpackItem(cooked,'fishMeal'),'The existing meal cooldown applies');
 advance(cooked,8);assert(m.useBackpackItem(cooked,'fishMeal'));assert.equal(m.itemCount(cooked,'cookedFish'),0);
 assert.equal(cooked.player.equipped,null,'Eating the last held fish returns to fists');

 // Both forms use the regular drop, render, outline and pickup pathway.
 const dropped=make();m.addInventory(dropped,'rawFish',2);m.addInventory(dropped,'cookedFish',1);
 assert(m.dropBackpackItem(dropped,'fishRaw','all').ok);assert(m.dropBackpackItem(dropped,'fishMeal',1).ok);
 assert.equal(m.itemCount(dropped,'rawFish'),0);assert.equal(m.itemCount(dropped,'cookedFish'),0);
 assert.deepEqual(dropped.loot.map(loot=>[loot.kind,loot.amount]),[['rawFish',2],['cookedFish',1]]);
 assert.deepEqual(dropped.loot.map(loot=>m.pickupOutlineSprite(loot).key),['fishRaw','fishCooked']);
 const drawn=[],images={fishRaw:{kind:'raw'},fishCooked:{kind:'cooked'}};
 const ctx={save(){},restore(){},beginPath(){},ellipse(){},fill(){},drawImage(image){drawn.push(image)}};
 for(const drawable of m.bonfireFoodDrawables(ctx,images,dropped))drawable.draw();
 assert(drawn.includes(images.fishRaw)&&drawn.includes(images.fishCooked),'Ground fish use their own artwork');
 while(dropped.loot.length){Object.assign(dropped.player,dropped.loot[0]);assert(m.pickup(dropped))}
 assert.equal(m.itemCount(dropped,'rawFish'),2);assert.equal(m.itemCount(dropped,'cookedFish'),1);assert(!m.pickup(dropped));

 // Chest transfer preserves quantities, equips safely, and respects capacity.
 const chest={...m.newPlacement('art_hq_storage_chest',1600,1600),id:'fish-test-chest'};
 const store=make({...m.emptyLayout(),spawn:m.chestDock(chest),items:[chest]});store.stationPanel='storage';
 store.gear.bag.fishingRod=1;store.player.equipped='fishingRod';m.addInventory(store,'rawFish',3);m.addInventory(store,'cookedFish',2);
 assert.equal(m.moveChestItem(store,'fishingRod','pack',1),1);assert.equal(store.player.equipped,null);
 assert.equal(m.moveChestItem(store,'fishRaw','pack','all'),3);assert.equal(m.moveChestItem(store,'fishMeal','pack','all'),2);
 assert.equal(m.storedCount(store,'rawFish'),3);assert.equal(m.storedCount(store,'cookedFish'),2);near(m.packWeight(store),0);
 assert(m.chestItems(store,'chest').some(item=>item.id==='fishingRod'));
 assert(m.chestItems(store,'chest').some(item=>item.id==='fishRaw'&&item.raw));
 assert(m.chestItems(store,'chest').some(item=>item.id==='fishMeal'&&item.food===30));
 m.setItemCount(store,'fuel',295);const before=snapshot(store);
 assert.equal(m.moveChestItem(store,'fishRaw','chest','all'),0);assert.equal(m.moveChestItem(store,'fishingRod','chest',1),0);
 assert.equal(snapshot(store),before,'Blocked chest actions retain every item');
 assert.equal(m.moveChestItem(store,'fishMeal','chest','all'),1);near(m.packWeight(store),24);
 m.setItemCount(store,'fuel',0);assert.equal(m.moveChestItem(store,'fishingRod','chest',1),1);
 assert.equal(m.moveChestItem(store,'fishRaw','chest','all'),3);assert.equal(m.moveChestItem(store,'fishMeal','chest','all'),1);
 assert.equal(m.storedCount(store,'rawFish'),0);assert.equal(m.storedCount(store,'cookedFish'),0);
 near(m.packWeight(store),3.25);

 // Each new species remains distinct through the real bag, cooking, quickbar,
 // ground and storage pathways. Neither silently turns into perch or chicken.
 for(const spec of [
  {species:'carp',raw:'rawCarp',cooked:'cookedCarp',rawId:'carpRaw',mealId:'carpMeal',rawKey:'carpRaw',cookedKey:'carpCooked',seconds:16,food:38,health:8},
  {species:'pike',raw:'rawPike',cooked:'cookedPike',rawId:'pikeRaw',mealId:'pikeMeal',rawKey:'pikeRaw',cookedKey:'pikeCooked',seconds:18,food:44,health:10},
 ]){
  const old=make();delete old.bag[spec.raw];delete old.stock[spec.raw];delete old[spec.cooked];delete old.kit.pantry[spec.cooked];
  assert.equal(m.itemCount(old,spec.raw),0);assert.equal(m.itemCount(old,spec.cooked),0);
  assert.equal(m.storedCount(old,spec.raw),0);assert.equal(m.storedCount(old,spec.cooked),0);
  assert(!m.selectQuickItem(old,spec.mealId));near(m.packWeight(old),0);

  const w=make();m.addInventory(w,spec.raw,2);w.camp.hearth.fuel=80;
  const stats=new m.FieldKitController().sample(w),bag=m.backpackItems(stats);
  assert.equal(bag.find(item=>item.id===spec.rawId).count,2);
  assert.equal(bag.find(item=>item.id===spec.rawId).image,m.FISHING_ART[spec.raw]);
  assert.equal(m.campfireView(w).food.find(food=>food.species===spec.species).raw,m.FISHING_ART[spec.raw]);
  assert(m.doAction(w,'cook'),'The default cook action chooses the carried species');
  assert.equal(w.fire.queue[0].species,spec.species);
  assert.equal(m.queueCampfireFood(w,spec.species,1),1);assert.equal(m.itemCount(w,spec.raw),0);
  advance(w,spec.seconds*2+1);
  assert.equal(w.fire.queue.length,0);assert.equal(w.loot.length,2);
  assert(w.loot.every(loot=>loot.kind===spec.cooked&&loot.amount===1));
  while(w.loot.length){Object.assign(w.player,w.loot[0]);assert(m.pickup(w))}
  assert.equal(m.itemCount(w,spec.cooked),2);assert.equal(m.itemCount(w,'cookedFish'),0);
  const options=m.availableQuickItems({cooked:0,[spec.cooked]:2,axes:w.gear.bag});
  assert(options.some(item=>item.id===spec.mealId));
  assert.equal(m.quickItemCount(spec.mealId,0,0,0,0,{},0,spec.species==='carp'?2:0,spec.species==='pike'?2:0),2);
  assert(m.selectQuickItem(w,spec.mealId));assert.equal(m.heldMeal(w),spec.species);
  w.hunger=10;w.player.hp=60;
  assert(m.doAction(w,'eat'),'The default eat action uses the equipped species');assert.equal(w.hunger,10+spec.food);assert.equal(w.player.hp,60+spec.health);
  advance(w,8);assert(m.useBackpackItem(w,spec.mealId));assert.equal(w.player.equipped,null);

  const ground=make();m.addInventory(ground,spec.raw,3);m.addInventory(ground,spec.cooked,2);
  assert(m.dropBackpackItem(ground,spec.rawId,'all').ok);assert(m.dropBackpackItem(ground,spec.mealId,'all').ok);
  assert.deepEqual(ground.loot.map(l=>[l.kind,l.amount]),[[spec.raw,3],[spec.cooked,2]]);
  assert.deepEqual(ground.loot.map(l=>m.pickupOutlineSprite(l).key),[spec.rawKey,spec.cookedKey]);
  const speciesDrawn=[],speciesImages={[spec.rawKey]:{kind:spec.raw},[spec.cookedKey]:{kind:spec.cooked}};
  const speciesCtx={...ctx,drawImage(image){speciesDrawn.push(image)}};
  for(const drawable of m.bonfireFoodDrawables(speciesCtx,speciesImages,ground))drawable.draw();
  assert(speciesDrawn.includes(speciesImages[spec.rawKey])&&speciesDrawn.includes(speciesImages[spec.cookedKey]));
  while(ground.loot.length){Object.assign(ground.player,ground.loot[0]);assert(m.pickup(ground))}
  assert.equal(m.itemCount(ground,spec.raw),3);assert.equal(m.itemCount(ground,spec.cooked),2);

  const stock=make({...m.emptyLayout(),spawn:m.chestDock(chest),items:[chest]});stock.stationPanel='storage';
  m.addInventory(stock,spec.raw,3);m.addInventory(stock,spec.cooked,2);stock.player.equipped=spec.mealId;
  assert.equal(m.moveChestItem(stock,spec.rawId,'pack','all'),3);
  assert.equal(m.moveChestItem(stock,spec.mealId,'pack','all'),2);assert.equal(stock.player.equipped,null);
  assert.equal(m.chestItems(stock,'chest').find(item=>item.id===spec.mealId).count,2);
  m.setItemCount(stock,'fuel',300);const blocked=snapshot(stock);
  assert.equal(m.moveChestItem(stock,spec.rawId,'chest','all'),0);assert.equal(snapshot(stock),blocked);
  m.setItemCount(stock,'fuel',0);
  assert.equal(m.moveChestItem(stock,spec.rawId,'chest','all'),3);assert.equal(m.moveChestItem(stock,spec.mealId,'chest','all'),2);
  assert.equal(m.storedCount(stock,spec.raw),0);assert.equal(m.storedCount(stock,spec.cooked),0);
 }

 const catchOf=(species,kg,portions)=>({id:1,species,name:species,kg,isRecord:false,image:m.FISHING_ART[species==='drone'?'scoutDrone':species==='perch'?'rawFish':species==='carp'?'rawCarp':'rawPike'],...(portions===undefined?{}:{portions})});
 const pending=(w,c)=>{w.fishing={version:1,bait:10,claimed:true,attempts:1,caught:0,kept:0,released:0,bestKg:0,baitReadyAt:0,autoHook:false,toggleReel:false,pendingCatch:c};return c};
 assert.equal(m.fishingPortions('perch',1.24),1);assert.equal(m.fishingPortions('perch',1.25),2);
 assert.equal(m.fishingPortions('carp',2.74),2);assert.equal(m.fishingPortions('carp',2.75),3);
 assert.equal(m.fishingPortions('pike',4),3);assert.equal(m.fishingPortions('drone',6),1);
 const legacyCatch=catchOf('perch',1.5);assert.deepEqual(m.fishingCatchRewards(legacyCatch),[{kind:'rawFish',count:1}],'Old pending catches retain their original award');

 // Whole catches reserve all portions together. Space for a partial catch must
 // not award anything or consume the retained KEEP/RELEASE choice.
 const haul=make(),largeCarp=pending(haul,catchOf('carp',3.6,3));m.setItemCount(haul,'fuel',280);
 assert.equal(m.canCarryCount(haul,'rawCarp',3),2);
 assert.equal(m.fishingCatchRewardLabel(largeCarp),'3 raw carp portions');near(m.fishingCatchRewardWeight(largeCarp),2.1);
 const beforeHaul=snapshot(haul);assert(!m.canKeepFishingCatch(haul,largeCarp));assert(!m.keepFishingCatch(haul,largeCarp));assert.equal(snapshot(haul),beforeHaul);
 m.setItemCount(haul,'fuel',0);assert(m.keepFishingCatch(haul,largeCarp));assert.equal(m.itemCount(haul,'rawCarp'),3);assert.equal(haul.fishing.pendingCatch,undefined);
 const awarded=snapshot(haul);assert(!m.keepFishingCatch(haul,largeCarp));assert.equal(snapshot(haul),awarded,'Repeated KEEP never duplicates portions');

 // A drone awards both salvage stacks or neither. It never produces food.
 const salvage=make(),drone=pending(salvage,catchOf('drone',4.8,1));m.setItemCount(salvage,'fuel',270);
 assert(m.canCarryCount(salvage,'scrap',6)>=6);near(m.fishingCatchRewardWeight(drone),3);
 assert.equal(m.fishingCatchRewardLabel(drone),'6 scrap + 2 iron ore');
 const beforeSalvage=snapshot(salvage);assert(!m.keepFishingCatch(salvage,drone));assert.equal(snapshot(salvage),beforeSalvage,'Salvage cannot partly fill a pack');
 m.setItemCount(salvage,'fuel',262);assert(m.keepFishingCatch(salvage,drone));
 assert.equal(salvage.bag.scrap,6);assert.equal(salvage.bag.ironOre,2);assert.equal(m.itemCount(salvage,'rawFish'),0);near(m.packWeight(salvage),23.96);
 assert(!m.keepFishingCatch(salvage,drone));
 const creative=make();creative.creativeMode=true;creative.bag.scrap=4;creative.bag.ironOre=1;
 const creativeDrone=pending(creative,catchOf('drone',4,1));assert(m.keepFishingCatch(creative,creativeDrone));
 assert.equal(creative.bag.scrap,10);assert.equal(creative.bag.ironOre,3,'Virtual creative counts must never be copied into real inventory');
 for(const portions of [0,4,.5,null]){const invalid=make(),badCatch=pending(invalid,catchOf('pike',3,portions));assert(!m.keepFishingCatch(invalid,badCatch));assert.equal(invalid.fishing.pendingCatch,badCatch)}
 const overflow=make();overflow.creativeMode=true;overflow.bag.scrap=Number.MAX_SAFE_INTEGER;
 const overflowDrone=pending(overflow,catchOf('drone',4,1)),beforeOverflow=snapshot(overflow);
 assert(!m.keepFishingCatch(overflow,overflowDrone));assert.equal(snapshot(overflow),beforeOverflow,'A counter overflow cannot partly award the other salvage stack');

 console.log('PASS: perch/carp/pike bag, storage, cooking, eating, quickbar and ground artwork; old-save defaults; 1–3 portion catch weights; atomic full-pack rewards; no duplicate KEEP; mixed drone salvage; and creative real-inventory conservation.');
}finally{fs.rmSync(temporary,{recursive:true,force:true})}

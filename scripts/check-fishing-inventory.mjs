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
 const snapshot=w=>JSON.stringify({bag:w.bag,stock:w.stock,cookedFish:w.cookedFish,gear:w.gear,pantry:w.kit?.pantry});

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
 console.log('PASS: old-world fish defaults, no automatic rod, ownership/equip, shared pack capacity, cold cooking and cancellation conservation, cooked-fish landing/pickup/eating, food cooldown, raw/cooked drop artwork, and capacity-safe rod/fish chest round trips.');
}finally{fs.rmSync(temporary,{recursive:true,force:true})}

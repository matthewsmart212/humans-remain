import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'food-provisions-'));
try{
 await build({stdin:{contents:`export * from './src/food-provisions';export * from './src/expedition-inventory';export * from './src/survival-needs';export * from './src/survival-engine';export * from './src/camp-kitchen';export * from './src/campfire-view';export {stationFront} from './src/camp-stations';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'game.cjs')});
 const m=require(path.join(temp,'game.cjs'));
 const make=()=>{const w=m.createWorld();for(const id of Object.keys(w.gear.bag))w.gear.bag[id]=0;return w};
 const close=(a,b,label)=>assert(Math.abs(a-b)<1e-6,`${label}: ${a} vs ${b}`);
 const give=(w,id,count=1)=>m.setItemCount(w,id,count);
 const atFire=w=>Object.assign(w.player,m.stationFront(w.camp,'hearth'));
 const advance=w=>{w.tick=Math.ceil((m.expeditionKit(w).mealReadyAt+.01)*60)};

 const fresh=make();
 for(const id of m.PROVISION_IDS){assert.equal(m.itemCount(fresh,id),0);assert.equal(m.storedCount(fresh,id),0)}
 m.setStoredCount(fresh,'berries',12);m.expeditionKit(fresh);assert.equal(m.storedCount(fresh,'berries'),12,'Reading the kit never reseeds stock');
 give(fresh,'berries',3);close(m.packWeight(fresh),.12,'New foods contribute unit weight');
 fresh.player.equipped='berries';m.setItemCount(fresh,'berries',0);assert.equal(fresh.player.equipped,null,'An empty equipped stack is stowed');

 const partial=make();partial.kit={mealReadyAt:5,pantry:{cookedMeat:1,cookedRabbit:0,cookedVenison:0},provisions:{bag:{berries:2}}};
 assert.equal(m.itemCount(partial,'berries'),2,'Partial snapshot preserves existing food');assert.equal(m.storedCount(partial,'berries'),0);assert.equal(m.itemCount(partial,'apple'),0);assert.equal(partial.kit.mealReadyAt,5);assert.equal(partial.kit.pantry.cookedMeat,1);
 const sameBag=m.provisionCounts(partial,'bag');give(partial,'berries',3);assert.equal(m.provisionCounts(partial,'bag'),sameBag,'Migration preserves counter identity');assert.equal(m.itemCount(partial,'berries'),3,'Repeated reads do not reset migrated counts');
 partial.kit.provisions.bag={apple:4.8};assert.equal(m.itemCount(partial,'apple'),4);assert.equal(m.itemCount(partial,'berries'),0,'A replacement bag is normalized on first access');
 partial.kit.provisions={chest:{beans:3}};assert.equal(m.storedCount(partial,'beans'),3);assert.equal(m.itemCount(partial,'beans'),0,'A replacement partial store receives a separate empty bag');
 const invalid=make();invalid.kit={mealReadyAt:0,pantry:{cookedMeat:0,cookedRabbit:0,cookedVenison:0},provisions:{bag:{berries:-2,apple:NaN,beans:Infinity,energyBar:-Infinity,huntersMeal:2.9},chest:{berries:'4',apple:5.9,beans:-1}}};
 for(const id of ['berries','apple','beans','energyBar'])assert.equal(m.itemCount(invalid,id),0,'Invalid initial counters normalize to zero');assert.equal(m.itemCount(invalid,'huntersMeal'),2);close(m.packWeight(invalid),1.5,'Invalid initial counters cannot corrupt weight');assert.equal(m.storedCount(invalid,'berries'),0);assert.equal(m.storedCount(invalid,'apple'),5);assert.equal(m.storedCount(invalid,'beans'),0);
 for(const value of [NaN,Infinity,-Infinity]){m.setItemCount(invalid,'huntersMeal',value);m.setStoredCount(invalid,'apple',value)}assert.equal(m.itemCount(invalid,'huntersMeal'),2,'Nonfinite setter inputs preserve owned counts');assert.equal(m.storedCount(invalid,'apple'),5);
 m.setItemCount(invalid,'huntersMeal',1.9);assert.equal(m.itemCount(invalid,'huntersMeal'),1);m.setStoredCount(invalid,'apple',-2);assert.equal(m.storedCount(invalid,'apple'),0);

 for(const id of m.PROVISION_IDS){
  const w=make(),f=m.PROVISIONS[id];w.hunger=20;w.thirst=30;w.player.stamina=40;w.player.hp=50;give(w,id,2);
  assert(m.consumeProvision(w,id),`${id} can be eaten`);assert.equal(m.itemCount(w,id),1);
  close(w.hunger,Math.min(100,20+f.food),`${id} food`);close(w.thirst,Math.min(100,30+f.water),`${id} water`);close(w.player.stamina,Math.min(100,40+f.stamina),`${id} stamina`);
  assert.equal(w.player.hp,50,'Hunter health recovery must not happen immediately');
  assert(!m.consumeProvision(w,id),'Shared cooldown rejects a second tap');assert.equal(m.itemCount(w,id),1);
 }
 for(const id of m.PROVISION_IDS){
  const w=make();give(w,id);const before=m.itemCount(w,id);assert(!m.consumeProvision(w,id),'Full advertised benefits cannot waste food');assert.equal(m.itemCount(w,id),before);
  w.hunger=99.99;w.thirst=99.99;w.player.stamina=99.99;w.player.hp=99.99;assert(!m.consumeProvision(w,id),'Sub-percent simulation drift cannot waste a food item');
 }
 const thirsty=make();give(thirsty,'apple');thirsty.thirst=96;assert(m.consumeProvision(thirsty,'apple'));assert.equal(thirsty.thirst,100);assert.equal(thirsty.hunger,100);
 const tired=make();give(tired,'energyBar');tired.player.stamina=0;tired.survival={lastStaminaUse:0,healthRecoveryAt:10,exhausted:true};assert(m.consumeProvision(tired,'energyBar'));assert.equal(tired.player.stamina,30);assert(!tired.survival.exhausted,'A stamina boost releases exhaustion once threshold is met');
 const wrongBenefit=make();give(wrongBenefit,'beans');wrongBenefit.player.hp=30;assert(!m.consumeProvision(wrongBenefit,'beans'),'Beans cannot be wasted to heal an injury');
 const shared=make();shared.hunger=10;give(shared,'apple');give(shared,'energyBar');shared.cooked=1;assert(m.consumeProvision(shared,'apple'));assert(!m.consumeProvision(shared,'energyBar'));assert(!m.eatMeal(shared,'chicken'),'Existing meals share the same consumption cooldown');advance(shared);assert(m.eatMeal(shared,'chicken'));
 for(const lock of ['axeSwing','spearThrust','swordThrust','bowShot','dodge']){
  const w=make();w.hunger=10;give(w,'beans');w[lock]={};assert(!m.consumeProvision(w,'beans'),`Food blocked during ${lock}`);assert.equal(m.itemCount(w,'beans'),1);
 }
 for(const state of ['over','downed','dead','hurt','attack']){
  const w=make();w.hunger=10;give(w,'beans');if(state==='over')w.phase='over';if(state==='downed')w.player.downedUntil=10;if(state==='dead')w.player.hp=0;if(state==='hurt')w.player.hurtUntil=10;if(state==='attack')w.attackUntil=10;
  assert(!m.consumeProvision(w,'beans'),`Food blocked while ${state}`);assert.equal(m.itemCount(w,'beans'),1);
 }

 const healing=make();healing.hunger=10;healing.player.hp=50;healing.survival={lastStaminaUse:0,healthRecoveryAt:9999,exhausted:false};give(healing,'huntersMeal',2);
 assert(m.consumeProvision(healing,'huntersMeal'));assert.equal(healing.player.hp,50);
 for(let i=1;i<=20;i++){m.stepSurvivalNeeds(healing,1,i);close(healing.player.hp,50+i,'Gradual recovery progresses at one HP per second')}
 assert.equal(healing.survival.mealRecovery,undefined);
 const paused=make();paused.player.hp=80;paused.hunger=100;paused.survival={lastStaminaUse:0,healthRecoveryAt:9999,exhausted:false};give(paused,'huntersMeal',2);assert(m.consumeProvision(paused,'huntersMeal'));advance(paused);assert(!m.canConsumeProvision(paused,'huntersMeal'),'Pending recovery covering missing HP prevents heal-only waste');
 paused.player.downedUntil=40;m.stepSurvivalNeeds(paused,5,5);assert.equal(paused.player.hp,80);paused.player.downedUntil=0;paused.phase='over';m.stepSurvivalNeeds(paused,5,10);assert.equal(paused.player.hp,80,'Prepared meals do not revive or heal ended runs');
 const capped=make();capped.player.hp=98;capped.survival={lastStaminaUse:0,healthRecoveryAt:9999,exhausted:false};give(capped,'huntersMeal');assert(m.consumeProvision(capped,'huntersMeal'));m.stepSurvivalNeeds(capped,20,20);assert.equal(capped.player.hp,100);assert.equal(capped.survival.mealRecovery,undefined);
 const stacked=make();stacked.player.hp=20;stacked.hunger=0;stacked.survival={lastStaminaUse:0,healthRecoveryAt:9999,exhausted:false};give(stacked,'huntersMeal',2);assert(m.consumeProvision(stacked,'huntersMeal'));m.stepSurvivalNeeds(stacked,8,8);advance(stacked);assert(m.consumeProvision(stacked,'huntersMeal'));const hp=stacked.player.hp;m.stepSurvivalNeeds(stacked,1,9);close(stacked.player.hp,hp+1,'Another meal does not multiply recovery speed');

 const recipe=make();atFire(recipe);give(recipe,'cookedVenison',2);give(recipe,'berries',5);const weight=m.packWeight(recipe);
 assert(m.canPrepareHuntersMeal(recipe));assert(m.prepareHuntersMeal(recipe));assert.equal(m.itemCount(recipe,'cookedVenison'),1);assert.equal(m.itemCount(recipe,'berries'),3);assert.equal(m.itemCount(recipe,'huntersMeal'),1);close(m.packWeight(recipe),weight+.02,'Recipe consumes both ingredients and carries the finished meal');
 assert.equal(m.campfireView(recipe).preparedMeal.count,1);assert.equal(m.campfireView(recipe).preparedMeal.actionLabel,'PREPARE');
 const missing=make();atFire(missing);give(missing,'cookedVenison');give(missing,'berries');assert(!m.prepareHuntersMeal(missing));assert.equal(m.itemCount(missing,'cookedVenison'),1);assert.equal(m.itemCount(missing,'berries'),1);
 const away=make();away.player.x=-9999;away.player.y=-9999;give(away,'cookedVenison');give(away,'berries',2);assert(!m.prepareHuntersMeal(away),'Preparation is only available at campfire');
 const full=make();atFire(full);give(full,'cookedVenison');give(full,'berries',2);give(full,'apple');give(full,'energyBar');give(full,'scrap',115);close(m.packWeight(full),23.99,'Almost-full recipe fixture');
 assert(!m.prepareHuntersMeal(full),'Capacity is checked after all ingredients are replaced');assert.equal(m.itemCount(full,'cookedVenison'),1);assert.equal(m.itemCount(full,'berries'),2);assert.equal(m.itemCount(full,'huntersMeal'),0);assert.equal(m.campfireView(full).preparedMeal.actionLabel,'PACK FULL');
 m.setItemCount(full,'scrap',114);assert(m.prepareHuntersMeal(full));assert(m.packWeight(full)<=m.PACK_CAPACITY);
 console.log('Food provisions: partial-state migration, finite inventory counts/weight, five food effects, no-waste guards, shared cooldown, action locks, gradual recovery and camp recipe conservation passed.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}

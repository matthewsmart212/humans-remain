import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'spear-equipment-'));
try{
 await build({stdin:{contents:`export * from './src/survival-engine';export * from './src/studio-play';export * from './src/world-layout';export * from './src/quick-items';export * from './src/player-gear';export * from './src/backpack';export * from './src/chest-inventory';export * from './src/field-kit';export * from './src/worker-animation';export * from './src/spear-combat';export * from './src/expedition-inventory';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'test.cjs')});
 const m=require(path.join(temp,'test.cjs'));
 const make=()=>{const w=m.createWorld(m.emptyLayout());Object.assign(w.player,{x:1600,y:1600,direction:'right'});w.animals=[];w.breakables=[];w.enemies=[];return w};
 const enemy=(id,x,y=1600)=>({id,x,y,hp:100,maxHp:100,attackAt:999,path:[],repathAt:999,flashUntil:0});
 const at=(w,t)=>{w.tick=t*60;m.stepSpear(w)};
 // The starting chest is the only source of knives. Taking/storing uses the
 // same path as the web/native chest UI, including equipped-item fallback.
 const chest={...m.newPlacement('art_hq_storage_chest',1600,1600),id:'chest'};
 const storage=m.createWorld({...m.emptyLayout(),spawn:{x:1600,y:1690},items:[chest]});storage.animals=[];storage.enemies=[];storage.loot=[];
 for(const id of ['woodenKnife','scrapKnife']){
  let s=new m.FieldKitController().sample(storage);
  assert(!m.backpackItems(s).some(i=>i.id===id));assert(!m.availableQuickItems(s).some(i=>i.id===id));
  assert.equal(m.chestItemCount(storage,id,'chest'),1);assert(m.chestItems(storage,'chest').some(i=>i.id===id));
  assert.equal(m.moveChestItem(storage,id,'chest',1),1);assert(m.selectQuickItem(storage,id));
  assert.equal(m.moveChestItem(storage,id,'pack',1),1);assert.equal(m.selectedQuickItem(storage),'fists');
  assert.equal(m.chestItemCount(storage,id,'chest'),1);
 }
 for(const id of ['woodenSpear','metalSpear']){
  const w=make(),spec=m.SPEAR_THRUST,snapshot=new m.FieldKitController().sample(w);
  assert(m.availableQuickItems(snapshot).some(i=>i.id===id));assert(m.backpackItems(snapshot).some(i=>i.id===id));assert(m.selectQuickItem(w,id));
  w.enemies=[enemy(1,1775),enemy(2,1785),enemy(3,1795),enemy(4,1540),enemy(5,1600,1680)];
  assert(m.attack(w));assert(w.enemies.every(e=>e.hp===100),'no damage before the extension');
  assert(!m.attack(w));assert(!m.selectQuickItem(w,'fists'),'cannot swap during committed thrust');
  at(w,.1);assert.equal(m.workerAnimation(w).pose,'punch');assert(w.enemies.every(e=>e.hp===100));
  at(w,.15);assert.equal(w.enemies[0].hp,100-m.SPEAR_GEAR[id].damage,'long reach hits beyond knife range');
  assert(w.enemies.slice(1).every(e=>e.hp===100),'single target; not side, rear or out-of-range targets');
  at(w,.2);assert.equal(w.enemies[0].hp,100-m.SPEAR_GEAR[id].damage,'one damage event');
  at(w,.45);assert(!w.spearThrust);assert(!m.attack(w),'cooldown outlasts recovery');at(w,spec.cooldown);assert(m.attack(w));
  at(w,1.1);assert(m.selectQuickItem(w,'fists'));w.gear.bag[id]=0;assert(!m.selectQuickItem(w,id));w.player.equipped=id;assert(!m.attack(w));
  const evaded=make();m.selectQuickItem(evaded,id);evaded.enemies=[enemy(1,1770)];m.attack(evaded);evaded.enemies[0].x=1830;at(evaded,.15);assert.equal(evaded.enemies[0].hp,100,'reach rechecked on contact');
  const blocked=make();m.selectQuickItem(blocked,id);blocked.enemies=[enemy(1,1770)];m.attack(blocked);
  blocked.layout.items.push({...m.newPlacement('art_hq_storage_chest',1680,1600),id:'blocker',solid:true,frame:{sourceAssetId:'art_hq_storage_chest',width:20,height:120,anchor:[.5,.5]},collision:{lineWidth:.01,paths:[{closed:true,points:[[0,0],[1,0],[1,1],[0,1]]}]}});m.invalidateLayoutCollision(blocked.layout);
  assert(!m.lineClear(blocked.player,blocked.enemies[0],blocked),'fixture blocks the line');at(blocked,.15);assert.equal(blocked.enemies[0].hp,100,'cannot thrust through walls');
  const hunting=make();m.selectQuickItem(hunting,id);hunting.animals=[{id:22,x:1770,y:1600,hp:100,home:0,moving:false,right:true,flashUntil:0}];m.attack(hunting);at(hunting,.15);assert.equal(hunting.animals[0].hp,100-m.SPEAR_GEAR[id].damage);
  const interrupted=make();m.selectQuickItem(interrupted,id);interrupted.enemies=[enemy(1,1770)];m.attack(interrupted);interrupted.player.downedUntil=10;at(interrupted,.15);assert(!interrupted.spearThrust);assert.equal(interrupted.enemies[0].hp,100);
  assert(m.selectQuickItem(storage,id));assert.equal(m.moveChestItem(storage,id,'pack',1),1);assert.equal(m.selectedQuickItem(storage),'fists');assert(!m.availableQuickItems(new m.FieldKitController().sample(storage)).some(i=>i.id===id));assert.equal(m.moveChestItem(storage,id,'chest',1),1);
  // Both simulation entry points must resolve delayed contact.
  for(const step of [(w)=>m.stepWorld(w,{x:0,y:0}),(w)=>m.stepCampPlaySession(w,{x:0,y:0},false,false)]){
   const live=make();m.selectQuickItem(live,id);live.enemies=[enemy(1,1770)];m.attack(live);for(let i=0;i<10;i++)step(live);assert.equal(live.enemies[0].hp,100-m.SPEAR_GEAR[id].damage);
  }
 }
 assert(m.SPEAR_GEAR.metalSpear.damage>m.SPEAR_GEAR.woodenSpear.damage);
 console.log('PASS: knives start in chest; both spear inventories/transfers, timed damage, longer reach, single-target lane, walls, evasion, cooldown, interruption and both simulation loops.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}

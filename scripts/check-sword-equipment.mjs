import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'sword-equipment-'));
try{
 await build({stdin:{contents:`export * from './src/survival-engine';export * from './src/studio-play';export * from './src/world-layout';export * from './src/quick-items';export * from './src/player-gear';export * from './src/backpack';export * from './src/chest-inventory';export * from './src/field-kit';export * from './src/worker-animation';export * from './src/sword-combat';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'test.cjs')});
 const m=require(path.join(temp,'test.cjs'));
 const make=()=>{const w=m.createWorld(m.emptyLayout());Object.assign(w.player,{x:1600,y:1600,direction:'right'});w.animals=[];w.breakables=[];w.enemies=[];return w};
 const enemy=(id,x,y=1600)=>({id,x,y,hp:100,maxHp:100,attackAt:999,path:[],repathAt:999,flashUntil:0});
 const at=(w,t)=>{w.tick=t*60;m.stepSword(w)};
 const chest={...m.newPlacement('art_hq_storage_chest',1600,1600),id:'chest'};
 const storage=m.createWorld({...m.emptyLayout(),spawn:{x:1600,y:1690},items:[chest]});storage.animals=[];storage.enemies=[];storage.loot=[];
 for(const id of ['woodenSword','metalSword']){
  const w=make(),spec=m.SWORD_THRUST,snapshot=new m.FieldKitController().sample(w),damage=m.SWORD_GEAR[id].damage;
  assert(m.availableQuickItems(snapshot).some(i=>i.id===id));assert(m.backpackItems(snapshot).some(i=>i.id===id));assert(m.selectQuickItem(w,id));
  assert.equal(new m.FieldKitController().sample(w).action.label,'THRUST');
  // A nearest target, flank targets, a second target in the lane, a rear target and one beyond reach.
  w.enemies=[enemy(1,1700),enemy(2,1675,1690),enemy(3,1675,1510),enemy(4,1745),enemy(5,1540),enemy(6,1770)];
  assert(m.attack(w));assert(w.enemies.every(e=>e.hp===100));assert(!m.attack(w));assert(!m.selectQuickItem(w,'fists'));
  at(w,spec.contact-.01);assert.equal(m.workerAnimation(w).pose,'punch','contact uses the approved spear-style extension');assert(w.enemies.every(e=>e.hp===100),'no damage during wind-up');
  at(w,spec.contact+.01);assert.equal(w.enemies[0].hp,100-damage,'the thrust hits the nearest target ahead');
  assert(w.enemies.slice(1).every(e=>e.hp===100),'one target per thrust, with no sweeping damage');
  at(w,spec.retract);assert.equal(w.enemies[0].hp,100-damage,'a thrust cannot hit twice');
  at(w,spec.duration+.01);assert(!w.swordThrust);assert(!m.attack(w),'cooldown outlasts recovery');at(w,spec.cooldown);assert(m.attack(w));
  at(w,spec.cooldown+spec.duration+.01);assert(m.selectQuickItem(w,'fists'));w.gear.bag[id]=0;assert(!m.selectQuickItem(w,id));w.player.equipped=id;assert(!m.attack(w));
  const flanks=make();m.selectQuickItem(flanks,id);flanks.enemies=[enemy(1,1675,1690),enemy(2,1675,1510),enemy(3,1540),enemy(4,1770)];m.attack(flanks);at(flanks,spec.contact+.01);assert(flanks.enemies.every(e=>e.hp===100),'a straight thrust misses flanks, rear and distant targets');
  const evaded=make();m.selectQuickItem(evaded,id);evaded.enemies=[enemy(1,1710)];m.attack(evaded);evaded.enemies[0].x=1790;at(evaded,spec.contact+.01);assert.equal(evaded.enemies[0].hp,100,'reach is rechecked at contact');
  const blocked=make();m.selectQuickItem(blocked,id);blocked.enemies=[enemy(1,1720)];m.attack(blocked);
  blocked.layout.items.push({...m.newPlacement('art_hq_storage_chest',1680,1600),id:'blocker',solid:true,frame:{sourceAssetId:'art_hq_storage_chest',width:20,height:120,anchor:[.5,.5]},collision:{lineWidth:.01,paths:[{closed:true,points:[[0,0],[1,0],[1,1],[0,1]]}]}});m.invalidateLayoutCollision(blocked.layout);
  assert(!m.lineClear(blocked.player,blocked.enemies[0],blocked));at(blocked,spec.contact+.01);assert.equal(blocked.enemies[0].hp,100,'cannot thrust through walls');
  const hunting=make();m.selectQuickItem(hunting,id);hunting.animals=[{id:22,x:1710,y:1600,hp:100,home:0,moving:false,right:true,flashUntil:0}];m.attack(hunting);at(hunting,spec.contact+.01);assert.equal(hunting.animals[0].hp,100-damage);
  const interrupted=make();m.selectQuickItem(interrupted,id);interrupted.enemies=[enemy(1,1710)];m.attack(interrupted);interrupted.player.downedUntil=10;at(interrupted,spec.contact+.01);assert(!interrupted.swordThrust);assert.equal(interrupted.enemies[0].hp,100);
  const dodging=make();dodging.combatTest=true;m.selectQuickItem(dodging,id);m.attack(dodging);assert(!m.dodgePlayer(dodging),'cannot cancel before contact');at(dodging,spec.contact+.01);assert(m.dodgePlayer(dodging));assert(!dodging.swordThrust);
  assert(m.selectQuickItem(storage,id));assert.equal(m.moveChestItem(storage,id,'pack',1),1);assert.equal(m.selectedQuickItem(storage),'fists');assert(!m.availableQuickItems(new m.FieldKitController().sample(storage)).some(i=>i.id===id));assert.equal(m.moveChestItem(storage,id,'chest',1),1);
  // Delayed contact must resolve in both actual game simulation entry points.
  for(const step of [(w)=>m.stepWorld(w,{x:0,y:0}),(w)=>m.stepCampPlaySession(w,{x:0,y:0},false,false)]){
   const live=make();m.selectQuickItem(live,id);live.enemies=[enemy(1,1710)];m.attack(live);for(let i=0;i<15;i++)step(live);assert.equal(live.enemies[0].hp,100-damage);
  }
 }
 assert(m.SWORD_GEAR.metalSword.damage>m.SWORD_GEAR.woodenSword.damage);
 console.log('PASS: both sword inventories/transfers, single-target thrusts, narrow aim, timed contact, reach, walls, evasion, cooldown, interruption, dodge and both simulation loops.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}

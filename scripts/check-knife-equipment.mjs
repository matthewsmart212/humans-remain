import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'knife-equipment-'));
try{
 await build({stdin:{contents:`export * from './src/survival-engine';export * from './src/world-layout';export * from './src/quick-items';export * from './src/player-gear';export * from './src/backpack';export * from './src/field-kit';export * from './src/worker-animation';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'test.cjs')});
 const m=require(path.join(temp,'test.cjs'));
 for(const id of ['woodenKnife','scrapKnife']){
  const w=m.createWorld(m.emptyLayout());Object.assign(w.player,{x:1500,y:1500,direction:'right'});w.animals=[];w.breakables=[];w.enemies=[];
  assert.equal(w.gear.bag[id],0);assert.equal(w.gear.chest[id],1);
  assert(!m.availableQuickItems(new m.FieldKitController().sample(w)).some(i=>i.id===id),'stored knife hidden from quick select');
  w.gear.bag[id]=1;w.gear.chest[id]=0;
  const snapshot=new m.FieldKitController().sample(w);
  assert(m.availableQuickItems(snapshot).some(i=>i.id===id));assert(m.backpackItems(snapshot).some(i=>i.id===id));
  assert(m.selectQuickItem(w,id));assert.equal(m.selectedQuickItem(w),id);
  const enemy=(n,x)=>({id:n,x,y:1500,hp:100,maxHp:100,attackAt:999,path:[],repathAt:999,flashUntil:0});
  w.enemies=[enemy(1,1560),enemy(2,1580),enemy(3,1620)];
  assert(m.attack(w));assert.equal(w.enemies[0].hp,100-m.KNIFE_GEAR[id].damage);assert.equal(w.enemies[1].hp,100,'knife hits only one target');assert.equal(w.enemies[2].hp,100,'out of reach');
  assert(!m.attack(w));assert(!m.selectQuickItem(w,'fists'),'cannot swap during thrust');
  w.tick=4;assert.equal(m.workerAnimation(w).pose,'punch','knife thrust pose matches fast cooldown');
  w.tick=18;assert(m.attack(w),'next stab available after 0.30s');
  w.tick=60;assert(m.selectQuickItem(w,'fists'));w.gear.bag[id]=0;assert(!m.selectQuickItem(w,id));
  assert(!m.availableQuickItems(new m.FieldKitController().sample(w)).some(i=>i.id===id),'unowned knife hidden');
  w.player.equipped=id;assert(!m.attack(w),'unowned weapon cannot attack');
 }
 console.log('PASS: both knife inventory entries, quick selection, ownership, fast cooldown, single-target damage, reach and thrust animation');
}finally{fs.rmSync(temp,{recursive:true,force:true})}

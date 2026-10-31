import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'campfire-menu-'));
try{
 await build({stdin:{contents:`export * from './src/campfire-menu';export * from './src/campfire-view';export * from './src/camp-kitchen';export * from './src/survival-engine';export * from './src/camp-stations';export * from './src/expedition-inventory';export * from './src/player-gear';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'menu.cjs'),logLevel:'error'});
 const m=createRequire(import.meta.url)(path.join(temp,'menu.cjs'));
 const make=()=>{const w=m.createWorld();w.animals=[];w.enemies=[];w.loot=[];w.breakables=[];for(const id of Object.keys(m.gear(w).bag))m.gear(w).bag[id]=0;for(const id of m.INVENTORY_KINDS){m.setItemCount(w,id,0);m.setStoredCount(w,id,0)}w.camp.hearth.fuel=0;Object.assign(w.player,m.stationFront(w.camp,'hearth'));w.stationPanel='fire';assert.equal(m.campAction(w),'cook');return w};
 const advance=(w,seconds)=>{w.tick+=Math.round(seconds*60);m.stepKitchen(w)};
 const empty=make();m.setStoredCount(empty,'rawMeat',20);
 assert.equal(m.campfireFoodSelection(m.campfireView(empty),null,1).food,null,'The menu does not choose a food for the player');
 assert.equal(m.campfireFoodSelection(m.campfireView(empty),'chicken',99).amount,0,'Food in camp stores cannot become a carried fire input');
 assert.equal(m.queueCampfireFood(empty,'chicken',4),0);assert.equal(m.storedCount(empty,'rawMeat'),20);

 const cold=make();m.setItemCount(cold,'rawMeat',2);m.setItemCount(cold,'rawRabbit',3);
 const view=m.campfireView(cold),before=JSON.stringify({bag:cold.bag,fire:cold.fire});
 let selected=m.campfireFoodSelection(view,'chicken',99);
 assert.equal(selected.limit,2);assert.equal(selected.amount,2);assert.equal(JSON.stringify({bag:cold.bag,fire:cold.fire}),before,'Selection is read-only');
 assert.equal(m.queueCampfireFood(cold,'chicken',selected.amount),2);assert.equal(m.itemCount(cold,'rawMeat'),0);assert.equal(cold.fire.queue.length,2);
 assert.equal(m.queueCampfireFood(cold,'chicken',2),0,'A stale action cannot consume a different remaining food');
 assert.equal(m.campfireFoodSelection(m.campfireView(cold),'chicken',2).food,null,'The depleted food stops being selectable');
 advance(cold,30);assert(cold.fire.queue.every(job=>job.remaining===12),'Food waits safely without fuel');
 selected=m.campfireFoodSelection(m.campfireView(cold),'rabbit',99);assert.equal(selected.limit,2,'Max accounts for occupied fire slots');
 assert.equal(m.queueCampfireFood(cold,'rabbit',99),2);assert.equal(m.itemCount(cold,'rawRabbit'),1);assert.equal(cold.fire.queue.length,m.KITCHEN_QUEUE);
 assert.equal(m.queueCampfireFood(cold,'rabbit',1),0);assert.equal(m.campfireFoodSelection(m.campfireView(cold),'rabbit',1).blocked,'Fire full');
 const cancelled=cold.fire.queue[0].id;assert(m.cancelCooking(cold,cancelled));assert(!m.cancelCooking(cold,cancelled));assert.equal(m.itemCount(cold,'rawMeat'),1,'Cancellation refunds exactly one owned raw item');
 assert.equal(m.itemCount(cold,'rawMeat')+cold.fire.queue.filter(job=>job.species==='chicken').length,2);
 assert.equal(m.itemCount(cold,'rawRabbit')+cold.fire.queue.filter(job=>job.species==='rabbit').length,3);

 const invalid=make();m.setItemCount(invalid,'rawMeat',4);
 for(const value of [0,-1,.5,NaN,Infinity])assert.equal(m.queueCampfireFood(invalid,'chicken',value),0);
 for(const value of ['beans','constructor','__proto__',null])assert.equal(m.queueCampfireFood(invalid,value,1),0);
 assert.equal(m.itemCount(invalid,'rawMeat'),4);assert.equal(invalid.fire.queue?.length??0,0);
 invalid.player.x+=1000;assert.equal(m.queueCampfireFood(invalid,'chicken',4),0,'Live range checks are retained');assert.equal(m.itemCount(invalid,'rawMeat'),4);
 Object.assign(invalid.player,m.stationFront(invalid.camp,'hearth'));invalid.player.downedUntil=100;assert.equal(m.queueCampfireFood(invalid,'chicken',1),0);invalid.player.downedUntil=0;invalid.phase='over';assert.equal(m.queueCampfireFood(invalid,'chicken',1),0);

 const hot=make();m.setItemCount(hot,'rawRabbit',4);hot.camp.hearth.fuel=40;
 assert.equal(m.queueCampfireFood(hot,'rabbit',4),4);advance(hot,32);assert.equal(hot.fire.queue.length,0);assert.equal(hot.fire.rack.length,4,'Adding food to a lit fire starts normal cooking automatically');
 assert.equal(m.collectFood(hot),4);assert.equal(m.itemCount(hot,'cookedRabbit'),4);assert.equal(m.collectFood(hot),0,'Cooked food cannot be duplicated');

 const paused=make();m.setItemCount(paused,'rawMeat',1);paused.fire.rack=Array(6).fill('rabbit');paused.camp.hearth.fuel=30;
 assert.equal(m.queueCampfireFood(paused,'chicken',1),1);advance(paused,10);assert.equal(paused.fire.queue[0].remaining,12,'A full ready rack preserves queued raw food');
 assert.equal(m.collectFood(paused,'rabbit'),1);advance(paused,12);assert.equal(paused.fire.queue.length,0);assert.equal(paused.fire.rack.filter(species=>species==='chicken').length,1);

 const full=make();full.fire.rack=['chicken','chicken'];m.setItemCount(full,'fuel',294);
 assert.equal(m.collectFood(full),1,'Collection takes only the food that fits');assert.equal(full.fire.rack.length,1);assert.equal(m.itemCount(full,'cookedMeat'),1);assert(m.packWeight(full)<=m.PACK_CAPACITY);
 assert.equal(m.collectFood(full),0);assert.equal(full.fire.rack.length,1,'Uncollected cooked food remains safe');
 console.log('PASS: carried-food-only selection, read-only selection, exact batch and slot limits, cold waiting, stale/depleted input, cancellation conservation, invalid/range/downed guards, automatic cooking, full-rack pause and capacity-safe collection.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}

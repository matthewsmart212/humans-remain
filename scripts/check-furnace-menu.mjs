import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'furnace-menu-'));
try{
 await build({stdin:{contents:`export * from './src/furnace-menu';export * from './src/furnace-view';export * from './src/camp-furnace';export * from './src/ironworks-data';export * from './src/forge-recipes';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/expedition-inventory';export * from './src/player-gear';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'menu.cjs'),logLevel:'error'});
 const m=createRequire(import.meta.url)(path.join(temp,'menu.cjs'));
 const make=()=>{const layout=m.emptyLayout(),p={...m.newPlacement(m.FURNACE_ID,1600,1600),id:'furnace-menu'};layout.items=[p];const dock=m.furnaceDock(p);layout.spawn={x:dock.x,y:dock.y+60};const w=m.createWorld(layout);w.animals=[];w.enemies=[];w.loot=[];w.breakables=[];for(const id of Object.keys(m.gear(w).bag))m.gear(w).bag[id]=0;assert(m.openFurnace(w,p.id));return{w,f:m.furnaceState(w,p.id)}};
 const cold=make();m.setItemCount(cold.w,'ironOre',1);m.setStoredCount(cold.w,'ironOre',4);
 let selected=m.furnaceBatchSelection(m.furnaceView(cold.w),'ore',99);
 assert.equal(selected.limit,2);assert.equal(selected.amount,2);
 assert.equal(m.queueFurnaceBatches(cold.w,'ore',99),2,'Max is bounded by materials even without fuel');
 assert.equal(cold.f.queue.length,2);assert.equal(cold.f.fuel,0);assert.equal(m.itemCount(cold.w,'ironOre'),0);assert.equal(m.storedCount(cold.w,'ironOre'),1);
 assert.equal(m.queueFurnaceBatches(cold.w,'ore',2),0,'A repeat press cannot pay with stale material counts');
 selected=m.furnaceBatchSelection(m.furnaceView(cold.w),'ore',2);assert.equal(selected.blocked,'Need 1 more ore');
 m.setStoredCount(cold.w,'scrap',30);selected=m.furnaceBatchSelection(m.furnaceView(cold.w),'scrap',99);assert.equal(selected.limit,2,'Max also respects the remaining queue slots');
 assert.equal(m.queueFurnaceBatches(cold.w,'scrap',99),2);assert.equal(cold.f.queue.length,4);assert.equal(m.storedCount(cold.w,'scrap'),24);assert.equal(m.queueFurnaceBatches(cold.w,'scrap',1),0);assert.equal(m.furnaceBatchSelection(m.furnaceView(cold.w),'scrap',1).blocked,'Queue full');
 const cancelled=cold.f.queue[0].id;assert(m.cancelSmelt(cold.w,cancelled));assert(!m.cancelSmelt(cold.w,cancelled));assert.equal(m.storedCount(cold.w,'ironOre'),3,'Cancellation keeps the existing one-time material refund');
 const full=make();full.f.ready=8;m.setStoredCount(full.w,'scrap',3);assert.equal(m.queueFurnaceBatches(full.w,'scrap',1),1,'Output full pauses processing without changing queue eligibility');
 full.w.stationPanel=undefined;m.setStoredCount(full.w,'scrap',3);assert.equal(m.queueFurnaceBatches(full.w,'scrap',1),0,'The quantity helper cannot bypass furnace access');assert.equal(m.storedCount(full.w,'scrap'),3);
 const upgraded=make();for(const[id,count]of Object.entries(m.FURNACE_UPGRADE_COST))m.setStoredCount(upgraded.w,id,count);assert(m.upgradeFurnace(upgraded.w));m.setStoredCount(upgraded.w,'scrap',30);assert.equal(m.furnaceBatchSelection(m.furnaceView(upgraded.w),'scrap',99).limit,6);assert.equal(m.queueFurnaceBatches(upgraded.w,'scrap',99),6);assert.equal(upgraded.f.queue.length,6);assert.equal(m.furnaceView(upgraded.w).rackMax,12);
 const partial=make();for(const id of m.INVENTORY_KINDS)m.setItemCount(partial.w,id,0);m.setItemCount(partial.w,'fuel',290);partial.f.ready=8;assert.equal(m.furnaceCollectCount(partial.w,m.furnaceView(partial.w)),1,'Collect label reflects backpack capacity, not all ready output');assert.equal(m.collectIngots(partial.w),1);assert.equal(partial.f.ready,7);assert.equal(m.furnaceCollectCount(partial.w,m.furnaceView(partial.w)),0,'Full backpack offers no further ingots');
 assert.equal(m.furnaceFuelTime(60),'1:00');assert.equal(m.furnaceJobLabel('ADD WOOD'),'Needs wood');assert.equal(m.furnaceJobLabel('16s'),'16s left');
 console.log('PASS: furnace quantity limits, mixed bag/camp payment, cold queueing, repeated/stale presses, full queue/output, cancellation refund, access lock, upgraded capacities and carry-limited collection counts.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}

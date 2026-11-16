import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'cooked-food-drops-')),random=Math.random;
try{
 await build({stdin:{contents:`export * from './src/survival-engine';export * from './src/camp-kitchen';export * from './src/cooked-food-drop';export * from './src/expedition-inventory';export * from './src/camp-stations';export * from './src/studio-play';export * from './src/imported-art';export * from './src/bonfire-food-renderer';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'game.cjs'),logLevel:'error'});
 const m=createRequire(import.meta.url)(path.join(temp,'game.cjs')),snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));
 m.installImportedArt(snapshot.records);
 const make=()=>{const w=m.createCampPlaySession(snapshot.layout);w.animals=[];w.enemies=[];w.loot=[];w.fire={queue:[],rack:[],updatedAt:0,cookUntil:0,ready:false};w.camp.hearth.fuel=100;Object.assign(w.player,m.stationFront(w.camp,'hearth'));return w};
 const advance=(w,seconds)=>{w.tick+=Math.round(seconds*60);m.stepKitchen(w)};
 const w=make();m.setItemCount(w,'rawMeat',1);assert(m.queueFood(w,'chicken'));advance(w,12);
 assert.equal(w.loot.length,1);const meal=w.loot[0];assert.equal(meal.kind,'cookedMeat');assert.equal(meal.amount,1);assert.equal(meal.flight.born,12);assert.equal(meal.flight.lands,12+m.COOKED_FOOD_HOP_SECONDS);
 assert.equal(w.fire.queue.length,0);assert.deepEqual(w.fire.rack,[]);assert(!m.worldBlocked(w,meal.x,meal.y,22),'Actual camp landing is walkable');
 const inventory=m.itemCount(w,'cookedMeat');Object.assign(w.player,meal);assert.equal(m.pickupTarget(w),undefined,'No collection in flight');assert(!m.pickup(w));
 const images={bonfireCooked:{key:'food'},campServing:{key:'table'}},draws=[];
 const ctx={save(){},restore(){},beginPath(){},ellipse(){},fill(){},drawImage(...args){draws.push(args)}};
 w.tick+=18;for(const d of m.bonfireFoodDrawables(ctx,images,w))d.draw();
 const rendered=draws.find(d=>d[0]===images.bonfireCooked);assert(rendered);assert(!draws.some(d=>d[0]===images.campServing),'Serving table is never rendered');
 assert(rendered[2] < (meal.flight.from.y+meal.y)/2-44-50,'Cooked food visibly arcs above the floor halfway through its hop');
 advance(w,1);assert(m.pickup(w));assert.equal(m.itemCount(w,'cookedMeat'),inventory+1);assert.equal(w.loot.length,0);assert(!m.pickup(w));

 // All meat types finish exactly once, even when catching up after map travel.
 const batch=make();batch.fire.queue=[{id:batch.serial++,species:'chicken',remaining:12},{id:batch.serial++,species:'rabbit',remaining:8},{id:batch.serial++,species:'venison',remaining:18}];advance(batch,50);
 assert.deepEqual(batch.loot.map(l=>l.kind),['cookedMeat','cookedRabbit','cookedVenison']);
 assert.deepEqual(batch.loot.map(l=>l.flight.born),[12,20,38]);assert.equal(batch.camp.hearth.fuel,50);assert(batch.loot.every(l=>l.flight.lands<m.timeOf(batch)));
 const saved=JSON.parse(JSON.stringify(batch));advance(saved,10);assert.equal(saved.loot.length,3,'Save/reload never duplicates completed portions');

 const landings=new Set();
 for(let i=0;i<16;i++){Math.random=()=>i/16;const q=m.cookedFoodLanding(make());assert(q);assert(!m.worldBlocked(w,q.x,q.y,22));landings.add(Math.round(q.x)+','+Math.round(q.y))}
 Math.random=random;assert(landings.size>=8,'Random directions produce a spread of safe landing positions');

 const old=make();old.fire.rack=['chicken','rabbit','venison'];m.stepKitchen(old);assert.equal(old.fire.rack.length,0);assert.equal(old.loot.length,3);m.stepKitchen(old);assert.equal(old.loot.length,3,'Old rack meals migrate once');
 // If the editor leaves no walkable ground nearby, retain the finished job.
 const blocked=make(),hearth={...blocked.camp.hearth};blocked.camp.hearth.x=-1e8;blocked.camp.hearth.y=-1e8;blocked.fire.queue=[{id:blocked.serial++,species:'rabbit',remaining:8}];advance(blocked,8);assert.equal(blocked.loot.length,0);assert.equal(blocked.fire.queue[0].remaining,0);
 Object.assign(blocked.camp.hearth,hearth,{fuel:0});m.stepKitchen(blocked);assert.equal(blocked.fire.queue.length,0);assert.equal(blocked.loot.length,1,'A completed job retries safely even after the fuel runs out');
 console.log('PASS: authored camp walkability, random directions, hop rendering, no table, landing-gated pickup, all meats, catch-up timing, reload safety, legacy meals and blocked-ground retry.');
}finally{Math.random=random;fs.rmSync(temp,{recursive:true,force:true})}

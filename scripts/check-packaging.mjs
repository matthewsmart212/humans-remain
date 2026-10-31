import fs from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
const code=ts.transpileModule(fs.readFileSync(new URL('../src/packaging-engine.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const e=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
assert(e.circleRect(20,0,12,0,0,10,10));assert(!e.circleRect(40,0,12,0,0,10,10));
let w=e.createWorld();for(let i=0;i<60;i++)e.stepWorld(w,{x:1,y:1});assert(Math.abs(Math.hypot(w.x-450,w.y-1000)-260)<2||w.y===1100);
w=e.createWorld();w.boxes.push({id:100,x:w.x,y:w.y,vx:0,vy:0,age:2,spin:0,angle:0,kind:0});e.stepWorld(w,{x:0,y:0});assert(w.dead,'overlapping active parcel must end the run');
const frozen=w.tick;e.stepWorld(w,{x:1,y:0});assert.equal(w.tick,frozen,'dead world must not advance');
w.tick=600;w.samples=[[.1,450,1000,'up'],[10,450,1000,'up']];const result=e.finishRun(w);assert(result.newBest);assert.equal(e.readProgress().best,result.time);assert(e.ghostAt(e.readProgress().ghost,1));assert.equal(e.ghostAt(e.readProgress().ghost,result.time+1),null);
assert(!e.hazards(8.5).pressActive);assert(e.hazards(9.5).pressActive);assert(!e.hazards(10.1).pressActive);
assert(e.hazards(15.5).swingActive);assert.equal(e.segmentDistance(5,2,0,0,10,0),2);
const a=e.createWorld(),b=e.createWorld();for(let i=0;i<3000;i++){const input={x:Math.sin(i*.01),y:Math.cos(i*.013)};e.stepWorld(a,input);e.stepWorld(b,input)}assert.deepEqual(a,b,'same inputs must replay identically');
w=e.createWorld();w.x=200;w.y=600;for(let i=0;i<25;i++)e.stepWorld(w,{x:1,y:0});assert(w.x<=205,'crate blocks movement');
console.log('Packaging checks passed: collisions, death freeze, best/ghost storage, hazard phases, deterministic replay, crate blocking.');

// Completing an order once must not credit it again while standing in the bay.
w=e.createWorld();w.x=e.pickupOf(w).x;w.y=e.pickupOf(w).y;e.stepWorld(w,{x:0,y:0});assert(w.carrying);
w.x=e.bayOf(w).x;w.y=e.bayOf(w).y;for(let i=0;i<20;i++)e.stepWorld(w,{x:0,y:0});assert.equal(w.deliveries,1);assert.equal(w.bonus,100);assert(!w.carrying);
for(let i=0;i<20;i++)e.stepWorld(w,{x:0,y:0});assert.equal(w.deliveries,1);
w.x=e.pickupOf(w).x;w.y=e.pickupOf(w).y;e.stepWorld(w,{x:0,y:0});w.x=e.bayOf(w).x;w.y=e.bayOf(w).y;for(let i=0;i<20;i++)e.stepWorld(w,{x:0,y:0});assert.equal(w.bonus,300);assert.equal(w.combo,2);
// Missed orders reset streaks without killing the player.
w.orderDeadline=e.timeOf(w);e.stepWorld(w,{x:0,y:0});assert.equal(w.combo,0);assert(!w.dead);assert(!w.carrying);
w=e.createWorld();w.coin={x:w.x,y:w.y,until:5};e.stepWorld(w,{x:0,y:0});assert.equal(w.coins,1);assert.equal(w.bonus,25);e.stepWorld(w,{x:0,y:0});assert.equal(w.coins,1);
w.coin={x:700,y:900,until:0};e.stepWorld(w,{x:0,y:0});assert.equal(w.coin,null);
// Targeted drop is telegraphed, avoidable by moving, lethal if ignored.
w=e.createWorld();w.tick=780;w.still=4;w.nextBox=Infinity;e.stepWorld(w,{x:0,y:0});assert(w.drop);assert(!w.dead);
const escaped=structuredClone(w);for(let i=0;i<130;i++)e.stepWorld(escaped,{x:1,y:0});assert(!escaped.dead);
for(let i=0;i<130;i++)e.stepWorld(w,{x:0,y:0});assert(w.dead);assert.equal(w.cause,'SPECIAL DELIVERY');
// Score and wages include work, with an independent best score.
w=e.createWorld();w.tick=600;w.deliveries=2;w.coins=1;w.bonus=325;const paid=e.finishRun(w);assert.equal(paid.score,425);assert.equal(paid.reward,26);assert.equal(e.readProgress().bestScore,425);
console.log('Delivery checks passed: automatic collection, matching bay, streak, no duplicate rewards, expiry, coins, avoidable overhead hazard and score persistence.');
// A real movement route (no teleporting) can complete the first two orders.
w=e.createWorld();
function walkTo(x,y){for(let i=0;i<600&&Math.hypot(w.x-x,w.y-y)>12&&!w.dead;i++){const dx=x-w.x,dy=y-w.y,m=Math.hypot(dx,dy);e.stepWorld(w,{x:dx/m,y:dy/m})}assert(!w.dead,`route died at ${e.timeOf(w)}: ${w.cause}`);assert(Math.hypot(w.x-x,w.y-y)<13,'waypoint reachable')}
walkTo(205,790);assert(w.carrying);walkTo(450,790);walkTo(450,300);for(let i=0;i<20;i++)e.stepWorld(w,{x:0,y:0});assert.equal(w.deliveries,1);
walkTo(735,400);assert(w.carrying);walkTo(490,620);for(let i=0;i<20;i++)e.stepWorld(w,{x:0,y:0});assert.equal(w.deliveries,2);assert(!w.dead);
console.log('Playable route passed: two deliveries through normal movement with live parcels and hazards.');

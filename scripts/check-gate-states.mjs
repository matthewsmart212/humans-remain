import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'gate-states-'));
try{
 await build({stdin:{contents:`export * from './src/world-assets';export * from './src/world-layout';export * from './src/camp-gates';export * from './src/studio-play';export * from './src/survival-engine';export * from './src/camp-gate-renderer';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:temp+'/test.mjs'});
 const m=await import(pathToFileURL(temp+'/test.mjs')),plan=JSON.parse(fs.readFileSync('src/camp-perimeter-layout.json')),gates=plan.placements.filter(p=>m.ASSET_BY_ID.get(p.assetId)?.gate);
 let contact=0,queued=0,transforms=0;
 for(const original of gates)for(const rotation of [0,35,90,215])for(const flipX of [false,true]){
  const p={...original,x:1700,y:1700,rotation,flipX},a=m.ASSET_BY_ID.get(p.assetId),[A,B]=m.gateColliders(p,0),dx=B.x-A.x,dy=B.y-A.y,len=Math.hypot(dx,dy),n={x:-dy/len,y:dx/len},center={x:(A.x+B.x)/2,y:(A.y+B.y)/2};
  for(const side of [-1,1]){
   const w=m.createCampPlaySession({...m.emptyLayout(),items:[p]},{x:center.x+n.x*37*side,y:center.y+n.y*37*side});
   assert.equal(m.nearbyGate(w)?.id,p.id);assert(m.toggleGate(w,p.id));assert.equal(m.gateAmount(w,p.id),1);assert.equal(m.gateActionLabel(w,p.id),'Close gate');contact++;
   Object.assign(w.player,center);assert(m.toggleGate(w,p.id));assert.equal(m.gateActionLabel(w,p.id),'Cancel close');
   for(let j=0;j<90;j++){m.stepGates(w,1/60);assert.equal(m.gateAmount(w,p.id),1);assert(!m.gatesBlocked(w,w.player.x,w.player.y,20));}
   // Repeated tap cancels pending closure, not a second invisible sweep.
   assert(m.toggleGate(w,p.id));assert.equal(m.gateActionLabel(w,p.id),'Close gate');assert(m.toggleGate(w,p.id));
   Object.assign(w.player,{x:center.x+n.x*500*side,y:center.y+n.y*500*side});assert.equal(m.nearbyGate(w),null);
   for(let j=0;j<30;j++)m.stepGates(w,1/60);assert.equal(m.gateAmount(w,p.id),0,'closes after leaving range without another tap');assert(m.gatesBlocked(w,center.x,center.y,20));queued++;
   for(const d of [200,250]){Object.assign(w.player,{x:center.x+n.x*d*side,y:center.y+n.y*d*side});assert.equal(m.nearbyGate(w)?.id,p.id,'same generous reach on both sides');}
   // Pending closure waits for all living actors, not just the player.
   assert(m.toggleGate(w,p.id));w.animals.push({x:center.x,y:center.y,hp:1});assert(m.toggleGate(w,p.id));for(let j=0;j<30;j++)m.stepGates(w,1/60);assert.equal(m.gateAmount(w,p.id),1);w.animals=[];for(let j=0;j<30;j++)m.stepGates(w,1/60);assert.equal(m.gateAmount(w,p.id),0);
  }
  assert(a.gate.states);const urls=m.requiredImages([a.id]);assert(Object.values(urls).includes(a.gate.states.open));assert(Object.values(urls).includes(a.gate.states.closed));
  for(const url of [a.gate.states.closed,a.gate.states.open])assert(fs.existsSync('public'+url));
  const w=m.createWorld({...m.emptyLayout(),items:[p]}),calls=[],ctx={drawImage:(...args)=>calls.push(args)},imgs={[m.assetImageKey(a.gate.states.closed)]:{state:'closed'},[m.assetImageKey(a.gate.states.open)]:{state:'open'}};
  m.gateDrawables(ctx,imgs,w,p,a).forEach(d=>d.draw());w.gateMotions={[p.id]:{amount:1,target:1}};m.gateDrawables(ctx,imgs,w,p,a).forEach(d=>d.draw());assert.equal(calls.length,2);assert.equal(calls[0][0].state,'closed');assert.equal(calls[1][0].state,'open');assert.deepEqual(calls[0].slice(1),calls[1].slice(1),'identical frame registration; ordinary image draw only');transforms++;
 }
 console.log(JSON.stringify({result:'pass',gates:gates.length,contact,queued,transforms,independentArtwork:12,checks:['contact opening','queued safe closing','cancel close','close beyond interaction range','both-side reach','animal obstruction','rotation/mirroring','static artwork registration']}));
}finally{fs.rmSync(temp,{recursive:true,force:true})}

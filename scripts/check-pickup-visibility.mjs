import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'pickup-cues-'));
try{
 await build({stdin:{contents:`export * from './src/pickup-visibility';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/world-assets';export * from './src/player-presentation';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=require(path.join(temp,'model.cjs')),w=m.createWorld({...m.emptyLayout(),spawn:{x:1500,y:1500}});
 const view={x:1400,y:1400,width:700,height:300,scale:.47};
 w.loot=['rawMeat','cookedMeat','pallets','scrap','fuel'].map((kind,i)=>({id:i,x:1560+i*35,y:1520,kind,amount:1,...(kind==='pallets'?{appearance:'logs'}:{})}));
 const before=JSON.stringify(w);assert.equal(m.visiblePickupCues(w,view).length,5,'All supply types receive cues');assert.equal(JSON.stringify(w),before,'Presentation does not mutate world');
 w.loot.push({id:9,x:1600,y:1520,kind:'rawMeat',amount:0},{id:10,x:1600,y:1520,kind:'rawMeat',amount:1,flight:{from:w.player,born:0,lands:2}},{id:11,x:2500,y:1520,kind:'rawMeat',amount:1});
 assert.equal(m.visiblePickupCues(w,view).length,5,'Empty, flying and distant drops excluded');
 assert.equal(m.visiblePickupCues(w,{...view,x:0}).length,0,'Offscreen cues culled');
 const first=w.loot.shift();assert(!m.visiblePickupCues(w,view).includes(first),'Collected drop disappears immediately');
 w.loot=Array.from({length:80},(_,i)=>({id:i,x:1560+i,y:1520,kind:'rawMeat',amount:1}));assert.equal(m.visiblePickupCues(w,view).length,24,'Dense drops have bounded cue work');
 const asset=[...m.ASSET_BY_ID.values()].find(a=>a.solid&&!a.foliage&&!a.gate&&a.role==='prop');assert(asset);
 const p=m.newPlacement(asset.id,1540,1540);p.footprint={width:12,depth:120};p.collision=undefined;
 w.layout={...w.layout,items:[p]};w.tick+=6;w.loot=[{id:200,x:1600,y:1500,kind:'rawMeat',amount:1}];
 assert(!m.lineClear(w.player,w.loot[0],w),'Fixture wall blocks line of sight');assert.equal(m.visiblePickupCues(w,view).length,0,'No marker through solid blockers');
 w.layout={...w.layout,items:[]};w.tick+=6;assert.equal(m.visiblePickupCues(w,view).length,1);
 // A rendering copy shares the same cache. Repeated draws do not query walls again.
 let checks=0;const original=w.loot[0];const loot=new Proxy(original,{get(t,k){if(k==='placementId')checks++;return t[k]}});w.loot=[loot];w.layout={...w.layout,items:[{...p,solid:false}]};w.tick+=6;
 m.visiblePickupCues(w,view);const count=checks;assert(count>0);m.visiblePickupCues({...w,player:{...w.player}},view);assert.equal(checks,count,'Interpolated frame reuses visibility checks');
 const calls=[];const ctx=new Proxy({save(){},restore(){}},{get(t,k){return t[k]||((...args)=>calls.push([k,...args]))},set(t,k,v){t[k]=v;return true}});
 const target={...w.loot[0],id:`pickup:${w.loot[0].id}`,pickupId:w.loot[0].id,label:'Raw chicken'};
 for(const time of [0,.2,1.5,4.9]){
  calls.length=0;m.drawPickupGlints(ctx,w.loot,.47,time,target);
  assert(!calls.some(c=>['fillText','drawImage','ellipse','arc'].includes(c[0])),'Loose items have glints, never floating badges or rings');
  assert(calls.filter(c=>c[0]==='fill').length<=2,'At most two glints at once');
 }
 calls.length=0;m.drawPickupGlints(ctx,w.loot,.47,0,target,true);const reduced=JSON.stringify(calls);calls.length=0;m.drawPickupGlints(ctx,w.loot,.47,5,target,true);assert.equal(JSON.stringify(calls),reduced,'Reduced-motion hints stay still');
 console.log('PASS: supply types, landed-only, camera/range culling, collection, 24-item budget, wall occlusion, shared frame cache, bounded label-free glints, stable reduced motion, no world mutation');
}finally{fs.rmSync(temp,{recursive:true,force:true})}

import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {build} from 'esbuild';import {pathToFileURL} from 'node:url';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'roof-order-'));
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/world-layout';export * from './src/survival-engine';export * from './src/placed-world-renderer';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'test.mjs')});
 const m=await import(pathToFileURL(path.join(temp,'test.mjs')));
 const h=m.ASSET_BY_ID.get('base_shelter_t1');assert(h.roof&&h.interior);
 const layout=m.emptyLayout(),hq={...m.newPlacement(h.id,1800,1000),roof:'auto',layer:-4,locked:true};
 const chest={...m.newPlacement('art_hq_storage_chest',1800,900),layer:8,locked:true};layout.items=[hq,chest];
 const images=Object.fromEntries(Object.entries(m.requiredImages([h.id,chest.assetId])).map(([key,url])=>[key,{url}]));
 const w=m.createWorld(layout),events=[],stack=[];
 const state={globalAlpha:1,save(){stack.push(this.globalAlpha)},restore(){this.globalAlpha=stack.pop()},drawImage(im){events.push({url:im.url,alpha:this.globalAlpha})}};
 const ctx=new Proxy(state,{get:(o,k)=>k in o?o[k]:()=>{}});
 function draw(editor,inside){
  const i=h.interior,[x,y]=m.placementPoint(hq,hq.x+(i.x+i.width/2)*hq.scale,hq.y+(i.y+i.height/2)*hq.scale);
  Object.assign(w.player,inside?{x,y}:{x:100,y:3000});events.length=0;
  const list=m.placedDrawables(ctx,images,w,editor);list.push({layer:0,y:w.player.y,draw:()=>events.push({url:'player',alpha:1})});
  list.sort(m.compareWorldDrawables).forEach(d=>d.draw());return events.filter(e=>e.url===h.roof);
 }
 for(const editor of [true,false])for(const layer of [-50,-4,0,10])for(const furnitureLayer of [-20,0,8,100])for(const rotation of [0,37]){
  Object.assign(hq,{layer,rotation,flipX:rotation!==0});chest.layer=furnitureLayer;const saved=JSON.stringify(layout);
  assert.equal(draw(editor,false)[0].alpha,1);assert.equal(events.at(-1).url,h.roof,'opaque roof must cover furniture and player despite editable layers');
  assert.equal(draw(editor,true)[0].alpha,.08,'interior remains visible when entering');assert.equal(events.at(-1).url,h.roof);
  assert.equal(JSON.stringify(layout),saved,'rendering must not change saved placements');
 }
 hq.roof='hidden';assert.equal(draw(true,false).length,0);
 hq.roof='shown';assert.equal(draw(true,true)[0].alpha,1);
 hq.roof='auto';hq.allowTransparency=false;assert.equal(draw(false,true)[0].alpha,1);
 const ordinary=[{layer:2,y:0},{layer:-4,y:900},{layer:0,y:3},{layer:0,y:1}];ordinary.sort(m.compareWorldDrawables);assert.deepEqual(ordinary.map(p=>[p.layer,p.y]),[[-4,900],[0,1],[0,3],[2,0]],'ordinary layer and depth ordering is unchanged');
 console.log('PASS: roofs cover higher-layer furniture in editor and game; entry/exit transparency, hidden/shown modes, transformed buildings, locked placements and normal layer sorting.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}

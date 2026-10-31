import {build} from 'esbuild';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';import {createRequire} from 'node:module';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),sharp=require('sharp'),{createCanvas}=require('@napi-rs/canvas'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'wall-ground-check-'));
try{
 await build({stdin:{contents:`export * from './src/world-assets';export * from './src/world-layout';export * from './src/world-tiers';export * from './src/imported-art';export * from './src/placed-world-renderer';export * from './src/survival-renderer';export * from './src/survival-engine';export * from './src/survivor-art';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',outfile:path.join(temp,'test.mjs')});
 const m=await import(pathToFileURL(path.join(temp,'test.mjs'))),manifest=JSON.parse(fs.readFileSync('src/wall-artwork-replacements.json'));
 const records=process.argv[2]?JSON.parse(fs.readFileSync(process.argv[2])).records:manifest.map((v,i)=>({id:v.entryId,revision:1,updatedAt:'2026-01-01T00:00:00.000Z',customAsset:{id:v.entryId,name:`Base wall ${i+1}`,createdAt:'2026-01-01T00:00:00.000Z'},config:{kind:'sprite',base:{id:v.sourceId,url:v.url,name:'wall.webp',mime:'image/webp',width:v.width,height:v.height,bytes:v.bytes},frames:[],fps:8,worldWidth:v.width/2,anchor:[.5,.94],solid:true,footprint:{width:.6,depth:.2}}}));
 m.installImportedArt(records);let decodedPixels=0,totalBytes=0,checked=0;
 const ids=manifest.flatMap(v=>[1,2,3].map(t=>m.wallAssetId(v.entryId,t))),urls=m.requiredImages(ids);
 assert.equal(Object.values(urls).filter(u=>u.includes('/wall-ground-v1/')).length,8,'three tiers share eight images, not 24 decoded textures');
 for(const [i,v]of manifest.entries()){
  const base=m.ASSET_BY_ID.get(v.entryId),g=base.ground,meta=await sharp('public'+g.image).metadata();assert(meta.hasAlpha);assert.deepEqual([meta.width,meta.height],g.size);assert.deepEqual(m.imageDimensions[g.image],g.size);
  const {data,info}=await sharp('public'+g.image).ensureAlpha().raw().toBuffer({resolveWithObject:true});let opaque=0,feather=0;
  for(let p=3;p<data.length;p+=4){opaque+=data[p]===255?1:0;feather+=data[p]>0&&data[p]<255?1:0}
  assert(opaque>1000&&feather>1000,'real soil plus feathered edges');
  for(let x=0;x<info.width;x++)assert(data[x*4+3]===0&&data[((info.height-1)*info.width+x)*4+3]===0,'no top/bottom clipping');
  for(let y=0;y<info.height;y++)assert(data[(y*info.width)*4+3]===0&&data[(y*info.width+info.width-1)*4+3]===0,'no side clipping');
  decodedPixels+=meta.width*meta.height;totalBytes+=fs.statSync('public'+g.image).size;
  for(const flipX of [false,true])for(const flipY of [false,true]){
   const p={...m.newPlacement(v.entryId,1450,1700),scale:1.87,rotation:37,flipX,flipY,locked:true,layer:-10000},layout={...m.emptyLayout(),items:[p]},original=JSON.stringify(layout),canvas=createCanvas(2,2),real=canvas.getContext('2d'),calls=[];
   const ctx=new Proxy(real,{get(o,k){if(k==='drawImage')return(image,...rect)=>calls.push({image,rect,matrix:o.getTransform()});const value=o[k];return typeof value==='function'?value.bind(o):value}});
   let first;
   for(const tier of [1,2,3,1]){
    const next=m.changePlacementTier(layout,p.id,tier),q=next.items[0],a=m.ASSET_BY_ID.get(q.assetId),b=m.placementBounds(q);assert.deepEqual(a.ground,g,'no ground movement on tier switch');
    calls.length=0;m.drawPlacedGround(ctx,{[m.assetImageKey(g.image)]:g.image},next);assert.equal(calls.length,1);const call=calls[0];first??=call;assert.deepEqual(call,first,'same transformed ground destination across tiers');
    const [x,y,w,h]=call.rect,mat=call.matrix;
    for(const [sx,sy]of [[x,y],[x+w,y],[x,y+h],[x+w,y+h]]){const expected=m.placementPoint(q,sx,sy),actual=[mat.a*sx+mat.c*sy+mat.e,mat.b*sx+mat.d*sy+mat.f];for(let axis=0;axis<2;axis++)assert(Math.abs(actual[axis]-expected[axis])<.001,`ground uses wall transform (Canvas float precision): ${actual[axis]} vs ${expected[axis]}`)}
    assert.deepEqual(m.placementBounds(q),m.placementBounds(p));assert.deepEqual(m.placementBodies(q),m.placementBodies(p));checked++;
   }
   assert.equal(JSON.stringify(layout),original,'drawing never mutates saved objects');calls.length=0;m.drawPlacedGround(ctx,{},layout);assert.equal(calls.length,0,'a missing image safely skips until loaded');
  }
 }
 assert(decodedPixels<4_000_000,'trimmed ground textures stay below 16 MB decoded');assert(totalBytes<1_000_000,'small mobile download');
 const layout=process.argv[3]?JSON.parse(fs.readFileSync(process.argv[3])).draft:{...m.emptyLayout(),items:manifest.map((v,i)=>({...m.newPlacement(v.entryId,500+i*350,1600),layer:i-6}))};
 const images={homeGround:'terrain',...Object.fromEntries(Object.entries(m.requiredImages(layout.items.map(p=>p.assetId))).map(([k,v])=>[k,v]))};for(const a of Object.values(m.SURVIVOR_ART))images[a.idle.sheet]='player';
 for(const renderer of ['editor','game']){
  const drawn=[],ctx=new Proxy({canvas:{width:1200,height:700},globalAlpha:1,drawImage(image){drawn.push(image)},measureText(){return{width:60}},createRadialGradient(){return{addColorStop(){}}},createLinearGradient(){return{addColorStop(){}}}},{get:(o,k)=>k in o?o[k]:(()=>{})});
  const w=m.createWorld(layout);w.player.x=1700;w.player.y=1700;w.phase='day';
  if(renderer==='editor')m.drawWorldEditor(ctx,{frames:{}},images,w,{x:1700,y:1700,zoom:1,follow:false,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false});
  else m.drawSurvival(ctx,{frames:{}},images,w,()=>{throw Error('day scene does not need a light surface')},true);
  const wallCount=layout.items.filter(p=>m.wallIdentity(p.assetId)).length,grounds=drawn.map((url,index)=>({url,index})).filter(v=>v.url?.includes('/wall-ground-v1/'));
  assert.equal(grounds.length,wallCount,`${renderer}: one ground bed per placed wall`);assert.equal(drawn[0],'terrain');assert(drawn.includes('player'));
  const lastGround=Math.max(...grounds.map(v=>v.index));assert(lastGround<drawn.indexOf('player'),`${renderer}: player is always above soil`);
  for(const p of layout.items){const image=m.ASSET_BY_ID.get(p.assetId).image,index=drawn.indexOf(image);if(index>=0)assert(index>lastGround,`${renderer}: every wall/building layer stays above ground`)}
 }
 console.log(`PASS: 24 wall variants; ${checked} transformed ground draws; fixed tier geometry; editor/game draw order including negative layers and player; missing-image fallback; ${totalBytes} bytes, ${(decodedPixels*4/1048576).toFixed(1)} MB decoded.`);
}finally{fs.rmSync(temp,{recursive:true,force:true})}

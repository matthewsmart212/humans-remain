import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),sharp=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tree-check-')),out=process.argv[2]||'docs/qa/trees-v1';fs.mkdirSync(out,{recursive:true});
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/world-layout';export * from './src/survival-engine';export * from './src/tree-chopping';export * from './src/studio-play';export * from './src/placed-world-renderer';export * from './src/skia-web';export * from './src/asset-library-policy';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(tmp,'model.cjs')});
 const m=require(path.join(tmp,'model.cjs')),arts=[...m.TREE_ART.values()];
 assert.equal(arts.length,18);assert.equal(m.libraryAssets(m.WORLD_ASSETS).filter(a=>m.TREE_ART.has(a.id)).length,arts.length);
 let bytes=0,cases=0;
 const make=(art)=>{const p={...m.newPlacement(art.id,900,1000),id:'tree'},layout={...m.emptyLayout(),spawn:{x:900,y:1100},items:[p]};return{p,layout,w:m.createCampPlaySession(layout)}};
 const swing=(w,angle=-Math.PI/2)=>{w.axeSwing={started:w.tick/60,angle,cut:1,resolved:false,queued:false};w.tick+=15;m.stepAxe(w);w.tick++;m.stepAxe(w)};
 for(const art of arts){
  const file='public'+art.image,meta=await sharp(file).metadata();assert(meta.hasAlpha);assert.deepEqual([meta.width,meta.height],art.size);bytes+=fs.statSync(file).size;
  for(const f of art.frames){assert(f.crop[0]+f.crop[2]<=meta.width&&f.crop[1]+f.crop[3]<=meta.height);assert(f.anchor.every(Number.isFinite))}
  const {p,layout,w}=make(art),original=JSON.stringify(layout);assert(m.layoutBlocked(layout,p.x,p.y,3));assert(!m.layoutBlocked(layout,p.x+100,p.y-100,3));
  w.axeSwing={started:0,angle:-Math.PI/2,cut:1,resolved:false,queued:false};w.tick=15;m.stepAxe(w);assert.equal(w.treeChops,undefined,'No early contact');w.tick=16;m.stepAxe(w);assert.equal(w.treeChops.tree.hp,art.hp-40);w.tick++;m.stepAxe(w);assert.equal(w.treeChops.tree.hp,art.hp-40,'One hit per swing');
  while(w.treeChops.tree.hp>0){w.tick+=60;swing(w)}assert.equal(w.treeChops.tree.hp,0);const fell=w.treeChops.tree.felledAt;w.tick+=60;swing(w);assert.equal(w.treeChops.tree.felledAt,fell,'Stump cannot be damaged again');assert.equal(JSON.stringify(layout),original);assert.equal(m.createCampPlaySession(layout).treeChops,undefined);
  for(const angle of [0,Math.PI/2,Math.PI]){const {w}=make(art);swing(w,angle);assert.equal(w.treeChops,undefined,'Facing away misses');cases++}
  {const {w}=make(art);w.player.y=1200;swing(w);assert.equal(w.treeChops,undefined,'Out of reach misses')}
  {const {w}=make(art);assert.equal(m.chopTree(w,-Math.PI/2,136,1,40,()=>false),false,'Occluded target misses')}
  {const {w}=make(art);w.layout={...w.layout,items:[...w.layout.items,{...m.newPlacement('art_rock_moss_capped_boulder',900,1065),id:'blocker'}]};swing(w);assert.equal(w.treeChops,undefined,'Real trunk collision blocks axe reach')}
  {const {w}=make(art);w.combatTest=false;swing(w);assert.equal(w.treeChops.tree.hp,art.hp-40,'Walk preview can chop')}
  for(const rotation of [0,90,180,270])for(const flipX of [false,true])for(const scale of [.5,1,2]){
   const {p,w}=make(art);Object.assign(p,{rotation,flipX,scale});w.layout={...w.layout,items:[p]};const root=m.treeRoot(p);w.player.x=root.x;w.player.y=root.y+110;
   assert(m.chopTree(w,-Math.PI/2,136,1,40,(a,b)=>m.lineClear(a,b,w)),`Transformed root ${rotation}/${flipX}/${scale}`);cases++;
  }
  const draws=[],ctx={globalAlpha:1,save(){},restore(){},translate(){},rotate(){},drawImage(...args){draws.push(args)}};
  const clean=make(art);m.drawTree(ctx,{},clean.w,clean.p);assert.deepEqual(draws[0].slice(1,5),art.frames[0].crop);draws.length=0;
  if(art.damageRect){const [x,y,cw,ch]=art.damageRect,[,,hw,hh]=art.frames[0].crop;assert(x>=0&&y>=0&&x+cw<=hw&&y+ch<=hh);assert.deepEqual(art.frames[1].anchor,[art.frames[0].anchor[0]-x,art.frames[0].anchor[1]-y]);assert.deepEqual(art.frames[1].crop.slice(2),[cw,ch]);clean.w.treeChops={tree:{hp:art.hp-40,hitAt:0,direction:1}};clean.w.tick=120;m.drawTree(ctx,{},clean.w,clean.p);assert.equal(draws.length,5);assert.equal(draws.reduce((n,d)=>n+d[3]*d[4],0),hw*hh,'Footprint drawn once');assert.deepEqual(draws[4].slice(1,5),art.frames[1].crop);draws.length=0;}
  clean.w.treeChops={tree:{hp:0,hitAt:0,felledAt:0,direction:1}};clean.w.tick=120;m.drawTree(ctx,{},clean.w,clean.p);assert.equal(draws.length,1);assert.deepEqual(draws[0].slice(1,5),art.frames[2].crop);
  draws.length=0;clean.w.tick=0;clean.w.weather={reducedMotion:true};m.drawTree(ctx,{},clean.w,clean.p);assert.equal(draws.length,1,'Reduced motion skips the fall');
 }
 assert(bytes<12000000,'Keep transfer budget bounded');
 assert.equal(Object.keys(m.requiredImages(Array.from({length:1000},(_,i)=>arts[i%arts.length].id))).length,arts.length+1,'Instances and stages share one image per design plus one shared log sprite');
 // Render all stages using the actual production CanvasKit adapter.
 globalThis.window={};process.type='renderer';globalThis.devicePixelRatio=1;delete globalThis.createImageBitmap;
 const originalFetch=globalThis.fetch;globalThis.fetch=async url=>String(url).startsWith('blob:')?originalFetch(url):new Response(fs.readFileSync(path.resolve('public'+String(url))));
 const captures=[];
 for(const species of ['oak','pine','birch','deadwood','rowan','willow']){
  const family=arts.filter(a=>a.id==='art_tree_'+species||a.id.startsWith('art_tree_'+species+'_'));assert.equal(family.length,3);
  const sheetHeight=1060,canvas={width:0,height:0,clientWidth:1200,clientHeight:sheetHeight,dataset:{}},w=m.createWorld(m.emptyLayout());w.tick=120;w.player.x=-10000;w.treeChops={};w.layout.items=[];
  for(let row=0;row<family.length;row++)for(let stage=0;stage<3;stage++){const p={...m.newPlacement(family[row].id,200+stage*400,330+row*350),id:`${row}-${stage}`,scale:.56,allowTransparency:false};w.layout.items.push(p);if(stage)w.treeChops[p.id]={hp:stage===1?40:0,hitAt:0,direction:1,...(stage===2?{felledAt:0}:{})}}
  let surface;
  const renderer=await m.createWebWorld(canvas,(ctx,_atlas,imgs,world)=>{ctx.fillStyle='#8e7147';ctx.fillRect(0,0,1200,sheetHeight);for(const d of m.placedDrawables(ctx,imgs,world,true))d.draw()},{},{sources:m.requiredImages(family.map(a=>a.id)),streamRoads:false,streamRivers:false});
  globalThis.CanvasKit.MakeSWCanvasSurface=c=>(surface=globalThis.CanvasKit.MakeSurface(c.width,c.height));renderer.draw(w);
  const image=surface.makeImageSnapshot();await sharp(Buffer.from(image.encodeToBytes())).webp({quality:96}).toFile(out+'/'+species+'-states.webp');image.delete();renderer.dispose();captures.push(species+'-states.webp');
 }
 globalThis.fetch=originalFetch;
 const report={result:'pass',species:6,designs:arts.length,stages:arts.length*3,captures,transformAndArcCases:cases,sharedTextures:arts.length,compressedBytes:bytes,maxDecodedMiB:arts.reduce((n,a)=>n+a.size[0]*a.size[1]*4,0)/1048576,checks:['contact timing','single damage per swing','health and stump','reach and facing','occlusion callback','rotated/mirrored/scaled roots','Walk and Play','draft unchanged','restart reset','library visibility','shared images','CanvasKit raster output'],limits:'No physical device or browser GPU playtest. Log pickup uses the wood supply slot; no timed regrowth.'};fs.writeFileSync(out+'/checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(tmp,{recursive:true,force:true})}

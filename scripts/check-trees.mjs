import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),sharp=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tree-check-')),out=process.argv[2]||'docs/qa/trees-v1';fs.mkdirSync(out,{recursive:true});
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/world-layout';export * from './src/survival-engine';export * from './src/tree-chopping';export * from './src/tree-shade';export * from './src/studio-play';export * from './src/placed-world-renderer';export * from './src/skia-web';export * from './src/asset-library-policy';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(tmp,'model.cjs')});
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
  const draws=[],clips=[],turns=[],ctx={
   globalAlpha:1,stack:[],save(){this.stack.push(this.globalAlpha)},restore(){this.globalAlpha=this.stack.pop()},translate(){},rotate(angle){turns.push(angle)},scale(){},fillRect(){},stroke(){},fill(){},
   beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){clips.push(true)},
   createRadialGradient(){return{addColorStop(){}}},
   drawImage(...args){draws.push(args)}
  };
  const clean=make(art);m.drawTree(ctx,{},clean.w,clean.p);assert.deepEqual(draws[0].slice(1,5),art.frames[0].crop);assert.equal(clips.length,1,'Healthy sprite clips buried roots');draws.length=0;
  if(art.damageRect){const [x,y,cw,ch]=art.damageRect,[,,hw,hh]=art.frames[0].crop;assert(x>=0&&y>=0&&x+cw<=hw&&y+ch<=hh);assert.deepEqual(art.frames[1].anchor,[art.frames[0].anchor[0]-x,art.frames[0].anchor[1]-y]);assert.deepEqual(art.frames[1].crop.slice(2),[cw,ch]);clean.w.treeChops={tree:{hp:art.hp-40,hitAt:0,direction:1}};clean.w.tick=120;m.drawTree(ctx,{},clean.w,clean.p);assert.equal(draws.length,5);assert.equal(draws.reduce((n,d)=>n+d[3]*d[4],0),hw*hh,'Footprint drawn once');assert.deepEqual(draws[4].slice(1,5),art.frames[1].crop);draws.length=0;}
  clean.w.treeChops={tree:{hp:0,hitAt:0,felledAt:0,direction:1}};clean.w.tick=120;m.drawTree(ctx,{},clean.w,clean.p);assert.equal(draws.length,1);assert.deepEqual(draws[0].slice(1,5),art.frames[2].crop);
  draws.length=0;clean.w.tick=24;m.drawTree(ctx,{},clean.w,clean.p);
  assert.equal(draws.length,2,'Stump stays planted while the crown falls');
  assert(draws[1][4]<art.frames[0].anchor[1],'Falling crown excludes roots and stump');
  assert(turns.at(-1)>0,'The crown tips in the felling direction');
  draws.length=0;clean.w.tick=0;clean.w.weather={reducedMotion:true};m.drawTree(ctx,{},clean.w,clean.p);assert.equal(draws.length,1,'Reduced motion skips the fall');
  // Preserve the original placement across saved ticks, including a legacy
  // save with no explicit felling timestamp.
  delete clean.w.treeChops.tree.felledAt;
  for(const [tick,scale] of [[540,0],[720,.095],[900,.19],[1620,.315],[1800,.44],[2520,.585],[2700,.73],[3420,.865],[3600,1]]){
   clean.w.tick=tick;
   assert(Math.abs(m.treeGrowthScale(clean.w,clean.w.treeChops.tree)-scale)<1e-6);
   assert.equal(!!m.activeTreeChop(clean.w,'tree'),tick<3600);
   draws.length=0;m.drawTree(ctx,{},clean.w,clean.p);
   assert(draws.length>=1);
   const grown=draws.find(args=>args.slice(1,5).every((v,i)=>v===art.frames[0].crop[i]));
   assert.equal(!!grown,tick>17*60);
   if(grown)assert(Math.abs(grown[7]-m.placementBounds(clean.p).width*scale)<1e-6);
   if(tick<3600)assert.equal(m.chopTree(clean.w,-Math.PI/2,136,1,40,()=>true),false,'Growing tree cannot be chopped');
  }
  for(const second of [9,15,21,30,45,60]){
   const end=second*60;
   const before=m.treeGrowthScale({...clean.w,tick:end-1},clean.w.treeChops.tree);
   const after=m.treeGrowthScale({...clean.w,tick:end},clean.w.treeChops.tree);
   assert(after>=before&&after-before<.003,'Growth has no one-frame jumps');
  }
  assert.equal(m.chopTree(clean.w,-Math.PI/2,136,1,40,()=>true),true);
  assert.equal(clean.w.treeChops.tree.hp,art.hp-40,'Mature tree returns at full health');
  assert.equal(clean.w.loot.filter(l=>l.sourceTreeId==='tree').length,0);
  assert.equal(m.chopTree(clean.w,-Math.PI/2,136,1,999,()=>true),true);
  assert.equal(clean.w.loot.filter(l=>l.sourceTreeId==='tree').length,1,'A new felling drops logs once');
 }
 assert(bytes<12000000,'Keep transfer budget bounded');
 const sources=m.requiredImages(Array.from({length:1000},(_,i)=>arts[i%arts.length].id));
 assert.equal(sources.treeCanopyShade,m.TREE_SHADE_IMAGE);
 assert.equal(Object.keys(sources).length,arts.length+2,'Instances and stages share the crown shade and dropped log textures');
 const oak=arts.find(a=>a.id==='art_tree_oak'),shade=make(oak),sheet={},passes=[];
 const ink={globalAlpha:1,save(){},restore(){this.globalAlpha=1},drawImage(...rect){passes.push({alpha:this.globalAlpha,rect})}};
 const cast=()=>m.drawTreeShade(ink,sheet,shade.w,shade.p,m.treeShadeFrames.get(oak.image),1);
 shade.w.tick=60;cast();assert.equal(passes[0].alpha,1);
 shade.w.treeChops={tree:{hp:0,hitAt:1,felledAt:1,direction:1}};
 shade.w.tick=75;cast();assert(passes[1].alpha>0&&passes[1].alpha<1);
 shade.w.weather={reducedMotion:true};cast();assert.equal(passes.length,2,'Reduced motion switches directly to the stump');
 shade.w.tick=120;shade.w.weather.reducedMotion=false;cast();assert.equal(passes.length,2,'A felled crown leaves no cast shadow');
 // Render all stages using the actual production CanvasKit adapter.
 globalThis.window={};process.type='renderer';globalThis.devicePixelRatio=1;delete globalThis.createImageBitmap;
 const originalFetch=globalThis.fetch;globalThis.fetch=async url=>String(url).startsWith('blob:')?originalFetch(url):new Response(fs.readFileSync(path.resolve('public'+String(url))));
 const captures=[];
 for(const species of ['oak','pine','birch','deadwood','rowan','willow']){
  const family=arts.filter(a=>a.id==='art_tree_'+species||a.id.startsWith('art_tree_'+species+'_'));assert.equal(family.length,3);
  const sheetHeight=1060,times=[null,.38,2,12,21,36,60],width=times.length*250,canvas={width:0,height:0,clientWidth:width,clientHeight:sheetHeight,dataset:{}},w=m.createWorld(m.emptyLayout());w.tick=3600;w.player.x=-10000;w.treeChops={};w.layout.items=[];
  for(let row=0;row<family.length;row++)for(let stage=0;stage<times.length;stage++){const p={...m.newPlacement(family[row].id,125+stage*250,330+row*350),id:`${row}-${stage}`,scale:.56,allowTransparency:false};w.layout.items.push(p);if(stage){const chopAt=60-times[stage];w.treeChops[p.id]={hp:0,hitAt:chopAt,direction:1,felledAt:chopAt}}}
  let surface;
  const renderer=await m.createWebWorld(canvas,(ctx,_atlas,imgs,world)=>{ctx.fillStyle='#8e7147';ctx.fillRect(0,0,width,sheetHeight);for(const d of m.placedDrawables(ctx,imgs,world,true))d.draw()},{},{sources:m.requiredImages(family.map(a=>a.id)),streamRoads:false,streamRivers:false});
  globalThis.CanvasKit.MakeSWCanvasSurface=c=>(surface=globalThis.CanvasKit.MakeSurface(c.width,c.height));renderer.draw(w);
  const image=surface.makeImageSnapshot();await sharp(Buffer.from(image.encodeToBytes())).webp({quality:96}).toFile(out+'/'+species+'-states.webp');image.delete();renderer.dispose();captures.push(species+'-states.webp');
 }
 globalThis.fetch=originalFetch;
 const report={result:'pass',species:6,designs:arts.length,stages:arts.length*7,captures,transformAndArcCases:cases,sharedTextures:arts.length,compressedBytes:bytes,maxDecodedMiB:arts.reduce((n,a)=>n+a.size[0]*a.size[1]*4,0)/1048576,checks:['contact timing','single damage per swing','health and stump','continuous regrowth through 15/30/45/60 seconds','separate crown and stump','repeat harvest','root clipping','reach and facing','occlusion callback','rotated/mirrored/scaled roots','Walk and Play','draft unchanged','restart reset','library visibility','shared images','CanvasKit raster output'],limits:'No physical device or browser GPU playtest. Log pickup uses the wood supply slot.'};fs.writeFileSync(out+'/checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(tmp,{recursive:true,force:true})}

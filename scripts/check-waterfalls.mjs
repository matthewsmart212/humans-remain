import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),sharp=require('sharp');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'waterfalls-check-')),dir='docs/qa/waterfalls-v1';
const original={fetch:globalThis.fetch,window:globalThis.window,type:process.type};
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/skia-web';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/east-approach';export * from './src/river-art';export * from './src/waterfalls';export * from './src/editor-image-sources';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=require(path.join(temp,'model.cjs')),s=m.EAST_TERRAIN_SCALE;
 for(const k of Object.keys(m.WATERFALL_SECTION_IMAGES))assert(!m.EDITOR_ENTRY_IMAGES[k],'Waterfall assets must not block entry');
 delete globalThis.CanvasKit;globalThis.window={};process.type='renderer';globalThis.devicePixelRatio=1;
 globalThis.fetch=async url=>String(url).startsWith('blob:')?original.fetch(url):new Response(fs.readFileSync(path.resolve('public'+String(url))));
 let surface,clock=0,enabled=true,missing=false,previews=false,current=m.WATERFALL_SECTIONS[0],draws=0;
 let frame=current;
 const canvas={width:0,height:0,clientWidth:440,clientHeight:300,dataset:{}};
 const sources={...m.RIVER_DETAIL_IMAGES,...m.RIVER_PREVIEW_IMAGES,...m.RIVER_MOTION_IMAGES};
 const renderer=await m.createWebWorld(canvas,(ctx,atlas,imgs)=>{
  ctx.riverTime=0;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.scale(canvas.width/frame.width/s,canvas.height/frame.height/s);ctx.translate((600-frame.x)*s,(600-frame.y)*s);
  const visible=Object.fromEntries(Object.entries(imgs).filter(([k])=>
   (!k.startsWith('riverWaterfallMask_')||(enabled&&(!current||k===current.maskKey)))&&
   (!missing||k!=='riverWaterfallFrames')&&(!previews||!m.RIVER_DETAIL_IMAGES[k])));
  const draw=ctx.drawWaterfallSection;ctx.drawWaterfallSection=(a,b,c,d,t,sampling)=>{draws++;draw.call(ctx,a,b,c,d,t+clock,sampling)};
  m.drawRiverTerrain(ctx,visible,{x:(frame.x-600)*s,y:(frame.y-600)*s,width:frame.width*s,height:frame.height*s});ctx.drawWaterfallSection=draw;ctx.restore();
 },{},{sources,streamRoads:false,streamRivers:false});
 globalThis.CanvasKit.MakeSWCanvasSurface=c=>(surface=globalThis.CanvasKit.MakeSurface(c.width,c.height));
 const world=m.createWorld(m.emptyLayout());
 async function render(name){renderer.draw(world);const snapshot=surface.makeImageSnapshot(),bytes=Buffer.from(snapshot.encodeToBytes());snapshot.delete();if(name)await sharp(bytes).png().toFile(dir+'/'+name+'.png');return bytes}
 const raw=async b=>sharp(b).removeAlpha().raw().toBuffer();
 const results=[],contact=[],animation=[];
 for(const p of m.WATERFALL_SECTIONS){
  current=frame=p;const [width,height]=p.sampling.nativeSize;canvas.clientWidth=width*2;canvas.clientHeight=height*2;
  clock=0;enabled=false;const base=await render(p.id+'-before');enabled=true;draws=0;const first=await render(p.id+'-frame-00');assert.equal(draws,1,p.id+' should draw once');
  clock=.5;const second=await render(p.id+'-frame-04');clock=1.5;const loop=await render();
  const rb=await raw(base),r0=await raw(first),r4=await raw(second),rl=await raw(loop);
  const mask=await sharp('public'+m.WATERFALL_SECTION_IMAGES[p.maskKey]).removeAlpha().raw().toBuffer();
  const ref=await sharp(dir+'/'+p.id+'-reference.png').removeAlpha().raw().toBuffer();
  let changedWhitewater=0,protectedChanges=0,totalChanged=0,maxLoopDelta=0;
  for(let y=0;y<height*2;y++)for(let x=0;x<width*2;x++){
   const n=(y*width*2+x)*3,nx=Math.floor(x/2),ny=Math.floor(y/2),n2=(ny*width+nx)*3;
   const change=Math.max(...[0,1,2].map(k=>Math.abs(r0[n+k]-r4[n+k])));
   maxLoopDelta=Math.max(maxLoopDelta,...[0,1,2].map(k=>Math.abs(r0[n+k]-rl[n+k])));
   if(change>3){totalChanged++;if(ref[n2]>180&&ref[n2+1]>190&&ref[n2+2]>200)changedWhitewater++}
   let support=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const xx=nx+dx,yy=ny+dy;if(xx>=0&&xx<width&&yy>=0&&yy<height)support=Math.max(support,mask[(yy*width+xx)*3])}
   if(!support&&[0,1,2].some(k=>r0[n+k]!==rb[n+k]||r4[n+k]!==rb[n+k]))protectedChanges++;
  }
  assert(changedWhitewater>100,p.id+' whitewater must animate');assert.equal(protectedChanges,0,p.id+' outside water must stay fixed');assert(maxLoopDelta<=1,p.id+' must loop seamlessly');
  // Missing optional frames / mask must retain the original river, not a blank.
  missing=true;const fallback=await render();missing=false;
  // Pilot outside these windows is irrelevant; no new section can draw without frames.
  assert(base.equals(fallback),p.id+' missing frames fallback');
  previews=true;enabled=false;const previewBase=await render();enabled=true;draws=0;clock=.5;const previewMotion=await render();previews=false;
  assert.equal(draws,1,p.id+' should animate with preview artwork too');assert(!previewBase.equals(previewMotion),p.id+' preview should animate');
  results.push({id:p.id,changedWhitewaterPixels:changedWhitewater,totalChangedPixels:totalChanged,protectedPixelsChanged:protectedChanges,maxLoopDelta,previewFallback:true,missingFramesFallback:true});
  contact.push({id:p.id,first,second,base});
 }
 // Camera culling: no waterfall draws or asset requests at camp.
 current=null;frame={x:-500,y:-500,width:1000,height:1000};canvas.clientWidth=400;canvas.clientHeight=400;draws=0;await render();assert.equal(draws,0);
 // Actual 12-frame render of each drop, assembled as one compact review loop.
 const cellW=280,cellH=280;
 for(let f=0;f<12;f++){
  clock=f/8;const cells=[];
  for(let i=0;i<m.WATERFALL_SECTIONS.length;i++){
   current=frame=m.WATERFALL_SECTIONS[i];const [w,h]=current.sampling.nativeSize;canvas.clientWidth=w*2;canvas.clientHeight=h*2;
   const input=await sharp(await render()).resize(cellW,cellH,{fit:'contain',background:'#10252b'}).png().toBuffer();cells.push({input,left:(i%2)*cellW,top:Math.floor(i/2)*cellH});
  }
  const sheet=await sharp({create:{width:cellW*2,height:cellH*5,channels:4,background:'#10252b'}}).composite(cells).png().toBuffer();
  if(f===0)await sharp(sheet).toFile(dir+'/all-waterfalls.png');
  animation.push(await sharp(sheet).ensureAlpha().raw().toBuffer());
 }
 await sharp(Buffer.concat(animation),{raw:{width:cellW*2,height:cellH*5*12,channels:4,pageHeight:cellH*5}}).gif({loop:0,delay:Array(12).fill(125)}).toFile(dir+'/all-waterfalls.gif');
 renderer.dispose();
 const result={result:'pass',additionalLocations:results.length,existingPilot:1,frames:12,periodSeconds:1.5,entryImagesAdded:0,offscreenDraws:0,locations:results,browserAndPhoneCheck:'Unavailable; actual CanvasKit software rendering used.'};
 fs.writeFileSync(dir+'/checks.json',JSON.stringify(result,null,2)+'\n');console.log(result);
}finally{globalThis.fetch=original.fetch;globalThis.window=original.window;process.type=original.type;fs.rmSync(temp,{recursive:true,force:true})}

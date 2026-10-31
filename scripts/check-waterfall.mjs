import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),sharp=require('sharp');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'waterfall-check-')),dir='docs/qa/waterfall-pilot-v1';
const original={fetch:globalThis.fetch,window:globalThis.window,type:process.type};
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/skia-web';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/east-approach';export * from './src/river-art';export * from './src/waterfall-pilot';export * from './src/editor-image-sources';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=require(path.join(temp,'model.cjs')),s=m.EAST_TERRAIN_SCALE,pilot=m.WATERFALL_PILOT;
 assert(!Object.keys(m.EDITOR_ENTRY_IMAGES).some(k=>k.startsWith('riverWaterfall')),'No additional editor entry images');
 delete globalThis.CanvasKit;globalThis.window={};process.type='renderer';globalThis.devicePixelRatio=1;
 globalThis.fetch=async url=>String(url).startsWith('blob:')?original.fetch(url):new Response(fs.readFileSync(path.resolve('public'+String(url))));
 let surface,clock=0,enabled=true,missing=false;
 let frame={...pilot};
 const canvas={width:0,height:0,clientWidth:560,clientHeight:520,dataset:{}};
 const sources={...m.RIVER_DETAIL_IMAGES,riverFoam:m.RIVER_MOTION_IMAGES.riverFoam,...m.WATERFALL_IMAGES};
 const renderer=await m.createWebWorld(canvas,(ctx,atlas,imgs)=>{
  ctx.riverTime=0;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.scale(canvas.width/frame.width/s,canvas.height/frame.height/s);ctx.translate((600-frame.x)*s,(600-frame.y)*s);
  const visible=Object.fromEntries(Object.entries(imgs).filter(([k])=>(enabled||!k.startsWith('riverWaterfall'))&&(!missing||k!=='riverWaterfallFrames')));
  const draw=ctx.drawWaterfallPilot;ctx.drawWaterfallPilot=(a,b,c,d)=>draw.call(ctx,a,b,c,d,clock);
  m.drawRiverTerrain(ctx,visible,{x:(frame.x-600)*s,y:(frame.y-600)*s,width:frame.width*s,height:frame.height*s});ctx.drawWaterfallPilot=draw;ctx.restore();
 },{},{sources,streamRoads:false,streamRivers:false});
 globalThis.CanvasKit.MakeSWCanvasSurface=c=>(surface=globalThis.CanvasKit.MakeSurface(c.width,c.height));
 const w=m.createWorld(m.emptyLayout());
 async function render(name){renderer.draw(w);const snapshot=surface.makeImageSnapshot(),bytes=Buffer.from(snapshot.encodeToBytes());snapshot.delete();if(name)await sharp(bytes).png().toFile(dir+'/'+name+'.png');return bytes}
 enabled=false;const base=await render('before');enabled=true;const frames=[];
 for(let i=0;i<12;i++){clock=i/8;frames.push(await render('frame-'+String(i).padStart(2,'0')))}
 clock=1.5;const loop=await render();assert(frames[0].equals(loop),'Loop returns to exact first frame');
 missing=true;const fallback=await render();assert(base.equals(fallback),'Missing optional frame atlas leaves approved artwork intact');missing=false;
 const raw=async b=>sharp(b).removeAlpha().raw().toBuffer();
 const rb=await raw(base),r0=await raw(frames[0]),r4=await raw(frames[4]);
 const mask=await sharp('public/survival/waterfall-pilot-v1/water-mask.png').removeAlpha().raw().toBuffer();
 const src=await sharp('public/survival/waterfall-pilot-v1/artwork.webp').removeAlpha().raw().toBuffer();
 let changedWhitewater=0,protectedChanges=0,totalChanged=0;
 for(let y=0;y<520;y++)for(let x=0;x<560;x++){
  const n=(y*560+x)*3,nativeX=Math.floor(x/2),nativeY=Math.floor(y/2),n2=(nativeY*280+nativeX)*3;
  const change=Math.max(...[0,1,2].map(k=>Math.abs(r0[n+k]-r4[n+k])));
  if(change>3){totalChanged++;if(src[n2]>180&&src[n2+1]>190&&src[n2+2]>200)changedWhitewater++}
  let support=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const xx=nativeX+dx,yy=nativeY+dy;if(xx>=0&&xx<280&&yy>=0&&yy<260)support=Math.max(support,mask[(yy*280+xx)*3])}
  if(!support&&[0,1,2].some(k=>r0[n+k]!==rb[n+k]||r4[n+k]!==rb[n+k]))protectedChanges++;
 }
 assert(changedWhitewater>800,'Bright waterfall foam must visibly animate');assert.equal(protectedChanges,0,'All pixels outside water stencil remain identical');
 // Specific dry boulders/cliff faces around the moving stream.
 for(const [x,y] of [[45,105],[65,130],[155,70],[200,140],[247,174]]){
  const n=(y*2*560+x*2)*3;assert.deepEqual(r0.subarray(n,n+3),rb.subarray(n,n+3),'Fixed rock at '+x+','+y);
 }
 frame={x:-5376,y:-3200,width:1600,height:1000};canvas.clientWidth=480;canvas.clientHeight=300;enabled=false;const downstreamBase=await render();enabled=true;const downstreamPilot=await render();assert(downstreamBase.equals(downstreamPilot),'Other river sections remain pixel-identical');
 renderer.dispose();
 // An actual rendered loop for review, not a stand-in animation.
 const rawFrames=await Promise.all(frames.map(b=>sharp(b).resize(420,390).ensureAlpha().raw().toBuffer()));
 await sharp(Buffer.concat(rawFrames),{raw:{width:420,height:390*12,channels:4,pageHeight:390}}).gif({loop:0,delay:Array(12).fill(125)}).toFile(dir+'/waterfall-preview.gif');
 const result={result:'pass',pilotWaterfalls:1,frames:12,periodSeconds:1.5,changedWhitewaterPixels:changedWhitewater,totalChangedPixels:totalChanged,protectedPixelsChanged:protectedChanges,loopExact:true,missingFramesFallback:true,otherRiverUnchanged:true,entryImagesAdded:0,browserAndPhoneCheck:'Unavailable; actual CanvasKit software rendering used.'};
 fs.writeFileSync(dir+'/checks.json',JSON.stringify(result,null,2)+'\n');console.log(result);
}finally{globalThis.fetch=original.fetch;globalThis.window=original.window;process.type=original.type;fs.rmSync(temp,{recursive:true,force:true})}

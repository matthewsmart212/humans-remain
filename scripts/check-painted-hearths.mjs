import {build} from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),sharp=require('sharp'),init=require('canvaskit-wasm');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'painted-hearth-check-'));
const out=process.argv[2]||'docs/qa/bonfire-v3',masters='artwork-archive/bonfire-v3';
fs.mkdirSync(out,{recursive:true});
const raw=async file=>sharp(file).ensureAlpha().raw().toBuffer();
try{
 await build({stdin:{contents:`export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';export * from './src/skia-adapter';export * from './src/camp-art';export * from './src/catalogue-model';export * from './src/world-assets';export * from './src/world-image-sources';export * from './src/world-layout';export * from './src/asset-yard-art';export * from './src/placed-world-renderer';export * from './src/survival-engine';export * from './src/terrain-renderer';export * from './src/worker-renderer';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'test.mjs')});
 const m=await import(pathToFileURL(path.join(temp,'test.mjs'))),counts=[];
 for(const tier of [1,2,3]){
  const a=m.ASSET_BY_ID.get(`base_hearth_t${tier}`),e=m.entries.find(e=>e.id===a.id);
  assert.deepEqual(a.crop,[0,0,1024,1024]);assert.deepEqual(a.anchor,[512,960]);assert.deepEqual(a.unlitAnchor,a.anchor);assert.deepEqual(a.unlitSize,[1024,1024]);
  assert.equal(a.width,[112,132,164][tier-1]);assert.equal(a.height,a.width);assert.equal(a.fps,10);assert.equal(a.frames.length,8);assert.deepEqual(a.frames,e.artPreview.frames);
  const off=await raw('public'+a.unlit),mask=await raw(`${masters}/tier-${tier}-flame-mask.png`);let protectedCount=0,visibleCount=0;
  for(let p=0;p<off.length;p+=4)if(off[p+3]>0){visibleCount++;if(mask[p+3]===0)protectedCount++}
  assert(protectedCount/visibleCount>.28,`T${tier}: front stones and logs must remain outside the flame layer`);
  const frames=[];
  for(const url of [a.unlit,...a.frames]){
   const file='public'+url,meta=await sharp(file).metadata();assert.equal(meta.width,1024);assert.equal(meta.height,1024);assert(meta.hasAlpha);
   assert.deepEqual(m.imageDimensions[url],[1024,1024]);const pixels=await raw(file);frames.push(pixels);
   // Identical solid stones, timber, rim and front logs in EVERY lit state.
   for(let p=0;p<off.length;p+=4)if(off[p+3]>0&&mask[p+3]===0)for(let ch=0;ch<4;ch++)assert.equal(pixels[p+ch],off[p+ch],`${url}: stationary structure changed at ${p/4}`);
   for(let i=0;i<1024;i++)for(const p of [i,(1023*1024+i),i*1024,i*1024+1023])assert.equal(pixels[p*4+3],0,`${url}: alpha touches canvas edge`);
  }
  assert.notDeepEqual(frames[1],frames[2],'Flames must actually animate');counts.push({tier,protectedPixels:protectedCount,frames:8});
  const p={...m.newPlacement(a.id,1300,1800),scale:2.7},w=m.createWorld({...m.emptyLayout(),items:[p]}),original=JSON.stringify(p);
  Object.assign(w.player,{x:0,y:2000});const calls=[],ctx={save(){},restore(){},drawImage(...args){calls.push(args)}};
  const images=Object.fromEntries(Object.entries(m.requiredImages([a.id])).map(([key,url])=>[key,url]));
  let destination;
  for(let frame=0;frame<8;frame++){
   w.tick=frame*6;w.camp.hearth.fuel=100;calls.length=0;m.placedDrawables(ctx,images,w,true).forEach(d=>d.draw());
   assert.equal(calls.length,1);assert.equal(calls[0][0],a.frames[frame]);destination??=calls[0].slice(-4);assert.deepEqual(calls[0].slice(-4),destination);
  }
  w.camp.hearth.fuel=0;calls.length=0;m.placedDrawables(ctx,images,w,true).forEach(d=>d.draw());assert.equal(calls[0][0],a.unlit);assert.deepEqual(calls[0].slice(-4),destination,'Unlit does not shift or resize the pit');
  assert.equal(JSON.stringify(p),original,'Rendering never changes the saved placement');
  assert.deepEqual(a.body,[{x:0,y:-23,hw:43*a.width/112,hh:23*a.width/112}],'Existing collision footprint retained');
 }
 for(const id of ['art-camphearth-camp-hearth','art-provisions-fire-lit','art-provisions-fire-unlit']){
  const a=m.ASSET_BY_ID.get(id);assert(a,`Legacy placement ID retained: ${id}`);assert(a.image.includes('bonfire-v3'));assert.deepEqual(a.crop,[0,0,1024,1024]);
 }
 for(const a of m.YARD_ITEMS.filter(a=>/^hearth[123]Off$/.test(a.sheet))){const id='art-'+(a.sheet+'-'+a.name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');assert(m.ASSET_BY_ID.has(id),`Unlit placement ID retained despite shared artwork: ${id}`)}
 for(const [id,width,height]of [['art-camphearth-camp-hearth',180,180*711/984],['art-provisions-fire-unlit',165,165*244/339],['art-provisions-fire-lit',165,165]])assert.deepEqual(m.ASSET_BY_ID.get(id).body,[{x:0,y:-Math.min(40,height*.13),hw:width*.3,hh:Math.min(45,height*.2)}],`Legacy collider retained: ${id}`);
 for(const a of m.YARD_ITEMS.filter(a=>a.animationPrefix?.startsWith('hearth'))){assert.equal(a.frameCount,8);assert.equal(a.fps,10);assert.deepEqual(a.crop,[0,0,1024,1024])}
 const kit=await init({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)});globalThis.CanvasKit=kit;
 const skia=m.JsiSkApi(kit),{SkiaContext}=m.createSkiaAdapter(skia),imgs={};
 const fontData=skia.Data.fromBytes(fs.readFileSync('public/fonts/barlow-condensed-black.ttf')),face=skia.Typeface.MakeFreeTypeFaceFromData(fontData),font=skia.Font(face,20);fontData.dispose();
 const sources={...m.requiredImages([...([1,2,3].map(t=>`base_hearth_t${t}`)),'base_well_t1','base_medical_t2','base_workshop_t1']),...Object.fromEntries(Object.entries(m.WORLD_IMAGE_SOURCES).filter(([k])=>k.startsWith('homeTerrain')||k.startsWith('survivor')||k.startsWith('runner')||k==='campAxe'))};
 for(const [key,url]of Object.entries(sources)){const bytes=skia.Data.fromBytes(fs.readFileSync('public'+url));imgs[key]=skia.Image.MakeImageFromEncoded(bytes);bytes.dispose();assert(imgs[key],`CanvasKit decoded ${url}`)}
 const width=1440,height=620,surface=skia.Surface.Make(width,height);
 function render(frame,lit=true){
  const ctx=new SkiaContext(surface.getCanvas(),width,height,font);ctx.clearRect(0,0,width,height);ctx.fillStyle='#102e30';ctx.fillRect(0,0,width,height);
  const layout=m.emptyLayout();layout.items=[1,2,3].map((t,i)=>({...m.newPlacement(`base_hearth_t${t}`,1370+i*470,1990),scale:2.7,allowTransparency:false}));
  const w=m.createWorld(layout);w.tick=frame*6;w.camp.hearth.fuel=lit?100:0;Object.assign(w.player,{x:layout.items[0].x+200,y:2030,direction:'down',equipped:null,moving:false});
  ctx.save();ctx.translate(-1120,-1480);m.drawHomeTerrain(ctx,imgs);m.drawPlacedGround(ctx,imgs,w.layout);m.placedDrawables(ctx,imgs,w,true).forEach(d=>d.draw());m.drawWorker(ctx,imgs,w);ctx.restore();
  ctx.fillStyle='#102e30ed';ctx.fillRect(0,0,width,66);ctx.fillStyle='#ffdfa0';ctx.font='25px Barlow Condensed';
  for(const [i,name]of ['CAMP BONFIRE','BRACED BONFIRE','COOKING BONFIRE'].entries())ctx.fillText(name,250+i*470,39);
  ctx.fillStyle='#102e30ed';ctx.fillRect(0,height-50,width,50);ctx.fillStyle='#d8e9dc';ctx.font='20px Barlow Condensed';ctx.fillText(lit?'8 ALIGNED FRAMES · FIXED TIMBER AND STONE BASES · 1024 × 1024 EACH':'MATCHING UNLIT STATE · SAME SIZE, SAME GROUND ANCHOR',width/2,height-18);
  surface.flush();ctx.dispose();const shot=surface.makeImageSnapshot(),bytes=shot.encodeToBytes();shot.dispose();return bytes;
 }
 for(let frame=0;frame<8;frame++)fs.writeFileSync(path.join(out,`lit-${frame}.png`),render(frame));
 fs.writeFileSync(path.join(out,'unlit.png'),render(0,false));
 {
  const ctx=new SkiaContext(surface.getCanvas(),width,height,font);ctx.clearRect(0,0,width,height);ctx.fillStyle='#102e30';ctx.fillRect(0,0,width,height);
  const layout=m.emptyLayout();layout.items=[{...m.newPlacement('base_well_t1',1370,2110),scale:2.8},{...m.newPlacement('base_medical_t2',1840,2110),scale:.8},{...m.newPlacement('base_workshop_t1',2360,2110),scale:.78}].map(p=>({...p,allowTransparency:false}));
  const w=m.createWorld(layout);Object.assign(w.player,{x:1840,y:2150,direction:'up',equipped:null,moving:false});
  ctx.save();ctx.translate(-1100,-1630);m.drawHomeTerrain(ctx,imgs);m.drawPlacedGround(ctx,imgs,w.layout);m.placedDrawables(ctx,imgs,w,true).forEach(d=>d.draw());m.drawWorker(ctx,imgs,w);ctx.restore();
  ctx.fillStyle='#102e30ed';ctx.fillRect(0,0,width,66);ctx.fillStyle='#ffdfa0';ctx.font='25px Barlow Condensed';
  for(const [i,name]of ['ROPE WELL','TREATMENT CENTRE','MATCHING CAMP WORKSHOP'].entries())ctx.fillText(name,260+i*480,39);
  surface.flush();ctx.dispose();const shot=surface.makeImageSnapshot();fs.writeFileSync(path.join(out,'camp-essentials.png'),shot.encodeToBytes());shot.dispose();
 }
 surface.dispose();Object.values(imgs).forEach(im=>im.dispose());font.dispose();face.dispose();
 fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({result:'pass',size:[1024,1024],anchor:[512,960],fps:10,tiers:counts,placement:'unchanged',collision:'unchanged',legacyAliases:'preserved',renderer:'actual CanvasKit placed-world renderer'},null,2)+'\n');
 console.log('PASS: all 27 images same size; '+counts.map(t=>`T${t.tier} ${t.protectedPixels.toLocaleString()} static base pixels`).join(', ')+'; 8 frames and unlit use identical renderer destinations; footprints and placement IDs retained. Rendered preview: '+out);
}finally{fs.rmSync(temp,{recursive:true,force:true})}

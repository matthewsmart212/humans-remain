import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'bow-render-'));
try{
 await build({stdin:{contents:`export * from './src/bow-art';export * from './src/bow-composition';export * from './src/bow-combat';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/skia-adapter';export * from './src/worker-renderer';export * from './src/survivor-art';export * from './src/runner-cycles';export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'test.cjs')});
 const m=require(path.join(temp,'test.cjs')),init=require('canvaskit-wasm');
 const kit=await init({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)});globalThis.CanvasKit=kit;
 const skia=m.JsiSkApi(kit),{SkiaContext}=m.createSkiaAdapter(skia),font=skia.Font(undefined,14),images={};
 for(const [key,url]of Object.entries({...m.SURVIVOR_IMAGE_SOURCES,...m.RUNNER_CYCLE_SOURCES,...m.BOW_IMAGES})){
  const file=fs.existsSync('public'+url)?'public'+url:('public'+url).replace(/\.png$/,'.webp');
  const data=skia.Data.fromBytes(fs.readFileSync(file));images[key]=skia.Image.MakeImageFromEncoded(data);data.dispose();assert(images[key],key);
 }
 const w=m.createWorld(m.emptyLayout()),dirs=['up-left','up','up-right','left','right','down-left','down','down-right'];

 assert.equal(Object.keys(m.BOW_IMAGES).filter(key=>key.startsWith('runnerBow-')).length,5);
 // Each action uses one uniformly scaled equipment draw. Base geometry must
 // remain identical across every pose; no differently sized torso/leg layer.
 for(const view of ['up','up-right','right','down-right','down']){
  let previous;
  for(let frame=0;frame<6;frame++){
   const calls=[],capture={drawImage:(...args)=>calls.push(args),save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){},stroke(){},translate(){}};
   const action=images['runnerBow-'+view],base=images[m.SURVIVOR_ART[view].idle.sheet];
   m.drawBowLayers(capture,images,view,frame,action);
   const core=calls.filter(args=>args[0]===base).map(args=>args.slice(1));
   if(previous)assert.deepEqual(core,previous,'original source crops and draw sizes never change between poses');previous=core;
   const equipment=calls.filter(args=>args[0]===action);assert.equal(equipment.length,1);
   const draw=equipment[0];assert.equal(draw[7]/draw[3],draw[8]/draw[4],'uniform equipment scale');
  }
 }
 const clearSurface=skia.Surface.Make(2048,2048),clearImage=clearSurface.makeImageSnapshot();
 const layerImages={...images,survivorBase:clearImage,survivorRear:clearImage};
 const coreImages={...images,bowArrow:clearImage,...Object.fromEntries(Object.keys(m.BOW_IMAGES).filter(k=>k.startsWith('runnerBow-')).map(k=>[k,clearImage]))};
 const renderLayer=(direction,age,coreOnly=false)=>{
  const facing=m.runnerFacing(direction),s=skia.Surface.Make(256,256),c=new SkiaContext(s.getCanvas(),256,256,font);
  c.translate(128,200);if(facing.mirror)c.scale(-1,1);
  m.drawBowLayers(c,coreOnly?{...layerImages,bowArrow:clearImage}:layerImages,facing.view,m.bowFrame(age),coreOnly?clearImage:images['runnerBow-'+facing.view],age<m.BOW_SHOT.release,age);
  s.flush();const im=s.makeImageSnapshot(),pixels=Uint8Array.from(im.readPixels(0,0,{width:256,height:256,colorType:4,alphaType:3}));im.dispose();c.dispose();s.dispose();return pixels;
 };
 const render=(direction,age,coreOnly=false,headReferenceAge)=>{
  const s=skia.Surface.Make(256,256),c=new SkiaContext(s.getCanvas(),256,256,font);
  Object.assign(w.player,{x:0,y:0,direction,equipped:age===null?null:'bow',moving:false,runBlend:0});
  w.tick=age===null?0:(2+age)*60;w.bowShot=age===null?undefined:{started:2,angle:m.DIRECTION_ANGLES[direction],direction,released:age>=m.BOW_SHOT.release};
  c.translate(128,200);if(headReferenceAge!==undefined){const facing=m.runnerFacing(direction),[dx,dy]=m.bowHeadOffset(facing.view,headReferenceAge);c.translate(facing.mirror?-dx:dx,dy)}m.drawWorker(c,coreOnly?coreImages:images,w);s.flush();const im=s.makeImageSnapshot(),pixels=Uint8Array.from(im.readPixels(0,0,{width:256,height:256,colorType:4,alphaType:3}));im.dispose();c.dispose();s.dispose();return pixels;
 };
 for(const view of ['up','up-right','right','down-right','down']){
  assert.deepEqual(m.bowHeadOffset(view,0),[0,0]);assert.deepEqual(m.bowHeadOffset(view,.84),[0,0]);
  assert(Math.hypot(...m.bowHeadOffset(view,.3))>=1.5,'head actually follows draw');
  for(let t=.001;t<.84;t+=.001){const a=m.bowHeadOffset(view,t-.001),b=m.bowHeadOffset(view,t);assert(Math.hypot(b[0]-a[0],b[1]-a[1])<.09,'continuous head motion');assert(Math.hypot(...b)<3.1,'restrained head movement')}
 }
 const ages=[0,.1,.2,.3,.46,.65,.8,.9],rendered={};
 for(const direction of dirs){
  const original=render(direction,null);rendered[direction]=ages.map(age=>render(direction,age));
  for(let n=0;n<ages.length;n++)for(const [label,x0,x1,y0,y1]of [['head',-26,26,-104,-62]]){
   const expected=render(direction,null,false,ages[n]);let checked=0;
   for(let y=y0+200;y<y1+200;y++)for(let x=x0+128;x<x1+128;x++){
    const index=(y*256+x)*4;// Artwork has slightly translucent paint; allow its alpha compositing budget.
    if(expected[index+3]<245)continue;
    const error=Math.max(...expected.slice(index,index+4).map((value,c)=>Math.abs(value-rendered[direction][n][index+c])));
    assert(error<=257-expected[index+3],`${direction} ${ages[n]}: original ${label} pixel at ${x-128},${y-200}, error=${error}`);checked++;
   }
   assert(checked>100,`measured enough ${label} pixels ${direction}: ${checked}, `);
  }

  // Hide equipment to inspect the actual core underneath it. Every original
  // trouser/boot pixel remains at its original scale, except the thin string.
  for(let n=0;n<ages.length;n++){
   const overlay=renderLayer(direction,ages[n],true),core=render(direction,ages[n],true);let kept=0,total=0;
   for(let y=178;y<201;y++)for(let x=87;x<169;x++){
    const i=(y*256+x)*4;if(original[i+3]<245)continue;total++;
    if(overlay[i+3]>0)continue;
    assert.deepEqual(core.slice(i,i+4),original.slice(i,i+4),direction+' original trousers/boots');kept++;
   }
   assert(kept>total*.90,`full original lower body, excluding narrow string: ${direction}/${ages[n]}, ${kept}/${total}`);
  }
  assert.notDeepEqual(rendered[direction][0],rendered[direction][3],'action still animates: '+direction);
 }
 for(const [left,right]of [['up-left','up-right'],['left','right'],['down-left','down-right']])for(let n=0;n<ages.length;n++){
  const l=rendered[left][n],r=rendered[right][n];let max=0,total=0;
  for(let y=0;y<256;y++)for(let x=0;x<256;x++)for(let c=0;c<4;c++){const a=(y*256+x)*4,b=(y*256+255-x)*4;const lv=c===3?l[a+c]:l[a+c]*l[a+3]/255,rv=c===3?r[b+c]:r[b+c]*r[b+3]/255;const delta=Math.abs(lv-rv);max=Math.max(max,delta);total+=delta;}
  assert(total/l.length<.03,`mirrored pair ${left}/${right}: max=${max}, mean=${total/l.length}`);
 }

 // Standing between shots uses exactly the same ready body as shot recovery.
 for(const direction of dirs){
  Object.assign(w.player,{x:0,y:0,direction,equipped:'bow',moving:false});w.bowShot=undefined;
  const s=skia.Surface.Make(256,256),c=new SkiaContext(s.getCanvas(),256,256,font);c.translate(128,200);m.drawWorker(c,images,w);s.flush();
  const im=s.makeImageSnapshot(),pixels=Uint8Array.from(im.readPixels(0,0,{width:256,height:256,colorType:4,alphaType:3}));
  assert.deepEqual(pixels,rendered[direction].at(-1),'no carry-pose flash between shots');im.dispose();c.dispose();s.dispose();
 }

 const equipmentSurface=skia.Surface.Make(1800,1100),equipmentCtx=new SkiaContext(equipmentSurface.getCanvas(),1800,1100,font);
 for(const [row,view]of ['up','up-right','right','down-right','down'].entries())for(let frame=0;frame<6;frame++){
  equipmentCtx.save();equipmentCtx.translate(frame*300,row*220);equipmentCtx.fillStyle='#18352c';equipmentCtx.fillRect(0,0,300,220);equipmentCtx.translate(150,195);equipmentCtx.scale(1.5,1.5);
  m.drawBowLayers(equipmentCtx,layerImages,view,frame,images['runnerBow-'+view]);equipmentCtx.restore();
 }
 equipmentSurface.flush();const equipmentShot=equipmentSurface.makeImageSnapshot();fs.writeFileSync('docs/qa/bow-v1/equipment-only.png',equipmentShot.encodeToBytes());equipmentShot.dispose();equipmentCtx.dispose();equipmentSurface.dispose();
 clearImage.dispose();clearSurface.dispose();
 const rows=[['Original',-1],['Bow idle',-2],['Walk',-3],['Sprint',-4],['Raise',.1],['Half draw',.2],['Aim',.3],['Release',.46],['Lower',.65]];
 const surface=skia.Surface.Make(2240,1980),ctx=new SkiaContext(surface.getCanvas(),2240,1980,font);
 for(let row=0;row<rows.length;row++)for(let col=0;col<dirs.length;col++){
  const [label,age]=rows[row],direction=dirs[col],moving=age===-3||age===-4;
  Object.assign(w.player,{x:0,y:0,direction,equipped:age===-1?null:'bow',moving,sprinting:age===-4,runBlend:age===-4?1:0,walkBlend:1,walkDistance:28});
  w.tick=age>=0?(2+age)*60:0;w.bowShot=age>=0?{started:2,angle:m.DIRECTION_ANGLES[direction],direction,released:age>=m.BOW_SHOT.release}:undefined;
  ctx.save();ctx.translate(col*280,row*220);ctx.fillStyle='#18352c';ctx.fillRect(0,0,280,220);ctx.fillStyle='#e9dcbf';ctx.font='11px sans-serif';ctx.fillText(direction+' / '+label,140,18);ctx.translate(140,184);ctx.scale(1.3,1.3);
  m.drawWorker(ctx,images,w);ctx.restore();
 }
 surface.flush();const shot=surface.makeImageSnapshot();fs.mkdirSync('docs/qa/bow-v1',{recursive:true});fs.writeFileSync('docs/qa/bow-v1/production-poses.png',shot.encodeToBytes());shot.dispose();ctx.dispose();surface.dispose();
 for(const image of Object.values(images))image.dispose();font.dispose();
 console.log('PASS: same-size translated head and original boots across 64 poses; five shared textures, mirrored directions, uniform arm scale, ready pose between shots, production Skia comparisons.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}

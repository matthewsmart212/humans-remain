// Compare the cached fields against the previous procedural shader, including
// native Picture playback. No graphics driver or timing assumptions in assertions.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'shader-fields-'));
try{
 await build({stdin:{contents:"export * from './src/terrain-colour-field';export * from './src/river-flow-field';export * from './src/river-layout';export * from './src/world-ground';export {WORLD_GROUND_COLOUR_SHADER as beforeGround} from './scripts/fixtures/procedural-ground-colour';export {WORLD_GROUND_COLOUR_SHADER as afterGround} from './src/world-ground-colour';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=require(path.join(temp,'model.cjs')),kit=await require('canvaskit-wasm')({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)});
 const resources=[],keep=r=>{assert(r);resources.push(r);return r};
 const image=(bytes,w,h)=>keep(kit.MakeImage({width:w,height:h,colorType:kit.ColorType.RGBA_8888,alphaType:kit.AlphaType.Opaque,colorSpace:kit.ColorSpace.SRGB},bytes,w*4));
 const sampler=(im,matrix)=>keep(im.makeShaderOptions(kit.TileMode.Clamp,kit.TileMode.Clamp,kit.FilterMode.Linear,kit.MipmapMode.None,matrix));
 const warm=sampler(image(new Uint8Array([115,76,38,255]),1,1)),clear=sampler(image(new Uint8Array([186,117,62,255]),1,1)),bounds=m.WORLD_GROUND_BOUNDS,size=m.TERRAIN_COLOUR_FIELD_SIZE;
 const pixels=m.terrainColourPixels();assert.equal(pixels,m.terrainColourPixels(),'Field generation is reused');
 const field=sampler(image(pixels,size,size),[bounds.width/size,0,bounds.x-600,0,bounds.height/size,bounds.y-600,0,0,1]);
 const before=keep(kit.RuntimeEffect.Make(m.beforeGround)),after=keep(kit.RuntimeEffect.Make(m.afterGround));
 const shaders=[keep(before.makeShaderWithChildren([1],[warm,clear])),keep(after.makeShaderWithChildren([1],[warm,clear,field]))];
 const surface=keep(kit.MakeSurface(256,256)),reports=[];
 const render=(shader,b,record=false)=>{
  const recorder=record?new kit.PictureRecorder():undefined,canvas=recorder?recorder.beginRecording(kit.XYWHRect(0,0,256,256)):surface.getCanvas();
  canvas.save();canvas.scale(256/b.width,256/b.height);canvas.translate(600-b.x,600-b.y);
  const paint=new kit.Paint();paint.setShader(shader);canvas.drawRect(kit.XYWHRect(b.x-600,b.y-600,b.width,b.height),paint);canvas.restore();paint.delete();
  if(recorder){const picture=recorder.finishRecordingAsPicture();surface.getCanvas().drawPicture(picture);picture.delete();recorder.delete()}
  surface.flush();const im=surface.makeImageSnapshot(),raw=im.readPixels(0,0,{width:256,height:256,colorType:kit.ColorType.RGBA_8888,alphaType:kit.AlphaType.Unpremul,colorSpace:kit.ColorSpace.SRGB});im.delete();return Buffer.from(raw);
 };
 for(const [name,b] of [['world',bounds],['camp',{x:1200,y:1200,width:2400,height:2400}],['west',{x:-6200,y:3000,width:2400,height:2400}],['woodland',{x:-6200,y:-3500,width:2400,height:2400}],['south',{x:1000,y:10000,width:2400,height:2400}]]){
  const a=render(shaders[0],b),baked=render(shaders[1],b),differences=[...a].map((n,i)=>Math.abs(n-baked[i])).sort((a,b)=>a-b),mean=differences.reduce((a,b)=>a+b,0)/differences.length,p99=differences[Math.floor(differences.length*.99)];
  reports.push({name,meanChannelDelta:mean,p99ChannelDelta:p99});
  assert(mean<1,`${name}: colour error stays below one channel level on average (${mean})`);assert(p99<4,`${name}: no visible colour bands (${p99})`);
  assert.deepEqual(render(shaders[1],b,true),baked,'Picture playback preserves field sampling');
 }
 let flowBytes=0;
 for(const [index,batch]of m.RIVER_BATCHES.entries()){
  const points=m.RIVER_SIDE_FEATURES.find(f=>f.batch===index)?.points,field=m.riverFlowPixels(batch,points);
  assert.equal(field,m.riverFlowPixels(batch,points),'Adjacent chunks reuse a single route field');assert(field.width<=512&&field.height<=512);
  flowBytes+=field.main.byteLength+(field.side?.byteLength||0);
 }
 assert(flowBytes<=18*1024*1024,'All river fields have a fixed mobile memory budget');
 for(const r of resources.reverse())r.delete();
 console.log(JSON.stringify({passed:true,ground:reports,groundFieldBytes:pixels.byteLength,riverFieldBytes:flowBytes,physicalDeviceTested:false},null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}

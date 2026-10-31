import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'camp-occlusion-'));
try{
 await build({stdin:{contents:"export * from './src/skia-adapter';export * from './src/terrain-renderer';export * from './src/east-approach';export * from './src/outdoor-terrain';export {HOME_TERRAIN} from './src/terrain-art';export {drawHomeTerrain as before} from './scripts/fixtures/unclipped-terrain-renderer';export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=require(path.join(temp,'model.cjs')),kit=await require('canvaskit-wasm')({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)}),skia=m.JsiSkApi(kit),adapter=m.createSkiaAdapter(skia),surface=skia.Surface.Make(192,192),font=skia.Font(undefined,16),loaded=new Map();
 const load=url=>{if(loaded.has(url))return loaded.get(url);const data=skia.Data.fromBytes(fs.readFileSync('public'+url)),image=skia.Image.MakeImageFromEncoded(data);data.dispose();assert(image);loaded.set(url,image);return image};
 const images={homeGround:load(m.HOME_TERRAIN.image),worldGroundWarm:load('/survival/world-ground-v2/warm.webp'),worldGroundBrown:load('/survival/world-ground-v2/brown.webp'),worldGroundClear:load('/survival/world-ground-v3/clear-earth.webp')};
 for(const tile of m.OUTDOOR_TILES)images[tile.key]=load(tile.image);
 const render=(draw,source,record=false)=>{
  const s=m.EAST_TERRAIN_SCALE,v={x:(source.x-600)*s,y:(source.y-600)*s,width:source.width*s,height:source.height*s},recorder=record?skia.PictureRecorder():undefined,canvas=recorder?recorder.beginRecording(skia.XYWHRect(0,0,192,192)):surface.getCanvas(),ctx=new adapter.SkiaContext(canvas,192,192,font);
  m.clearTerrainViewport(ctx);ctx.save();ctx.scale(192/v.width,192/v.height);ctx.translate(-v.x,-v.y);draw(ctx,images,undefined,0,v);ctx.restore();ctx.dispose();
  if(recorder){const picture=recorder.finishRecordingAsPicture();surface.getCanvas().drawPicture(picture);picture.dispose();recorder.dispose()}
  surface.flush();const image=surface.makeImageSnapshot(),bytes=Buffer.from(image.readPixels(0,0,{width:192,height:192,colorType:4,alphaType:3}));image.dispose();return bytes;
 };
 let views=0;
 for(const [x,y,size]of [[1800,1800,1200],[-300,1800,1200],[3900,1800,1200],[1800,-300,1200],[1800,3900,1200],[-500,-500,1800],[-500,-500,6000]]){
  const b={x,y,width:size,height:size},before=render(m.before,b),after=render(m.drawHomeTerrain,b);const delta=[...after].map((v,i)=>Math.abs(v-before[i])),max=delta.reduce((a,b)=>Math.max(a,b),0),mean=delta.reduce((a,b)=>a+b,0)/delta.length;assert(max<=1&&mean<.005,'Clipping must preserve pixels within float-rounding noise: '+JSON.stringify({b,max,mean}));assert(render(m.drawHomeTerrain,b,true).equals(after),'Native Picture playback preserves clipping');views++;
 }
 adapter.disposeLighting();surface.dispose();font.dispose();for(const im of loaded.values())im.dispose();
 console.log(JSON.stringify({passed:true,views,maxChannelRoundingError:1,nativePicturePlayback:true}));
}finally{fs.rmSync(temp,{recursive:true,force:true})}

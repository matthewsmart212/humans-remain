// Standalone terrain/foliage study through the real game renderer, not a full saved-camp screenshot.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),sharp=require('sharp'),init=require('canvaskit-wasm'),exec=promisify(execFile);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'terrain-foliage-skia-')),out='docs/qa/foliage-v3';
try{
 await build({stdin:{contents:`export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';export * from './src/skia-adapter';export * from './src/world-assets';export * from './src/world-layout';export * from './src/imported-art';export * from './src/foliage-trial';export * from './src/studio-play';export * from './src/placed-world-renderer';export * from './src/editor-image-sources';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'render.mjs')});
 const kit=await init({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)});globalThis.CanvasKit=kit;
 const m=await import(pathToFileURL(path.join(temp,'render.mjs'))),skia=m.JsiSkApi(kit),{SkiaContext,disposeLighting}=m.createSkiaAdapter(skia);
 const source=JSON.parse(fs.readFileSync(out+'/camp-before.json')).draft;m.installImportedArt(JSON.parse(fs.readFileSync(out+'/artwork-before.json')).records);
 const layout=m.addApprovedTerrainFoliage(source),fire=layout.items.find(p=>p.role==='hearth'),first=layout.items.find(p=>p.id===m.TERRAIN_FOLIAGE_PREFIX+'1'),imgs={},missing=new Set();
 const sources=Object.entries({...m.EDITOR_IMAGE_SOURCES,...m.editorTerrainDetail(layout.terrainImage),...m.requiredImages(layout.items.map(p=>p.assetId),layout.terrainImage)});
 for(const [key,url] of sources){
  const file='public'+url;if(!fs.existsSync(file)){missing.add(url);continue}
  const data=skia.Data.fromBytes(fs.readFileSync(file));imgs[key]=skia.Image.MakeImageFromEncoded(data);data.dispose();assert(imgs[key],url);
 }
 // Remote uploads cannot be fetched in this environment. Only this disposable visual
 // fixture excludes them; production layout and assets remain untouched.
 const unavailable=new Set(layout.items.filter(p=>Object.values(m.requiredImages([p.assetId])).some(url=>missing.has(url))).map(p=>p.id));
 const w=m.createCampPlaySession({...layout,items:layout.items.filter(p=>!unavailable.has(p.id))});
 const fontData=skia.Data.fromBytes(fs.readFileSync('public/fonts/barlow-condensed-black.ttf')),face=skia.Typeface.MakeFreeTypeFaceFromData(fontData),font=skia.Font(face,20);fontData.dispose();
 const render=(width,height,x,y,zoom)=>{
  const view={x,y,zoom,follow:false,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:true};
  const surface=skia.Surface.Make(width,height),ctx=new SkiaContext(surface.getCanvas(),width,height,font);
  m.drawWorldEditor(ctx,{},imgs,w,view);surface.flush();const shot=surface.makeImageSnapshot(),buffer=shot.encodeToBytes();shot.dispose();ctx.dispose();surface.dispose();return buffer;
 };
 const still=async(name,...args)=>sharp(render(...args)).webp({quality:94}).toFile(path.join(out,name));
 Object.assign(w.player,{x:first.x+8,y:first.y+19,direction:'down-right',equipped:null});
 await still('terrain-study-day.webp',1000,750,fire.x-475,fire.y,2.4);
 w.nightAmount=1;await still('terrain-study-night.webp',1000,750,fire.x-475,fire.y,2.4);w.nightAmount=0;
 Object.assign(w.player,{x:first.x,y:first.y-10,direction:'down',moving:false});
 await still('boots-behind.webp',700,500,first.x-30,first.y-35,3);
 w.player.y=first.y+13;await still('boots-in-front.webp',700,500,first.x-30,first.y-35,3);
 Object.assign(w.player,{x:first.x-180,y:first.y,direction:'right',equipped:null});
 const frames=path.join(temp,'frames');fs.mkdirSync(frames);let number=0;
 for(let tick=0;tick<270;tick++){
  const input=tick<83?{x:1,y:0}:tick<145?{x:0,y:0}:tick<193?{x:-1,y:0}:{x:0,y:0};m.stepCampPlaySession(w,input,tick>=145&&tick<193,false);
  if(tick%3)continue;fs.writeFileSync(path.join(frames,String(number++).padStart(3,'0')+'.png'),render(844,470,fire.x-490,fire.y-70,2.8));
 }
 await exec('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate','20','-i',path.join(frames,'%03d.png'),'-c:v','libx264','-pix_fmt','yuv420p','-crf','19','-movflags','+faststart',path.join(out,'walk-and-sprint.mp4')]);
 Object.values(imgs).forEach(im=>im.dispose());font.dispose();face.dispose();disposeLighting();
 console.log(`PASS: ${Object.keys(imgs).length} local images decoded; standalone terrain study rendered in day/night, boot overlap and walk/sprint views. ${unavailable.size} remote-upload placements omitted from this disposable QA scene only. Software Skia QA; no browser or device measurement.`);
}finally{fs.rmSync(temp,{recursive:true,force:true})}

// Actual CanvasKit/Skia renderer, not a composited mockup or browser screenshot.
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
const expanded=process.argv.includes('--expanded');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'foliage-skia-')),out=expanded?'docs/qa/foliage-v2':'docs/qa/foliage-v1',cache='.qa/art-cache';
fs.mkdirSync(cache,{recursive:true});fs.mkdirSync(out,{recursive:true});
try{
 await build({stdin:{contents:`export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';export * from './src/skia-adapter';export * from './src/world-assets';export * from './src/world-layout';export * from './src/imported-art';export * from './src/foliage-trial';export * from './src/studio-play';export * from './src/placed-world-renderer';export * from './src/editor-image-sources';export * from './src/weather-model';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'render.mjs')});
 const kit=await init({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)});globalThis.CanvasKit=kit;
 const m=await import(pathToFileURL(path.join(temp,'render.mjs'))),skia=m.JsiSkApi(kit),{SkiaContext,disposeLighting}=m.createSkiaAdapter(skia);
 const source=JSON.parse(fs.readFileSync(out+'/camp-before.json')).draft;m.installImportedArt(JSON.parse(fs.readFileSync(out+'/artwork-before.json')).records);
 const trial=m.addApprovedFoliageTrial(source),layout=expanded?m.addApprovedFoliageExpansion(trial):trial,w=m.createCampPlaySession(layout),fire=layout.items.find(p=>p.role==='hearth'),imgs={};
 const sources=Object.entries({...m.EDITOR_IMAGE_SOURCES,...m.editorTerrainDetail(layout.terrainImage),...m.requiredImages(layout.items.map(p=>p.assetId),layout.terrainImage)});
 // Decoding once mirrors startup; never download/decode from a draw callback.
 let cursor=0;await Promise.all(Array.from({length:4},async()=>{while(cursor<sources.length){
  const [key,url]=sources[cursor++];let file='public'+url;
  if(!fs.existsSync(file)){file=path.join(cache,encodeURIComponent(url));if(!fs.existsSync(file))await exec('curl',['--fail','--silent','--show-error','--max-time','45','https://safety-last.matthew-smart212.chatgpt.site'+url,'-o',file]);}
  const data=skia.Data.fromBytes(fs.readFileSync(file));imgs[key]=skia.Image.MakeImageFromEncoded(data);data.dispose();assert(imgs[key],url);
 }}));
 console.log('Decoded '+sources.length+' shared world images.');
 const fontData=skia.Data.fromBytes(fs.readFileSync('public/fonts/barlow-condensed-black.ttf')),face=skia.Typeface.MakeFreeTypeFaceFromData(fontData),font=skia.Font(face,20);fontData.dispose();
 const render=async(name,world,width,height,x,y,zoom)=>{
  const surface=skia.Surface.Make(width,height),ctx=new SkiaContext(surface.getCanvas(),width,height,font);
  m.drawWorldEditor(ctx,{},imgs,world,{x,y,zoom,follow:false,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:true});
  surface.flush();const shot=surface.makeImageSnapshot(),buffer=shot.encodeToBytes();shot.dispose();ctx.dispose();surface.dispose();
  await sharp(buffer).webp({quality:94}).toFile(path.join(out,name));return buffer;
 };
 Object.assign(w.player,{x:fire.x-332,y:fire.y+160,direction:'down-right',equipped:null});
 await render('camp-overview.webp',w,1600,1250,1800,1450,.38);
 await render('fire-trial-day.webp',w,1200,expanded?850:760,fire.x-(expanded?25:180),fire.y+(expanded?70:105),expanded?1.05:1.3);
 w.nightAmount=1;await render('fire-trial-night.webp',w,1200,expanded?850:760,fire.x-(expanded?25:180),fire.y+(expanded?70:105),expanded?1.05:1.3);w.nightAmount=0;
 const fern=layout.items.find(p=>p.id===(expanded?'camp-foliage-v2-1':'camp-foliage-v1-2'));
 Object.assign(w.player,{x:fern.x,y:fern.y-10,direction:'down',moving:false});
 await render('boots-behind.webp',w,700,500,fern.x,fern.y-35,3);
 w.player.y=fern.y+13;await render('boots-in-front.webp',w,700,500,fern.x,fern.y-35,3);
 // Walk across the patch, pause, then sprint back. Same gameplay step and renderer.
 Object.assign(w.player,{x:fire.x-(expanded?595:485),y:fire.y+(expanded?-60:154),direction:'right',equipped:null});
 const frames=path.join(temp,'frames');fs.mkdirSync(frames);let number=0;
 for(let tick=0;tick<270;tick++){
  const input=tick<83?{x:1,y:0}:tick<145?{x:0,y:0}:tick<193?{x:-1,y:0}:{x:0,y:0};
  m.stepCampPlaySession(w,input,tick>=145&&tick<193,false);
  if(tick%3)continue;
  const surface=skia.Surface.Make(844,470),ctx=new SkiaContext(surface.getCanvas(),844,470,font);
  m.drawWorldEditor(ctx,{},imgs,w,{x:fire.x-(expanded?385:250),y:fire.y+(expanded?-95:100),zoom:1.5,follow:false,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:true});
  surface.flush();const shot=surface.makeImageSnapshot();fs.writeFileSync(path.join(frames,String(number++).padStart(3,'0')+'.png'),shot.encodeToBytes());shot.dispose();ctx.dispose();surface.dispose();
 }
 await exec('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate','20','-i',path.join(frames,'%03d.png'),'-c:v','libx264','-pix_fmt','yuv420p','-crf','19','-movflags','+faststart',path.join(out,'walk-and-sprint.mp4')]);
 Object.values(imgs).forEach(im=>im.dispose());font.dispose();face.dispose();disposeLighting();
 console.log('PASS: actual saved camp rendered with foliage in day/night, front/behind boot overlap, and walk/sprint video. This is software-renderer QA, not measured iPhone GPU performance.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}

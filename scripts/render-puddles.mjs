// Exercise the actual shared Skia renderer. Remote uploads are omitted only
// from this disposable QA scene, never from the user's saved world.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),sharp=require('sharp'),init=require('canvaskit-wasm'),exec=promisify(execFile),temp=fs.mkdtempSync(path.join(os.tmpdir(),'puddle-skia-')),out='docs/qa/terrain-puddles-v1';
try{
 await build({stdin:{contents:`export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';export * from './src/skia-adapter';export * from './src/world-assets';export * from './src/world-layout';export * from './src/imported-art';export * from './src/studio-play';export * from './src/placed-world-renderer';export * from './src/editor-image-sources';export * from './src/puddle-renderer';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'render.mjs')});
 const kit=await init({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)});globalThis.CanvasKit=kit;
 const m=await import(pathToFileURL(path.join(temp,'render.mjs'))),skia=m.JsiSkApi(kit),{SkiaContext,disposeLighting}=m.createSkiaAdapter(skia);
 m.installImportedArt(JSON.parse(fs.readFileSync('docs/qa/foliage-v3/artwork-before.json')).records);
 const layout=JSON.parse(fs.readFileSync(out+'/camp-after.json')).draft,imgs={},missing=new Set();
 for(const [key,url] of Object.entries({...m.EDITOR_IMAGE_SOURCES,...m.editorTerrainDetail(layout.terrainImage),...m.requiredImages(layout.items.map(p=>p.assetId),layout.terrainImage)})){
  const file='public'+url;if(!fs.existsSync(file)){missing.add(url);continue}const data=skia.Data.fromBytes(fs.readFileSync(file));imgs[key]=skia.Image.MakeImageFromEncoded(data);data.dispose();assert(imgs[key],url);
 }
 const unavailable=new Set(layout.items.filter(p=>Object.values(m.requiredImages([p.assetId])).some(url=>missing.has(url))).map(p=>p.id)),safe={...layout,items:layout.items.filter(p=>!unavailable.has(p.id))};let w=m.createCampPlaySession(safe);
 const fontData=skia.Data.fromBytes(fs.readFileSync('public/fonts/barlow-condensed-black.ttf')),face=skia.Typeface.MakeFreeTypeFaceFromData(fontData),font=skia.Font(face,20);fontData.dispose();
 const render=(width,height,x,y,zoom)=>{const view={x,y,zoom,follow:false,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:true},surface=skia.Surface.Make(width,height),ctx=new SkiaContext(surface.getCanvas(),width,height,font);m.drawWorldEditor(ctx,{},imgs,w,view);surface.flush();const shot=surface.makeImageSnapshot(),buffer=shot.encodeToBytes();shot.dispose();ctx.dispose();surface.dispose();return buffer};
 const still=async(name,...args)=>sharp(render(...args)).webp({quality:95}).toFile(out+'/'+name);
 await still('camp-overview.webp',1400,1400,1697,1697,.1856);
 const fire=layout.items.find(p=>p.role==='hearth');await still('fire-clearing.webp',1100,800,fire.x,fire.y+60,1.3);
 await still('south-walkway.webp',1000,1100,1740,2850,1.4);
 const water=safe.items.filter(p=>m.ASSET_BY_ID.get(p.assetId)?.puddle).sort((a,b)=>Math.hypot(a.x-2500,a.y-1650)-Math.hypot(b.x-2500,b.y-1650))[0],box=m.placementBounds(water);
 Object.assign(w.player,{x:water.x-box.width*.72,y:water.y,direction:'right',equipped:null});
 await still('puddle-calm.webp',1100,800,water.x,water.y,2.2);
 let splashFrame=false;for(let tick=0;tick<60;tick++){m.stepCampPlaySession(w,{x:1,y:0},true,false);if(!splashFrame&&w.puddleMotion.effects.some(e=>e.age>.1&&e.age<.2)){await still('puddle-splash.webp',1100,800,water.x,water.y,2.2);splashFrame=true}}
 assert(splashFrame,'Player crossed the actual camp puddle');
 const frames=path.join(temp,'frames');fs.mkdirSync(frames);let number=0;w=m.createCampPlaySession(safe);Object.assign(w.player,{x:water.x-box.width*.75,y:water.y,direction:'right',equipped:null});let contacts=0;
 for(let tick=0;tick<300;tick++){
  const input=tick<65?{x:1,y:0}:tick<125?{x:0,y:0}:tick<167?{x:-1,y:0}:{x:0,y:0};m.stepCampPlaySession(w,input,tick>=125&&tick<167,false);contacts+=w.puddleMotion.effects.filter(e=>e.age===0).length;
  if(tick%3===0)fs.writeFileSync(path.join(frames,String(number++).padStart(3,'0')+'.png'),render(844,600,water.x,water.y,2.2));
 }
 assert(contacts>=2);assert.equal(w.puddleMotion.effects.length,0);await exec('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate','20','-i',path.join(frames,'%03d.png'),'-c:v','libx264','-pix_fmt','yuv420p','-crf','18','-movflags','+faststart',out+'/puddle-walk-sprint.mp4']);
 Object.values(imgs).forEach(im=>im.dispose());font.dispose();face.dispose();disposeLighting();
 fs.writeFileSync(out+'/render-report.json',JSON.stringify({images:Object.keys(imgs).length,contacts,water:water.id,remotePlacementsOmitted:[...unavailable],limit:'Software Skia, no physical iPhone/browser performance measurement'},null,2)+'\n');console.log('PASS: actual renderer shows terrain, clearing, puddles and footstep effects; '+contacts+' contacts in walk/sprint clip. '+unavailable.size+' remote props omitted only in QA scene.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}

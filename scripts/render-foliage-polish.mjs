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
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'terrain-foliage-skia-')),out='docs/qa/foliage-v5';
fs.mkdirSync(out,{recursive:true});
try{
 await build({stdin:{contents:`export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';export * from './src/skia-adapter';export * from './src/world-assets';export * from './src/world-layout';export * from './src/imported-art';export * from './src/foliage-trial';export * from './src/camp-foliage';export * from './src/foliage-visibility';export * from './src/studio-play';export * from './src/placed-world-renderer';export * from './src/editor-image-sources';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'render.mjs')});
 const kit=await init({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)});globalThis.CanvasKit=kit;
 const m=await import(pathToFileURL(path.join(temp,'render.mjs'))),skia=m.JsiSkApi(kit),{SkiaContext,disposeLighting}=m.createSkiaAdapter(skia);
 const source=JSON.parse(fs.readFileSync('docs/qa/foliage-v3/camp-before.json')).draft;m.installImportedArt(JSON.parse(fs.readFileSync('docs/qa/foliage-v3/artwork-before.json')).records);
 const layout=m.refineApprovedCampFoliage(m.addApprovedCampFoliage(m.addApprovedTerrainFoliage(source))),fire=layout.items.find(p=>p.role==='hearth'),first=layout.items.filter(p=>p.id.startsWith(m.CAMP_FOLIAGE_PREFIX)&&p.x>200&&p.x<3100&&p.y>200&&p.y<3100&&!m.layoutBlocked(layout,p.x,p.y)).sort((a,b)=>Math.hypot(a.x-650,a.y-2600)-Math.hypot(b.x-650,b.y-2600))[0],imgs={},missing=new Set();
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
 let noOutline=false;const render=(width,height,x,y,zoom)=>{
  const view={x,y,zoom,follow:false,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:true};
  const surface=skia.Surface.Make(width,height),ctx=new SkiaContext(surface.getCanvas(),width,height,font);
  const outlineDraw=ctx.drawSpriteOutline.bind(ctx);let outlineCalls=0;ctx.drawSpriteOutline=(...args)=>{outlineCalls++;return outlineDraw(...args)};if(noOutline)ctx.drawSpriteOutline=undefined;m.drawWorldEditor(ctx,{},imgs,w,view);if(width===800&&!noOutline)assert.equal(outlineCalls,1,'Dense foliage draws one outline pass');surface.flush();const shot=surface.makeImageSnapshot(),buffer=shot.encodeToBytes();shot.dispose();ctx.dispose();surface.dispose();return buffer;
 };
 const still=async(name,...args)=>{const pixels=render(...args);if(name==='outline-idle.webp'||name==='outline-off.webp')fs.writeFileSync(path.join(out,name.replace('.webp','.png')),pixels);return sharp(pixels).webp({quality:94}).toFile(path.join(out,name))};
 Object.assign(w.player,{x:first.x+8,y:first.y+19,direction:'down-right',equipped:null});
 await still('camp-overview.webp',1400,1400,1697,1697,.1856);
 await still('dense-path-day.webp',1100,800,first.x,first.y,1.25);
 await still('bonfire-day.webp',1000,750,fire.x,fire.y+30,1.15);
 w.nightAmount=1;await still('dense-path-night.webp',1100,800,first.x,first.y,1.25);w.nightAmount=0;
 Object.assign(w.player,{x:first.x,y:first.y-10,direction:'down',moving:false});
 await still('boots-behind.webp',700,500,first.x-30,first.y-35,3);
 w.player.y=first.y+13;await still('boots-in-front.webp',700,500,first.x-30,first.y-35,3);
 const obscured=layout.items.filter(p=>p.id.startsWith(m.CAMP_FOLIAGE_PREFIX)&&p.x>100&&p.y>100&&p.x<3200&&p.y<3200).map(p=>({p,cover:m.foliagePlayerOcclusion(w.layout,{x:p.x,y:p.y-18})})).find(({cover})=>cover?.coverage>.8);
 assert(obscured,'A dense canopy covers the player');Object.assign(w.player,{x:obscured.p.x,y:obscured.p.y-18,direction:'down',moving:false});await still('outline-idle.webp',800,600,w.player.x,w.player.y-25,2.2);noOutline=true;await still('outline-off.webp',800,600,w.player.x,w.player.y-25,2.2);noOutline=false;
 w.player.moving=true;w.player.direction='down-right';w.player.walkDistance=46;w.player.walkBlend=1;await still('outline-walking.webp',800,600,w.player.x,w.player.y-25,2.2);
 w.nightAmount=1;await still('outline-night.webp',800,600,w.player.x,w.player.y-25,2.2);w.nightAmount=0;

 Object.assign(w.player,{x:first.x-180,y:first.y,direction:'right',equipped:null});
 const frames=path.join(temp,'frames');fs.mkdirSync(frames);let number=0;
 for(let tick=0;tick<180;tick++){
  const input=tick<53?{x:1,y:0}:tick<85?{x:0,y:0}:tick<133?{x:-1,y:0}:{x:0,y:0};m.stepCampPlaySession(w,input,tick>=85&&tick<133,false);
  if(tick%3)continue;fs.writeFileSync(path.join(frames,String(number++).padStart(3,'0')+'.png'),render(844,470,first.x,first.y,1.9));
 }
 await exec('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate','20','-i',path.join(frames,'%03d.png'),'-c:v','libx264','-pix_fmt','yuv420p','-crf','19','-movflags','+faststart',path.join(out,'walk-and-sprint.mp4')]);
 const [outlined,plain]=await Promise.all(['outline-idle.png','outline-off.png'].map(name=>sharp(out+'/'+name).ensureAlpha().raw().toBuffer()));let changed=0;for(let i=0;i<outlined.length;i+=4){if(Math.max(...[0,1,2].map(c=>Math.abs(outlined[i+c]-plain[i+c])))>3)changed++}assert(changed>150&&changed<4500,'Only a small animated silhouette edge is changed');
 const surface=skia.Surface.Make(120,120),ctx=new SkiaContext(surface.getCanvas(),120,120,font);ctx.fillStyle='#285932';ctx.fillRect(0,0,120,120);ctx.drawSpriteOutline(()=>{ctx.fillStyle='#f00';ctx.fillRect(40,40,40,40)},{x:10,y:10,width:100,height:100},.8,3);surface.flush();const snapshot=surface.makeImageSnapshot();fs.writeFileSync(out+'/outline-filter-test.png',snapshot.encodeToBytes());snapshot.dispose();ctx.dispose();surface.dispose();
 Object.values(imgs).forEach(im=>im.dispose());font.dispose();face.dispose();disposeLighting();
 fs.writeFileSync(out+'/render-report.json',JSON.stringify({total:layout.items.length,newPlants:layout.items.filter(p=>p.id.startsWith(m.CAMP_FOLIAGE_PREFIX)).length,remotePlacementsOmitted:[...unavailable],limit:'Software Skia; no browser/iPhone measurement.'},null,2)+'\n');
 console.log(`PASS: ${Object.keys(imgs).length} local images decoded; standalone terrain study rendered in day/night, boot overlap and walk/sprint views. ${unavailable.size} remote-upload placements omitted from this disposable QA scene only. Software Skia QA; no browser or device measurement.`);
}finally{fs.rmSync(temp,{recursive:true,force:true})}

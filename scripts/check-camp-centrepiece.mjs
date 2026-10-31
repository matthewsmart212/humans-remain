import {build} from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),sharp=require('sharp'),init=require('canvaskit-wasm');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'camp-centrepiece-')),out='docs/qa/bonfire-v3',cache='../camp-qa-cache';
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(cache,{recursive:true});
try{
 await build({stdin:{contents:`export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';export * from './src/skia-adapter';export * from './src/world-assets';export * from './src/world-layout';export * from './src/imported-art';export * from './src/camp-centrepiece';export * from './src/survival-engine';export * from './src/placed-world-renderer';export * from './src/terrain-renderer';export * from './src/editor-image-sources';export * from './src/worker-renderer';export * from './src/bonfire-food-renderer';export * from './src/camp-stations';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'test.mjs')});
 const m=await import(pathToFileURL(path.join(temp,'test.mjs'))),source=JSON.parse(fs.readFileSync('../current-camp-layout.json')).draft;
 m.installImportedArt(JSON.parse(fs.readFileSync('../current-camp-artwork.json')).records);
 const layout=m.addApprovedCampWell(source),well=layout.items.find(p=>p.id==='camp-centre-v1-oak-well'),hearth=layout.items.find(p=>p.role==='hearth');
 assert(well,'Well must be added to the actual current camp');assert.equal(layout.items.length,source.items.length+1);assert.deepEqual(layout.items.slice(0,-1),source.items,'All user placements are unchanged');assert.equal(m.addApprovedCampWell(layout),layout,'No duplicates on reload');assert.equal(m.addApprovedCampWell({...layout,items:layout.items.filter(p=>p!==well)}).items.length,source.items.length,'Removal remains removed');
 assert.deepEqual(m.validateLayout(layout).errors,[]);assert.equal(m.validateLayout(layout).layout.campCentreVersion,1);
 // Front access and a full walking circuit on the clearing. Only the bonfire core blocks.
 const b=m.placementBounds(hearth),rx=b.width*.8,ry=b.height*.57;
 for(let i=0;i<64;i++){const angle=i*Math.PI/32;assert(!m.layoutBlocked(layout,hearth.x+Math.cos(angle)*rx,hearth.y-35+Math.sin(angle)*ry,19),'Bonfire clearing has a continuous walkable circuit')}
 for(let y=well.y+150;y>=well.y+45;y-=5)assert(!m.layoutBlocked(layout,well.x,y,19),'Well front remains approachable');
 const w=m.createWorld(layout);w.editorPreview=true;Object.assign(w.player,{x:hearth.x,y:hearth.y+105});w.bag.rawMeat=2;w.loads=2;
 assert(m.doAction(w,'cook'));assert.equal(w.bag.rawMeat,1);assert.equal(w.loads,1);assert(w.fire.thrown);assert(!m.doAction(w,'cook'),'No duplicate cooking');
 w.tick=360;m.stepBonfireCooking(w);assert.equal(w.loot.filter(l=>l.kind==='cookedMeat').length,1);const meal=w.loot.find(l=>l.kind==='cookedMeat');assert(!m.worldBlocked(w,meal.x,meal.y,24));assert(!m.pickupTarget(w),'Flying food cannot be collected before landing');
 w.tick=400;Object.assign(w.player,{x:meal.x,y:meal.y+30});w.loads=6;assert(m.doAction(w,'pickup'),'Meal pocket works independently of full resource pack');assert.equal(w.cooked,1);assert.equal(w.loads,6);assert(!m.doAction(w,'pickup'),'Cannot collect the same meal twice');
 w.hunger=40;assert(m.doAction(w,'eat'));assert.equal(w.cooked,0);assert.equal(w.hunger,90);
 w.thirst=30;Object.assign(w.player,{x:well.x,y:well.y+65});assert(m.doAction(w,'drink'));assert.equal(w.thirst,100);
 const kit=await init({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)});globalThis.CanvasKit=kit;
 const skia=m.JsiSkApi(kit),{SkiaContext}=m.createSkiaAdapter(skia),imgs={};
 const fontData=skia.Data.fromBytes(fs.readFileSync('public/fonts/barlow-condensed-black.ttf')),face=skia.Typeface.MakeFreeTypeFaceFromData(fontData),font=skia.Font(face,20);fontData.dispose();
 const sources={...m.EDITOR_IMAGE_SOURCES,...m.editorTerrainDetail(layout.terrainImage),...m.requiredImages(layout.items.map(p=>p.assetId),layout.terrainImage)};
 for(const [key,url]of Object.entries(sources)){
  let file='public'+url;if(!fs.existsSync(file)){file=path.join(cache,encodeURIComponent(url));if(!fs.existsSync(file))execFileSync('curl',['--fail','--silent','--show-error','--max-time','45','https://safety-last.matthew-smart212.chatgpt.site'+url,'-o',file]);}
  const bytes=skia.Data.fromBytes(fs.readFileSync(file));imgs[key]=skia.Image.MakeImageFromEncoded(bytes);bytes.dispose();assert(imgs[key],`Image decoded: ${url}`);
 }
 const renderWorld=m.createWorld(layout);renderWorld.editorPreview=true;Object.assign(renderWorld.player,{x:hearth.x-180,y:hearth.y+115,direction:'up-right',equipped:null});
 const render=async(name,width,height,cx,cy,scale,tick=0)=>{const surface=skia.Surface.Make(width,height),ctx=new SkiaContext(surface.getCanvas(),width,height,font);renderWorld.tick=tick;ctx.fillStyle='#102e30';ctx.fillRect(0,0,width,height);ctx.save();ctx.translate(width/2,height/2);ctx.scale(scale,scale);ctx.translate(-cx,-cy);m.drawHomeTerrain(ctx,imgs,layout.terrainImage,layout.terrainBorder);m.drawPlacedGround(ctx,imgs,layout);const draws=[...m.placedDrawables(ctx,imgs,renderWorld,true),...m.bonfireFoodDrawables(ctx,imgs,renderWorld),{y:renderWorld.player.y,draw:()=>m.drawWorker(ctx,imgs,renderWorld)}];draws.sort(m.compareWorldDrawables).forEach(o=>o.draw());ctx.restore();surface.flush();ctx.dispose();const shot=surface.makeImageSnapshot(),buffer=shot.encodeToBytes();shot.dispose();surface.dispose();await sharp(buffer).webp({quality:94}).toFile(path.join(out,name));};
 await render('actual-camp.webp',1900,1700,1800,1540,.55);
 await render('bonfire-and-well.webp',1400,950,2020,1440,1);
 for(let i=0;i<8;i++)await render(`close-frame-${i}.webp`,600,600,hearth.x,hearth.y-25,1.5,i*6);
 fs.writeFileSync(path.join(out,'camp-layout.json'),JSON.stringify(layout,null,2)+'\n');
 fs.writeFileSync(path.join(out,'camp-verification.json'),JSON.stringify({result:'pass',existingPlacementsPreserved:source.items.length,well:{x:well.x,y:well.y,scale:well.scale},walkableClearing:true,wellApproach:true,cooking:'Raw meat consumed once; 6-second cook; safe ground drop; no airborne/duplicate pickup; separate meal capacity; edible meal',renderer:'Actual CanvasKit world renderer with current uploaded headquarters and walls'},null,2)+'\n');
 Object.values(imgs).forEach(im=>im.dispose());font.dispose();face.dispose();console.log('PASS: saved camp preserved; well placed and reachable; bonfire clearing walkable; cooking and collection verified; actual camp renders created.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}

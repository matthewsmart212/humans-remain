import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'hearth-animation-'));
try{
 const modules=['world-assets','world-layout','imported-art','hearth-animation-art','camp-restoration','placed-world-renderer','authored-world','studio-play','bonfire-food-renderer','editor-image-sources','food-items'];
 const out=path.join(temp,'check.cjs');
 await build({stdin:{contents:modules.map(m=>`export * from './src/${m}';`).join(''),resolveDir:process.cwd()},outfile:out,bundle:true,format:'cjs',platform:'node'});
 const game=createRequire(import.meta.url)(out),snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));
 game.installImportedArt(snapshot.records);
 const layout=game.prepareAuthoredWorld(snapshot.layout),p=layout.items.find(p=>p.role==='hearth'),asset=game.ASSET_BY_ID.get(p.assetId);
 const world=game.createCampPlaySession(layout,undefined,'survival');
 world.layout={...world.layout,items:[p]};
 const sources=game.requiredImages([p.assetId]),images=Object.fromEntries(Object.entries(sources).map(([key,src])=>[key,{src}]));
 const layers=Object.values(game.HEARTH_ANIMATION_IMAGES);
 const startup=Object.values(game.requiredImages([p.assetId],undefined,{animationFrames:false}));
 assert(startup.includes(asset.image)&&startup.includes(asset.unlit)&&layers.every(url=>!startup.includes(url)));
 assert(asset.frames.slice(1).every(url=>!Object.values(sources).includes(url)),'Gameplay must not decode the full editor filmstrip');
 assert(!game.hasPaintedHearthAnimation({...asset,frames:[...asset.frames.slice(0,7),'/api/asset-files/owner-frame']}));
 assert(!game.hasPaintedHearthAnimation({...asset,fps:5}),'Owner timing uses the ordinary sprite player');

 const calls=[];
 const ctx=new Proxy({drawImage:(...args)=>calls.push(args)},{get:(target,key)=>key in target?target[key]:()=>{}});
 function draw(textures=images){calls.length=0;game.placedDrawables(ctx,textures,world).forEach(o=>o.draw());return calls.map(([im])=>im.src)}
 assert.deepEqual(draw(),[game.BROKEN_CAMP_ART.fire]);
 world.progression.restoredBuildings=['headquarters','fire'];
 world.camp.hearth.fuel=0;assert.deepEqual(draw(),[asset.unlit]);
 world.camp.hearth.fuel=2;
 const rear=new Set(),front=new Map();
 for(let tick=0;tick<2160;tick++){
  world.tick=tick;assert.deepEqual(draw(),layers);
  rear.add(calls[1].slice(1,3).join(','));front.set(calls[2].slice(1,3).join(','),calls[2].slice(1));
 }
 assert.equal(rear.size,48);assert.equal(front.size,36);
 // Sample the decoded moving foreground inside the camera-facing timber, above the coal bed.
 // Sampling in hearth coordinates also catches a correct sheet drawn at the wrong offset.
 const kit=await createRequire(import.meta.url)('canvaskit-wasm')();
 const atlas=kit.MakeImageFromEncoded(fs.readFileSync('public'+game.HEARTH_ANIMATION_IMAGES.hearthFrontFire));
 const atlasWidth=atlas.width();
 const pixels=atlas.readPixels(0,0,{width:atlasWidth,height:atlas.height(),colorType:kit.ColorType.RGBA_8888,alphaType:kit.AlphaType.Unpremul,colorSpace:kit.ColorSpace.SRGB});
 const bounds=game.placementBounds(p);
 for(const [cx,cy] of [[758,775],[839,861]]){
  const coverage=[];
  for(const [sx,sy,sw,sh,dx,dy,dw,dh] of front.values()){
   let warm=0,samples=0;
   for(let y=cy-10;y<=cy+10;y+=4)for(let x=cx-15;x<=cx+15;x+=5){
    const px=Math.round(sx+(bounds.x+x/1254*bounds.width-dx)/dw*sw);
    const py=Math.round(sy+(bounds.y+y/1254*bounds.height-dy)/dh*sh);
    const i=4*(py*atlasWidth+px);samples++;
    if(pixels[i]>pixels[i+2]+50&&pixels[i+1]>76)warm+=pixels[i+3]/255;
   }
   coverage.push(warm/samples);
  }
  assert(Math.max(...coverage)>.25&&Math.max(...coverage)-Math.min(...coverage)>.12,'Live flame crosses and uncovers the near log face');
 }
 atlas.delete();
 for(const key of Object.keys(game.HEARTH_ANIMATION_IMAGES)){const partial={...images};delete partial[key];assert.deepEqual(draw(partial),[asset.image])}
 world.weather={...world.weather,reducedMotion:true};
 for(const tick of [0,31,900]){world.tick=tick;assert.deepEqual(draw(),[asset.image])}
 // Exercise the production Play preparation path. Pinned food cannot arrive later via streaming.
 const meals=[['chicken','bonfireRaw','bonfireCooked'],['rabbit','rabbitRaw','rabbitCooked'],['venison','venisonRaw','venisonCooked']];
 const native=fs.readFileSync('native/bundled-art.ts','utf8');
 for(const role of ['survivor','engineer','hunter']){
  const textures={};
  await game.prepareEditorMovement({loadImages:async()=>{},warmImages:async images=>{
   for(const [key,src] of Object.entries(images))textures[key]={src};
  }},layout,'foreground',p,role);
  const drawFood=()=>{calls.length=0;game.bonfireFoodDrawables(ctx,textures,world).forEach(d=>d.draw());return calls.map(([im])=>im.src)};
  world.tick=0;
  for(const [species,rawKey,cookedKey] of meals){
   const raw=textures[rawKey]?.src,cooked=textures[cookedKey]?.src,recipe=game.FOOD_RECIPES[species];
   assert(raw&&cooked,role+' has both cooking states for '+species);
   for(const url of [raw,cooked]){assert(fs.existsSync('public'+url));assert(native.includes(JSON.stringify(url)+':require("./../public'+url+'")'))}
   world.loot=[];world.fire.queue=[{species,remaining:recipe.seconds/2}];delete world.fire.thrown;
   assert.deepEqual(drawFood(),[raw,cooked],'Roasting combines both registered sprites');
   world.fire.queue=[];world.fire.thrown={species,from:p,born:0};assert.deepEqual(drawFood(),[raw],'Raw food thrown onto the spit');
   delete world.fire.thrown;world.loot=[{kind:recipe.cooked,x:p.x,y:p.y},{kind:recipe.raw,x:p.x,y:p.y}];
   assert.deepEqual(drawFood(),[cooked,raw],'Loose raw and cooked meals render on the ground');
  }
 }
 console.log('PASS: layered hearth, cold and ruined states, reduced motion, partial loading and custom artwork; all three meats render on the spit, in flight and on the ground for each role.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}

// Render the actual atlas through both installed Skia APIs. Pixel assertions
// catch invisible lighting, repeated opening bursts and reduced-motion drift.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'loot-chest-fx-'));
const previews=process.env.LOOT_CHEST_PREVIEW_DIR;
if(previews)fs.mkdirSync(previews,{recursive:true});
try{
 const results=[];
 for(const target of ['browser','native']){
  const skiaRoot=path.resolve(target==='native'?'native/node_modules/@shopify/react-native-skia':'node_modules/@shopify/react-native-skia');
  const out=path.join(temp,target+'.cjs');
  await build({stdin:{contents:`export * from './src/loot-chest-renderer';export * from './src/loot-chest-fx';export * from './src/loot-chest';export * from './src/camp-lighting';export * from './src/skia-adapter';export {JsiSkApi} from ${JSON.stringify(path.join(skiaRoot,'lib/module/skia/web/JsiSkia.js'))};`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:out,logLevel:'error'});
  const m=require(out),kitRequire=createRequire(path.join(skiaRoot,'package.json'));
  const kit=await kitRequire('canvaskit-wasm')({locateFile:f=>path.join(path.dirname(kitRequire.resolve('canvaskit-wasm')),f)}),api=m.JsiSkApi(kit);
  if(target==='native'){
   assert(api.PathBuilder,'Native uses immutable paths');
   const make=api.Path.Make.bind(api.Path);
   api.Path.Make=()=>new Proxy(make(),{get(object,key){if(['moveTo','lineTo','close','reset','addArc','addOval'].includes(key))throw Error('Removed native path mutation: '+String(key));return Reflect.get(object,key)}});
  }
  const adapter=m.createSkiaAdapter(api),font=api.Font(undefined,14),surface=api.Surface.Make(640,560);
  const data=api.Data.fromBytes(fs.readFileSync('public'+m.LOOT_CHEST_ATLAS)),atlas=api.Image.MakeImageFromEncoded(data);data.dispose();assert(atlas,'Approved chest atlas decodes');
  let terrain;
  const terrainFile='public/survival/world-ground-v3/clear-earth.webp';
  if(fs.statSync(terrainFile).size>200){const d=api.Data.fromBytes(fs.readFileSync(terrainFile));terrain=api.Image.MakeImageFromEncoded(d);d.dispose()}
  const imgs={[m.LOOT_CHEST_IMAGE_KEY]:atlas},viewport={x:0,y:0,width:640,height:560};
  const world={layout:{items:[]},camp:{hearth:{x:320,y:705}},player:{x:320,y:510},enemies:[],tick:90,phase:'day',weather:{reducedMotion:false}};
  const render=(name,mode='fx')=>{
   const ctx=new adapter.SkiaContext(surface.getCanvas(),640,560,font);
   ctx.fillStyle='#b67835';ctx.fillRect(0,0,640,560);
   if(terrain)ctx.drawImage(terrain,0,0,terrain.width(),terrain.height(),0,0,640,560);
   if(mode==='art'){
    const f=m.lootChestFrame(world);ctx.drawImage(atlas,f%5*440,Math.floor(f/5)*390,440,390,200,242,240,213);
   }else if(mode==='fx')m.lootChestDrawables(ctx,imgs,world,viewport).forEach(o=>o.draw());
   if(world.phase==='night')m.drawCampLighting(ctx,world,viewport);
   surface.flush();const image=surface.makeImageSnapshot(),pixels=image.readPixels();assert(pixels);
   if(previews&&name)fs.writeFileSync(path.join(previews,target+'-'+name+'.png'),Buffer.from(image.encodeToBytes()));
   image.dispose();ctx.dispose();return pixels;
  };
  const difference=(a,b)=>{let count=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>5)count++;return count};
  const lightGain=(a,b)=>{let sum=0;for(let i=0;i<a.length;i+=4)sum+=Math.max(0,b[i]-a[i])+Math.max(0,b[i+1]-a[i+1])+Math.max(0,b[i+2]-a[i+2]);return sum};
  const regionGain=(a,b,left,top,width,height)=>{
   let sum=0;for(let y=top;y<top+height;y++)for(let x=left;x<left+width;x++){
    const i=(y*640+x)*4;sum+=(b[i]-a[i])*.2126+(b[i+1]-a[i+1])*.7152+(b[i+2]-a[i+2])*.0722;
   }return sum/(width*height);
  };
  const art=render('art','art'),closed=render('closed');
  const changed=difference(art,closed);assert(changed>14000,'Closed aura is visible on bright ground');
  world.tick=150;const moving=render('closed-later');assert(difference(closed,moving)>2000,'Closed motes and light visibly breathe');
  assert.equal(m.lootChestFx(world).burst,0,'Unopened late-run chest never plays an opening burst');
  world.lootChests={[m.LOOT_CHEST_ID]:{openedAt:150,rewardVersion:2,contents:{repairHammer:1,woodenAxe:1,woodenPickaxe:1}}};
  world.tick=174;render('charging');assert(m.lootChestFx(world).charge>.6);assert.equal(m.lootChestFrame(world),2);
  world.tick=191;const reveal=render('burst');assert.equal(m.lootChestFrame(world),3);assert(m.lootChestFx(world).burst>.7,'Burst coincides with the first actual lid gap');
  world.tick=258;const open=render('open');assert.equal(m.lootChestFrame(world),9);assert(difference(closed,open)>20000);
  world.phase='night';world.nightAmount=1;render('night-open');world.phase='day';world.nightAmount=0;
  for(let pose=3;pose<=9;pose++){
   world.tick=150+pose*12;assert.equal(m.lootChestFx(world).frame,pose);
   render('pose-'+pose);
  }
  world.tick=15000;assert(m.lootChestFx(world).burst<.0001,'Saved opened chest never repeats its one-shot reveal');
  const persistentOpen=render('persistent-open'),openArt=render('open-art','art');
  // These fixed pixel regions sit on the ACTUAL raised inner face and upper
  // rail in frame 9. The previous glow lit the cavity while leaving both dark.
  const lidGain=regionGain(openArt,persistentOpen,285,278,70,24);
  const rimGain=regionGain(openArt,persistentOpen,265,259,115,12);
  assert(lidGain>32,'Light must remain visible across the upper inside of a fully raised lid');
  assert(rimGain>10,'The upper rail catches the light, not only the compartment below');
  world.phase='night';world.nightAmount=1;
  const nightArt=render(null,'art'),nightLid=render('persistent-night-open');
  assert(regionGain(nightArt,nightLid,285,278,70,24)>24,'Night shading preserves the reflected lid light');
  world.phase='day';world.nightAmount=0;
  world.lootChests[m.LOOT_CHEST_ID].contents={repairHammer:0,woodenAxe:0,woodenPickaxe:0};const empty=render('empty');
  assert(lightGain(art,empty)<lightGain(art,open),'Claimed chest settles to a much quieter light');
  world.weather.reducedMotion=true;
  for(const opened of [false,true]){
   world.lootChests=opened?{[m.LOOT_CHEST_ID]:{openedAt:0,rewardVersion:2,contents:{repairHammer:1}}}:undefined;
   world.tick=1000;const a=render(opened?'reduced-open':'reduced-closed');world.tick=1100;const b=render();
   assert.equal(difference(a,b),0,'Reduced-motion particles, light and glints stay still');
   assert.equal(m.lootChestFx(world).burst,0);
   if(!opened){world.phase='night';world.nightAmount=1;render('night-closed');world.phase='day';world.nightAmount=0}
  }
  assert.equal(m.lootChestDrawables({},imgs,world,{x:4000,y:4000,width:100,height:100}).length,0,'Offscreen chest does no GPU work');
  assert.equal(m.lootChestDrawables({},imgs,world,{x:250,y:130,width:140,height:20}).length,1,'Cull bounds include the tips of tall opening shafts');
  assert.equal(m.lootChestDrawables({},imgs,{...world,scene:{}},viewport).length,0,'Camp chest never appears in another scene');
  // Glow, sprite and sparks share one depth key, so a player standing in front
  // occludes the entire effect rather than having a beam painted over their head.
  assert.deepEqual(m.lootChestDrawables({},imgs,world,viewport).map(d=>d.y),[420]);
  atlas.dispose();terrain?.dispose();surface.dispose();font.dispose();adapter.disposeLighting();
  results.push({target,version:JSON.parse(fs.readFileSync(path.join(skiaRoot,'package.json'))).version,closedEffectPixels:changed,lidBrightnessGain:+lidGain.toFixed(1),topRailBrightnessGain:+rimGain.toFixed(1),realTerrain:!!terrain});
 }
 console.log(JSON.stringify({passed:true,results,checks:['shader compilation','approved atlas','visible daylight glow','moving idle particles','sprite-synchronised reveal','all raised-lid poses','persistent reflected lid and upper-rail light','night reflections','persistent opened state','quiet empty state','steady reduced motion','offscreen culling','shared depth ordering','resource disposal'],physicalIPhoneTested:false},null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}

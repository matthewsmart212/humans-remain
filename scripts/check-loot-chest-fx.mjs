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
  await build({stdin:{contents:`export * from './src/loot-chest-renderer';export * from './src/loot-chest-rig';export * from './src/loot-chest-fx';export * from './src/loot-chest';export * from './src/camp-lighting';export * from './src/skia-adapter';export {JsiSkApi} from ${JSON.stringify(path.join(skiaRoot,'lib/module/skia/web/JsiSkia.js'))};`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:out,logLevel:'error'});
  const m=require(out),kitRequire=createRequire(path.join(skiaRoot,'package.json'));
  const kit=await kitRequire('canvaskit-wasm')({locateFile:f=>path.join(path.dirname(kitRequire.resolve('canvaskit-wasm')),f)}),api=m.JsiSkApi(kit);
  if(target==='native'){
   assert(api.PathBuilder,'Native uses immutable paths');
   const make=api.Path.Make.bind(api.Path);
   api.Path.Make=()=>new Proxy(make(),{get(object,key){if(['moveTo','lineTo','close','reset','addArc','addOval'].includes(key))throw Error('Removed native path mutation: '+String(key));return Reflect.get(object,key)}});
  }
  const adapter=m.createSkiaAdapter(api),font=api.Font(undefined,14),surface=api.Surface.Make(640,560);
  const data=api.Data.fromBytes(fs.readFileSync('public'+m.LOOT_CHEST_ATLAS)),atlas=api.Image.MakeImageFromEncoded(data);data.dispose();assert(atlas,'Approved chest atlas decodes');
  const groundData=api.Data.fromBytes(fs.readFileSync('public'+m.LOOT_CHEST_GROUND)),ground=api.Image.MakeImageFromEncoded(groundData);groundData.dispose();assert(ground,'Transparent chest footing decodes');
  let terrain;
  const terrainFile='public/survival/world-ground-v3/clear-earth.webp';
  if(fs.statSync(terrainFile).size>200){const d=api.Data.fromBytes(fs.readFileSync(terrainFile));terrain=api.Image.MakeImageFromEncoded(d);d.dispose()}
  const imgs={[m.LOOT_CHEST_IMAGE_KEY]:atlas,[m.LOOT_CHEST_GROUND_KEY]:ground},viewport={x:0,y:0,width:640,height:560};
  const world={layout:{items:[]},camp:{hearth:{x:320,y:705}},player:{x:320,y:510},breakables:[],enemies:[],tick:90,phase:'day',weather:{reducedMotion:false}};
  const chest=m.campLootChest(world);
  for(const side of [-1,1]){
   assert(m.lootChestBlocked(world,chest.x+side*74,chest.y-15,1),'Both ends of the painted case block feet');
   assert(!m.lootChestBlocked(world,chest.x+side*106,chest.y-15,19),'Survivor clears the outer skid');
  }
  assert(!m.lootChestBlocked(world,chest.x,chest.y+23,19),'Ground in front of the skids is walkable');
  const render=(name,mode='fx')=>{
   const ctx=new adapter.SkiaContext(surface.getCanvas(),640,560,font);
   ctx.fillStyle='#b67835';ctx.fillRect(0,0,640,560);
   if(terrain)ctx.drawImage(terrain,0,0,terrain.width(),terrain.height(),0,0,640,560);
   if(mode==='rig'){
    ctx.save();ctx.translate(320,420);ctx.scale(m.CHEST_WIDTH_SCALE,1);m.drawChestRig(ctx,atlas,world,0,0);ctx.restore();
   }else{
    if(mode==='fx'||mode==='ground')m.drawLootChestGround(ctx,imgs,world,viewport);
    if(mode==='fx')m.lootChestDrawables(ctx,imgs,world,viewport).forEach(o=>o.draw());
   }
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
  const terrainOnly=render(null,'terrain'),groundOnly=render('footing','ground');
  assert(difference(terrainOnly,groundOnly)>500,'Authored footing visibly beds the chest into the terrain');
  assert(regionGain(terrainOnly,groundOnly,250,420,24,6)<0,'Ground darkens where the left chest foot meets the terrain');
  assert(regionGain(terrainOnly,groundOnly,358,420,24,6)<0,'Ground darkens where the right chest foot meets the terrain');
  for(let y=0;y<560;y++)for(let x=0;x<640;x++)if(x<212||x>=428||y<396||y>=446){
   const i=(y*640+x)*4;for(let c=0;c<4;c++)assert.equal(groundOnly[i+c],terrainOnly[i+c],'Footing remains a small local terrain detail');
  }
  const closedHinge=m.chestHinge(world);
  assert(Math.abs(closedHinge.front-closedHinge.back-24*1.18)<1e-6,'Closed lid is 18 percent deeper');
  const art=render('art','rig'),closed=render('closed');
  const changed=difference(art,closed);assert(changed>14000,'Closed aura is visible on bright ground');
  world.tick=150;const moving=render('closed-later');assert(difference(closed,moving)>100,'Closed motes and light visibly breathe');
  assert.equal(m.lootChestFx(world).burst,0,'Unopened late-run chest never plays an opening burst');
  world.player.hp=100;
  assert.equal(m.openLootChest(world),true);
  assert.equal(m.LOOT_CHEST_OPEN_TICKS/60,.9,'Lid animation takes exactly half the previous 1.8 seconds');
  assert.equal(world.rareCacheMenuAt,213,'Opening and reveal hold together are halved to 1.05 seconds');
  for(const [age,frame] of [[0,0],[5,0],[6,1],[12,2],[18,3],[27,4],[48,8],[53,8],[54,9]]){
   world.tick=150+age;assert.equal(m.lootChestFrame(world),frame,'Faster sprite pose at tick '+age);
  }
  world.tick=212;m.stepLootChest(world);assert.equal(world.stationPanel,undefined,'Loot menu waits for the lid and short reveal');
  world.tick=213;m.stepLootChest(world);assert.equal(world.stationPanel,'rare-cache','Menu opens immediately after the faster reveal');
  assert.equal(m.lootChestFrame(world),9);world.stationPanel=undefined;
  world.tick=162;render('charging');assert(m.lootChestFx(world).charge>.6);assert.equal(m.lootChestFrame(world),2);
  world.tick=171;const reveal=render('burst');assert.equal(m.lootChestFrame(world),3);assert(m.lootChestFx(world).burst>.7,'Burst coincides with the first actual lid gap');
  world.tick=204;const open=render('open');assert.equal(m.lootChestFrame(world),9);assert(difference(closed,open)>20000);
  world.phase='night';world.nightAmount=1;render('night-open');world.phase='day';world.nightAmount=0;
  for(let pose=3;pose<=9;pose++){
   world.tick=150+pose*6;assert.equal(m.lootChestFx(world).frame,pose);
   render('pose-'+pose);
  }
  world.tick=150;const fixedBase=render('rig-closed','rig');
  for(const age of [1,6,12,18,24,30,36,42,48,54]){
   world.tick=150+age;const pose=render('rig-'+age,'rig');
   for(let y=367;y<450;y++)for(let x=205;x<435;x++){
    const offset=(y*640+x)*4;
    for(let c=0;c<4;c++)assert.equal(pose[offset+c],fixedBase[offset+c],'Body pixels stay identical while only the lid moves');
   }
  }
  world.tick=15000;assert(m.lootChestFx(world).burst<.0001,'Saved opened chest never repeats its one-shot reveal');
  const persistentOpen=render('persistent-open'),openArt=render('open-art','rig');
  // Measure the same parts of the surface in each pose against the unlit art.
  const hinge=m.chestHinge(world),lidTop=Math.round(420+hinge.front),lidRise=hinge.back-hinge.front;
  assert(lidRise>=64&&lidRise<=70,'Fully open lid has a lower profile while the closed lid stays deep');
  const upperLid=Math.round(lidTop+lidRise*.28),lidSampleHeight=Math.round(lidRise*.22);
  const lidGain=regionGain(openArt,persistentOpen,285,upperLid,70,lidSampleHeight);
  const rimGain=regionGain(openArt,persistentOpen,270,lidTop,100,10);
  assert(lidGain>18,'Light must remain visible across the upper inside of a fully raised lid');
  assert(rimGain>5,'The upper rail catches the light, not only the compartment below');
  const lidMiddle=Math.round(lidTop+lidRise*.46);
  const nearHinge=Math.round(lidTop+lidRise*.75);
  const lidMiddleGain=regionGain(openArt,persistentOpen,316,lidMiddle,8,8);
  assert(regionGain(openArt,persistentOpen,259,lidMiddle,8,8)>lidMiddleGain*.35,'Reflection reaches the left side of the inner lid');
  assert(regionGain(openArt,persistentOpen,373,lidMiddle,8,8)>lidMiddleGain*.35,'Reflection reaches the right side of the inner lid');
  const mouthMiddle=Math.round(420+(m.CHEST_MOUTH_BACK+m.CHEST_MOUTH_FRONT)/2);
  const compartmentGain=regionGain(openArt,persistentOpen,300,mouthMiddle-4,40,8);
  const frontLipGain=regionGain(openArt,persistentOpen,285,Math.round(420+m.CHEST_MOUTH_FRONT),70,3);
  assert(compartmentGain>frontLipGain*2,'Light originates inside the compartment without a flat white front rim');
  assert(regionGain(openArt,persistentOpen,255,mouthMiddle-4,8,8)>compartmentGain*.3,'Light reaches the left side of the compartment');
  assert(regionGain(openArt,persistentOpen,375,mouthMiddle-4,8,8)>compartmentGain*.3,'Light reaches the right side of the compartment');
  assert(regionGain(openArt,persistentOpen,285,nearHinge,70,8)>regionGain(openArt,persistentOpen,285,upperLid,70,8),'Warm reflection is strongest near the hinges');
  // In the air above the lid, a filled soft glow replaces the three narrow
  // bright prongs. Subtract the actual terrain and average out its grain.
  const profile=[];
  for(let x=230;x<410;x++)profile.push(Math.max(0,regionGain(openArt,persistentOpen,x,211,1,8)));
  const peak=Math.max(...profile),coverage=profile.filter(n=>n>peak*.45).length/profile.length;
  assert(regionGain(openArt,persistentOpen,230,211,180,8)<20,'Restrained haze keeps the silhouette and nearby artwork clear');
  world.tick+=30;const flowing=render('open-flowing');
  assert(difference(persistentOpen,flowing)>1000,'Open mist and embers remain visibly alive');
  world.phase='night';world.nightAmount=1;
  const nightArt=render(null,'rig'),nightLid=render('persistent-night-open');
  assert(regionGain(nightArt,nightLid,285,upperLid,70,lidSampleHeight)>12,'Night shading preserves the reflected lid light');
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
  assert.equal(m.lootChestDrawables({},imgs,world,{x:250,y:130,width:140,height:20}).length,1,'Cull bounds include the drifting glow and high sparks');
  assert.equal(m.lootChestDrawables({},imgs,{...world,scene:{}},viewport).length,0,'Camp chest never appears in another scene');
  // Glow, sprite and sparks share one depth key, so a player standing in front
  // occludes the entire effect rather than having a beam painted over their head.
  assert.deepEqual(m.lootChestDrawables({},imgs,world,viewport).map(d=>d.y),[420]);
  const groundCalls=[];
  m.drawLootChestGround({
   save(){groundCalls.push('save')},restore(){groundCalls.push('restore')},
   drawImage(){groundCalls.push('image')},fillRect(){groundCalls.push('shadow')},
   translate(){},scale(){},createRadialGradient(){return {addColorStop(){}}},
  },imgs,world,viewport);
  assert.deepEqual(groundCalls,['save','image','shadow','restore'],'Ground contact draws one decal and shadow, then restores canvas state');
  assert.doesNotThrow(()=>m.drawLootChestGround({},imgs,world,{x:4000,y:4000,width:100,height:100}),'Offscreen footing does no drawing');
  assert.doesNotThrow(()=>m.drawLootChestGround({},imgs,{...world,scene:{}},viewport),'Footing never appears in another scene');
  const sceneryData=api.Data.fromBytes(fs.readFileSync('public/survival/patch-v6/scenery.webp'));
  const scenery=api.Image.MakeImageFromEncoded(sceneryData);sceneryData.dispose();assert(scenery);
  imgs.patchScenery=scenery;
  const delivery=world.lootChests[m.LOOT_CHEST_ID];
  delivery.contents={repairHammer:1,pallets:2,scrap:2};
  const ordinary=render();
  world.patchQuest={suppliesDelivered:true};
  const wrapped=render('delivered-parcel');
  assert(difference(ordinary,wrapped)>400,'Delivered supplies are visible inside the open well');
  delivery.contents.pallets=0;
  assert.equal(difference(wrapped,render()),0,'Parcel remains while scrap is unclaimed');
  delivery.contents.scrap=0;
  assert.equal(difference(ordinary,render()),0,'Collecting both supplies clears the parcel');
  delivery.openedAt=world.tick;const noCorner=render();
  delivery.contents.pallets=1;
  const corner=difference(noCorner,render('delivered-paper-corner'));
  assert(corner>12&&corner<400,'A small paper corner shows beneath the closed lid');
  scenery.dispose();
  atlas.dispose();ground.dispose();terrain?.dispose();surface.dispose();font.dispose();adapter.disposeLighting();
  results.push({target,version:JSON.parse(fs.readFileSync(path.join(skiaRoot,'package.json'))).version,openingSeconds:m.LOOT_CHEST_OPEN_TICKS/60,glowCoverage:+coverage.toFixed(3),closedEffectPixels:changed,lidBrightnessGain:+lidGain.toFixed(1),topRailBrightnessGain:+rimGain.toFixed(1),realTerrain:!!terrain});
 }
 console.log(JSON.stringify({passed:true,results,checks:['shader compilation','approved atlas','transparent local ground footing','deep closed chest and low-profile open lid','visible daylight glow','moving idle particles','twice-as-fast opening and menu reveal','sprite-synchronised burst','continuous hinged lid','identical stationary body pixels','persistent light across the compartment, inner lid and upper rail','restrained glow without broad haze','flowing open mist','night reflections','persistent opened state','quiet empty state','steady reduced motion','offscreen culling','shared depth ordering','resource disposal'],physicalIPhoneTested:false},null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}

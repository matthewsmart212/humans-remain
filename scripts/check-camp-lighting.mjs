import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'camp-lighting-'));
const originalFetch=globalThis.fetch,originalStorage=globalThis.localStorage;
try{
 await build({stdin:{contents:`export * from './src/world-assets';export * from './src/camp-lighting';export * from './src/night-lighting-skia';export * from './src/world-layout';export * from './src/imported-art';export * from './src/survival-engine';export * from './src/studio-play';export * from './src/skia-web';export * from './src/placed-world-renderer';export * from './src/world-scenes';export * from './src/editor-image-sources';export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=require(path.join(temp,'model.cjs'));
 const [artPath,layoutPath,qaDir]=process.argv.slice(2);
 if(artPath)m.installImportedArt(JSON.parse(fs.readFileSync(artPath)).records);
 const layout=layoutPath?JSON.parse(fs.readFileSync(layoutPath)).draft:{...m.emptyLayout(),items:[m.newPlacement('base_hearth_t1',1500,1400)]};
 const before=JSON.stringify(layout),world=m.createWorld(layout),fire=layout.items.find(p=>p.role==='hearth');assert(fire);
 const store=new Map();globalThis.localStorage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
 assert.equal(m.readTimeOfDay(),'day');m.rememberTimeOfDay('night');assert.equal(m.readTimeOfDay(),'night');store.clear();
 globalThis.localStorage={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};assert.equal(m.readTimeOfDay(),'day');m.rememberTimeOfDay('night');
 let calls=0;m.drawCampLighting({drawNightLighting(){calls++}},world,{x:0,y:0,width:3000,height:3000});assert.equal(calls,0,'Day has no lighting draw');
 m.setWorldTimeOfDay(world,'night');assert.equal(m.nightStrength(world),0,'Toggle begins without a brightness jump');
 let strength=0;for(let i=0;i<60;i++){m.stepCampLighting(world,1/60);const next=m.nightStrength(world);assert(next>=strength);strength=next}assert.equal(strength,1);
 m.setWorldTimeOfDay(world,'day');assert.equal(m.nightStrength(world),1);m.stepCampLighting(world,1/60);assert(m.nightStrength(world)<1);m.setWorldTimeOfDay(world,'night');const partial=m.nightStrength(world);m.stepCampLighting(world,0);assert.equal(m.nightStrength(world),partial,'Hidden tabs do not advance the fade');
 m.setWorldTimeOfDay(world,'night',true);
 const lights=m.campLights(world);assert.equal(lights.length,layout.items.filter(p=>p.role==='hearth').length);assert.equal(m.campLights(world),lights,'Static geometry is reused');
 let nearLights,farLights;m.drawCampLighting({drawNightLighting(l){nearLights=l}},world,{x:1000,y:1000,width:800,height:400});m.drawCampLighting({drawNightLighting(l){farLights=l}},world,{x:10000,y:10000,width:800,height:400});assert.equal(nearLights,farLights,'Ordinary camp camera travel never invalidates the cached light field');
 assert(m.placedFireLit(world,fire));world.camp.hearth.fuel=0;assert.equal(m.campLights(world).length,0);assert(!m.placedFireLit(world,fire));world.camp.hearth.fuel=1;assert.equal(m.campLights(world),lights);
 assert.equal(m.visibleCampLights(lights,{x:100000,y:100000,width:800,height:400}).length,0);
 const dense=Array.from({length:40},(_,i)=>({x:i,y:0,radius:1000,strength:1}));assert.equal(m.visibleCampLights(dense,{x:0,y:0,width:800,height:400}).length,m.MAX_NIGHT_LIGHTS);
 for(const rotation of [0,37,90,231])for(const flipX of [false,true])for(const flipY of [false,true]){
  const p={...fire,rotation,flipX,flipY,scale:.8},w=m.createWorld({...layout,items:[p]}),b=m.placementBounds(p),[x,y]=m.placementPoint(p,b.x+b.width*.5,b.y+b.height*.72),[light]=m.campLights(w);
  assert.equal(light.x,x);assert.equal(light.y,y);assert.equal(light.radius,Math.max(200,b.width*5));
 }
 const old=m.ASSET_BY_ID.get(fire.assetId);m.ASSET_BY_ID.set(fire.assetId,{...old,width:old.width*1.1});assert.notEqual(m.campLights(world),lights,'Replacing shared artwork invalidates light geometry');m.ASSET_BY_ID.set(fire.assetId,old);
 const room=m.createWorld(m.emptyLayout());room.scene=m.BUNKER_SCENE;m.setWorldTimeOfDay(room,'night',true);assert.equal(m.nightStrength(room),0);m.drawCampLighting({drawNightLighting(){calls++}},room,{x:0,y:0,width:1254,height:1254});assert.equal(calls,0,'Baked indoor illumination is not darkened');

 console.log('PASS: lighting state, geometry, culling, fire state and indoor isolation.');
 // Exercise the actual compiled shader and premultiplied paint, not a mocked gradient.
 const init=require('canvaskit-wasm'),kit=await init({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)});globalThis.CanvasKit=kit;
 const skia=m.JsiSkApi(kit),lighting=m.createNightLighting(skia),surface=skia.Surface.Make(844,390),canvas=surface.getCanvas(),view={x:0,y:0,width:844,height:390},source=[{x:260,y:190,radius:270,strength:1}];
 console.log('CanvasKit cached light field initialized.');
 const paint=(sources=source,amount=1,transform,warningLights=[])=>{canvas.clear(skia.Color('#ffffff'));canvas.save();if(transform){canvas.scale(transform.zoom,transform.zoom);canvas.translate(-transform.x,-transform.y)}lighting.draw(canvas,sources,amount,view,undefined,warningLights);canvas.restore();surface.flush();const im=surface.makeImageSnapshot(),pixels=im.readPixels();im.dispose();return(x,y)=>Array.from(pixels.slice((y*844+x)*4,(y*844+x)*4+4))};
 const luminance=p=>p[0]*.2126+p[1]*.7152+p[2]*.0722;
 const day=paint(source,0);assert.deepEqual(day(260,190),[255,255,255,255]);
 const night=paint(),levels=[0,50,120,200,270,340].map(d=>luminance(night(260+d,190)));
 assert(levels[0]>235);assert(levels.at(-1)<50);for(let i=1;i<levels.length;i++)assert(levels[i]<=levels[i-1]);
 const near=night(260,190),far=night(800,190);assert(near[0]>near[2],'Fire light is warm');assert(far[2]>far[0],'Unlit ground has a cool night tint');
 assert(Math.abs(luminance(night(529,190))-luminance(night(531,190)))<2,'Falloff joins the darkness without a visible rim');
 const overlapping=paint([...source,{x:400,y:190,radius:270,strength:1}]);assert(luminance(overlapping(380,190))>=luminance(night(380,190)),'Overlapping fires cannot darken one another');
 const unlit=paint([]);assert.deepEqual(unlit(260,190),unlit(800,190),'Extinguishing the fire removes its light');
 const half=paint([],0.5);assert(luminance(half(260,190))>luminance(unlit(260,190)));assert(luminance(half(260,190))<255);
 const moved=paint(source,1,{zoom:1.25,x:100,y:50});assert(Math.abs(luminance(moved(200,175))-luminance(near))<2,'Camera zoom/pan keeps the glow attached to the same world point');

 const warning=[{x:260,y:190,radius:110,strength:.42}],local=paint([],1,undefined,warning);
 assert(luminance(local(260,190))>luminance(unlit(260,190))+35,'Bomber light reveals nearby ground');
 assert(local(260,190)[0]>local(260,190)[2],'Bomber spill is red rather than blue night tint');
 assert.deepEqual(local(500,190),unlit(500,190),'Bomber light remains local');
 assert.deepEqual(paint([],0,undefined,warning)(260,190),[255,255,255,255],'Day ground is unaffected');
 const cached=lighting.shaderBuilds;
 for(let i=0;i<20;i++)paint([],1,undefined,[{...warning[0],x:260+i*4}]);
 assert.equal(lighting.shaderBuilds,cached,'Moving warning lights do not rebuild the camp lightmap');
 const gone=paint([]);assert.deepEqual(gone(260,190),unlit(260,190),'Removing bomber immediately removes local light');
 console.log('PASS: rendered pixels, soft falloff, fire off, overlap and camera alignment.');
 lighting.draw(canvas,source,1,view);const count=lighting.shaderBuilds;
 const started=performance.now();for(let i=0;i<120;i++){lighting.draw(canvas,source,.5+i/240,{...view,x:i*.01});surface.flush()}const milliseconds=(performance.now()-started)/120;
 assert.equal(lighting.shaderBuilds,count,'Camera, fire-animation ticks and fade reuse the compiled light shader');lighting.draw(canvas,[],1,view);assert.equal(lighting.shaderBuilds,count+1);lighting.dispose();lighting.dispose();surface.dispose();

 console.log('PASS: lighting cache reused across 120 camera frames.');
 if(artPath&&layoutPath&&qaDir){
  fs.mkdirSync(qaDir,{recursive:true});globalThis.devicePixelRatio=1;
  globalThis.fetch=async url=>new Response(fs.readFileSync(String(url).startsWith('/api/asset-files/')?path.join(qaDir,path.basename(String(url))+'.image'):path.resolve('public'+String(url))));
  let rawSurface;kit.MakeSWCanvasSurface=c=>(rawSurface=kit.MakeSurface(c.width,c.height));
  const target={width:0,height:0,clientWidth:1440,clientHeight:1100,dataset:{}},camera={x:1800,y:1700,zoom:.27,follow:false,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:true};
  const r=await m.createWebWorld(target,(ctx,atlas,imgs,w)=>m.drawWorldEditor(ctx,atlas,imgs,w,camera),{...m.requiredImages(layout.items.map(p=>p.assetId),layout.terrainImage),...m.editorTerrainDetail(layout.terrainImage)},{sources:m.EDITOR_IMAGE_SOURCES});
  const show=m.createWorld(layout);show.editorPreview=true;show.tick=60;Object.assign(show.player,{x:fire.x-175,y:fire.y+85,direction:'up-right'});
  const shot=(name,time,fuel=180)=>{m.setWorldTimeOfDay(show,time,true);show.camp.hearth.fuel=fuel;r.draw(show);const im=rawSurface.makeImageSnapshot();fs.writeFileSync(path.join(qaDir,name),Buffer.from(im.encodeToBytes()));im.delete()};
  shot('camp-day.png','day');shot('camp-night.png','night');shot('camp-fire-out.png','night',0);
  target.clientWidth=844;target.clientHeight=390;Object.assign(camera,{x:fire.x,y:fire.y-80,zoom:.8});shot('camp-night-landscape.png','night');shot('camp-day-landscape.png','day');
  const snapshot=()=>{const im=rawSurface.makeImageSnapshot(),bytes=Buffer.from(im.encodeToBytes());im.delete();return bytes};
  show.scene=m.BUNKER_SCENE;show.layout=m.emptyLayout();Object.assign(show.player,m.BUNKER_SCENE.spawns.stairs);Object.assign(camera,{follow:true,zoom:1});await r.loadImages({[m.BUNKER_SCENE.terrain.key]:m.BUNKER_SCENE.terrain.url});
  m.setWorldTimeOfDay(show,'day',true);r.draw(show);const indoorDay=snapshot();m.setWorldTimeOfDay(show,'night',true);r.draw(show);assert(indoorDay.equals(snapshot()),'The entire indoor render stays unchanged when outdoor time switches');
  r.dispose();r.dispose();
  fs.writeFileSync(path.join(qaDir,'lighting-results.json'),JSON.stringify({result:'pass',placements:layout.items.length,lightCount:lights.length,light:lights[0],falloffLuminance:levels,stableShaderBuilds:count,softwareOverlayMilliseconds:milliseconds,deviceFPSMeasured:false},null,2)+'\n');
 }
 assert.equal(JSON.stringify(layout),before,'Lighting must not change any placed objects or saved draft data');
 console.log(`PASS: real lightmap brightness/falloff, warm light/cool dark, overlap, fire off, zoom/pan alignment, smooth reversible preview, remembered preference, transformed placements, bounded/cached lighting and indoor isolation. Lightmap unchanged across 120 moving-camera frames. Software-only overlay mean: ${milliseconds.toFixed(2)} ms (not an iPhone FPS measurement).${qaDir?' Actual camp screenshots: '+qaDir:''}`);
}finally{globalThis.fetch=originalFetch;globalThis.localStorage=originalStorage;fs.rmSync(temp,{recursive:true,force:true})}

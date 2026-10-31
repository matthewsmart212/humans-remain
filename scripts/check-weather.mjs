import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'camp-weather-'));
try{
 await build({stdin:{contents:`export * from './src/world-assets';export * from './src/weather-model';export * from './src/weather-skia';export * from './src/camp-lighting';export * from './src/world-layout';export * from './src/imported-art';export * from './src/survival-engine';export * from './src/skia-web';export * from './src/placed-world-renderer';export * from './src/world-scenes';export * from './src/editor-image-sources';export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=require(path.join(temp,'model.cjs')),w={};
 globalThis.localStorage={getItem:()=>'{bad',setItem(){throw Error('disabled')}};assert.deepEqual(m.readWeather(),m.CLEAR_WEATHER);m.rememberWeather(m.CLEAR_WEATHER);
 m.setWorldWeather(w,{rain:true,fog:true,lightning:true});for(let i=0;i<120;i++)m.stepWeather(w,1/60);assert.equal(w.weather.rain,1);assert.equal(w.weather.fog,1);
 const time=w.weather.time;m.stepWeather(w,0);assert.equal(w.weather.time,time);m.stepWeather(w,100);assert(w.weather.time-time<.101);
 let flashes=0,was=false,peak=0;for(let i=0;i<3600;i++){m.stepWeather(w,1/60);const on=w.weather.flash>0;if(on&&!was)flashes++;was=on;peak=Math.max(peak,w.weather.flash)}assert(flashes>=3&&flashes<=8);assert(peak<=.28&&peak>.25);
 m.setWorldWeather(w,m.CLEAR_WEATHER);for(let i=0;i<180;i++)m.stepWeather(w,1/60);assert.equal(w.weather.rain,0);assert.equal(w.weather.fog,0);assert.equal(w.weather.flash,0);const stopped=w.weather.time;m.stepWeather(w,1/60);assert.equal(w.weather.time,stopped);
 const reduced={};m.setWorldWeather(reduced,{rain:false,fog:false,lightning:true},true);for(let i=0;i<220;i++){m.stepWeather(reduced,1/60);assert(reduced.weather.flash<=.07)}
 const init=require('canvaskit-wasm'),kit=await init({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)});globalThis.CanvasKit=kit;
 const skia=m.JsiSkApi(kit),fx=m.createWeatherRenderer(skia),surface=skia.Surface.Make(844,390),canvas=surface.getCanvas(),view={x:0,y:0,width:844,height:390,scale:1,pixelRatio:1};
 const pixels=()=>{surface.flush();const im=surface.makeImageSnapshot(),p=im.readPixels();im.dispose();return p};
 canvas.clear(skia.Color('#536445'));const clear=pixels();fx.draw(canvas,w.weather,view,0);assert.deepEqual(pixels(),clear);assert.equal(fx.tileBuilds,0);
 const s=m.createWeather({rain:true,fog:true,lightning:true});s.rain=1;s.fog=0;s.time=4;
 canvas.clear(skia.Color('#536445'));fx.draw(canvas,s,view,0,[[[100,100],[300,100],[300,300],[100,300]]]);const sheltered=pixels();for(let y=120;y<280;y+=30)for(let x=120;x<280;x+=30){const o=(y*844+x)*4;assert.deepEqual(sheltered.slice(o,o+4),clear.slice(o,o+4),'Interiors stay dry')}
 assert.notDeepEqual(sheltered,clear);
 s.rain=0;s.fog=1;canvas.clear(skia.Color('#536445'));fx.draw(canvas,s,view,0);const continuousFog=pixels();
 canvas.clear(skia.Color('#536445'));fx.draw(canvas,s,view,0,[[[100,100],[300,100],[300,300],[100,300]]]);assert.deepEqual(pixels(),continuousFog,'Fog must be identical with/without shelter: no headquarters rectangle');
 assert.equal(fx.tileBuilds,1);
 const heavyWorld={};m.setWorldWeather(heavyWorld,{rain:true,fog:false,lightning:false,heavyRain:true});for(let i=0;i<60;i++)m.stepWeather(heavyWorld,1/60);assert.equal(heavyWorld.weather.heavy,1);
 const distance=heavyWorld.weather.rainTravel;m.setWorldWeather(heavyWorld,{rain:true,fog:false,lightning:false});m.stepWeather(heavyWorld,1/60);assert(heavyWorld.weather.rainTravel>distance&&heavyWorld.weather.rainTravel-distance<11,'Intensity changes cannot teleport streaks');for(let i=0;i<60;i++)m.stepWeather(heavyWorld,1/60);assert.equal(heavyWorld.weather.heavy,0);
 s.fog=0;s.rain=1;s.heavy=0;canvas.clear(skia.Color('#536445'));fx.draw(canvas,s,view,0);const soft=pixels();s.heavy=1;canvas.clear(skia.Color('#536445'));fx.draw(canvas,s,view,0);const hard=pixels();const changed=p=>p.reduce((n,v,i)=>n+(v!==clear[i]?1:0),0);assert(changed(hard)>changed(soft)*1.5,'Heavy rain must be visibly denser');
 s.fog=1;
 const start=performance.now();for(let i=0;i<60;i++){s.time+=1/60;fx.draw(canvas,s,{...view,x:i},.6);surface.flush()}const overlayMs=(performance.now()-start)/60;assert.equal(fx.tileBuilds,1,'All camera/weather frames reuse the same texture');fx.dispose();fx.dispose();surface.dispose();
 console.log(`PASS: reversible fades, bounded lightning, reduced motion, hidden-tab clamp, zero work when clear, real CanvasKit rain/fog, dry interior clipping and single cached tile. Software-only weather overlay mean ${overlayMs.toFixed(2)} ms (not device FPS).`);
 const [artPath,layoutPath,qaDir]=process.argv.slice(2);if(artPath){
 m.installImportedArt(JSON.parse(fs.readFileSync(artPath)).records);const layout=JSON.parse(fs.readFileSync(layoutPath)).draft,before=JSON.stringify(layout);fs.mkdirSync(qaDir,{recursive:true});globalThis.devicePixelRatio=1;
 const assetDir=path.resolve('../night-qa');globalThis.fetch=async url=>new Response(fs.readFileSync(String(url).startsWith('/api/asset-files/')?path.join(assetDir,path.basename(String(url))+'.image'):path.resolve('public'+String(url))));
 let raw;kit.MakeSWCanvasSurface=c=>(raw=kit.MakeSurface(c.width,c.height));const target={width:0,height:0,clientWidth:844,clientHeight:390,dataset:{}},camera={x:1750,y:1550,zoom:.7,follow:false,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:true};
 const renderer=await m.createWebWorld(target,(ctx,atlas,imgs,w)=>m.drawWorldEditor(ctx,atlas,imgs,w,camera),{...m.requiredImages(layout.items.map(p=>p.assetId),layout.terrainImage),...m.editorTerrainDetail(layout.terrainImage)},{sources:m.EDITOR_IMAGE_SOURCES});
 const world=m.createWorld(layout);world.editorPreview=true;Object.assign(world.player,{x:1750,y:1600});m.setWorldWeather(world,{rain:true,fog:true,lightning:true});world.weather.rain=world.weather.fog=1;world.weather.time=5;
 const snapshot=name=>{renderer.draw(world);const im=raw.makeImageSnapshot(),bytes=Buffer.from(im.encodeToBytes());if(name)fs.writeFileSync(path.join(qaDir,name+'.png'),bytes);im.delete();return bytes};
 m.setWorldTimeOfDay(world,'day',true);snapshot('day-rain-fog');m.setWorldTimeOfDay(world,'night',true);snapshot('night-rain-fog');world.weather.flash=.26;snapshot('night-lightning');world.weather.flash=0;world.weather.fog=0;snapshot('night-rain');
 target.clientWidth=1254;target.clientHeight=1254;camera.zoom=.27;snapshot('camp-weather');
 world.scene=m.BUNKER_SCENE;world.layout=m.emptyLayout();Object.assign(world.player,m.BUNKER_SCENE.spawns.stairs);Object.assign(camera,{follow:true,zoom:1});await renderer.loadImages({[m.BUNKER_SCENE.terrain.key]:m.BUNKER_SCENE.terrain.url});world.weather.flash=.28;world.weather.fog=1;const indoors=snapshot();world.weather=undefined;assert(indoors.equals(snapshot()),'Bunker ignores all outdoor weather, including lightning');
 assert.equal(JSON.stringify(layout),before);renderer.dispose();console.log('PASS: actual camp rendered in day, night, rain, fog and lightning; bunker pixels identical with weather on/off; authored draft unchanged.');
}}finally{fs.rmSync(temp,{recursive:true,force:true})}

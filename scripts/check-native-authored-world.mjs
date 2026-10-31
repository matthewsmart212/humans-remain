import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'native-world-'));
const originalFetch=globalThis.fetch,originalRAF=globalThis.requestAnimationFrame;
const snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));
const cache=new Map();globalThis.__testStorage={getItem:async k=>cache.get(k)||null,setItem:async(k,v)=>cache.set(k,v)};
const redirects=Object.assign({},...['lossless-artwork','retired-road','calm-river','river-features','river-quality'].map(n=>JSON.parse(fs.readFileSync(`server/${n}-redirects.json`))));
const canonical=url=>{while(redirects[url])url=redirects[url];return url};
const decoded=[];
try{
 const aliases={
  '@react-native-async-storage/async-storage':'module.exports=globalThis.__testStorage;',
  '@shopify/react-native-skia':'export const Skia=globalThis.__testSkia;',
  'react-native':'export const PixelRatio={get:()=>2};',
  'expo-asset':`const asset=uri=>({uri,localUri:uri,downloadAsync:async()=>{}});export const Asset={fromModule:asset,fromURI:asset};`,
 };
 await build({stdin:{contents:"export {hitAnimal,worldBlocked,lineClear} from './src/survival-engine';export {PREDATOR_RULES,predatorAnimalFrame} from './src/camp-predators';export {WOLF_ATTACKS} from './src/wolf-hunt';export {BOAR_ATTACKS} from './src/boar-hunt';export {OutdoorTerrainStream} from './src/outdoor-streaming';export {editorCamera} from './src/placed-world-renderer';export * from './native/game-world';export * from './native/game-renderer';export * from './native/bundled-art';export * from './src/studio-play';export * from './src/world-assets';export * from './src/authored-world';export * from './src/editor-image-sources';export * from './src/terrain-art';export * from './src/play-interaction';export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs'),plugins:[{name:'native-test-adapters',setup(b){
  b.onResolve({filter:/^(@react-native-async-storage\/async-storage|@shopify\/react-native-skia|react-native|expo-asset)$/},a=>({path:a.path,namespace:'native-test'}));
  b.onLoad({filter:/.*/,namespace:'native-test'},a=>({contents:aliases[a.path],loader:'js'}));
  b.onLoad({filter:/\.(webp|png|jpg|ttf)$/},a=>({contents:`module.exports=${JSON.stringify(a.path)};`,loader:'js'}));
 }}]});
 const kit=await require('canvaskit-wasm')({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)});
 // The shim substitutes only platform services. The production native image
 // queue, Picture recorder, shaders, draw function and stream budgets run here.
 const {JsiSkApi}=require(path.join(temp,'model.cjs'));
 const api=JsiSkApi(kit);globalThis.__testSkia={...api,Data:{fromBytes:bytes=>api.Data.fromBytes(bytes),fromURI:async uri=>{decoded.push(uri);return api.Data.fromBytes(fs.readFileSync(uri))}},Surface:{...api.Surface,MakeOffscreen:(w,h)=>api.Surface.Make(w,h)}};
 // Reload after the native Skia import receives the initialized API.
 delete require.cache[require.resolve(path.join(temp,'model.cjs'))];const m=require(path.join(temp,'model.cjs'));
 globalThis.requestAnimationFrame=fn=>setImmediate(()=>fn(performance.now()));
 globalThis.fetch=async url=>new Response(JSON.stringify(String(url).includes('asset-artwork')?{records:snapshot.records}:{draft:snapshot.layout,applied:{items:[]},revision:90}));
 let candidates=await m.worldCandidates();assert.equal(candidates[0].source,'Latest saved editor world');
 const saved=m.validateSavedWorld(candidates[0].value,candidates[0].source);assert.equal(saved.layout.items.length,4465);assert.deepEqual(saved.layout,snapshot.layout);assert.equal(m.prepareAuthoredWorld(saved.layout),saved.layout,'Approved upgrades are idempotent');
 cache.set(m.WORLD_CACHE,JSON.stringify(saved));globalThis.fetch=async()=>{throw Error('offline')};
 candidates=await m.worldCandidates();assert.equal(candidates.length,2);assert.equal(candidates[0].source,'Saved offline world');assert.equal(candidates[1].source,'Included editor world');
 assert.throws(()=>m.validateSavedWorld({layout:{},records:[]},'invalid'));
 m.validateSavedWorld(snapshot,'included');
 const sources={...m.EDITOR_IMAGE_SOURCES,...m.editorTerrainDetail(saved.layout.terrainImage),...m.requiredImages(saved.layout.items.map(p=>p.assetId),saved.layout.terrainImage)};
 const bundled={...m.BUNDLED_ART,...m.BACKPACK_NATIVE_ART};
 for(const [url,file]of Object.entries(bundled)){assert(fs.existsSync(file),'Bundled artwork exists: '+file);assert(!/worker-motion|worker-diagonal|\/survivor\/|\/packaging\//.test(file),'No retired character/world art');assert(!url.includes('trees-v1/'))}
 for(const url of Object.values(sources))assert(bundled[url],'First launch artwork works offline: '+url);
 const before=JSON.stringify(saved.layout),world=m.createCampPlaySession(saved.layout);for(let i=0;i<60;i++)m.stepCampPlaySession(world,{x:0,y:0},false,false);
 assert.equal(JSON.stringify(saved.layout),before);assert.equal(world.editorPreview,true);assert.equal(world.combatTest,true);assert(Object.values(world.foliageMotions||{}).every(motion=>Number.isFinite(motion.x)&&Number.isFinite(motion.y)),'Roaming wildlife may brush nearby foliage');
 const view={...m.PLAY_VIEW},renderer=await m.createNativeRenderer(view);await renderer.warmImages(sources);
 // Actual production world rendering of the campfire loop in both orientations.
 const fireWorld=m.createCampPlaySession(saved.layout);fireWorld.enemies=[];fireWorld.animals=[];fireWorld.loot=[];fireWorld.noticeUntil=0;fireWorld.stationPanel='fire';
 Object.assign(fireWorld.player,{x:fireWorld.camp.hearth.x,y:fireWorld.camp.hearth.y+65,direction:'up'});
 const fireAt=fireWorld.tick/60;fireWorld.fire.updatedAt=fireAt;
 const fireFrames={
  cold:()=>{fireWorld.camp.hearth.fuel=0;fireWorld.fire={updatedAt:fireAt,cookUntil:0,ready:false,queue:[],rack:[]}},
  throwing:()=>{fireWorld.camp.hearth.fuel=0;fireWorld.fire={updatedAt:fireAt,cookUntil:0,ready:false,queue:[],rack:[],logs:[{born:fireAt-.27,lands:fireAt+.28,from:{x:fireWorld.player.x,y:fireWorld.player.y-42}}]}},
  cooking:()=>{fireWorld.camp.hearth.fuel=167;fireWorld.fire={updatedAt:fireAt,cookUntil:fireAt+7,ready:true,queue:[{id:9991,species:'chicken',remaining:7}],rack:['rabbit']};fireWorld.bag.rawRabbit=2;fireWorld.bag.rawVenison=1},
  ready:()=>{fireWorld.camp.hearth.fuel=145;fireWorld.fire={updatedAt:fireAt,cookUntil:0,ready:true,queue:[],rack:['chicken','rabbit','venison','chicken','rabbit','venison']}},
  exploring:()=>{fireWorld.stationPanel=undefined;fireWorld.camp.hearth.fuel=167;fireWorld.fire={updatedAt:fireAt,cookUntil:0,ready:false,queue:[],rack:[]}},
 };
 fs.mkdirSync('.qa/campfire',{recursive:true});
 const previousFireZoom=view.zoom;view.zoom=.7;
 for(const [state,setup]of Object.entries(fireFrames)){fireWorld.stationPanel='fire';setup();
  // Settle the presentation-only tray pan while retaining the exact food pose.
  fireWorld.tick-=15;m.editorCamera(390,844,fireWorld,view,1);fireWorld.tick+=15;
  for(const size of [[390,844],[844,390],[390,700],[320,568],[667,320]]){
  const picture=renderer.draw(fireWorld,...size),surface=api.Surface.Make(...size);surface.getCanvas().drawPicture(picture);surface.flush();const image=surface.makeImageSnapshot();fs.writeFileSync(`.qa/campfire/world-${size.join('x')}-${state}.png`,image.encodeToBytes());image.dispose();surface.dispose();picture.dispose();
 }}
 view.zoom=previousFireZoom;
 if(process.env.CAMPFIRE_QA_ONLY){renderer.dispose();fs.rmSync(temp,{recursive:true,force:true});console.log('Campfire production renderer snapshots ready.');process.exit(0)}
 const startupDecoded=decoded.length-1;let draws=0;for(const size of [[390,844],[844,390]])for(const zoom of [1,.7]){
  view.zoom=zoom;
  const picture=renderer.draw(world,...size),surface=api.Surface.Make(...size);surface.getCanvas().drawPicture(picture);surface.flush();const image=surface.makeImageSnapshot(),bytes=image.encodeToBytes();assert(bytes.length>25000,'Actual world drawn in '+size.join('x'));draws++;
  fs.mkdirSync('.qa/native-world',{recursive:true});fs.writeFileSync(`.qa/native-world/native-${size.join('x')}-${zoom}.png`,bytes);image.dispose();surface.dispose();picture.dispose();
 }
 let heldFoodPictures=0;world.cooked=1;world.player.equipped='meal';world.player.direction='down-right';view.zoom=1;
 for(const size of [[390,844],[844,390]]){
  const picture=renderer.draw(world,...size),surface=api.Surface.Make(...size);surface.getCanvas().drawPicture(picture);surface.flush();const image=surface.makeImageSnapshot(),bytes=image.encodeToBytes();assert(bytes.length>25000,'Held-food world drawn');
  fs.writeFileSync(`.qa/native-world/native-${size.join('x')}-food.png`,bytes);heldFoodPictures++;image.dispose();surface.dispose();picture.dispose();
 }
 const foodDrops=world.loot.length;
 world.loot.push({id:world.serial++,x:world.player.x+90,y:world.player.y+20,kind:'rawMeat',amount:1},{id:world.serial++,x:world.player.x+160,y:world.player.y+20,kind:'cookedMeat',amount:1});
 {
  const picture=renderer.draw(world,844,390),surface=api.Surface.Make(844,390);surface.getCanvas().drawPicture(picture);surface.flush();const image=surface.makeImageSnapshot(),bytes=image.encodeToBytes();
  fs.mkdirSync('docs/qa/chicken-food-v1',{recursive:true});fs.writeFileSync('docs/qa/chicken-food-v1/native-food.png',bytes);image.dispose();surface.dispose();picture.dispose();
 }
 world.loot.length=foodDrops;
 // Exercise all pickup art through the shared production renderer over leaves.
 const pickupPlayer={x:world.player.x,y:world.player.y};
 const plant=world.layout.items.filter(p=>m.ASSET_BY_ID.get(p.assetId)?.foliage).sort((a,b)=>Math.hypot(a.x-world.player.x,a.y-world.player.y)-Math.hypot(b.x-world.player.x,b.y-world.player.y))[0];
 if(plant){world.player.x=plant.x+120;world.player.y=plant.y+90}
 world.loot.push(...['rawMeat','cookedMeat','pallets','scrap','fuel'].map((kind,i)=>({id:world.serial++,x:world.player.x-100+i*65,y:world.player.y-35,kind,amount:1,...(kind==='pallets'?{appearance:'logs'}:{})})));
 const previousTarget=world.fieldKitTarget;world.fieldKitTarget={...world.loot[foodDrops],label:'Raw chicken'};
 for(const zoom of [1,.7]){
  view.zoom=zoom;const picture=renderer.draw(world,844,390),surface=api.Surface.Make(844,390);surface.getCanvas().drawPicture(picture);surface.flush();const image=surface.makeImageSnapshot();
  fs.mkdirSync('docs/qa/pickup-visibility',{recursive:true});fs.writeFileSync(`docs/qa/pickup-visibility/native-${zoom}.png`,image.encodeToBytes());image.dispose();surface.dispose();picture.dispose();
 }
 view.zoom=1;Object.assign(world.player,pickupPlayer);world.loot.length=foodDrops;world.fieldKitTarget=previousTarget;
 let chickenPictures=0;
 for(const bird of world.animals.filter(a=>a.chicken).slice(0,2)){
  world.player.x=bird.x-120;world.player.y=bird.y+90;world.player.equipped='axe';
  const picture=renderer.draw(world,844,390),surface=api.Surface.Make(844,390);surface.getCanvas().drawPicture(picture);surface.flush();const image=surface.makeImageSnapshot(),bytes=image.encodeToBytes();
  assert(bytes.length>25000,'Camp chicken scene drawn by production native renderer');
  fs.mkdirSync('docs/qa/camp-chickens-v1',{recursive:true});fs.writeFileSync(`docs/qa/camp-chickens-v1/native-chicken-${chickenPictures++}.png`,bytes);image.dispose();surface.dispose();picture.dispose();
 }
 let rabbitPictures=0;
 for(const rabbit of world.animals.filter(a=>a.rabbit).slice(0,2)){
  world.player.x=rabbit.x-110;world.player.y=rabbit.y+80;world.player.equipped='rabbitMeal';world.cookedRabbit=1;
  rabbit.rabbit.state='run';rabbit.moving=true;rabbit.rabbit.hop=.5;
  const count=world.loot.length;world.loot.push({id:world.serial++,x:rabbit.x+70,y:rabbit.y+35,kind:'rawRabbit',amount:1},{id:world.serial++,x:rabbit.x+135,y:rabbit.y+35,kind:'cookedRabbit',amount:1});
  const picture=renderer.draw(world,844,390),surface=api.Surface.Make(844,390);surface.getCanvas().drawPicture(picture);surface.flush();const image=surface.makeImageSnapshot(),bytes=image.encodeToBytes();
  assert(bytes.length>25000,'Rabbit, held meal and both pickup types drawn by production native renderer');
  fs.mkdirSync('docs/qa/camp-rabbits-v1',{recursive:true});fs.writeFileSync(`docs/qa/camp-rabbits-v1/native-rabbit-${rabbitPictures++}.png`,bytes);world.loot.length=count;image.dispose();surface.dispose();picture.dispose();
 }
 let deerPictures=0;
 for(const deer of world.animals.filter(a=>a.deer).slice(0,2)){
  world.player.x=deer.x-130;world.player.y=deer.y+90;world.player.equipped='venisonMeal';world.cookedVenison=1;
  deer.deer.direction='down-left';deer.deer.state='idle';deer.moving=false;
  const count=world.loot.length;world.loot.push({id:world.serial++,x:deer.x+95,y:deer.y+35,kind:'rawVenison',amount:2},{id:world.serial++,x:deer.x+175,y:deer.y+35,kind:'cookedVenison',amount:1});
  const picture=renderer.draw(world,844,390),surface=api.Surface.Make(844,390);surface.getCanvas().drawPicture(picture);surface.flush();const image=surface.makeImageSnapshot(),bytes=image.encodeToBytes();
  assert(bytes.length>25000,'Deer, held venison and both food pickups drawn by production native renderer');
  fs.mkdirSync('docs/qa/camp-deer-v1',{recursive:true});fs.writeFileSync(`docs/qa/camp-deer-v1/native-${deer.deer.kind}.png`,bytes);deerPictures++;world.loot.length=count;image.dispose();surface.dispose();picture.dispose();
 }
 const stag=world.animals.find(a=>a.deer?.kind==='stag');
 world.player.x=stag.x-110;world.player.y=stag.y;world.player.equipped='axe';m.hitAnimal(world,stag,16);
 let stagAttackPictures=0;
 for(const [phase,ticks]of [['impact',6],['warning',18],['charge',12],['contact',8]]){
  for(let i=0;i<ticks;i++)m.stepCampPlaySession(world,{x:0,y:0},false,false);
  if(phase==='contact'){assert.equal(stag.deer.retaliation,undefined);assert(world.player.hp<100);assert(world.effects.some(e=>e.target==='player'&&e.amount===12))}else assert.equal(stag.deer.retaliation?.phase,phase==='charge'?'charge':'warn');
  const picture=renderer.draw(world,844,390),surface=api.Surface.Make(844,390);surface.getCanvas().drawPicture(picture);surface.flush();const image=surface.makeImageSnapshot(),bytes=image.encodeToBytes();
  assert(bytes.length>25000,'Stag warning/charge drawn by production native renderer');
  fs.writeFileSync(`docs/qa/camp-deer-v1/native-stag-${phase}.png`,bytes);stagAttackPictures++;image.dispose();surface.dispose();picture.dispose();
 }
 // Both predators run through the same production depth-sorted renderer,
 // including their warning, contact, red health and shared wild-meat rewards.
 let predatorPictures=0;
 const predatorSpawns=[];
 const predatorTerrain=new m.OutdoorTerrainStream(renderer.warmImages,renderer.releaseImages);
 const fauna=world.animals;const representatives=['boar','wolf'].flatMap(kind=>fauna.filter(a=>a.predator?.kind===kind).filter((_,i)=>i===0||i===4));
 for(const [index,animal] of representatives.entries()){
  world.animals=[animal];world.ecology=undefined;
  const kind=animal.predator.kind;
  predatorSpawns.push({kind,x:animal.predator.home.x,y:animal.predator.home.y});
  for(const mode of kind==='wolf'?['lunge','bite']:['charge','gore']){
   Object.assign(animal,animal.predator.home);const distance=mode==='bite'||mode==='gore'?70:110;
   const approach=[Math.PI,0,Math.PI/2,-Math.PI/2,Math.PI/4,-Math.PI/4,Math.PI*3/4,-Math.PI*3/4].map(angle=>({x:animal.x+Math.cos(angle)*distance,y:animal.y+Math.sin(angle)*distance})).find(p=>!m.worldBlocked(world,p.x,p.y,19)&&m.lineClear(p,animal,world));assert(approach,'Spawn has a clear approach');
   Object.assign(world.player,{...approach,hp:100,hurtUntil:0,downedUntil:0,equipped:'axe'});
   Object.assign(animal.predator,{state:'idle',since:world.tick/60,engaged:false,readyAt:0,thinkAt:0,contactAt:undefined,wolf:undefined,boar:undefined,hitAt:undefined,reactedHitAt:undefined});
   world.effects=[];m.stepCampPlaySession(world,{x:0,y:0},false,false);assert.equal(animal.predator.state,'warn');
   assert.equal((animal.predator.wolf||animal.predator.boar).attack,mode);
   const camera=m.editorCamera(844,390,world,view);predatorTerrain.update({x:camera.x,y:camera.y,width:844/camera.scale,height:390/camera.scale},world.player,true);await predatorTerrain.settled();
   for(let attempt=0;attempt<100;attempt++){
    renderer.draw(world,844,390).dispose();
    if(Object.values(renderer.textureStats()).filter(s=>'missing' in s).every(s=>s.missing===0))break;
    await new Promise(resolve=>setTimeout(resolve,20));
   }
   assert(Object.values(renderer.textureStats()).filter(s=>'missing' in s).every(s=>s.missing===0),'Visible predator terrain is ready');
   for(const phase of ['warning','contact']){
    if(phase==='contact'){
     for(let i=0;i<100&&world.player.hp===100;i++)m.stepCampPlaySession(world,{x:0,y:0},false,false);
     assert.equal(world.player.hp,100-(kind==='wolf'?m.WOLF_ATTACKS[mode].damage:m.BOAR_ATTACKS[mode].damage));assert.equal(m.predatorAnimalFrame(world,animal),mode==='bite'||mode==='gore'?15:14);
    }
    const picture=renderer.draw(world,844,390),surface=api.Surface.Make(844,390);surface.getCanvas().drawPicture(picture);surface.flush();const image=surface.makeImageSnapshot(),bytes=image.encodeToBytes();assert(bytes.length>25000);
    const folder=kind==='wolf'?'wolf-hunt-v2':'boar-combat-v2';fs.mkdirSync(`docs/qa/${folder}`,{recursive:true});fs.writeFileSync(`docs/qa/${folder}/native-${kind}-${index%2+1}-${mode}-${phase}.png`,bytes);predatorPictures++;image.dispose();surface.dispose();picture.dispose();
   }
  }
 }
 assert.equal(predatorPictures,16);predatorTerrain.dispose();
 // Native stream jobs may finish after the active Picture has changed.
 await new Promise(r=>setTimeout(r,30));renderer.dispose();renderer.dispose();
 const report={passed:true,placements:saved.layout.items.length,bundledImages:Object.keys(bundled).length,startupDecoded,portraitAndLandscapePictures:draws,heldFoodPictures,chickenPictures,rabbitPictures,deerPictures,stagAttackPictures,predatorPictures,predatorSpawns,zoomRange:[.7,1],checks:['saved draft rather than retired applied world','matching approved migrations','cached and bundled offline fallback','isolated play snapshot','all chopping/animation states bundled','backpack and dropped-item artwork bundled offline','no retired player textures','production native renderer via CanvasKit software shim','held food in production native renderer','chickens in production native renderer','rabbits, held rabbit meal and both rabbit pickup sprites in production native renderer','doe and stag, held venison and both venison pickup sprites in production native renderer','animal health bars, dealt/received hit markers, and stag warning/charge/contact without a ground box in production native renderer','representative pair/solitary habitats, separate wolf bite/lunge and boar tusk/charge tells and actual contact poses on streamed terrain','both zoom limits in both orientations','safe repeated renderer disposal'],physicalIPhoneTested:false};
 fs.writeFileSync('docs/NATIVE-VERIFICATION.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{globalThis.fetch=originalFetch;globalThis.requestAnimationFrame=originalRAF;fs.rmSync(temp,{recursive:true,force:true});delete globalThis.__testStorage;delete globalThis.__testSkia}

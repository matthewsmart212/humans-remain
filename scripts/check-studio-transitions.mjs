import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {pathToFileURL} from 'node:url';
import {build,transformSync} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'studio-transitions-'));
try {
 await build({stdin:{contents:`export * from './src/world-assets';export * from './src/layout-limits';export * from './src/layout-views';export * from './src/camp-lighting';export * from './src/weather-model';export * from './src/studio-play';export * from './src/world-tiers';export * from './src/world-layout';export * from './src/imported-art';export {createWorld,clearAttackQueue} from './src/survival-engine';export * from './src/world-scenes';export {SceneTravel} from './src/scene-travel';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'model.mjs')});
 const m=await import(pathToFileURL(path.join(temp,'model.mjs')));
 const archive='docs/archive/asset-library-cleanup-2026-10-10';m.installImportedArt(JSON.parse(fs.readFileSync(archive+'/artwork.json')).records);
 const source=fs.readFileSync('src/WorldEditor.tsx','utf8'),ast=ts.createSourceFile('WorldEditor.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const functionCode=new Map();
 const visit=n=>{if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name)&&n.initializer&&ts.isArrowFunction(n.initializer))functionCode.set(n.name.text,n.initializer.getText(ast));ts.forEachChild(n,visit)};visit(ast);
 function setup(){
  const draft=JSON.parse(fs.readFileSync(archive+'/draft.json')).draft;
  const edit=m.createWorld(draft),view={x:1234,y:987,zoom:.67,follow:false,grid:true,collision:true,selected:draft.items[0].id,ghost:null,placingSpawn:false};
  const local=[];
  const c={...m,window:{matchMedia:()=>({matches:false})},weatherOptionsRef:{current:{...m.CLEAR_WEATHER}},setWeatherOptions(value){c.weatherOptions=value},timeOfDayRef:{current:'day'},setTimeOfDay(value){c.timeOfDay=value},travel:{current:null},mapResources:{current:{ready:()=>true,prepare:async()=>{},pin:()=>{}}},mapZooms:{current:new Map()},setTravelStatus(){},setActiveLocation(){},setNearbyChest(){},setInteraction(){},setBonfireAction(){},ready:true,tierBusyRef:{current:false},terrainBusy:false,mobile:false,libraryOpen:true,inspectorOpen:true,canEdit:true,
   world:{current:edit},layoutRef:{current:draft},viewRef:{current:{...view}},modeRef:{current:'edit'},editSession:{current:null},placementEpoch:{current:0},placingRef:{current:null},keys:{current:new Set(['w'])},touchInput:{current:{x:1,y:0}},attackHeld:{current:true},sprint:{reset(){}},canvas:{current:{focus(){}}},revision:{current:50},savingRef:{current:false},renderer:{current:{loadImages:async()=>{}}},history:{current:[]},future:{current:[]},
   cancelGesture(){},cancelPlace(){c.placementEpoch.current++;c.placingRef.current=null},
   updateView(patch){Object.assign(c.viewRef.current,patch)},setMode(value){c.mode=value},setPaused(value){c.paused=value},setLibraryOpen(value){c.libraryOpen=typeof value==='function'?value(c.libraryOpen):value},setToolsOpen(value){c.toolsOpen=typeof value==='function'?value(c.toolsOpen):value},setMonitorOpen(value){c.monitorOpen=typeof value==='function'?value(c.monitorOpen):value},setInspectorOpen(value){c.inspectorOpen=value},setAskClear(value){c.askClear=value},toolsToggle:{current:{focus(){c.focusedTools=true}}},setPanTool(){},setAssetBrowser(value){c.assetBrowser=value},setAssetFocus(){},setAssetView(){},setAxeEquipped(){},setRoute(hash){c.route=hash},show(message){c.message=message},setLayout(l){c.layout=l},persistEditorDraft(l){local.push(l)},setStatus(value){c.status=value},setBusy(){},setCurrent(){throw Error('Play must not write to the editor draft')},setSearch(){},setAssetVersion(){},setPlacing(value){c.placing=value},select(){},bounded:p=>p,ensureArt:async()=>{},
   saveWorldLayout:async(layout,revision,action)=>{assert.equal(action,'save');assert.equal(layout,c.layoutRef.current);assert.equal(revision,50);return{revision:51,updatedAt:'2026-10-10T12:00:00.000Z'}},
  };
  const context=vm.createContext(c);
  for(const name of ['toggleTools','closeTools','toggleWeather','toggleTimeOfDay','clearInput','bindTravel','backToCamp','startPlay','stopPlay','restartPlay','save','refreshArtwork','closeAssetLibrary','openAssetLibrary','beginPlace','place']){
   const fn=functionCode.get(name);assert(fn,name);
   vm.runInContext(transformSync(`globalThis.${name}=${fn}`,{loader:'tsx',target:'es2022'}).code,context);
  }
  return {c,edit,draft,view,local};
 }
 const {c,edit,draft,view,local}=setup(),before=JSON.stringify(draft);
 c.startPlay();assert.equal(c.modeRef.current,'play');assert.notEqual(c.world.current,edit);assert.equal(c.viewRef.current.playing,true);assert.equal(c.keys.current.size,0);assert.equal(c.libraryOpen,false);assert.equal(c.inspectorOpen,false);assert.equal(c.route,'#game');
 const runtime=c.world.current;
 runtime.player.x+=200;runtime.bag.rawMeat=0;runtime.chestMotions={test:{from:0,target:1,started:0}};
 // Opening and closing the library pauses via the overlay, keeps the same run,
 // and never remounts or replaces the editor model.
 c.openAssetLibrary();assert.equal(c.assetBrowser,true);assert.equal(c.route,'#checklist');assert.equal(c.world.current,runtime);
 c.closeAssetLibrary();assert.equal(c.assetBrowser,false);assert.equal(c.route,'#game');assert.equal(c.world.current,runtime);
 await c.save();assert.equal(c.revision.current,51);assert.equal(c.world.current,runtime,'Save does not replace an active play session');assert.equal(local.length,1);assert.deepEqual(local[0].items,draft.items);
 c.stopPlay();assert.equal(c.world.current,edit,'Stop restores the original editor world');assert.equal(c.modeRef.current,'edit');assert.equal(c.libraryOpen,true);assert.equal(c.inspectorOpen,true);assert.deepEqual(c.viewRef.current,{...view,playing:false},'Stop restores camera, zoom, selected object and edit overlays');assert.equal(c.world.current.layout,c.layoutRef.current);assert.equal(JSON.stringify(draft),before);assert.equal(c.route,'#editor');
 c.startPlay();c.world.current.bag.rawMeat=0;c.restartPlay();assert.equal(c.world.current.bag.rawMeat,3);assert.equal(c.world.current.tick,0);c.stopPlay();assert.equal(c.world.current,edit);

 // Mobile dock toggles are UI-only and mutually exclusive. Starting Play
 // clears all touch docks; Stop restores the authored editor and its panels.
 const phone=setup();phone.c.mobile=true;phone.c.toolsOpen=true;phone.c.monitorOpen=true;phone.c.askClear=true;
 phone.c.startPlay();const phoneRun=phone.c.world.current;
 assert.equal(phone.c.toolsOpen,false);assert.equal(phone.c.monitorOpen,false);
 phone.c.toggleTools();assert.equal(phone.c.toolsOpen,true);assert.equal(phone.c.askClear,false);assert.equal(phone.c.monitorOpen,false);assert.equal(phone.c.libraryOpen,false);assert.equal(phone.c.inspectorOpen,false);assert.equal(phone.c.world.current,phoneRun);
 phone.c.toggleTools();assert.equal(phone.c.toolsOpen,false);
 phone.c.toggleTools();phone.c.closeTools();assert.equal(phone.c.toolsOpen,false);assert.equal(phone.c.focusedTools,true);
 phone.c.stopPlay();assert.equal(phone.c.world.current,phone.edit);assert.equal(phone.c.libraryOpen,true);assert.equal(phone.c.inspectorOpen,true);

 // Lighting is a workspace preference: Play/Stop/Restart retain it without
 // saving preview settings or simulation state into the user's authored map.
 c.toggleTimeOfDay();assert.equal(c.world.current.phase,'night');assert.equal(c.timeOfDay,'night');
 c.startPlay();assert.equal(c.world.current.phase,'night');assert.equal(c.world.current.nightAmount,1);
 for(let i=0;i<120;i++)m.stepCampPlaySession(c.world.current,{x:0,y:0},false,false);
 assert.equal(c.world.current.phase,'night','Gameplay cannot force the lighting back to day');
 c.restartPlay();assert.equal(c.world.current.phase,'night');assert.equal(c.world.current.nightAmount,1);
 c.toggleTimeOfDay();assert.equal(c.world.current.phase,'day');assert.equal(edit.phase,'day');
 c.stopPlay();assert.equal(c.world.current,edit);assert.equal(c.world.current.nightAmount,0);assert.equal(JSON.stringify(draft),before);

 c.toggleWeather('rain');c.toggleWeather('fog');c.toggleWeather('lightning');c.startPlay();assert.deepEqual(c.world.current.weather.options,{rain:true,fog:true,lightning:true});c.restartPlay();assert.equal(c.world.current.weather.options.fog,true);c.toggleWeather('rain');c.stopPlay();assert.equal(edit.weather.options.rain,false);assert.equal(edit.weather.options.lightning,true);assert.equal(JSON.stringify(draft),before);

 c.toggleWeather('heavyRain');assert.equal(c.world.current.weather.options.rain,true);assert.equal(c.world.current.weather.options.heavyRain,true);c.startPlay();c.restartPlay();assert.equal(c.world.current.weather.options.heavyRain,true);c.stopPlay();c.toggleWeather('rain');c.toggleWeather('heavyRain');assert.equal(c.world.current.weather.options.rain,true);assert.equal(c.world.current.weather.options.heavyRain,true);c.toggleWeather('heavyRain');assert.equal(c.world.current.weather.options.rain,true);assert.equal(c.world.current.weather.options.heavyRain,false);
 // Stop and Build from a real interior must restore the authored camp, never
 // save the interior's empty layout over the cloud draft.
 const bunker=JSON.parse(fs.readFileSync('scripts/fixtures/bunker-step-on.json'));m.installImportedArt([bunker.record]);
 const roomCase=setup(),p=bunker.placement,b=m.placementBounds(p),point=(u,v)=>({x:b.x+u*b.width,y:b.y+v*b.height});
 roomCase.c.layoutRef.current={...m.emptyLayout(),items:[p],spawn:point(.26,.9)};
 roomCase.c.world.current=m.createWorld(roomCase.c.layoutRef.current);const authored=roomCase.c.world.current,authoredJSON=JSON.stringify(roomCase.c.layoutRef.current);
 roomCase.c.toggleWeather('rain');roomCase.c.startPlay();const live=roomCase.c.world.current;Object.assign(live.player,point(.59,.61));live.stepOnMotions={[p.id]:{position:2,active:true}};
 for(let i=0;i<60;i++)roomCase.c.travel.current.tick(1/60);
 assert.equal(roomCase.c.world.current.scene.id,'bunker');assert.equal(roomCase.c.world.current.weather,live.weather);assert.equal(roomCase.c.world.current.scene.weather,'sheltered');
 roomCase.c.stopPlay();assert.equal(roomCase.c.world.current,authored);assert.equal(roomCase.c.world.current.scene,undefined);assert.equal(JSON.stringify(roomCase.c.layoutRef.current),authoredJSON);assert.equal(roomCase.c.modeRef.current,'edit');
 // Starting Play while an image is loading cancels the pending placement.
 const delayed=setup();let release;delayed.c.ensureArt=()=>new Promise(resolve=>release=resolve);
 const placing=delayed.c.place('base_well_t1',{x:1000,y:1000});delayed.c.startPlay();release();await placing;
 assert.equal(delayed.c.world.current.layout.items.length,22);assert.equal(delayed.c.layoutRef.current.items.length,22);
 // A library collision edit must take effect immediately in open-world physics.
 const prop=m.newPlacement('base_well_t1',500,500),collisionWorld={...m.emptyLayout(),items:[prop]};
 const asset=m.ASSET_BY_ID.get(prop.assetId),collider=m.placementBodies(prop)[0];assert(collider);
 const bx=collider.shape==='polygon'?collider.points[0][0]:collider.x,by=collider.shape==='polygon'?collider.points[0][1]:collider.y;
 assert(m.layoutBlocked(collisionWorld,bx,by,19));
 m.ASSET_BY_ID.set(prop.assetId,{...asset,collision:{lineWidth:.01,paths:[]}});
 c.layoutRef.current=collisionWorld;await c.refreshArtwork();
 assert(!m.layoutBlocked(collisionWorld,bx,by,19),'Shared collision edits invalidate the open draft cache');
 m.ASSET_BY_ID.set(prop.assetId,asset);
 assert.equal(c.history.current.length,0,'Play mode transitions never add undo entries');
 const main=fs.readFileSync('src/main.tsx','utf8');assert(!main.includes('SurvivalGame'));assert(!main.includes('HomeMenu'));assert(main.includes('<WorldEditor/>'));
 console.log('PASS: actual Play / Stop handlers restore camera, selection, panels and editor state; library stays in the same run; Save never overwrites runtime; Restart resets play; pending image loads cannot place objects into a running game; retired game route is absent.');
} finally {fs.rmSync(temp,{recursive:true,force:true});}

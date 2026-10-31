import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {build,transformSync} from 'esbuild';
import {createRequire} from 'node:module';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'clean-play-'));
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/studio-play';export * from './src/imported-art';export * from './src/field-kit';export {default as FieldKitHUD} from './src/FieldKitHUD';export {createWorld,clearAttackQueue} from './src/survival-engine';export {default as React} from 'react';export {renderToStaticMarkup} from 'react-dom/server';export {default as GamePlayMenu,EditorOnly} from './src/GamePlayMenu';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',loader:{'.css':'empty'},outfile:path.join(temp,'model.cjs')});
 const m=createRequire(import.meta.url)(path.join(temp,'model.cjs'));
 m.installImportedArt(JSON.parse(fs.readFileSync('docs/qa/clean-play/artwork.json')).records);
 const draft=JSON.parse(fs.readFileSync('docs/qa/tree-variants-v1/after.json'));
 const source=fs.readFileSync('src/WorldEditor.tsx','utf8'),ast=ts.createSourceFile('WorldEditor.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),functions=new Map();
 const visit=n=>{if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name)&&n.initializer&&ts.isArrowFunction(n.initializer))functions.set(n.name.text,n.initializer.getText(ast));ts.forEachChild(n,visit)};visit(ast);
 const noop=()=>{};
 for(const mobile of [false,true]){
  const editor=m.createWorld(draft),before=JSON.stringify(draft),view={x:123,y:456,zoom:.42,follow:false,grid:true,collision:true,selected:draft.items[0].id,playing:false};
  const c={...m,ready:true,tierBusyRef:{current:false},terrainBusy:false,modeRef:{current:'edit'},world:{current:editor},layoutRef:{current:draft},viewRef:{current:{...view}},editSession:{current:null},canvas:{current:{focus:noop}},libraryOpen:true,inspectorOpen:true,mobile,
   prepareMode:async()=>true,cancelModePreparation:noop,cancelGesture:noop,cancelPlace:noop,backToCamp:noop,bindTravel:noop,clearInput:noop,setMode(v){c.mode=v},setPaused(v){c.paused=v},setLibraryOpen(v){c.libraryOpen=v},setInspectorOpen(v){c.inspectorOpen=v},setAskClear:noop,setToolsOpen:noop,setMonitorOpen(v){c.monitorOpen=v},setPanTool:noop,setAssetBrowser:noop,setHelpOpen:noop,setCollisionEdit:noop,setMessage:noop,setAxeEquipped:noop,updateView(v){Object.assign(c.viewRef.current,v)},setRoute(v){c.route=v},show(v){throw Error(v)}};
  const context=vm.createContext(c);
  for(const name of ['startPlay','restartPlay','stopPlay'])vm.runInContext(transformSync(`globalThis.${name}=${functions.get(name)}`,{loader:'tsx'}).code,context);
  await c.startPlay();assert.equal(c.mode,'play');assert.equal(c.route,'#game');assert.equal(c.monitorOpen,false);assert.equal(c.libraryOpen,false);assert.equal(c.inspectorOpen,false);assert.equal(c.viewRef.current.follow,true);assert.equal(c.viewRef.current.zoom,1);
  assert.deepEqual(JSON.parse(JSON.stringify(c.world.current.layout)),draft,'Every authored placement is used');
  assert.notEqual(c.world.current.layout,draft);c.world.current.layout.items[0].x+=100;c.world.current.bag.rawMeat=0;
  assert.equal(JSON.stringify(draft),before,'Runtime changes never modify the editor draft');
  c.restartPlay();assert.deepEqual(JSON.parse(JSON.stringify(c.world.current.layout)),draft);assert.equal(c.paused,false);
  c.stopPlay();assert.equal(c.world.current,editor);assert.equal(c.mode,'edit');assert.equal(c.route,'#editor');assert.equal(c.libraryOpen,true);assert.equal(c.inspectorOpen,true);assert.deepEqual(c.viewRef.current,view);
 }
 // Render the actual JSX surface in both layouts with every editor panel flagged
 // open: clean Play must exclude the tools rather than merely cover them.
 const component=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='WorldEditor');
 const surface=component.body.statements.find(n=>ts.isReturnStatement(n)).expression.getText(ast);
 const control=({children})=>m.React.createElement('span',null,children),icon=()=>null;
 for(const mobile of [false,true]){
  const c={React:m.React,mode:'play',mobile,display:{height:760,fullscreen:false,expand:noop},layout:draft,toolsOpen:true,libraryOpen:true,inspectorOpen:true,monitorOpen:true,ready:true,error:'',terrainDetail:'ready',selectedItem:null,view:{},canvas:{current:null},world:{current:m.createCampPlaySession(draft)},paused:false,playStats:{health:100,hunger:70,thirst:70,raw:3,cooked:0,downed:false},controlsAvailable:true,axeEquipped:true,touchInput:{current:{x:0,y:0}},sprint:{active:false,toggle:noop},attackHeld:{current:false},nearbyGateId:null,nearbyChest:null,interaction:null,bonfireAction:null,outdoorStatus:'',travelStatus:'',message:'',preparingMode:null,collisionEdit:null,assetBrowser:false,helpOpen:false,upload:{current:null},down:noop,move:noop,up:noop,pauseGame:noop,resumeGame:noop,restartPlay:noop,stopPlay:noop,dodge:noop,equipAxe:noop,retryLoading:noop,GamePlayMenu:m.GamePlayMenu,EditorJoystick:control,SprintButton:control,CombatDodgeButton:control,AxeToggle:control,AxeSwingButton:control,Heart:icon,Flame:icon,Droplets:icon,Play:icon,Pause:icon,X:icon,ASSET_BY_ID:m.ASSET_BY_ID};
  Object.assign(c,{FieldKitHUD:m.FieldKitHUD,fieldKit:new m.FieldKitController(),travel:{current:null},viewRef:{current:{}},bagOpen:false,changeBag:noop,EditorOnly:m.EditorOnly,toolsToggle:{current:null},toolsTab:'mode',setToolsTab:noop,closeTools:noop,toggleTools:noop,modeTools:null,weatherTools:null,locationTools:null,cameraTools:null,canEdit:true,busy:false,tierBusy:false,terrainBusy:false,askClear:false,availableAssets:[],status:'Saved',setMessage:noop,exportDraft:noop,MobileStudioTools:control});
  for(const name of ['Box','PanelLeft','MousePointer2','Square','SlidersHorizontal','LibraryBig','Save','PanelRight','MoreHorizontal','Minimize2','Maximize2'])c[name]=icon;
  vm.runInContext(transformSync(`globalThis.renderSurface=()=>(${surface})`,{loader:'tsx'}).code,vm.createContext(c));
  const html=m.renderToStaticMarkup(c.renderSurface());
  assert(html.includes('Pause game'));assert(html.includes('Playable world'));
  for(const label of ['World tools','Workspace mode','World panels','Toggle game monitor','Save world to site','World settings','Game monitor','Expand view','studio-play-monitor','studio-workspace-feedback'])assert(!html.includes(label),`Play must not expose ${label}`);
 }
 console.log(JSON.stringify({passed:true,placements:draft.items.length,layouts:['desktop','mobile'],checks:['current authored world','isolated runtime changes','restart snapshot','restore editor camera and panels','no editor or monitor UI in Play']},null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}

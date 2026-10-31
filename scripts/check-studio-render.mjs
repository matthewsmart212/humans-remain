import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import ts from 'typescript';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'studio-render-'));
try {
 await build({stdin:{contents:`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import WorldEditor from './src/WorldEditor';import BaseChecklist from './src/BaseChecklist';export {installImportedArt} from './src/imported-art';export const renderWorld=()=>renderToStaticMarkup(<WorldEditor/>);export const renderLibrary=()=>renderToStaticMarkup(<BaseChecklist embedded onBack={()=>{}} onPlace={()=>{}}/>);import CombatPanel from './src/CombatPanel';import {createCampPlaySession} from './src/studio-play';import {emptyLayout} from './src/world-layout';import {readPlayMonitor} from './src/studio-monitoring';export const renderCombat=()=>renderToStaticMarkup(<CombatPanel stats={readPlayMonitor(createCampPlaySession(emptyLayout()),null,{fps:60,frameMs:16.7,drawMs:2})} suspended={false} onSpawn={async()=>''} onClear={()=>{}} onHeal={()=>{}}/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'cjs',loader:{'.css':'empty'},plugins:[{name:'render-workspace-states',setup(b){
  // SSR has no effects. Seed only initial hook state to render the real Play JSX.
  b.onLoad({filter:/WorldEditor\.tsx$/},args=>{
   const source=fs.readFileSync(args.path,'utf8'),ast=ts.createSourceFile(args.path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[];
   const visit=n=>{if(ts.isVariableDeclaration(n)&&ts.isArrayBindingPattern(n.name)&&n.initializer&&ts.isCallExpression(n.initializer)&&n.initializer.expression.getText(ast)==='useState'){
    const name=n.name.elements[0].getText(ast),arg=n.initializer.arguments[0];
    if(['mode','ready','paused','monitorOpen','playToolTab','toolsOpen','toolsTab','message','askClear','timeOfDay'].includes(name)&&arg)edits.push({start:arg.getStart(ast),end:arg.end,text:`(globalThis.__studioMarkupState?.${name} ?? (${arg.getText(ast)}))`});
   }ts.forEachChild(n,visit)};visit(ast);
   let contents=source;for(const e of edits.sort((a,b)=>b.start-a.start))contents=contents.slice(0,e.start)+e.text+contents.slice(e.end);
   return{contents,loader:'tsx'};
  });
 }},{name:'skip-gpu-for-markup-only',setup(b){b.onResolve({filter:/^\.\/skia-web$/},()=>({path:'graphics',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export function createWebWorld(){throw Error("No GPU in markup test")}',loader:'js'}))}}],outfile:path.join(temp,'render.cjs'),logLevel:'error'});
 const m=createRequire(import.meta.url)(path.join(temp,'render.cjs'));
 const archive='docs/archive/asset-library-cleanup-2026-10-10';m.installImportedArt(JSON.parse(fs.readFileSync(archive+'/artwork.json')).records);
 const draft=JSON.parse(fs.readFileSync(archive+'/draft.json')).draft;
 const store=new Map([['safety-last-world-draft-v1',JSON.stringify(draft)]]);
 globalThis.localStorage={getItem:key=>store.get(key)||null};globalThis.location={hash:'#editor'};globalThis.document={documentElement:{}};
 const viewports=[{name:'Desktop',width:1440,height:900,mobile:false},{name:'iPhone portrait',width:390,height:780,mobile:true},{name:'iPhone landscape',width:844,height:390,mobile:true},{name:'Small phone',width:320,height:568,mobile:true}];
 const viewport=v=>{globalThis.window={innerHeight:v.height,innerWidth:v.width,matchMedia:q=>({matches:q==='(max-width: 1000px), (pointer: coarse)'?v.mobile:false})}};
 const worldSection=markup=>{const start=markup.indexOf('<section class="we-world"'),end=markup.indexOf('</section>',start);assert(start>0&&end>start);return{start,game:markup.slice(start,end)}};
 for(const v of viewports){
  viewport(v);globalThis.__studioMarkupState=undefined;
  const markup=m.renderWorld();assert(markup.includes('data-objects="22"'));assert(markup.includes('aria-label="Workspace mode"'));assert(markup.includes('Asset library'));assert(markup.includes('World viewport'));
  assert(!markup.includes('Apply to game'));assert(!markup.includes('survival shift'));assert(!markup.includes('Place starter kit'));
  assert.equal(markup.includes('aria-label="Scene objects"'),!v.mobile,'Desktop scene dock opens; mobile starts with the whole world visible');
  assert.equal(markup.includes('OBJECT INSPECTOR'),!v.mobile,'Touch inspector starts closed');
  assert.equal(markup.includes('class="studio-toolbar"'),!v.mobile);
  assert.equal(markup.includes('aria-label="Toggle tools"'),v.mobile);
  assert.equal(markup.includes('aria-label="Night lighting"'),!v.mobile);
  if(v.mobile){assert(markup.includes('data-mobile-dock="false"'));assert(markup.includes('data-tools-open="false"'))}
 }
 // The expanded tools render only the chosen group; every group is reachable
 // outside the canvas, with a labelled close control and keyboard tab semantics.
 for(const v of viewports.filter(v=>v.mobile))for(const mode of ['edit','play'])for(const toolsTab of ['mode','weather','camera']){
  viewport(v);globalThis.__studioMarkupState={mode,ready:true,toolsOpen:true,toolsTab,monitorOpen:false};
  const markup=m.renderWorld(),{start,game}=worldSection(markup);
  assert(markup.includes('data-mobile-dock="true"'));
  assert(markup.indexOf('class="studio-mobile-tools"')<start);assert(!game.includes('studio-mobile-tools'));
  assert(markup.includes('aria-label="Collapse tools"'));assert(markup.includes('aria-label="Tool groups"'));
  assert(markup.includes('id="studio-tool-tab-'+toolsTab+'" role="tab" aria-selected="true" tabindex="0"'));
  if(toolsTab==='weather')for(const label of ['Night lighting','Rain','Heavy rain','Fog','Lightning','Test lightning strike'])assert(markup.includes('aria-label="'+label+'"'),label);
  if(toolsTab==='camera')for(const label of ['Zoom out','Zoom in','Follow player','Controls and shortcuts'])assert(markup.includes('aria-label="'+label+'"'),label);
  if(toolsTab==='mode'&&mode==='edit')for(const label of ['Select and move objects','Pan map','Walk preview','Undo','Redo','Grid and snap','Show collision lines','Set player spawn'])assert(markup.includes('aria-label="'+label+'"'),label);
  if(toolsTab==='mode'&&mode==='play')for(const label of ['Pause game','Restart game'])assert(markup.includes('aria-label="'+label+'"'),label);
  assert.equal(game.includes('we-joystick'),mode==='play','Opening docked tools never removes movement');
 }
 // Camera, Help, and diagnostics never become game overlays. Exercise both tabs,
 // open/closed docks, and paused/running sessions in both phone orientations.
 for(const v of viewports)for(const paused of [false,true])for(const monitorOpen of [false,true])for(const playToolTab of ['monitor','combat']){
  viewport(v);globalThis.__studioMarkupState={mode:'play',ready:true,paused,monitorOpen,playToolTab,toolsOpen:false,message:'Draft saved',askClear:false,timeOfDay:paused?'night':'day'};
  const markup=m.renderWorld(),{start,game}=worldSection(markup);
  assert(game.includes('studio-play-hud'));
  for(const forbidden of ['we-camera','studio-camera','we-help','studio-pause','we-message','Test supplies','SCENE VIEW','Game monitor','Back to building','studio-combat-tab','studio-mobile-tools'])assert(!game.includes(forbidden),forbidden+' is not gameplay');
  if(!v.mobile){
   assert(markup.indexOf('aria-label="Camera controls"')<markup.indexOf('aria-label="Controls and shortcuts"'));
   assert(markup.indexOf('aria-label="Controls and shortcuts"')<start);
   assert(markup.includes('aria-label="Night lighting" aria-pressed="'+paused+'"'));
  }
  assert.equal(markup.includes('aria-label="Live game monitor"'),monitorOpen);assert(!markup.includes('aria-label="Scene objects"'));
  if(monitorOpen){
   assert(markup.indexOf('aria-label="Live game monitor"')<start);assert(markup.includes('id="studio-combat-tab"'));
   assert(markup.includes('aria-label="Collapse play tools"'));
   if(playToolTab==='monitor'){assert(markup.includes('FPS'));assert(markup.includes('Ground drops'))}
   else {assert(markup.includes('Spawn 1'));assert(markup.indexOf('Spawn 1')<markup.indexOf('Combat guide &amp; stats'))}
  }
  assert.equal(game.includes('we-joystick'),v.mobile&&!paused,'Docked monitor leaves the game joystick available');
  assert.equal(game.includes('we-axe-controls'),!paused);assert.equal(game.includes('aria-label="Dodge"'),!paused,'Dodge is available only during live Play');
 }
 // Save remains accessible in More on mobile, along with all less-used tools.
 for(const v of viewports.filter(v=>v.mobile)){
  viewport(v);globalThis.__studioMarkupState={ready:true,askClear:true};
  const markup=m.renderWorld(),options=markup.slice(markup.indexOf('class="we-options studio-options"'));
  for(const label of ['Save world','Asset library','World settings','Export world','Import world','Controls &amp; shortcuts','Close workspace options'])assert(options.includes(label),label);
  globalThis.__studioMarkupState={mode:'play',ready:true};
  assert(!m.renderWorld().includes('aria-label="Live game monitor"'),'Phone Play starts with the monitor collapsed');
 }
 const combat=m.renderCombat();for(const label of ['Enemy type','Scrap Walker','Spawn count','Spawn 1','Restore health','Clear enemies'])assert(combat.includes(label));
 globalThis.__studioMarkupState=undefined;
 const library=m.renderLibrary();assert(library.includes('al-embedded'));assert(library.includes('Place Camp bonfire in world'));assert(library.includes('Back to world'));assert(library.includes('Add assets'));
 console.log('PASS: desktop and iPhone-landscape initial markup render; 22-object world and unified Build / Play / Library navigation present; mobile drawers closed; retired Apply / starter kit absent; library provides Place actions. Play has gameplay-only markup with camera, feedback and live monitor outside its viewport; desktop/touch and paused/running variants pass. Browser visual QA is not covered by this test.');
} finally {fs.rmSync(temp,{recursive:true,force:true});}

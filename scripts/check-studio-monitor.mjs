import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'studio-monitor-'));
try{
 await build({stdin:{contents:`export * from './src/studio-monitoring';export * from './src/studio-play';export {emptyLayout} from './src/world-layout';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'model.mjs'),logLevel:'error'});
 const {RenderFrameMeter,readPlayMonitor,createCampPlaySession,stepCampPlaySession,emptyLayout}=await import(pathToFileURL(path.join(temp,'model.mjs')));
 const near=(a,b)=>assert(Math.abs(a-b)<.01,`${a} should be near ${b}`);
 for(const fps of [30,60,120]){
  const meter=new RenderFrameMeter();assert.equal(meter.read(0).fps,null);
  for(let frame=0;frame<=fps;frame++)meter.record(frame*1000/fps,4);
  const stats=meter.read(1000);near(stats.fps,fps);near(stats.frameMs,1000/fps);near(stats.drawMs,4);
  assert.equal(meter.read(4001).fps,null,'A stopped renderer never leaves a stale FPS reading');
  meter.record(5000,1,false);assert.equal(meter.read(5000).fps,null);
  for(let frame=0;frame<=fps;frame++)meter.record(9000+frame*1000/fps,2);
  near(meter.read(10000).fps,fps);near(meter.read(10000).drawMs,2);
  meter.reset();assert.equal(meter.read(10000).frameMs,null);
 }
 // Long frames must lower measured FPS; never clamp them to the physics step.
 const slow=new RenderFrameMeter();slow.record(0,0);for(const t of [10,20,30,40,500])slow.record(t,7);
 near(slow.read(500).fps,10);near(slow.read(500).frameMs,100);
 const world=createCampPlaySession(emptyLayout()),saved=JSON.stringify(world.layout);
 const surface={clientWidth:600,clientHeight:280,width:1200,height:560,dataset:{skiaBackend:'webgl'}};
 const first=readPlayMonitor(world,surface,slow.read(500));assert.equal(first.objects,0);assert.equal(first.raw,3);assert.equal(first.renderer,'WebGL');assert.equal(first.viewport,'600 × 280');assert.equal(first.buffer,'1200 × 560');
 for(let i=0;i<60;i++)stepCampPlaySession(world,{x:1,y:0},true,false);
 world.hunger=42;world.thirst=37;world.player.hp=80;world.bag.rawMeat=2;
 const next=readPlayMonitor(world,surface,slow.read(500));near(next.seconds,1);assert.notEqual(next.x,first.x);assert.equal(next.action,'Sprinting');assert.equal(next.health,80);assert.equal(next.food,42);assert.equal(next.water,37);assert.equal(next.raw,2);assert.equal(JSON.stringify(world.layout),saved,'Monitoring cannot modify the draft');
 const restarted=readPlayMonitor(createCampPlaySession(emptyLayout()),null,slow.read(500));assert.equal(restarted.seconds,0);assert.equal(restarted.raw,3);assert.equal(restarted.viewport,'—');
 // Evaluate the actual input gating expressions: a docked monitor never pauses play.
 const source=fs.readFileSync('src/WorldEditor.tsx','utf8'),ast=ts.createSourceFile('WorldEditor.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let blocked,controls,toggle;
 function visit(n){
  if(ts.isBinaryExpression(n)&&n.operatorToken.kind===ts.SyntaxKind.EqualsToken&&n.left.getText(ast)==='blockedInput.current')blocked=n.right.getText(ast);
  if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='controlsAvailable')controls=n.initializer.getText(ast);
  if(ts.isJsxOpeningElement(n)&&n.attributes.properties.some(p=>ts.isJsxAttribute(p)&&p.name.text==='className'&&p.initializer?.text==='studio-panel-toggle'))toggle=n.attributes.properties.find(p=>p.name?.text==='onClick').initializer.expression.getText(ast);
  ts.forEachChild(n,visit);
 }visit(ast);assert(blocked&&controls&&toggle);
 const c={assetBrowser:false,paused:false,helpOpen:false,collisionEdit:null,askClear:false,error:'',mobile:true,libraryOpen:true,inspectorOpen:true,mode:'play',monitorOpen:true,ready:true};
 c.clearInput=()=>{};c.setAskClear=v=>c.askClear=v;c.setToolsOpen=v=>c.toolsOpen=v;c.setMonitorOpen=f=>c.monitorOpen=f(c.monitorOpen);c.stopPlay=()=>{throw Error('Monitor must not exit Play')};c.setLibraryOpen=()=>{throw Error('Play monitor must not alter Build docks')};
 const context=vm.createContext(c);
 assert.equal(vm.runInContext(blocked,context),false);assert.equal(vm.runInContext(controls,context),true);
 vm.runInContext(`(${toggle})()`,context);assert.equal(c.monitorOpen,false);assert.equal(c.mode,'play');
 vm.runInContext(`(${toggle})()`,context);assert.equal(c.monitorOpen,true);assert.equal(vm.runInContext(blocked,context),false);
 c.paused=true;assert.equal(vm.runInContext(blocked,context),true);assert.equal(vm.runInContext(controls,context),false);
 c.paused=false;c.mode='edit';assert.equal(vm.runInContext(blocked,context),false,'Build docks now sit outside the canvas and allow editing beside them');
 for(const modal of ['assetBrowser','helpOpen','collisionEdit','askClear']){c[modal]=true;assert.equal(vm.runInContext(blocked,context),true,modal+' still captures input');assert.equal(vm.runInContext(controls,context),false);c[modal]=false}
 console.log('PASS: measured 30/60/120 FPS, slow frames, CPU timings, hidden/stale resets, live player stats and restart; opening/closing the monitor preserves Play and movement.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}

import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';
import {createRequire} from 'node:module';import {build,transformSync} from 'esbuild';import ts from 'typescript';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'studio-combat-'));
try{
 await build({stdin:{contents:`export * from './src/studio-combat';export * from './src/studio-play';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/world-assets';export * from './src/enemy-types';export * from './src/combat-renderer';export * from './src/walker-sprites';export * from './src/skia-adapter';export * from './src/world-scenes';export * from './src/imported-art';export {SceneTravel} from './src/scene-travel';export {JsiSkApi} from '@shopify/react-native-skia/lib/module/skia/web/JsiSkia';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs'),logLevel:'error'});
 const m=require(path.join(temp,'model.cjs'));
 const draft={...m.emptyLayout(),spawn:{x:1200,y:1200}},before=JSON.stringify(draft),fresh=()=>m.createCampPlaySession(draft),view={x:650,y:750,width:1100,height:800};
 const w=fresh();assert.equal(m.spawnCombatEnemies(m.createWorld(draft),'scrap-walker',1).spawned,0,'Build cannot spawn enemies');
 assert.equal(m.spawnCombatEnemies(w,'scrap-walker',5,view).spawned,5);
 for(const e of w.enemies){assert(!m.worldBlocked(w,e.x,e.y,22));assert(m.distance(e,w.player)>=170);assert(e.x>view.x&&e.x<view.x+view.width);assert(e.y>view.y+100&&e.y<view.y+view.height);assert.equal(e.maxHp,80)}
 for(let i=0;i<4;i++)m.spawnCombatEnemies(w,'scrap-walker',5,view);
 assert.equal(w.enemies.length,12);assert.equal(new Set(w.enemies.map(e=>e.id)).size,12);assert.equal(m.spawnCombatEnemies(w,'scrap-walker',1).spawned,0);
 assert.equal(m.spawnCombatEnemies(fresh(),'scrap-walker',1,{x:0,y:0,width:50,height:50}).spawned,0,'Never silently spawn offscreen');
 const pursuit=fresh();m.spawnCombatEnemies(pursuit,'scrap-walker',1);const initial=m.distance(pursuit.enemies[0],pursuit.player);
 for(let i=0;i<180;i++)m.stepCampPlaySession(pursuit,{x:0,y:0},false,false);
 assert(m.distance(pursuit.enemies[0],pursuit.player)<initial-80);assert(pursuit.player.hp<100,'Enemy attacks in daytime Play');assert.equal(pursuit.generator.hp,180,'Retired generator is not a target');
 for(let i=0;i<1200;i++)m.stepCampPlaySession(pursuit,{x:0,y:0},false,false);
 assert.equal(pursuit.player.hp,0);assert(pursuit.player.downedUntil);assert.equal(pursuit.phase,'day');assert(!m.swingAxe(pursuit));m.restoreCombatHealth(pursuit);assert.equal(pursuit.player.hp,100);assert.equal(pursuit.player.downedUntil,0);
 m.clearCombatEnemies(pursuit);assert.equal(pursuit.enemies.length,0);
 const axe=fresh();m.spawnCombatEnemies(axe,'scrap-walker',3);axe.player.direction='right';
 Object.assign(axe.enemies[0],{x:1280,y:1200});Object.assign(axe.enemies[1],{x:1110,y:1200});Object.assign(axe.enemies[2],{x:1480,y:1200});
 assert(m.swingAxe(axe));for(let i=0;i<16;i++){axe.tick++;m.stepAxe(axe)}
 assert.equal(axe.enemies[0].hp,40);assert.equal(axe.enemies[1].hp,80,'Behind player is outside swing arc');assert.equal(axe.enemies[2].hp,80,'Distant enemy is outside reach');
 for(let i=0;i<30;i++){axe.tick++;m.stepAxe(axe)}assert.equal(axe.enemies[0].hp,40,'One contact per swing');
 assert(m.swingAxe(axe));for(let i=0;i<36;i++){axe.tick++;m.stepAxe(axe)}assert.equal(axe.enemies.length,2);assert.equal(axe.kills,1);
 const wall=m.newPlacement('base_well_t1',1260,1220);wall.collision={lineWidth:.02,paths:[{closed:true,points:[[.05,.05],[.95,.05],[.95,.95],[.05,.95]]}]};
 const fenced=m.createCampPlaySession({...draft,spawn:{x:1000,y:1200},items:[wall]});m.spawnCombatEnemies(fenced,'scrap-walker',5);for(const e of fenced.enemies)assert(!m.worldBlocked(fenced,e.x,e.y,22));
 const one=fenced.enemies[0];Object.assign(one,{x:1430,y:1200});fenced.enemies=[one];
 for(let i=0;i<500;i++){m.stepCampPlaySession(fenced,{x:0,y:0},false,false);assert(!m.worldBlocked(fenced,one.x,one.y,18),'Pursuit respects authored blockers')}
 assert(m.distance(one,fenced.player)<75,'Enemy routes around an obstruction');
 assert.equal(JSON.stringify(draft),before);assert.equal(fresh().enemies.length,0,'Restart clears runtime enemies');
 const archive='docs/archive/asset-library-cleanup-2026-10-10';m.installImportedArt(JSON.parse(fs.readFileSync(archive+'/artwork.json')).records);
 const authored=JSON.parse(fs.readFileSync(archive+'/draft.json')).draft,authoredBefore=JSON.stringify(authored),camp=m.createCampPlaySession(authored);
 m.spawnCombatEnemies(camp,'scrap-walker',5);for(let i=0;i<180;i++)m.stepCampPlaySession(camp,{x:0,y:0},false,true);assert.equal(JSON.stringify(authored),authoredBefore);
 // The actual asynchronous button handler rejects stale Play / map instances.
 const source=fs.readFileSync('src/WorldEditor.tsx','utf8'),ast=ts.createSourceFile('WorldEditor.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let fn;
 const visit=n=>{if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='spawnEnemies')fn=n.initializer.getText(ast);ts.forEachChild(n,visit)};visit(ast);assert(fn);
 let resolve;const pending=new Promise(r=>resolve=r),runtime=fresh(),context={...m,ready:true,modeRef:{current:'play'},world:{current:runtime},renderer:{current:{warmImages:()=>pending}},canvas:{current:{width:1000,height:800,focus(){}}},travel:{current:null},clearInput(){},viewRef:{current:{}},editorCamera:()=>({x:650,y:750,scale:1})};vm.createContext(context);vm.runInContext(transformSync(`globalThis.spawn=${fn}`,{loader:'ts'}).code,context);
 const spawning=context.spawn('scrap-walker',1);context.world.current=fresh();resolve();assert.match(await spawning,/cancelled/);assert.equal(runtime.enemies.length,0);assert.equal(context.world.current.enemies.length,0);
 // Render the existing sprite through the real Skia adapter, including its hit flash.
 const kit=await require('canvaskit-wasm')({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm')),f)}),skia=m.JsiSkApi(kit),adapter=m.createSkiaAdapter(skia),surface=skia.Surface.Make(360,260),canvas=surface.getCanvas(),font=skia.Font(undefined,14),ctx=new adapter.SkiaContext(canvas,360,260,font);
 const asset=m.ASSET_BY_ID.get('art-scrapling-scrapling'),data=skia.Data.fromBytes(fs.readFileSync('public'+asset.image)),image=skia.Image.MakeImageFromEncoded(data);assert(image);
 const render=fresh();m.spawnCombatEnemies(render,'scrap-walker',1);Object.assign(render.enemies[0],{x:180,y:190,hp:40,flashUntil:1,moving:true,walkDistance:24});
 canvas.clear(skia.Color('#25382b'));const clear=surface.makeImageSnapshot(),base=clear.readPixels();clear.dispose();
 const draws=m.combatDrawables(ctx,{[m.assetImageKey(asset.image)]:image},render);assert.equal(draws.length,1);draws[0].draw();surface.flush();const snapshot=surface.makeImageSnapshot();assert.notDeepEqual(snapshot.readPixels(),base,'Live enemy is visibly drawn');
 if(process.argv[2]){fs.mkdirSync(process.argv[2],{recursive:true});fs.writeFileSync(path.join(process.argv[2],'scrap-walker-hit.png'),snapshot.encodeToBytes())}
 snapshot.dispose();ctx.dispose();image.dispose();data.dispose();font.dispose();surface.dispose();adapter.disposeLighting();
 console.log('PASS: safe visible spawning, 12-enemy cap, pursuit and damage, collision routing, directional one-contact axe hits and kills, restore / clear, unchanged draft, reset, stale asynchronous cancellation, and real Skia sprite render.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}

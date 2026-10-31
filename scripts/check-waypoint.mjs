import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'waypoint-check-')),require=createRequire(import.meta.url);
try{
 await build({stdin:{contents:"export * from './src/waypoint';export * from './src/player-map';export * from './src/survival-engine';export * from './src/world-scenes';export * from './src/studio-play';export * from './src/waypoint-renderer';export * from './src/sky-clock';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(dir,'model.cjs'),logLevel:'error'});
 const m=require(path.join(dir,'model.cjs')),w=m.createWorld(),target={x:w.player.x+800,y:w.player.y-400};
 assert(m.placeWaypoint(w,target));assert.deepEqual(m.currentWaypoint(w),{...target,sceneId:'camp'});
 for(const [width,height] of [[390,844],[844,390],[320,568],[1024,768]])for(const zoom of [1,4,12]){
  const view=m.playerMapView(m.playerMapScene(w).bounds,width,height,zoom,w.player),screen=m.projectMapPoint(target,view),point=m.unprojectMapPoint(screen,view);
  assert(Math.hypot(point.x-target.x,point.y-target.y)<1e-7,'Waypoint uses the same map projection at every zoom');
 }
 const previous=w.waypoint;assert(!m.placeWaypoint(w,{x:Infinity,y:0}));assert(!m.placeWaypoint(w,{x:1e9,y:0}));assert.equal(w.waypoint,previous);
 w.scene=m.BUNKER_SCENE;assert.equal(m.currentWaypoint(w),undefined,'Outdoor destination never points to unrelated interior coordinates');
 w.scene=undefined;assert.equal(m.currentWaypoint(w),previous,'Outdoor marker survives a scene visit');
 assert.equal(m.currentWaypoint(m.createWorld()),undefined,'A new round starts without the previous destination');
 m.clearWaypoint(w);assert.equal(w.waypoint,undefined);
 const tap=new m.WaypointTap();tap.begin(1,100,100,1);assert(tap.end(1,102,103));
 tap.begin(1,100,100,1);tap.move(130,100,1);tap.move(100,100,1);assert(!tap.end(1,100,100),'Dragging away and back never places a marker');
 tap.begin(1,100,100,1);tap.begin(2,200,100,2);assert(!tap.end(1,100,100),'A two-finger pinch cannot place a marker');
 tap.begin(1,100,100,1);tap.cancel();assert(!tap.end(1,100,100));
 tap.begin(3,100,100,1);tap.move(110,100,1);assert(tap.pending&&tap.end(3,110,100),'Thumb jitter remains a tap');
 for(let i=0;i<8;i++){
  const angle=i*Math.PI/4,p={x:0,y:0},t={x:Math.cos(angle)*1000,y:Math.sin(angle)*1000};
  assert(Math.abs(Math.sin(m.waypointBearing(p,t)-angle-Math.PI/2))<1e-7,'Needle follows all eight directions');
 }
 for(const advance of [m.stepWorld,(world,input)=>m.stepCampPlaySession(world,input,false,false)]){
  const world=m.createWorld();world.player.x=1200;world.player.y=1200;
  const destination={x:world.player.x+m.WAYPOINT_ARRIVAL_RADIUS+10,y:world.player.y};
  assert(m.placeWaypoint(world,destination));advance(world,{x:0,y:0});assert(world.waypoint,'Distant marker survives simulation');
  world.scene=m.BUNKER_SCENE;world.player.x=destination.x;world.player.y=destination.y;advance(world,{x:0,y:0});assert(world.waypoint,'Matching coordinates in another scene do not complete outdoor destination');
  world.scene=undefined;world.player.x=destination.x-m.WAYPOINT_ARRIVAL_RADIUS;advance(world,{x:0,y:0});assert.equal(world.waypoint,undefined,'Arrival clears waypoint in both simulation entry points');
 }
 for(const [width,height] of [[390,844],[844,390],[320,568],[568,320]]){
  const safe={top:0,right:0,bottom:0,left:0},l=m.skyHudLayout(width,height,safe,false,true,true);
  assert.equal(l.toolbarWidth,height>=width?190:322);assert(l.combatWidth>=110,'Navigation leaves legible vitals');
  assert.equal(m.skyHudLayout(width,height,safe,true,true,true).vitalsTopOffset,height>=width?104:0);
 }
 // Recorded Canvas calls verify terrain registration independently of HUD position.
 const renderWorld=m.createWorld();renderWorld.player.x=1200;renderWorld.player.y=1200;m.placeWaypoint(renderWorld,{x:1700,y:1200});
 const translations=[],calls=[];const ctx=new Proxy({},{get:(_,key)=>key==='translate'?((x,y)=>translations.push([x,y])):(...args)=>calls.push([key,...args]),set:()=>true});
 m.drawWorldWaypoint(ctx,renderWorld,{x:1000,y:900,width:1800,height:900,scale:.5});assert.deepEqual(translations[0],[1700,1200],'Pin anchors at exact world destination');
 assert(calls.some(c=>c[0]==='ellipse'),'Terrain contact ring is drawn');
 translations.length=0;m.drawWorldWaypoint(ctx,renderWorld,{x:-5000,y:-5000,width:1800,height:900,scale:1});assert.equal(translations.length,0,'Off-screen destinations do not draw');
 console.log(JSON.stringify({result:'pass',checks:['map/waypoint projection at 12 viewport/zoom combinations','finite world bounds','scene-safe destinations','round reset and explicit removal','tap vs drag/pinch/cancel','eight-direction toolbar needle','portrait/landscape toolbar layout','shared terrain pin registration and culling','arrival in both simulation loops','scene-safe arrival']}));
}finally{fs.rmSync(dir,{recursive:true,force:true})}

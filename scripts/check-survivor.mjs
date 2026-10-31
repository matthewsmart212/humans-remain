import {build} from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'survivor-check-'));
try{
 await build({stdin:{contents:`export * from './src/survivor-animation';export * from './src/survivor-art';export * from './src/runner-cycles';export * from './src/runner-leg-motion';export * from './src/player-presentation';export * from './src/world-layout';export {default as SprintButton} from './src/SprintButton';export * from './src/survival-engine';export * from './src/worker-renderer';`,resolveDir:process.cwd()},loader:{'.css':'empty'},bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'check.mjs')});
 const m=await import(pathToFileURL(path.join(dir,'check.mjs')));
 const imgs=Object.fromEntries(Object.keys(m.SURVIVOR_IMAGE_SOURCES).map(key=>[key,{name:key}]));
 for(const direction of Object.keys(m.DIRECTION_ANGLES)){
  const w=m.createWorld();w.player.direction=direction;
  const calls=[],ctx={save(){},restore(){},translate(){},scale(){},rotate(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){},drawImage(...args){calls.push(args)}};
  m.drawWorker(ctx,imgs,w);assert.equal(calls.length,1,'one complete idle sprite');
  const idle=calls[0];
  for(const run of [false,true])for(let step=0;step<4;step++){
   Object.assign(w.player,{moving:true,sprinting:run,runBlend:run?1:0,walkBlend:1,walkDistance:step*28});
   const expected=m.runnerCycle(direction,step*28,run),before=JSON.stringify(w);
   const countBefore=calls.length;
   m.drawWorker(ctx,imgs,w);const draw=calls.at(-1);
   assert.equal(calls.length-countBefore,m.runnerLegView(direction,run)?3:1,'only affected views use the two-leg renderer');
   assert.equal(draw[0],imgs[expected.sprite.sheet]);
   assert.deepEqual(draw.slice(1,5),expected.sprite.crop,'original body and arm artwork stays registered');
   assert.equal(JSON.stringify(w),before,'drawing cannot mutate movement or combat');
   assert.deepEqual(m.runnerCycle(direction,112,run),m.runnerCycle(direction,0,run),'exact loop closure');
   assert(expected.bob<=0&&expected.bob>=-1.1,'restrained whole-body lift');
  }
  Object.assign(w.player,{moving:false,walkBlend:0});m.drawWorker(ctx,imgs,w);
  assert.deepEqual(calls.at(-1),idle,'stopping restores the dedicated planted pose');
  // New worlds now equip an axe; this fixture specifically covers unarmed punch.
  w.player.equipped=null;w.tick=6;w.attackReady=.52;w.attackAngle=m.DIRECTION_ANGLES[direction];
  m.drawWorker(ctx,imgs,w);const punch=m.SURVIVOR_ART[direction].punch;
  assert.equal(calls.at(-1)[0],imgs[punch.sheet]);assert.deepEqual(calls.at(-1).slice(1,5),punch.crop);
 }
 // Body/arm artwork and the affected legs share four selected, held poses;
 // extra reach/kick drawings must not creep back in.
 for(const direction of Object.keys(m.DIRECTION_ANGLES))for(const run of [false,true]){
  const frames=Array.from({length:112},(_,distance)=>m.runnerCycle(direction,distance,run));
  assert.equal(new Set(frames.map(f=>f.sprite)).size,4,'exactly four whole-body drawings per cycle');
  const changes=frames.slice(1).filter((f,i)=>f.frame!==frames[i].frame).length;
  assert.equal(changes,3,'four even phases with no repeated kicks');
  for(let i=0;i<4;i++)assert.equal(frames.filter(f=>f.frame===i).length,28,'even step rhythm');
 }
 let count=0;
 for(const frames of Object.values(m.RUNNER_CYCLES)){
  assert.equal(frames.length,16,'eight walk and eight sprint source drawings');
  for(const f of frames){
   const png=fs.readFileSync('public'+m.SURVIVOR_IMAGE_SOURCES[f.sheet]),[x,y,w,h]=f.crop;
   assert.equal(png[25],6,'genuine RGBA source');
   assert(x>=0&&y>=0&&x+w<=png.readUInt32BE(16)&&y+h<=png.readUInt32BE(20),'entire source crop available');
   assert(w*f.scale<115&&h*f.scale<130,'no enormous feet or elongated body');
   assert(Math.abs(f.anchor[1]*f.scale-112)<2,'hair registers to a stable height');
   assert(f.anchor[0]>0&&f.anchor[0]<w,'head centre stays inside crop');count++;
  }
 }
 assert.equal(count,80);
 // Protect the eight direction/gait combinations specifically approved by the
 // user. They still render their original complete source drawing.
 const approved=[
  ['down',false,'down',[0,2,4,6]],['up',false,'up',[0,1,3,2]],
  ['up-right',false,'up-right',[0,2,1,3]],['up-left',false,'up-right',[0,2,1,3]],
  ['down',true,'down',[8,9,12,11]],['up',true,'up',[8,9,12,13]],
  ['right',true,'right',[8,9,12,13]],['left',true,'right',[8,9,12,13]]
 ];
 for(const [direction,run,view,sequence] of approved){
  assert.equal(m.runnerLegView(direction,run),undefined,'approved cycle has no replacement legs');
  for(let step=0;step<4;step++)assert.equal(m.runnerCycle(direction,step*28,run).sprite,m.RUNNER_CYCLES[view][sequence[step]]);
 }
 for(const [direction,mirror,run,view] of [
  ['right','left',false,'right'],['down-right','down-left',false,'down-right'],
  ['down-right','down-left',true,'down-right'],['up-right','up-left',true,'up-right']
 ]){
  assert.equal(m.runnerLegView(direction,run),view);assert.equal(m.runnerLegView(mirror,run),view);
  assert.equal(m.runnerCycle(direction,0,run).mirror,false);assert.equal(m.runnerCycle(mirror,0,run).mirror,true);
  const vector=view==='right'?[1,0]:view==='down-right'?[.75,.55]:[.75,-.55];
  const footLead=distance=>{
   const near=m.runnerLegPose(view,distance,run,true),far=m.runnerLegPose(view,distance,run,false);
   return (near.hip[0]+near.dx-far.hip[0]-far.dx)*vector[0]+(near.hip[1]+near.dy-far.hip[1]-far.dy)*vector[1];
  };
  assert(footLead(0)>3&&footLead(56)<-3,'different anatomical leg must lead on opposite footfalls');
  for(let distance=0;distance<112;distance++){
   const near=m.runnerLegPose(view,distance,run,true),far=m.runnerLegPose(view,distance,run,false);
   assert(Math.abs(near.advance+far.advance)<1e-10,'legs move in opposition, never the same step twice');
   assert(near.lift<1e-8||far.lift<1e-8,'one support leg remains planted');
   for(const pose of [near,far])assert(pose.stretch>.7&&pose.stretch<(run?1.3:1.35),'bounded complete legs with a wider walking stride');
  }
  for(const near of [false,true]){
   assert.deepEqual(m.runnerLegPose(view,0,run,near),m.runnerLegPose(view,112,run,near));
   const poses=new Set();
   for(let sample=0;sample<1120;sample++){
    const distance=sample/10,frame=m.runnerCycle(direction,distance,run).frame;
    const pose=m.runnerLegPose(view,distance,run,near);
    assert.deepEqual(pose,m.runnerLegPose(view,frame*28,run,near),'walking and sprinting feet hold their pose in sync with the body frame');
    poses.add(JSON.stringify(pose));
   }
   assert.equal(poses.size,4,'both gaits use four distinct held poses, without smooth in-between leg motion');
  }
 }
 const legLayers=JSON.parse(fs.readFileSync('src/runner-leg-layers.json','utf8'));
 const legPng=fs.readFileSync('public'+m.SURVIVOR_IMAGE_SOURCES.runnerLegLayers);
 assert.equal(legPng[25],6,'separate legs retain genuine alpha');
 for(const pair of Object.values(legLayers)){
  assert.equal(pair.length,2);
  for(const {crop:[x,y,w,h],outline} of pair){
   assert(x>=0&&y>=0&&x+w<=legPng.readUInt32BE(16)&&y+h<=legPng.readUInt32BE(20));
   assert(Math.max(...outline.map(p=>p[1]))===h-1,'outline includes the entire boot sole');
  }
 }
 // Presentation interpolates only the player, including cycle wrap. Collision
 // state remains untouched, and teleports are never slowly slid through walls.
 const smooth=m.createWorld(),previous=m.samplePlayer(smooth);
 previous.x=100;previous.y=100;previous.walkDistance=110;previous.runBlend=0;
 Object.assign(smooth.player,{x:108,y:104,walkDistance:2,runBlend:1});
 const state=JSON.stringify(smooth),shown=m.presentPlayer(smooth,previous,.5);
 assert.equal(shown.player.x,104);assert.equal(shown.player.y,102);assert.equal(shown.player.walkDistance,0);
 assert.equal(shown.player.runBlend,.5);assert.equal(JSON.stringify(smooth),state);
 assert.equal(m.presentPlayer(smooth,undefined,.5),smooth);
 assert.equal(m.presentPlayer(smooth,{...previous,x:0},.5),smooth,'teleport is instant');
 const stopped=m.createWorld();Object.assign(stopped.player,{walkDistance:43,walkBlend:1});const position={x:stopped.player.x,y:stopped.player.y};let blend=1;
 for(let i=0;i<20;i++){m.movePlayer(stopped,{x:0,y:0});assert(stopped.player.walkBlend<=blend);blend=stopped.player.walkBlend;assert.equal(stopped.player.walkDistance,43,'stop preserves gait phase');assert.equal(stopped.player.moving,false)}
 assert.equal(blend,0,'settles fully to idle');assert.deepEqual({x:stopped.player.x,y:stopped.player.y},position);
 const blocked=m.createWorld();Object.assign(blocked.player,{x:19,y:1000,walkDistance:43,walkBlend:1});m.movePlayer(blocked,{x:-1,y:0});
 assert.equal(blocked.player.moving,false,'wall stops footstep progression');assert.equal(blocked.player.walkDistance,43);assert(blocked.player.walkBlend<1,'blocked movement eases down');
 // Exercise simulation independently of rendering: sprint is faster, diagonals
 // are normalised, walls still stop the capsule, and downed players cannot run.
 const open=()=>{const w=m.createWorld(m.emptyLayout());Object.assign(w.player,{x:1500,y:1500});return w};
 const walk=open(),run=open(),diagonal=open();
 for(let i=0;i<60;i++){m.movePlayer(walk,{x:1,y:0});m.movePlayer(run,{x:1,y:0},true);m.movePlayer(diagonal,{x:1,y:1},true)}
 const walked=walk.player.x-1500,ran=run.player.x-1500;
 assert(Math.abs(walked-285)<.01,'existing walking speed preserved');
 assert(ran>walked*1.45&&ran<=walked*m.SPRINT_SPEED,'sprint accelerates smoothly to 1.55x');
 assert(Math.abs(Math.hypot(diagonal.player.x-1500,diagonal.player.y-1500)-ran)<.01,'no diagonal speed bonus');
 assert(run.player.sprinting);assert.equal(run.player.runBlend,1);
 const stopPhase=run.player.walkDistance;
 for(let i=0;i<40;i++)m.movePlayer(run,{x:0,y:0},true);
 assert(!run.player.sprinting);assert.equal(run.player.runBlend,0);assert.equal(run.player.walkBlend,0);assert.equal(run.player.walkDistance,stopPhase);
 const againstWall=open();Object.assign(againstWall.player,{x:19,y:1000});
 for(let i=0;i<60;i++)m.movePlayer(againstWall,{x:-1,y:0},true);
 assert.equal(againstWall.player.x,19);assert.equal(againstWall.player.walkDistance,0);assert(!againstWall.player.sprinting);
 const downed=open();downed.player.downedUntil=10;
 for(let i=0;i<60;i++)m.movePlayer(downed,{x:1,y:0},true);
 assert(Math.abs(downed.player.x-1565)<.01);assert(!downed.player.sprinting);assert.equal(downed.player.runBlend,0);
 // Releasing sprint blends back to walking without rewinding the gait.
 const phase=diagonal.player.walkDistance;m.movePlayer(diagonal,{x:1,y:0},false);
 assert(diagonal.player.runBlend>0&&diagonal.player.runBlend<1);assert.notEqual(diagonal.player.walkDistance,0);assert.notEqual(diagonal.player.walkDistance,phase);
 // Touch activation must work while another pointer owns the joystick, and
 // its eventual compatibility click must not toggle sprint a second time.
 let toggles=0,prevented=0;
 const button=m.SprintButton({active:false,onToggle:()=>toggles++});
 const pointer={button:0,isPrimary:false,preventDefault:()=>prevented++,stopPropagation(){}};
 button.props.onPointerDown(pointer);assert.equal(toggles,1);assert.equal(prevented,1);
 button.props.onClick({detail:1,stopPropagation(){}});assert.equal(toggles,1,'no duplicate touch/click toggle');
 button.props.onClick({detail:0,stopPropagation(){}});assert.equal(toggles,2,'keyboard and assistive activation');
 button.props.onPointerDown({...pointer,button:2});assert.equal(toggles,2,'ignore secondary mouse button');
 // Sector-boundary noise does not flicker the sprite, but clear turns respond.
 const turning=open();m.movePlayer(turning,{x:1,y:0});
 for(const a of [.37,.41,.38,.42]){m.movePlayer(turning,{x:Math.cos(a),y:Math.sin(a)});assert.equal(turning.player.direction,'right')}
 m.movePlayer(turning,{x:1,y:1});assert.equal(turning.player.direction,'down-right');
 m.movePlayer(turning,{x:-1,y:0});assert.equal(turning.player.direction,'left');
 console.log('Scrap Runner checks passed: four held walking and diagonal sprint poses in sync with body frames, alternating feet, mirrored pairs, eight approved cycles preserved, intact soles, compact legs, original body/arms/idle/punch, render interpolation, turning stability, sprint/diagonal speed, walls, downed movement and multi-touch Sprint.');
}finally{fs.rmSync(dir,{recursive:true,force:true})}

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import CanvasKitInit from 'canvaskit-wasm';

// Use the actual TypeScript renderer registrations, not a duplicate animation algorithm.
async function loadSource(path){
 const result=await build({entryPoints:[path],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
 return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}

const [hunter,{axeAttachment,drawAxeGrip},{drawWorker},{createWorld,movePlayer,STEP},{emptyLayout},{playerMovementImagesForRole},{torchPose},{worldBounds},{drawWeaponGrip},skia]=await Promise.all([
 loadSource('src/hunter-sprites.ts'),
 loadSource('src/axe-renderer.ts'),
 loadSource('src/worker-renderer.ts'),
 loadSource('src/survival-engine.ts'),
 loadSource('src/world-layout.ts'),
 loadSource('src/gameplay-artwork.ts'),
 loadSource('src/torch.ts'),
 loadSource('src/world-bounds.ts'),
 loadSource('src/weapon-grip.ts'),
 CanvasKitInit()
]);
const {hunterCycle,HUNTER_ART,HUNTER_LEGACY_ART,HUNTER_IMAGE_SOURCES,hunterFacing}=hunter;

const views={
 down:{count:13,source:'down.png',runCount:11},
 'down-right':{count:20,source:'down-right.png',runCount:15},
 right:{count:18,source:'right.png',runCount:12},
 'up-right':{count:18,source:'up-right.png',runCount:16},
 up:{count:19,source:'up.png',runCount:12},
 'up-left':{count:18,source:'up-right.png',runCount:16,mirror:true},
 left:{count:18,source:'right.png',runCount:12,mirror:true},
 'down-left':{count:20,source:'down-right.png',runCount:15,mirror:true}
};
const runColumns=6,runWidth=288,runHeight=400;
const runDir='/survival/hunter-v1/run-v5/';
const atlasDir='public/survival/hunter-v1/walk-v2/';
const pngSignature=Buffer.from([137,80,78,71,13,10,26,10]);
let checked=0;
const hunterPreload=playerMovementImagesForRole('hunter');
const survivorPreload=playerMovementImagesForRole('survivor');

function openGround(role='hunter'){
 const w=createWorld(emptyLayout());
 w.survivorRole=role;
 Object.assign(w.player,{x:1500,y:1500});
 return w;
}

// Measure a complete stride through the actual movement simulation.
function measureStride(role,running,input={x:1,y:0},prepare=()=>{}){
 const w=openGround(role);
 prepare(w);
 const p=w.player,start={x:p.x,y:p.y};
 p.runBlend=running?1:0;
 const poses=[];
 for(let step=1;step<=240;step++){
  const previous=p.walkDistance;
  if(role==='hunter'&&running){
   const sprite=hunterCycle('right',previous,true).sprite;
   if(sprite!==poses.at(-1))poses.push(sprite);
  }
  movePlayer(w,input,running);
  assert(p.moving,'Open ground permits movement');
  if(p.walkDistance>=previous)continue;

  const distance=Math.hypot(p.x-start.x,p.y-start.y),seconds=step*STEP;
  const stoppedPhase=p.walkDistance;
  movePlayer(w,{x:0,y:0},false);
  assert.equal(p.walkDistance,stoppedPhase,'Stopping holds the gait phase');
  return {distance,seconds,poses,speed:distance/seconds};
 }
 assert.fail(role+' gait never wrapped');
}
function assertStride(gait,expected,message){
 assert(gait.distance>=expected-1e-7&&gait.distance<expected+gait.speed*STEP+1e-7,message);
}
const survivorRun=measureStride('survivor',true);
const hunterRun=measureStride('hunter',true);
assert.deepEqual(hunterRun.poses,HUNTER_ART.right.run,'All east run poses appear in order before wrapping');
assert(Math.abs(hunterRun.speed-survivorRun.speed)<1e-8,'Hunter and Survivor cover the same ground per second');
assertStride(hunterRun,220,'Hunter completes a sprint stride in 220 world units');
for(const role of ['survivor','medic','engineer']){
 const gait=role==='survivor'?survivorRun:measureStride(role,true);
 assertStride(gait,200,role+' keeps its 200-unit sprint stride');
 assertStride(measureStride(role,false),160,role+' keeps its 160-unit walking stride');
}
const hunterWalk=measureStride('hunter',false);
assertStride(hunterWalk,180,'Hunter completes a walking stride in 180 world units');
assert(hunterRun.seconds<hunterWalk.seconds,'Sprinting cycles the feet faster than walking');

// Reduced travel must stretch frame delays without changing the ground covered per stride.
for(const running of [false,true]){
 const full=running?hunterRun:hunterWalk,units=running?220:180;
 const slow=measureStride('hunter',running,{x:.5,y:0});
 assertStride(slow,units,'Half joystick input preserves the '+(running?'run':'walk')+' stride');
 assert(Math.abs(slow.speed-full.speed*.5)<1e-8,'Half joystick input halves travel speed');
 assert(slow.seconds>=full.seconds*1.9,'Half joystick input slows animation with movement');
 const heavy=measureStride('hunter',running,{x:1,y:0},w=>{w.bag.stone=32});
 assertStride(heavy,units,'A heavy backpack preserves the distance per stride');
 assert(heavy.speed<full.speed&&heavy.seconds>full.seconds,'Backpack slowdown also slows animation');
 const diagonal=measureStride('hunter',running,{x:1,y:1});
 assertStride(diagonal,units,'Diagonal travel preserves the distance per stride');
 assert(Math.abs(diagonal.speed-full.speed)<1e-8,'Diagonal movement has the same speed');
 assert.equal(diagonal.seconds,full.seconds,'Diagonal movement has the same cadence');
}

const blocked=openGround(),edge=worldBounds(blocked).right-19;
Object.assign(blocked.player,{x:edge,walkDistance:43,runBlend:1});
for(let step=0;step<30;step++)movePlayer(blocked,{x:1,y:0},true);
assert.equal(blocked.player.x,edge,'The boundary blocks attempted movement');
assert.equal(blocked.player.walkDistance,43,'Pushing a wall does not advance animation');
assert.equal(blocked.player.moving,false,'A blocked Hunter is stationary');

const transition=openGround();
transition.player.walkDistance=43;
for(const running of [true,false,true,false]){
 for(let step=0;step<12;step++){
  const previous=transition.player.walkDistance;
  movePlayer(transition,{x:1,y:0},running);
  const advance=(transition.player.walkDistance-previous+112)%112;
  assert(advance>0&&advance<12,'Changing gait advances continuously without resetting the feet');
 }
 assert(transition.player.runBlend>0&&transition.player.runBlend<1,'Sprint changes ease between gaits');
}
const stoppedPhase=transition.player.walkDistance;
for(let step=0;step<40;step++)movePlayer(transition,{x:0,y:0},false);
assert.equal(transition.player.walkDistance,stoppedPhase,'Settling to idle preserves the foot phase');

for(const [direction,view] of Object.entries(views)){
 const mirror=!!view.mirror;
 assert.equal(hunterFacing(direction).mirror,mirror,direction+' mirror');
 assert.equal(HUNTER_ART[direction].walk.length,view.count,direction+' walk frame count');
 assert.equal(HUNTER_ART[direction].run.length,view.runCount,direction+' run frame count');
 assert.equal(HUNTER_LEGACY_ART[direction].walk.length,36,direction+' original fallback');
 assert.equal(HUNTER_ART[direction].punch.sheet.startsWith('hunterWalkV2'),false,direction+' legacy punch');

 for(const running of [false,true]){
  const count=running?view.runCount:view.count;
  const columns=running?runColumns:5;
  const [width,height]=running?[runWidth,runHeight]:[283,436];
  const url=running?runDir+view.source.replace('.png','.webp'):'/survival/hunter-v1/walk-v2/'+view.source;
  for(let index=0;index<count;index++){
   const distance=(index+.25)*112/count;
   const cycle=hunterCycle(direction,distance,running);
   assert.equal(cycle.mirror,mirror,direction+' direction mirror');
   assert.equal(cycle.frame,Math.floor((index+(running?0:.25))*4/count),direction+' equipment grip phase');
   assert.deepEqual(cycle.sprite.crop,[
    (index%columns)*width,Math.floor(index/columns)*height,width,height
   ],direction+' crop '+index);
   assert.deepEqual(cycle.sprite.anchor,[width/2,height-(running?8:4)],direction+' registered foot pivot');
   if(running){
    assert(Number.isFinite(cycle.sprite.scale)&&cycle.sprite.scale>0&&cycle.sprite.scale<1,direction+' valid run scale');
    assert(Number.isFinite(cycle.sprite.scaleX)&&cycle.sprite.scaleX>0&&cycle.sprite.scaleX<1,direction+' valid horizontal registration');
    assert.equal(cycle.sprite.scale,HUNTER_ART[direction].run[0].scale,direction+' keeps one body scale throughout the stride');
    assert.equal(cycle.sprite.scaleX,HUNTER_ART[direction].run[0].scaleX,direction+' keeps one body width throughout the stride');
    const authored=view.source.replace('.png','');
    assert.equal(cycle.sprite.scale,HUNTER_ART[authored].run[index].scale,direction+' mirrored scale matches its authored view');
    assert.equal(cycle.sprite.scaleX,HUNTER_ART[authored].run[index].scaleX,direction+' mirrored width matches its authored view');
    assert.deepEqual(cycle.sprite.hand,HUNTER_ART[authored].run[index].hand,direction+' mirrors the body and palm together');
   }else assert.equal(cycle.sprite.scale,112/410,'Walking artwork keeps its established size');
   assert.equal(HUNTER_IMAGE_SOURCES[cycle.sprite.sheet],url,direction+' image URL');
   assert.equal(hunterPreload[cycle.sprite.sheet],url,direction+' movement preload');
   assert.equal(survivorPreload[cycle.sprite.sheet],undefined,direction+' Hunter art is role specific');
   const attachment=axeAttachment({tick:80,player:{runBlend:running?1:0},axeSwing:undefined},direction,'walk',cycle);
   assert.ok(attachment.hand.every(Number.isFinite),'valid held-tool attachment');
   checked++;
  }
  assert.deepEqual(hunterCycle(direction,112,running),hunterCycle(direction,0,running),direction+' complete stride wraps');
 }
 const w={tick:80,player:{runBlend:0},axeSwing:undefined};
 for(const pose of ['idle','punch']){
  const a=axeAttachment(w,direction,pose);
  assert.ok(a.hand.every(Number.isFinite),direction+' '+pose+' attachment');
 }
}

const median=values=>{const sorted=values.slice().sort((a,b)=>a-b);return (sorted[Math.floor((sorted.length-1)/2)]+sorted[Math.floor(sorted.length/2)])/2};
function silhouetteMetrics(silhouette,width,sprite){
 const top=Math.floor(silhouette.indexOf(1)/width),bottom=Math.floor(silhouette.lastIndexOf(1)/width)+1;
 assert(top>=0&&bottom>top,'A measured frame contains a painted body');
 // Measure the stable hood region, excluding outstretched arms and the cape.
 const headBottom=Math.min(bottom,top+Math.ceil(50/sprite.scale));
 let left=width,right=-1;
 for(let row=top;row<headBottom;row++)for(let x=0;x<width;x++)if(silhouette[row*width+x]){
  left=Math.min(left,x);right=Math.max(right,x);
 }
 return {height:(bottom-top)*sprite.scale,crown:(sprite.anchor[1]-top)*sprite.scale,
  sole:(bottom-sprite.anchor[1])*sprite.scale,hood:(right-left+1)*(sprite.scaleX??sprite.scale)};
}

// Verify real pixels, registration against walking/idle, and the exact painted palms.
const unique={};
for(const view of Object.values(views))unique[view.source]=view;
for(const [filename,{count,runCount}] of Object.entries(unique)){
 const bytes=readFileSync(atlasDir+filename);
 assert.ok(bytes.subarray(0,8).equals(pngSignature),filename+' must be a PNG');
 assert.equal(bytes.readUInt32BE(16),5*283,filename+' width');
 assert.equal(bytes.readUInt32BE(20),Math.ceil(count/5)*436,filename+' height');
 const runPath='public'+runDir+filename.replace('.png','.webp');
 const run=skia.MakeImageFromEncoded(readFileSync(runPath));
 assert.ok(run,runPath+' must decode in the engine');
 assert.equal(run.width(),runColumns*runWidth);
 assert.equal(run.height(),Math.ceil(runCount/runColumns)*runHeight);
 // Inspect the silhouettes so an empty, repeated or held drawing cannot stand in for a new pose.
 const info={...run.getImageInfo(),width:runWidth,height:runHeight,colorType:skia.ColorType.RGBA_8888,colorSpace:skia.ColorSpace.SRGB};
 const poses=new Set(),runMetrics=[];
 const facing=filename.slice(0,-4);
 const sprites=HUNTER_ART[facing].run;
 for(let index=0;index<runCount;index++){
  const pixels=run.readPixels(index%runColumns*runWidth,Math.floor(index/runColumns)*runHeight,info);
  assert.ok(pixels,filename+' decoded sprint frame '+index);
  const silhouette=Buffer.alloc(runWidth*runHeight);
  for(let i=0;i<silhouette.length;i++)silhouette[i]=pixels[i*4+3]>=128?1:0;
  const {hand,anchor,scale,scaleX}=sprites[index];
  const palmX=Math.round(anchor[0]+hand[0]/(scaleX??scale)),palmY=Math.round(anchor[1]+hand[1]/scale);
  assert.equal(silhouette[palmY*runWidth+palmX],1,filename+' grip lands on the painted sprite in frame '+index);
  assert.ok(silhouette.includes(1),filename+' contains a visible sprint pose '+index);
  runMetrics.push(silhouetteMetrics(silhouette,runWidth,sprites[index]));
  poses.add(createHash('sha256').update(silhouette).digest('hex'));
 }
 assert.equal(poses.size,runCount,filename+' has distinct sprint silhouettes');
 const walk=skia.MakeImageFromEncoded(bytes);
 assert.ok(walk,filename+' walking atlas decodes for the registration comparison');
 const walkMetrics=HUNTER_ART[facing].walk.map(sprite=>{
  const [x,y,width,height]=sprite.crop;
  const pixels=walk.readPixels(x,y,{...walk.getImageInfo(),width,height,colorType:skia.ColorType.RGBA_8888,colorSpace:skia.ColorSpace.SRGB});
  assert.ok(pixels,filename+' walking frame decodes for the registration comparison');
  const silhouette=Buffer.alloc(width*height);
  for(let i=0;i<silhouette.length;i++)silhouette[i]=pixels[i*4+3]>=128?1:0;
  return silhouetteMetrics(silhouette,width,sprite);
 });
 const middle=(frames,key)=>median(frames.map(frame=>frame[key]));
 const heightRatio=middle(runMetrics,'height')/middle(walkMetrics,'height');
 const widthRatio=middle(runMetrics,'hood')/middle(walkMetrics,'hood');
 assert(Math.abs(heightRatio-1)<=.03,facing+' running height stays within 3% of walking; ratio='+heightRatio.toFixed(3));
 assert(Math.abs(widthRatio-1)<=.03,facing+' hood width stays within 3% of walking; ratio='+widthRatio.toFixed(3));
 assert(Math.abs(middle(runMetrics,'crown')-middle(walkMetrics,'crown'))<=1,facing+' walking and running share the same ground-to-head registration');
 const idle=walkMetrics[HUNTER_ART[facing].walk.indexOf(HUNTER_ART[facing].idle)];
 assert(Math.abs(middle(runMetrics,'crown')-idle.crown)<=1.5,facing+' stopping does not shift the head vertically');
 assert(Math.abs(Math.max(...runMetrics.map(frame=>frame.sole))-Math.max(...walkMetrics.map(frame=>frame.sole)))<=.25,facing+' planted feet share the walking ground line');
 walk.delete();
 run.delete();
}

// Follow the actual draw path through sprint, deceleration, rest and missing textures.
// Keep the names as image handles so drawImage reveals exactly which atlas was drawn.
const images=Object.fromEntries(Object.keys(HUNTER_IMAGE_SOURCES).map(key=>[key,key]));
const world=createWorld();
world.survivorRole='hunter';
Object.assign(world.player,{direction:'left',moving:true,sprinting:true,runBlend:1,walkBlend:1,walkDistance:45});
function checkDraw(textures,sprite,message){
 const draws=[];
 let mirrored=false;
 const ctx={
  save(){},restore(){},translate(){},
  scale(x){if(x<0)mirrored=true},
  drawImage(sheet,sx,sy,sw,sh){draws.push([sheet,sx,sy,sw,sh])}
 };
 drawWorker(ctx,textures,world);
 assert.deepEqual(draws,[[sprite.sheet,...sprite.crop]],message);
 assert(mirrored,'The left-facing body renders with a horizontal mirror');
}
const sprint=hunterCycle('left',45,true).sprite;
const walk=hunterCycle('left',45,false).sprite;
const legacy=hunter.hunterLegacyCycle('left',45,true).sprite;
checkDraw(images,sprint,'Sprinting draws the new run atlas');
const partial={...images};
delete partial[sprint.sheet];
checkDraw(partial,walk,'Missing sprint atlas falls back to the Ludo walk');
delete partial[walk.sheet];
checkDraw(partial,legacy,'Legacy Hunter remains visible while newer sheets load');
Object.assign(world.player,{sprinting:false,runBlend:0});
checkDraw(images,walk,'Returning to walking draws the Ludo walk');
Object.assign(world.player,{moving:false,runBlend:1});
checkDraw(images,HUNTER_ART.left.idle,'At rest the Hunter uses the planted idle pose');

// The gear renderer uses the palm of the selected drawing, including the flight poses.
Object.assign(world.player,{moving:true,sprinting:true,runBlend:1});
const equippedImages={...images,campAxe:'campAxe'};
for(const [direction,{runCount}] of Object.entries(views)){
 for(let index=0;index<runCount;index++){
  const distance=(index+.25)*112/runCount;
  Object.assign(world.player,{direction,walkDistance:distance,equipped:'axe'});
  const sprite=hunterCycle(direction,distance,true).sprite,{hand}=sprite;
  assert.ok(hand?.length===2&&hand.every(Number.isFinite),direction+' measured sprint palm '+index);
  let translation;
  const axeDraws=[],bodyDraws=[];
  const ctx={
   save(){},restore(){},rotate(){},scale(){},beginPath(){},ellipse(){},clip(){},
   translate(x,y){translation=[x,y]},
   drawImage(image,...args){if(image===equippedImages.campAxe)axeDraws.push(translation);if(image===images[sprite.sheet])bodyDraws.push(args)}
  };
  drawWorker(ctx,equippedImages,world);
  assert.deepEqual(axeDraws,[hand],direction+' carried axe follows sprint palm '+index);
  assert(bodyDraws.length>0,'The equipped Hunter body is drawn');
  for(const draw of bodyDraws.slice(1))assert.deepEqual(draw,bodyDraws[0],direction+' visible hand redraw uses the body registration');
  assert.equal(bodyDraws[0][6],runWidth*sprite.scaleX,direction+' actual drawing respects the calibrated width');
  assert.equal(bodyDraws[0][7],runHeight*sprite.scale,direction+' actual drawing respects the calibrated height');
  drawAxeGrip(ctx,images[sprite.sheet],sprite,hand);
  assert.deepEqual(bodyDraws.at(-1),bodyDraws[0],direction+' axe and torch hands use the same registration');
  drawWeaponGrip(ctx,images[sprite.sheet],sprite,{hand,striking:false});
  assert.deepEqual(bodyDraws.at(-1),bodyDraws[0],direction+' other weapon hands use the same registration');
  world.player.equipped='torch';
  const pose=torchPose(world,images);
  assert.deepEqual(pose.hand,hand,direction+' torch follows sprint palm '+index);
  const mirror=views[direction].mirror?-1:1;
  assert.equal(pose.beam.x,world.player.x+hand[0]*mirror+pose.beam.dx*25);
  assert.equal(pose.beam.y,world.player.y+hand[1]+pose.beam.dy*25);
 }
}
for(const frame of [-2,4,5,11,NaN,Infinity]){
 const a=axeAttachment({tick:80,player:{runBlend:0}},'right','walk',{frame,mirror:false});
 assert.ok(a.hand.every(Number.isFinite),'out-of-range grip '+String(frame));
}
console.log('Hunter: 88 walking frames, 66 sprint frames, 8 directions, '+checked+' gait and grip states, distance-paced cadence, stable sprite scales, live transitions and loading fallbacks passed.');

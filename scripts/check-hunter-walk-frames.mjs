import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import CanvasKitInit from 'canvaskit-wasm';

// Use the actual TypeScript renderer registrations, not a duplicate animation algorithm.
async function loadSource(path){
 const result=await build({entryPoints:[path],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
 return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}

const [hunter,{axeAttachment},{drawWorker},{createWorld},{playerMovementImagesForRole},{torchPose},skia]=await Promise.all([
 loadSource('src/hunter-sprites.ts'),
 loadSource('src/axe-renderer.ts'),
 loadSource('src/worker-renderer.ts'),
 loadSource('src/survival-engine.ts'),
 loadSource('src/gameplay-artwork.ts'),
 loadSource('src/torch.ts'),
 CanvasKitInit()
]);
const {hunterCycle,HUNTER_ART,HUNTER_LEGACY_ART,HUNTER_IMAGE_SOURCES,hunterFacing}=hunter;

const views={
 down:{count:13,source:'down.png'},
 'down-right':{count:20,source:'down-right.png'},
 right:{count:18,source:'right.png'},
 'up-right':{count:18,source:'up-right.png'},
 up:{count:19,source:'up.png'},
 'up-left':{count:18,source:'up-right.png',mirror:true},
 left:{count:18,source:'right.png',mirror:true},
 'down-left':{count:20,source:'down-right.png',mirror:true}
};
const atlasDir='public/survival/hunter-v1/walk-v2/';
const pngSignature=Buffer.from([137,80,78,71,13,10,26,10]);
let checked=0;
const hunterPreload=playerMovementImagesForRole('hunter');
const survivorPreload=playerMovementImagesForRole('survivor');

for(const [direction,view] of Object.entries(views)){
 const mirror=!!view.mirror;
 assert.equal(hunterFacing(direction).mirror,mirror,direction+' mirror');
 assert.equal(HUNTER_ART[direction].walk.length,view.count,direction+' frame count');
 assert.equal(HUNTER_LEGACY_ART[direction].walk.length,36,direction+' original fallback');
 assert.equal(HUNTER_ART[direction].punch.sheet.startsWith('hunterWalkV2'),false,direction+' legacy punch');

 for(const running of [false,true]){
  const count=running?8:view.count;
  const [width,height]=running?[343,480]:[283,436];
  const url=running?'/survival/hunter-v1/run-v1/'+view.source.replace('.png','.webp'):'/survival/hunter-v1/walk-v2/'+view.source;
  for(let index=0;index<count;index++){
   const distance=(index+.25)*112/count;
   const cycle=hunterCycle(direction,distance,running);
   assert.equal(cycle.mirror,mirror,direction+' direction mirror');
   assert.equal(cycle.frame,Math.floor((index+.25)*4/count),direction+' equipment grip phase');
   assert.deepEqual(cycle.sprite.crop,[
    (index%5)*width,Math.floor(index/5)*height,width,height
   ],direction+' crop '+index);
   assert.deepEqual(cycle.sprite.anchor,[width/2,height-4],direction+' foot pivot');
   assert.equal(cycle.sprite.scale,112/410);
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

// Verify that each registered sheet contains the expected grid and real image bytes.
const unique={};
for(const view of Object.values(views))unique[view.source]=view.count;
for(const [filename,count] of Object.entries(unique)){
 const bytes=readFileSync(atlasDir+filename);
 assert.ok(bytes.subarray(0,8).equals(pngSignature),filename+' must be a PNG');
 assert.equal(bytes.readUInt32BE(16),5*283,filename+' width');
 assert.equal(bytes.readUInt32BE(20),Math.ceil(count/5)*436,filename+' height');
 const runPath='public/survival/hunter-v1/run-v1/'+filename.replace('.png','.webp');
 const run=skia.MakeImageFromEncoded(readFileSync(runPath));
 assert.ok(run,runPath+' must decode in the engine');
 assert.equal(run.width(),5*343);
 assert.equal(run.height(),2*480);
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
for(const direction of Object.keys(views)){
 for(let index=0;index<8;index++){
  const distance=(index+.25)*112/8;
  Object.assign(world.player,{direction,walkDistance:distance,equipped:'axe'});
  const {hand}=hunterCycle(direction,distance,true).sprite;
  assert.ok(hand?.length===2&&hand.every(Number.isFinite),direction+' measured sprint palm '+index);
  let translation;
  const axeDraws=[];
  const ctx={
   save(){},restore(){},rotate(){},scale(){},beginPath(){},ellipse(){},clip(){},
   translate(x,y){translation=[x,y]},
   drawImage(image){if(image===equippedImages.campAxe)axeDraws.push(translation)}
  };
  drawWorker(ctx,equippedImages,world);
  assert.deepEqual(axeDraws,[hand],direction+' carried axe follows sprint palm '+index);
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
console.log('Hunter: 88 authored walking frames, 40 authored sprint frames, 8 directions, '+checked+' gait and grip states, live transitions and loading fallbacks passed.');

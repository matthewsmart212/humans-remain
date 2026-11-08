import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';

// Use the actual TypeScript renderer registrations, not a duplicate animation algorithm.
async function loadSource(path){
 const result=await build({entryPoints:[path],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
 return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}

const [{hunterCycle,HUNTER_ART,HUNTER_LEGACY_ART,HUNTER_IMAGE_SOURCES,hunterFacing},{axeAttachment}]=await Promise.all([
 loadSource('src/hunter-sprites.ts'),
 loadSource('src/axe-renderer.ts')
]);

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

for(const [direction,view] of Object.entries(views)){
 const mirror=!!view.mirror;
 assert.equal(hunterFacing(direction).mirror,mirror,direction+' mirror');
 assert.equal(HUNTER_ART[direction].walk.length,view.count,direction+' frame count');
 assert.equal(HUNTER_LEGACY_ART[direction].walk.length,36,direction+' original fallback');
 assert.equal(HUNTER_ART[direction].punch.sheet.startsWith('hunterWalkV2'),false,direction+' legacy punch');

 for(const running of [false,true]){
  for(let index=0;index<view.count;index++){
   const distance=(index+.25)*112/view.count;
   const cycle=hunterCycle(direction,distance,running);
   assert.equal(cycle.mirror,mirror,direction+' direction mirror');
   assert.ok(cycle.frame>=0&&cycle.frame<4,'equipment grip phase 0–3');
   assert.deepEqual(cycle.sprite.crop,[
    (index%5)*283,Math.floor(index/5)*436,283,436
   ],direction+' crop '+index);
   const imagePath=HUNTER_IMAGE_SOURCES[cycle.sprite.sheet];
   assert.equal(imagePath,'/survival/hunter-v1/walk-v2/'+view.source,direction+' image URL');
   const attachment=axeAttachment({tick:80,player:{runBlend:running?1:0},axeSwing:undefined},direction,'walk',cycle);
   assert.ok(attachment.hand.every(Number.isFinite),'valid held-tool attachment');
   checked++;
  }
 }
 const w={tick:80,player:{runBlend:0},axeSwing:undefined};
 for(const pose of ['idle','punch']){
  const a=axeAttachment(w,direction,pose);
  assert.ok(a.hand.every(Number.isFinite),direction+' '+pose+' attachment');
 }
}

// Verify the five checked-in PNGs are full sprites, not Git LFS pointer text,
// and that the pixel dimensions fit all 88 authored frames without overcropping.
const unique={};
for(const view of Object.values(views))unique[view.source]=view.count;
for(const [filename,count] of Object.entries(unique)){
 const bytes=readFileSync(atlasDir+filename);
 assert.ok(bytes.subarray(0,8).equals(pngSignature),filename+' must be a PNG');
 assert.equal(bytes.readUInt32BE(16),5*283,filename+' width');
 assert.equal(bytes.readUInt32BE(20),Math.ceil(count/5)*436,filename+' height');
}
for(const frame of [-2,4,5,11,NaN,Infinity]){
 const a=axeAttachment({tick:80,player:{runBlend:0}},'right','walk',{frame,mirror:false});
 assert.ok(a.hand.every(Number.isFinite),'out-of-range grip '+String(frame));
}
console.log('Hunter v2: 5 PNG atlases, 88 painted frames, 8 directional views, '+checked+' walk/run and tool grip states passed.');

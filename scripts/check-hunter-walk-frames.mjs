import assert from 'node:assert/strict';
import {build} from 'esbuild';

// Load real TypeScript through the installed build compiler. No mocked
// animation logic or copy of the renderer's frame-selection algorithm.
async function loadSource(path){
 const result=await build({entryPoints:[path],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
 const source=result.outputFiles[0].text;
 return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
}
const [{hunterCycle,HUNTER_ART,hunterFacing},{axeAttachment}]=await Promise.all([
 loadSource('src/hunter-sprites.ts'),
 loadSource('src/axe-renderer.ts')
]);
const directions=['down','down-right','right','up-right','up','up-left','left','down-left'];
let checked=0;
for(const direction of directions){
 assert.equal(HUNTER_ART[direction].walk.length,36,direction+' must have all 36 authored sprites');
 const mirror=['up-left','left','down-left'].includes(direction);
 assert.equal(hunterFacing(direction).mirror,mirror);
 for(const running of [false,true]){
  for(let row=0;row<6;row++)for(let column=0;column<6;column++){
   const distance=row*112+(column+.25)*112/6;
   const cycle=hunterCycle(direction,distance,running);
   assert.equal(cycle.mirror,mirror);
   assert.ok(cycle.frame>=0&&cycle.frame<4,'equipment grip index is in range');
   assert.deepEqual(cycle.sprite.crop,[(column)*206,row*236,206,236]);
   // Reproduce the call made by drawWorker when any axe/pickaxe/repair
   // hammer is equipped. Previously columns 5 and 6 returned undefined.
   const w={tick:80,player:{runBlend:running?1:0},axeSwing:undefined};
   const attachment=axeAttachment(w,direction,'walk',cycle);
   assert.ok(Array.isArray(attachment.hand)&&attachment.hand.length===2,'valid weapon hand');
   assert.ok(attachment.hand.every(Number.isFinite),'finite grip coordinates');
   checked++;
  }
 }
 // Idle and strike paths use the same live attachments.
 const w={tick:80,player:{runBlend:0},axeSwing:undefined};
 for(const pose of ['idle','punch']){
  const a=axeAttachment(w,direction,pose);
  assert.ok(a.hand.every(Number.isFinite),direction+' '+pose);
 }
}
// Additional defence: a future character using more than four frames must
// still have a valid grip even if its caller forgets to remap phases.
for(const frame of [-2,4,5,11,NaN,Infinity]){
 const a=axeAttachment({tick:80,player:{runBlend:0}},'right','walk',{frame,mirror:false});
 assert.ok(a.hand.every(Number.isFinite),'out-of-range grip '+String(frame));
}
console.log('Hunter walk rendering: '+checked+' directional gait frames and all weapon grip fallbacks passed.');

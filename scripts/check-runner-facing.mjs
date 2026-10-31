// Exercise the production renderer, including idle/move/run/attack transitions.
import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),{createCanvas,loadImage}=require('@napi-rs/canvas'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'runner-facing-'));
try{
 await build({stdin:{contents:"export * from './src/survivor-art';export * from './src/runner-cycles';export * from './src/survival-engine';export * from './src/worker-renderer';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'check.cjs')});
 const m=require(path.join(temp,'check.cjs')),redirects=JSON.parse(fs.readFileSync('server/lossless-artwork-redirects.json')),imgs={};
 for(const [key,url]of Object.entries(m.SURVIVOR_IMAGE_SOURCES))imgs[key]=await loadImage('public'+(redirects[url]??url));
 const render=(direction,mode,frame)=>{const canvas=createCanvas(160,170),ctx=canvas.getContext('2d'),w=m.createWorld();Object.assign(w.player,{x:80,y:150,direction,moving:mode==='walk'||mode==='run',sprinting:mode==='run',runBlend:mode==='run'?1:0,walkBlend:1,walkDistance:frame*28});if(mode==='punch'){w.tick=6;w.attackReady=.52;w.attackAngle=m.DIRECTION_ANGLES[direction]}m.drawWorker(ctx,imgs,w);return ctx.getImageData(0,0,160,170).data};
 let renders=0;
 for(const [left,right]of [['down-left','down-right'],['left','right'],['up-left','up-right']]){
  assert.deepEqual(m.runnerFacing(left),{view:right,mirror:true},'Standing uses the exact movement view');
  for(const mode of ['idle','walk','run','punch'])for(let frame=0;frame<(mode==='walk'||mode==='run'?4:1);frame++){
   const a=render(left,mode,frame),b=render(right,mode,frame);let changed=0,total=0;
   for(let y=0;y<170;y++)for(let x=0;x<160;x++)for(let c=0;c<4;c++){const difference=Math.abs(a[(y*160+x)*4+c]-b[(y*160+159-x)*4+c]);total+=difference;if(difference>5)changed++}
   assert(changed<30&&total/(160*170*4)<.03,`${left} ${mode} ${frame}: identity/scale is not the same mirrored drawing`);renders+=2;
  }
 }
 console.log(`PASS: ${renders} real idle, walk, run and punch renders retain one mirrored identity; no separate wider southwest/left/northwest idle substitution.`);
}finally{fs.rmSync(temp,{recursive:true,force:true})}

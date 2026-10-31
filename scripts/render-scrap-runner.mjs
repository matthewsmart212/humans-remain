import {build} from 'esbuild';
import {createRequire} from 'node:module';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'scrap-runner-render-'));
try{
 await build({stdin:{contents:`export * from './src/survivor-art';export * from './src/survival-engine';export * from './src/worker-renderer';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'render.mjs')});
 const m=await import(pathToFileURL(path.join(temp,'render.mjs')));
 const imgs={};for(const [key,url] of Object.entries(m.SURVIVOR_IMAGE_SOURCES))imgs[key]=await loadImage('public'+url);
 const terrain=await loadImage('artwork-archive/retired-runtime/home-terrain-centre-v4.webp');
 const out=process.argv[2]||'/tmp/scrap-runner-qa';fs.mkdirSync(out,{recursive:true});
 const canvas=createCanvas(960,1280),ctx=canvas.getContext('2d');
 const directions=Object.keys(m.SURVIVOR_ART);
 for(let row=0;row<8;row++)for(let col=0;col<4;col++){
  ctx.save();ctx.translate(col*240,row*160);
  ctx.drawImage(terrain,1450,1450,550,370,0,0,240,160);
  ctx.fillStyle='#0b252bee';ctx.fillRect(0,0,240,23);ctx.fillStyle='#fff2d4';ctx.font='14px sans-serif';ctx.fillText(`${directions[row]} · ${['idle','step A','step B','punch'][col]}`,9,16);
  const w=m.createWorld();Object.assign(w.player,{x:120,y:146,direction:directions[row],moving:col===1||col===2,walkBlend:col===1||col===2?1:0,walkDistance:col===2?56:0});
  if(col===3){w.tick=6;w.attackReady=.52;w.attackAngle=m.DIRECTION_ANGLES[directions[row]]}
  m.drawWorker(ctx,imgs,w);ctx.restore();
 }
 fs.writeFileSync(path.join(out,'all-directions.png'),canvas.toBuffer('image/png'));
 // Render actual shared renderer over a gait cycle for optional video inspection.
 for(let i=0;i<24;i++){
  const frame=createCanvas(960,400),c=frame.getContext('2d');
  c.drawImage(terrain,1250,1400,1300,550,0,0,960,400);
  directions.forEach((direction,j)=>{const w=m.createWorld();Object.assign(w.player,{x:65+(j%4)*235,y:175+Math.floor(j/4)*195,direction,moving:true,walkBlend:1,walkDistance:i/24*112});m.drawWorker(c,imgs,w)});
  fs.writeFileSync(path.join(out,`walk-${String(i).padStart(2,'0')}.png`),frame.toBuffer('image/png'));
 }
 console.log('Rendered all 32 poses and a complete registered walk cycle to '+out);
}finally{fs.rmSync(temp,{recursive:true,force:true})}

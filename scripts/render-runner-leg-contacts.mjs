// Visual review of both anatomical legs. Numerical frame-count tests alone
// cannot establish that an illustrated near/far leg really changes lead.
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'runner-contacts-'));
try{
 await build({stdin:{contents:`export * from './src/survivor-art';export * from './src/survival-engine';export * from './src/worker-renderer';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'render.mjs')});
 const m=await import(pathToFileURL(path.join(temp,'render.mjs'))),imgs={};
 for(const [key,url] of Object.entries(m.SURVIVOR_IMAGE_SOURCES))imgs[key]=await loadImage('public'+url);
 const rows=[['right',false],['down-right',false],['down-right',true],['up-right',true]];
 const out=process.argv[2]||'/tmp/runner-leg-contacts';fs.mkdirSync(out,{recursive:true});
 const canvas=createCanvas(1280,1160),ctx=canvas.getContext('2d');
 for(let row=0;row<4;row++)for(let col=0;col<4;col++){
  ctx.save();ctx.translate(col*320,row*290);
  ctx.fillStyle=col%2?'#456654':'#3d5c4c';ctx.fillRect(0,0,320,290);
  ctx.fillStyle='#f1ecda';ctx.font='16px sans-serif';
  const [direction,run]=rows[row];ctx.fillText(`${direction} ${run?'sprint':'walk'} · ${col+1}`,12,24);
  ctx.translate(160,266);ctx.scale(2,2);
  const w=m.createWorld();Object.assign(w.player,{x:0,y:0,direction,moving:true,sprinting:run,runBlend:run?1:0,walkBlend:1,walkDistance:col*28});
  m.drawWorker(ctx,imgs,w);ctx.restore();
 }
 fs.writeFileSync(path.join(out,'contacts.png'),canvas.toBuffer('image/png'));
 console.log(path.join(out,'contacts.png'));
}finally{fs.rmSync(temp,{recursive:true,force:true})}

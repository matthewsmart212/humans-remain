import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),sharp=require('sharp'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'predator-check-'));
try{
 await build({entryPoints:['src/predator-art.ts'],bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'art.cjs')});const m=require(path.join(temp,'art.cjs')),meta=JSON.parse(fs.readFileSync('public/survival/predators-v1/artwork.json'));
 assert.equal(Object.keys(m.PREDATOR_IMAGES).length,10);assert.equal(meta.uniqueFrames,240);
 for(const kind of ['boar','wolf'])for(const dir of ['down','down-left','left','up-left','up','up-right','right','down-right']){const v=m.predatorView(kind,dir);assert(m.PREDATOR_IMAGES[v.key]);assert.equal(v.mirror,['up-right','right','down-right'].includes(dir))}
 for(const record of meta.records){const file='public'+m.PREDATOR_IMAGES[m.predatorView(record.kind,record.direction).key],{data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,896);assert.equal(info.height,1344);
  const hashes=new Set();for(let frame=0;frame<24;frame++){let pixels=0,minX=224,minY=224,maxX=0,maxY=0;const crop=await sharp(file).extract({left:frame%4*224,top:Math.floor(frame/4)*224,width:224,height:224}).png().toBuffer();hashes.add(require('node:crypto').createHash('sha256').update(crop).digest('hex'));
   for(let y=0;y<224;y++)for(let x=0;x<224;x++){const a=data[((Math.floor(frame/4)*224+y)*896+frame%4*224+x)*4+3];if(a>=24){pixels++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}}
   assert(pixels>600,`${file}/${frame}: meaningful complete sprite`);assert(minX>=5&&minY>=5&&maxX<219&&maxY<219,`${file}/${frame}: preserved transparent margin`);
  }assert(hashes.size>=22,'Movement/attack states have distinct artwork, with only deliberate held poses reusable');
 }
 for(const kind of ['boar','wolf']){let age=0;const clip=m.predatorClip(kind,'attack');for(let i=0;i<clip.frames.length;i++){assert.equal(m.predatorFrame(kind,'attack',age+.001),clip.frames[i]);age+=clip.milliseconds[i]/1000}assert.equal(m.predatorFrame(kind,'attack',100),17,'Attack holds ready after recovery');assert.equal(m.predatorFrame(kind,'death',100),23,'Death holds final downed frame');assert.equal(m.predatorFrame(kind,'walk',.56),0,'Walk loop wraps without a state restart');assert.equal(m.predatorFrame(kind,'attack',-1),10)}
 const report=JSON.parse(fs.readFileSync('docs/qa/predator-sprites-v1/checks.json'));report.checks.push('Actual exported atlas pixel bounds and distinct frames','All eight directional lookups and mirroring','Real attack timeline phase boundaries, loop wrapping and non-looping death hold');fs.writeFileSync('docs/qa/predator-sprites-v1/checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}

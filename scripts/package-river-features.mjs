// Package the four edited paintings at their native resolution. Derive narrow
// shoreline footprints and multi-span collision data from the painted water.
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),sharp=require('sharp');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'river-features-package-'));
const dir='public/survival/river-features-v4',archive='artwork-archive/river-features-v4';fs.mkdirSync(dir,{recursive:true});
try{
 await build({stdin:{contents:"export * from './src/river-art';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const {RIVER_BATCHES,RIVER_SECTIONS,RIVER_SIDE_FEATURES}=require(path.join(temp,'model.cjs'));
 const redirects={},collision=[],report=[];
 for(const f of RIVER_SIDE_FEATURES){
  const input=archive+'/'+f.master+'.png',source=RIVER_BATCHES[f.batch].source;
  const {data,info}=await sharp(input).removeAlpha().raw().toBuffer({resolveWithObject:true}),w=info.width,h=info.height;
  assert.deepEqual([w,h],f.nativeSize,f.id+' must retain the reference dimensions');
  const water=new Uint8Array(w*h),distance=new Float32Array(w*h).fill(10000),[rx,ry,rw,rh]=f.roi;
  for(let y=ry;y<Math.min(h,ry+rh);y++)for(let x=rx;x<Math.min(w,rx+rw);x++){
   const i=y*w+x,n=i*info.channels,r=data[n],g=data[n+1],b=data[n+2];
   if(b-r>12&&g-r>5){water[i]=1;distance[i]=0}
  }
  // Chamfer distance keeps feathering attached to the actual irregular bank,
  // never to a rectangular tile or to the river's old centreline corridor.
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const i=y*w+x;let d=distance[i];if(x)d=Math.min(d,distance[i-1]+1);if(y)d=Math.min(d,distance[i-w]+1);if(x&&y)d=Math.min(d,distance[i-w-1]+1.414);if(x+1<w&&y)d=Math.min(d,distance[i-w+1]+1.414);distance[i]=d;
  }
  for(let y=h-1;y>=0;y--)for(let x=w-1;x>=0;x--){
   const i=y*w+x;let d=distance[i];if(x+1<w)d=Math.min(d,distance[i+1]+1);if(y+1<h)d=Math.min(d,distance[i+w]+1);if(x+1<w&&y+1<h)d=Math.min(d,distance[i+w+1]+1.414);if(x&&y+1<h)d=Math.min(d,distance[i+w-1]+1.414);distance[i]=d;
  }
  const opaque=120*w/source.width,feather=100*w/source.width,alpha=Buffer.alloc(w*h);
  for(let i=0;i<alpha.length;i++){const t=Math.max(0,Math.min(1,(distance[i]-opaque)/feather));alpha[i]=Math.round(255*(1-t*t*(3-2*t)))}
  await sharp(alpha,{raw:{width:w,height:h,channels:1}}).resize({width:640}).png().toFile(dir+'/'+f.id+'-footprint.png');
  const step=8,cols=Math.ceil(source.width/step),rows=[];
  for(let cy=0;cy<Math.ceil(source.height/step);cy++){
   const spans=[];let start=-1;
   for(let cx=0;cx<=cols;cx++){
    let wet=false;
    if(cx<cols){const px=Math.min(w-1,Math.floor((cx+.5)*step/source.width*w)),py=Math.min(h-1,Math.floor((cy+.5)*step/source.height*h));wet=!!water[py*w+px]}
    if(wet&&start<0)start=cx;
    if(!wet&&start>=0){if(spans.length&&start-spans.at(-1)[1]<=2)spans.at(-1)[1]=cx;else spans.push([start,cx]);start=-1}
   }
   rows.push(spans);
  }
  collision.push({id:f.id,batch:f.batch,step,rows});
  const tiles=RIVER_SECTIONS.filter(p=>p.batch===f.batch);
  for(const p of tiles){
   const top=p.nativeTop??Math.round(p.sourceY/source.height*h),height=p.nativeHeight??Math.min(h-top,Math.round(p.height/source.height*h));
   const name=RIVER_BATCHES[p.batch].id+'-'+p.id;
   const crop=sharp(input).extract({left:0,top,width:w,height});
   await crop.clone().webp({quality:94}).toFile(dir+'/'+name+'.webp');
   // The broad lake needs a little more preview detail for its fine surface
   // ripples to remain readable while native tiles stream in.
   await crop.clone().resize({width:f.kind==='lake'?512:256}).webp({quality:85}).toFile(dir+'/'+name+'-preview.webp');
   for(const suffix of ['.webp','-preview.webp'])redirects['/survival/river-calm-v2/'+name+suffix]='/survival/river-features-v4/'+name+suffix;
  }
  report.push({id:f.id,tiles:tiles.length,nativeSize:[w,h],waterPixels:water.reduce((sum,n)=>sum+n,0),splitRows:rows.filter(r=>r.length>1).length});
 }
 redirects['/planning/built-river-calm-v2.webp']='/planning/built-river-features-v4.webp';
 redirects['/planning/river-calm-detail.webp']='/planning/river-features-detail.webp';
 fs.writeFileSync('src/river-side-water-masks.json',JSON.stringify(collision)+'\n');
 fs.writeFileSync('server/river-features-redirects.json',JSON.stringify(redirects,null,2)+'\n');
 fs.writeFileSync(archive+'/packaging.json',JSON.stringify(report,null,2)+'\n');console.log(report);
}finally{fs.rmSync(temp,{recursive:true,force:true})}

// Build small, registered high-detail textures from imagegen material edits.
// Original low-frequency geometry/colour and shoreline classification remain
// authoritative; generated microdetail cannot move a bridge or riverbank.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),sharp=require('sharp'),work='.qa/river-quality';
const out='public/survival/river-detail-v5',url='/survival/river-detail-v5/';
const jobs=JSON.parse(fs.readFileSync(work+'/tile-jobs.json'));
const names=['headwaters','logging','western','waterworks','lower','southern'];
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'river-detail-'));
fs.mkdirSync(out,{recursive:true});
const smooth=v=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t)};
const wet=(r,g,b)=>b-r>12&&g-r>5;
try{
 await build({stdin:{contents:"export {RIVER_BATCHES,RIVER_SECTIONS} from './src/river-art';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const {RIVER_BATCHES,RIVER_SECTIONS}=require(path.join(temp,'model.cjs'));
 const patches=[],batches=[],sections=[],report=[],prompts=[];
 for(let batch=0;batch<names.length;batch++){
  const name=names[batch],input=work+'/reference-'+name+'.png',meta=await sharp(input).metadata();
  const width=meta.width*2,height=meta.height*2,raw={width,height,channels:3};
  const original=await sharp(input).removeAlpha().resize(width,height,{kernel:'lanczos3'}).raw().toBuffer();
  const low=await sharp(original,{raw}).blur(.85).raw().toBuffer();
  const originalBand=await sharp(original,{raw}).blur(4).raw().toBuffer();
  const changes=new Float32Array(width*height*3),weights=new Float32Array(width*height);
  let generatedTiles=0,minNativeScale=Infinity;
  for(const job of jobs.filter(j=>j.name===name&&j.waterFraction>=.01)){
   const record=JSON.parse(fs.readFileSync(work+'/jobs/'+job.id+'.json'));
   const m=await sharp(record.output).metadata();
   assert(Math.abs((m.width/m.height)/(job.crop.width/job.crop.height)-1)<.08,'Tile framing '+job.id);
   const nativeScale=Math.min(m.width/job.crop.width,m.height/job.crop.height);assert(nativeScale>=1.5,'Native detail gain '+job.id);
   minNativeScale=Math.min(minNativeScale,nativeScale);generatedTiles++;prompts.push({id:job.id,prompt:record.prompt,builtIn:true});
   const cw=job.crop.width*2,ch=job.crop.height*2,craw={width:cw,height:ch,channels:3};
   const sourceDetail=await sharp(record.output).removeAlpha().resize(cw,ch,{fit:'fill',kernel:'lanczos3'}).raw().toBuffer();
   const flowInfo=JSON.parse(fs.readFileSync(work+'/jobs/'+job.id+'.flow.json'));
   const flowBytes=fs.readFileSync(flowInfo.file),flow=new Float32Array(flowBytes.buffer,flowBytes.byteOffset,flowBytes.byteLength/4),detail=Buffer.alloc(sourceDetail.length);
   const fw=flowInfo.width,fh=flowInfo.height;
   const sample=(array,w,h,x,y,channels,c)=>{const ix=Math.max(0,Math.min(w-1,x)),iy=Math.max(0,Math.min(h-1,y)),x0=Math.floor(ix),y0=Math.floor(iy),x1=Math.min(w-1,x0+1),y1=Math.min(h-1,y0+1),tx=ix-x0,ty=iy-y0;return(array[(y0*w+x0)*channels+c]*(1-tx)+array[(y0*w+x1)*channels+c]*tx)*(1-ty)+(array[(y1*w+x0)*channels+c]*(1-tx)+array[(y1*w+x1)*channels+c]*tx)*ty};
   for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
    const gx=x/(cw-1)*(fw-1),gy=y/(ch-1)*(fh-1),px=x+sample(flow,fw,fh,gx,gy,2,0)*2,py=y+sample(flow,fw,fh,gx,gy,2,1)*2,n=(y*cw+x)*3;
    for(let c=0;c<3;c++)detail[n+c]=Math.round(sample(sourceDetail,cw,ch,px,py,3,c));
   }
   const detailLow=await sharp(detail,{raw:craw}).blur(4).raw().toBuffer();
   const left=job.crop.left*2,top=job.crop.top*2;
   for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
    const edge=Math.min(left?x/80:1,top?y/80:1,left+cw<width?(cw-1-x)/80:1,top+ch<height?(ch-1-y)/80:1),weight=smooth(edge);
    if(!weight)continue;const i=y*cw+x,n=(top+y)*width+left+x;
    weights[n]+=weight;
    for(let c=0;c<3;c++)changes[n*3+c]+=Math.max(-48,Math.min(48,(detail[i*3+c]-detailLow[i*3+c])-(original[n*3+c]-originalBand[n*3+c])))*weight;
   }
  }
  const pixels=Buffer.alloc(original.length);let boundaryProtected=0;
  for(let i=0;i<width*height;i++){
   const n=i*3;for(let c=0;c<3;c++){
    const grain=weights[i]?changes[n+c]/weights[i]:0;
    const sharpen=(original[n+c]-low[n+c])*.2;
    const delta=Math.max(-48,Math.min(48,sharpen+grain*.9));
    pixels[n+c]=Math.max(0,Math.min(255,Math.round(original[n+c]+delta)));
   }
   // Colour-derived collision/shore masks must continue to agree exactly.
   if(wet(original[n],original[n+1],original[n+2])!==wet(pixels[n],pixels[n+1],pixels[n+2])){original.copy(pixels,n,n,n+3);boundaryProtected++}
  }
  const master=work+'/master-'+name+'.png';await sharp(pixels,{raw}).png().toFile(master);
  const source=RIVER_BATCHES[batch].source,sx=source.width/width,sy=source.height/height;
  // 512px cores share 8px sampling gutters for bilinear filtering/refraction.
  // They are encoded losslessly: neighbouring samples are identical pixels.
  for(let y=0;y<height;y+=512)for(let x=0;x<width;x+=512){
   const w=Math.min(512,width-x),h=Math.min(512,height-y),left=Math.max(0,x-8),top=Math.max(0,y-8),right=Math.min(width,x+w+8),bottom=Math.min(height,y+h+8);
   const key=`riverHD${batch}_${x}_${y}`,file=key+'.webp';
   await sharp(pixels,{raw}).extract({left,top,width:right-left,height:bottom-top}).webp({lossless:true,effort:5}).toFile(out+'/'+file);
   patches.push({key,batch,x:source.x+x*sx,y:source.y+y*sy,width:w*sx,height:h*sy,sample:{x:source.x+left*sx,y:source.y+top*sy,width:(right-left)*sx,height:(bottom-top)*sy},image:url+file,bytes:(right-left)*(bottom-top)*4});
  }
  for(const p of RIVER_SECTIONS.filter(p=>p.batch===batch)){
   const top=Math.round(p.sourceY/source.height*height),h=Math.min(height-top,Math.round(p.height/source.height*height));
   const crop=sharp(pixels,{raw}).extract({left:0,top,width,height:h}),prefix=RIVER_BATCHES[batch].id+'-'+p.id;
   const medium=prefix+'-medium.webp',preview=prefix+'-preview.webp';
   await crop.clone().resize({width:meta.width}).webp({quality:96,effort:5}).toFile(out+'/'+medium);
   await crop.clone().resize({width:512}).webp({quality:92,effort:5}).toFile(out+'/'+preview);
   const mm=await sharp(out+'/'+medium).metadata(),pm=await sharp(out+'/'+preview).metadata();
   sections.push({key:p.key,image:url+medium,preview:url+preview,bytes:mm.width*mm.height*4,previewDensity:pm.width/p.width});
  }
  batches.push({batch,width,height,mediumDensity:meta.width/source.width,detailDensity:width/source.width});
  report.push({name,batch,previousNative:[meta.width,meta.height],detailNative:[width,height],generatedTiles,minNativeScale,boundaryProtected,shoreClassificationChanged:0});
  console.log(JSON.stringify(report.at(-1)));global.gc?.();
 }
 fs.writeFileSync('src/river-detail-manifest.json',JSON.stringify({version:1,batches,patches,sections})+'\n');
 const featureBatches=new Set(JSON.parse(fs.readFileSync('src/river-side-features.json')).map(f=>f.batch)),redirects={};
 for(const p of RIVER_SECTIONS){const section=sections.find(s=>s.key===p.key),old=`/survival/${featureBatches.has(p.batch)?'river-features-v4':'river-calm-v2'}/${RIVER_BATCHES[p.batch].id}-${p.id}`;redirects[old+'.webp']=section.image;redirects[old+'-preview.webp']=section.preview;}
 fs.writeFileSync('server/river-quality-redirects.json',JSON.stringify(redirects,null,2)+'\n');
 const terrain=JSON.parse(fs.readFileSync('src/terrain-stream-manifest.json'));terrain.rivers=sections.map(({key,bytes,previewDensity})=>({key,bytes,previewDensity}));fs.writeFileSync('src/terrain-stream-manifest.json',JSON.stringify(terrain)+'\n');
 fs.mkdirSync('docs/qa/river-quality-v5',{recursive:true});fs.writeFileSync('docs/qa/river-quality-v5/artwork.json',JSON.stringify({method:'Built-in image generation; registered material-detail compositing; lossless streamed chunks',batches:report,chunkCount:patches.length,maximumChunkBytes:Math.max(...patches.map(p=>p.bytes)),riverBudget:20*1024*1024,prompts},null,2)+'\n');
 console.log(JSON.stringify({chunks:patches.length,sections:sections.length,bytes:fs.readdirSync(out).reduce((n,f)=>n+fs.statSync(out+'/'+f).size,0)}));
}finally{fs.rmSync(temp,{recursive:true,force:true})}

// Mechanical sprite registration only. All illustrated artwork was generated
// separately; the same immutable base is reused in every frame of each tier.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require('sharp');
const masters='artwork-archive/hearth-painted-v1',out='public/survival/hearth-painted-v1';
const size=1024,anchor=[512,960],frameCount=8;
fs.mkdirSync(out,{recursive:true});
const blank=()=>sharp({create:{width:size,height:size,channels:4,background:'#00000000'}});
const raw=async input=>sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
function bounds(data,width,height,threshold=16){
 let left=width,top=height,right=-1,bottom=-1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>=threshold){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
 assert(right>=left&&bottom>=top,'Artwork is not empty');
 return{left,top,width:right-left+1,height:bottom-top+1};
}
const atlas=path.join(masters,'flame-atlas.png'),meta=await sharp(atlas).metadata(),flames=[];
for(let frame=0;frame<frameCount;frame++){
 const col=frame%4,row=Math.floor(frame/4),left=Math.floor(col*meta.width/4),top=Math.floor(row*meta.height/2);
 const width=Math.floor((col+1)*meta.width/4)-left,height=Math.floor((row+1)*meta.height/2)-top;
 const cell=await sharp(atlas).extract({left,top,width,height}).png().toBuffer(),r=await raw(cell),b=bounds(r.data,width,height);
 const baseline=b.top+b.height-1;
 let sum=0,weighted=0;
 for(let y=baseline-13;y<=baseline;y++)for(let x=0;x<width;x++){const a=r.data[(y*width+x)*4+3];if(a>=16){sum+=a;weighted+=x*a}}
 const root=[weighted/sum,baseline];
 // Translation registers roots; all frames retain ONE shared scale. Never
 // independently resize a frame to its alpha bounding box.
 const registered=await sharp({create:{width:512,height:512,channels:4,background:'#00000000'}})
  .composite([{input:cell,left:Math.round(256-root[0]),top:470-root[1]}]).png().toBuffer();
 flames.push({buffer:registered,sourceCell:{left,top,width,height},sourceRoot:root});
}
const sockets={1:[625,790],2:[630,753],3:[631,806]};
const manifest={size,anchor,frameCount,fps:10,tiers:[],flames:flames.map(({buffer,...f})=>f)};
for(const tier of [1,2,3]){
 const source=path.join(masters,`tier-${tier}-base.png`),r=await raw(source),b=bounds(r.data,r.info.width,r.info.height);
 // One whole-base transformation, bottom-aligned and 960 px wide, retained for
 // both fuel states and the complete animation. Alpha padding is intentional.
 const scale=960/b.width,width=960,height=Math.round(b.height*scale),left=32,top=anchor[1]-height;
 const base=await blank().composite([{input:await sharp(source).extract(b).resize(width,height).png().toBuffer(),left,top}]).png().toBuffer();
 const basePixels=(await raw(base)).data;
 await sharp(base).webp({lossless:true,effort:6}).toFile(path.join(out,`tier-${tier}-unlit.webp`));
 const socket=sockets[tier].map((v,i)=>Math.round((v-[b.left,b.top][i])*scale+[left,top][i]));
 const flameScale=.98,flameSize=Math.round(512*flameScale),flameLeft=socket[0]-Math.round(256*flameScale),flameTop=socket[1]-Math.round(470*flameScale);
 const frameRect={left:flameLeft,top:flameTop,width:flameSize,height:flameSize};
 assert(flameTop>=0&&flameLeft>=0&&flameLeft+flameSize<=size&&flameTop+flameSize<=size);
 let mask=Buffer.alloc(size*size*4);
 for(let frame=0;frame<frameCount;frame++){
  const overlay=await sharp(flames[frame].buffer).resize(flameSize,flameSize).png().toBuffer();
  const fullOverlay=await blank().composite([{input:overlay,left:flameLeft,top:flameTop}]).raw().toBuffer();
  for(let p=0;p<mask.length;p+=4)if(fullOverlay[p+3])mask[p]=mask[p+1]=mask[p+2]=mask[p+3]=255;
  const composited=await sharp(base).composite([{input:overlay,left:flameLeft,top:flameTop}]).raw().toBuffer();
  // Avoid even a 1-value premultiply/unpremultiply round-off on anti-aliased
  // stone/roof edges where no flame is present. Copy the master bytes exactly.
  for(let p=0;p<composited.length;p+=4)if(fullOverlay[p+3]===0)basePixels.copy(composited,p,p,p+4);
  await sharp(composited,{raw:{width:size,height:size,channels:4}}).webp({lossless:true,effort:6}).toFile(path.join(out,`tier-${tier}-flame-${frame}.webp`));
 }
 await sharp(mask,{raw:{width:size,height:size,channels:4}}).png().toFile(path.join(masters,`tier-${tier}-flame-mask.png`));
 manifest.tiers.push({tier,sourceBounds:b,scale,baseRect:{left,top,width,height},socket,flameRect:frameRect});
}
fs.writeFileSync(path.join(masters,'registration.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Registered ${frameCount} lit frames + 1 unlit state × 3 tiers, all ${size}×${size}, one fixed ground anchor.`);

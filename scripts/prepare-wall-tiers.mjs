// Register the existing approved wall artwork. No new wall designs are generated.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const manifest=JSON.parse(fs.readFileSync('src/wall-artwork-replacements.json'));
const inputs={2:'artwork-archive/wall-tier-sources/complete-palisade.png',3:'artwork-archive/wall-tier-sources/stone-footings.jpeg'};
const out='public/survival/wall-tiers-v1';fs.mkdirSync(out,{recursive:true});
// Clockwise from the northern entrance. Boundaries run through the original gaps.
const boundaries={2:[-90,-35,2,47,88,131,179,224,270],3:[-90,-33,2,48,89,133,181,226,270]};
function bounds(mask,w,h){let l=w,t=h,r=0,b=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(mask[y*w+x]){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y)}return{left:l,top:t,width:r-l+1,height:b-t+1}}
function largest(mask,w,h){const seen=new Uint8Array(mask.length),queue=new Int32Array(mask.length);let best=[];for(let seed=0;seed<mask.length;seed++){if(!mask[seed]||seen[seed])continue;let head=0,tail=1;queue[0]=seed;seen[seed]=1;while(head<tail){const p=queue[head++],x=p%w;for(const q of [p-w,p+w,...(x?[p-1]:[]),...(x<w-1?[p+1]:[])])if(q>=0&&q<mask.length&&mask[q]&&!seen[q]){seen[q]=1;queue[tail++]=q}}if(tail>best.length)best=Array.from(queue.subarray(0,tail))}const result=new Uint8Array(mask.length);for(const p of best)result[p]=1;return result}
const report=[];
for(let i=0;i<manifest.length;i++){
 const m=manifest[i],raw=await sharp('public'+m.url).ensureAlpha().raw().toBuffer(),mask=new Uint8Array(m.width*m.height);
 // Ignore one-pixel generation remnants outside the main sprite when finding its registration box.
 for(let y=1;y<m.height-1;y++)for(let x=1;x<m.width-1;x++){let keep=true;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(raw[((y+dy)*m.width+x+dx)*4+3]<100)keep=false;if(keep)mask[y*m.width+x]=1}
 const box=bounds(largest(mask,m.width,m.height),m.width,m.height),dest={left:Math.max(0,box.left-2),top:Math.max(0,box.top-2),width:Math.min(m.width-box.left+2,box.width+4),height:Math.min(m.height-box.top+2,box.height+4)};
 for(const tier of [2,3]){
  const {data,info}=await sharp(inputs[tier]).ensureAlpha().raw().toBuffer({resolveWithObject:true}),w=info.width,h=info.height,piece=Buffer.alloc(data.length),active=new Uint8Array(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   let angle=Math.atan2(y-627,x-627)*180/Math.PI;if(angle< -90)angle+=360;
   if(angle<boundaries[tier][i]||angle>=boundaries[tier][i+1])continue;
   const p=(y*w+x)*4;
   // The original stone reference has a white matte. Remove only that matte.
   const alpha=tier===3?Math.round(255*Math.min(1,Math.max(0,(248-Math.min(data[p],data[p+1],data[p+2]))/20))):data[p+3];
   if(alpha<12)continue;
   data.copy(piece,p,p,p+3);piece[p+3]=alpha;active[y*w+x]=1;
  }
  const main=largest(active,w,h);for(let p=0;p<main.length;p++)if(!main[p])piece[p*4+3]=0;
  const crop=bounds(main,w,h),fitted=await sharp(piece,{raw:{width:w,height:h,channels:4}}).extract(crop).resize(dest.width,dest.height,{fit:'fill'}).toBuffer();
  const file=`${out}/t${tier}-wall-${i+1}.webp`;
  await sharp({create:{width:m.width,height:m.height,channels:4,background:'#00000000'}}).composite([{input:fitted,raw:{width:dest.width,height:dest.height,channels:4},left:dest.left,top:dest.top}]).webp({quality:94,alphaQuality:100}).toFile(file);
  report.push({piece:i+1,tier,canvas:[m.width,m.height],registeredBox:dest,sourceCrop:crop,bytes:fs.statSync(file).size});
 }
}
fs.writeFileSync('artwork-archive/wall-tier-sources/registration.json',JSON.stringify(report,null,2)+'\n');
console.log(`Registered ${report.length} wall variants; ${(report.reduce((n,r)=>n+r.bytes,0)/1048576).toFixed(2)} MiB.`);

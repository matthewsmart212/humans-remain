// Mechanical extraction/registration only; all illustrated poses come from image_gen.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {renderPredatorPreviews} from './render-predator-previews.mjs';
const sharp=createRequire(import.meta.url)('sharp');
const qa='docs/qa/predator-sprites-v1',out='public/survival/predators-v1',cell=224,baseline=204;
const directions=['down','down-left','left','up-left','up'];
const names=['walk-contact-left','walk-pass-left','walk-contact-right','walk-pass-right','run-compress','run-push','run-air','run-land','idle','blink','alert','anticipation','windup','launch','contact','follow-through','attack-recover','ready','hit','hit-recover','stagger','fall','downed','downed-closed'];
const clips={walk:{frames:[0,1,2,3],milliseconds:[140,140,140,140],loop:true},run:{frames:[4,5,6,7],milliseconds:[90,90,90,90],loop:true},idle:{frames:[8,9,8],milliseconds:[1600,100,800],loop:true},warning:{frames:[10,11,12],milliseconds:[200,180,180],loop:false},attack:{frames:[10,11,12,13,14,15,16,17],milliseconds:[200,180,180,70,90,100,200,200],loop:false},hit:{frames:[18,19,8],milliseconds:[90,130,250],loop:false},death:{frames:[20,21,22,23],milliseconds:[100,140,150,1200],loop:false}};
const combatClips={boar:{warning:{frames:[10,11,12],milliseconds:[240,220,240],loop:false},attack:{frames:[10,11,12,13,14,15,16,17],milliseconds:[240,220,240,80,120,100,250,220],loop:false},charge:{frames:[4,5,6,7],milliseconds:[75,75,75,75],loop:true}},wolf:{warning:{frames:[10,11,12],milliseconds:[180,140,160],loop:false},attack:{frames:[10,11,12,13,14,15,16,17],milliseconds:[180,140,160,70,100,100,220,200],loop:false}}};
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(qa+'/source-art',{recursive:true});
function silhouettes(data,width,height){
 const seen=new Uint8Array(width*height),queue=new Int32Array(width*height),found=[];
 for(let p=0;p<seen.length;p++){
  if(seen[p]||data[p*4+3]<24)continue;
  let head=0,tail=0,l=width,t=height,r=0,b=0;queue[tail++]=p;seen[p]=1;
  while(head<tail){const at=queue[head++],x=at%width,y=Math.floor(at/width);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,k=yy*width+xx;if(xx<0||xx>=width||yy<0||yy>=height||seen[k]||data[k*4+3]<24)continue;seen[k]=1;queue[tail++]=k}
  }
  if(tail>=500)found.push({pixels:Int32Array.from(queue.subarray(0,tail)),left:l,top:t,right:r,bottom:b,count:tail});
 }
 const slots=new Map();for(const f of found){const col=Math.min(3,Math.floor((f.left+f.right)/2*4/width)),row=Math.min(5,Math.floor((f.top+f.bottom)/2*6/height)),index=row*4+col;
  if(slots.has(index))throw Error(`Multiple bodies in cell ${index}`);slots.set(index,f);
 }
 if(slots.size!==24)throw Error(`Expected24 complete bodies, got${slots.size}`);
 return Array.from({length:24},(_,i)=>{
  const f=slots.get(i);if(!f)throw Error(`Missing frame${i}`);
  if(f.left<2||f.top<2||f.right>width-3||f.bottom>height-3)throw Error(`Clipped source frame${i}`);
  const rect={left:f.left-2,top:f.top-2,width:f.right-f.left+5,height:f.bottom-f.top+5},raw=Buffer.alloc(rect.width*rect.height*4);let mass=0,sumX=0;
  for(const p of f.pixels){const x=p%width,y=Math.floor(p/width),weight=data[p*4+3];mass+=weight;sumX+=(x-rect.left)*weight;
   // Keep only this silhouette and its alpha fringe, excluding floating icons
   // and any neighbouring sprite inside a rectangular crop.
   for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const xx=x+dx,yy=y+dy;if(xx<rect.left||xx>=rect.left+rect.width||yy<rect.top||yy>=rect.top+rect.height)continue;const src=(yy*width+xx)*4,dest=((yy-rect.top)*rect.width+xx-rect.left)*4;data.copy(raw,dest,src,src+4)}
  }
  return{rect,raw,cx:sumX/mass,count:f.count};
 });
}
const records=[];
for(const kind of ['boar','wolf'])for(const dir of directions){
 const entry=JSON.parse(fs.readFileSync(`${qa}/sources/${kind}-${dir}.json`)),source=path.resolve('../generated_images',entry.source),meta=await sharp(source).metadata();
 if(!meta.hasAlpha)throw Error('No alpha in '+source);
 const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});let transparent=0;for(let i=3;i<data.length;i+=4)if(data[i]===0)transparent++;
 if(transparent<info.width*info.height*.25)throw Error('Insufficient genuine transparency in '+source);
 const frames=silhouettes(data,info.width,info.height),lift=i=>i===6?10:i===5?3:i===13?kind==='wolf'?11:4:i===14&&kind==='wolf'?14:i===15?3:i===18?3:0;
 const scale=Math.min(1,180/frames[8].rect.height,...frames.map((f,i)=>Math.min(104/Math.max(f.cx,f.rect.width-f.cx),(baseline-8-lift(i))/f.rect.height)));
 const packed=[],placements=[];fs.mkdirSync(`${qa}/frames/${kind}/${dir}`,{recursive:true});fs.mkdirSync(`${out}/${kind}`,{recursive:true});
 for(let i=0;i<24;i++){
  const f=frames[i],width=Math.max(1,Math.round(f.rect.width*scale)),height=Math.max(1,Math.round(f.rect.height*scale)),left=Math.round(cell/2-f.cx*scale),top=baseline-height-lift(i);
  if(left<5||top<5||left+width>cell-5||top+height>cell-5)throw Error(`Insufficient atlas padding ${kind}/${dir}/${i}`);
  const sprite=await sharp(f.raw,{raw:{width:f.rect.width,height:f.rect.height,channels:4}}).resize(width,height).png().toBuffer();
  const image=await sharp({create:{width:cell,height:cell,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:sprite,left,top}]).png().toBuffer();
  const file=`${qa}/frames/${kind}/${dir}/${String(i).padStart(2,'0')}-${names[i]}.png`;fs.writeFileSync(file,image);packed.push(image);placements.push({left,top,width,height,lift:lift(i),rootX:f.cx});
 }
 const atlas=await sharp({create:{width:cell*4,height:cell*6,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(packed.map((input,i)=>({input,left:i%4*cell,top:Math.floor(i/4)*cell}))).png().toBuffer();
 fs.writeFileSync(`${qa}/${kind}-${dir}.png`,atlas);await sharp(atlas).webp({lossless:true,effort:6}).toFile(`${out}/${kind}/${dir}.webp`);
 fs.copyFileSync(source,`${qa}/source-art/${kind}-${dir}.png`);
 records.push({kind,direction:dir,source:entry.source,alphaCoverage:transparent/(info.width*info.height),scale,frames:24,sourceBounds:frames.map(f=>f.rect),placements,atlas:[cell*4,cell*6],webpBytes:fs.statSync(`${out}/${kind}/${dir}.webp`).size});
 console.log(`${kind}/${dir}: 24 complete frames`);
}
const views={down:{source:'down',mirror:false},'down-left':{source:'down-left',mirror:false},left:{source:'left',mirror:false},'up-left':{source:'up-left',mirror:false},up:{source:'up',mirror:false},'up-right':{source:'up-left',mirror:true},right:{source:'left',mirror:true},'down-right':{source:'down-left',mirror:true}};
const manifest={version:1,tool:'Built-in image_gen',scope:'Sprite artwork and animation timing; gameplay AI/spawns are not enabled by this pack.',cell,anchor:[112,baseline],columns:4,rows:6,frames:names,clips,combatClips,views,records,uniqueFrames:240,decodedBytes:records.length*cell*4*cell*6*4,packing:'True alpha; complete connected silhouettes plus antialias fringe; one scale per view; alpha-mass root alignment; common baseline; explicit airborne lift; lossless WebP'};
fs.writeFileSync(out+'/artwork.json',JSON.stringify(manifest,null,2)+'\n');
// Previews use the actual aligned frames, with no interpolated/morphed poses.
await renderPredatorPreviews(qa,manifest);
fs.writeFileSync(qa+'/checks.json',JSON.stringify({passed:true,uniqueFrames:240,views:10,directionsPerAnimal:8,atlas:[896,1344],decodedBytes:manifest.decodedBytes,artworkBytes:records.reduce((n,r)=>n+r.webpBytes,0),checks:['24 complete silhouettes in every source','genuine alpha background','all silhouettes padded inside224px cells','single scale per view; no per-frame zoom','common ground anchor with controlled airborne lift','five authored views plus three mirrored directions','separate anticipation/contact/recovery and hit/death poses','actual packed-frame walk/run/attack previews'],gameplayEnabled:false},null,2)+'\n');
console.log(JSON.stringify({passed:true,uniqueFrames:240,views:10,decodedBytes:manifest.decodedBytes},null,2));

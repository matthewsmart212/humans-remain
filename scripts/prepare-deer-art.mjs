// Mechanical extraction, uniform per-view scaling and atlas packing of generated art.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp'),root=process.cwd(),sourceRoot=path.resolve(root,'../generated_images');
const sources={"doe/down":"exec-045d3456-6966-42df-9f68-9211658bb84d.png","doe/down-left":"exec-d0ca6e6b-b8cc-4d80-b4f9-544db502a70e.png","doe/left":"exec-980780a6-4334-4f39-8c34-39a42951b4c6.png","doe/up-left":"exec-bb640a18-d211-4522-a283-91f2297d3cc5.png","doe/up":"exec-f29898e4-4389-41a7-906e-8c70c6b31b38.png","stag/down":"exec-9efeb004-7dcf-46b9-adb3-8c24fdc39456.png","stag/down-left":"exec-5363b8f7-5eb5-45c1-8fa2-4ca898dd0e28.png","stag/left":"exec-20e876c3-f0fe-47d2-931a-6bbdeb0ee34e.png","stag/up-left":"exec-d66b0844-59f1-49e7-86a7-b69a2267bc2d.png","stag/up":"exec-6814a7e6-711f-4c9a-b770-829aedb6cc04.png"};
const foods={"raw":"exec-b582933b-8967-4daa-8c5d-6f69795cba4a.png","cooked":"exec-5f1b4d26-7cee-44f1-8754-d06c9ce78421.png"};
const out='public/survival/deer-v1',foodOut='public/survival/venison-food-v1',cell=224,baseline=204;
fs.mkdirSync(out+'/doe',{recursive:true});fs.mkdirSync(out+'/stag',{recursive:true});fs.mkdirSync('.qa/deer/doe',{recursive:true});fs.mkdirSync('.qa/deer/stag',{recursive:true});fs.mkdirSync(foodOut,{recursive:true});fs.mkdirSync('.qa/deer',{recursive:true});
function bounds(data,width,height){let left=width,top=height,right=-1,bottom=-1,count=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>=24){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);count++}
 if(count<300)throw Error('Missing complete sprite');return{left:Math.max(0,left-2),top:Math.max(0,top-2),width:Math.min(width,right+3)-Math.max(0,left-2),height:Math.min(height,bottom+3)-Math.max(0,top-2)};
}
const records=[];
function sprites(data,width,height){
 const seen=new Uint8Array(width*height),queue=new Int32Array(width*height),found=[];
 for(let p=0;p<seen.length;p++){
  if(seen[p]||data[p*4+3]<24)continue;
  let head=0,tail=0,left=width,top=height,right=0,bottom=0;queue[tail++]=p;seen[p]=1;
  while(head<tail){const at=queue[head++],x=at%width,y=Math.floor(at/width);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,k=yy*width+xx;if(xx<0||xx>=width||yy<0||yy>=height||seen[k]||data[k*4+3]<24)continue;seen[k]=1;queue[tail++]=k}
  }
  if(tail>500)found.push({count:tail,pixels:Int32Array.from(queue.subarray(0,tail)),left:Math.max(0,left-2),top:Math.max(0,top-2),width:Math.min(width,right+3)-Math.max(0,left-2),height:Math.min(height,bottom+3)-Math.max(0,top-2)});
 }
 const cells=new Map();for(const s of found){const col=Math.min(3,Math.floor((s.left+s.width/2)*4/width)),row=Math.min(3,Math.floor((s.top+s.height/2)*4/height)),i=row*4+col;if(cells.has(i))throw Error('Multiple sprite bodies in one cell');cells.set(i,s)}
 if(cells.size!==16)throw Error('Expected sixteen complete silhouettes, got '+cells.size);
 return Array.from({length:16},(_,i)=>{
  const {count,pixels,...rect}=cells.get(i);if(rect.left<2||rect.top<2||rect.left+rect.width>width-2||rect.top+rect.height>height-2)throw Error('Sprite touches outer source edge');
  // Only retain this connected silhouette and its antialias fringe. A long
  // antler from a neighbouring frame may lie inside the rectangular crop.
  const isolated=Buffer.alloc(rect.width*rect.height*4);
  for(const p of pixels){const px=p%width,py=Math.floor(p/width);
   for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
    const x=px+dx,y=py+dy;if(x<rect.left||x>=rect.left+rect.width||y<rect.top||y>=rect.top+rect.height)continue;
    const source=(y*width+x)*4,dest=((y-rect.top)*rect.width+x-rect.left)*4;data.copy(isolated,dest,source,source+4);
   }
  }
  return{raw:isolated,rect,sw:rect.width,sh:rect.height};
 });
}
for(const [direction,source]of Object.entries(sources)){
 const sourceFile=path.join(sourceRoot,source),meta=await sharp(sourceFile).metadata();if(!meta.hasAlpha)throw Error('Expected transparent sheet: '+source);
 const raw=await sharp(sourceFile).ensureAlpha().raw().toBuffer(),frames=sprites(raw,meta.width,meta.height);
 const liftFor=i=>i===5?4:i===6?12:i===12?3:0;
 const scale=Math.min(184/frames[8].rect.height,208/Math.max(...frames.map(f=>f.rect.width)),...frames.map((f,i)=>(baseline-8-liftFor(i))/f.rect.height));
 const packed=[];
 for(let i=0;i<16;i++){
  const {raw,rect,sw,sh}=frames[i],width=Math.round(rect.width*scale),height=Math.round(rect.height*scale),lift=liftFor(i);
  const sprite=await sharp(raw,{raw:{width:sw,height:sh,channels:4}}).resize(width,height).png().toBuffer();
  const image=await sharp({create:{width:cell,height:cell,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:sprite,left:Math.round((cell-width)/2),top:baseline-height-lift}]).png().toBuffer();
  packed.push(image);
 }
 const atlas=await sharp({create:{width:cell*4,height:cell*4,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(packed.map((input,i)=>({input,left:i%4*cell,top:Math.floor(i/4)*cell}))).png().toBuffer();
 await sharp(atlas).webp({lossless:true,effort:6}).toFile(path.join(out,direction+'.webp'));
 await sharp(packed[8]).png().toFile(`.qa/deer/${direction}-idle.png`);
 records.push({direction,source,scale,frameCount:16,sourceBounds:frames.map(f=>f.rect),atlas:[cell*4,cell*4],webpBytes:fs.statSync(path.join(out,direction+'.webp')).size});
}
const foodRecords=[];
for(const [name,source]of Object.entries(foods)){
 const {data,info}=await sharp(path.join(sourceRoot,source)).ensureAlpha().raw().toBuffer({resolveWithObject:true}),rect=bounds(data,info.width,info.height);
 const resized=await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).extract(rect).resize(240,240,{fit:'inside'}).png().toBuffer(),size=await sharp(resized).metadata();
 const packed=await sharp({create:{width:256,height:256,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:resized,left:Math.round((256-size.width)/2),top:Math.round((256-size.height)/2)}]).webp({lossless:true,effort:6}).toBuffer();
 fs.writeFileSync(path.join(foodOut,name+'-venison.webp'),packed);foodRecords.push({name,source,sourceBounds:rect,size:[256,256],webpBytes:packed.length});
}
const manifest={version:1,artwork:'Built-in image_gen, approved doe/stag mockup',packing:'True alpha; complete per-cell silhouettes; uniform scale across each view; common baseline; explicit gallop lift; lossless WebP',cell,anchor:[112,baseline],frames:['walk-contact-left','walk-pass-left','walk-contact-right','walk-pass-right','run-crouch','run-push','run-air','run-land','idle','blink','graze-down','graze','hit','recover','fall','downed'],records,foodRecords};
fs.writeFileSync(path.join(out,'artwork.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({views:records.length,frames:records.length*16,decodedBytes:records.length*(cell*4)**2*4,artworkBytes:records.reduce((n,r)=>n+r.webpBytes,0),foodRecords},null,2));

// Mechanical extraction, uniform per-view scaling and atlas packing of generated art.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp'),root=process.cwd(),sourceRoot=path.resolve(root,'../generated_images');
const sources={down:'exec-97886415-83ac-4daa-b2f6-6e84ad9b3051.png','down-left':'exec-7b041a2e-7a07-4ca6-a261-7dc0cc37e758.png',left:'exec-ef19ec12-ae2d-4daa-bf50-41723135d829.png','up-left':'exec-015e8ad6-1c44-4941-a92c-02e917a73ada.png',up:'exec-cfe8e0fe-9b94-473f-8fe0-ff0f09a1b419.png'};
const foods={raw:'exec-f884ea0b-8a9b-4003-aa68-0406d7a6c517.png',cooked:'exec-84e959b1-8aa2-4aaa-b172-27616361229c.png'};
const out='public/survival/rabbit-v1',foodOut='public/survival/rabbit-food-v1',cell=192,baseline=170;
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(foodOut,{recursive:true});fs.mkdirSync('.qa/rabbits',{recursive:true});
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
  if(tail>500)found.push({count:tail,left:Math.max(0,left-2),top:Math.max(0,top-2),width:Math.min(width,right+3)-Math.max(0,left-2),height:Math.min(height,bottom+3)-Math.max(0,top-2)});
 }
 const cells=new Map();for(const s of found){const col=Math.min(3,Math.floor((s.left+s.width/2)*4/width)),row=Math.min(3,Math.floor((s.top+s.height/2)*4/height)),i=row*4+col;if(cells.has(i))throw Error('Multiple sprite bodies in one cell');cells.set(i,s)}
 if(cells.size!==16)throw Error('Expected sixteen complete silhouettes, got '+cells.size);
 return Array.from({length:16},(_,i)=>{const {count,...rect}=cells.get(i);if(rect.left<2||rect.top<2||rect.left+rect.width>width-2||rect.top+rect.height>height-2)throw Error('Sprite touches outer source edge');return{raw:data,rect,sw:width,sh:height}});
}
for(const [direction,source]of Object.entries(sources)){
 const sourceFile=path.join(sourceRoot,source),meta=await sharp(sourceFile).metadata();if(!meta.hasAlpha)throw Error('Expected transparent sheet: '+source);
 const raw=await sharp(sourceFile).ensureAlpha().raw().toBuffer(),frames=sprites(raw,meta.width,meta.height);
 const liftFor=i=>i===2?10:i===5?4:i===6?14:i===12?3:0;
 const scale=Math.min(142/frames[8].rect.height,174/Math.max(...frames.map(f=>f.rect.width)),...frames.map((f,i)=>(baseline-8-liftFor(i))/f.rect.height));
 const packed=[];
 for(let i=0;i<16;i++){
  const {raw,rect,sw,sh}=frames[i],width=Math.round(rect.width*scale),height=Math.round(rect.height*scale),lift=liftFor(i);
  const sprite=await sharp(raw,{raw:{width:sw,height:sh,channels:4}}).extract(rect).resize(width,height).png().toBuffer();
  const image=await sharp({create:{width:cell,height:cell,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:sprite,left:Math.round((cell-width)/2),top:baseline-height-lift}]).png().toBuffer();
  packed.push(image);
 }
 const atlas=await sharp({create:{width:cell*4,height:cell*4,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(packed.map((input,i)=>({input,left:i%4*cell,top:Math.floor(i/4)*cell}))).png().toBuffer();
 await sharp(atlas).webp({lossless:true,effort:6}).toFile(path.join(out,direction+'.webp'));
 await sharp(packed[8]).png().toFile(`.qa/rabbits/${direction}-idle.png`);
 records.push({direction,source,scale,frameCount:16,sourceBounds:frames.map(f=>f.rect),atlas:[cell*4,cell*4],webpBytes:fs.statSync(path.join(out,direction+'.webp')).size});
}
const foodRecords=[];
for(const [name,source]of Object.entries(foods)){
 const {data,info}=await sharp(path.join(sourceRoot,source)).ensureAlpha().raw().toBuffer({resolveWithObject:true}),rect=bounds(data,info.width,info.height);
 const resized=await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).extract(rect).resize(240,240,{fit:'inside'}).png().toBuffer(),size=await sharp(resized).metadata();
 const packed=await sharp({create:{width:256,height:256,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:resized,left:Math.round((256-size.width)/2),top:Math.round((256-size.height)/2)}]).webp({lossless:true,effort:6}).toBuffer();
 fs.writeFileSync(path.join(foodOut,name+'-rabbit.webp'),packed);foodRecords.push({name,source,sourceBounds:rect,size:[256,256],webpBytes:packed.length});
}
const manifest={version:1,artwork:'Built-in image_gen, approved rabbit mockup and existing chicken food style references',packing:'True alpha; complete per-cell silhouettes; uniform scale across each view; common baseline; explicit hop lift; lossless WebP',cell,anchor:[96,baseline],frames:['hop-rest','hop-push','hop-air','hop-land','run-crouch','run-push','run-air','run-land','idle','blink','graze-down','graze','hit','recover','fall','downed'],records,foodRecords};
fs.writeFileSync(path.join(out,'artwork.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({views:records.length,frames:records.length*16,decodedBytes:records.length*(cell*4)**2*4,artworkBytes:records.reduce((n,r)=>n+r.webpBytes,0),foodRecords},null,2));

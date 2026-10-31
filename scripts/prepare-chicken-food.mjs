// Mechanical extraction/packing of generated artwork. No drawing or recoloring.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const root=process.cwd(),sourceRoot=path.resolve(root,'../generated_images'),out=path.join(root,'public/survival/chicken-food-v1');
fs.mkdirSync(out,{recursive:true});
const inputs=[['raw-chicken','exec-1f35d501-5081-4d07-a9fd-ac67b10322c3.png'],['cooked-chicken','exec-702f128f-dd5b-4d8a-a607-c9dd5e5974d8.png']];
const records=[];
for(const [name,source]of inputs){
 const {data,info}=await sharp(path.join(sourceRoot,source)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width,height}=info,n=width*height,seen=new Uint8Array(n),queue=new Int32Array(n);let best;
 for(let p=0;p<n;p++){
  if(seen[p]||data[p*4+3]<64)continue;
  let head=0,tail=0,l=width,t=height,r=0,b=0;seen[p]=1;queue[tail++]=p;
  while(head<tail){const at=queue[head++],x=at%width,y=Math.floor(at/width);l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const xx=x+dx,yy=y+dy,k=yy*width+xx;if(xx<0||xx>=width||yy<0||yy>=height||seen[k]||data[k*4+3]<64)continue;seen[k]=1;queue[tail++]=k;
   }
  }
  if(!best||tail>best.count)best={count:tail,left:l-3,top:t-3,width:r-l+7,height:b-t+7};
 }
 if(!best||best.count<10000||best.left<0||best.top<0)throw Error('Missing complete food silhouette');
 const {count,...rect}=best;
 const resized=await sharp(data,{raw:{width,height,channels:4}}).extract(rect).resize(240,240,{fit:'inside'}).png().toBuffer(),size=await sharp(resized).metadata();
 const image=await sharp({create:{width:256,height:256,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:resized,left:Math.round((256-size.width)/2),top:Math.round((256-size.height)/2)}]).png().toBuffer();
 const png=path.join(out,name+'.png'),webp=path.join(out,name+'.webp');fs.writeFileSync(png,image);await sharp(image).webp({lossless:true,effort:6}).toFile(webp);
 records.push({name,source,size:[256,256],sourceBounds:rect,alphaPixels:count,webpBytes:fs.statSync(webp).size});
}
fs.writeFileSync(path.join(out,'artwork.json'),JSON.stringify({version:1,generation:'Built-in image_gen; approved character/chicken mockup as style reference',packing:'Preserved alpha, cropped complete main silhouette, uniform aspect-preserving resize and transparent padding',records},null,2)+'\n');
console.log(JSON.stringify(records,null,2));

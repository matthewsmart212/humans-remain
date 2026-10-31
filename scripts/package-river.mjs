// Non-destructive asset packaging: crop a continuous generated master without
// resampling its artwork. Native pixel rows map identically through every join.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const archive='artwork-archive/river-headwaters-v1',out='public/survival/river-headwaters-v1';
fs.mkdirSync(out,{recursive:true});
const master=archive+'/master.png',meta=await sharp(master).metadata();
const height=meta.height,width=meta.width,sourceScale=2816/height;
const crops=[[0,535],[468,535],[935,height-935]];
const names=[['headwater','riverHeadwater','Rocky headwater'],['cascade','riverCascade','Cascade pools'],['south-bend','riverSouthBend','Southern bend']];
const sections=[];
for(let i=0;i<3;i++){
 const [top,h]=crops[i],[id,key,name]=names[i];
 const crop={left:0,top,width,height:h};
 await sharp(master).extract(crop).webp({quality:94,effort:6}).toFile(`${out}/${id}.webp`);
 await sharp(master).extract(crop).resize({width:256}).webp({quality:83,effort:6}).toFile(`${out}/${id}-preview.webp`);
 sections.push({id,key,name,x:-6256,y:-6200+top*sourceScale,width:2048,height:h*sourceScale,sourceY:top*sourceScale});
}
fs.writeFileSync('src/river-sections.json',JSON.stringify(sections,null,2)+'\n');
// Use the twelve complete frames, not the clipped final row in the original.
const frames=[];
for(let i=0;i<12;i++){
 const left=Math.round(i%4*1254/4),top=Math.round(Math.floor(i/4)*1254/4);
 const right=Math.round((i%4+1)*1254/4),bottom=Math.round((Math.floor(i/4)+1)*1254/4);
 const input=await sharp(archive+'/motion-original.png').extract({left,top,width:right-left,height:bottom-top}).resize(256,256).toBuffer();
 frames.push({input,left:i%4*256,top:Math.floor(i/4)*256});
}
await sharp({create:{width:1024,height:768,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(frames).webp({quality:92,alphaQuality:100,effort:6}).toFile(out+'/foam-frames.webp');
// Analyse blue water for compact collision spans; this does not alter artwork.
const {data,info}=await sharp(master).removeAlpha().raw().toBuffer({resolveWithObject:true});
const step=8,rows=[];
for(let row=0;row<352;row++){
 const py=Math.min(height-1,Math.floor((row*step+step/2)/2816*height));let lo=256,hi=-1;
 for(let col=0;col<256;col++){
  const px=Math.min(width-1,Math.floor((col*step+step/2)/2048*width)),n=(py*width+px)*info.channels;
  const [r,g,b]=data.subarray(n,n+3);
  if(b-r>18&&g-r>12&&b>65){lo=Math.min(lo,col);hi=col}
 }
 rows.push(hi-lo>=2?[lo,hi+1]:null);
}
fs.writeFileSync('src/river-water-mask.json',JSON.stringify({step,rows})+'\n');
const report={masterPixels:[width,height],worldSize:[2048,2816],nativeCrops:crops,frames:12,sections,bytes:fs.readdirSync(out).reduce((n,f)=>n+fs.statSync(out+'/'+f).size,0)};
fs.writeFileSync('docs/qa/river-headwaters-v1/assets.json',JSON.stringify(report,null,2)+'\n');
console.log(report);

// Crop and encode the generated continuation; keep original pixels and archive.
import fs from 'node:fs';import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const archive='artwork-archive/river-logging-v1',out='public/survival/river-logging-v1',qa='docs/qa/river-logging-v1';
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(qa,{recursive:true});
const master=archive+'/master.png',meta=await sharp(master).metadata(),width=meta.width,height=meta.height;
const scale=2816/height,overlap=Math.ceil(128/scale),stride=Math.floor((height-overlap)/3);
const crops=[[0,stride+overlap],[stride,stride+overlap],[stride*2,height-stride*2]];
const names=[['pool-outlet','riverPoolOutlet','Pool outlet'],['logging-rapids','riverLoggingRapids','Logging rapids'],['crossing-pool','riverCrossingPool','Crossing approach pool']];
const sections=[];
for(let i=0;i<3;i++){
 const [top,h]=crops[i],[id,key,name]=names[i],crop={left:0,top,width,height:h};
 await sharp(master).extract(crop).webp({quality:94,effort:6}).toFile(`${out}/${id}.webp`);
 await sharp(master).extract(crop).resize({width:256}).webp({quality:83,effort:6}).toFile(`${out}/${id}-preview.webp`);
 sections.push({id,key,name,x:-5376,y:-4096+top*scale,width:2816,height:h*scale,sourceY:top*scale});
}
fs.writeFileSync('src/river-logging-sections.json',JSON.stringify(sections,null,2)+'\n');
const {data,info}=await sharp(master).removeAlpha().raw().toBuffer({resolveWithObject:true});
const step=8,rows=[];
for(let row=0;row<352;row++){
 const py=Math.min(height-1,Math.floor((row*step+step/2)/2816*height));let lo=352,hi=-1;
 for(let col=0;col<352;col++){
  const px=Math.min(width-1,Math.floor((col*step+step/2)/2816*width)),n=(py*width+px)*info.channels;
  const [r,g,b]=data.subarray(n,n+3);
  if(b-r>18&&g-r>12&&b>65){lo=Math.min(lo,col);hi=col}
 }
 rows.push(hi-lo>=2?[lo,hi+1]:null);
}
// Short entirely white foam rows still belong to the channel.
for(let i=1;i<rows.length-1;i++)if(!rows[i]&&rows[i-1]){
 let j=i;while(j<rows.length&&!rows[j]&&j-i<6)j++;
 if(rows[j])for(let k=i;k<j;k++){const t=(k-i+1)/(j-i+1);rows[k]=rows[i-1].map((v,n)=>Math.round(v+(rows[j][n]-v)*t))}
}
fs.writeFileSync('src/river-logging-water-mask.json',JSON.stringify({step,rows})+'\n');
const report={masterPixels:[width,height],worldSize:[2816,2816],nativeCrops:crops,sections,bytes:fs.readdirSync(out).reduce((n,f)=>n+fs.statSync(out+'/'+f).size,0),reusesMotionAtlas:true};
fs.writeFileSync(qa+'/assets.json',JSON.stringify(report,null,2)+'\n');console.log(report);

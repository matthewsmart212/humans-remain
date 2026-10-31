// Native-pixel crops; no repainting, tiling or upscaling of the approved art.
import fs from 'node:fs';import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const configs=JSON.parse(fs.readFileSync('src/river-extension-layout.json','utf8'));
const sections=[],masks=[],assets=[];
for(let batch=0;batch<configs.length;batch++){
 const c=configs[batch],master=`artwork-archive/${c.id}/master.png`;
 if(!fs.existsSync(master))continue;
 const out=`public/survival/${c.id}`,qa=`docs/qa/${c.id}`;fs.mkdirSync(out,{recursive:true});fs.mkdirSync(qa,{recursive:true});
 const {width,height}=await sharp(master).metadata(),sx=c.source.width/width,sy=c.source.height/height;
 const count=5,overlap=Math.ceil(128/sy),stride=Math.floor((height-overlap)/count);
 for(let i=0;i<count;i++){
  const top=i*stride,h=i===count-1?height-top:stride+overlap,id=`reach-${i+1}`,key=`riverExtension${batch}_${i}`;
  const crop={left:0,top,width,height:h};
  await sharp(master).extract(crop).webp({quality:94,effort:6}).toFile(`${out}/${id}.webp`);
  await sharp(master).extract(crop).resize({width:256}).webp({quality:83,effort:6}).toFile(`${out}/${id}-preview.webp`);
  sections.push({id,key,name:`${c.name} ${i+1}`,batch:batch+2,x:c.source.x,y:c.source.y+top*sy,width:c.source.width,height:h*sy,sourceY:top*sy,nativeTop:top,nativeHeight:h,nativeWidth:width,masterHeight:height});
 }
 const {data,info}=await sharp(master).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const step=8,cols=Math.ceil(c.source.width/step),rows=[];
 for(let row=0;row<Math.ceil(c.source.height/step);row++){
  const py=Math.min(height-1,Math.floor((row+.5)*step/sy));let lo=cols,hi=-1;
  for(let col=0;col<cols;col++){
   const px=Math.min(width-1,Math.floor((col+.5)*step/sx)),n=(py*width+px)*info.channels,[r,g,b]=data.subarray(n,n+3);
   if(b-r>18&&g-r>12&&b>65){lo=Math.min(lo,col);hi=col}
  }
  rows.push(hi-lo>=2?[lo,hi+1]:null);
 }
 // Bridge planks hide the blue pixels. Continue the channel underneath and let
 // the explicit deck corridor provide the only walkable crossing.
 for(let i=1;i<rows.length-1;i++)if(!rows[i]&&rows[i-1]){let j=i;while(j<rows.length&&!rows[j]&&j-i<24)j++;if(rows[j])for(let k=i;k<j;k++){const t=(k-i+1)/(j-i+1);rows[k]=rows[i-1].map((v,n)=>Math.round(v+(rows[j][n]-v)*t))}}
 masks.push({batch:batch+2,step,rows});
 assets.push({id:c.id,nativePixels:[width,height],world:c.source,bytes:fs.readdirSync(out).reduce((n,f)=>n+fs.statSync(out+'/'+f).size,0)});
}
fs.writeFileSync('src/river-extension-sections.json',JSON.stringify(sections,null,2)+'\n');
fs.writeFileSync('src/river-extension-water-masks.json',JSON.stringify(masks)+'\n');
fs.mkdirSync('docs/qa/river-complete-v1',{recursive:true});fs.writeFileSync('docs/qa/river-complete-v1/assets.json',JSON.stringify(assets,null,2)+'\n');console.log(assets);

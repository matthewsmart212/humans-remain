// Precompute the overlap between opposite edges of each upright material.
// Pass a directory containing the original public/survival directory tree.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

const sharp=createRequire(import.meta.url)('sharp');
const source=process.argv[2];
if(!source)throw Error('Pass the source directory containing world-ground-v2 and world-ground-v3.');

const files=['world-ground-v2/warm.webp','world-ground-v2/brown.webp','world-ground-v3/clear-earth.webp'];
const result=new Map();
for(const file of files){
 const {data,info}=await sharp(path.join(source,file)).removeAlpha().raw().toBuffer({resolveWithObject:true});
 if(info.width!==1254||info.height!==1254||info.channels!==3)throw Error('Unexpected source material dimensions: '+file);
 const size=1078,gutter=info.width-size;
 const output=Buffer.alloc(size*size*3);
 const weight=Array.from({length:size},(_,i)=>{const t=Math.min(1,(i+.5)/gutter);return t*t*(3-2*t)});
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const wx=weight[x],wy=weight[y];
  const distanceX=wx<1?size:0,distanceY=wy<1?size:0;
  const top=(y*info.width+x)*3,bottom=((y+distanceY)*info.width+x)*3,destination=(y*size+x)*3;
  for(let channel=0;channel<3;channel++){
   const near=data[top+channel]*wx+data[top+distanceX*3+channel]*(1-wx);
   const far=data[bottom+channel]*wx+data[bottom+distanceX*3+channel]*(1-wx);
   output[destination+channel]=Math.round(near*wy+far*(1-wy));
  }
 }
 const outputPath=path.join('public/survival',file);
 const {size:bytes}=await sharp(output,{raw:{width:size,height:size,channels:3}}).webp({quality:94,effort:6,smartSubsample:true}).toFile(outputPath);
 result.set('/survival/'+file,{size,bytes});
}

for(const version of ['v2','v3']){
 const file=`public/survival/world-ground-${version}/manifest.json`;
 const manifest=JSON.parse(fs.readFileSync(file,'utf8'));
 manifest.assembly='Upright material repeats at native pixel scale with pre-feathered edges, unique positional offsets, 200px terrain overlaps and a continuous world-space colour field.';
 for(const material of manifest.materials){
  const baked=result.get(material.image);if(!baked)continue;
  if(version==='v2'){material.width=baked.size;material.height=baked.size}
  else{material.sourceWidth=1254;material.sourceHeight=1254;material.width=baked.size;material.height=baked.size}
  material.bytes=baked.bytes;
 }
 fs.writeFileSync(file,JSON.stringify(manifest,null,2)+'\n');
}

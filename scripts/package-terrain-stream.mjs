// Offline texture packaging. Runtime never crops, resizes or reads back pixels.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),sharp=require('sharp');
const out='/tmp/safety-terrain-pack.cjs';
await build({stdin:{contents:"export * from './src/world-assets';export * from './src/world-road-pilot';export * from './src/river-art';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:out});
const m=require(out),directory='public/survival/terrain-stream-v2';fs.mkdirSync(directory,{recursive:true});
const chunks=[],rivers=[];
async function packageImage(parent,url,layer){
 const input=path.join('public',url),{data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let y=0;y<info.height;y+=512)for(let x=0;x<info.width;x+=512){
  const width=Math.min(512,info.width-x),height=Math.min(512,info.height-y);
  // Even origins/extents keep the half-size level on the same sampling grid.
  const left=Math.max(0,x-4),top=Math.max(0,y-4),w=Math.min(info.width,x+width+4)-left,h=Math.min(info.height,y+height+4)-top;
  const base=`${parent.key}_${x}_${y}`,levels=[];
  for(const divisor of [1,2]){
   const key=base+'L'+divisor,file=key+'.webp';
   let image=sharp(data,{raw:info}).extract({left,top,width:w,height:h});
   if(divisor===2)image=image.resize(w/2,h/2,{kernel:'lanczos3'});
   if(divisor!==1||!process.argv.includes('--mips-only'))await image.webp(divisor===1?{quality:90,effort:5}:{quality:85,effort:5}).toFile(path.join(directory,file));
   levels.push({key,url:'/survival/terrain-stream-v2/'+file,bytes:w*h*4/(divisor*divisor),divisor});
  }
  const sx=parent.width/info.width,sy=parent.height/info.height;
  chunks.push({parent:parent.key,layer,x:parent.x+x*sx,y:parent.y+y*sy,width:width*sx,height:height*sy,sample:{x:parent.x+left*sx,y:parent.y+top*sy,width:w*sx,height:h*sy},levels});
 }
}
for(const parent of m.ROAD_TERRAIN_PATCHES)await packageImage(parent,m.ROAD_PILOT_IMAGES[parent.key],'road');
await packageImage({key:'homeGround',x:0,y:0,width:4800,height:4800},'/survival/camp-ground-v3/full-4800.webp','camp');
for(const p of m.RIVER_SECTIONS){const meta=await sharp(path.join('public',m.RIVER_DETAIL_IMAGES[p.key])).metadata(),preview=await sharp(path.join('public',m.RIVER_PREVIEW_IMAGES[p.key+'Preview'])).metadata();rivers.push({key:p.key,bytes:meta.width*meta.height*4,previewDensity:preview.width/p.width});}
fs.writeFileSync('src/terrain-stream-manifest.json',JSON.stringify({chunks,rivers})+'\n');
fs.writeFileSync('server/retired-road-redirects.json',JSON.stringify(Object.fromEntries(m.ROAD_TERRAIN_PATCHES.map(p=>[m.ROAD_PILOT_IMAGES[p.key],m.ROAD_OVERVIEW_IMAGES[p.key+'Preview']])) )+'\n');
console.log(`Packaged ${chunks.length} terrain chunks with two detail levels; ${rivers.length} river sizes.`);

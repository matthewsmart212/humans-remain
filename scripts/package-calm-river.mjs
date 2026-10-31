// Crop the six imagegen paintings at the existing native tile boundaries.
// No new geometry, shoreline or bridge collision is introduced.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const names=['headwaters','logging','western','waterworks','lower','southern'];
const ids=['river-headwaters-v1','river-logging-v1',...read('src/river-extension-layout.json').map(b=>b.id)];
const dims=[[1070,1470],[1254,1254],[1330,1182],[1330,1182],[1330,1182],[1269,1240]];
const tiles=[...read('src/river-sections.json').map((t,i)=>({...t,batch:0,nativeTop:[0,468,935][i],nativeHeight:535})),...read('src/river-logging-sections.json').map((t,i)=>({...t,batch:1,nativeTop:[0,399,798][i],nativeHeight:456})),...read('src/river-extension-sections.json')];
const out='public/survival/river-calm-v2';fs.mkdirSync(out,{recursive:true});
const redirects={};
for(let i=0;i<6;i++){const m=await sharp(`artwork-archive/river-calm-v2/${names[i]}.png`).metadata();assert.deepEqual([m.width,m.height],dims[i],names[i]+' native size')}
for(const t of tiles){
 const image=sharp(`artwork-archive/river-calm-v2/${names[t.batch]}.png`).extract({left:0,top:t.nativeTop,width:dims[t.batch][0],height:t.nativeHeight});
 for(const preview of [false,true]){
  const suffix=preview?'-preview':'',name=`${ids[t.batch]}-${t.id}${suffix}.webp`;
  await (preview?image.clone().resize({width:256}):image.clone()).webp({quality:preview?85:94}).toFile(`${out}/${name}`);
  redirects[`/survival/${ids[t.batch]}/${t.id}${suffix}.webp`]=`/survival/river-calm-v2/${name}`;
 }
}
const balance=read('src/river-flow-balance.json');
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t)};
for(const p of [...read('src/waterfall-sections.json'),...read('src/river-extension-waterfalls.json')].filter(p=>balance.areas[p.id])){
 const [left,top,width,height]=p.crop,[cx,cy,rx,ry]=balance.areas[p.id];
 const {data,info}=await sharp(`artwork-archive/river-calm-v2/${names[p.batch]}.png`).extract({left,top,width,height}).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const pixels=Buffer.alloc(width*height*3);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const n=(y*width+x)*info.channels,[r,g,b]=data.subarray(n,n+3);
  const water=Math.max(smooth(3,16,b-r)*smooth(0,9,g-r),smooth(208,238,Math.min(r,g,b))*smooth(0,5,b-r));
  const local=1-smooth(.65,1,Math.hypot((left+x-cx)/rx,(top+y-cy)/ry));
  const edge=smooth(0,9,Math.min(x,width-1-x,y,height-1-y));
  pixels.fill(Math.round(255*water*local*edge),(y*width+x)*3,(y*width+x+1)*3);
 }
 await sharp(pixels,{raw:{width,height,channels:3}}).png().toFile(`${out}/${p.id}-mask.png`);
}
redirects['/planning/built-river-complete-v1.webp']='/planning/built-river-calm-v2.webp';
redirects['/planning/river-complete-detail.webp']='/planning/river-calm-detail.webp';
fs.writeFileSync('server/calm-river-redirects.json',JSON.stringify(redirects,null,2)+'\n');
for(const old of Object.keys(redirects)){
 const src='public'+old,dest='artwork-archive/retired-runtime/river-before-calm-v2'+old;
 if(fs.existsSync(src)){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.renameSync(src,dest)}
}
console.log({tiles:tiles.length,waterfalls:1+Object.keys(balance.areas).length,previous:balance.previousAreas});

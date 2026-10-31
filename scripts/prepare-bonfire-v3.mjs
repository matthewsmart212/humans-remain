import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const masters='artwork-archive/bonfire-v3',out='public/survival/bonfire-v3',size=1024;
const blank=()=>sharp({create:{width:size,height:size,channels:4,background:'#00000000'}});
const raw=async input=>sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
function bounds({data,info}){let left=info.width,top=info.height,right=-1,bottom=-1;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>8){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}return{left,top,width:right-left+1,height:bottom-top+1}}
fs.mkdirSync(out,{recursive:true});
const atlas=path.join(masters,'flame-atlas.png'),meta=await sharp(atlas).metadata(),flames=[],frontFlames=[];
for(let i=0;i<8;i++){
 const x=i%4,y=Math.floor(i/4),left=Math.floor(x*meta.width/4),top=Math.floor(y*meta.height/2),width=Math.floor((x+1)*meta.width/4)-left,height=Math.floor((y+1)*meta.height/2)-top;
 const cell=await sharp(atlas).extract({left,top,width,height}).png().toBuffer(),r=await raw(cell),b=bounds(r);
 // Fixed root and shared scale. Do not fit the changing flame silhouette.
 const scale=1.5,w=Math.round(width*scale),h=Math.round(height*scale),rootY=b.top+b.height-1;
 const leftAt=Math.round(512-width/2*scale),topAt=Math.round(805-rootY*scale);
 const overlay=await sharp(cell).resize(w,h).png().toBuffer();
 flames.push(await blank().composite([{input:overlay,left:leftAt,top:topAt}]).raw().toBuffer());
 const smallScale=.78,sw=Math.round(width*smallScale),sh=Math.round(height*smallScale);
 frontFlames.push(await blank().composite([{input:await sharp(cell).resize(sw,sh).png().toBuffer(),left:Math.round(512-width/2*smallScale),top:Math.round(854-rootY*smallScale)}]).raw().toBuffer());
}
const tiers=[];
for(const tier of [1,2,3]){
 const source=path.join(masters,`tier-${tier}-base.png`),m=await sharp(source).metadata(),b=bounds(await raw(source));
 // Shared registration across all upgrades: these masters were edited in place.
 const scale=1024/m.width,width=Math.round(b.width*scale),height=Math.round(b.height*scale),left=Math.round(b.left*scale),top=960-Math.round((940-b.top)*scale);
 const base=await blank().composite([{input:await sharp(source).extract(b).resize(width,height).png().toBuffer(),left,top}]).raw().toBuffer();
 const mask=Buffer.alloc(base.length);
 await sharp(base,{raw:{width:size,height:size,channels:4}}).webp({lossless:true,effort:4}).toFile(`${out}/tier-${tier}-unlit.webp`);
 for(let i=0;i<8;i++){
  // Tall flames behind the timber, a smaller tongue in front: the log pyramid
  // remains visible and rooted, rather than vanishing under a pasted flame icon.
  const overlay=frontFlames[i],back=flames[i],composited=await sharp(back,{raw:{width:size,height:size,channels:4}}).composite([{input:base,raw:{width:size,height:size,channels:4}},{input:overlay,raw:{width:size,height:size,channels:4}}]).raw().toBuffer();
  for(let p=0;p<base.length;p+=4){if(overlay[p+3]===0&&(back[p+3]===0||base[p+3]===255))base.copy(composited,p,p,p+4);else mask[p]=mask[p+1]=mask[p+2]=mask[p+3]=255}
  await sharp(composited,{raw:{width:size,height:size,channels:4}}).webp({lossless:true,effort:4}).toFile(`${out}/tier-${tier}-flame-${i}.webp`);
 }
 await sharp(mask,{raw:{width:size,height:size,channels:4}}).png().toFile(`${masters}/tier-${tier}-flame-mask.png`);
 tiers.push({tier,baseRect:{left,top,width,height},socket:[512,805]});
}
await sharp(`${masters}/ground.png`).webp({quality:94,alphaQuality:100,effort:6}).toFile(`${out}/ground.webp`);
// The replacement well keeps the uploaded well's existing canvas and ground pivot.
const wellSource=`${masters}/well.png`,wellBounds=bounds(await raw(wellSource)),wellScale=.86,ww=Math.round(wellBounds.width*wellScale),wh=Math.round(wellBounds.height*wellScale);
const well=await sharp({create:{width:1091,height:1012,channels:4,background:'#00000000'}}).composite([{input:await sharp(wellSource).extract(wellBounds).resize(ww,wh).png().toBuffer(),left:Math.round(471-ww/2),top:995-wh}]).webp({quality:96,alphaQuality:100,effort:6}).toBuffer();
fs.writeFileSync('public/survival/camp-well-v2/oak-well.webp',well);
fs.writeFileSync(`${masters}/registration.json`,JSON.stringify({size,anchor:[512,960],frameCount:8,fps:10,tiers,well:{sourceBounds:wellBounds,scale:wellScale,anchor:[471,995],size:[1091,1012]}},null,2)+'\n');
console.log('Registered three bonfire tiers, 8 flame frames each, fixed ground pivot, walkable clearing and well.');

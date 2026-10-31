import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require('sharp');
const source='art-source/maps/camp-atlas-v2';
const slots={headquarters:[0,0,512,384],well:[512,0,256,256],workshop:[768,0,256,256],'medical-tent':[512,256,256,256],warehouse:[768,256,256,256],bunker:[0,512,256,256],camp:[256,512,256,256],storage:[0,768,256,256],palisade:[512,512,512,192]};
const sprites={},layers=[];
for(const [kind,[x,y,w,h]] of Object.entries(slots)){
 const file=`${kind==='storage'||kind==='palisade'?'art-source/maps/camp-atlas-v1':source}/${kind}.png`;
 const {data,info}=await sharp(file).trim({threshold:12}).resize({width:w-8,height:h-8,fit:'inside'}).png().toBuffer({resolveWithObject:true});
 sprites[kind]={x:x+4,y:y+4,width:info.width,height:info.height};layers.push({input:data,left:x+4,top:y+4});
}
await sharp({create:{width:1024,height:1024,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(layers).webp({quality:90,alphaQuality:100,effort:6}).toFile('public/maps/camp-atlas-v2.webp');
await sharp(`${source}/portrait.png`).trim({threshold:12}).resize({width:192,height:192,fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({quality:92,alphaQuality:100,effort:6}).toFile('public/maps/survivor-map-portrait-v1.webp');
// Reuse the exact stats-bar face; only its clipping and brass surround differ.
const face=await sharp('public/survival/ui-field-kit-v1/vitals.png').extract({left:12,top:35,width:160,height:160}).resize(164,164).png().toBuffer();
const mask=Buffer.from('<svg width="164" height="164"><circle cx="82" cy="82" r="80" fill="white"/></svg>');
const clipped=await sharp(face).composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
const rim=Buffer.from('<svg width="192" height="192"><circle cx="96" cy="96" r="91" fill="#123b3c" stroke="#153737" stroke-width="4"/><circle cx="96" cy="96" r="87" fill="none" stroke="#c49b54" stroke-width="5"/><circle cx="96" cy="96" r="84" fill="none" stroke="#f0d18d" stroke-width="1"/></svg>');
await sharp(rim).composite([{input:clipped,left:14,top:14}]).webp({quality:95,alphaQuality:100}).toFile('public/maps/survivor-map-portrait-v2.webp');
fs.writeFileSync('src/player-map-art.json',JSON.stringify({width:1024,height:1024,sprites},null,2)+'\n');
console.log(JSON.stringify({atlasBytes:fs.statSync('public/maps/camp-atlas-v2.webp').size,portraitBytes:fs.statSync('public/maps/survivor-map-portrait-v1.webp').size,sprites}));

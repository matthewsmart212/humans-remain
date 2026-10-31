// Pack generated, transparent illustrations into one shared texture.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const root='art-source/maps/camp-atlas-v1';
const slots=[['headquarters',0,0,504,504],['well',512,0,248,248],['workshop',768,0,248,248],['medical-tent',512,256,248,248],['warehouse',768,256,248,248],['storage',0,512,248,248],['bunker',256,512,248,248],['palisade',512,512,504,240]];
const sprites={},layers=[];
for(const [name,x,y,width,height]of slots){
 const {data,info}=await sharp(`${root}/${name}.png`).trim().resize({width,height,fit:'inside',withoutEnlargement:true}).png().toBuffer({resolveWithObject:true});
 const left=x+4,top=y+4;sprites[name]={x:left,y:top,width:info.width,height:info.height};layers.push({input:data,left,top});
}
await sharp({create:{width:1024,height:768,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(layers).webp({quality:92,alphaQuality:100,effort:6}).toFile('public/maps/camp-atlas-v1.webp');
fs.writeFileSync('src/player-map-art.json',JSON.stringify({width:1024,height:768,sprites},null,2)+'\n');
console.log(JSON.stringify({sprites:Object.keys(sprites),bytes:fs.statSync('public/maps/camp-atlas-v1.webp').size,decodedBytes:1024*768*4}));

// Contact sheets use the actual delivered sprites, not regenerated concept art.
import fs from 'node:fs';import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp'),art=JSON.parse(fs.readFileSync('src/world-rock-art.json')),collisions=JSON.parse(fs.readFileSync('src/rock-collisions.json'));
for(const debug of [false,true]){
 const cols=4,cw=380,ch=290,rows=Math.ceil(art.length/cols),layers=[];
 for(let i=0;i<art.length;i++){
  const a=art[i],left=i%cols*cw,top=Math.floor(i/cols)*ch;
  const im=await sharp('public'+a.image).resize({width:340,height:228,fit:'inside'}).toBuffer(),meta=await sharp(im).metadata();
  const x=Math.round(left+(cw-meta.width)/2),y=Math.round(top+45+(228-meta.height)/2);layers.push({input:im,left:x,top:y});
  const c=collisions[a.image.split('/').pop().replace('.webp','')];
  const paths=debug&&c?c.paths.map(p=>`<polygon points="${p.points.map(([px,py])=>[x+px*meta.width,y+py*meta.height].join(',')).join(' ')}" fill="#ff5588" fill-opacity=".15" stroke="#ff5588" stroke-width="2"/>`).join(''):'';
  layers.push({input:Buffer.from(`<svg width="${cw*cols}" height="${ch*rows}" xmlns="http://www.w3.org/2000/svg"><text x="${left+18}" y="${top+24}" font-family="sans-serif" font-size="17" fill="#f0e6cf">${String(i+1).padStart(2,'0')}  ${a.name}</text>${paths}${debug?`<circle cx="${x+a.anchor[0]*meta.width}" cy="${y+a.anchor[1]*meta.height}" r="3" fill="#62deff"/>`:''}${a.walkable?`<text x="${left+18}" y="${top+280}" fill="#c8d6b7" font-family="sans-serif" font-size="13">Walkable ground detail</text>`:''}</svg>`),left:0,top:0});
 }
 await sharp({create:{width:cols*cw,height:rows*ch,channels:4,background:'#686650'}}).composite(layers).webp({quality:94}).toFile('docs/qa/world-rocks-v1/'+(debug?'collision-review':'rock-collection')+'.webp');
}

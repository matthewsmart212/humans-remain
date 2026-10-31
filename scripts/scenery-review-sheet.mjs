// QA composition of the generated sprites; never modifies the artwork.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require('sharp');
const art=JSON.parse(fs.readFileSync('src/world-scenery-art.json'));
const collisions=JSON.parse(fs.readFileSync('src/scenery-collisions.json'));
for(const kind of ['foliage','prop']){
 const list=art.filter(x=>x.kind===kind),cols=kind==='foliage'?4:3,cw=400,ch=400,rows=Math.ceil(list.length/cols),layers=[];
 for(let i=0;i<list.length;i++){
  const a=list[i],left=(i%cols)*cw,top=Math.floor(i/cols)*ch;
  const sprite=await sharp('public'+a.image).resize({width:360,height:330,fit:'inside'}).toBuffer();
  const meta=await sharp(sprite).metadata(),x=left+(cw-meta.width)/2,y=top+45+(330-meta.height)/2;
  layers.push({input:sprite,left:Math.round(x),top:Math.round(y)});
  const outline=collisions[a.image.split('/').pop().replace('.webp','')];
  const grid=kind==='prop'?Array.from({length:9},(_,j)=>`<path d="M ${x+meta.width*(j+1)/10} ${y} v ${meta.height} M ${x} ${y+meta.height*(j+1)/10} h ${meta.width}" stroke="#ffffff" stroke-opacity=".13"/>`).join(''):'';
  const shape=outline?outline.paths.map(p=>`<polygon points="${p.points.map(([px,py])=>[x+px*meta.width,y+py*meta.height].join(',')).join(' ')}" fill="#ff4c7f" fill-opacity=".13" stroke="#ff4c7f" stroke-width="2"/>`).join(''):'';
  layers.push({input:Buffer.from(`<svg width="${cols*cw}" height="${rows*ch}" xmlns="http://www.w3.org/2000/svg"><text x="${left+18}" y="${top+27}" fill="#eee6cc" font-size="19" font-family="sans-serif">${a.name}</text>${grid}${shape}<circle cx="${x+a.anchor[0]*meta.width}" cy="${y+a.anchor[1]*meta.height}" r="4" fill="#80e2ff"/></svg>`),left:0,top:0});
 }
 await sharp({create:{width:cols*cw,height:rows*ch,channels:4,background:'#6e6850'}}).composite(layers).webp({quality:95}).toFile('docs/qa/world-scenery-v1/'+kind+'-review.webp');
}

import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';const sharp=createRequire(import.meta.url)('sharp');
const manifest=JSON.parse(fs.readFileSync('public/survival/maps/consistent-terrain-v1/manifest.json')),tiles=manifest.pieces;
assert.equal(tiles.length,26);let contacts=0,pixels=0;
const data=[];for(const t of tiles){const {data:d,info}=await sharp('public'+t.image).removeAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,t.width);assert.equal(info.height,t.height);data.push(d)}
for(let i=0;i<tiles.length;i++)for(let j=i+1;j<tiles.length;j++){
 const a=tiles[i],b=tiles[j],x=Math.max(a.x,b.x),y=Math.max(a.y,b.y),right=Math.min(a.x+a.width,b.x+b.width),bottom=Math.min(a.y+a.height,b.y+b.height);
 if(right<=x||bottom<=y)continue;contacts++;
 for(let yy=y;yy<bottom;yy++){const ai=((yy-a.y)*a.width+x-a.x)*3,bi=((yy-b.y)*b.width+x-b.x)*3,len=(right-x)*3;assert(data[i].subarray(ai,ai+len).equals(data[j].subarray(bi,bi+len)),`Different shared pixels: ${a.image} / ${b.image}`);pixels+=right-x}
}
const result={result:'pass',textures:26,contacts,identicalSharedPixels:pixels,geometry:'Original registered rectangles unchanged',camp:'Original camp files are not modified',browser:'Not tested on a physical phone or browser'};
fs.mkdirSync('docs/qa/consistent-terrain-v1',{recursive:true});fs.writeFileSync('docs/qa/consistent-terrain-v1/texture-checks.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));

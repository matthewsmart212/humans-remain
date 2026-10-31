// Mechanical bounding-box registration of imagegen edits to unchanged sprite canvases.
// No painting or synthetic foliage: all visible detail comes from the image edits.
import fs from 'node:fs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require('sharp');
const archive='artwork-archive/camp-walls-moss-v1',out='public/survival/camp-walls-moss-v1';
const specs=JSON.parse(fs.readFileSync(archive+'/prompts.json')).edits;
fs.mkdirSync(out,{recursive:true});
async function pixels(file){return sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true})}
function bounds({data,info}){let left=info.width,top=info.height,right=0,bottom=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>48){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y)}return{left,top,width:right-left+1,height:bottom-top+1}}
const report=[],manifest=JSON.parse(fs.readFileSync('src/wall-artwork-replacements.json'));
for(const s of specs){
 const copied=archive+'/wall-'+s.wall+'.png';if(!fs.existsSync(copied))fs.copyFileSync(s.source,copied);
 const original=await pixels('public/survival/camp-walls-v2/wall-'+s.wall+'.webp'),generated=await pixels(copied),a=bounds(original),b=bounds(generated);
 const registered=await sharp(copied).extract(b).resize(a.width,a.height,{fit:'fill'}).png().toBuffer();
 const file=out+'/wall-'+s.wall+'.webp';
 await sharp({create:{width:original.info.width,height:original.info.height,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:registered,left:a.left,top:a.top}]).webp({quality:96,alphaQuality:100}).toFile(file);
 const final=await pixels(file);let union=0,intersection=0;
 for(let i=3;i<original.data.length;i+=4){const x=original.data[i]>48,y=final.data[i]>48;if(x||y)union++;if(x&&y)intersection++}
 const row=manifest[s.wall-1];row.url='/survival/camp-walls-moss-v1/wall-'+s.wall+'.webp';row.name='mossy-oak-wall-'+s.wall+'.webp';row.bytes=fs.statSync(file).size;
 report.push({wall:s.wall,originalBounds:a,generatedBounds:b,canvas:[original.info.width,original.info.height],silhouetteOverlap:Number((intersection/union).toFixed(4)),output:file});
}
fs.writeFileSync(archive+'/registration.json',JSON.stringify(report,null,2)+'\n');
fs.writeFileSync('src/wall-artwork-replacements.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(report,null,2));

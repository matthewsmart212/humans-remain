// Mechanical alpha trimming, resizing and water-outline measurement only.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const archive='artwork-archive/puddles-v1',out='public/survival/puddles-v1';fs.mkdirSync(out,{recursive:true});
const definitions=[['round','Small woodland puddle',140],['long','Long woodland puddle',100],['wide','Wide woodland puddle',180],['lobed','Joined woodland puddle',175]],metadata=[];
function outline(mask,n){
 const edges=new Map();const add=(x,y,xx,yy)=>{const k=x+','+y,list=edges.get(k)||[];list.push([xx,yy]);edges.set(k,list)};
 const filled=(x,y)=>x>=0&&y>=0&&x<n&&y<n&&mask[y*n+x];
 for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(filled(x,y)){
  if(!filled(x,y-1))add(x,y,x+1,y);if(!filled(x+1,y))add(x+1,y,x+1,y+1);if(!filled(x,y+1))add(x+1,y+1,x,y+1);if(!filled(x-1,y))add(x,y+1,x,y);
 }
 const loops=[];while(edges.size){const start=edges.keys().next().value,points=[start.split(',').map(Number)];let k=start;for(let i=0;i<n*n*4;i++){const list=edges.get(k);if(!list?.length)break;const p=list.pop();if(!list.length)edges.delete(k);points.push(p);k=p.join(',');if(k===start)break}loops.push(points)}
 const area=p=>Math.abs(p.reduce((sum,[x,y],i)=>{const [xx,yy]=p[(i+1)%p.length];return sum+x*yy-xx*y},0));
 const loop=loops.sort((a,b)=>area(b)-area(a))[0];if(!loop||area(loop)<n*n*.12)throw Error('Water outline too small');
 // Retain every fourth edge and remove redundant collinear segments. At 128px
 // measurement resolution this stays within a few pixels of the painted water.
 return loop.filter((p,i)=>i%4===0||i===loop.length-1).map(([x,y])=>[+(x/n).toFixed(5),+(y/n).toFixed(5)]);
}
for(const [key,name,worldWidth] of definitions){
 const file=archive+'/'+key+'-source.png',{data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});let left=info.width,top=info.height,right=0,bottom=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>16){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y)}
 left=Math.max(0,left-6);top=Math.max(0,top-6);right=Math.min(info.width-1,right+6);bottom=Math.min(info.height-1,bottom+6);
 const png=await sharp(file).extract({left,top,width:right-left+1,height:bottom-top+1}).resize({width:512,height:512,fit:'inside'}).png().toBuffer(),m=await sharp(png).metadata();
 await sharp(png).webp({quality:95,alphaQuality:100,effort:6}).toFile(out+'/'+key+'.webp');
 const n=128,probe=await sharp(png).resize(n,n,{fit:'fill'}).ensureAlpha().raw().toBuffer(),mask=new Uint8Array(n*n);
 for(let i=0;i<n*n;i++){const [r,g,b,a]=probe.subarray(i*4,i*4+4);mask[i]=a>180&&b>r*1.01&&g>r*1.012&&b>g*.985?1:0}
 metadata.push({id:'art_puddle_'+key,name,image:'/survival/puddles-v1/'+key+'.webp',size:[m.width,m.height],anchor:[.5,.5],worldWidth,water:outline(mask,n)});
}
fs.writeFileSync('src/puddle-art.json',JSON.stringify(metadata,null,2)+'\n');
const catalogue=JSON.parse(fs.readFileSync('src/base-catalogue.json')).filter(e=>!e.id.startsWith('art_puddle_')),template=catalogue.find(e=>e.id==='art_foliage_broadleaf');
for(const p of metadata)catalogue.push({...template,id:p.id,name:p.name,family:'Interactive puddles',group:'Puddles',purpose:'Walkable rainwater with footstep ripples and small running splashes.',improvement:'Water is a movable scene object with real foot contact.',appearance:'Painted slate-grey shallow water with an ochre damp rim and a few fallen leaves.',states:'Calm water, walking ripples, sprint splash, settling.',image:p.image,artPreview:{worldWidth:p.worldWidth},artworkExports:[p.image],artReadiness:'Transparent puddle sprite with traced water contact area.',inputs:'Player footsteps',resourceCost:'None',testScope:'Contact, persistence and software Skia render checks.'});
fs.writeFileSync('src/base-catalogue.json',JSON.stringify(catalogue,null,2)+'\n');
const detected=JSON.parse(fs.readFileSync('docs/qa/terrain-puddles-v1/original-water-bounds.json'));
// Two close colour islands belong to one small puddle. The southernmost warm
// reflection needs a manual bound because its blue saturation is low.
const areas=detected.filter((_,i)=>i!==3);Object.assign(areas.find(a=>a.left===1524),{width:124});
areas.push({left:3210,top:4300,width:110,height:96});
const field=areas.map((a,i)=>({assetId:'art_puddle_'+(a.height/a.width>1.45?'long':a.width/a.height>1.32?'wide':i%4===0?'lobed':'round'),left:a.left,top:a.top,width:a.width,height:a.height}));
fs.writeFileSync('src/camp-puddles.json',JSON.stringify(field,null,2)+'\n');
console.log('Packaged four transparent puddles with measured water outlines and '+field.length+' camp locations.');

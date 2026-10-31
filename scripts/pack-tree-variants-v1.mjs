// Mechanical lossless extraction; run from repository root after placing in scripts/.
// A single healthy canopy and root fan are reused by both standing states.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const sharp=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const archive=path.join(root,'artwork-archive/tree-variants-v1');
const output=path.join(root,'public/survival/tree-variants-v1');
const qa=path.join(root,'docs/qa/tree-variants-v1');
for(const dir of[archive,output,qa])fs.mkdirSync(dir,{recursive:true});

// Measurements are in the original 1536×1024 sources. Notch rectangles exclude
// separate generated wood chips so no root texture changes during chopping.
// The existing game emits hit debris. Translations fit unaffected bark/roots.
const specs=[
{key:'birch-branching',source:'b48e687a-3eb6-4037-b982-e5b545fc5984',library:'Silver birch: healthy, notched, stump.png',root:[326,925],shift:[532,0],stumpShift:[994,1],notch:[839,761,77,88]},
{key:'birch-bent',source:'a57847d6-bfe3-4f37-bf34-38ee99f7ac01',library:'Silver birch sprite atlas.png',root:[333,925],shift:[523,0],stumpShift:[993,0],notch:[834,762,83,90]},
{key:'oak-forked',source:'65a4b9b6-e978-408e-aec8-99fdc60cb53c',library:'Broad Oak, Notched Tree, and Stump.png',root:[332,905],shift:[606,0],stumpShift:[1021,1],notch:[930,701,90,115]},
{key:'oak-leaning',source:'ca486014-e967-4e91-8efb-1badc606628b',library:'Broad oak tree sprite atlas.png',root:[411,905],shift:[576,0],stumpShift:[941,0],notch:[990,722,91,103]},
{key:'pine-branching',source:'0a2805c4-cd04-450e-8371-01b42efb23b5',library:'Scots pine sprite atlas: healthy to stump.png',root:[300,950],shift:[545,0],stumpShift:[1014,-2],notch:[826,766,80,79]},
{key:'pine-bent',source:'6c94c587-e7e6-4093-add3-11f3e32abf38',library:'Wind-Bent Scots Pine Sprite Atlas.png',root:[310,950],shift:[573,0],stumpShift:[991,0],notch:[850,741,89,89]},
{key:'deadwood-forked',source:'79fc7496-cb72-4591-afc2-b7cb2655da34',library:'Gnarled deadwood tree sprite trio.png',root:[279,890],shift:[508,0],stumpShift:[1026,1],notch:[778,662,133,122],join:true},
{key:'deadwood-bent',source:'8d97f8e6-d981-4751-8317-2f958341f8da',library:'Gnarled Deadwood Tree Sprite Atlas.png',root:[305,890],shift:[544,0],stumpShift:[1025,1],notch:[833,649,127,129],join:true},
{key:'rowan-forked',source:'2763c0a5-e34c-4675-89b2-1e312f27f658',library:'Amber Rowan Tree Sprite Atlas.png',root:[292,905],shift:[550,0],stumpShift:[1020,-1],notch:[839,727,87,101]},
{key:'rowan-bent',source:'28d765b7-ab28-4ef4-87a4-cb47efa1d1e7',library:'Amber rowan tree sprite atlas(1).png',root:[325,920],shift:[492,0],stumpShift:[982,-1],notch:[806,733,88,100]},
{key:'willow-forked',source:'7f89b90a-95ba-4a0c-9feb-105cf7888108',library:'River willow tree sprite atlas.png',root:[377,910],shift:[544,0],stumpShift:[965,2],notch:[899,714,108,120],join:true},
{key:'willow-bent',source:'e545a0dd-e1bb-413b-924c-90e88f2a549b',library:'River willow tree sprite atlas(1).png',root:[350,905],shift:[576,0],stumpShift:[990,0],notch:[910,720,87,96]},
];
const baseArt=JSON.parse(fs.readFileSync(path.join(root,'src/tree-art.json')));
const selected=new Set(process.argv.slice(2));

// Find a curved low-alpha channel between sprites. Oak/rowan crowns overlap in
// their X projections, so a simple vertical extraction would cut real leaves.
function separator(data,width,height,minX,maxX,prefer){
 const n=maxX-minX+1,previous=new Float64Array(n),current=new Float64Array(n),parents=new Int16Array(n*height);
 for(let y=0;y<height;y++){
  for(let j=0;j<n;j++){
   let best=j;if(j&&previous[j-1]<previous[best])best=j-1;if(j+1<n&&previous[j+1]<previous[best])best=j+1;
   const x=minX+j;current[j]=(y?previous[best]:0)+data[(y*width+x)*4+3]*1000+Math.abs(x-prefer)*0.0001;parents[y*n+j]=best;
  }previous.set(current);
 }
 let end=0;for(let j=1;j<n;j++)if(previous[j]<previous[end])end=j;
 const seam=new Int16Array(height);let maxAlpha=0;
 for(let y=height-1;y>=0;y--){seam[y]=minX+end;maxAlpha=Math.max(maxAlpha,data[(y*width+seam[y])*4+3]);end=parents[y*n+end];}
 return{seam,maxAlpha};
}
function partition(data,width,height,left,right,index){
 const pixels=Buffer.alloc(width*height*4);let x0=width,y0=height,x1=-1,y1=-1;
 for(let y=0;y<height;y++){
  const start=index===0?0:index===1?left[y]:right[y],end=index===0?left[y]:index===1?right[y]:width;
  data.copy(pixels,(y*width+start)*4,(y*width+start)*4,(y*width+end)*4);
  for(let x=start;x<end;x++)if(data[(y*width+x)*4+3]>8){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 }
 if(x1<x0)throw Error('Empty source sprite');
 const visible=[x0,y0,x1-x0+1,y1-y0+1];
 // The threshold only measures bounds. Original alpha (including values 1–8)
 // is retained inside those bounds plus eight pixels; no global threshold.
 x0=Math.max(0,x0-8);y0=Math.max(0,y0-8);x1=Math.min(width-1,x1+8);y1=Math.min(height-1,y1+8);
 return{pixels,visible,crop:[x0,y0,x1-x0+1,y1-y0+1]};
}
function extract(data,sourceWidth,crop){
 const[x,y,width,height]=crop,pixels=Buffer.alloc(width*height*4);
 for(let row=0;row<height;row++)data.copy(pixels,row*width*4,((y+row)*sourceWidth+x)*4,((y+row)*sourceWidth+x+width)*4);
 return{pixels,width,height};
}
function blit(dst,dstWidth,sprite,x,y){for(let row=0;row<sprite.height;row++)sprite.pixels.copy(dst,((y+row)*dstWidth+x)*4,row*sprite.width*4,(row+1)*sprite.width*4);}
// Generation can subtly change nearby bark even after integer registration.
// For those three sources, quilt an eight-pixel overlap along the least-error
// path. This copies either the healthy or damaged original pixel unchanged:
// no blend, redraw, alpha threshold or resampling. The entire inner notch is
// retained; the rectangular outer edge equals the healthy sprite exactly.
function joinPatch(healthy,damaged){
 const{width:w,height:h}=damaged,result=Buffer.from(healthy.pixels);
 function edge(vertical,start,end){
  const rows=vertical?h:w,n=end-start+1,prev=new Float64Array(n),next=new Float64Array(n),parents=new Int16Array(rows*n);
  for(let r=0;r<rows;r++){
   for(let j=0;j<n;j++){
    let best=j;if(j&&prev[j-1]<prev[best])best=j-1;if(j+1<n&&prev[j+1]<prev[best])best=j+1;
    const x=vertical?start+j:r,y=vertical?r:start+j,p=(y*w+x)*4;let cost=0;
    for(let c=0;c<4;c++)cost+=Math.abs(healthy.pixels[p+c]-damaged.pixels[p+c]);
    next[j]=(r?prev[best]:0)+cost+Math.abs(j-(n-1)/2)*0.001;parents[r*n+j]=best;
   }prev.set(next);
  }
  let e=0;for(let j=1;j<n;j++)if(prev[j]<prev[e])e=j;const path=new Int16Array(rows);
  for(let r=rows-1;r>=0;r--){path[r]=start+e;e=parents[r*n+e];}return path;
 }
 const left=edge(true,0,7),right=edge(true,w-8,w-1),top=edge(false,0,7),bottom=edge(false,h-8,h-1);
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++)if(x>left[y]&&x<right[y]&&y>top[x]&&y<bottom[x]){
  const p=(y*w+x)*4;damaged.pixels.copy(result,p,p,p+4);
 }
 return{...damaged,pixels:result};
}
function frame(crop,position,anchor){return{crop:[...position,crop[2],crop[3]],anchor};}
async function rawPng(sprite){return sharp(sprite.pixels,{raw:{width:sprite.width,height:sprite.height,channels:4}}).png().toBuffer();}
function labelSvg(width,text){return Buffer.from(`<svg width="${width}" height="30"><rect width="100%" height="100%" fill="#22332c"/><text x="10" y="20" fill="#f5efe1" font-family="sans-serif" font-size="15">${text}</text></svg>`);}
async function comparison(spec,healthy,patch,stump,damageRect,healthyAnchor,stumpAnchor){
 const damaged={...healthy,pixels:Buffer.from(healthy.pixels)};blit(damaged.pixels,damaged.width,patch,damageRect[0],damageRect[1]);
 const scale=Math.min(0.5,480/healthy.height),panelWidth=Math.ceil(Math.max(healthy.width,stump.width)*scale)+30,panelHeight=530,ground=30+healthyAnchor[1]*scale,inputs=[];
 for(const[i,sprite,anchor,title]of[[0,healthy,healthyAnchor,'Healthy'],[1,damaged,healthyAnchor,'Notched: shared canopy + roots'],[2,stump,stumpAnchor,'Stump']]){
  const w=Math.round(sprite.width*scale),h=Math.round(sprite.height*scale),left=Math.round(i*panelWidth+panelWidth/2-anchor[0]*scale),top=Math.round(ground-anchor[1]*scale);
  inputs.push({input:await sharp(await rawPng(sprite)).resize(w,h).png().toBuffer(),left,top});inputs.push({input:labelSvg(panelWidth,title),left:i*panelWidth,top:0});
 }
 await sharp({create:{width:panelWidth*3,height:panelHeight,channels:4,background:'#9b7444'}}).composite(inputs).png().toFile(path.join(qa,`packing-${spec.key}-states.png`));
 const detailCrop=[damageRect[0]-16,damageRect[1]-20,patch.width+32,patch.height+40],a=extract(healthy.pixels,healthy.width,detailCrop),b=extract(damaged.pixels,damaged.width,detailCrop),detail=Buffer.alloc(a.width*2*a.height*4);
 blit(detail,a.width*2,a,0,0);blit(detail,a.width*2,b,a.width,0);
 await sharp(detail,{raw:{width:a.width*2,height:a.height,channels:4}}).resize(a.width*4,a.height*2,{kernel:'nearest'}).flatten({background:'#9b7444'}).png().toFile(path.join(qa,`packing-${spec.key}-notch.png`));
}

const results=[];
for(const spec of specs){
 if(selected.size&&!selected.has(spec.key))continue;
 const source=path.join(archive,`${spec.key}.png`);
 if(!fs.existsSync(source)){
  const original=path.join(root,'../generated_images',`exec-${spec.source}.png`),recovered=path.join(root,'../recovered-tree-art/iOS game',spec.library);
  fs.copyFileSync(fs.existsSync(original)?original:recovered,source);
 }
 const{data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true}),{width,height}=info;
 const left=separator(data,width,height,470,730,580),right=separator(data,width,height,1040,1320,1120);
 if(Math.max(left.maxAlpha,right.maxAlpha)>16)throw Error(`Unsafe extraction seam: ${spec.key} ${left.maxAlpha}/${right.maxAlpha}`);
 const regions=[0,1,2].map(i=>partition(data,width,height,left.seam,right.seam,i));
 const healthy=extract(regions[0].pixels,width,regions[0].crop),damagedPatch=extract(regions[1].pixels,width,spec.notch),stump=extract(regions[2].pixels,width,regions[2].crop);
 const patch=spec.join?joinPatch(extract(regions[0].pixels,width,[spec.notch[0]-spec.shift[0],spec.notch[1]-spec.shift[1],spec.notch[2],spec.notch[3]]),damagedPatch):damagedPatch;
 const[hx,hy]=regions[0].crop,[sx,sy]=regions[2].crop;
 const damageRect=[spec.notch[0]-spec.shift[0]-hx,spec.notch[1]-spec.shift[1]-hy,patch.width,patch.height],healthyAnchor=[spec.root[0]-hx,spec.root[1]-hy],patchAnchor=[healthyAnchor[0]-damageRect[0],healthyAnchor[1]-damageRect[1]],stumpAnchor=[spec.root[0]+spec.stumpShift[0]-sx,spec.root[1]+spec.stumpShift[1]-sy];
 if(damageRect[0]<0||damageRect[1]<0||damageRect[0]+patch.width>healthy.width||damageRect[1]+patch.height>healthy.height)throw Error(`Patch outside healthy frame: ${spec.key}`);
 const bottom=healthy.height+6,packedWidth=Math.max(healthy.width+4,stump.width+patch.width+8),packedHeight=bottom+Math.max(stump.height,patch.height)+2,packed=Buffer.alloc(packedWidth*packedHeight*4);
 blit(packed,packedWidth,healthy,2,2);blit(packed,packedWidth,stump,2,bottom);blit(packed,packedWidth,patch,stump.width+6,bottom);
 const file=path.join(output,`${spec.key}.webp`);
 await sharp(packed,{raw:{width:packedWidth,height:packedHeight,channels:4}}).webp({lossless:true,effort:6}).toFile(file);
 const decoded=await sharp(file).ensureAlpha().raw().toBuffer();let alphaMismatch=0,visibleRgbMismatch=0;
 for(let i=0;i<packed.length;i+=4){if(packed[i+3]!==decoded[i+3])alphaMismatch++;if(packed[i+3]&&(packed[i]!==decoded[i]||packed[i+1]!==decoded[i+1]||packed[i+2]!==decoded[i+2]))visibleRgbMismatch++;}
 if(alphaMismatch||visibleRgbMismatch)throw Error(`Lossless verification failed: ${spec.key}`);
 const species=spec.key.split('-')[0],base=baseArt.find(a=>a.id===`art_tree_${species}`),worldWidth=Math.round(base.worldWidth*base.frames[0].anchor[1]/base.frames[0].crop[2]*healthy.width/healthyAnchor[1]);
 const frames=[frame(regions[0].crop,[2,2],healthyAnchor),frame(spec.notch,[stump.width+6,bottom],patchAnchor),frame(regions[2].crop,[2,bottom],stumpAnchor)];
 const result={key:spec.key,species,id:`art_tree_${spec.key.replaceAll('-','_')}`,name:`${base.name}: ${spec.key.slice(species.length+1)}`,image:`/survival/tree-variants-v1/${spec.key}.webp`,size:[packedWidth,packedHeight],worldWidth,hp:base.hp,frames,damageRect,source:path.relative(root,source),sourceSize:[width,height],sourceHealthyCrop:regions[0].crop,sourceDamageCrop:spec.notch,sourceStumpCrop:regions[2].crop,sourceRoot:spec.root,damagedTranslation:spec.shift,stumpTranslation:spec.stumpShift,bytes:fs.statSync(file).size,decodedBytes:packedWidth*packedHeight*4,extraction:{visibleBounds:regions.map(r=>r.visible),separatorMaximumAlpha:[left.maxAlpha,right.maxAlpha],boundsPadding:8,alphaThresholdAppliedToPixels:false,notchOverlapJoin:!!spec.join},checks:{alphaMismatch,visibleRgbMismatch,outsideNotchPreserved:true,rootFanPreserved:true},notes:['Healthy pixels are reused unchanged outside the tight notch rectangle.','Separate generated loose chips are omitted; runtime hit particles supply debris.','Stump roots are registered to the same ground anchor; no scaling or resampling was applied.']};
 results.push(result);await comparison(spec,healthy,patch,stump,damageRect,healthyAnchor,stumpAnchor);
 fs.writeFileSync(path.join(qa,`packing-${spec.key}.json`),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({key:spec.key,size:result.size,bytes:result.bytes,frames,damageRect,worldWidth}));
}
const summary={version:1,layout:'healthy, registered notch patch, stump',lossless:true,variants:results,totalBytes:results.reduce((n,r)=>n+r.bytes,0),totalDecodedBytes:results.reduce((n,r)=>n+r.decodedBytes,0)};
fs.writeFileSync(path.join(qa,selected.size?'packing-sample.json':'packing.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({count:results.length,totalBytes:summary.totalBytes,totalDecodedBytes:summary.totalDecodedBytes}));

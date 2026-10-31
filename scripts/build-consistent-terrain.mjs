// Assemble ImageGen-painted materials at original camp scale, preserve the
// painted path network, then cut every runtime image from one registered floor.
// No procedural soil/noise, painted dots, colour tinting or generated geometry.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const archive='artwork-archive/consistent-terrain-v1',out='public/survival/maps/consistent-terrain-v1';
const registry=JSON.parse(fs.readFileSync(archive+'/original-registry.json'));
const {bounds,tiles}=registry,W=bounds.width,H=bounds.height,ox=-bounds.x;
const cache='/workspace/scratch/b21393be6c68/consistent-terrain-work';fs.mkdirSync(cache,{recursive:true});fs.mkdirSync(out,{recursive:true});
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
const rawImage=(data,width,height)=>sharp(data,{raw:{width,height,channels:3}});
let seed=20261014;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const floor=Buffer.alloc(W*H*3),edge=512,overlap=128,stride=edge-overlap;
const samples=[];
for(const name of ['warm','olive','brown']){
 const original=archive+'/'+name+'-generated-original.png';
 const metadata=await sharp(original).metadata();
 // These references depict exactly 650 × 600 original camp pixels; reducing
 // the native ImageGen output preserves the camp's material/character scale.
 const sample=await sharp(original).resize(650,600,{kernel:'lanczos3'}).removeAlpha().raw().toBuffer();
 samples.push(sample);await rawImage(sample,650,600).png().toFile(archive+'/'+name+'-material.png');
 console.log(name+' material '+metadata.width+'x'+metadata.height+' -> 650x600');
}
function patch(index,x,y,flip){
 const source=samples[index],p=Buffer.alloc(edge*edge*3);
 for(let j=0;j<edge;j++)for(let i=0;i<edge;i++){
  const sx=x+(flip?edge-1-i:i),si=((y+j)*650+sx)*3,di=(j*edge+i)*3;
  source.copy(p,di,si,si+3);
 }return p;
}
function cut(tile,x,y,vertical){
 const length=Math.min(edge,vertical?H-y:W-x),cost=new Float64Array(length*overlap),parent=new Int16Array(cost.length);
 for(let s=0;s<length;s++)for(let c=0;c<overlap;c++){
  const gx=x+(vertical?c:s),gy=y+(vertical?s:c),bi=(gy*W+gx)*3,ti=((vertical?s:c)*edge+(vertical?c:s))*3;
  let error=0;for(let k=0;k<3;k++)error+=(floor[bi+k]-tile[ti+k])**2;
  let best=s?cost[(s-1)*overlap+c]:0,prev=c;
  if(s)for(const n of [c-1,c+1])if(n>=0&&n<overlap&&cost[(s-1)*overlap+n]<best){best=cost[(s-1)*overlap+n];prev=n}
  cost[s*overlap+c]=best+error+Math.abs(c-overlap/2)*.05;parent[s*overlap+c]=prev;
 }
 const seam=new Int16Array(length);let c=0;
 for(let n=1;n<overlap;n++)if(cost[(length-1)*overlap+n]<cost[(length-1)*overlap+c])c=n;
 for(let s=length-1;s>=0;s--){seam[s]=c;c=parent[s*overlap+c]}return seam;
}
if(fs.existsSync(cache+'/floor.rgb'))fs.readFileSync(cache+'/floor.rgb').copy(floor);
else{
 for(let y=0;y<H;y+=stride){
  for(let x=0;x<W;x+=stride){
   const gx=x+bounds.x+edge/2,gy=y+edge/2;
   const distance=Math.max(0,-gx,gx-4800,gy-4800),variation=smooth(distance/2200);
   let best,score=Infinity;
   for(let candidate=0;candidate<5;candidate++){
    const r=random(),index=r<.65*(1-variation)+.3?0:r<.82?1:2;
    const p=patch(index,Math.floor(random()*139),Math.floor(random()*89),random()<.5);
    let error=0,n=0;
    for(let j=0;j<Math.min(edge,H-y);j+=12)for(let i=0;i<Math.min(edge,W-x);i+=12)if((x&&i<overlap)||(y&&j<overlap)){
     const a=((y+j)*W+x+i)*3,b=(j*edge+i)*3;for(let k=0;k<3;k++){error+=(floor[a+k]-p[b+k])**2;n++}
    }
    error=n?error/n:0;if(error<score){score=error;best=p}
   }
   const left=x?cut(best,x,y,true):null,top=y?cut(best,x,y,false):null;
   for(let j=0;j<Math.min(edge,H-y);j++)for(let i=0;i<Math.min(edge,W-x);i++){
    let mix=1;if(left&&i<overlap)mix=Math.min(mix,smooth((i-left[j]+2)/4));if(top&&j<overlap)mix=Math.min(mix,smooth((j-top[i]+2)/4));
    if(!mix)continue;const a=((y+j)*W+x+i)*3,b=(j*edge+i)*3;
    for(let k=0;k<3;k++)floor[a+k]=Math.round(floor[a+k]*(1-mix)+best[b+k]*mix);
   }
  }console.log('Ground material row '+y+'/'+H);
 }
 fs.writeFileSync(cache+'/floor.rgb',floor);
}
// Reconstruct the original registered artwork for path preservation only.
const old=Buffer.alloc(W*H*3),camp=await sharp('public/survival/camp-ground-v3/full-4800.webp').removeAlpha().raw().toBuffer();
for(let y=0;y<4800;y++)camp.copy(old,(y*W+ox)*3,y*4800*3,(y+1)*4800*3);
for(const t of tiles){
 const source=fs.existsSync('public'+t.image)?'public'+t.image:archive+'/retired-runtime/'+path.basename(t.image);
 const data=await sharp(source).removeAlpha().raw().toBuffer();
 for(let y=0;y<t.height;y++)for(let x=0;x<t.width;x++){
  const i=((t.y+y)*W+t.x+ox+x)*3,j=(y*t.width+x)*3;
  let alpha=1;if(t.fadeLeft&&t.westKey)alpha*=smooth(x/t.fadeLeft);
  if(t.fadeRight&&t.eastBlendKey)alpha*=smooth((t.width-1-x)/t.fadeRight);
  if(t.fadeTop&&t.northBlendKey)alpha*=smooth(y/t.fadeTop);
  if(t.fadeBottom&&t.southBlendKey)alpha*=smooth((t.height-1-y)/t.fadeBottom);
  for(let c=0;c<3;c++)old[i+c]=Math.round(old[i+c]*(1-alpha)+data[j+c]*alpha);
 }
}
// Detect the pale painted pathways, not the old floor, at overview scale.
// Bilateral ridge evidence suppresses broad ground colours and leaf specks.
const mw=Math.round(W/6),mh=Math.round(H/6),preview=await rawImage(old,W,H).resize(mw,mh).blur(1.5).raw().toBuffer();
const mask=Buffer.alloc(mw*mh),lum=new Float32Array(mw*mh);
for(let i=0;i<lum.length;i++)lum[i]=preview[i*3]*.28+preview[i*3+1]*.5+preview[i*3+2]*.22;
for(let y=16;y<mh-16;y++)for(let x=16;x<mw-16;x++){
 const i=y*mw+x,r=preview[i*3],g=preview[i*3+1],b=preview[i*3+2];
 const pale=smooth((b/Math.max(1,r)-.34)/.16)*smooth((g/Math.max(1,r)-.55)/.16);
 if(pale<.01)continue;let ridge=0;
 for(const distance of [8,13])for(const [dx,dy]of [[distance,0],[0,distance],[Math.round(distance*.7),Math.round(distance*.7)],[Math.round(distance*.7),-Math.round(distance*.7)]])ridge=Math.max(ridge,Math.min(lum[i]-lum[(y+dy)*mw+x+dx],lum[i]-lum[(y-dy)*mw+x-dx]));
 mask[i]=Math.round(255*pale*smooth((ridge-5)/13));
}
// Keep the registered route corridors, including darker dirt paths that a
// brightness detector misses. Do not carry isolated old-floor speckles over.
const distanceToSegment=(x,y,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)};
// Registered tracing of the already-built overview, including secondary
// branches that are not represented by the long-distance planning routes.
const traces=[
 [[0,429],[35,426],[80,405],[125,388],[175,404],[235,410]],
 [[0,830],[55,812],[110,767],[171,750],[207,727],[254,673]],
 [[490,931],[515,846],[548,790],[598,738],[628,701]],
 [[891,664],[948,681],[1030,666],[1120,662],[1175,647],[1235,609],[1320,586],[1390,578]],
 [[1070,70],[1100,120],[1130,174],[1127,252],[1140,297],[1170,332],[1192,400],[1206,460],[1205,520],[1185,580],[1182,620]],
 [[1130,180],[1180,155],[1258,134],[1317,115],[1355,124],[1397,142]],
 [[1191,400],[1253,372],[1320,355],[1361,357],[1396,374]],
 [[1430,69],[1425,103],[1401,146],[1400,185],[1418,235],[1430,294],[1420,335],[1401,379],[1405,431],[1428,483],[1426,530],[1404,584],[1395,656],[1397,699],[1415,754],[1412,803]],
 [[1407,174],[1455,192],[1490,200],[1545,207],[1580,234],[1623,252],[1640,277],[1664,319],[1676,368],[1678,426],[1665,476],[1648,507],[1620,548],[1608,571]],
 [[1404,587],[1444,597],[1492,586],[1550,574],[1608,553],[1660,515],[1726,483]],
 [[1606,554],[1628,580],[1640,610],[1665,646],[1670,678]],
 [[1607,554],[1588,616],[1593,672],[1616,725],[1628,781],[1648,826],[1658,864],[1642,904],[1635,931]]
].map(points=>({width:100,points:points.map(([x,y])=>[x*W/1726+bounds.x,y*H/931])}));
for(let y=0;y<mh;y++)for(let x=0;x<mw;x++){
 const gx=x*W/mw+bounds.x,gy=y*H/mh;let alpha=0;
 for(const route of traces)for(let j=1;j<route.points.length;j++){
  const d=distanceToSegment(gx,gy,route.points[j-1],route.points[j]);
  alpha=Math.max(alpha,1-smooth((d-route.width*.45-15)/70));
 }
 mask[y*mw+x]=Math.round(alpha*255);
}
// Widen around the detected centre so original path edges remain intact.
const expanded=Buffer.alloc(mask.length);
for(let y=3;y<mh-3;y++)for(let x=3;x<mw-3;x++){let v=0;for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)v=Math.max(v,mask[(y+dy)*mw+x+dx]);expanded[y*mw+x]=v}
const pathMask=await sharp(expanded,{raw:{width:mw,height:mh,channels:1}}).blur(1.2).resize(W,H).greyscale().raw().toBuffer();
if(pathMask.length!==W*H)throw new Error('Path mask must be one channel');
await sharp(expanded,{raw:{width:mw,height:mh,channels:1}}).png().toFile(archive+'/path-preservation-mask.png');
for(let i=0;i<W*H;i++){const a=pathMask[i]/255;if(!a)continue;for(let c=0;c<3;c++)floor[i*3+c]=Math.round(floor[i*3+c]*(1-a)+old[i*3+c]*a)}
// Preserve the actual camp in the contact interior. Fade outward BEFORE its
// old baked dark frame, over hundreds of pixels, with no per-tile tinting.
for(let y=0;y<4800;y++)for(let x=0;x<4800;x++){
 const a=smooth((x-60)/160)*smooth((4700-x)/330)*smooth((y-60)/160)*smooth((4700-y)/250);
 if(!a)continue;const di=(y*W+ox+x)*3,si=(y*4800+x)*3;
 for(let c=0;c<3;c++)floor[di+c]=Math.round(floor[di+c]*(1-a)+camp[si+c]*a);
}
await rawImage(floor,W,H).resize(2302,1241).png().toFile(archive+'/assembled-overview.png');
if(process.argv.includes('--preview-only'))process.exit(0);
const pieces=[];
for(const t of [...tiles].sort((a,b)=>a.image.localeCompare(b.image))){
 const file=path.basename(t.image),target=out+'/'+file;
 await rawImage(floor,W,H).extract({left:t.x+ox,top:t.y,width:t.width,height:t.height}).webp({lossless:true,effort:6}).toFile(target);
 pieces.push({oldImage:t.image,image:'/survival/maps/consistent-terrain-v1/'+file,key:t.key,x:t.x,y:t.y,width:t.width,height:t.height,bytes:fs.statSync(target).size});
 console.log('Packaged '+file);
}
fs.writeFileSync(out+'/manifest.json',JSON.stringify({version:'consistent-terrain-v1',tool:'Built-in image_gen.imagegen',scope:'All 26 post-camp terrain segments, unchanged geometry and saved placements',materials:['warm','olive','brown'].map(name=>({file:archive+'/'+name+'-generated-original.png',sourcePixels:[650,600]})),assembly:'One global material quilt at original camp scale; minimum-error joins; existing painted path pixels preserved; original camp contacts retained; lossless runtime cuts',bounds,pieces,prompts:archive+'/prompts.json'},null,2)+'\n');
console.log(JSON.stringify({pieces:pieces.length,bytes:pieces.reduce((n,p)=>n+p.bytes,0)}));

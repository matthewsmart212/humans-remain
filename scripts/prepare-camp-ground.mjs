// Register the existing image-generated soil beneath the HQ and hearth sprites.
// The source sprites and animated frames are never edited.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const folder='public/survival/camp-ground-v1';
fs.mkdirSync(folder,{recursive:true});
const {data:texture,info}=await sharp('artwork-archive/wall-ground/painted-earth.png').removeAlpha().raw().toBuffer({resolveWithObject:true});
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
const distance=(x,y,points)=>{let best=Infinity;for(let i=1;i<points.length;i++){const [ax,ay]=points[i-1],[bx,by]=points[i],dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));best=Math.min(best,Math.hypot(x-ax-t*dx,y-ay-t*dy))}return best};
const hqContact=[[138,685],[205,736],[308,770],[376,817],[635,914],[739,932],[826,900],[947,953],[1048,986],[1138,965],[1344,883],[1430,810]];
const profiles=[
 {name:'headquarters',canvas:[1536,1024],sources:['/api/asset-files/93db0d98-1245-4026-a136-6248654149f9'],distance:(x,y)=>distance(x,y,hqContact),radius:42,feather:28,shade:.16},
 {name:'hearth',canvas:[1024,1024],sources:[1,2,3].flatMap(t=>['unlit',...Array.from({length:8},(_,i)=>`flame-${i}`)].map(f=>`/survival/hearth-painted-v1/tier-${t}-${f}.webp`)),distance:(x,y)=>{
  const dx=x-512,dy=y-751,rx=479,ry=204,r=Math.hypot(dx/rx,dy/ry);
  return r<.001?-204:(r-1)/Math.hypot(dx/(rx*rx*r),dy/(ry*ry*r));
 },radius:42,feather:30,shade:.22},
];
const report=[];
for(const p of profiles){
 const pad=80,w=p.canvas[0]+pad*2,h=p.canvas[1]+pad*2,rgba=Buffer.alloc(w*h*4);let left=w,top=h,right=-1,bottom=-1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const sx=x-pad,sy=y-pad,d=p.distance(sx,sy),noise=4*Math.sin(sx*.071+Math.cos(sy*.047))+3*Math.sin(sy*.097+sx*.039),alpha=Math.round(255*smooth((p.radius+noise-d)/p.feather));if(!alpha)continue;
  const ti=((y%info.height)*info.width+x%info.width)*3,di=(y*w+x)*4,shade=1-p.shade*Math.exp(-(Math.max(0,d)**2)/(2*17*17));
  for(let c=0;c<3;c++)rgba[di+c]=Math.round(texture[ti+c]*shade);rgba[di+3]=alpha;
  left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
 }
 left-=2;top-=2;right+=2;bottom+=2;const crop={left,top,width:right-left+1,height:bottom-top+1};
 const image=`/survival/camp-ground-v1/${p.name}.webp`;
 await sharp(rgba,{raw:{width:w,height:h,channels:4}}).extract(crop).webp({quality:92,alphaQuality:100,effort:6}).toFile('public'+image);
 report.push({sources:p.sources,image,size:[crop.width,crop.height],rect:[(left-pad)/p.canvas[0],(top-pad)/p.canvas[1],crop.width/p.canvas[0],crop.height/p.canvas[1]]});
}
fs.writeFileSync('src/camp-ground-art.json',JSON.stringify(report,null,2)+'\n');
console.log(report.map(({image,size})=>({image,size,bytes:fs.statSync('public'+image).size})));

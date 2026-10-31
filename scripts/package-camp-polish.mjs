// Mechanical alpha registration and texture packaging. Painting is from ImageGen.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp'),archive='artwork-archive/camp-polish-v1',out='public/survival/camp-walls-v2';
fs.mkdirSync(out,{recursive:true});
async function alphaBounds(file){
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let left=info.width,top=info.height,right=0,bottom=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>32){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
 return{left,top,width:right-left+1,height:bottom-top+1};
}
const walls=JSON.parse(fs.readFileSync('src/wall-artwork-replacements.json')),registration=[];
for(const [i,m]of walls.entries()){
 const old=`public/survival/base-walls-hd/wall-${i+1}.webp`,source=`${archive}/wall-${i+1}-source.png`,target=await alphaBounds(old),crop=await alphaBounds(source);
 const registered=await sharp(source).extract(crop).resize(target.width,target.height,{fit:'fill'}).png().toBuffer();
 const url=`/survival/camp-walls-v2/wall-${i+1}.webp`;
 await sharp({create:{width:m.width,height:m.height,channels:4,background:'#00000000'}}).composite([{input:registered,left:target.left,top:target.top}]).webp({quality:95,alphaQuality:100,effort:6}).toFile('public'+url);
 registration.push({wall:i+1,canvas:[m.width,m.height],sourceBounds:crop,targetBounds:target});
 Object.assign(m,{url,name:`painted-oak-wall-${i+1}.webp`,bytes:fs.statSync('public'+url).size});
}
fs.writeFileSync('src/wall-artwork-replacements.json',JSON.stringify(walls,null,2)+'\n');
fs.writeFileSync(archive+'/wall-registration.json',JSON.stringify(registration,null,2)+'\n');

const profiles=JSON.parse(fs.readFileSync('src/camp-ground-profiles.json')),groundOut='public/survival/camp-foundations-v2';fs.mkdirSync(groundOut,{recursive:true});for(const f of fs.readdirSync(groundOut))if(f.endsWith('.webp'))fs.unlinkSync(groundOut+'/'+f);
const {data:texture,info}=await sharp(archive+'/earth-source.png').resize(1800,1800).removeAlpha().raw().toBuffer({resolveWithObject:true});
const distance=(x,y,paths)=>{let best=Infinity;for(const points of paths)for(let i=1;i<points.length;i++){const [ax,ay]=points[i-1],[bx,by]=points[i],dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));best=Math.min(best,Math.hypot(x-ax-t*dx,y-ay-t*dy))}return best};
const ground=[],wallGround=[];
for(const p of profiles.filter(p=>p.soilRadius)){
 const [cw,ch]=p.canvas,pad=90,w=cw+pad*2,h=ch+pad*2,paths=p.paths.map(path=>path.map(([x,y])=>[x*cw,y*ch])),rgba=Buffer.alloc(w*h*4),radius=p.soilRadius*cw;
 let left=w,top=h,right=0,bottom=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const sx=x-pad,sy=y-pad,d=distance(sx,sy,paths),t=Math.max(0,Math.min(1,(radius-d)/(radius*.85))),alpha=Math.round((p.wall?205:145)*t*t*(3-2*t));if(!alpha)continue;
  const ti=((y%info.height)*info.width+x%info.width)*3,di=(y*w+x)*4;
  rgba[di]=texture[ti];rgba[di+1]=texture[ti+1];rgba[di+2]=texture[ti+2];rgba[di+3]=alpha;
  left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
 }
 left-=2;top-=2;right+=2;bottom+=2;const crop={left,top,width:right-left+1,height:bottom-top+1},image=`/survival/camp-foundations-v2/${p.name}.webp`;
 await sharp(rgba,{raw:{width:w,height:h,channels:4}}).extract(crop).webp({quality:93,alphaQuality:100,effort:6}).toFile('public'+image);
 const g={image,size:[crop.width,crop.height],rect:[(left-pad)/cw,(top-pad)/ch,crop.width/cw,crop.height/ch]};
 ground.push({sources:p.sources,...g});if(p.wall)wallGround[p.wall-1]=g;
}
const retained=JSON.parse(fs.readFileSync('src/camp-ground-art.json')).filter(g=>!g.image.startsWith('/survival/camp-foundations-v2/')&&!profiles.some(n=>n.sources.some(s=>g.sources.includes(s))));
fs.writeFileSync('src/camp-ground-art.json',JSON.stringify([...retained,...ground],null,2)+'\n');
fs.writeFileSync('src/wall-ground-art.json',JSON.stringify(wallGround,null,2)+'\n');
console.log(`Packaged ${walls.length} registered wall repaints and ${ground.length} foundation transitions.`);

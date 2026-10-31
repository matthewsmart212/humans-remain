// Technical water stencils and one exact composited reference for the batch join.
// Reuses all approved paintings and the pilot frame atlas without repainting them.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),sharp=require('sharp');
const sections=JSON.parse(fs.readFileSync('src/waterfall-sections.json','utf8'));
const out='public/survival/waterfalls-v1',qa='docs/qa/waterfalls-v1';
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(qa,{recursive:true});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'waterfall-reference-'));
const original={fetch:globalThis.fetch,window:globalThis.window,type:process.type};
let composite;
try{
 await build({stdin:{contents:"export * from './src/world-assets';export * from './src/skia-web';export * from './src/survival-engine';export * from './src/world-layout';export * from './src/east-approach';export * from './src/river-art';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=require(path.join(temp,'model.cjs')),s=m.EAST_TERRAIN_SCALE;
 delete globalThis.CanvasKit;globalThis.window={};process.type='renderer';globalThis.devicePixelRatio=1;
 globalThis.fetch=async url=>String(url).startsWith('blob:')?original.fetch(url):new Response(fs.readFileSync(path.resolve('public'+String(url))));
 let surface;const p=sections.find(p=>p.reference),[x,y,width,height]=p.crop,sx=2048/1070,sy=2816/1470;
 const b={x:-6256+x*sx,y:-6200+y*sy,width:width*sx,height:height*sy};
 const canvas={width:0,height:0,clientWidth:width,clientHeight:height,dataset:{}};
 const renderer=await m.createWebWorld(canvas,(ctx,atlas,imgs)=>{
  ctx.riverTime=0;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.scale(canvas.width/b.width/s,canvas.height/b.height/s);ctx.translate((600-b.x)*s,(600-b.y)*s);
  m.drawRiverTerrain(ctx,imgs,{x:(b.x-600)*s,y:(b.y-600)*s,width:b.width*s,height:b.height*s});ctx.restore();
 },{},{sources:{...m.RIVER_DETAIL_IMAGES,riverFoam:m.RIVER_MOTION_IMAGES.riverFoam},streamRoads:false,streamRivers:false});
 globalThis.CanvasKit.MakeSWCanvasSurface=c=>(surface=globalThis.CanvasKit.MakeSurface(c.width,c.height));
 renderer.draw(m.createWorld(m.emptyLayout()));const image=surface.makeImageSnapshot();composite=Buffer.from(image.encodeToBytes());image.delete();renderer.dispose();
 await sharp(composite).webp({quality:97,effort:6}).toFile(out+'/pool-entry-artwork.webp');
}finally{globalThis.fetch=original.fetch;globalThis.window=original.window;process.type=original.type;fs.rmSync(temp,{recursive:true,force:true})}
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t)};
function distance(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)}
function region(x,y,poly){let inside=false,edge=Infinity;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;edge=Math.min(edge,distance([x,y],a,b))}return {inside,edge}}
const report=[];
for(const p of sections){
 const [left,top,width,height]=p.crop;
 const source=p.reference?composite:await sharp(`artwork-archive/river-${p.batch?'logging':'headwaters'}-v1/master.png`).extract({left,top,width,height}).png().toBuffer();
 await sharp(source).png().toFile(`${qa}/${p.id}-reference.png`);
 const {data,info}=await sharp(source).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const pixels=Buffer.alloc(width*height*3);let active=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const n=(y*width+x)*info.channels,[r,g,b]=data.subarray(n,n+3);
  const blue=smooth(2,14,b-r)*smooth(0,8,g-r),white=smooth(208,238,Math.min(r,g,b))*smooth(-8,1,b-r);
  const coverage=Math.max(...p.polygons.map(poly=>{const a=region(x+.5,y+.5,poly);return a.inside?smooth(0,10,a.edge):0}));
  const protection=p.exclude.reduce((v,poly)=>{const a=region(x+.5,y+.5,poly);return v*(a.inside?0:smooth(0,4,a.edge))},1);
  const value=Math.round(255*coverage*protection*Math.max(blue,white));
  pixels.fill(value,(y*width+x)*3,(y*width+x+1)*3);if(value)active++;
 }
 await sharp(pixels,{raw:{width,height,channels:3}}).png().toFile(`${out}/${p.id}-mask.png`);
 report.push({id:p.id,activePixels:active,maskBytes:fs.statSync(`${out}/${p.id}-mask.png`).size});
}
fs.writeFileSync(qa+'/assets.json',JSON.stringify({sections:report,addedAssetBytes:fs.readdirSync(out).reduce((n,f)=>n+fs.statSync(out+'/'+f).size,0),reusedFrames:12},null,2)+'\n');console.log(report);

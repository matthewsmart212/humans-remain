// Technical colour stencils only. Water motion reuses the approved frame atlas
// and samples existing streamed tiles; no duplicate paintings or baked foliage.
import fs from 'node:fs';import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const tiles=JSON.parse(fs.readFileSync('src/river-extension-sections.json','utf8'));
const batches=JSON.parse(fs.readFileSync('src/river-extension-layout.json','utf8'));
const result=[],dir='public/survival/river-extension-motion-v1';fs.mkdirSync(dir,{recursive:true});
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t)};
for(const tile of tiles){
 const batch=batches[tile.batch-2],W=tile.nativeWidth,H=tile.masterHeight,sx=batch.source.width/W,sy=batch.source.height/H;
 // Own non-overlapping motion windows, inside this tile's available pixels.
 const top=Math.max(tile.nativeTop,Math.ceil(batch.topFade/sy)),next=tiles.find(t=>t.batch===tile.batch&&t.nativeTop>tile.nativeTop);
 const bottom=next?next.nativeTop:H-Math.ceil(96/sy),height=bottom-top;
 if(height<20)continue;
 const {data,info}=await sharp(`artwork-archive/${batch.id}/master.png`).extract({left:0,top,width:W,height}).removeAlpha().raw().toBuffer({resolveWithObject:true});
 let lo=W,hi=0;
 for(let y=0;y<height;y++)for(let x=0;x<W;x++){const n=(y*W+x)*info.channels,[r,g,b]=data.subarray(n,n+3);if(b-r>12&&g-r>5){lo=Math.min(lo,x);hi=Math.max(hi,x)}}
 if(lo>=hi)continue;lo=Math.max(0,lo-8);hi=Math.min(W-1,hi+8);const width=hi-lo+1,pixels=Buffer.alloc(width*height*3);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const n=(y*W+x+lo)*info.channels,[r,g,b]=data.subarray(n,n+3);
  const blue=smooth(3,16,b-r)*smooth(0,9,g-r),white=smooth(208,238,Math.min(r,g,b))*smooth(0,5,b-r);
  const edge=smooth(0,9,Math.min(x,width-1-x,y,height-1-y));
  pixels.fill(Math.round(255*Math.max(blue,white)*edge),(y*width+x)*3,(y*width+x+1)*3);
 }
 const id=tile.key+'Flow';await sharp(pixels,{raw:{width,height,channels:3}}).png().toFile(`${dir}/${id}-mask.png`);
 const middleY=batch.source.y+(top+height/2)*sy;let a=batch.points[0],b=batch.points[1];
 for(let i=1;i<batch.points.length;i++)if(middleY>=batch.points[i-1][1]){a=batch.points[i-1];b=batch.points[i]}
 const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
 result.push({id,name:tile.name+' rapids',tile:tile.key,batch:tile.batch,masterWidth:W,masterHeight:H,crop:[lo,top,width,height],tileTop:tile.nativeTop,tileHeight:tile.nativeHeight,direction:[dx/len,dy/len],phase:tile.batch*.17+tile.nativeTop/H,maskPath:`/survival/river-extension-motion-v1/${id}-mask.png`});
}
fs.writeFileSync('src/river-extension-waterfalls.json',JSON.stringify(result,null,2)+'\n');console.log({animatedReaches:result.length,sharedFrames:12});

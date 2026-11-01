// Transfer the ImageGen-developed wood palette onto the original pixels.
// No resampling, redrawing, crop, alpha, registration or geometry changes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
function dependency(name){try{return require(name)}catch(e){if(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES)return require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,name));throw e}}
const sharp=dependency('sharp'),{createCanvas,loadImage}=dependency('@napi-rs/canvas');
const archive=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(archive,'../..');
const originals=JSON.parse(fs.readFileSync(path.join(archive,'original-art.json')));
const protection=JSON.parse(fs.readFileSync(path.join(archive,'material-protection.json')));
const output=path.join(repo,'public/survival/camp-circular-wall-weathered-v1');
const previews=path.join(archive,'previews');
fs.mkdirSync(output,{recursive:true});fs.mkdirSync(previews,{recursive:true});
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
const treatment={luma:[.299,.587,.114],brightness:.9,chroma:.45,woodHueFullUntil:.105,woodHueProtectedFrom:.13,saturationProtectedUntil:.2,saturationFullFrom:.42};
const report={version:1,sourceCommit:'c21df182c128d4f15094b4c7b712ddb8e8c4a7e5',method:'ImageGen colour reference; selective colour transfer to original pixels with hand-traced material protection. No regenerated geometry is used in game.',treatment,assets:[]};
const sheet=createCanvas(1920,2240),sc=sheet.getContext('2d');sc.fillStyle='#26302b';sc.fillRect(0,0,sheet.width,sheet.height);
const maskSheet=createCanvas(1920,2240),mc=maskSheet.getContext('2d');mc.fillStyle='#26302b';mc.fillRect(0,0,maskSheet.width,maskSheet.height);
for(let index=0;index<originals.length;index++){
 const a=originals[index],id=a.id.slice(-2),input=path.join(repo,'public'+a.image),originalFile=fs.readFileSync(input);
 const {data,info}=await sharp(originalFile).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.deepEqual([info.width,info.height],a.size);assert.equal(info.channels,4);
 const guard=createCanvas(info.width,info.height),gc=guard.getContext('2d');gc.fillStyle='#fff';
 for(const points of protection[id].polygons){gc.beginPath();points.forEach(([x,y],i)=>i?gc.lineTo(x,y):gc.moveTo(x,y));gc.closePath();gc.fill();}
 for(const [x,y,r] of protection[id].circles||[]){gc.beginPath();gc.arc(x,y,r,0,Math.PI*2);gc.fill();}
 const protectedPixels=gc.getImageData(0,0,info.width,info.height).data;
 const edited=Buffer.from(data),mask=Buffer.alloc(info.width*info.height*4),beforeAlpha=Buffer.alloc(info.width*info.height),afterAlpha=Buffer.alloc(info.width*info.height);
 let changed=0,protectedCount=0,protectedChanges=0,greenChanges=0,alphaChanges=0;
 for(let i=0;i<data.length;i+=4){
  const r=data[i],g=data[i+1],b=data[i+2],alpha=data[i+3],hi=Math.max(r,g,b),lo=Math.min(r,g,b),delta=hi-lo;
  let hue=0;if(delta){hue=hi===r?((g-b)/delta+(g<b?6:0))/6:hi===g?((b-r)/delta+2)/6:((r-g)/delta+4)/6}
  const saturation=hi?delta/hi:0,guarded=protectedPixels[i+3]>0;
  const weight=alpha&&!guarded?(1-smooth(treatment.woodHueFullUntil,treatment.woodHueProtectedFrom,hue))*smooth(treatment.saturationProtectedUntil,treatment.saturationFullFrom,saturation):0;
  if(weight>0){const luma=r*treatment.luma[0]+g*treatment.luma[1]+b*treatment.luma[2];for(let c=0;c<3;c++){const graded=(luma+(data[i+c]-luma)*treatment.chroma)*treatment.brightness;edited[i+c]=Math.round(clamp(data[i+c]+(graded-data[i+c])*weight,0,255));}}
  const differs=edited[i]!==r||edited[i+1]!==g||edited[i+2]!==b;
  if(differs)changed++;if(guarded&&alpha){protectedCount++;if(differs)protectedChanges++;}if(hue>=treatment.woodHueProtectedFrom&&differs)greenChanges++;
  beforeAlpha[i/4]=alpha;afterAlpha[i/4]=edited[i+3];if(alpha!==edited[i+3])alphaChanges++;
  mask[i]=differs?240:r;mask[i+1]=differs?80:g;mask[i+2]=differs?130:b;mask[i+3]=alpha;
 }
 assert.equal(alphaChanges,0);assert.equal(protectedChanges,0);assert.equal(greenChanges,0);assert(changed>1000);
 const png=await sharp(edited,{raw:info}).png().toBuffer();
 const webp=await sharp(edited,{raw:info}).webp({lossless:true,effort:6,alphaQuality:100}).toBuffer();
 const decoded=await sharp(webp).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(decoded.info.width,info.width);assert.equal(decoded.info.height,info.height);
 for(let i=0;i<edited.length;i+=4){assert.equal(decoded.data[i+3],data[i+3]);if(data[i+3])for(let c=0;c<3;c++)assert.equal(decoded.data[i+c],edited[i+c]);}
 fs.writeFileSync(path.join(output,'wall-'+id+'.png'),png);fs.writeFileSync(path.join(output,'wall-'+id+'.webp'),webp);
 const overlay=await sharp(mask,{raw:info}).png().toBuffer();
 const x=(index%4)*480,y=Math.floor(index/4)*560,k=Math.min(450/info.width,505/info.height);
 for(const [ctx,bytes] of [[sc,png],[mc,overlay]]){ctx.drawImage(await loadImage(bytes),x+(480-info.width*k)/2,y+14+(505-info.height*k)/2,info.width*k,info.height*k);ctx.fillStyle='#eee4cf';ctx.font='22px sans-serif';ctx.textAlign='center';ctx.fillText(id+' · '+info.width+' × '+info.height,x+240,y+545);}
 report.assets.push({id:a.id,sourceImage:a.image,image:'/survival/camp-circular-wall-weathered-v1/wall-'+id+'.webp',size:a.size,sourceSha256:sha256(originalFile),pngSha256:sha256(png),webpSha256:sha256(webp),originalAlphaSha256:sha256(beforeAlpha),outputAlphaSha256:sha256(afterAlpha),changedWoodPixels:changed,protectedMaterialPixels:protectedCount,protectedPixelChanges:protectedChanges,greenPixelChanges:greenChanges,alphaPixelChanges:alphaChanges,losslessWebpVerified:true,webpBytes:webp.length});
 console.log(JSON.stringify({piece:id,changed,protectedChanges,alphaChanges,bytes:webp.length}));
}
fs.writeFileSync(path.join(previews,'contact-sheet.jpg'),sheet.toBuffer('image/jpeg',94));
fs.writeFileSync(path.join(previews,'colour-change-mask.jpg'),maskSheet.toBuffer('image/jpeg',94));
report.totalRuntimeBytes=report.assets.reduce((sum,a)=>sum+a.webpBytes,0);
fs.writeFileSync(path.join(archive,'verification.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify({version:1,description:'Weathered wood recolour of the exact installed 16-part camp wall. Shapes, sizes, alpha, placements and collision remain unchanged.',runtimeMetadata:'src/camp-circular-wall-art.json',authoringArchive:'artwork-archive/circular-wall-weathered-v1',assets:report.assets.map(({id,image,size,pngSha256,webpSha256})=>({id,image,size,pngSha256,webpSha256}))},null,2)+'\n');
console.log(JSON.stringify({complete:true,pieces:report.assets.length,totalRuntimeBytes:report.totalRuntimeBytes}));

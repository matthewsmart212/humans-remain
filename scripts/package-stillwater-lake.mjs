// Repackage one registered imagegen repaint without rebuilding geography.
// Existing chunk cores/gutters, image keys, masks and world coordinates stay fixed.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require('sharp');
const work='.qa/stillwater-polish/source',out='public/survival/stillwater-lake-v2',url='/survival/stillwater-lake-v2/';
const spec=JSON.parse(fs.readFileSync('src/stillwater-lake-paint.json'));
const manifestFile='src/river-detail-manifest.json',baselineFile=work+'/river-detail-before.json';
fs.mkdirSync(work,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(manifestFile)),batch=manifest.batches.find(b=>b.batch===spec.batch);
// Always start from the preserved v5 originals, including in a fresh checkout
// after v2 ships. A cached .qa manifest must never become the repaint baseline.
for(const p of manifest.patches)if(p.batch===spec.batch)p.image='/survival/river-detail-v5/'+path.basename(p.image);
for(const p of manifest.sections)if(p.key.startsWith('riverExtension2_'))for(const key of ['image','preview'])p[key]='/survival/river-detail-v5/'+path.basename(p[key]);
fs.writeFileSync(baselineFile,JSON.stringify(manifest)+'\n');
const source=JSON.parse(fs.readFileSync('src/river-extension-layout.json'))[spec.batch-2].source;
const bridges=JSON.parse(fs.readFileSync('src/river-bridges.json')).filter(b=>spec.protectedBridges.includes(b.id));
const sections=JSON.parse(fs.readFileSync('src/river-extension-sections.json')).filter(p=>p.batch===spec.batch);
const git=path.resolve(execFileSync('git',['rev-parse','--git-common-dir'],{encoding:'utf8'}).trim());
const checksum=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function hydrate(file){
 const bytes=fs.readFileSync(file);if(!bytes.subarray(0,50).toString().startsWith('version https://git-lfs.github.com/spec/v1'))return bytes;
 const pointer=bytes.toString(),oid=/oid sha256:([a-f0-9]{64})/.exec(pointer)?.[1],size=Number(/size (\d+)/.exec(pointer)?.[1]);
 assert(oid,'Recognized LFS pointer '+file);
 const object=path.join(git,'lfs','objects',oid.slice(0,2),oid.slice(2,4),oid);
 assert(fs.existsSync(object),'Fetch the preserved batch4 v5 LFS originals first; see artwork-archive/stillwater-lake-v2/README.md: '+file);
 const data=fs.readFileSync(object);
 assert.equal(data.length,size,'Verified LFS object size '+file);assert.equal(checksum(data),oid,'Verified LFS object SHA '+file);fs.writeFileSync(file,data);return data;
}
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
function amount(x,y){
 const [cx,cy,cw,ch]=spec.crop;let a=smooth(0,spec.edgeFade,Math.min(x-cx,y-cy,cx+cw-x,cy+ch-y));if(!a)return 0;
 for(const {bounds:[rx,ry,rw,rh],feather}of spec.protectedRects)a*=smooth(0,feather,Math.hypot(Math.max(rx-x,0,x-rx-rw),Math.max(ry-y,0,y-ry-rh)));
 const sx=source.x+x/batch.width*source.width,sy=source.y+y/batch.height*source.height;
 for(const b of bridges){const [ax,ay]=b.from,[bx,by]=b.to,dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((sx-ax)*dx+(sy-ay)*dy)/(dx*dx+dy*dy)));a*=smooth(b.width+spec.bridgeExtraRadius,b.width+spec.bridgeExtraRadius+spec.bridgeFeather,Math.hypot(sx-ax-t*dx,sy-ay-t*dy))}
 return a;
}
const raw={width:batch.width,height:batch.height,channels:3};
const masterFile=work+'/lower-master-before.png';
{
 const layers=[];
 for(const p of manifest.patches.filter(p=>p.batch===spec.batch)){
  const [x,y]=p.key.split('_').slice(1).map(Number),width=Math.min(512,batch.width-x),height=Math.min(512,batch.height-y);
  // Explicit PNG avoids Sharp's default of re-encoding a WebP crop lossily.
  layers.push({input:await sharp(hydrate('public'+p.image)).extract({left:x?8:0,top:y?8:0,width,height}).png().toBuffer(),left:x,top:y});
 }
 await sharp({create:{...raw,background:'#000000'}}).composite(layers).png().toFile(masterFile);
}
const [left,top,width,height]=spec.crop;
await sharp(masterFile).extract({left,top,width,height}).png().toFile(work+'/lake-reference.png');
const input=process.argv.find(a=>a.startsWith('--input='))?.slice(8);
if(!input){console.log(JSON.stringify({prepared:true,master:masterFile,reference:work+'/lake-reference.png',crop:spec.crop}));process.exit(0)}
const original=await sharp(masterFile).removeAlpha().raw().toBuffer();
let exactSourceCores=0;
for(const p of manifest.patches.filter(p=>p.batch===spec.batch)){
 const [x,y]=p.key.split('_').slice(1).map(Number),w=Math.min(512,batch.width-x),h=Math.min(512,batch.height-y);
 const sourcePixels=await sharp('public'+p.image).extract({left:x?8:0,top:y?8:0,width:w,height:h}).removeAlpha().raw().toBuffer();
 const reconstructed=await sharp(original,{raw}).extract({left:x,top:y,width:w,height:h}).raw().toBuffer();
 assert(sourcePixels.equals(reconstructed),'Exact source core '+p.key);exactSourceCores++;
}
let generated=await sharp(input).removeAlpha().resize(width,height,{fit:'fill',kernel:'lanczos3'}).raw().toBuffer();
// Removing the old rock faces opened a narrow olive band beyond the original
// eastern water edge. Pull only that nearby bank's existing paint a little
// inward, keeping the entry visibly grounded without inventing dry geometry.
const water=new Uint8Array(width*height),visited=new Uint8Array(width*height),queue=new Int32Array(width*height);
for(let i=0;i<water.length;i++){const n=i*3;water[i]=Number(generated[n+1]-generated[n]>1&&generated[n+2]-generated[n]>-25)}
const seed=Math.floor(height*.5)*width+Math.floor(width*.55);assert(water[seed],'A deep lake sample anchors the material registration');
queue[0]=seed;visited[seed]=1;let head=0,tail=1;
while(head<tail){const id=queue[head++],x=id%width;for(const next of [x?id-1:-1,x+1<width?id+1:-1,id-width,id+width])if(next>=0&&next<water.length&&water[next]&&!visited[next]){visited[next]=1;queue[tail++]=next}}
const side=JSON.parse(fs.readFileSync('src/river-side-water-masks.json')).find(p=>p.id==='lower-lake'),oldEdge=new Float32Array(height),shift=new Float32Array(height);
for(let y=400;y<Math.min(height,1080);y++){
 const row=side.rows[Math.floor((top+y)/batch.height*source.height/side.step)];if(!row?.length)continue;
 const boundary=Math.max(...row.map(span=>span[1]))*side.step/source.width*batch.width-left;oldEdge[y]=boundary;
 let edge=-1;for(let x=width-1;x>=0;x--)if(visited[y*width+x]){edge=x;break}
 if(edge>=0)shift[y]=Math.max(0,Math.min(45,edge-boundary-12));
}
const registered=Buffer.from(generated);let maximumBankSampleShift=0;
for(let y=440;y<Math.min(height,1050);y++){
 let sum=0,weight=0;for(let dy=-8;dy<=8;dy++){const w=Math.exp(-dy*dy/32);sum+=shift[y+dy]*w;weight+=w}
 const delta=sum/weight*smooth(440,520,y)*(1-smooth(950,1050,y));if(!delta||!oldEdge[y])continue;
 for(let x=0;x<width;x++){
  const displacement=delta*(1-smooth(0,220,Math.abs(x-oldEdge[y])));maximumBankSampleShift=Math.max(maximumBankSampleShift,displacement);
  if(!displacement)continue;const sx=Math.min(width-1,x+displacement),a=Math.floor(sx),b=Math.min(width-1,a+1),t=sx-a,n=(y*width+x)*3;
  for(let c=0;c<3;c++)registered[n+c]=Math.round(generated[(y*width+a)*3+c]*(1-t)+generated[(y*width+b)*3+c]*t);
 }
}
generated=registered;
const pixels=Buffer.from(original),mask=Buffer.alloc(batch.width*batch.height);
let changed=0,protectedPixels=0,protectedChanged=0;
for(let y=0;y<batch.height;y++)for(let x=0;x<batch.width;x++){
 const i=y*batch.width+x,a=amount(x,y);mask[i]=Math.round(a*255);
 if(a){const n=((y-top)*width+x-left)*3;for(let c=0;c<3;c++)pixels[i*3+c]=Math.round(original[i*3+c]*(1-a)+generated[n+c]*a)}
 const differs=pixels[i*3]!==original[i*3]||pixels[i*3+1]!==original[i*3+1]||pixels[i*3+2]!==original[i*3+2];
 if(differs)changed++;if(!a){protectedPixels++;if(differs)protectedChanged++}
}
assert(changed>300000,'The new lake is a substantial material repaint');assert.equal(protectedChanged,0,'Protected and unrelated pixels are identical');
fs.mkdirSync(out,{recursive:true});
await sharp(pixels,{raw}).png().toFile(work+'/lower-master-after.png');
await sharp(mask,{raw:{width:batch.width,height:batch.height,channels:1}}).png().toFile(work+'/edit-scope-mask.png');
const redirects={},exports=[];
for(const p of manifest.patches.filter(p=>p.batch===spec.batch)){
 const sx=Math.round((p.sample.x-source.x)/source.width*batch.width),sy=Math.round((p.sample.y-source.y)/source.height*batch.height),sw=Math.round(p.sample.width/source.width*batch.width),sh=Math.round(p.sample.height/source.height*batch.height);
 let different=false;
 for(let y=sy;y<sy+sh&&!different;y++)for(let x=sx;x<sx+sw;x++){const n=(y*batch.width+x)*3;if(pixels[n]!==original[n]||pixels[n+1]!==original[n+1]||pixels[n+2]!==original[n+2]){different=true;break}}
 if(!different)continue;
 const old=p.image,file=p.key+'.webp';await sharp(pixels,{raw}).extract({left:sx,top:sy,width:sw,height:sh}).webp({lossless:true,effort:5}).toFile(out+'/'+file);
 const encoded=await sharp(out+'/'+file).removeAlpha().raw().toBuffer(),expected=await sharp(pixels,{raw}).extract({left:sx,top:sy,width:sw,height:sh}).raw().toBuffer();
 assert(encoded.equals(expected),'Lossless source/gutter export '+p.key);
 p.image=url+file;redirects[old]=p.image;exports.push({key:p.key,image:p.image,kind:'detail',width:sw,height:sh});
}
for(const section of sections){
 const record=manifest.sections.find(p=>p.key===section.key),sy=Math.round(section.sourceY/source.height*batch.height),sh=Math.min(batch.height-sy,Math.round(section.height/source.height*batch.height));
 const sectionMask=await sharp(mask,{raw:{width:batch.width,height:batch.height,channels:1}}).extract({left:0,top:sy,width:batch.width,height:sh}).raw().toBuffer();
 if(!sectionMask.some(v=>v))continue;
 for(const kind of ['image','preview']){
  const old=record[kind],before=await sharp(hydrate('public'+old)).removeAlpha().raw().toBuffer({resolveWithObject:true}),w=before.info.width,h=before.info.height;
  const proposed=await sharp(pixels,{raw}).extract({left:0,top:sy,width:batch.width,height:sh}).resize(w,h,{kernel:'lanczos3'}).raw().toBuffer();
  const weights=await sharp(sectionMask,{raw:{width:batch.width,height:sh,channels:1}}).resize(w,h,{kernel:'nearest'}).raw().toBuffer();
  // Decode the existing LOD and preserve its exact pixels wherever this edit
  // has zero coverage, rather than re-encoding an unrelated reach from scratch.
  const final=Buffer.from(before.data);for(let i=0;i<w*h;i++)if(weights[i])for(let c=0;c<3;c++)final[i*3+c]=proposed[i*3+c];
  const file=path.basename(old);await sharp(final,{raw:{width:w,height:h,channels:3}}).webp({lossless:true,effort:5}).toFile(out+'/'+file);
  record[kind]=url+file;redirects[old]=record[kind];exports.push({key:section.key+(kind==='preview'?'Preview':''),image:record[kind],kind:kind==='preview'?'preview':'medium',width:w,height:h});
 }
}
fs.writeFileSync(manifestFile,JSON.stringify(manifest)+'\n');
const redirectFile='server/river-quality-redirects.json',existing=JSON.parse(fs.readFileSync(redirectFile));
for(const key of Object.keys(existing)){
 if(key.startsWith('/survival/river-detail-v5/')&&existing[key].startsWith(url)){delete existing[key];continue}
 if(existing[key].startsWith(url))existing[key]='/survival/river-detail-v5/'+path.basename(existing[key]);
}
for(const key of Object.keys(existing))existing[key]=redirects[existing[key]]??existing[key];
fs.writeFileSync(redirectFile,JSON.stringify({...existing,...redirects},null,2)+'\n');
const nativeFile='native/bundled-art.ts';let bundled=fs.readFileSync(nativeFile,'utf8').replace(/\/survival\/stillwater-lake-v2\/((?:riverHD4_|river-lower-pools-v1-)[^"\s]+\.webp)/g,'/survival/river-detail-v5/$1');
for(const [old,replacement]of Object.entries(redirects))bundled=bundled.split(old).join(replacement);
fs.writeFileSync(nativeFile,bundled);
const attrsFile='.gitattributes',attrs=fs.readFileSync(attrsFile,'utf8'),rules='\n# Registered Stillwater lake repaint is directly available on web and iOS.\n/public/survival/stillwater-lake-v2/*.webp -filter -diff -merge -text\n/artwork-archive/stillwater-lake-v2/*.png -filter -diff -merge -text\n/docs/qa/stillwater-lake-v2/*.webp -filter -diff -merge -text\n';
if(!attrs.includes('/public/survival/stillwater-lake-v2/*.webp'))fs.appendFileSync(attrsFile,rules);
const archive='artwork-archive/stillwater-lake-v2';fs.mkdirSync(archive,{recursive:true});if(path.resolve(input)!==path.resolve(archive+'/lake-repaint.png'))fs.copyFileSync(input,archive+'/lake-repaint.png');
const prompt=path.join(path.dirname(input),'lake-repaint-prompt.txt');if(fs.existsSync(prompt))fs.copyFileSync(prompt,archive+'/prompt.txt');
const geometryFiles=['src/river-water-mask.json','src/river-logging-water-mask.json','src/river-extension-water-masks.json','src/river-side-water-masks.json','src/river-layout.ts','src/river-extension-layout.json','src/river-bridges.json'];
const preservedGeometry=Object.fromEntries(geometryFiles.map(file=>[file,checksum(fs.readFileSync(file))]));
const originals=manifest.patches.filter(p=>p.batch===spec.batch).map(p=>({key:p.key,image:'/survival/river-detail-v5/'+path.basename(p.image),sample:p.sample}));
fs.writeFileSync(archive+'/source.json',JSON.stringify({batch:spec.batch,masterSize:[batch.width,batch.height],crop:spec.crop,originals},null,2)+'\n');
const report={result:'pass',sourceInput:input,inputSha256:checksum(fs.readFileSync(input)),masterSize:[batch.width,batch.height],crop:spec.crop,exactSourceCores,losslessSamplesVerified:true,changedPixels:changed,protectedPixels,protectedChanged,maximumBankSampleShift,chunkGutters:8,collisionMasksChanged:false,layoutChanged:false,preservedGeometry,exports};
fs.writeFileSync(work+'/packaging-report.json',JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(archive+'/packaging.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));

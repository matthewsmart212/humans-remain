// Mechanical alpha registration, encoding and placement metadata. Original artwork is preserved.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),sharp=require('sharp');
const {createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas');
const kit=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(kit,'../..');
const geometry=JSON.parse(fs.readFileSync(path.join(kit,'geometry/manifest.json'),'utf8'));
const original=JSON.parse(fs.readFileSync(path.join(repo,'public/survival/camp-circular-wall-v1/manifest.json'),'utf8'));
const intact=new Set(['wall-01','wall-04','wall-05','wall-13','wall-16']);
const out=path.join(repo,'public/survival/camp-circular-wall-install-v1'),previews=path.join(kit,'previews');
const alphaThreshold=16,scale=1.4,trimPadding=20,partial=process.argv.includes('--partial');
const relative=p=>path.relative(repo,p).split(path.sep).join('/');
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(previews,{recursive:true});
const font=path.join(repo,'public/fonts/barlow-condensed-black.ttf');if(fs.existsSync(font))GlobalFonts.registerFromPath(font,'Barlow Condensed');
function alphaInspection(data,width,height){
 let left=width,top=height,right=-1,bottom=-1,min=255,max=0,transparent=0,opaque=0,antialiased=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const a=data[(y*width+x)*4+3];min=Math.min(min,a);max=Math.max(max,a);
  if(a===0)transparent++;else if(a===255)opaque++;else antialiased++;
  if(a>alphaThreshold){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y)}
 }
 return{min,max,transparentPixels:transparent,opaquePixels:opaque,antialiasedPixels:antialiased,transparentFraction:transparent/(width*height),bbox:right<0?null:{left,top,width:right-left+1,height:bottom-top+1}};
}
// Select a bounding rectangle only; preserve every original pixel inside that rectangle.
// Tiny disconnected ImageGen specks must not stretch the main wall to fit the guide.
function connectedAlphaBounds(data,width,height,fullBBox){
 const visited=new Uint8Array(width*height),queue=new Int32Array(width*height),components=[];
 let totalForeground=0,largest=null;
 for(let seed=0;seed<visited.length;seed++){
  if(visited[seed]||data[seed*4+3]<=alphaThreshold)continue;
  visited[seed]=1;queue[0]=seed;let head=0,tail=1,left=width,top=height,right=-1,bottom=-1;
  while(head<tail){
   const p=queue[head++],x=p%width,y=Math.floor(p/width);
   left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    if(dx===0&&dy===0)continue;const nx=x+dx,ny=y+dy;
    if(nx<0||nx>=width||ny<0||ny>=height)continue;
    const q=ny*width+nx;if(!visited[q]&&data[q*4+3]>alphaThreshold){visited[q]=1;queue[tail++]=q}
   }
  }
  const component={pixelCount:tail,bbox:{left,top,width:right-left+1,height:bottom-top+1}};
  components.push(component);totalForeground+=tail;
  if(!largest||component.pixelCount>largest.pixelCount)largest=component;
 }
 assert(largest,'No foreground alpha component found.');
 const dominantFraction=largest.pixelCount/totalForeground,dominates=dominantFraction>=.99;
 const selectedBBox=dominates?largest.bbox:fullBBox;
 let excludedForegroundPixels=0;
 if(dominates)for(let y=0;y<height;y++)for(let x=0;x<width;x++)if((x<selectedBBox.left||x>=selectedBBox.left+selectedBBox.width||y<selectedBBox.top||y>=selectedBBox.top+selectedBBox.height)&&data[(y*width+x)*4+3]>alphaThreshold)excludedForegroundPixels++;
 return{connectivity:8,alphaThreshold,componentCount:components.length,totalForegroundPixels:totalForeground,originalFullAlphaBBox:fullBBox,largestComponent:largest,largestComponentFraction:dominantFraction,dominanceRequired:.99,selectedBBox,selection:dominates?'largest-component-bounding-rectangle':'full-alpha-bounds-pending-review',excludedForegroundPixels,detachedComponentPixels:totalForeground-largest.pixelCount,requiresHumanReview:!dominates,largestOtherComponents:components.filter(c=>c!==largest).sort((a,b)=>b.pixelCount-a.pixelCount).slice(0,12),note:'Only the mechanical extraction rectangle changes. All original pixels inside it, including detached details, are retained; source files remain untouched.'};
}
const report={version:1,generatedAt:new Date().toISOString(),pixelsPerWorldUnit:scale,registrations:[],warnings:[],missing:[],originalsUnmodified:true};
const packaged=[];
for(const s of geometry.sectors){
 if(intact.has(s.id)){
  const old=original.assets.find(a=>a.id===s.id);assert(old,'Missing intact asset '+s.id);
  packaged.push({...old,geometry:s,pngPath:'public/survival/camp-circular-wall-v1/'+old.png,image:'/survival/camp-circular-wall-v1/'+old.webp,reusedOriginal:true});continue;
 }
 const file=path.join(kit,'generated',s.id+'.png');
 if(!fs.existsSync(file)){report.missing.push(s.id);continue;}
 const source=fs.readFileSync(file),metadata=await sharp(source).metadata();assert(metadata.hasAlpha,s.id+' lacks alpha');
 const raw=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const alpha=alphaInspection(raw.data,raw.info.width,raw.info.height);assert(alpha.min===0&&alpha.max>16&&alpha.bbox,s.id+' invalid alpha');
 const components=connectedAlphaBounds(raw.data,raw.info.width,raw.info.height,alpha.bbox),sourceBBox=components.selectedBBox;
 const g=s.guideAlphaBBox,target={left:g.left,top:g.top,width:g.width,height:g.height};
 const fit=[target.width/sourceBBox.width,target.height/sourceBBox.height],aspectDelta=fit[0]/fit[1]-1;
 const fg=await sharp(source).extract(sourceBBox).resize(target.width,target.height,{fit:'fill',kernel:'lanczos3'}).png().toBuffer();
 const registered=await sharp({create:{width:s.canvas[0],height:s.canvas[1],channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:fg,left:target.left,top:target.top}]).png().toBuffer();
 const rr=await sharp(registered).ensureAlpha().raw().toBuffer({resolveWithObject:true}),ra=alphaInspection(rr.data,rr.info.width,rr.info.height),b=ra.bbox;
 const left=Math.max(0,b.left-trimPadding),top=Math.max(0,b.top-trimPadding),right=Math.min(s.canvas[0],b.left+b.width+trimPadding),bottom=Math.min(s.canvas[1],b.top+b.height+trimPadding);
 const crop={left,top,width:right-left,height:bottom-top};
 const png=await sharp(registered).extract(crop).png().toBuffer(),webp=await sharp(png).webp({lossless:true,effort:6,alphaQuality:100}).toBuffer();
 fs.writeFileSync(path.join(out,s.id+'.png'),png);fs.writeFileSync(path.join(out,s.id+'.webp'),webp);
 const pr=await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true}),wr=await sharp(webp).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(pr.info.width,wr.info.width);assert.equal(pr.info.height,wr.info.height);
 for(let p=0;p<pr.data.length;p+=4){assert.equal(pr.data[p+3],wr.data[p+3]);if(pr.data[p+3])for(let c=0;c<3;c++)assert.equal(pr.data[p+c],wr.data[p+c]);}
 const anchorPixels=[s.anchorPixels[0]-left,s.anchorPixels[1]-top];
 const a={id:s.id,index:s.index,size:[crop.width,crop.height],anchorPixels,anchorNormalized:anchorPixels.map((v,i)=>v/[crop.width,crop.height][i]),width:crop.width/scale,height:crop.height/scale,groundMidpoint:s.groundMidpoint,startAngleDeg:s.startAngleDeg,endAngleDeg:s.endAngleDeg,placement:s.placement,recommendedWorldPlacement:s.recommendedWorldPlacement,pngPath:relative(path.join(out,s.id+'.png')),image:'/survival/camp-circular-wall-install-v1/'+s.id+'.webp',sourceSha256:sha256(source),geometry:s,reusedOriginal:false};
 const record={id:s.id,source:relative(file),sourceSha256:a.sourceSha256,sourceSize:[metadata.width,metadata.height],sourceAlpha:alpha,sourceComponentAnalysis:components,sourceBBox,guideAlphaBBox:target,fitXYRatios:fit,aspectDeltaPercent:aspectDelta*100,requiresVisualAspectReview:Math.abs(aspectDelta)>.08,trimCrop:crop,size:a.size,anchorPixels,losslessWebPVerified:true,pngSha256:sha256(png),webpSha256:sha256(webp)};
 report.registrations.push(record);if(record.requiresVisualAspectReview)report.warnings.push(s.id+' aspect change '+record.aspectDeltaPercent.toFixed(2)+'%: inspect before publication.');
 packaged.push(a);console.log(JSON.stringify({id:s.id,size:a.size,aspectDeltaPercent:record.aspectDeltaPercent}));
}
if(!partial)assert.equal(report.missing.length,0,'Missing generated road-end art: '+report.missing.join(', '));
const baseOrder=[...packaged].sort((a,b)=>a.placement.y-b.placement.y||a.index-b.index),constraints=[['wall-15','wall-16'],['wall-16','wall-01'],['wall-01','wall-02']].filter(([x,y])=>packaged.some(a=>a.id===x)&&packaged.some(a=>a.id===y));
const order=[],remaining=[...baseOrder],drawn=new Set();
while(remaining.length){const i=remaining.findIndex(a=>constraints.every(([before,after])=>after!==a.id||drawn.has(before)));assert(i>=0,'Cyclic ordering');const [a]=remaining.splice(i,1);order.push(a);drawn.add(a.id);}
const at=(theta,r)=>[r*Math.sin(theta),-r*Math.cos(theta)],rad=Math.PI/180;
function runtimeArt(a){
 const s=a.geometry,start=s.startAngleDeg*rad,end=s.endAngleDeg*rad,origin=s.groundMidpoint;
 const local=p=>[p[0]-origin[0],p[1]-origin[1]],normalized=p=>[(a.anchorPixels[0]+p[0]*scale)/a.size[0],(a.anchorPixels[1]+p[1]*scale)/a.size[1]];
 const curve=Array.from({length:25},(_,i)=>local(at(start+(end-start)*i/24,1650)));
 const points=[];for(let i=0;i<=16;i++)points.push(normalized(local(at(start+(end-start)*i/16,1690))));for(let i=16;i>=0;i--)points.push(normalized(local(at(start+(end-start)*i/16,1610))));
 const paths=[{closed:true,points}];
 // Road-end square posts extend beyond the nominal arc plane. Their exact feet
 // are separate blocker polygons, so openings remain aligned with visible art.
 for(const [side,theta] of [['start',start],['end',end]])if(s.roadEnds?.[side]){
  const p=at(theta,1650),t=[Math.cos(theta),Math.sin(theta)],n=[Math.sin(theta),-Math.cos(theta)],q=24.5;
  const box=[[-q,-q],[q,-q],[q,q],[-q,q]].map(([u,v])=>normalized(local([p[0]+u*t[0]+v*n[0],p[1]+u*t[1]+v*n[1]])));
  paths.push({closed:true,points:box});
 }
 for(const p of paths.flatMap(p=>p.points))for(let i=0;i<2;i++){assert(p[i]>=-0.002&&p[i]<=1.002,a.id+' collision outside sprite: '+p);p[i]=Math.max(0,Math.min(1,p[i]));}
 return{id:'camp_circular_wall_'+s.id.slice(-2),name:'Circular camp wall '+s.id.slice(-2),image:a.image,size:a.size,anchor:a.anchorNormalized,width:a.width,height:a.height,rise:200,curve,segments:curve.slice(0,-1).map(([x,y],i)=>({x,y,ex:curve[i+1][0],ey:curve[i+1][1],r:40})),collision:{lineWidth:.008,paths},startAngleDeg:s.startAngleDeg,endAngleDeg:s.endAngleDeg,roadEnds:s.roadEnds||{start:false,end:false},drawOrder:order.findIndex(p=>p.id===a.id)};
}
const runtime=packaged.map(runtimeArt);
if(!partial)fs.writeFileSync(path.join(repo,'src/camp-circular-wall-art.json'),JSON.stringify(runtime,null,2)+'\n');
const images=new Map();for(const a of packaged)images.set(a.id,await loadImage(path.join(repo,a.pngPath)));
const margin=60,minX=-1690*scale-margin,maxX=1690*scale+margin,minY=-1895*scale-margin,maxY=1690*scale+margin;
const canvas=createCanvas(Math.ceil(maxX-minX),Math.ceil(maxY-minY)),ctx=canvas.getContext('2d');
for(const a of order)ctx.drawImage(images.get(a.id),a.placement.x*scale-a.anchorPixels[0]-minX,a.placement.y*scale-a.anchorPixels[1]-minY,a.size[0],a.size[1]);
const assembly=canvas.toBuffer('image/png');fs.writeFileSync(path.join(previews,'installed-wall-assembly.png'),assembly);
const review=createCanvas(1600,1730),c=review.getContext('2d');c.fillStyle='#172521';c.fillRect(0,0,1600,1730);c.fillStyle='#e6dbc1';c.font='42px "Barlow Condensed", sans-serif';c.fillText('Humans Remain · circular camp wall',45,55);c.font='25px "Barlow Condensed", sans-serif';c.fillText('Six open road entrances · '+packaged.length+' / 16 final sections',45,98);const k=Math.min(1510/canvas.width,1570/canvas.height);c.drawImage(canvas,(1600-canvas.width*k)/2,130,canvas.width*k,canvas.height*k);fs.writeFileSync(path.join(previews,'installed-wall-review.jpg'),review.toBuffer('image/jpeg',94));
const sheet=createCanvas(2048,2180),sc=sheet.getContext('2d');sc.fillStyle='#172521';sc.fillRect(0,0,2048,2180);
for(let i=0;i<16;i++){const s=geometry.sectors[i],a=packaged.find(a=>a.id===s.id),x=(i%4)*512,y=Math.floor(i/4)*545;sc.fillStyle='#263730';sc.fillRect(x+6,y+6,500,533);if(a){const im=images.get(a.id),k=Math.min(470/im.width,455/im.height);sc.drawImage(im,x+(512-im.width*k)/2,y+12+(455-im.height*k)/2,im.width*k,im.height*k);}sc.fillStyle='#e6dbc1';sc.font='24px "Barlow Condensed", sans-serif';sc.textAlign='center';sc.fillText(s.id+' · '+s.startAngleDeg.toFixed(1)+'–'+s.endAngleDeg.toFixed(1)+'°',x+256,y+502);sc.font='19px "Barlow Condensed", sans-serif';sc.fillText(a?(a.reusedOriginal?'Approved original reused':'Finished road-end variant'):'Awaiting generated art',x+256,y+526);}
fs.writeFileSync(path.join(previews,'contact-sheet.png'),sheet.toBuffer('image/png'));
// Inspect ordinary joins and finished entrance posts at useful native detail.
const joins=[['16 → 01',0],['01 → 02',22.5],['03 → 04',67.5],['04 → 05',90],['05 → 06',112.5],['07 → 08',157.5],['09 → 10',202.5],['12 → 13',270],['13 → 14',292.5],['15 → 16',337.5]];
const seamSheet=createCanvas(2200,1060),jc=seamSheet.getContext('2d');jc.fillStyle='#263730';jc.fillRect(0,0,2200,1060);
for(let i=0;i<joins.length;i++){const [label,theta]=joins[i],p=at(theta*rad,1650),x=(i%5)*440,y=Math.floor(i/5)*530;jc.drawImage(canvas,p[0]*scale-minX-220,p[1]*scale-minY-360,440,480,x,y,440,480);jc.fillStyle='#e6dbc1';jc.font='26px "Barlow Condensed",sans-serif';jc.textAlign='center';jc.fillText(label,x+220,y+510);}
fs.writeFileSync(path.join(previews,'seam-detail-sheet.png'),seamSheet.toBuffer('image/png'));
const gaps=[['02 / 03',2,3],['06 / 07',6,7],['08 / 09',8,9],['10 / 11',10,11],['11 / 12',11,12],['14 / 15',14,15]];
const endsSheet=createCanvas(2100,1500),ec=endsSheet.getContext('2d');ec.fillStyle='#263730';ec.fillRect(0,0,2100,1500);
for(let i=0;i<gaps.length;i++){const [label,left,right]=gaps[i],theta=(geometry.sectors[left-1].endAngleDeg+geometry.sectors[right-1].startAngleDeg)/2,p=at(theta*rad,1650),x=(i%3)*700,y=Math.floor(i/3)*750;ec.drawImage(canvas,p[0]*scale-minX-350,p[1]*scale-minY-490,700,700,x,y,700,700);ec.fillStyle='#e6dbc1';ec.font='26px "Barlow Condensed",sans-serif';ec.textAlign='center';ec.fillText('Entrance '+label,x+350,y+730);}
fs.writeFileSync(path.join(previews,'entrance-detail-sheet.png'),endsSheet.toBuffer('image/png'));
report.drawOrder=order.map(a=>a.id);report.complete=packaged.length===16;report.generatedRoadEndCount=report.registrations.length;report.reusedOriginalCount=packaged.filter(a=>a.reusedOriginal).length;report.assembly={file:relative(path.join(previews,'installed-wall-assembly.png')),size:[canvas.width,canvas.height],sha256:sha256(assembly),pixelOrigin:[-minX,-minY],scale};
report.originalsUnmodified=report.registrations.every(r=>sha256(fs.readFileSync(path.join(repo,r.source)))===r.sourceSha256);assert(report.originalsUnmodified);
fs.writeFileSync(path.join(kit,'registration-report.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({version:1,complete:report.complete,geometry:'Six-road circle with orientation-specific sprites and finished exposed posts',runtimeMetadata:'src/camp-circular-wall-art.json',assets:packaged.map(({geometry,...a})=>a),drawOrder:report.drawOrder,preview:report.assembly},null,2)+'\n');
console.log(JSON.stringify({complete:report.complete,generatedRoadEndCount:report.generatedRoadEndCount,reusedOriginalCount:report.reusedOriginalCount,missing:report.missing,warnings:report.warnings,assembly:report.assembly}));

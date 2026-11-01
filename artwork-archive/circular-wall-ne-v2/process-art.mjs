// Mechanical registration only: original generated pixels are retained.
// This processor changes only two north-east sections; all other sprites stay byte-identical.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),sharp=require('sharp');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const kit=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(kit,'../..');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const geometry=read(path.join(kit,'geometry/manifest.json'));
const previousArt=read(path.join(kit,'previous-art.json'));
const previousPlan=read(path.join(kit,'previous-layout.json'));
const output=path.join(repo,'public/survival/camp-circular-wall-ne-v2');
const previews=path.join(kit,'previews');
const alphaThreshold=16,scale=1.4,padding=20,rad=Math.PI/180;
const relative=p=>path.relative(repo,p).split(path.sep).join('/');
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
fs.mkdirSync(output,{recursive:true});fs.mkdirSync(previews,{recursive:true});
const at=(theta,r=1650)=>[r*Math.sin(theta),-r*Math.cos(theta)];
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
const report={version:2,generatedAt:new Date().toISOString(),previousPublishedVersion:326,previousSiteSourceCommit:'1cb33ef17ba4caa6e97f6b2477d530de7022c2a5',registrations:[],warnings:[],unchanged:[],legacy:[]};
const preservedHash=previousArt.map(a=>({id:a.id,image:a.image,metadataSha256:sha256(JSON.stringify(a)),imageSha256:sha256(fs.readFileSync(path.join(repo,'public'+a.image)))}));
const packaged=[];
for(const s of geometry.sectors){
 const file=path.join(kit,'generated',s.id+'.png');
 assert(fs.existsSync(file),'Awaiting unmodified ImageGen output: '+relative(file));
 const source=fs.readFileSync(file),metadata=await sharp(source).metadata();
 assert(metadata.hasAlpha,s.id+' requires real alpha');
 const raw=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const alpha=alphaInspection(raw.data,raw.info.width,raw.info.height);
 assert(alpha.min===0&&alpha.bbox,s.id+' requires a transparent background');
 const components=connectedAlphaBounds(raw.data,raw.info.width,raw.info.height,alpha.bbox);
 assert(!components.requiresHumanReview,s.id+' needs component review before registration');
 const sourceBBox=components.selectedBBox,g=s.guideAlphaBBox;
 const target={left:g.left,top:g.top,width:g.width,height:g.height};
 const fit=[target.width/sourceBBox.width,target.height/sourceBBox.height],aspectDelta=fit[0]/fit[1]-1;
 const foreground=await sharp(source).extract(sourceBBox).resize(target.width,target.height,{fit:'fill',kernel:'lanczos3'}).png().toBuffer();
 const registered=await sharp({create:{width:s.canvas[0],height:s.canvas[1],channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:foreground,left:target.left,top:target.top}]).png().toBuffer();
 const rr=await sharp(registered).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const b=alphaInspection(rr.data,rr.info.width,rr.info.height).bbox;
 const left=Math.max(0,b.left-padding),top=Math.max(0,b.top-padding),right=Math.min(s.canvas[0],b.left+b.width+padding),bottom=Math.min(s.canvas[1],b.top+b.height+padding);
 const crop={left,top,width:right-left,height:bottom-top};
 const png=await sharp(registered).extract(crop).png().toBuffer();
 const webp=await sharp(png).webp({lossless:true,effort:6,alphaQuality:100}).toBuffer();
 const pngPath=path.join(output,s.id+'.png'),webpPath=path.join(output,s.id+'.webp');
 fs.writeFileSync(pngPath,png);fs.writeFileSync(webpPath,webp);
 const pr=await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const wr=await sharp(webp).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(pr.info.width,wr.info.width);assert.equal(pr.info.height,wr.info.height);
 for(let p=0;p<pr.data.length;p+=4){assert.equal(pr.data[p+3],wr.data[p+3]);if(pr.data[p+3])for(let c=0;c<3;c++)assert.equal(pr.data[p+c],wr.data[p+c]);}
 const anchorPixels=[s.anchorPixels[0]-left,s.anchorPixels[1]-top];
 const a={id:s.id,runtimeAssetId:s.runtimeAssetId,index:s.index,size:[crop.width,crop.height],anchorPixels,anchor:anchorPixels.map((v,i)=>v/[crop.width,crop.height][i]),width:crop.width/scale,height:crop.height/scale,groundMidpoint:s.groundMidpoint,startAngleDeg:s.startAngleDeg,endAngleDeg:s.endAngleDeg,pngPath:relative(pngPath),image:'/survival/camp-circular-wall-ne-v2/'+s.id+'.webp',sourceSha256:sha256(source),pngSha256:sha256(png),webpSha256:sha256(webp)};
 const record={...a,source:relative(file),sourceSize:[metadata.width,metadata.height],sourceAlpha:alpha,sourceComponentAnalysis:components,sourceBBox,guideAlphaBBox:target,fitXYRatios:fit,aspectDeltaPercent:aspectDelta*100,requiresVisualAspectReview:Math.abs(aspectDelta)>.08,trimCrop:crop,losslessWebPVerified:true};
 report.registrations.push(record);if(record.requiresVisualAspectReview)report.warnings.push(s.id+' bounding registration aspect adjustment '+record.aspectDeltaPercent.toFixed(2)+'%; inspect the actual joined art.');
 packaged.push(a);
 console.log(JSON.stringify({id:s.id,size:a.size,aspectDeltaPercent:record.aspectDeltaPercent}));
}
function runtimeArt(a){
 const s=geometry.sectors.find(s=>s.id===a.id),start=s.startAngleDeg*rad,end=s.endAngleDeg*rad,origin=s.groundMidpoint;
 const local=p=>[p[0]-origin[0],p[1]-origin[1]],normalized=p=>[(a.anchorPixels[0]+p[0]*scale)/a.size[0],(a.anchorPixels[1]+p[1]*scale)/a.size[1]];
 const curve=Array.from({length:25},(_,i)=>local(at(start+(end-start)*i/24)));
 const points=[];for(let i=0;i<=16;i++)points.push(normalized(local(at(start+(end-start)*i/16,1690))));for(let i=16;i>=0;i--)points.push(normalized(local(at(start+(end-start)*i/16,1610))));
 const paths=[{closed:true,points}];
 for(const [side,theta] of [['start',start],['end',end]])if(s.roadEnds[side]){
  const p=at(theta),t=[Math.cos(theta),Math.sin(theta)],n=[Math.sin(theta),-Math.cos(theta)],q=24.5;
  const box=[[-q,-q],[q,-q],[q,q],[-q,q]].map(([u,v])=>normalized(local([p[0]+u*t[0]+v*n[0],p[1]+u*t[1]+v*n[1]])));
  paths.push({closed:true,points:box});
 }
 for(const p of paths.flatMap(p=>p.points))for(let i=0;i<2;i++){assert(p[i]>=-.002&&p[i]<=1.002,a.id+' collision outside sprite: '+p);p[i]=Math.max(0,Math.min(1,p[i]));}
 const prior=previousArt.find(p=>p.id==='camp_circular_wall_'+a.id.slice(-2));
 return{id:s.runtimeAssetId,name:'Circular camp wall '+a.id.slice(-2)+' · aligned NE road',image:a.image,size:a.size,anchor:a.anchor,width:a.width,height:a.height,rise:200,curve,segments:curve.slice(0,-1).map(([x,y],i)=>({x,y,ex:curve[i+1][0],ey:curve[i+1][1],r:40})),collision:{lineWidth:.008,paths},startAngleDeg:s.startAngleDeg,endAngleDeg:s.endAngleDeg,roadEnds:s.roadEnds,drawOrder:prior.drawOrder};
}
const replacements=packaged.map(runtimeArt);
const oldIds=new Set(['camp_circular_wall_02','camp_circular_wall_03']);
const finalArt=previousArt.map(a=>oldIds.has(a.id)?replacements.find(n=>n.id===a.id+'_ne_v2'):a);
finalArt.push(...previousArt.filter(a=>oldIds.has(a.id)));
assert.equal(finalArt.length,18);assert.equal(new Set(finalArt.map(a=>a.id)).size,18);
const plan=structuredClone(previousPlan);
plan.version=6;
plan.description='Approved circular spiked timber and mossy stone camp wall; six open road entrances, with the north-east opening aligned to the painted stone road.';
plan.openings=plan.openings.map(o=>o.direction==='NE'?geometry.openings.find(g=>g.direction==='NE'):o);
plan.sections=plan.sections.map(section=>{
 const s=geometry.sectors.find(g=>g.id===section.id);if(!s)return section;
 return{...section,runtimeAssetId:s.runtimeAssetId,startAngleDeg:s.startAngleDeg,endAngleDeg:s.endAngleDeg,roadEnds:s.roadEnds,groundMidpoint:s.groundMidpoint,groundEndpoints:s.groundEndpoints,collisionStartAngleDeg:s.collisionStartAngleDeg,collisionEndAngleDeg:s.collisionEndAngleDeg,collisionFootprint:s.collisionFootprint};
});
plan.placements=plan.placements.map(p=>{
 const s=geometry.sectors.find(g=>g.placementId===p.id);if(!s)return p;
 return{...p,assetId:s.runtimeAssetId,x:s.recommendedWorldPlacement.x,y:s.recommendedWorldPlacement.y};
});
plan.sourceProvenance.northEastCorrection={previousPublishedVersion:326,previousSourceCommit:report.previousSiteSourceCommit,geometry:'artwork-archive/circular-wall-ne-v2/geometry/manifest.json',previousGap:[37.059,47.149],paintedRoadGap:[47,57],legacyDefinitionsRetained:true};
for(const h of preservedHash){
 const prior=previousArt.find(a=>a.id===h.id),same=finalArt.find(a=>a.id===h.id);
 assert.deepEqual(same,prior,'An existing artwork definition changed: '+h.id);
 assert.equal(sha256(fs.readFileSync(path.join(repo,'public'+h.image))),h.imageSha256,'An existing sprite was overwritten');
 (oldIds.has(h.id)?report.legacy:report.unchanged).push(h);
}
for(const p of previousPlan.placements.filter(p=>!oldIds.has(p.assetId)))assert.deepEqual(plan.placements.find(n=>n.id===p.id),p,'Unrelated placement changed');
assert.equal(report.unchanged.length,14);assert.equal(report.legacy.length,2);
assert.deepEqual(plan.openings.filter(o=>o.direction!=='NE'),previousPlan.openings.filter(o=>o.direction!=='NE'),'Another opening changed');
assert.deepEqual(plan.sceneryAdjustments,previousPlan.sceneryAdjustments,'Scenery adjustments changed');
// Write complete consistent metadata only after both originals and encoded images pass.
fs.writeFileSync(path.join(repo,'src/camp-circular-wall-art.json'),JSON.stringify(finalArt,null,2)+'\n');
fs.writeFileSync(path.join(repo,'src/camp-circular-wall-layout.json'),JSON.stringify(plan,null,2)+'\n');
const manifest={version:2,complete:true,description:'Two dark weathered replacement wall sections aligned to the NE painted road; previous dark sprites remain available for preserved custom saves.',runtimeMetadata:'src/camp-circular-wall-art.json',layoutMetadata:'src/camp-circular-wall-layout.json',assets:packaged,opening:plan.openings.find(o=>o.direction==='NE'),preservedRuntimeDefinitions:preservedHash};
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
// Actual registered sprites on the exact mathematical circle; no synthesized art.
const active=plan.placements.map(p=>({p,a:finalArt.find(a=>a.id===p.assetId)})).sort((x,y)=>x.a.drawOrder-y.a.drawOrder);
const images=new Map();for(const {a} of active)images.set(a.id,await loadImage(path.join(repo,'public'+a.image)));
const draw=(ctx,bounds,k)=>{for(const {p,a} of active)ctx.drawImage(images.get(a.id),(p.x-a.anchor[0]*a.width-bounds.left)*k,(p.y-a.anchor[1]*a.height-bounds.top)*k,a.width*k,a.height*k)};
const fullBounds={left:plan.centre[0]-1760,top:plan.centre[1]-1930};
const full=createCanvas(1760,1845),fc=full.getContext('2d');fc.fillStyle='#23332c';fc.fillRect(0,0,full.width,full.height);draw(fc,fullBounds,.5);
fs.writeFileSync(path.join(previews,'complete-ring.jpg'),full.toBuffer('image/jpeg',95));
const neBounds={left:2350,top:-200},ne=createCanvas(1500,1500),nc=ne.getContext('2d');nc.fillStyle='#23332c';nc.fillRect(0,0,1500,1500);draw(nc,neBounds,1.3);
fs.writeFileSync(path.join(previews,'ne-registered-sprites.jpg'),ne.toBuffer('image/jpeg',95));
report.originalsUnmodified=report.registrations.every(r=>sha256(fs.readFileSync(path.join(repo,r.source)))===r.sourceSha256);
assert(report.originalsUnmodified);report.complete=true;report.newArtworkCount=2;report.unrelatedArtworkUnchanged=14;report.preservedLegacyArtwork=2;report.activePlacements=16;
fs.writeFileSync(path.join(kit,'registration-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({complete:true,newArtworkCount:2,activePlacements:16,preservedLegacyArtwork:2,unchangedOtherPieces:14,warnings:report.warnings}));

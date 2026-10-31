// Mechanical registration and packaging of ImageGen originals; no new artwork is painted.
// Usage: node artwork-archive/circular-wall-kit-v1/process-kit.mjs [--partial]
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require('sharp');
const {createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas');
const kit=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(kit,'../..');
const headingFontFile=path.join(repo,'public/fonts/barlow-condensed-black.ttf');
if(fs.existsSync(headingFontFile))GlobalFonts.registerFromPath(headingFontFile,'Barlow Condensed');
const bodyFontCandidates=['barlow-regular.ttf','barlow.ttf','Barlow-Regular.ttf'].map(f=>path.join(repo,'public/fonts',f));
const bodyFontFile=bodyFontCandidates.find(f=>fs.existsSync(f));
if(bodyFontFile)GlobalFonts.registerFromPath(bodyFontFile,'Barlow');
const HEADING='"Barlow Condensed", sans-serif',BODY=bodyFontFile?'"Barlow", sans-serif':HEADING;
const sourceDir=path.join(kit,'generated'),geometry=JSON.parse(fs.readFileSync(path.join(kit,'geometry/manifest.json'),'utf8'));
const out=path.join(repo,'public/survival/camp-circular-wall-v1'),previews=path.join(kit,'previews');
const partial=process.argv.includes('--partial'),alphaThreshold=16,trimPadding=12;
const unknown=process.argv.slice(2).filter(v=>v!=='--partial');assert.equal(unknown.length,0,'Unknown arguments: '+unknown.join(' '));
const scale=geometry.pixelsPerWorldUnit;assert.equal(scale,1.4,'This kit is registered at 1.4 px/world unit.');
assert.equal(geometry.sectors.length,16,'Geometry must contain all 16 sectors.');
const selected=geometry.sectors.filter(s=>fs.existsSync(path.join(sourceDir,s.id+'.png')));
const missing=geometry.sectors.filter(s=>!selected.includes(s)).map(s=>s.id);
assert(selected.length>0,'No generated/wall-NN.png inputs are present.');
assert(partial||missing.length===0,'Missing generated inputs: '+missing.join(', ')+'. Use --partial to review a pilot set.');
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(previews,{recursive:true});
const relative=p=>path.relative(repo,p).split(path.sep).join('/');
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
const cleanBBox=b=>({left:b.left,top:b.top,width:b.width,height:b.height});
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
function annularCollision(s,anchorPixels,width,height){
 const start=s.startAngleDeg*Math.PI/180,end=s.endAngleDeg*Math.PI/180;
 const samples=32,inner=geometry.radius-geometry.baseThickness/2,outer=geometry.radius+geometry.baseThickness/2;
 const at=(angle,r)=>[r*Math.sin(angle),-r*Math.cos(angle)];
 const polygon=[];
 for(let i=0;i<=samples;i++)polygon.push(at(start+(end-start)*i/samples,outer));
 for(let i=samples;i>=0;i--)polygon.push(at(start+(end-start)*i/samples,inner));
 const local=polygon.map(([x,y])=>[x-s.groundMidpoint[0],y-s.groundMidpoint[1]]);
 const normalized=local.map(([x,y])=>[(anchorPixels[0]+x*scale)/width,(anchorPixels[1]+y*scale)/height]);
 return{type:'closed-annular-sector-polygon',closed:true,samplesPerArc:samples,innerRadius:inner,outerRadius:outer,angleStartDeg:s.startAngleDeg,angleEndDeg:s.endAngleDeg,polygonWorldRelativeToCircle:polygon,polygonLocalWorld:local,polygonNormalizedToSprite:normalized,note:'Analytical nominal wall footprint, sampled independently of painted pixels. Includes no road opening or extra endpoint post.'};
}
const report={version:2,mode:partial?'partial':'complete-set',generatedAt:new Date().toISOString(),inputDirectory:relative(sourceDir),outputDirectory:relative(out),generatedCount:selected.length,expectedCount:16,missing,alphaThreshold,trimPadding,pixelsPerWorldUnit:scale,operations:['Measure genuine source alpha and visible bounds','Use largest 8-connected alpha component bounds only when it contains at least 99% of foreground pixels; otherwise retain full bounds and flag review','Extract that rectangle, retaining every original pixel inside it','Resize mechanically to the guide alpha bounding box','Place on the unchanged 1536-square guide canvas','Trim to visible bounds plus 12 pixels','Encode PNG and lossless WebP','Assemble those individual final images at their fixed anchors'],sourcesUnmodified:true,geometryIsExactButArtworkMayDrift:true,registrations:[],warnings:[]};
const assets=[];
for(const s of selected){
 const file=path.join(sourceDir,s.id+'.png'),source=fs.readFileSync(file),metadata=await sharp(source).metadata();
 assert(metadata.hasAlpha,s.id+': source has no alpha channel. Generate a truly transparent image.');
 const sourceRaw=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const a=alphaInspection(sourceRaw.data,sourceRaw.info.width,sourceRaw.info.height);
 assert(a.min===0&&a.max>alphaThreshold&&a.transparentPixels>0&&a.bbox,s.id+': source alpha does not contain transparent background and visible artwork.');
 const components=connectedAlphaBounds(sourceRaw.data,sourceRaw.info.width,sourceRaw.info.height,a.bbox),sourceBBox=components.selectedBBox;
 const target=cleanBBox(s.guideAlphaBBox),fitX=target.width/sourceBBox.width,fitY=target.height/sourceBBox.height;
 const aspectDelta=fitX/fitY-1,needsAspectReview=Math.abs(aspectDelta)>.08;
 const foreground=await sharp(source).extract(sourceBBox).resize(target.width,target.height,{fit:'fill',kernel:'lanczos3'}).png().toBuffer();
 const registered=await sharp({create:{width:s.canvas[0],height:s.canvas[1],channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:foreground,left:target.left,top:target.top}]).png().toBuffer();
 const registeredRaw=await sharp(registered).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const registeredAlpha=alphaInspection(registeredRaw.data,s.canvas[0],s.canvas[1]);assert(registeredAlpha.bbox,s.id+': registration produced an empty image.');
 const rb=registeredAlpha.bbox,left=Math.max(0,rb.left-trimPadding),top=Math.max(0,rb.top-trimPadding);
 const right=Math.min(s.canvas[0],rb.left+rb.width+trimPadding),bottom=Math.min(s.canvas[1],rb.top+rb.height+trimPadding);
 const crop={left,top,width:right-left,height:bottom-top};
 const png=await sharp(registered).extract(crop).png().toBuffer(),webp=await sharp(png).webp({lossless:true,effort:6,alphaQuality:100}).toBuffer();
 fs.writeFileSync(path.join(out,s.id+'.png'),png);fs.writeFileSync(path.join(out,s.id+'.webp'),webp);
 const finalRaw=await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true}),finalAlpha=alphaInspection(finalRaw.data,crop.width,crop.height);
 const webpRaw=await sharp(webp).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(webpRaw.info.width,crop.width);assert.equal(webpRaw.info.height,crop.height);
 // Lossless codec must preserve visible RGB and alpha. RGB under alpha=0 is immaterial.
 let visibleDifference=0;for(let p=0;p<finalRaw.data.length;p+=4){if(finalRaw.data[p+3]!==webpRaw.data[p+3])visibleDifference++;if(finalRaw.data[p+3])for(let c=0;c<3;c++)if(finalRaw.data[p+c]!==webpRaw.data[p+c])visibleDifference++;}
 assert.equal(visibleDifference,0,s.id+': WebP did not preserve visible source pixels and alpha losslessly.');
 assert(finalAlpha.min===0&&finalAlpha.max>alphaThreshold,s.id+': final alpha invalid.');
 const anchorPixels=[s.anchorPixels[0]-left,s.anchorPixels[1]-top];
 const record={id:s.id,source:relative(file),sourceSha256:sha256(source),sourceSize:[metadata.width,metadata.height],sourceAlpha:{...a,bbox:a.bbox},sourceFullAlphaBBox:a.bbox,sourceLargestComponentBBox:components.largestComponent.bbox,sourceComponentAnalysis:components,registrationSourceBBox:sourceBBox,guideCanvas:s.canvas,guideAlphaBBox:target,fitXYRatios:[fitX,fitY],sourceAspectRatio:sourceBBox.width/sourceBBox.height,targetAspectRatio:target.width/target.height,aspectDelta,aspectDeltaPercent:aspectDelta*100,requiresHumanAspectReview:needsAspectReview,requiresHumanComponentReview:components.requiresHumanReview,registeredAlphaBBox:registeredAlpha.bbox,trimCrop:crop,finalSize:[crop.width,crop.height],finalAlpha,outputs:{png:{file:relative(path.join(out,s.id+'.png')),bytes:png.length,sha256:sha256(png)},webp:{file:relative(path.join(out,s.id+'.webp')),bytes:webp.length,sha256:sha256(webp)}},losslessWebPVerified:true};
 report.registrations.push(record);
 if(needsAspectReview)report.warnings.push(s.id+': bbox aspect changed '+(aspectDelta*100).toFixed(2)+'%; inspect silhouette and joints before accepting this asset.');
 if(components.requiresHumanReview)report.warnings.push(s.id+': largest alpha component contains only '+(components.largestComponentFraction*100).toFixed(3)+'% of foreground; full source bounds retained pending review.');
 const asset={id:s.id,index:s.index,png:s.id+'.png',webp:s.id+'.webp',size:[crop.width,crop.height],crop:[0,0,crop.width,crop.height],sourceGuideCrop:[left,top,crop.width,crop.height],anchorPixels,anchorNormalized:[anchorPixels[0]/crop.width,anchorPixels[1]/crop.height],width:crop.width/scale,height:crop.height/scale,pixelsPerWorldUnit:scale,groundMidpoint:s.groundMidpoint,startAngleDeg:s.startAngleDeg,endAngleDeg:s.endAngleDeg,groundEndpoints:s.groundEndpoints,placement:s.placement,recommendedWorldPlacement:s.recommendedWorldPlacement,postOwnership:geometry.postOwnership,posts:s.posts,nominalGroundEndPlane:s.endPlane,collision:annularCollision(s,anchorPixels,crop.width,crop.height),requiresHumanAspectReview:needsAspectReview,requiresHumanComponentReview:components.requiresHumanReview,sourceSha256:record.sourceSha256};
 assets.push(asset);
 console.log(JSON.stringify({id:s.id,size:asset.size,aspectDeltaPercent:record.aspectDeltaPercent,requiresHumanAspectReview:needsAspectReview}));
}
const origin=geometry.coordinateSystem.recommendedWorldCentre;
const manifest={version:1,status:selected.length===16?'all-16-assets-packaged-pending-visual-review':'partial-pilot-assets',generatedCount:selected.length,expectedCount:16,missing,liveGameIntegration:false,style:'Approved spiked, irregular oak above a low mossy stone base',geometry:{radius:geometry.radius,baseThickness:geometry.baseThickness,sectorAngleDeg:geometry.sectorAngleDeg,sectorCount:16,angleZero:'north',angleDirection:'clockwise',centre:[0,0],recommendedWorldCentre:origin,projection:{screenX:'X',screenY:'Y-z'},pixelsPerWorldUnit:scale,postOwnership:geometry.postOwnership,overlapWorldUnits:geometry.overlapWorldUnits},notes:['All visible detail comes from the untouched ImageGen originals; processing only registers, trims and encodes.','Alpha bounds are fitted to the common guide. Bounding-box fitting does not prove that internal painted curvature or endpoint details match mathematical geometry.','Use each unique orientation with rotation 0 and no flips. Scale the entire kit uniformly if changing its radius.','Ground anchors and collision polygons are deterministic; inspect real sprite joins and front-to-back ordering before game integration.','This is a complete closed-ring asset kit. Existing road openings require deliberately selected or shortened end pieces; no live layout is changed.'],assets};
// These previews use only the final individual PNGs, not the geometric/clay renderer.
const images=new Map();for(const a of assets)images.set(a.id,await loadImage(path.join(out,a.png)));
// These three reviewed overlaps are local exceptions to midpoint-Y sorting.
// Applying owner-post-last to every sector would create a circular dependency.
const manualOrderingConstraints=[['wall-15','wall-16'],['wall-16','wall-01'],['wall-01','wall-02']];
const baseGroundYOrder=[...assets].sort((a,b)=>a.placement.y-b.placement.y||a.index-b.index);
const availableIds=new Set(assets.map(a=>a.id));
const activeOrderingConstraints=manualOrderingConstraints.filter(([before,after])=>availableIds.has(before)&&availableIds.has(after));
const assemblyOrder=[],remainingOrder=[...baseGroundYOrder],alreadyDrawn=new Set();
while(remainingOrder.length){
 const nextIndex=remainingOrder.findIndex(a=>activeOrderingConstraints.every(([before,after])=>after!==a.id||alreadyDrawn.has(before)));
 assert(nextIndex>=0,'The manual sprite ordering constraints contain a cycle.');
 const [next]=remainingOrder.splice(nextIndex,1);assemblyOrder.push(next);alreadyDrawn.add(next.id);
}
const assemblyOrdering={baseGroundYOrder:baseGroundYOrder.map(a=>a.id),drawOrder:assemblyOrder.map(a=>a.id),manualConstraints:manualOrderingConstraints,activeConstraints:activeOrderingConstraints,policy:'Stable topological ordering using ordinary ground-midpoint Y as priority, with only the three reviewed northern overlap constraints. No universal owner-post ordering is imposed.'};
manifest.assemblyOrdering=assemblyOrdering;report.assemblyOrdering=assemblyOrdering;
function itemRect(a,explosion=0){
 const theta=(a.startAngleDeg+a.endAngleDeg)/2*Math.PI/180;
 const dx=Math.sin(theta)*explosion,dy=-Math.cos(theta)*explosion;
 return{x:(a.placement.x+dx)*scale-a.anchorPixels[0],y:(a.placement.y+dy)*scale-a.anchorPixels[1],width:a.size[0],height:a.size[1]};
}
function spriteAssembly(explosion=0){
 // Bounds always describe the full intended ring, keeping partial reviews at the same scale/framing.
 const expected=geometry.sectors.map(s=>({x:s.groundMidpoint[0]*scale-s.anchorPixels[0]+s.guideAlphaBBox.left,y:s.groundMidpoint[1]*scale-s.anchorPixels[1]+s.guideAlphaBBox.top,width:s.guideAlphaBBox.width,height:s.guideAlphaBBox.height}));
 const margin=48+explosion*scale;
 const minX=Math.floor(Math.min(...expected.map(b=>b.x))-margin),minY=Math.floor(Math.min(...expected.map(b=>b.y))-margin);
 const maxX=Math.ceil(Math.max(...expected.map(b=>b.x+b.width))+margin),maxY=Math.ceil(Math.max(...expected.map(b=>b.y+b.height))+margin);
 const canvas=createCanvas(maxX-minX,maxY-minY),ctx=canvas.getContext('2d');
 const order=assemblyOrder;
 for(const a of order){const b=itemRect(a,explosion);ctx.drawImage(images.get(a.id),b.x-minX,b.y-minY,b.width,b.height);}
 return{canvas,metadata:{size:[canvas.width,canvas.height],pixelOrigin:[-minX,-minY],pixelsPerWorldUnit:scale,drawOrder:order.map(a=>a.id),manualOrderingConstraints:activeOrderingConstraints,radialExplosionWorldUnits:explosion,renderer:'Actual final independent PNGs; fractional-pixel anchors; stable ground-Y priority with reviewed 15-before-16-before-01-before-02 overlap constraints',generatedCount:assets.length,expectedCount:16}};
}
const assembled=spriteAssembly(),exploded=spriteAssembly(200);
const assembledPng=assembled.canvas.toBuffer('image/png');
fs.writeFileSync(path.join(previews,'assembled-circle.png'),assembledPng);
fs.writeFileSync(path.join(previews,'exploded-ring.png'),exploded.canvas.toBuffer('image/png'));
// A visual approval is valid only for these exact sources, exports and assembly.
// Numerical registration triggers remain in the report even after they are reviewed.
function matchingVisualReview(){
 const file=path.join(kit,'visual-review.json'),reference=relative(file);
 if(!fs.existsSync(file))return{file:reference,found:false,accepted:false,reason:'No visual review file is present.'};
 try{
  const bytes=fs.readFileSync(file),review=JSON.parse(bytes),mismatches=[];
  if(review.reviewed!==true)mismatches.push('reviewed must be true');
  if(review.approvalStatus!=='accepted')mismatches.push('approvalStatus is not accepted');
  if(assets.length!==16)mismatches.push('current output does not contain all 16 assets');
  if(!Array.isArray(review.assets)||review.assets.length!==16)mismatches.push('review must list exactly 16 assets');
  const reviewedAssets=new Map();
  for(const a of Array.isArray(review.assets)?review.assets:[]){
   if(!a||typeof a.id!=='string'){mismatches.push('review contains an invalid asset entry');continue}
   if(reviewedAssets.has(a.id))mismatches.push('duplicate reviewed asset '+a.id);
   reviewedAssets.set(a.id,a);
  }
  const expectedIds=geometry.sectors.map(s=>s.id);
  for(const id of reviewedAssets.keys())if(!expectedIds.includes(id))mismatches.push('unexpected reviewed asset '+id);
  for(const id of expectedIds){
   const a=reviewedAssets.get(id),record=report.registrations.find(r=>r.id===id);
   if(!a||!record){mismatches.push(id+' is missing from the review or current outputs');continue}
   for(const type of ['png','webp']){
    if(a[type]?.path!==record.outputs[type].file)mismatches.push(id+' '+type+' path differs');
    if(a[type]?.sha256!==record.outputs[type].sha256)mismatches.push(id+' '+type+' hash differs');
   }
   if(a.source?.path!==record.source)mismatches.push(id+' source path differs');
   if(a.source?.sha256!==record.sourceSha256)mismatches.push(id+' source hash differs');
   if(JSON.stringify(a.size)!==JSON.stringify(record.finalSize))mismatches.push(id+' output dimensions differ');
  }
  const expectedPreviewPath=relative(path.join(previews,'assembled-circle.png'));
  if(review.assembledPreview?.path!==expectedPreviewPath)mismatches.push('assembled preview path differs');
  if(review.assembledPreview?.sha256!==sha256(assembledPng))mismatches.push('assembled preview hash differs');
  if(JSON.stringify(review.assembledPreview?.size)!==JSON.stringify(assembled.metadata.size))mismatches.push('assembled preview dimensions differ');
  if(JSON.stringify(review.assembledPreview?.drawOrder)!==JSON.stringify(assembled.metadata.drawOrder))mismatches.push('assembled preview draw order differs');
  return{file:reference,found:true,accepted:mismatches.length===0,reviewSha256:sha256(bytes),reviewedAt:review.reviewedAt??null,approvalStatus:review.approvalStatus??null,matchingAssetCount:16-mismatches.filter(s=>/^wall-\d\d /.test(s)).map(s=>s.slice(0,7)).filter((v,i,a)=>a.indexOf(v)===i).length,reason:mismatches.length?'Review is absent, incomplete, rejected or stale for these exact files.':'All 16 current PNG, WebP and source hashes plus the assembled preview hash, dimensions and draw order match the accepted review.',mismatches};
 }catch(error){return{file:reference,found:true,accepted:false,reason:'Visual review could not be read: '+error.message}}
}
const visualReview=matchingVisualReview();
manifest.visualReview=visualReview;report.visualReview=visualReview;
if(visualReview.accepted)manifest.status='accepted-asset-kit';
for(const a of assets)a.visualReviewStatus=visualReview.accepted?'accepted':'pending';
report.registrationFlagSemantics='requiresHumanAspectReview and requiresHumanComponentReview record the original numerical triggers. Matching visualReview.accepted resolves their review requirement without deleting those historical metrics or warnings.';
function labelledReview(source,title,subtitle){
 const canvas=createCanvas(1600,1712),ctx=canvas.getContext('2d');ctx.fillStyle='#172521';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.fillStyle='#eadfc6';ctx.font='900 46px '+HEADING;ctx.textAlign='left';ctx.fillText(title,48,58);
 ctx.fillStyle='#b6c5b7';ctx.font='23px '+BODY;ctx.fillText(subtitle,48,96);
 const factor=Math.min(1536/source.width,1536/source.height),w=source.width*factor,h=source.height*factor;
 ctx.drawImage(source,(1600-w)/2,132+(1536-h)/2,w,h);
 return canvas;
}
const countText=assets.length+' / 16 sections generated'+(missing.length?' · PILOT SET':' · full set');
const review=labelledReview(assembled.canvas,'Humans Remain · circular wall',countText+' · actual individual sprites');
fs.writeFileSync(path.join(previews,'assembly-review.jpg'),review.toBuffer('image/jpeg',94));
const explodedReview=labelledReview(exploded.canvas,'Humans Remain · separate wall sections',countText+' · fixed orientation, moved radially outward');
fs.writeFileSync(path.join(previews,'exploded-review.jpg'),explodedReview.toBuffer('image/jpeg',94));
const sheet=createCanvas(2048,2240),ctx=sheet.getContext('2d');ctx.fillStyle='#172521';ctx.fillRect(0,0,sheet.width,sheet.height);
ctx.fillStyle='#eadfc6';ctx.font='900 42px '+HEADING;ctx.textAlign='left';ctx.fillText('Circular wall sections · '+countText,28,52);
for(let i=0;i<16;i++){
 const s=geometry.sectors[i],a=assets.find(a=>a.id===s.id),x=(i%4)*512,y=80+Math.floor(i/4)*540;
 ctx.fillStyle='#263730';ctx.fillRect(x+7,y+7,498,526);
 if(a){const img=images.get(a.id),fit=Math.min(464/img.width,452/img.height);ctx.drawImage(img,x+(512-img.width*fit)/2,y+18+(452-img.height*fit)/2,img.width*fit,img.height*fit);}
 else{ctx.fillStyle='#7c8d80';ctx.font='25px '+BODY;ctx.textAlign='center';ctx.fillText('Not generated',x+256,y+252);}
 ctx.textAlign='center';ctx.fillStyle=a?'#eadfc6':'#8b9a90';ctx.font='900 31px '+HEADING;ctx.fillText(s.id+' · '+s.startAngleDeg+'–'+s.endAngleDeg+'°',x+256,y+499);
 ctx.font='18px '+BODY;ctx.fillStyle=(a?.requiresHumanAspectReview||a?.requiresHumanComponentReview)&&!visualReview.accepted?'#edbd79':'#aebdad';ctx.fillText(a?(a.requiresHumanAspectReview?(visualReview.accepted?'Aspect change: reviewed':'Aspect change: review needed'):a.requiresHumanComponentReview?(visualReview.accepted?'Detached components: reviewed':'Detached components: review needed'):'Transparent PNG + lossless WebP'):'Awaiting original image',x+256,y+524);
}
fs.writeFileSync(path.join(previews,'contact-sheet.png'),sheet.toBuffer('image/png'));
const angleSum=assets.reduce((n,a)=>n+a.endAngleDeg-a.startAngleDeg,0),endErrors=[];
for(let i=0;i<16;i++){
 const a=geometry.sectors[i],b=geometry.sectors[(i+1)%16];endErrors.push(Math.hypot(a.groundEndpoints.end[0]-b.groundEndpoints.start[0],a.groundEndpoints.end[1]-b.groundEndpoints.start[1]));
}
report.preview={assembled:{file:relative(path.join(previews,'assembled-circle.png')),...assembled.metadata},exploded:{file:relative(path.join(previews,'exploded-ring.png')),...exploded.metadata},review:relative(path.join(previews,'assembly-review.jpg')),contactSheet:relative(path.join(previews,'contact-sheet.png'))};
report.validation={allPresentInputsDecoded:true,allFinalPNGsAndWebPsDecoded:true,allHaveGenuineAlpha:true,losslessWebPVisiblePixelsVerified:true,all16Available:assets.length===16,packagedAngleSumDeg:angleSum,fullKitAngleSumDeg:360,maxAnalyticalSeamErrorWorldUnits:Math.max(...endErrors),fixedPixelsPerWorldUnit:scale,sourceOriginalsUnmodified:report.registrations.every(r=>sha256(fs.readFileSync(path.join(repo,r.source)))===r.sourceSha256),requiresHumanAspectReview:report.registrations.filter(r=>r.requiresHumanAspectReview).map(r=>r.id),requiresHumanComponentReview:report.registrations.filter(r=>r.requiresHumanComponentReview).map(r=>r.id),actualPaintedJoinReviewComplete:visualReview.accepted,visualReviewReference:visualReview.file,liveLayoutModified:false};
assert(report.validation.sourceOriginalsUnmodified,'An original source changed during packaging.');
if(!partial){assert.equal(assets.length,16);assert.equal(angleSum,360);assert(report.validation.maxAnalyticalSeamErrorWorldUnits<1e-8);}
manifest.registrationReport=relative(path.join(kit,'registration-report.json'));
manifest.preview=report.preview;
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(kit,'registration-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({complete:true,generatedCount:assets.length,missing,warnings:report.warnings,output:out,report:path.join(kit,'registration-report.json'),assemblyReview:path.join(previews,'assembly-review.jpg')}));

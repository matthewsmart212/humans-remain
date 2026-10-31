// Registered illustrated geography is rebuilt from the installed river masks
// and rendered roads. Actual terrain supplies soft colour washes and evidence
// for tracing painted road centres; its gameplay texture is never copied.
// Mutable placements belong to the live map overlay and are never baked here.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),sharp=require('sharp');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'illustrated-atlas-'));
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const option=(name,fallback)=>{const i=process.argv.indexOf('--'+name);return i>=0?process.argv[i+1]:fallback};
const width=Number(option('size','3072')),height=width;
const paperFile=option('paper','art-source/maps/atlas-paper.png');
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const nice=v=>Number(v.toFixed(2));
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const hash=(x,y,seed=17)=>{let h=Math.imul(x^seed,374761393)+Math.imul(y,668265263);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296};
const smooth=v=>{v=clamp(v);return v*v*(3-2*v)};

// Chamfer distance supplies shoreline shading, not invented terrain elevation.
function distanceField(mask,invert=false){
 const result=new Float32Array(mask.length),diagonal=Math.SQRT2;
 for(let i=0;i<mask.length;i++)result[i]=(!!mask[i]!==invert)?0:100000;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x;let d=result[i];
  if(x)d=Math.min(d,result[i-1]+1);
  if(y){d=Math.min(d,result[i-width]+1);if(x)d=Math.min(d,result[i-width-1]+diagonal);if(x+1<width)d=Math.min(d,result[i-width+1]+diagonal);}
  result[i]=d;
 }
 for(let y=height-1;y>=0;y--)for(let x=width-1;x>=0;x--){
  const i=y*width+x;let d=result[i];
  if(x+1<width)d=Math.min(d,result[i+1]+1);
  if(y+1<height){d=Math.min(d,result[i+width]+1);if(x)d=Math.min(d,result[i+width-1]+diagonal);if(x+1<width)d=Math.min(d,result[i+width+1]+diagonal);}
  result[i]=d;
 }
 return result;
}
function softenDistance(outside,inside){
 const horizontal=new Float32Array(outside.length),result=new Float32Array(outside.length),weights=[.025,.225,.5,.225,.025];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){let d=0;for(let k=-2;k<=2;k++){const i=y*width+clamp(x+k,0,width-1);d+=(outside[i]-inside[i])*weights[k+2];}horizontal[y*width+x]=d;}
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){let d=0;for(let k=-2;k<=2;k++)d+=horizontal[clamp(y+k,0,height-1)*width+x]*weights[k+2];result[y*width+x]=d;}
 return result;
}
function sampleImage(image,sx,sy){
 const x=clamp(Math.round((sx-image.x)/image.sourceWidth*(image.width-1)),0,image.width-1),y=clamp(Math.round((sy-image.y)/image.sourceHeight*(image.height-1)),0,image.height-1),i=(y*image.width+x)*3;
 return[image.data[i],image.data[i+1],image.data[i+2]];
}
async function terrainColourWash(terrain,water,shoreDistance){
 // This is a registered colour field, not a biome sketch. Average the actual
 // ground in small source-space bins, then soften those averages. Exclude
 // water so turquoise cannot bleed across an otherwise dry bank or peninsula.
 const grid=192,totals=new Float64Array(grid*grid*3),counts=new Uint32Array(grid*grid),wet=[0,0,0];let wetCount=0;
 assert.equal(terrain.info.channels,3,'Terrain colour evidence is RGB');
 for(let y=0;y<terrain.info.height;y++)for(let x=0;x<terrain.info.width;x++){
  const i=(y*terrain.info.width+x)*3,px=Math.min(width-1,Math.floor((x+.5)/terrain.info.width*width)),py=Math.min(height-1,Math.floor((y+.5)/terrain.info.height*height)),mapIndex=py*width+px;
  const r=terrain.data[i],g=terrain.data[i+1],b=terrain.data[i+2];
  if(water[mapIndex]){
   if(shoreDistance[mapIndex]<-3&&g>r*1.1&&b>r*1.1){wet[0]+=r;wet[1]+=g;wet[2]+=b;wetCount++;}
   continue;
  }
  if(r*.28+g*.5+b*.22<35)continue; // The world-edge vignette is not soil.
  const cell=Math.floor(y/terrain.info.height*grid)*grid+Math.floor(x/terrain.info.width*grid);
  totals[cell*3]+=r;totals[cell*3+1]+=g;totals[cell*3+2]+=b;counts[cell]++;
 }
 const coarse=Buffer.alloc(grid*grid*3),valid=new Uint8Array(grid*grid);
 for(let i=0;i<valid.length;i++)if(counts[i]){valid[i]=1;for(let c=0;c<3;c++)coarse[i*3+c]=Math.round(totals[i*3+c]/counts[i]);}
 // Interpolate land under the separate water engraving. This changes colour
 // only: the authoritative shoreline mask is used again during compositing.
 let unresolved=valid.reduce((n,v)=>n+(v?0:1),0);
 while(unresolved){const updates=[];
  for(let y=0;y<grid;y++)for(let x=0;x<grid;x++){
   const i=y*grid+x;if(valid[i])continue;
   const neighbours=[x?i-1:-1,x+1<grid?i+1:-1,y?i-grid:-1,y+1<grid?i+grid:-1].filter(n=>n>=0&&valid[n]);
   if(neighbours.length)updates.push([i,...[0,1,2].map(c=>Math.round(neighbours.reduce((sum,n)=>sum+coarse[n*3+c],0)/neighbours.length))]);
  }
  assert(updates.length,'Every terrain colour cell can reach real ground');
  for(const [i,r,g,b]of updates){valid[i]=1;coarse[i*3]=r;coarse[i*3+1]=g;coarse[i*3+2]=b;}unresolved-=updates.length;
 }
 // Two pipelines ensure that blur happens at the coarse colour-field scale.
 const blurred=await sharp(coarse,{raw:{width:grid,height:grid,channels:3}}).blur(2.6).raw().toBuffer();
 const colour=await sharp(blurred,{raw:{width:grid,height:grid,channels:3}}).resize(width,height,{kernel:'cubic'}).raw().toBuffer();
 assert.equal(colour.length,width*height*3,'Registered colour field remains RGB');
 assert(wetCount>100,'River colour comes from installed water artwork');
 return{colour,water:wet.map(v=>Math.round(v/wetCount)),grid,blur:2.6,wetSamples:wetCount};
}
function resample(points,maxStep=65,closed=false){
 const source=closed?[...points,points[0]]:points,result=[source[0]];
 for(let i=1;i<source.length;i++){const a=source[i-1],b=source[i],steps=Math.max(1,Math.ceil(distance(a,b)/maxStep));for(let j=1;j<=steps;j++)result.push([a[0]+(b[0]-a[0])*j/steps,a[1]+(b[1]-a[1])*j/steps]);}
 if(closed)result.pop();return result;
}
function pathData(points,project,closed=false){
 if(points.length<2)return'';
 const p=points.map(project),first=closed?[(p[0][0]+p.at(-1)[0])/2,(p[0][1]+p.at(-1)[1])/2]:p[0];
 let d=`M${nice(first[0])} ${nice(first[1])}`;
 for(let i=closed?0:1;i<p.length-(closed?0:1);i++){const next=p[(i+1)%p.length],mid=[(p[i][0]+next[0])/2,(p[i][1]+next[1])/2];d+=`Q${nice(p[i][0])} ${nice(p[i][1])} ${nice(mid[0])} ${nice(mid[1])}`;}
 if(closed)d+='Z';else d+=`L${nice(p.at(-1)[0])} ${nice(p.at(-1)[1])}`;return d;
}

try{
 assert(width>=1024&&width<=4096,'Atlas size must be between 1024 and 4096');
 await build({stdin:{contents:"export * from './src/world-roads';export * from './src/world-road-pilot';export * from './src/river-layout';export * from './src/river-collision';export * from './src/camp-foliage';export * from './src/outdoor-terrain';export * from './src/east-approach';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temporary,'geography.cjs'),logLevel:'error'});
 const geography=require(path.join(temporary,'geography.cjs'));
 const bounds=geography.OUTDOOR_SOURCE_BOUNDS,unit=width/bounds.width;
 const project=([x,y])=>[(x-bounds.x)*unit,(y-bounds.y)*unit];
 const worldBounds={x:(bounds.x-600)*geography.EAST_TERRAIN_SCALE,y:(bounds.y-600)*geography.EAST_TERRAIN_SCALE,width:bounds.width*geography.EAST_TERRAIN_SCALE,height:bounds.height*geography.EAST_TERRAIN_SCALE};
 const masks=[{batch:0,...read('src/river-water-mask.json')},{batch:1,...read('src/river-logging-water-mask.json')},...read('src/river-extension-water-masks.json')];
 const sides=read('src/river-side-water-masks.json'),bridges=read('src/river-bridges.json');
 const binary=Buffer.alloc(width*height);
 let maskRows=0,sideSpans=0;
 function paintSpan(x,y,w,h){
  // Test pixel centres, so adjacent source rows never union their different
  // banks across a partially covered output pixel and erase a thin dry gap.
  const ax=clamp(Math.ceil((x-bounds.x)*unit-.5),0,width),bx=clamp(Math.ceil((x+w-bounds.x)*unit-.5),0,width);
  const ay=clamp(Math.ceil((y-bounds.y)*unit-.5),0,height),by=clamp(Math.ceil((y+h-bounds.y)*unit-.5),0,height);
  for(let py=ay;py<by;py++)binary.fill(255,py*width+ax,py*width+bx);
 }
 // Ownership is the production collision rule. A full union of historical
 // batches would leave false closed pools at replaced outlet banks.
 for(let i=0;i<masks.length;i++){
  const mask=masks[i],batch=geography.RIVER_BATCHES[mask.batch],source=batch.source;
  const minimum=i?source.y+batch.topFade:-Infinity;
  const next=i+1<masks.length?geography.RIVER_BATCHES[masks[i+1].batch]:null,maximum=next?next.source.y+next.topFade:Infinity;
  for(let row=0;row<mask.rows.length;row++){
   const span=mask.rows[row],sy=source.y+row*mask.step;if(!span||sy<minimum||sy>=maximum)continue;
   paintSpan(source.x+span[0]*mask.step,sy,(span[1]-span[0])*mask.step,mask.step);maskRows++;
  }
 }
 for(const mask of sides){const source=geography.RIVER_BATCHES[mask.batch].source;for(let row=0;row<mask.rows.length;row++)for(const span of mask.rows[row]){paintSpan(source.x+span[0]*mask.step,source.y+row*mask.step,(span[1]-span[0])*mask.step,mask.step);sideSpans++;}}
 const water=new Uint8Array(width*height);for(let i=0;i<water.length;i++)water[i]=binary[i]?1:0;
 const outside=distanceField(water),inside=distanceField(water,true),shoreDistance=softenDistance(outside,inside);
 // Only round sub-cell corners; never blur the whole water shape or shift a
 // channel centre. Continuous distance also antialiases engraved bank lines.
 for(let i=0;i<water.length;i++)water[i]=shoreDistance[i]<=0?1:0;
 console.log('Registered installed waterways and shoreline distances.');

 const evidenceRaw=await sharp('public/maps/world-terrain.webp').removeAlpha().raw().toBuffer({resolveWithObject:true});
 const terrainWash=await terrainColourWash(evidenceRaw,water,shoreDistance);
 const riverColour=terrainWash.water.map((value,i)=>value*.7+[73,105,100][i]*.3);

 const ink=Buffer.alloc(width*height*4),shoreHatches=[];
 const tint=(i,r,g,b,a)=>{ink[i*4]=r;ink[i*4+1]=g;ink[i*4+2]=b;ink[i*4+3]=Math.round(clamp(a)*255)};
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x,grain=hash(x,y,31)-.5;
  if(shoreDistance[i]<.5){
   const depth=Math.max(0,-shoreDistance[i]),edge=1-smooth((depth-.5)/2.8),breath=Math.sin(x*.038+y*.072)*1.5+grain*5;
   const q=clamp(depth/18),r=riverColour[0]-7*q-18*edge+breath,g=riverColour[1]-9*q-24*edge+breath,b=riverColour[2]-8*q-20*edge+breath;
   tint(i,r,g,b,.25+.69*clamp(.5-shoreDistance[i]));
   // Fine horizontal engraved ripples remain entirely inside actual water.
   if(depth>4&&y%11===0&&hash(Math.floor(x/14),y,7)>.22&&x%19<12)tint(i,196,207,172,.34+grain*.12);
  }else{
   const d=shoreDistance[i];if(d>38)continue;
   const lowerRight=x>0&&y>0?shoreDistance[i-width-1]<d:false;
   let alpha=.29*Math.exp(-d/11)*(lowerRight?1:.55);
   alpha+=.36*Math.exp(-Math.pow((d-4)/.7,2))+.20*Math.exp(-Math.pow((d-9)/.65,2));
   tint(i,70,65,38,alpha);
   if(d>1.5&&d<3.2&&x>4&&x<width-5&&y>4&&y<height-5&&hash(x,y,59)>.965){
    const gx=shoreDistance[i+3]-shoreDistance[i-3],gy=shoreDistance[i+width*3]-shoreDistance[i-width*3],length=Math.hypot(gx,gy)||1;
    const extent=11+hash(x,y,113)*15,nx=gx/length,ny=gy/length;
    shoreHatches.push(`M${nice(x+nx*2)} ${nice(y+ny*2)}l${nice(nx*extent)} ${nice(ny*extent)}`);
   }
  }
 }
 const waterInk=await sharp(ink,{raw:{width,height,channels:4}}).png().toBuffer();
 const campRaw=await sharp('public/survival/camp-ground-v3/preview.webp').removeAlpha().raw().toBuffer({resolveWithObject:true});
 const campImage={data:campRaw.data,width:campRaw.info.width,height:campRaw.info.height,x:0,y:0,sourceWidth:4800,sourceHeight:4800};
 const worldImage={data:evidenceRaw.data,width:evidenceRaw.info.width,height:evidenceRaw.info.height,x:bounds.x,y:bounds.y,sourceWidth:bounds.width,sourceHeight:bounds.height};
 function colour(x,y){return sampleImage(x>=350&&x<=4450&&y>=350&&y<=4450?campImage:worldImage,x,y)}
 function ridgeScore(x,y,nx,ny,roadWidth){
  const centre=colour(x,y),a=colour(x+nx*roadWidth*.8,y+ny*roadWidth*.8),b=colour(x-nx*roadWidth*.8,y-ny*roadWidth*.8);
  const lum=v=>v[0]*.28+v[1]*.5+v[2]*.22;
  const pale=smooth((centre[2]/Math.max(1,centre[0])-.34)/.27)*smooth((centre[1]/Math.max(1,centre[0])-.55)/.28);
  const ridge=Math.min(lum(centre)-lum(a),lum(centre)-lum(b));
  return{score:pale*25+Math.max(-4,ridge)*1.45,pale,ridge};
 }
 const tracing={points:0,adjusted:0,maxShift:0,totalShift:0};
 function traceRoad(guide,roadWidth,closed=false){
  const input=resample(guide,55,closed),offsets=input.map((p,i)=>{
   if(!closed&&(i===0||i===input.length-1))return[0,0];
   const before=input[(i-1+input.length)%input.length],after=input[(i+1)%input.length],dx=after[0]-before[0],dy=after[1]-before[1],length=Math.hypot(dx,dy)||1,nx=-dy/length,ny=dx/length;
   const centre=ridgeScore(...p,nx,ny,roadWidth);let best=centre.score,bestOffset=0;
   const range=Math.min(180,Math.max(90,roadWidth));
   for(let offset=-range;offset<=range;offset+=10){
    const sample=ridgeScore(p[0]+nx*offset,p[1]+ny*offset,nx,ny,roadWidth),score=sample.score-Math.abs(offset)*.043;
    if(score>best+1.8&&(sample.ridge>2||sample.pale>.44)){best=score;bestOffset=offset;}
   }
   tracing.points++;if(bestOffset){tracing.adjusted++;tracing.maxShift=Math.max(tracing.maxShift,Math.abs(bestOffset));tracing.totalShift+=Math.abs(bestOffset);}
   return[nx*bestOffset,ny*bestOffset];
  });
  return input.map((p,i)=>{
   if(!closed&&(i===0||i===input.length-1))return p;
   let x=0,y=0,total=0;for(let j=-3;j<=3;j++){if(!closed&&(i+j<0||i+j>=input.length))continue;const weight=4-Math.abs(j),q=offsets[(i+j+input.length)%input.length];x+=q[0]*weight;y+=q[1]*weight;total+=weight;}
   return[p[0]+x/total,p[1]+y/total];
  });
 }
 // Two bridge-tagged plan routes currently render as ordinary road surfaces
 // over dry land. Keep their real route connectivity without inventing water
 // or deck symbols. Only installed crossing records become engraved bridges.
 const roads=geography.WORLD_ROADS.filter(r=>r.kind!=='bridge'||!bridges.some(b=>b.id===r.id)).map(road=>({...road,traced:traceRoad(road.sourcePoints,Math.max(90,road.width))}));
 // Reuse the exact painted-road trace that draws the atlas for wall openings.
 // Export-only mode leaves both gameplay terrain and the atlas image untouched.
 const campRoads=roads.filter(r=>r.from.startsWith('gate')).map(r=>({id:r.id,width:r.width*geography.EAST_TERRAIN_SCALE,points:r.traced.filter(([x,y])=>x>-200&&x<5000&&y>-200&&y<5000).map(([x,y])=>[nice((x-600)*geography.EAST_TERRAIN_SCALE),nice((y-600)*geography.EAST_TERRAIN_SCALE)])}));
 fs.writeFileSync('src/player-map-camp-roads.json',JSON.stringify({source:'Existing atlas road traces from registered gameplay terrain; world coordinates',roads:campRoads})+'\n');
 if(process.argv.includes('--export-camp-roads'))console.log('Exported '+campRoads.length+' camp road traces; terrain unchanged.');
 else{
 const ring=geography.CAMP_INNER_RING.map(([x,y])=>[x/geography.EAST_TERRAIN_SCALE+600,y/geography.EAST_TERRAIN_SCALE+600]);
 const centre=ring.reduce((c,p)=>[c[0]+p[0]/ring.length,c[1]+p[1]/ring.length],[0,0]);
 const ringGuide=ring.map(p=>{const d=distance(p,centre);return[p[0]+(p[0]-centre[0])/d*58,p[1]+(p[1]-centre[1])/d*58]});
 const ringPath=pathData(traceRoad(ringGuide,150,true),project,true);
 const roadPaths=roads.map(r=>({id:r.id,kind:r.kind,d:pathData(r.traced,project),w:(r.kind==='stone'?7.2:r.kind==='lane'?5.7:4.5)*width/3072}));
 roadPaths.push({id:'painted-camp-ring',kind:'stone',d:ringPath,w:8*width/3072});
 const roadGroups=roadPaths.map(p=>`<g><path d="${p.d}" stroke="#eed7a7" stroke-width="${p.w+6}" opacity=".48"/><path d="${p.d}" stroke="#51462e" stroke-width="${p.w+2.4}" opacity=".94"/><path d="${p.d}" stroke="#b09258" stroke-width="${p.w}"/><path d="${p.d}" stroke="#806236" stroke-width="${p.kind==='stone'?'1':'.8'}" stroke-dasharray="${p.kind==='stone'?'2 5':'3 8'}" opacity=".8"/></g>`).join('');
 const bridgeGroups=bridges.map(bridge=>{
  const a=project(bridge.from),b=project(bridge.to),dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),angle=Math.atan2(dy,dx)*180/Math.PI,w=bridge.width*unit;
  let ties='';for(let x=3;x<length-2;x+=7.5)ties+=`M${nice(x)} ${nice(-w*.46)}V${nice(w*.46)}`;
  return `<g transform="translate(${nice(a[0])} ${nice(a[1])}) rotate(${nice(angle)})"><path d="M-3 ${nice(-w*.65)}H${nice(length+3)}V${nice(w*.65)}H-3Z" fill="#48442d" opacity=".3" transform="translate(2 3)"/><path d="M0 ${nice(-w/2)}H${nice(length)}V${nice(w/2)}H0Z" fill="#c4a576" stroke="#443b27" stroke-width="1.8"/><path d="${ties}" stroke="#75603a" stroke-width=".9"/><path d="M-5 ${nice(-w*.65)}H${nice(length+5)}M-5 ${nice(w*.65)}H${nice(length+5)}" stroke="#51442b" stroke-width="2.1"/></g>`;
 }).join('');
 // Keep the same paper and engraved design, but bake each location's actual
 // low-frequency terrain colour into it. Subtle olive in the less ochre soil
 // harmonizes with the live moss/woodland ink; it does not define new regions.
 const paperRaw=await sharp(paperFile).resize(width,height,{fit:'fill'}).removeAlpha().composite([{input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#e7e3d7" opacity=".57"/></svg>`)}]).raw().toBuffer();
 assert.equal(paperRaw.length,width*height*3,'Paper texture remains RGB');
 const tintedPaper=Buffer.alloc(width*height*3);
 for(let i=0;i<width*height;i++){
  const r=terrainWash.colour[i*3],g=terrainWash.colour[i*3+1],moss=1-smooth((r-g-14)/50);
  const shift=[5-4*moss,2+4*moss,-3-5*moss];
  for(let c=0;c<3;c++)tintedPaper[i*3+c]=Math.round(clamp(paperRaw[i*3+c]*.43+terrainWash.colour[i*3+c]*.57+shift[c],0,255));
 }
 const colourSamples=[['Camp soil',[2400,2400]],['Northern approach',[3000,-400]],['Eastern ground',[9600,-2000]],['Western ground',[-5600,1000]],['Southern ground',[6400,10500]]].map(([name,source])=>{
  const [x,y]=project(source),i=(Math.floor(y)*width+Math.floor(x))*3;
  return{name,source,terrainRGB:[...terrainWash.colour.subarray(i,i+3)],atlasPaperRGB:[...tintedPaper.subarray(i,i+3)]};
 });
 const paper=await sharp(tintedPaper,{raw:{width,height,channels:3}}).png().toBuffer();
 // Order is intentional: water overlays road ink where no real crossing exists.
 // Every bridge is redrawn over water in the final engraved overlay.
 const withoutBridges=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><g fill="none" stroke-linejoin="round" stroke-linecap="round">${roadGroups}</g></svg>`);
 const finalDetails=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><g fill="none" stroke-linecap="round"><path d="${shoreHatches.join('')}" stroke="#5c5934" stroke-width="1.1" opacity=".58"/></g>${bridgeGroups}</svg>`);
 fs.mkdirSync('public/maps',{recursive:true});
 await sharp(paper).composite([{input:withoutBridges},{input:waterInk},{input:finalDetails}]).webp({quality:92,effort:6}).toFile('public/maps/world-illustrated.webp');
 const metadata={version:2,style:'Engraved terrain-colour atlas with ochre soil, olive woodland ink, turquoise water and traced routes',image:'/maps/world-illustrated.webp',pixels:{width,height},sourceBounds:bounds,worldBounds,
  sourceOriginOffset:600,sourceScale:geography.EAST_TERRAIN_SCALE,geography:{water:'Installed collision mask rows with exact batch ownership and every disjoint side span',mainMaskRows:maskRows,sideMaskSpans:sideSpans,mainBatches:masks.length,riverSections:26,sideFeatures:sides.length,bridges:bridges.length,
   roads:'WORLD_ROADS production geometry refined against registered painted road pixels within bounded corridors; camp ring traced from CAMP_INNER_RING and actual camp artwork',roadPaths:roadPaths.length,paintedRoadPatches:geography.ROAD_TERRAIN_PATCHES.length,roadTrace:tracing,terrainElevation:'None; only bank-distance relief',mutablePlacements:'Not baked; supplied by live current-layout overlay'},
  paper:{path:paperFile,sha256:crypto.createHash('sha256').update(fs.readFileSync(paperFile)).digest('hex')},terrainColour:{source:'/maps/world-terrain.webp',sha256:crypto.createHash('sha256').update(fs.readFileSync('public/maps/world-terrain.webp')).digest('hex'),registration:'Same source bounds as the geography; no coordinate transform or displacement',grid:terrainWash.grid,blur:terrainWash.blur,terrainBlend:.57,paperBlend:.43,waterExcludedFromGround:true,sampledWaterRGB:terrainWash.water,waterSamples:terrainWash.wetSamples,samples:colourSamples},bytes:fs.statSync('public/maps/world-illustrated.webp').size};
 // Published cartography can be reviewed against its exact geographic metadata.
 fs.writeFileSync('public/maps/world-illustrated.json',JSON.stringify(metadata,null,2)+'\n');
 const fixture={'logging-stream':{wet:[220,520],dry:[400,480]},'western-stream':{wet:[1180,780],dry:[1100,650]},'lower-lake':{wet:[1000,585],dry:[1000,950]},'southern-stream':{wet:[1140,350],dry:[820,480]}};
 const assertions=[];
 for(const feature of geography.RIVER_SIDE_FEATURES){const source=geography.RIVER_BATCHES[feature.batch].source;for(const [kind,p]of Object.entries(fixture[feature.id])){
  const q=project([source.x+p[0]/feature.nativeSize[0]*source.width,source.y+p[1]/feature.nativeSize[1]*source.height]);
  const drawn=!!water[Math.round(q[1])*width+Math.round(q[0])];assert.equal(drawn,kind==='wet',feature.id+' '+kind+' geographic mask matches gameplay');assertions.push(feature.id+':'+kind);
 }}
 const original=read('public/maps/world-terrain.json');for(const key of ['x','y','width','height'])assert(Math.abs(original.worldBounds[key]-worldBounds[key])<1e-7,'Atlas has identical registration '+key);
 let checked=0,bankSamplingDifferences=0,maxBankSamplingDistance=0;
 // Compare distributed samples against the runtime collision function, not
 // another copy of this renderer. Bridges intentionally remain drawn water
 // underneath their deck, whereas the game correctly makes them walkable.
 const onDeck=(x,y)=>bridges.some(b=>{const dx=b.to[0]-b.from[0],dy=b.to[1]-b.from[1],t=clamp(((x-b.from[0])*dx+(y-b.from[1])*dy)/(dx*dx+dy*dy));return Math.hypot(x-b.from[0]-t*dx,y-b.from[1]-t*dy)<=b.width/2+12});
 for(let sy=bounds.y+34.37;sy<bounds.y+bounds.height;sy+=80)for(let sx=bounds.x+39.17;sx<bounds.x+bounds.width;sx+=80){
  if(onDeck(sx,sy))continue;
  const [px,py]=project([sx,sy]),i=Math.floor(py)*width+Math.floor(px),drawn=!!water[i],blocked=geography.riverWaterBlocked((sx-600)*geography.EAST_TERRAIN_SCALE,(sy-600)*geography.EAST_TERRAIN_SCALE,0);checked++;
  if(drawn!==blocked){bankSamplingDifferences++;maxBankSamplingDistance=Math.max(maxBankSamplingDistance,Math.abs(shoreDistance[i]));}
 }
 assert(maxBankSamplingDistance<=2.5,`Cartographic water mismatch is confined to mask sampling at the bank (${maxBankSamplingDistance}px)`);
 metadata.checks={result:'pass',waterSamples:assertions,runtimeWaterSamples:checked,bankSamplingDifferences,maxBankSamplingDistance,registration:'Identical to existing terrain and live-player map coordinates'};
 fs.writeFileSync('public/maps/world-illustrated.json',JSON.stringify(metadata,null,2)+'\n');
 console.log(JSON.stringify(metadata,null,2));
 }
}finally{fs.rmSync(temporary,{recursive:true,force:true})}

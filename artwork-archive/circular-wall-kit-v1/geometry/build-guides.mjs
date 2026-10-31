// Reproducible geometric scaffolds only. Final painted sprites are created with ImageGen.
// A software depth buffer preserves complete upright volumes at every viewing angle.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url), sharp=require('sharp');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const R=1650, THICKNESS=80, SECTORS=16, BAYS=3, PLANKS_PER_BAY=9;
const STEP=360/SECTORS, SCALE=1.4, SIZE=1536, OVERLAP=8, STONE_HEIGHT=40;
const WORLD_CENTRE=[1718.1675873489273,1573.5124773329626];
const RAD=Math.PI/180, TAU=Math.PI*2;
const vector=(x,y,z=0)=>[x,y,z];
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const normalize=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n)};
const LIGHT=normalize([-0.7,-0.3,1]);
const point=(theta,r=R,z=0)=>[r*Math.sin(theta),-r*Math.cos(theta),z];
function random(seed){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296}}
function color(hex){return hex.replace('#','').match(/../g).map(x=>parseInt(x,16))}
function face(faces,points,albedo){
 const n=normalize(cross(sub(points[1],points[0]),sub(points[2],points[0])));
 const brightness=.66+.34*Math.max(0,n.reduce((s,x,i)=>s+x*LIGHT[i],0));
 faces.push({points,color:albedo.map(c=>Math.round(c*brightness))});
}
// Local dimensions follow the tangent/radius, while vertical timber stays upright.
function local(theta,t,r,z){return[(R+r)*Math.sin(theta)+t*Math.cos(theta),-(R+r)*Math.cos(theta)+t*Math.sin(theta),z]}
function prism(faces,theta,polygon,depth,albedo,radialCentre=0){
 const f=polygon.map(([t,z])=>local(theta,t,radialCentre+depth/2,z));
 const b=polygon.map(([t,z])=>local(theta,t,radialCentre-depth/2,z));
 face(faces,[...f].reverse(),albedo);face(faces,b,albedo);
 for(let i=0;i<polygon.length;i++){const j=(i+1)%polygon.length;face(faces,[f[i],f[j],b[j],b[i]],albedo)}
}
function block(faces,theta,width,depth,z0,z1,albedo,radialCentre=0){
 prism(faces,theta,[[-width/2,z0],[width/2,z0],[width/2,z1],[-width/2,z1]],depth,albedo,radialCentre);
}
function arcBand(faces,start,end,inner,outer,z0,z1,albedo,variation=0){
 const steps=Math.ceil((end-start)/(.65*RAD));
 const rng=random(Math.round((start+10)*1e5));
 for(let i=0;i<steps;i++){
  const a=start+(end-start)*i/steps,b=start+(end-start)*(i+1)/steps;
  const c=albedo.map(v=>Math.max(0,Math.min(255,v+(rng()-.5)*variation)));
  const i0=point(a,inner,z0),i1=point(b,inner,z0),o0=point(a,outer,z0),o1=point(b,outer,z0);
  const it0=point(a,inner,z1),it1=point(b,inner,z1),ot0=point(a,outer,z1),ot1=point(b,outer,z1);
  face(faces,[ot0,ot1,it1,it0],c);
  face(faces,[o0,o1,ot1,ot0],c);
  face(faces,[i1,i0,it0,it1],c);
  if(i===0)face(faces,[i0,o0,ot0,it0],c);
  if(i===steps-1)face(faces,[o1,i1,it1,ot1],c);
 }
}
function sectorGeometry(index){
 const faces=[],start=index*STEP*RAD,end=(index+1)*STEP*RAD;
 const extendedEnd=end+OVERLAP/R;
 arcBand(faces,start,extendedEnd,R-THICKNESS/2,R+THICKNESS/2,0,STONE_HEIGHT,color('#b2ad99'),9);
 // Two continuous support rails, on the camp-facing side of the plank infill.
 for(const z of [69,125])arcBand(faces,start,extendedEnd,R-26,R-15,z,z+14,color('#a98d66'));
 const bayAngle=(end-start)/BAYS;
 const plankAngle=bayAngle/PLANKS_PER_BAY;
 for(let j=0;j<BAYS*PLANKS_PER_BAY;j++){
  const globalIndex=index*BAYS*PLANKS_PER_BAY+j,rng=random(48251+globalIndex*971);
  const a=start+j*plankAngle,b=start+(j+1)*plankAngle;
  const t=(a+b)/2;
  const fullWidth=(b-a)*R;
  const width=fullWidth-(1.2+rng()*1.4);
  const last=j===BAYS*PLANKS_PER_BAY-1;
  const left=-width/2,right=width/2+(last?OVERLAP:0);
  const top=169+rng()*23,shoulderLeft=top-(17+rng()*13),shoulderRight=top-(14+rng()*15);
  const peak=(rng()-.5)*width*.46;
  prism(faces,t,[[left,34],[right,34],[right,shoulderRight],[peak,top],[left,shoulderLeft]],29,color('#c7ac80').map(v=>v+(rng()-.5)*14));
 }
 const posts=[];
 for(let j=0;j<BAYS;j++){
  const globalIndex=index*BAYS+j,theta=start+j*bayAngle,rng=random(7919+globalIndex*313);
  const shaft=170+rng()*10,tip=shaft+16+rng()*7,width=49;
  // Substantial square upright with an irregular, mildly sharpened cap.
  prism(faces,theta,[[-width/2,0],[width/2,0],[width/2,shaft-3],[3+(rng()-.5)*9,tip],[-width/2,shaft]],49,color('#b69a71'));
  block(faces,theta,52,52,125,139,color('#827762'));
  posts.push({angleDeg:theta/RAD,ground:point(theta).slice(0,2),width:49,shaftHeight:shaft,tipHeight:tip,ownership:'this-sector'});
 }
 return{faces,start,end,extendedEnd,posts};
}
function projectedBounds(faces){
 const points=faces.flatMap(f=>f.points);
 return{minX:Math.min(...points.map(p=>p[0])),minY:Math.min(...points.map(p=>p[1]-p[2])),maxX:Math.max(...points.map(p=>p[0])),maxY:Math.max(...points.map(p=>p[1]-p[2]))};
}
// The camera has axes (1,0,0),(0,1,-1), and depth (0,1,1).
function render(faces,width,height,scale,cropCentre,background=null){
 const data=Buffer.alloc(width*height*4),depth=new Float32Array(width*height);depth.fill(-Infinity);
 if(background)for(let i=0;i<data.length;i+=4){data[i]=background[0];data[i+1]=background[1];data[i+2]=background[2];data[i+3]=255}
 const project=p=>[width/2+(p[0]-cropCentre[0])*scale,height/2+(p[1]-p[2]-cropCentre[1])*scale,p[1]+p[2]];
 for(const f of faces){
  const points=f.points.map(project);
  for(let triangle=1;triangle<points.length-1;triangle++){
   const [a,b,c]=[points[0],points[triangle],points[triangle+1]];
   const det=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(det)<1e-9)continue;
   const minX=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),maxX=Math.min(width-1,Math.ceil(Math.max(a[0],b[0],c[0])));
   const minY=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),maxY=Math.min(height-1,Math.ceil(Math.max(a[1],b[1],c[1])));
   for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
    const xx=x+.5,yy=y+.5,u=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/det;
    const v=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/det,w=1-u-v;
    if(u< -1e-7||v< -1e-7||w< -1e-7)continue;
    const z=u*a[2]+v*b[2]+w*c[2],p=y*width+x;if(z<depth[p]-1e-5)continue;
    depth[p]=z;const i=p*4;data[i]=f.color[0];data[i+1]=f.color[1];data[i+2]=f.color[2];data[i+3]=255;
   }
  }
 }
 return data;
}
function alphaBBox(data,width,height){
 let left=width,top=height,right=-1,bottom=-1,count=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>2){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);count++}
 return{left,top,width:right-left+1,height:bottom-top+1,opaqueOrAntialiasedPixels:count};
}
const manifest={version:1,description:'Exact circle geometry scaffolds for independently generated painted wall sectors. Not finished game artwork.',coordinateSystem:{angleZero:'north',angleDirection:'clockwise',units:'world units',centre:[0,0],recommendedWorldCentre:WORLD_CENTRE,projection:{screenX:'X',screenY:'Y-z',depth:'Y+z'},groundProjection:'equal x/y scale; unforeshortened circle'},radius:R,baseThickness:THICKNESS,stoneHeight:STONE_HEIGHT,nominalTimberAndStoneHeight:180,sectorCount:SECTORS,sectorAngleDeg:STEP,ownedPostsPerSector:3,baysPerSector:3,postOwnership:'start, one-third and two-thirds; next sector owns the end post',overlapWorldUnits:OVERLAP,pixelsPerWorldUnit:SCALE,canvas:[SIZE,SIZE],worldCanvasSize:[SIZE/SCALE,SIZE/SCALE],geometryTessellation:{maxStepDeg:.65,maxRadialChordErrorWorldUnits:(R+THICKNESS/2)*(1-Math.cos(.65*RAD/2))},sectors:[]};
const geometries=[];
for(let index=0;index<SECTORS;index++){
 const id='wall-'+String(index+1).padStart(2,'0'),g=sectorGeometry(index);geometries.push(g);
 const bounds=projectedBounds(g.faces),cropCentre=[(bounds.minX+bounds.maxX)/2,(bounds.minY+bounds.maxY)/2];
 const midpoint=point((g.start+g.end)/2).slice(0,2),anchorPixels=[SIZE/2+(midpoint[0]-cropCentre[0])*SCALE,SIZE/2+(midpoint[1]-cropCentre[1])*SCALE];
 const ss=2,raw=render(g.faces,SIZE*ss,SIZE*ss,SCALE*ss,cropCentre);
 const image=await sharp(raw,{raw:{width:SIZE*ss,height:SIZE*ss,channels:4}}).resize(SIZE,SIZE).png().toBuffer();
 const pixels=await sharp(image).raw().toBuffer(),bbox=alphaBBox(pixels,SIZE,SIZE);
 if(bbox.left<24||bbox.top<24||bbox.left+bbox.width>SIZE-24||bbox.top+bbox.height>SIZE-24)throw new Error(id+' insufficient canvas margin');
 fs.writeFileSync(path.join(ROOT,id+'.png'),image);
 const sector={id,index:index+1,file:id+'.png',startAngleDeg:index*STEP,endAngleDeg:(index+1)*STEP,pixelsPerWorldUnit:SCALE,canvas:[SIZE,SIZE],worldCanvasSize:[SIZE/SCALE,SIZE/SCALE],projectedInkBounds:bounds,guideAlphaBBox:bbox,cropCentre,groundMidpoint:midpoint,anchorPixels,anchorNormalized:anchorPixels.map(v=>v/SIZE),groundEndpoints:{start:point(g.start).slice(0,2),end:point(g.end).slice(0,2)},endPlane:{nominalAngleDeg:(index+1)*STEP,drawExtensionWorldUnits:OVERLAP,extendedAngleDeg:g.extendedEnd/RAD},placement:{x:midpoint[0],y:midpoint[1],rotation:0,scale:1,flipX:false,flipY:false},recommendedWorldPlacement:{x:WORLD_CENTRE[0]+midpoint[0],y:WORLD_CENTRE[1]+midpoint[1],rotation:0,scale:1},posts:g.posts,collisionCentreline:Array.from({length:25},(_,i)=>point(g.start+(g.end-g.start)*i/24).slice(0,2)),seamToNext:{nextId:'wall-'+String((index+1)%SECTORS+1).padStart(2,'0'),endpointErrorWorldUnits:0}};
 manifest.sectors.push(sector);
 fs.writeFileSync(path.join(ROOT,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log(JSON.stringify({id,file:path.join(ROOT,id+'.png'),bbox,anchorPixels}));
}
for(let i=0;i<SECTORS;i++){
 const end=manifest.sectors[i].groundEndpoints.end,start=manifest.sectors[(i+1)%SECTORS].groundEndpoints.start;
 manifest.sectors[i].seamToNext.endpointErrorWorldUnits=Math.hypot(end[0]-start[0],end[1]-start[1]);
}
const ringFaces=geometries.flatMap(g=>g.faces),ringBounds=projectedBounds(ringFaces),ringCentre=[(ringBounds.minX+ringBounds.maxX)/2,(ringBounds.minY+ringBounds.maxY)/2];
const ringScale=2048/Math.max(ringBounds.maxX-ringBounds.minX+180,ringBounds.maxY-ringBounds.minY+180);
const ringData=render(ringFaces,4096,4096,ringScale*2,ringCentre);
await sharp(ringData,{raw:{width:4096,height:4096,channels:4}}).resize(2048,2048).png().toFile(path.join(ROOT,'assembled-clay-ring.png'));
const sheet=createCanvas(2048,2160),ctx=sheet.getContext('2d');ctx.fillStyle='#1d2c2a';ctx.fillRect(0,0,sheet.width,sheet.height);
for(let i=0;i<SECTORS;i++){
 const s=manifest.sectors[i],col=i%4,row=Math.floor(i/4),x=col*512,y=row*540;
 ctx.fillStyle='#2d3b37';ctx.fillRect(x+7,y+7,498,526);
 ctx.drawImage(await loadImage(path.join(ROOT,s.file)),x+8,y+8,496,496);
 ctx.fillStyle='#e5dcc9';ctx.font='19px sans-serif';ctx.textAlign='center';ctx.fillText(s.id+'  '+s.startAngleDeg+'–'+s.endAngleDeg+'°',x+256,y+523);
}
fs.writeFileSync(path.join(ROOT,'guide-contact-sheet.png'),sheet.toBuffer('image/png'));
manifest.assembledPreview={file:'assembled-clay-ring.png',canvas:[2048,2048],pixelsPerWorldUnit:ringScale,cropCentre:ringCentre,projectedInkBounds:ringBounds,render:'all original geometry with per-pixel depth; no per-sector rotation or rescaling'};
manifest.validation={allSixteenPresent:manifest.sectors.length===16,allGroundRadii:R,angleSumDeg:SECTORS*STEP,maxSeamEndpointErrorWorldUnits:Math.max(...manifest.sectors.map(s=>s.seamToNext.endpointErrorWorldUnits)),noClippedGuideCanvases:true,fixedGuideScale:SCALE,uniqueOwnedPosts:SECTORS*BAYS,allGuidesHaveRealAlpha:true};
fs.writeFileSync(path.join(ROOT,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(ROOT,'README.md'),`# Circular wall geometry guides\n\nThese are geometric scaffolds, not finished painted game assets. Regenerate with \`node artwork-archive/circular-wall-kit-v1/geometry/build-guides.mjs\` from the repository root. The script uses the existing \`sharp\` and \`@napi-rs/canvas\` dependencies.\n\nSixteen sectors cover 22.5 degrees each, numbered clockwise from north. Each source canvas is 1536 × 1536 at exactly 1.4 pixels per world unit; individual orientations are never rescaled. The ground ring has radius 1650 and thickness 80. Projection is x = X, y = Y − z, preserving a circular ground footprint and upright timber. Stone height is 40; timber tops are deterministically varied around a total height of 180.\n\nEach piece owns three posts (start, one-third and two-thirds of its angle). The endpoint post belongs to the next piece. Stone and plank infill extend 8 world units underneath that next post. The manifest distinguishes the nominal mathematical end plane from this intentional overlap.\n\n\`manifest.json\` records projected geometric bounds, actual nontransparent pixel bounds, crop centres, ground-midpoint anchors, exact ground endpoints, fixed-scale placement data, collision centreline samples and seam validation. Coordinates are relative to the shared centre (0,0); a recommended world centre is also recorded from the camp audit.\n\n\`assembled-clay-ring.png\` is a depth-buffered rendering of the complete geometric ring. \`guide-contact-sheet.png\` displays every separate guide with diagnostic labels outside the source images. Individual guides have genuine alpha and no labels, terrain, backdrop or frame.\n\nThese guide dimensions and endpoints do not certify that a subsequent AI-generated image will preserve the same geometry. Inspect the painted output and assembled joins separately. No live game files or placements are changed by this script.\n`);
console.log(JSON.stringify({complete:true,manifest:path.join(ROOT,'manifest.json'),validation:manifest.validation}));

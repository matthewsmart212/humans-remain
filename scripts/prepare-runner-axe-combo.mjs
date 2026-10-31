// Mechanical extraction and atlas packing of generated artwork only.
// No painting, rig warping, per-pose scaling, or replacement of approved legs.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const root=path.resolve(import.meta.dirname,'..');
const sourceDir=path.resolve(process.argv[2]||path.join(root,'../generated_images'));
const out=path.join(root,'public/survival/scrap-runner/axe-combo-v1');
const cell=384,anchor=[192,340],runtimeScale=.4,headTop=60;

// Measured hair landmarks exclude the moving axe and hands. Translation alone
// keeps each pose registered. Each view has ONE uniform packing scale.
const inputs=[
 {view:'down',source:'exec-28d179ef-f1cb-4dec-b3e9-25601a62cec0.png',packingScale:.55,
  hair:[[130,9,448,233],[515,9,837,230],[965,11,1280,239],[1403,11,1725,234],[44,441,357,670],[495,445,823,690],[957,452,1283,686],[1415,454,1726,681]],
  blade:[[83,124],[832,419],[1324,373],[1713,421],[397,535],[485,825],[919,797],[1438,781]]},
 {view:'down-right',source:'exec-520197cd-3ff4-44e9-8bf8-cc16498263dd.png',packingScale:.54,
  hair:[[118,17,433,231],[490,17,815,238],[938,17,1260,236],[1382,17,1705,237],[21,444,344,671],[519,444,849,676],[992,436,1318,667],[1384,444,1712,670]],
  blade:[[72,109],[831,419],[1305,399],[1716,413],[362,516],[456,790],[882,787],[1518,790]]},
 {view:'right',source:'exec-6625ffaf-2447-4675-a9c0-bf93b8675e21.png',packingScale:.56,
  hair:[[78,20,375,269],[486,24,797,265],[933,28,1240,275],[1384,24,1700,272],[64,456,376,689],[465,459,777,700],[916,454,1230,705],[1379,457,1699,704]],
  blade:[[77,102],[882,297],[1324,381],[1703,257],[320,822],[845,543],[1303,500],[1703,779]]},
 {view:'up-right',source:'exec-b2f3ba8d-5ba1-44d3-8972-ec04005fce0b.png',packingScale:.59,
  hair:[[160,35,437,271],[522,39,813,281],[944,40,1232,282],[1364,34,1662,276],[87,463,385,706],[498,467,792,712],[923,470,1219,727],[1370,466,1666,714]],
  blade:[[95,128],[892,153],[1295,197],[1690,392],[423,779],[851,503],[1277,484],[1680,803]]},
 {view:'up',source:'exec-3db1a0b1-ce87-4ab7-b409-7580a4a9059d.png',packingScale:.59,
  hair:[[118,87,389,315],[500,78,785,320],[932,78,1217,319],[1345,84,1634,320],[47,506,332,743],[549,502,839,747],[973,496,1262,744],[1376,499,1661,749]],
  blade:[[130,82],[877,167],[1297,285],[1702,453],[283,494],[436,606],[897,787],[1719,810]]},
];

function extract(data,width,height){
 const total=width*height,labels=new Int32Array(total),queue=new Int32Array(total),components=[];
 let serial=0;
 for(let p=0;p<total;p++){
  if(labels[p]||data[p*4+3]<128)continue;
  const id=++serial;let head=0,tail=0,xSum=0,ySum=0;
  queue[tail++]=p;labels[p]=id;
  while(head<tail){
   const at=queue[head++],x=at%width,y=Math.floor(at/width);xSum+=x;ySum+=y;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const nx=x+dx,ny=y+dy,next=ny*width+nx;
    if(nx<0||nx>=width||ny<0||ny>=height||labels[next]||data[next*4+3]<128)continue;
    labels[next]=id;queue[tail++]=next;
   }
  }
  components.push({id,count:tail,cx:xSum/tail,cy:ySum/tail});
 }
 const main=components.sort((a,b)=>b.count-a.count).slice(0,8)
  .sort((a,b)=>Math.floor(a.cy/(height/2))-Math.floor(b.cy/(height/2))||a.cx-b.cx);
 if(main.length!==8||main.some(p=>p.count<50000))throw Error('Expected eight separate upper-body silhouettes');
 const remap=new Map(main.map((c,i)=>[c.id,i+1])),distance=new Uint8Array(total);distance.fill(255);
 let head=0,tail=0;
 for(let p=0;p<total;p++){labels[p]=remap.get(labels[p])||0;if(labels[p]){queue[tail++]=p;distance[p]=0;}}
 while(head<tail){
  const at=queue[head++],x=at%width,y=Math.floor(at/width);
  if(distance[at]>=6)continue;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   const nx=x+dx,ny=y+dy,next=ny*width+nx;
   if(nx<0||nx>=width||ny<0||ny>=height||labels[next])continue;
   labels[next]=labels[at];distance[next]=distance[at]+1;queue[tail++]=next;
  }
 }
 // Preserve source alpha through the entire antialiased silhouette. Ownership
 // also retains axes extending beyond nominal source cell borders.
 for(let p=0;p<total;p++)if(!data[p*4+3])labels[p]=0;
 return main.map((_,i)=>{
  let left=width,top=height,right=0,bottom=0,count=0;
  for(let p=0;p<total;p++)if(labels[p]===i+1){const x=p%width,y=Math.floor(p/width);left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);count++;}
  const w=right-left+1,h=bottom-top+1,rgba=Buffer.alloc(w*h*4);
  for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)if(labels[y*width+x]===i+1)
   data.copy(rgba,((y-top)*w+x-left)*4,(y*width+x)*4,(y*width+x)*4+4);
  return {data:rgba,width:w,height:h,left,top,count};
 });
}

fs.mkdirSync(out,{recursive:true});
const views={},sources=[];
for(const spec of inputs){
 const {data,info}=await sharp(path.join(sourceDir,spec.source)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const parts=extract(data,info.width,info.height),composite=[],frames=[],blade=[];
 for(let i=0;i<8;i++){
  const p=parts[i],col=i%4,row=Math.floor(i/4),hair=spec.hair[i],origin=[(hair[0]+hair[2])/2,hair[1]],scale=spec.packingScale;
  const left=Math.round(anchor[0]+(p.left-origin[0])*scale),top=Math.round(headTop+(p.top-origin[1])*scale);
  const width=Math.round(p.width*scale),height=Math.round(p.height*scale);
  if(left<8||top<8||left+width>cell-8||top+height>cell-8)throw Error(`Insufficient padding: ${spec.view} frame ${i}: ${left},${top},${width},${height}`);
  const input=await sharp(p.data,{raw:{width:p.width,height:p.height,channels:4}}).resize(width,height,{kernel:'lanczos3'}).png().toBuffer();
  composite.push({input,left:col*cell+left,top:row*cell+top});
  const bladePoint=[anchor[0]+(spec.blade[i][0]-origin[0])*scale,headTop+(spec.blade[i][1]-origin[1])*scale].map(n=>Number(n.toFixed(2)));
  blade.push(bladePoint);
  frames.push({frame:i,crop:[col*cell,row*cell,cell,cell],sourceBounds:[p.left,p.top,p.width,p.height],sourceHairBox:hair,contentBounds:[left,top,width,height],blade:bladePoint,alphaPixels:p.count});
 }
 const file=`${spec.view}.webp`;
 await sharp({create:{width:cell*4,height:cell*2,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
  .composite(composite).webp({quality:94,alphaQuality:100,effort:6}).toFile(path.join(out,file));
 views[spec.view]={image:`/survival/scrap-runner/axe-combo-v1/${file}`,blade};
 sources.push({view:spec.view,source:spec.source,packingScale:spec.packingScale,bytes:fs.statSync(path.join(out,file)).size,frames});
}
const metadata={
 version:1,cell:[cell,cell],anchor,scale:runtimeScale,columns:4,rows:2,
 poses:['cut-windup','cut-contact','cut-followthrough','cut-recovery','return-windup','return-contact','return-followthrough','return-ready'],
 cuts:[[0,1,2,3],[4,5,6,7]],views,
 directions:{down:{view:'down',mirror:false},'down-right':{view:'down-right',mirror:false},right:{view:'right',mirror:false},'up-right':{view:'up-right',mirror:false},up:{view:'up',mirror:false},'up-left':{view:'up-right',mirror:true},left:{view:'right',mirror:true},'down-left':{view:'down-right',mirror:true}},
 layers:{upperBody:true,includesAxe:true,includesLegs:false,headTop,nominalHipWorldY:-30,bladeCoordinates:'Cell-local pixels. Convert (point-anchor)*scale and negate world x when mirrored.'},
 packing:{registration:'Translation-only measured hair center and top; one uniform packing scale per view, never per-pose scale.',transparentBackground:true},
 sources,
};
fs.writeFileSync(path.join(out,'atlas.json'),JSON.stringify(metadata,null,2)+'\n');
console.log(JSON.stringify({cell:metadata.cell,anchor,scale:runtimeScale,frames:sources.length*8,bytes:sources.reduce((n,s)=>n+s.bytes,0),sources:sources.map(({view,bytes})=>({view,bytes}))},null,2));

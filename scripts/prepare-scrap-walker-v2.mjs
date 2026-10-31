// Mechanical extraction/packing only: generated artwork pixels are not repainted.
// All 40 poses use ONE scale. Translation-only torso registration removes
// generated grid drift; no per-frame fitting or stretching is applied.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');

const ROOT=path.resolve(import.meta.dirname,'..');
const GENERATED=path.resolve(ROOT,'../generated_images');
const OUT=path.join(ROOT,'public/survival/scrap-walker-v2');
const sheets=[
  ['down-left','exec-680d08dc-1b9c-4594-9a20-92bb6156c24f.png'],
  ['down','exec-16c49fd3-6e44-4296-b078-8aa07c12d3d2.png'],
  ['right','exec-5b1e80e3-c132-4111-9ad3-2566d196f252.png'],
  ['up-right','exec-6bd59b16-2f86-4eec-9c09-53a8dac4771c.png'],
  ['up','exec-39ee22f0-1099-44e9-89fe-575eb4705dbf.png'],
];
const CELL=384,SCALE=.68,ANCHOR=[192,300],SOURCE_ORIGIN=[235,365];
fs.mkdirSync(OUT,{recursive:true});

function torsoRegistration(data,width,direction){
  // The selected ROI contains the immutable orange top plate, not moving feet.
  const roi=direction==='right'?[215,120,335,220]:direction==='up-right'?[190,90,335,180]:[120,95,320,185];
  const landmarks=[];
  for(let frame=0;frame<4;frame++){
    let count=0,xSum=0,ySum=0;
    for(let y=roi[1];y<roi[3];y++)for(let x=roi[0];x<roi[2];x++){
      const i=(y*width+Math.round(frame*width/4)+x)*4;
      const [r,g,b,a]=data.subarray(i,i+4);
      if(a>128&&r>90&&g>45&&r>g*1.32&&g>b*1.4){count++;xSum+=x;ySum+=y;}
    }
    if(count<1000)throw Error(`Missing stable armor landmark: ${direction} frame ${frame}`);
    landmarks.push({x:xSum/count,y:ySum/count});
  }
  const target=landmarks.reduce((p,c)=>[p[0]+c.x/4,p[1]+c.y/4],[0,0]);
  return landmarks.map(p=>({x:target[0]-p.x,y:target[1]-p.y}));
}

// Generated frames sometimes extend across invisible grid boundaries. Label the
// eight opaque cores, then grow their ownership through existing alpha pixels.
// This extracts complete claws without cutting through the nominal cell edge.
function extractRobots(data,width,height){
  const total=width*height,labels=new Int32Array(total),queue=new Int32Array(total),components=[];
  let serial=0;
  for(let p=0;p<total;p++){
    if(labels[p]||data[p*4+3]<128)continue;
    const id=++serial;let head=0,tail=0,x1=width,y1=height,x2=0,y2=0,sumX=0,sumY=0;
    queue[tail++]=p;labels[p]=id;
    while(head<tail){
      const at=queue[head++],x=at%width,y=Math.floor(at/width);
      x1=Math.min(x1,x);x2=Math.max(x2,x);y1=Math.min(y1,y);y2=Math.max(y2,y);sumX+=x;sumY+=y;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const nx=x+dx,ny=y+dy,next=ny*width+nx;
        if(nx<0||nx>=width||ny<0||ny>=height||labels[next]||data[next*4+3]<128)continue;
        labels[next]=id;queue[tail++]=next;
      }
    }
    components.push({id,count:tail,box:[x1,y1,x2,y2],cx:sumX/tail,cy:sumY/tail});
  }
  const main=components.sort((a,b)=>b.count-a.count).slice(0,8)
    .sort((a,b)=>Math.floor(a.cy/(height/2))-Math.floor(b.cy/(height/2))||a.cx-b.cx);
  if(main.length!==8||main.some(c=>c.count<50000))throw Error('Expected eight separate complete robots');
  const remap=new Map(main.map((c,i)=>[c.id,i+1])),distance=new Uint8Array(total);distance.fill(255);let head=0,tail=0;
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
  // Preserve the original alpha (including detached antialiasing) within six
  // pixels of the real opaque silhouette; omit isolated generation noise.
  for(let p=0;p<total;p++)if(!data[p*4+3])labels[p]=0;
  const result=[];
  for(let i=0;i<8;i++){
    let l=width,t=height,r=0,b=0,count=0;
    for(let p=0;p<total;p++)if(labels[p]===i+1){const x=p%width,y=Math.floor(p/width);l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);count++;}
    if(l===0||t===0||r===width-1||b===height-1)throw Error('Source artwork touches sheet edge');
    const w=r-l+1,h=b-t+1,rgba=Buffer.alloc(w*h*4);
    for(let y=t;y<=b;y++)for(let x=l;x<=r;x++)if(labels[y*width+x]===i+1){
      data.copy(rgba,((y-t)*w+x-l)*4,(y*width+x)*4,(y*width+x)*4+4);
    }
    result.push({data:rgba,width:w,height:h,left:l,top:t,count});
  }
  return result;
}

const report=[];
for(const [direction,source] of sheets){
  const {data,info}=await sharp(path.join(GENERATED,source)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const parts=extractRobots(data,info.width,info.height),registration=torsoRegistration(data,info.width,direction),composite=[],bounds=[];
  for(let i=0;i<8;i++){
    const p=parts[i],col=i%4,row=Math.floor(i/4);
    const localX=p.left-col*info.width/4,localY=p.top-row*info.height/2;
    // Apply the same column correction to the attack row. This preserves the
    // original attack pose's displacement relative to its walking counterpart.
    const left=Math.round(ANCHOR[0]+(localX-SOURCE_ORIGIN[0]+registration[col].x)*SCALE);
    const top=Math.round(ANCHOR[1]+(localY-SOURCE_ORIGIN[1]+registration[col].y)*SCALE);
    const width=Math.round(p.width*SCALE),height=Math.round(p.height*SCALE);
    if(left<8||top<8||left+width>CELL-8||top+height>CELL-8)throw Error(`Insufficient padding: ${direction} ${i}: ${[left,top,width,height]}`);
    const input=await sharp(p.data,{raw:{width:p.width,height:p.height,channels:4}}).resize(width,height,{kernel:'lanczos3'}).png().toBuffer();
    composite.push({input,left:col*CELL+left,top:row*CELL+top});
    bounds.push({frame:i,sourceBounds:[p.left,p.top,p.width,p.height],contentBounds:[left,top,width,height],registrationOffset:[registration[col].x,registration[col].y].map(v=>Number(v.toFixed(3))),alphaPixels:p.count});
  }
  const filename=`${direction}.webp`;
  await sharp({create:{width:CELL*4,height:CELL*2,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
    .composite(composite).webp({quality:94,alphaQuality:100,effort:6}).toFile(path.join(OUT,filename));
  report.push({direction,source,filename,bytes:fs.statSync(path.join(OUT,filename)).size,frames:bounds});
}
const atlas=direction=>`/survival/scrap-walker-v2/${direction}.webp`;
const metadata={
  version:2,cell:[CELL,CELL],anchor:ANCHOR,columns:4,rows:2,
  walkFrames:[0,1,2,3],attackFrames:[4,5,6,7],idleFrame:3,
  directions:{
    down:{image:atlas('down'),mirror:false},
    'down-right':{image:atlas('down-left'),mirror:true},
    right:{image:atlas('right'),mirror:false},
    'up-right':{image:atlas('up-right'),mirror:false},
    up:{image:atlas('up'),mirror:false},
    'up-left':{image:atlas('up-right'),mirror:true},
    left:{image:atlas('right'),mirror:true},
    'down-left':{image:atlas('down-left'),mirror:false},
  },
  packing:{scale:SCALE,sourceOrigin:SOURCE_ORIGIN,perFrameScale:false,framePositions:'Translation-only registration using the orange torso plate; each column correction also applies to the attack row to preserve attack displacement. Complete alpha-connected artwork extracted before packing.'},
  sources:report,
};
fs.writeFileSync(path.join(OUT,'atlas.json'),JSON.stringify(metadata,null,2)+'\n');
console.log(JSON.stringify({cell:metadata.cell,anchor:ANCHOR,bytes:report.reduce((n,r)=>n+r.bytes,0),atlases:report.map(({direction,filename,bytes})=>({direction,filename,bytes}))},null,2));

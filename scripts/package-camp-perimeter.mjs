/** Mechanical registration of generated wall sprites. No procedural repainting. */
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require('sharp'),{createCanvas,loadImage}=require('@napi-rs/canvas');
const root='artwork-archive/camp-perimeter-v3',out='public/survival/camp-perimeter-v3';fs.mkdirSync(out,{recursive:true});
const files={'wall-horizontal':'exec-e552446b-e8a0-48fb-9997-44b02ca51439.png','wall-diagonal':'exec-3dee703b-de42-44bb-95e8-110600e71f49.png','wall-vertical':'exec-61dd8144-5769-4b51-803f-f509151b3e6f.png','gate-leaf':'exec-0110543a-c6d7-483c-b4dc-6bd7a6c992b4.png','joint-post':'exec-1f3421c8-37d0-4806-9d07-64c0e39e5e24.png'};
for(const [key,file] of Object.entries(files)){const dest=root+'/'+key+'.png';if(!fs.existsSync(dest))fs.copyFileSync('/workspace/scratch/23bb648437fc/generated_images/'+file,dest);}
// Clockwise closed ring. Each marked edge is the sole opening at an existing path.
const nodes=[
 [935,460],[1200,160],[1650,-60],[2150,-120],[2680,-60],[2810,300],[2830,540],
 [3070,740],[3210,1100],[3270,1450],[3330,1830],[3130,2170],[2840,2430],
 [2600,2670],[2280,2840],[1910,2875],[1610,2845],[1270,3000],[880,2920],
 [640,2720],[440,2570],[330,2400],[460,2205],[350,1905],[365,1560],[480,1130],[580,890],[715,680]
];
const gates=new Map([[6,'northeast'],[12,'southeast'],[15,'south'],[18,'southwest'],[22,'west'],[27,'northwest']]);
const artwork=[],placements=[],traces=[];
const meta={horizontal:{a:[85,600],b:[2080,600],z:490,length:480},diagonal:{a:[310,487],b:[1225,953],z:420,length:315},vertical:{a:[456,1410],b:[582,795],z:700,length:155}};
const images={};for(const k of Object.keys(meta))images[k]=await loadImage(root+'/wall-'+k+'.png');
const postSrc=await sharp(root+'/joint-post.png').resize({height:640}).webp({quality:94}).toBuffer();fs.writeFileSync(out+'/joint-post.webp',postSrc);
const pm=await sharp(postSrc).metadata(),postWidth=pm.width/pm.height*172;
artwork.push({id:'camp_stockade_post_v3',name:'Weathered stockade joint',image:'/survival/camp-perimeter-v3/joint-post.webp',size:[pm.width,pm.height],width:postWidth,height:172,anchor:[.51,.92],kind:'post',segments:[]});
const leafBuf=await sharp(root+'/gate-leaf.png').extract({left:50,top:110,width:1300,height:905}).resize({width:640}).webp({quality:95}).toBuffer();fs.writeFileSync(out+'/gate-leaf.webp',leafBuf);
const leafMeta=await sharp(leafBuf).metadata();
function place(id,assetId,x,y,extra={}){placements.push({id:'camp-perimeter-v3-'+id,assetId,x,y,scale:1,locked:true,solid:true,allowTransparency:true,roof:'auto',role:'prop',...extra});}
for(let i=0;i<nodes.length;i++){
 let [sx,sy]=nodes[i],[ex,ey]=nodes[(i+1)%nodes.length],dx=ex-sx,dy=ey-sy,len=Math.hypot(dx,dy);
 traces.push({a:[sx,sy],b:[ex,ey],gate:gates.get(i)||null});
 if(gates.has(i)){
  const name=gates.get(i),id='camp_gate_'+name+'_v3',padding=190,left=Math.min(sx,ex)-padding,top=Math.min(sy,ey)-padding,width=Math.abs(dx)+padding*2,height=Math.abs(dy)+padding*2;
  // Closed preview made from the same rigged leaf and joint-post artwork used at runtime.
  const canvas=createCanvas(Math.ceil(width*2),Math.ceil(height*2)),c=canvas.getContext('2d'),leaf=await loadImage(leafBuf),post=await loadImage(postSrc);
  const a=[sx-left,sy-top],b=[ex-left,ey-top];
  const drawLeaf=(u,v,mirror)=>{c.save();c.setTransform((v[0]-u[0])*2/leaf.width,(v[1]-u[1])*2/leaf.width,0,240/leaf.height,u[0]*2,u[1]*2-240);if(mirror){c.translate(leaf.width,0);c.scale(-1,1);}c.drawImage(leaf,0,0);c.restore()};
  const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];drawLeaf(a,mid,false);drawLeaf(mid,b,true);
  for(const p of [a,b])c.drawImage(post,(p[0]-postWidth*.51)*2,(p[1]-172*.92)*2,postWidth*2,344);
  const preview='gate-'+name+'.webp';await sharp(canvas.toBuffer('image/png')).webp({quality:94}).toFile(out+'/'+preview);
  artwork.push({id,name:name[0].toUpperCase()+name.slice(1)+' camp gate',image:'/survival/camp-perimeter-v3/'+preview,size:[canvas.width,canvas.height],width,height,anchor:[.5,.5],kind:'gate',segments:[],gate:{a:[a[0]/width,a[1]/height],b:[b[0]/width,b[1]/height],height:120,leaf:'/survival/camp-perimeter-v3/gate-leaf.webp',leafSize:[leafMeta.width,leafMeta.height],post:'/survival/camp-perimeter-v3/joint-post.webp',postSize:[pm.width,pm.height],postWidth,postHeight:172}});
  place('gate-'+name,id,left+width/2,top+height/2);continue;
 }
 // Reorder only the sprite mapping; ring trace and module endpoint identity stay intact.
 if(sx>ex){[sx,ex]=[ex,sx];[sy,ey]=[ey,sy];dx=ex-sx;dy=ey-sy}
 const slope=Math.abs(dy/dx),kind=slope>2.2?'vertical':slope>.32?'diagonal':'horizontal',spec=meta[kind],image=images[kind],count=Math.max(1,Math.round(len/spec.length)),vx=dx/count,vy=dy/count;
 if(kind==='vertical'){
  // Near edge-on runs need the thickness of upright logs. Register repeated
  // generated post sprites along the same baseline; never squash them flat.
  const width=Math.ceil(Math.abs(vx)+130),height=Math.ceil(Math.abs(vy)+200),canvas=createCanvas(width*2,height*2),c=canvas.getContext('2d'),post=await loadImage(postSrc),start=[65,170-Math.min(0,vy)],end=[65+vx,170+Math.max(0,vy)],steps=Math.max(2,Math.ceil(Math.hypot(vx,vy)/23));
  const logs=Array.from({length:steps+1},(_,j)=>({x:start[0]+vx*j/steps,y:start[1]+vy*j/steps})).sort((a,b)=>a.y-b.y);
  for(const q of logs){const h=146,w=post.width/post.height*h;c.drawImage(post,(q.x-w*.51)*2,(q.y-h*.92)*2,w*2,h*2)}
  const anchor=[(start[0]+end[0])/2/width,(start[1]+end[1])/2/height],id='camp_stockade_run_'+i+'_v3',name='stockade-run-'+i+'.webp';await sharp(canvas.toBuffer('image/png')).webp({quality:94}).toFile(out+'/'+name);
  artwork.push({id,name:'Worn stockade · section '+(i+1),image:'/survival/camp-perimeter-v3/'+name,size:[canvas.width,canvas.height],width,height,anchor,kind:'wall',segments:[{x:-vx/2,y:-vy/2,ex:vx/2,ey:vy/2,r:14}]});
  for(let j=0;j<count;j++)place('wall-'+i+'-'+j,id,sx+(j+.5)*vx,sy+(j+.5)*vy);continue;
 }
 let A=[...spec.a],B=[...spec.b],flip=(B[1]-A[1])*vy<0;if(flip){A[0]=image.width-A[0];B[0]=image.width-B[0];[A,B]=[B,A]}
 const a=vx/(B[0]-A[0]),d=130/spec.z,b=(vy-d*(B[1]-A[1]))/(B[0]-A[0]);
 const corners=[[0,0],[image.width,0],[0,image.height],[image.width,image.height]].map(([x,y])=>[a*x,b*x+d*y]),minX=Math.min(...corners.map(p=>p[0])),minY=Math.min(...corners.map(p=>p[1])),maxX=Math.max(...corners.map(p=>p[0])),maxY=Math.max(...corners.map(p=>p[1]));
 const canvas=createCanvas(Math.ceil((maxX-minX)*2)+4,Math.ceil((maxY-minY)*2)+4),c=canvas.getContext('2d');c.setTransform(a*2,b*2,0,d*2,2-minX*2,2-minY*2);if(flip){c.translate(image.width,0);c.scale(-1,1)}c.drawImage(image,0,0);
 const start=[a*A[0]-minX+1,b*A[0]+d*A[1]-minY+1],end=[start[0]+vx,start[1]+vy],width=canvas.width/2,height=canvas.height/2,anchor=[(start[0]+end[0])/2/width,(start[1]+end[1])/2/height];
 const id='camp_stockade_run_'+i+'_v3',name='stockade-run-'+i+'.webp';await sharp(canvas.toBuffer('image/png')).webp({quality:94}).toFile(out+'/'+name);
 artwork.push({id,name:'Worn stockade · section '+(i+1),image:'/survival/camp-perimeter-v3/'+name,size:[canvas.width,canvas.height],width,height,anchor,kind:'wall',segments:[{x:-vx/2,y:-vy/2,ex:vx/2,ey:vy/2,r:14}]});
 for(let j=0;j<count;j++)place('wall-'+i+'-'+j,id,sx+(j+.5)*vx,sy+(j+.5)*vy);
}
// Joint caps hide seam ends. Gateposts belong to the rig, not duplicate placements.
const gateNodes=new Set([...gates.keys()].flatMap(i=>[i,(i+1)%nodes.length]));
for(let i=0;i<nodes.length;i++)if(!gateNodes.has(i))place('joint-'+i,'camp_stockade_post_v3',...nodes[i],{solid:false,allowTransparency:true});
fs.writeFileSync('src/camp-perimeter-art.json',JSON.stringify(artwork,null,2)+'\n');fs.writeFileSync('src/camp-perimeter-layout.json',JSON.stringify({traces,placements},null,2)+'\n');
const rows=JSON.parse(fs.readFileSync('src/base-catalogue.json'));for(const row of rows){const a=artwork.find(a=>a.id===row.id);if(a)row.artPreview={worldWidth:a.width};}fs.writeFileSync('src/base-catalogue.json',JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify({assets:artwork.length,walls:placements.filter(p=>p.id.includes('-wall-')).length,gates:gates.size,joints:nodes.length-gateNodes.size}));

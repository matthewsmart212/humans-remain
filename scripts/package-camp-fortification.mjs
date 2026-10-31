/** Register painted timber bays around a circular camp, with gates at road crossings. */
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require('sharp'),{createCanvas,loadImage}=require('@napi-rs/canvas');
const root='artwork-archive/camp-fortification-v4',out='public/survival/camp-fortification-v4',url='/survival/camp-fortification-v4/';
// Only this script's disposable runtime exports are replaced.
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
// A true circle replaces the old polygon. Road centre-lines determine the gates;
// short chords follow the circumference without long flat runs or corner towers.
const circle={center:[1780,1480],radius:1530},[cx,cy]=circle.center,r=circle.radius;
const roads=[
 ['northeast',[2950,640],[300,-330]],['southeast',[2720,2550],[330,330]],
 ['south',[1760,2860],[-140,350]],['southwest',[760,2820],[-300,300]],
 ['west',[405,2055],[-350,80]],['northwest',[825,570],[-320,-300]],
];
const gates=roads.map(([name,p,v])=>{const q=[p[0]-cx,p[1]-cy],a=v[0]**2+v[1]**2,b=2*(q[0]*v[0]+q[1]*v[1]),c=q[0]**2+q[1]**2-r*r,t=(-b+Math.sqrt(b*b-4*a*c))/(2*a),x=p[0]+t*v[0],y=p[1]+t*v[1];return{name,angle:(Math.atan2(y-cy,x-cx)+Math.PI*2)%(Math.PI*2),half:Math.asin(165/r),road:{point:p,direction:v}}}).sort((a,b)=>a.angle-b.angle);
const point=a=>[cx+r*Math.cos(a),cy+r*Math.sin(a)];
const traces=[];
for(let i=0;i<gates.length;i++){
 const g=gates[i],next=gates[(i+1)%gates.length],start=g.angle+g.half,end=next.angle-next.half+(i===gates.length-1?Math.PI*2:0);
 traces.push({a:point(g.angle-g.half),b:point(start),gate:g.name});
 const count=Math.ceil((end-start)*r/330);
 for(let j=0;j<count;j++)traces.push({a:point(start+(end-start)*j/count),b:point(start+(end-start)*(j+1)/count),gate:null});
}
const specs={
 horizontal:{a:[244,746],b:[1305,746],z:630,length:440},
 diagonal:{a:[244,533],b:[1295,858],z:500,length:370},
 steep:{a:[335,550],b:[568,1365],z:650,length:340},
 vertical:{a:[547,520],b:[470,1386],z:650,length:330},
};
const images={};for(const k of Object.keys(specs))images[k]=await loadImage(root+'/wall-'+k+'.png');
const art=[],placements=[];
const postBuf=await sharp(root+'/joint-post.png').extract({left:110,top:0,width:900,height:1536}).resize({height:900}).webp({quality:96}).toBuffer();
fs.writeFileSync(out+'/joint-post.webp',postBuf);
const pm=await sharp(postBuf).metadata(),postHeight=282,postWidth=pm.width/pm.height*postHeight,post=await loadImage(postBuf);
art.push({id:'camp_stockade_post_v3',name:'Heavy weathered fortification pier',image:url+'joint-post.webp',size:[pm.width,pm.height],width:postWidth,height:postHeight,anchor:[.51,.92],kind:'post',rise:260,segments:[]});
const leafBuf=await sharp(root+'/gate-leaf.png').extract({left:53,top:27,width:1230,height:1114}).resize({width:768}).webp({quality:96}).toBuffer();
fs.writeFileSync(out+'/gate-leaf.webp',leafBuf);
const lm=await sharp(leafBuf).metadata(),leaf=await loadImage(leafBuf),gateHeight=213;
function place(id,assetId,x,y,extra={}){placements.push({id:'camp-perimeter-v3-'+id,assetId,x,y,scale:1,locked:true,solid:true,allowTransparency:true,roof:'auto',role:'prop',...extra})}
const gateNodes=new Set();
for(let i=0;i<traces.length;i++){
 const trace=traces[i];let [sx,sy]=trace.a,[ex,ey]=trace.b,dx=ex-sx,dy=ey-sy,len=Math.hypot(dx,dy);
 if(trace.gate){
  gateNodes.add(i);gateNodes.add((i+1)%traces.length);
  const name=trace.gate,id='camp_gate_'+name+'_v3',padding=290,left=Math.min(sx,ex)-padding,top=Math.min(sy,ey)-padding,width=Math.abs(dx)+padding*2,height=Math.abs(dy)+padding*2;
  const c=createCanvas(Math.ceil(width*2),Math.ceil(height*2)),ctx=c.getContext('2d'),a=[sx-left,sy-top],b=[ex-left,ey-top],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];
  for(const [u,v] of [[a,mid],[b,mid]]){ctx.save();ctx.setTransform((v[0]-u[0])*2/leaf.width,(v[1]-u[1])*2/leaf.width,0,gateHeight*2/leaf.height,u[0]*2,(u[1]-gateHeight)*2);ctx.drawImage(leaf,0,0);ctx.restore()}
  for(const v of [a,b])ctx.drawImage(post,(v[0]-postWidth*.51)*2,(v[1]-postHeight*.92)*2,postWidth*2,postHeight*2);
  const file='gate-'+name+'.webp';await sharp(c.toBuffer('image/png')).webp({quality:96}).toFile(out+'/'+file);
  art.push({id,name:name[0].toUpperCase()+name.slice(1)+' timber fort gate',image:url+file,size:[c.width,c.height],width,height,anchor:[.5,.5],kind:'gate',rise:gateHeight,segments:[],gate:{a:[a[0]/width,a[1]/height],b:[b[0]/width,b[1]/height],height:gateHeight,leaf:url+'gate-leaf.webp',leafSize:[lm.width,lm.height],post:url+'joint-post.webp',postSize:[pm.width,pm.height],postWidth,postHeight}});
  place('gate-'+name,id,left+width/2,top+height/2);continue;
 }
 const slope=Math.abs(dy/(dx||.001)),kind=slope>4?'vertical':slope>1.4?'steep':slope>.23?'diagonal':'horizontal',spec=specs[kind],im=images[kind];
 // Fewer, substantial bays replace the thin repeated stakes. Different views
 // preserve visible timber thickness; the near-vertical view is painted in full.
 const count=1;
 let A=[...spec.a],B=[...spec.b],flip=false;
 if(kind==='vertical'){
  if(sy>ey){[sx,ex]=[ex,sx];[sy,ey]=[ey,sy]}
  if((ex-sx)*(B[0]-A[0])<0){flip=true;A[0]=im.width-A[0];B[0]=im.width-B[0]}
 }else{
  if(sx>ex){[sx,ex]=[ex,sx];[sy,ey]=[ey,sy]}
  if((ey-sy)*(B[1]-A[1])<0){flip=true;A[0]=im.width-A[0];B[0]=im.width-B[0];[A,B]=[B,A]}
 }
 const vx=(ex-sx)/count,vy=(ey-sy)/count,rise=235;
 let a,b,c,d;
 if(kind==='vertical'){a=rise/spec.z;b=0;d=vy/(B[1]-A[1]);c=(vx-a*(B[0]-A[0]))/(B[1]-A[1])}
 else{a=vx/(B[0]-A[0]);d=rise/spec.z;c=0;b=(vy-d*(B[1]-A[1]))/(B[0]-A[0])}
 const corners=[[0,0],[im.width,0],[0,im.height],[im.width,im.height]].map(([x,y])=>[a*x+c*y,b*x+d*y]);
 const left=Math.min(...corners.map(p=>p[0])),right=Math.max(...corners.map(p=>p[0])),top=Math.min(...corners.map(p=>p[1])),bottom=Math.max(...corners.map(p=>p[1]));
 const canvas=createCanvas(Math.ceil((right-left)*2)+4,Math.ceil((bottom-top)*2)+4),ctx=canvas.getContext('2d');
 ctx.setTransform(a*2,b*2,c*2,d*2,2-left*2,2-top*2);if(flip){ctx.translate(im.width,0);ctx.scale(-1,1)}ctx.drawImage(im,0,0);
 const start=[a*A[0]+c*A[1]-left+1,b*A[0]+d*A[1]-top+1],end=[start[0]+vx,start[1]+vy],width=canvas.width/2,height=canvas.height/2,id='camp_round_rampart_'+i+'_v4',file='round-rampart-'+i+'.webp';
 await sharp(canvas.toBuffer('image/png')).webp({quality:96}).toFile(out+'/'+file);
art.push({id,name:'Round camp rampart · bay '+(i+1),image:url+file,size:[canvas.width,canvas.height],width,height,anchor:[(start[0]+end[0])/2/width,(start[1]+end[1])/2/height],kind:'wall',rise:kind==='vertical'?Math.abs(d)*spec.z:rise,segments:[{x:-vx/2,y:-vy/2,ex:vx/2,ey:vy/2,r:22}]});
 for(let j=0;j<count;j++)place('wall-'+i+'-'+j,id,sx+(j+.5)*vx,sy+(j+.5)*vy);
}
for(let i=0;i<traces.length;i++)if(!gateNodes.has(i))place('joint-'+i,'camp_stockade_post_v3',...traces[i].a,{solid:false});
// Retired wall IDs must still validate cached and cloud saves before migration.
const legacy=JSON.parse(fs.readFileSync(root+'/legacy-art.json')).filter(a=>!art.some(b=>a.id===b.id)).map(a=>({...a,rise:130}));
fs.writeFileSync('src/camp-perimeter-art.json',JSON.stringify([...art,...legacy],null,2)+'\n');
fs.writeFileSync('src/camp-perimeter-layout.json',JSON.stringify({circle,roads,traces,placements},null,2)+'\n');
const previous=JSON.parse(fs.readFileSync('src/base-catalogue.json')),template=previous.find(a=>a.id==='camp_stockade_post_v3'),rows=previous.filter(a=>!a.id.startsWith('camp_stockade_run_')&&!a.id.startsWith('camp_round_rampart_'));
for(const a of art){let row=rows.find(row=>a.id===row.id);if(!row){row={...template,id:a.id};rows.push(row)}Object.assign(row,{name:a.name,image:a.image,artPreview:{worldWidth:a.width},artworkExports:[a.image],purpose:a.kind==='gate'?'A working double gate on a camp road.':'A substantial timber fortification following the round camp boundary.',improvement:'Circular perimeter with gates aligned to the six existing roads.'});}
fs.writeFileSync('src/base-catalogue.json',JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify({artworks:art.length,placements:placements.length,wallBays:placements.filter(p=>p.id.includes('-wall-')).length,gates:6,wallHeight:235,gateHeight}));

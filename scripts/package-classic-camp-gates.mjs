/** Restore original placement records and register generated matching hinged gates. */
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require('sharp'),{createCanvas,loadImage}=require('@napi-rs/canvas');
const root='artwork-archive/camp-gates-classic-v1',out='public/survival/camp-gates-classic-v1',url='/survival/camp-gates-classic-v1/';
fs.mkdirSync(out,{recursive:true});
async function cropTransparent(name,max){
 const source=root+'/'+name+'.png',{data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});let x0=info.width,y0=info.height,x1=0,y1=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>20){x0=Math.min(x,x0);x1=Math.max(x,x1);y0=Math.min(y,y0);y1=Math.max(y,y1)}
 const left=Math.max(0,x0-8),top=Math.max(0,y0-8),width=Math.min(info.width-left,x1-x0+17),height=Math.min(info.height-top,y1-y0+17);
 const buffer=await sharp(source).extract({left,top,width,height}).resize({width:max,height:max,fit:'inside'}).webp({quality:96}).toBuffer();fs.writeFileSync(out+'/'+name+'.webp',buffer);const meta=await sharp(buffer).metadata();return{buffer,size:[meta.width,meta.height],bounds:{left,top,width,height}};
}
const l=await cropTransparent('gate-leaf',768),p=await cropTransparent('gate-post',768),leaf=await loadImage(l.buffer),post=await loadImage(p.buffer),postHeight=230,postWidth=p.size[0]/p.size[1]*postHeight,postAnchor=[(551-p.bounds.left)/p.bounds.width,(1103-p.bounds.top)/p.bounds.height],gateHeight=185;
const traces=JSON.parse(fs.readFileSync('src/camp-original-gate-layout.json')),placements=JSON.parse(fs.readFileSync('src/camp-original-wall-layout.json')),art=[];
for(const trace of traces){
 const [sx,sy]=trace.a,[ex,ey]=trace.b,dx=ex-sx,dy=ey-sy,padding=260,left=Math.min(sx,ex)-padding,top=Math.min(sy,ey)-padding,width=Math.abs(dx)+padding*2,height=Math.abs(dy)+padding*2;
 const canvas=createCanvas(Math.ceil(width*2),Math.ceil(height*2)),ctx=canvas.getContext('2d'),A=[sx-left,sy-top],B=[ex-left,ey-top],M=[(A[0]+B[0])/2,(A[1]+B[1])/2];
 for(const [u,v]of [[A,M],[B,M]]){ctx.save();ctx.setTransform((v[0]-u[0])*2/leaf.width,(v[1]-u[1])*2/leaf.width,0,gateHeight*2/leaf.height,u[0]*2,(u[1]-gateHeight)*2);ctx.drawImage(leaf,0,0);ctx.restore()}
 for(const v of [A,B])ctx.drawImage(post,(v[0]-postWidth*postAnchor[0])*2,(v[1]-postHeight*postAnchor[1])*2,postWidth*2,postHeight*2);
 const name=trace.gate,id='camp_gate_'+name+'_classic_v1',file='gate-'+name+'.webp';await sharp(canvas.toBuffer('image/png')).webp({quality:95}).toFile(out+'/'+file);
 art.push({id,name:name[0].toUpperCase()+name.slice(1)+' matching timber gate',image:url+file,size:[canvas.width,canvas.height],width,height,anchor:[.5,.5],kind:'gate',rise:gateHeight,segments:[],gate:{a:[A[0]/width,A[1]/height],b:[B[0]/width,B[1]/height],height:gateHeight,leaf:url+'gate-leaf.webp',leafSize:l.size,post:url+'gate-post.webp',postSize:p.size,postWidth,postHeight,postAnchor,topRail:false}});
 placements.push({id:'camp-original-gate-'+name,assetId:id,x:left+width/2,y:top+height/2,scale:1,locked:true,solid:true,allowTransparency:true,roof:'auto',role:'prop'});
}
const legacy=JSON.parse(fs.readFileSync(root+'/legacy-art.json'));
fs.writeFileSync('src/camp-perimeter-art.json',JSON.stringify([...art,...legacy],null,2)+'\n');
fs.writeFileSync('src/camp-perimeter-layout.json',JSON.stringify({restoration:true,traces,placements},null,2)+'\n');
const previous=JSON.parse(fs.readFileSync('src/base-catalogue.json')),template=previous.find(a=>a.id==='camp_stockade_post_v3'||a.id==='camp_gate_south_classic_v1'),rows=previous.filter(a=>!a.id.startsWith('camp_stockade_')&&!a.id.startsWith('camp_round_rampart_')&&!a.id.startsWith('camp_gate_'));
for(const a of art)rows.push({...template,id:a.id,name:a.name,image:a.image,artPreview:{worldWidth:a.width},artworkExports:[a.image],purpose:'A matching hinged gate for the original camp walls.',appearance:'Weathered oak, rope lashings and a rough diagonal timber brace.',improvement:'Original wall placement restored; gates open and close at road entrances.'});
fs.writeFileSync('src/base-catalogue.json',JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify({originalWalls:placements.length-art.length,gates:art.length,postAnchor,gateHeight,postHeight}));

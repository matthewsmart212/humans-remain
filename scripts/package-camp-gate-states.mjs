/** Mechanical sprite-sheet extraction and hinge registration. No painted content is synthesized. */
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require('sharp'),{createCanvas,loadImage}=require('@napi-rs/canvas');
const root='artwork-archive/camp-gate-states-v1',out='public/survival/camp-gate-states-v1',url='/survival/camp-gate-states-v1/';
const specs=JSON.parse(fs.readFileSync(root+'/registration.json')),art=JSON.parse(fs.readFileSync('src/camp-perimeter-art.json'));
fs.mkdirSync(out,{recursive:true});
for(const spec of specs){
 const a=art.find(a=>a.id==='camp_gate_'+spec.name+'_classic_v1'),g=a.gate,meta=await sharp(root+'/'+spec.name+'.png').metadata(),cell=Math.floor(meta.width/2);
 // West's illustrated round posts occupy the existing broad wall-foot overlap.
 // A 15-unit inset adjustment avoids crushing the side-on art to a paper strip.
 if(spec.name==='west'){g.a[0]=315/a.width;g.b[0]=245/a.width;}
 const ends=[g.a,g.b].map(v=>[v[0]*a.width,v[1]*a.height]).sort((a,b)=>a[0]-b[0]);
 const [CA,CB]=spec.anchors[0],sx=(ends[1][0]-ends[0][0])/(CB[0]-CA[0]),sy=230/spec.postHeight;
 const skew=((ends[1][1]-ends[0][1])-sy*(CB[1]-CA[1]))/(CB[0]-CA[0]);
 const frames=[];
 for(let state=0;state<2;state++){
  const [A,B]=spec.anchors[state];
  const source=await sharp(root+'/'+spec.name+'.png').extract({left:state*cell,top:0,width:cell,height:meta.height}).png().toBuffer(),im=await loadImage(source);
  const c=createCanvas(Math.ceil(a.width*2),Math.ceil(a.height*2)),ctx=c.getContext('2d');
  if(!state){ctx.setTransform(2*sx,2*skew,0,2*sy,2*(ends[0][0]-sx*A[0]),2*(ends[0][1]-skew*A[0]-sy*A[1]));ctx.drawImage(im,0,0)}
  else {
   // Open halves are disconnected sprites. Register each hinge separately,
   // retaining exactly the same scale as the closed state (no post-size pop).
   const split=spec.name==='west'?650:Math.round((A[0]+B[0])/2);
   const crops=spec.name==='west'?[[0,0,cell,split],[0,split,cell,meta.height-split]]:[[0,0,split,meta.height],[split,0,cell-split,meta.height]];
   for(let i=0;i<2;i++){const P=[A,B][i],[x,y,width,height]=crops[i];ctx.setTransform(2*sx,2*skew,0,2*sy,2*(ends[i][0]-sx*P[0]),2*(ends[i][1]-skew*P[0]-sy*P[1]));ctx.drawImage(im,x,y,width,height,x,y,width,height);}
  }
  const file=spec.name+(state?'-open':'-closed')+'.webp';await sharp(c.toBuffer('image/png')).webp({quality:96}).toFile(out+'/'+file);frames.push(url+file);
 }
 a.image=frames[0];a.gate.states={closed:frames[0],open:frames[1],size:a.size};
}
fs.writeFileSync('src/camp-perimeter-art.json',JSON.stringify(art,null,2)+'\n');
const rows=JSON.parse(fs.readFileSync('src/base-catalogue.json'));
for(const spec of specs){const a=art.find(a=>a.id==='camp_gate_'+spec.name+'_classic_v1'),r=rows.find(r=>r.id===a.id);if(r){r.image=a.image;r.artworkExports=[a.gate.states.closed,a.gate.states.open];r.purpose='Matching timber gate with separate open and closed artwork.';r.improvement='One tap opens; close waits for a clear doorway.';}}
fs.writeFileSync('src/base-catalogue.json',JSON.stringify(rows,null,2)+'\n');
console.log('Registered 12 transparent gate state images; saved placement coordinates unchanged.');

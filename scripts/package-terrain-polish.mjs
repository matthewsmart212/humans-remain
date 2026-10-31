// Mechanical texture registration and packaging. Painting is exclusively ImageGen.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const archive='artwork-archive/camp-ground-v3',out='public/survival/camp-ground-v3',size=4800,edge=1328;
fs.mkdirSync(out,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(archive+'/prompts.json'));
const origins=[0,1136,2336,3472];

// A narrow minimum-error join uses two equally detailed neighbours. It never
// substitutes a stretched overview, which caused the old broad blurry cross.
function stitch(base,bw,bh,tile,tw,th,ox,oy,overlap,vertical){
 const length=vertical?th:tw,cost=new Float64Array(length*overlap),parent=new Int16Array(cost.length);
 const bp=(step,cross)=>vertical?((oy+step)*bw+ox+cross)*3:((oy+cross)*bw+ox+step)*3;
 const tp=(step,cross)=>vertical?(step*tw+cross)*3:(cross*tw+step)*3;
 for(let s=0;s<length;s++)for(let c=0;c<overlap;c++){
  let error=0;const bi=bp(s,c),ti=tp(s,c);for(let k=0;k<3;k++)error+=(base[bi+k]-tile[ti+k])**2;
  // Avoid the outermost edge and prefer dark joints over pale stone faces.
  error+=Math.abs(c-overlap/2)*.2;
  let prev=c,min=s?cost[(s-1)*overlap+c]:0;
  if(s)for(const n of [c-1,c+1])if(n>=0&&n<overlap&&cost[(s-1)*overlap+n]<min){min=cost[(s-1)*overlap+n];prev=n}
  cost[s*overlap+c]=error+min;parent[s*overlap+c]=prev;
 }
 const seam=new Int16Array(length);let c=0;for(let n=1;n<overlap;n++)if(cost[(length-1)*overlap+n]<cost[(length-1)*overlap+c])c=n;
 for(let s=length-1;s>=0;s--){seam[s]=c;c=parent[s*overlap+c]}
 for(let y=0;y<th;y++)for(let x=0;x<tw;x++){
  const cross=vertical?x:y,cut=seam[vertical?y:x],mix=cross>=overlap?1:Math.max(0,Math.min(1,(cross-cut+1)/2));
  if(!mix)continue;const bi=((oy+y)*bw+ox+x)*3,ti=(y*tw+x)*3;
  for(let k=0;k<3;k++)base[bi+k]=Math.round(base[bi+k]*(1-mix)+tile[ti+k]*mix);
 }
}
const rows=[];
for(let row=0;row<4;row++){
 const buffer=Buffer.alloc(size*edge*3);
 for(let col=0;col<4;col++){
  const tile=await sharp(`${archive}/${row}-${col}-source.png`).resize(edge,edge).removeAlpha().raw().toBuffer();
  if(!col)for(let y=0;y<edge;y++)tile.copy(buffer,y*size*3,y*edge*3,(y+1)*edge*3);
  else stitch(buffer,size,edge,tile,edge,edge,origins[col],0,origins[col-1]+edge-origins[col],true);
 }rows.push(buffer);
}
const raw=Buffer.alloc(size*size*3);rows[0].copy(raw);
for(let row=1;row<4;row++)stitch(raw,size,size,rows[row],size,edge,0,origins[row],origins[row-1]+edge-origins[row],false);
// The damaged southern walkway needed one continuous edit across the old join.
if(fs.existsSync(archive+'/south-path-source.png')){
 const patch=await sharp(archive+'/south-path-source.png').resize(900,1690).removeAlpha().raw().toBuffer();
 for(let y=0;y<1690;y++)for(let x=0;x<900;x++){const mix=Math.max(0,Math.min(1,x/24,(899-x)/24,y/3));for(let k=0;k<3;k++){const i=((3110+y)*size+1980+x)*3+k;raw[i]=Math.round(raw[i]*(1-mix)+patch[(y*900+x)*3+k]*mix)}}
}
const full=()=>sharp(raw,{raw:{width:size,height:size,channels:3}});
await full().webp({quality:94,effort:6}).toFile(out+'/full-4800.webp');
await full().resize(1200,1200).webp({quality:92}).toFile(out+'/preview.webp');
await full().extract({left:600,top:600,width:3600,height:3600}).webp({quality:94}).toFile(out+'/centre-3600.webp');
for(const [key,left,top] of [['nw',0,0],['ne',2398,0],['sw',0,2398],['se',2398,2398]])await full().extract({left,top,width:2402,height:2402}).webp({quality:94,effort:6}).toFile(`${out}/${key}.webp`);
const factor=3600/(2400*Math.SQRT2),left=Math.round((1733.2074750798122-627)*factor+600),top=Math.round((2117.415200737417-1254*.94)*factor+600),cropEdge=Math.round(1254*factor);
if(fs.existsSync(archive+'/clearing-source.png')){
 const registered=await full().extract({left,top,width:cropEdge,height:cropEdge}).resize(1254,1254).removeAlpha().raw().toBuffer(),cleaned=await sharp(archive+'/clearing-source.png').resize(1254,1254).removeAlpha().raw().toBuffer();
 for(let y=0;y<1254;y++)for(let x=0;x<1254;x++){const mix=Math.max(0,Math.min(1,(Math.min(x,y,1253-x,1253-y)-80)/64));for(let k=0;k<3;k++){const i=(y*1254+x)*3+k;registered[i]=Math.round(registered[i]*(1-mix)+cleaned[i]*mix)}}
 await sharp(registered,{raw:{width:1254,height:1254,channels:3}}).webp({quality:94}).toFile(out+'/bonfire-clearing.webp');
 const file='src/camp-artwork-replacements.json',reskins=JSON.parse(fs.readFileSync(file));const clearing=reskins.find(r=>r.entryId==='misc_d9795b56-b7cc-4e3a-84e2-3140912e5d0d');
 Object.assign(clearing,{url:'/survival/camp-ground-v3/bonfire-clearing.webp',name:'bonfire-clearing-dry-ground.webp',bytes:fs.statSync(out+'/bonfire-clearing.webp').size});fs.writeFileSync(file,JSON.stringify(reskins,null,2)+'\n');
}
fs.writeFileSync(archive+'/packaging.json',JSON.stringify({source:'16 registered ImageGen terrain edits; two-pixel minimum-error joins between full-detail neighbours',size,playable:3600,border:600,tileOverlap:4,clearingCrop:{left,top,width:cropEdge,height:cropEdge},files:fs.readdirSync(out).map(name=>({name,bytes:fs.statSync(out+'/'+name).size}))},null,2)+'\n');
console.log('Packaged sharp, dry terrain from 16 detailed edits.');

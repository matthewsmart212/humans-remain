// Assemble separately generated overlapping detail sections on the original world grid.
// This is packaging, not a claim of native 4800px single-image generation.
const fs=require('node:fs');
const path=require('node:path');
const sharp=require('sharp');
(async()=>{
 const manifest=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 const out=process.argv[3];if(!out)throw Error('Usage: node scripts/package-detailed-terrain.cjs MANIFEST OUT_DIRECTORY');
 fs.mkdirSync(out,{recursive:true});
 const size=4800,step=1200,pad=60,tileSize=1320;
 const sum=new Float32Array(size*size*3),weights=new Float32Array(size*size);
 const dimensions=[];
 for(let row=0;row<4;row++)for(let col=0;col<4;col++){
  const file=manifest[`r${row}c${col}`];if(!file)throw Error(`Missing r${row}c${col}`);
  const metadata=await sharp(file).metadata();dimensions.push({row,col,width:metadata.width,height:metadata.height});
  if(metadata.width<1200||metadata.height<1200)throw Error('Insufficient detail resolution');
  const {data}=await sharp(file).resize(tileSize,tileSize).removeAlpha().toColourspace('srgb').raw().toBuffer({resolveWithObject:true});
  for(let ty=0;ty<tileSize;ty++){
   const y=row*step-pad+ty;if(y<0||y>=size)continue;
   let wy=1;if(row>0)wy=Math.min(wy,ty/(pad*2));if(row<3)wy=Math.min(wy,(tileSize-1-ty)/(pad*2));
   for(let tx=0;tx<tileSize;tx++){
    const x=col*step-pad+tx;if(x<0||x>=size)continue;
    let wx=1;if(col>0)wx=Math.min(wx,tx/(pad*2));if(col<3)wx=Math.min(wx,(tileSize-1-tx)/(pad*2));
    const weight=Math.max(0,wx*wy),dest=y*size+x,src=(ty*tileSize+tx)*3;
    weights[dest]+=weight;for(let ch=0;ch<3;ch++)sum[dest*3+ch]+=data[src+ch]*weight;
   }
  }
 }
 const pixels=Buffer.alloc(size*size*3);
 for(let i=0;i<weights.length;i++){if(weights[i]<=0)throw Error(`Uncovered pixel ${i}`);for(let c=0;c<3;c++)pixels[i*3+c]=Math.round(sum[i*3+c]/weights[i]);}
 const raw={width:size,height:size,channels:3},im=()=>sharp(pixels,{raw});
 await im().webp({quality:96}).toFile(path.join(out,'full-4800.webp'));
 await im().resize(4600,4600).webp({quality:96}).toFile(path.join(out,'map-4600.webp'));
 await im().resize(1200,1200).webp({quality:94}).toFile(path.join(out,'preview.webp'));
 await im().extract({left:600,top:600,width:3600,height:3600}).webp({quality:96}).toFile(path.join(out,'centre-3600.webp'));
 for(const [name,left,top] of [['nw',0,0],['ne',2398,0],['sw',0,2398],['se',2398,2398]])await im().extract({left,top,width:2402,height:2402}).webp({lossless:true}).toFile(path.join(out,`${name}.webp`));
 fs.writeFileSync(path.join(out,'generation.json'),JSON.stringify({layoutSize:4800,step,pad,nativeSections:dimensions},null,2));
 console.log(JSON.stringify({out,dimensions}));
})();

const fs=require('node:fs');
const path=require('node:path');
const sharp=require('sharp');
(async()=>{
 const dir=process.argv[2],out=process.argv[3];
 if(!dir||!out)throw Error('Usage: node stitch-terrain.cjs TILE_DIRECTORY OUTPUT_IMAGE');
 const width=3042,height=4056,tileW=1086,tileH=1448,stepX=1014,stepY=1352,padX=36,padY=48;
 const values=new Float32Array(width*height*3),weights=new Float32Array(width*height);
 for(let row=0;row<3;row++)for(let col=0;col<3;col++){
  const file=path.join(dir,`detail-r${row}-c${col}.png`);
  const {data,info}=await sharp(file).removeAlpha().toColourspace('srgb').raw().toBuffer({resolveWithObject:true});
  if(info.width!==tileW||info.height!==tileH||info.channels!==3)throw Error(`Unexpected tile dimensions ${file}: ${JSON.stringify(info)}`);
  for(let ty=0;ty<tileH;ty++){
   const y=row*stepY-padY+ty;if(y<0||y>=height)continue;
   let wy=1;if(row>0)wy=Math.min(wy,ty/(padY*2));if(row<2)wy=Math.min(wy,(tileH-1-ty)/(padY*2));
   for(let tx=0;tx<tileW;tx++){
    const x=col*stepX-padX+tx;if(x<0||x>=width)continue;
    let wx=1;if(col>0)wx=Math.min(wx,tx/(padX*2));if(col<2)wx=Math.min(wx,(tileW-1-tx)/(padX*2));
    const weight=Math.max(0,wx*wy),dest=y*width+x,src=(ty*tileW+tx)*3;
    weights[dest]+=weight;for(let ch=0;ch<3;ch++)values[dest*3+ch]+=data[src+ch]*weight;
   }
  }
 }
 const pixels=Buffer.alloc(width*height*3);
 for(let i=0;i<weights.length;i++){if(weights[i]<=0)throw Error(`Uncovered pixel ${i}`);for(let ch=0;ch<3;ch++)pixels[i*3+ch]=Math.round(values[i*3+ch]/weights[i]);}
 await sharp(pixels,{raw:{width,height,channels:3}}).webp({lossless:true,effort:6}).toFile(out);
 const metadata=await sharp(out).metadata();console.log(JSON.stringify({file:out,width:metadata.width,height:metadata.height,bytes:fs.statSync(out).size,pixels:width*height,ratioToOriginal:width*height/(1086*1448)}));
})();

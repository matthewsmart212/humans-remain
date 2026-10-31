import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
// Smooth elliptical falloff, shared by web and native. Fully transparent at
// every edge; the center is black at 82% opacity, with no rectangular backing.
const width=264,height=128,rgba=Buffer.alloc(width*height*4);
for(let y=0;y<height;y++)for(let x=0;x<width;x++){
 const radius=Math.hypot((x-(width-1)/2)/(width/2-1),(y-(height-1)/2)/(height/2-1));
 rgba[(y*width+x)*4+3]=Math.round(255*.82*Math.pow(Math.max(0,1-radius*radius),2));
}
await sharp(rgba,{raw:{width,height,channels:4}}).webp({lossless:true}).toFile('public/survival/ui-horizon-v1/shade.webp');

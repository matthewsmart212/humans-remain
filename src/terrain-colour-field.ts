import {WORLD_GROUND_BOUNDS} from './world-ground';

/** The colour masks vary over hundreds of world units, independently of the
 * painted ground detail. Sample them once, then interpolate a small data
 * texture instead of evaluating noise and trigonometry for every screen pixel.
 * RGB stores clear-soil mix, regional brown mix, and distance darkening. */
export const TERRAIN_COLOUR_FIELD_SIZE=1024;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(a:number,b:number,n:number)=>{const t=clamp((n-a)/(b-a));return t*t*(3-2*t)};
const fract=(n:number)=>n-Math.floor(n);
const region=(x:number,y:number,cx:number,cy:number,rx:number,ry:number)=>1-smooth(.32,1,Math.hypot((x-cx)/rx,(y-cy)/ry));
function hash(x:number,y:number){
 let a=fract(x*.1031),b=fract(y*.1031),c=a;
 const d=a*(b+33.33)+b*(c+33.33)+c*(a+33.33);a+=d;b+=d;c+=d;
 return fract((a+b)*c);
}
function noise(x:number,y:number){
 const ix=Math.floor(x),iy=Math.floor(y),fx=fract(x),fy=fract(y),u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
 return (hash(ix,iy)*(1-u)+hash(ix+1,iy)*u)*(1-v)+(hash(ix,iy+1)*(1-u)+hash(ix+1,iy+1)*u)*v;
}
export function terrainColourAt(x:number,y:number){
 const qx=x+560*Math.sin(y*.00072)+220*Math.sin((x+y)*.0011),qy=y+480*Math.sin(x*.00061)+180*Math.sin((y-x)*.0013);
 const meadow=region(qx,qy,1600,11400,8300,6500),lowland=region(qx,qy,-4400,5300,4700,7600),village=region(qx,qy,3900,-2400,5000,5100);
 const woodland=region(qx,qy,-4600,-2600,7500,6000),industry=region(qx,qy,10100,-1700,6100,7200),scrapyard=region(qx,qy,9300,8600,5700,6000);
 const away=smooth(2450,5000,Math.hypot((x-2400)/1.05,y-2400));
 const brown=Math.max(meadow*.36,lowland*.52,village*.28,woodland*.95,industry*.94,scrapyard*.88)*away;
 const cx=x+260*Math.sin(y*.0017)+180*Math.sin(x*.0011),cy=y+230*Math.sin(x*.0014)-170*Math.sin(y*.0019);
 const field=.72*noise(cx/1900+12.3,cy/1900+5.7)+.28*noise(cx/780+31.4,cy/780+19.2);
 return [smooth(.44,.61,field),brown,clamp((Math.hypot(x-2400,y-2400)-3240)/8760)*.8] as const;
}
let field:Uint8Array|undefined;
export function terrainColourPixels(){
 if(field)return field;
 const size=TERRAIN_COLOUR_FIELD_SIZE,b=WORLD_GROUND_BOUNDS,pixels=new Uint8Array(size*size*4);
 for(let row=0;row<size;row++)for(let col=0;col<size;col++){
  const values=terrainColourAt(b.x+(col+.5)*b.width/size,b.y+(row+.5)*b.height/size),at=(row*size+col)*4;
  pixels[at]=Math.round(values[0]*255);pixels[at+1]=Math.round(values[1]*255);pixels[at+2]=Math.round(values[2]*255);pixels[at+3]=255;
 }
 return field=pixels;
}

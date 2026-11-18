import campRoads from './player-map-camp-roads.json';

/**
 * Visual-only autumn ground finish for the painted home terrain.
 *
 * This is a small, deterministic RGBA wash sampled in world coordinates by
 * Skia's existing terrain shader. It doesn't move roads, change collisions,
 * add world placements or allocate new sprites per frame.
 *
 * The original baked cobblestones are protected twice: by the surveyed road
 * centre-lines (including the central camp ring) and by a pale-stone safeguard
 * in the shader. Other road artwork is still rendered by its original pass.
 */
export const CAMP_FINISH_SIZE=768;
export const CAMP_FINISH_BOUNDS={x:-700,y:-700,width:4800,height:4800} as const;

export const CAMP_TERRAIN_FINISH_SHADER=`
uniform shader artwork;
uniform shader finish;
half4 main(float2 xy) {
 half4 source=artwork.eval(xy);
 half4 wash=finish.eval(xy);
 float3 ground=float3(source.rgb);
 float hi=max(ground.r,max(ground.g,ground.b));
 float lo=min(ground.r,min(ground.g,ground.b));
 float brightness=dot(ground,float3(0.26,0.60,0.14));
 // Keep pale, low-chroma cobblestones as painted even if a sampled road
 // boundary differs slightly from its centre-line survey.
 float stone=smoothstep(0.45,0.68,brightness)*(1.0-smoothstep(0.13,0.31,hi-lo));
 float protectedAmount=1.0-0.95*stone;
 float3 colour=ground*(1.0-float(wash.a)*protectedAmount)+float3(wash.rgb)*protectedAmount;
 return half4(clamp(colour,0.0,1.0),source.a);
}
`;

const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(a:number,b:number,v:number)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t)};
const hash=(x:number,y:number)=>{
 let n=Math.imul(x,374761393)+Math.imul(y,668265263)+1274126177;
 n=Math.imul(n^(n>>>13),1274126177);
 return ((n^(n>>>16))>>>0)/4294967295;
};
function noise(x:number,y:number){
 const a=Math.floor(x),b=Math.floor(y),fx=x-a,fy=y-b,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
 return (hash(a,b)*(1-u)+hash(a+1,b)*u)*(1-v)+(hash(a,b+1)*(1-u)+hash(a+1,b+1)*u)*v;
}

type Point=[number,number];
const ring:Point[]=[
 [1103,830],[2484,1150],[2442,2348],[1461,2498],[1113,2414],[877,2055],
];
function ringTrace():Point[]{
 const result:Point[]=[];
 for(let i=0;i<ring.length;i++){
  const a=ring[(i+ring.length-1)%ring.length],b=ring[i],c=ring[(i+1)%ring.length],d=ring[(i+2)%ring.length];
  for(let j=0;j<12;j++){
   const t=j/12,t2=t*t,t3=t2*t;
   result.push([0.5*(2*b[0]+(-a[0]+c[0])*t+(2*a[0]-5*b[0]+4*c[0]-d[0])*t2+(-a[0]+3*b[0]-3*c[0]+d[0])*t3),
                0.5*(2*b[1]+(-a[1]+c[1])*t+(2*a[1]-5*b[1]+4*c[1]-d[1])*t2+(-a[1]+3*b[1]-3*c[1]+d[1])*t3)]);
  }
 }
 result.push(result[0]);return result;
}

/** Paint soft protective corridors around original, untouched cobble work. */
function roadProtection(){
 const size=CAMP_FINISH_SIZE,b=CAMP_FINISH_BOUNDS,mask=new Uint8Array(size*size);
 const kx=size/b.width,ky=size/b.height;
 const trace=(points:readonly (readonly number[])[],width:number)=>{
  // Wider than the stones themselves: the remaining influence feathers to
  // zero *before* reaching a road, never directly over a paved edge.
  const solid=(width*.5+34)*kx,fade=48*kx,reach=solid+fade;
  for(let i=1;i<points.length;i++){
   const a=points[i-1],z=points[i],ax=(a[0]-b.x)*kx,ay=(a[1]-b.y)*ky,bx=(z[0]-b.x)*kx,by=(z[1]-b.y)*ky;
   const vx=bx-ax,vy=by-ay,len2=vx*vx+vy*vy||1;
   const x0=Math.max(0,Math.floor(Math.min(ax,bx)-reach)),x1=Math.min(size-1,Math.ceil(Math.max(ax,bx)+reach));
   const y0=Math.max(0,Math.floor(Math.min(ay,by)-reach)),y1=Math.min(size-1,Math.ceil(Math.max(ay,by)+reach));
   for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    const t=clamp(((x-ax)*vx+(y-ay)*vy)/len2),d=Math.hypot(x-ax-vx*t,y-ay-vy*t);
    if(d>=reach)continue;
    const alpha=Math.round(255*(1-smooth(solid,reach,d))),at=y*size+x;
    if(alpha>mask[at])mask[at]=alpha;
   }
  }
 };
 for(const road of campRoads.roads)trace(road.points,road.width);
 // The road-atlas traces begin at the camp's circular path. Protect that
 // continuous path too; its position is deliberately conservative.
 trace(ringTrace(),240);
 return mask;
}

let pixels:Uint8Array|undefined;
export function campTerrainFinishPixels():Uint8Array{
 if(pixels)return pixels;
 const size=CAMP_FINISH_SIZE,b=CAMP_FINISH_BOUNDS,roads=roadProtection(),output=new Uint8Array(size*size*4);
 const step=b.width/size;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const wx=b.x+(x+.5)*step,wy=b.y+(y+.5)*step;
  const distance=Math.hypot(wx-1700,wy-1650);
  const presence=1-smooth(1720,2550,distance);
  const road=roads[y*size+x]/255;
  const strength=presence*(1-road);
  if(strength<=.002)continue;
  // Different frequencies form broad damp soil, ochre grass and irregular
  // moss. The original painted brushwork remains visible underneath.
  const broad=noise(wx/370+18.7,wy/370+13.9);
  const soil=noise(wx/145+7.3,wy/145+53.1);
  const fleck=noise(wx/47+33.1,wy/47+17.2);
  const damp=smooth(.42,.7,broad*.61+soil*.39);
  const grass=smooth(.29,.68,soil*.67+fleck*.33);
  const ochre=smooth(.41,.70,broad*.40+fleck*.60);
  const tint=[
   100+30*ochre-35*damp-5*grass,
   79+22*grass+11*ochre-29*damp,
   45+12*grass+4*ochre-8*damp,
  ];
  const alpha=clamp((.27+.19*damp+.065*grass+.06*fleck)*strength);
  const pos=(y*size+x)*4;
  output[pos]=Math.round(tint[0]*alpha);
  output[pos+1]=Math.round(tint[1]*alpha);
  output[pos+2]=Math.round(tint[2]*alpha);
  output[pos+3]=Math.round(alpha*255);
 }
 // Tiny, hand-painted warm leaf litter. Once at renderer startup, not in the
 // 60fps render loop. Road pixels are tested again before stamping each leaf.
 const leafColors:[[number,number,number],[number,number,number],[number,number,number]]=[[193,105,42],[163,75,36],[207,153,66]];
 for(let i=0;i<7000;i++){
  const px=Math.floor(hash(i,219)*size),py=Math.floor(hash(i,1871)*size),span=1+Math.floor(hash(i,771)*2);
  const color=leafColors[Math.floor(hash(i,781)*leafColors.length)];
  for(let dy=-span;dy<=span;dy++)for(let dx=-span;dx<=span;dx++){
   const xx=px+dx,yy=py+dy;
   if(xx<0||yy<0||xx>=size||yy>=size||Math.abs(dx)+Math.abs(dy)*.8>span+0.35)continue;
   const at=yy*size+xx,existing=output[at*4+3];
   // A zero-alpha base is either road or outside the intended camp treatment.
   if(existing<28||roads[at]>10)continue;
   const alpha=(.48+hash(i,423)*.22)*(1-roads[at]/255);
   const idx=at*4,remaining=1-alpha;
   output[idx]=Math.round(output[idx]*remaining+color[0]*alpha);
   output[idx+1]=Math.round(output[idx+1]*remaining+color[1]*alpha);
   output[idx+2]=Math.round(output[idx+2]*remaining+color[2]*alpha);
   output[idx+3]=Math.round((existing/255*remaining+alpha)*255);
  }
 }
 return pixels=output;
}

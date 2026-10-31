import type {RiverBatch} from './river-layout';

type Point=readonly number[];
const floatBits=new Float32Array(1),integerBits=new Uint32Array(floatBits.buffer);
// Half-float data avoids visible ripple offsets from 8-bit direction rounding.
// All stored channels are finite values in [0,1].
const half=(value:number)=>{floatBits[0]=value;const bits=integerBits[0],exponent=bits>>>23;return exponent<113?Math.round(value*16777216):((exponent-112)<<10)+(((bits&0x7fffff)+4096)>>>13)};
const smooth=(a:number,b:number,n:number)=>{const t=Math.max(0,Math.min(1,(n-a)/(b-a)));return t*t*(3-2*t)};
function routeAt(x:number,y:number,points:readonly Point[],branch=false){
 let distance=Infinity,vx=0,vy=0;
 for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
  const t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/Math.max(dx*dx+dy*dy,1)));
  const d=Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);
  if(!branch||length>1)distance=Math.min(distance,d);
  const weight=1/Math.max(length,1)/(d*d+10000);vx+=dx*weight;vy+=dy*weight;
 }
 const length=Math.hypot(vx,vy);
 return {x:length>.000001?vx/length:0,y:length>.000001?vy/length:branch?0:1,distance};
}
/** Static route direction and bank masks. Water colour and moving ripple
 * samples stay in the live shader. The small interpolated grid keeps broad
 * bends/shoreline gradients smooth without per-fragment route searches. */
const fieldCache=new WeakMap<RiverBatch,Map<string,ReturnType<typeof buildRiverFlowPixels>>>();
export function riverFlowPixels(batch:RiverBatch,sidePoints?:readonly Point[]){
 const key=JSON.stringify(sidePoints||[]);let fields=fieldCache.get(batch);if(!fields){fields=new Map();fieldCache.set(batch,fields)}
 let field=fields.get(key);if(!field){field=buildRiverFlowPixels(batch,sidePoints);fields.set(key,field)}return field;
}
function buildRiverFlowPixels(batch:RiverBatch,sidePoints?:readonly Point[]){
 const source=batch.source,width=Math.min(512,Math.ceil(source.width/8)),height=Math.min(512,Math.ceil(source.height/8));
 const main=new Uint16Array(width*height*4),side=sidePoints?.length?new Uint16Array(main.length):undefined;
 const route=batch.flowPoints||batch.corridor?.points||[[0,0]],points=Array.from({length:12},(_,i)=>route[Math.min(i,route.length-1)]);
 const branch=sidePoints?.length?Array.from({length:6},(_,i)=>sidePoints[Math.min(i,sidePoints.length-1)]):undefined;
 for(let row=0;row<height;row++)for(let col=0;col<width;col++){
  const x=source.x+(col+.5)*source.width/width,y=source.y+(row+.5)*source.height/height,v=routeAt(x,y,points),at=(row*width+col)*4;
  main[at]=half(v.x*.5+.5);main[at+1]=half(v.y*.5+.5);
  main[at+2]=half(batch.corridor?1-smooth(batch.corridor.inner,batch.corridor.outer,v.distance):1);main[at+3]=half(1);
  if(side&&branch){const b=routeAt(x,y,branch,true);side[at]=half(b.x*.5+.5);side[at+1]=half(b.y*.5+.5);side[at+2]=half(smooth(-50,100,v.distance-b.distance));side[at+3]=half(1)}
 }
 return {width,height,main:new Uint8Array(main.buffer),side:side?new Uint8Array(side.buffer):undefined};
}

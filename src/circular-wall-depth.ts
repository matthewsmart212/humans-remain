type Point={x:number;y:number};
type Curve=readonly (readonly number[])[];
const clamp=(value:number)=>Math.max(0,Math.min(1,value));

/** Sample every ground segment; a long curve cannot use its endpoint chord. */
export function circularWallDepth(curve:Curve,player:Point,rise:number){
 let nearest={x:curve[0]?.[0]??0,y:curve[0]?.[1]??0,distance:Infinity};
 let covering:{x:number;y:number;score:number}|undefined;
 for(let i=1;i<curve.length;i++){
  const [ax,ay]=curve[i-1],[bx,by]=curve[i],dx=bx-ax,dy=by-ay;
  const t=clamp(((player.x-ax)*dx+(player.y-ay)*dy)/(dx*dx+dy*dy||1));
  const x=ax+dx*t,y=ay+dy*t,distance=Math.hypot(player.x-x,player.y-y);
  if(distance<nearest.distance)nearest={x,y,distance};
  // For an upright face, look along the player's screen column. At a steep
  // side, use the torso's height instead of extrapolating beyond a segment.
  const u=Math.abs(dy)>Math.abs(dx)?clamp((player.y+rise*.4-ay)/(dy||1)):clamp((player.x-ax)/(dx||1));
  const gx=ax+dx*u,gy=ay+dy*u,lift=gy-player.y,horizontal=Math.abs(gx-player.x);
  if(horizontal<65&&lift>0&&lift<rise+20){
   const score=horizontal+Math.abs(lift-rise*.4)*.1;
   if(!covering||score<covering.score)covering={x:gx,y:gy,score};
  }
 }
 return{depth:covering?.y??nearest.y,distance:nearest.distance,obscuresPlayer:!!covering,near:nearest.distance<rise+90};
}

type Circle={x:number;y:number;radius:number};
const circles=new WeakMap<object,Circle|null>();
/** Moved editor pieces form separate groups, so their depth stays independent. */
export function circularWallGroup(curve:Curve,placement:Point&{scale:number;layer?:number}){
 let circle=circles.get(curve);
 if(circle===undefined){
  const a=curve[0],b=curve[Math.floor(curve.length/2)],c=curve[curve.length-1];
  if(!a||!b||!c){circles.set(curve,null);return null}
  const d=2*(a[0]*(b[1]-c[1])+b[0]*(c[1]-a[1])+c[0]*(a[1]-b[1]));
  if(Math.abs(d)<1e-6){circles.set(curve,null);return null}
  const aa=a[0]*a[0]+a[1]*a[1],bb=b[0]*b[0]+b[1]*b[1],cc=c[0]*c[0]+c[1]*c[1];
  const x=(aa*(b[1]-c[1])+bb*(c[1]-a[1])+cc*(a[1]-b[1]))/d;
  const y=(aa*(c[0]-b[0])+bb*(a[0]-c[0])+cc*(b[0]-a[0]))/d;
  circle={x,y,radius:Math.hypot(a[0]-x,a[1]-y)};circles.set(curve,circle);
 }
 if(!circle)return null;
 const quantize=(n:number)=>Math.round(n*100)/100;
 return [placement.layer??0,quantize(placement.x+circle.x*placement.scale),quantize(placement.y+circle.y*placement.scale),quantize(circle.radius*placement.scale)].join(':');
}

export type CircularWallDraw={drawable:{y:number};order:number;priority:number;group:string|null};
/** Preserve the approved overlapping-post order without globally layering walls
 * above actors. Nearby faces keep their local ground depth; remote neighbours
 * absorb the small ordering adjustment. No additional image draws are needed. */
export function orderCircularWallDraws(records:CircularWallDraw[]){
 const groups=new Map<string,CircularWallDraw[]>();
 for(const record of records){if(!record.group)continue;const group=groups.get(record.group)||[];group.push(record);groups.set(record.group,group)}
 for(const group of groups.values()){
  group.sort((a,b)=>a.order-b.order);
  const blocks:{records:CircularWallDraw[];sum:number;weight:number}[]=[];
  for(const record of group){
   blocks.push({records:[record],sum:record.drawable.y*record.priority,weight:record.priority});
   while(blocks.length>1){
    const b=blocks[blocks.length-1],a=blocks[blocks.length-2];
    if(a.sum/a.weight<=b.sum/b.weight)break;
    blocks.splice(-2,2,{records:[...a.records,...b.records],sum:a.sum+b.sum,weight:a.weight+b.weight});
   }
  }
  for(const block of blocks){const y=block.sum/block.weight;for(const record of block.records)record.drawable.y=y+record.order*1e-6;}
 }
}

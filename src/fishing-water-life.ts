import {fishingPierDeckContains,fishingPierGeometry,type FishingPierGeometry} from './fishing-site-geometry';
import {riverWaterContains} from './river-collision';
import type {Placement} from './world-layout';

const TAU=Math.PI*2;
export type FishingFishOrbit={
 x:number;y:number;rx:number;ry:number;phase:number;speed:number;size:number;
 period:number;rippleOffset:number;tempo:number;variant:number;depth:number;
 drawRadius:number;
};
type Pose={x:number;y:number;angle:number;speed:number;phase:number};
type Drawing={now:Pose;then:Pose};
const schools=new WeakMap<Placement,{geometry:FishingPierGeometry;fish:readonly FishingFishOrbit[]}>();
const drawings=new WeakMap<FishingFishOrbit,Drawing>();
const emptyPose=():Pose=>({x:0,y:0,angle:0,speed:0,phase:0});
const hash=(text:string)=>{let n=2166136261;for(let i=0;i<text.length;i++)n=Math.imul(n^text.charCodeAt(i),16777619);return n>>>0};

// The small harmonics make an irregular, gently turning route. Bounds are
// normalized so rx/ry remain the exact broad-phase culling envelope.
function route(f: FishingFishOrbit,phase:number,rate:number,out:Pose){
 const second=phase*2+f.phase*.43,third=phase*3+f.phase*.27;
 const dx=f.rx*(-Math.sin(phase)-.20*Math.sin(second))/1.10;
 const dy=f.ry*(Math.cos(phase)+.30*Math.cos(third))/1.10;
 out.x=f.x+f.rx*(Math.cos(phase)+.10*Math.cos(second))/1.10;
 out.y=f.y+f.ry*(Math.sin(phase)+.10*Math.sin(third))/1.10;
 out.angle=Math.atan2(dy*rate,dx*rate);out.speed=Math.hypot(dx,dy)*Math.abs(rate);out.phase=phase;
 return out;
}
function poseAt(f: FishingFishOrbit,time:number,out:Pose){
 const a=time*f.tempo+f.phase,b=time*f.tempo*2+f.phase*.63;
 // Positive smooth speed modulation: fish cruise, accelerate briefly and
 // ease back down without stopping, reversing or teleporting along the route.
 const phase=f.phase+f.speed*(time+.42*Math.sin(a)/f.tempo+.10*Math.sin(b)/f.tempo);
 const rate=f.speed*(1+.42*Math.cos(a)+.20*Math.cos(b));
 return route(f,phase,rate,out);
}

/** Validate complete routes once per placed geometry, never during a frame. */
export function fishingFishSchool(p:Placement):readonly FishingFishOrbit[]{
 const geometry=fishingPierGeometry(p),cached=schools.get(p);
 if(cached?.geometry===geometry)return cached.fish;
 const fish:FishingFishOrbit[]=[],seed=hash(p.id),origin=geometry.waterEnd;
 const scale=Math.max(.65,Math.min(1.45,geometry.bounds.width/740));
 const probe=emptyPose();
 if(geometry.deck.length>=3)for(let i=0;i<48&&fish.length<6;i++){
  const angle=i*2.399963229728653+(seed%6283)/1000,ring=(96+(i%3)*78)*scale;
  const x=origin.x+Math.cos(angle)*ring,y=origin.y+Math.sin(angle)*ring*.83;
  if(fishingPierDeckContains(p,x,y))continue;
  const variant=i%3,size=([.88,1,.73][variant]+(i%2)*.045)*scale;
  const candidate:FishingFishOrbit={x,y,rx:(48+(i*17%37))*scale,ry:(30+(i*13%27))*scale,
   phase:((seed+i*977)%6283)/1000,speed:(.32+(i%4)*.027)*(i%2?-1:1),size,
   period:8.4+(i%4)*1.15,rippleOffset:((seed+i*131)%840)/100,
   tempo:.64+(i%5)*.045,variant,depth:.12+(i%4)*.14,drawRadius:37*size};
  let water=true;
  // Full silhouettes, tail wakes and expanding rings fit within this margin.
  // The extra route-sampling margin covers the space between adjacent probes.
  const margin=Math.max(34,candidate.drawRadius)+9;
  for(let j=0;j<96;j++){
   route(candidate,j*TAU/96,1,probe);
   if(!riverWaterContains(probe.x,probe.y,margin)){water=false;break}
  }
  if(water)fish.push(candidate);
 }
 schools.set(p,{geometry,fish});return fish;
}

export function fishingFishPosition(fish:FishingFishOrbit,time:number){return poseAt(fish,time,emptyPose())}

const palettes=[
 {body:'#234c43',flank:'#73836a',back:'#365d4a',fin:'#697357',mark:'#193e34',shine:'#aeb49a'},
 {body:'#1d4540',flank:'#708c7d',back:'#30594f',fin:'#59766a',mark:'#193d37',shine:'#b7c4b3'},
 {body:'#214b49',flank:'#78988a',back:'#3d6b61',fin:'#64857a',mark:'#234a43',shine:'#b0c4b6'},
] as const;
// Authored head-to-tail profile. The head stays steady while a travelling bend
// grows along the flexible rear body; all detail follows that same spine.
const profile=[{x:13.8,width:.08},{x:13.5,width:.65},...Array.from({length:17},(_,i)=>{
 const u=i/16;return{x:12.8-u*29.2,width:.30+Math.pow(Math.sin((.055+u*.93)*Math.PI),.88)*(4.7-2.2*u)};
})];
function bend(x:number,wave:number,amplitude:number){
 const u=Math.max(0,(14.5-x)/40.5);return Math.sin(u*4.2-wave)*u*u*amplitude;
}
function body(ctx:CanvasRenderingContext2D,wave:number,amplitude:number,width:number,offset=0){
 ctx.beginPath();
 for(let i=0;i<profile.length;i++){
  const p=profile[i],y=bend(p.x,wave,amplitude)-p.width*width+offset;
  i?ctx.lineTo(p.x,y):ctx.moveTo(p.x,y);
 }
 for(let i=profile.length-1;i>=0;i--){const p=profile[i];ctx.lineTo(p.x,bend(p.x,wave,amplitude)+p.width*width+offset)}
 ctx.closePath();ctx.fill();
}
function fin(ctx:CanvasRenderingContext2D,wave:number,amplitude:number,points:readonly (readonly [number,number])[]){
 for(let i=0;i<points.length;i++){const [x,y]=points[i],by=y+bend(x,wave,amplitude);i?ctx.lineTo(x,by):ctx.moveTo(x,by)}ctx.closePath();
}
const tail=[[-15.6,-.9],[-21.2,-4.4],[-24.8,-4.9],[-23.4,-2.5],[-21.4,0],[-23.4,2.5],[-24.8,4.9],[-21.2,4.4],[-15.6,.9]] as const;
const dorsal=[[-9,-2.7],[-7.8,-4.2],[-5.8,-5.2],[-3.4,-5.6],[-.8,-5.1],[1.7,-4],[2.7,-3]] as const;
const nearFin=[[7.2,2.6],[4.3,5.7],[2.3,6.6],[1.4,6.2],[2,4.2],[4.4,2.5]] as const;
const farFin=[[7.4,-2.7],[4.8,-5.5],[3.2,-6.4],[2.3,-5.7],[3.1,-4.2],[4.6,-2.5]] as const;
const rearFin=[[-8.5,2],[-10.8,4.1],[-12.7,4.6],[-13.4,3.6],[-10.7,1.9]] as const;

function marks(ctx:CanvasRenderingContext2D,f: FishingFishOrbit,wave:number,amplitude:number){
 const color=palettes[f.variant];ctx.save();ctx.globalAlpha*=.50;ctx.fillStyle=color.mark;ctx.strokeStyle=color.mark;
 if(f.variant===0){
  // Broken, slightly swept perch bars remain inside the flank.
  ctx.lineWidth=.95;ctx.beginPath();
  for(let i=0;i<4;i++){const x=5.2-i*3.5,w=2.5-i*.25;ctx.moveTo(x+.6,bend(x+.6,wave,amplitude)-w);ctx.lineTo(x-.55,bend(x-.55,wave,amplitude)+w*.65)}ctx.stroke();
 }else if(f.variant===1){
  ctx.beginPath();
  for(let i=0;i<7;i++){const x=7-i*2.2,y=(i%2?1.6:-1.5)+bend(x,wave,amplitude);ctx.ellipse(x,y,.45,.33,0,0,TAU)}ctx.fill();
 }
 // Small eyes and gill cuts add anatomy without a bright outlined sprite.
 ctx.globalAlpha*=1.25;ctx.beginPath();
 for(const sign of [-1,1])ctx.ellipse(10.6,bend(10.6,wave,amplitude)+sign*1.6,.53,.42,0,0,TAU);
 ctx.fill();ctx.lineWidth=.5;ctx.beginPath();
 for(const sign of [-1,1]){ctx.moveTo(8.5,bend(8.5,wave,amplitude)+sign*.7);ctx.lineTo(7.2,bend(7.2,wave,amplitude)+sign*2);ctx.lineTo(7.8,bend(7.8,wave,amplitude)+sign*2.9)}ctx.stroke();ctx.restore();
}

function brokenRing(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,flatten:number,rotation=0){
 const c=Math.cos(rotation),s=Math.sin(rotation);ctx.beginPath();
 for(let arc=0;arc<2;arc++)for(let i=0;i<=12;i++){
  const a=(arc*.98+.10+i/12*.77)*Math.PI,dx=Math.cos(a)*r,dy=Math.sin(a)*r*flatten;
  const px=x+dx*c-dy*s,py=y+dx*s+dy*c;i?ctx.lineTo(px,py):ctx.moveTo(px,py);
 }
 ctx.stroke();
}

/** Six small shared-renderer fish: no raster, layer or shader is made per frame. */
export function drawFishingFish(ctx:CanvasRenderingContext2D,f: FishingFishOrbit,time:number,reduced:boolean){
 let scratch=drawings.get(f);if(!scratch){scratch={now:emptyPose(),then:emptyPose()};drawings.set(f,scratch)}
 // Reduced motion freezes the actual pose as well as fins and surface effects.
 if(reduced)time=0;
 const pose=poseAt(f,time,scratch.now),age=(time+f.rippleOffset)%f.period;
 const surface=Math.pow(.5+.5*Math.cos(age/f.period*TAU),3);
 const activity=Math.min(1.8,pose.speed/(Math.abs(f.speed)*(f.rx+f.ry)*.5));
 const wave=reduced?0:time*(9.1+Math.abs(f.speed)*6)+f.phase*3+.5*Math.sin(time*f.tempo+f.phase);
 const amplitude=reduced?0:2.3+activity*2.2;
 const color=palettes[f.variant],bodyWidth=f.variant===0?1.13:f.variant===1?.92:.81;
 ctx.save();ctx.translate(pose.x,pose.y);ctx.rotate(pose.angle);ctx.scale(f.size,f.size);
 ctx.globalAlpha*=(.53+.22*surface)*(1-f.depth*.22);
 // All fins share one subdued, translucent pass below the fleshy body.
 ctx.save();ctx.globalAlpha*=.64;ctx.fillStyle=color.fin;ctx.beginPath();
 fin(ctx,wave,amplitude,tail);fin(ctx,wave,amplitude,dorsal);fin(ctx,wave,amplitude,nearFin);fin(ctx,wave,amplitude,farFin);fin(ctx,wave,amplitude,rearFin);ctx.fill();ctx.restore();
 ctx.fillStyle=color.body;body(ctx,wave,amplitude,bodyWidth);
 ctx.save();ctx.globalAlpha*=.67;ctx.fillStyle=color.flank;body(ctx,wave,amplitude,bodyWidth*.70,.24);ctx.restore();
 ctx.save();ctx.globalAlpha*=.64;ctx.fillStyle=color.back;body(ctx,wave,amplitude,bodyWidth*.32,-.42);ctx.restore();
 marks(ctx,f,wave,amplitude);
 // A narrow, interrupted flank glint belongs inside the fish, never its edge.
 ctx.save();ctx.globalAlpha*=.25+.1*surface;ctx.strokeStyle=color.shine;ctx.lineWidth=.48;ctx.beginPath();
 for(let i=2;i<=9;i++){const p=profile[i],y=bend(p.x,wave,amplitude)-p.width*bodyWidth*.38;i===2?ctx.moveTo(p.x,y):ctx.lineTo(p.x,y)}ctx.stroke();ctx.restore();
 if(!reduced&&surface>.55){
  // Two short trailing disturbances only appear as a fish nears the surface.
  ctx.save();ctx.globalAlpha*=surface*.11;ctx.strokeStyle='#a0b8a5';ctx.lineWidth=.55;ctx.beginPath();
  for(const side of [-1,1])for(let i=0;i<6;i++){
   const x=-14-i*2.7,y=side*(5+i*.47)+bend(x,wave,amplitude)*.24;i?ctx.lineTo(x,y):ctx.moveTo(x,y);
  }ctx.stroke();ctx.restore();
 }
 ctx.restore();
 if(reduced)return;
 const duration=2.1;if(age>=duration)return;
 // The disturbance stays where the fish surfaced while the animal swims on.
 const start=poseAt(f,time-age,scratch.then),radius=(2.5+age*10)*f.size;
 ctx.save();ctx.globalAlpha*=.21*(1-age/duration);ctx.strokeStyle='#b4c9b5';ctx.lineWidth=.85;
 brokenRing(ctx,start.x,start.y,radius,.49,.10);
 if(age>.33){ctx.globalAlpha*=.53;brokenRing(ctx,start.x,start.y,radius*.66,.49,-.08)}
 ctx.restore();
}

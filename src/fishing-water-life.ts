import {fishingPierDeckContains,fishingPierGeometry,type FishingPierGeometry} from './fishing-site-geometry';
import {riverWaterContains} from './river-collision';
import type {Placement} from './world-layout';

const TAU=Math.PI*2;
type FishSpecies='perch'|'carp'|'pike';
export type FishingFishOrbit={
 x:number;y:number;rx:number;ry:number;phase:number;speed:number;size:number;
 period:number;rippleOffset:number;tempo:number;variant:number;depth:number;
 drawRadius:number;species?:FishSpecies;kg?:number;
};
type Pose={x:number;y:number;angle:number;speed:number;phase:number};
type Drawing={now:Pose;then:Pose};
type ControlledFish={pose:Pose;activity:number;surface:number;aboveWater:boolean};
const schools=new WeakMap<Placement,{geometry:FishingPierGeometry;fish:readonly FishingFishOrbit[]}>();
const drawings=new WeakMap<FishingFishOrbit,Drawing>();
const emptyPose=():Pose=>({x:0,y:0,angle:0,speed:0,phase:0});
const hash=(text:string)=>{let n=2166136261;for(let i=0;i<text.length;i++)n=Math.imul(n^text.charCodeAt(i),16777619);return n>>>0};
const speciesByVariant=['perch','carp','pike'] as const;
const schoolMix=[0,1,0,2,0,1] as const;
const speciesIndex=(variant:number,species?:string)=>species==='pike'?2:species==='carp'?1:species==='perch'?0:Math.max(0,Math.min(2,Math.round(variant)));
/** Weight is an attribute of the visible animal, independent of the cast or
 * the pier's editor scale. Old fixture orbits still have a stable fallback. */
export function fishingAmbientFishWeight(fish:Pick<FishingFishOrbit,'variant'|'size'|'kg'>,index=0){
 if(Number.isFinite(fish.kg)&&(fish.kg??0)>0)return fish.kg!;
 const variant=speciesIndex(fish.variant),base=[.72,2.65,2.1][variant];
 return Math.round(Math.max(.2,base*Math.pow(Math.max(.55,Math.min(1.6,fish.size)),2)+index*.03)*100)/100;
}

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
  const variant=schoolMix[fish.length],species=speciesByVariant[variant];
  const sample=((seed+fish.length*977)%997)/997;
  const kg=Math.round(([.36,1.25,1.05][variant]+sample*[1.05,3.65,4.8][variant])*100)/100;
  const size=([.77,.94,.86][variant]+Math.sqrt(kg/[1.4,4.9,5.85][variant])*.34)*scale;
  const candidate:FishingFishOrbit={x,y,rx:(48+(i*17%37))*scale,ry:(30+(i*13%27))*scale,
   phase:((seed+i*977)%6283)/1000,speed:([.33,.27,.31][variant]+(i%4)*.027)*(i%2?-1:1),size,species,kg,
   period:8.4+(i%4)*1.15,rippleOffset:((seed+i*131)%840)/100,
   tempo:[.73,.51,.67][variant]+(i%5)*.025,variant,depth:.1+(i%4)*.12,drawRadius:(variant===2?44:39)*size};
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
 {body:'#244c3c',flank:'#809275',back:'#375a40',fin:'#8d794c',mark:'#1c3e2e',shine:'#bdc6a2'},
 {body:'#405c43',flank:'#9c9870',back:'#596b49',fin:'#89845c',mark:'#3b5136',shine:'#c7bf91'},
 {body:'#234e48',flank:'#7a9b83',back:'#355f4d',fin:'#708567',mark:'#bed0a4',shine:'#c2d0b5'},
] as const;
const landedPalettes=[
 {body:'#52613c',flank:'#c5b16e',back:'#627448',fin:'#b4773f',mark:'#37482c',shine:'#efe0a8'},
 {body:'#655c36',flank:'#baa16b',back:'#787047',fin:'#aa8655',mark:'#6a5a35',shine:'#e4cc99'},
 {body:'#3b5941',flank:'#9ca36b',back:'#496548',fin:'#9a9256',mark:'#dbd39b',shine:'#dedcb0'},
] as const;
type Shape={profile:readonly {x:number;width:number}[];head:number;gill:number;length:number;tail:readonly (readonly [number,number])[];dorsal:readonly (readonly [number,number])[];near:readonly (readonly [number,number])[];far:readonly (readonly [number,number])[];rear:readonly (readonly [number,number])[]};
// Authored head-to-tail profile. The head stays steady while a travelling bend
// grows along the flexible rear body; all detail follows that same spine.
const perchProfile=[{x:13.8,width:.08},{x:13.5,width:.65},...Array.from({length:17},(_,i)=>{
 const u=i/16;return{x:12.8-u*29.2,width:.30+Math.pow(Math.sin((.055+u*.93)*Math.PI),.88)*(4.7-2.2*u)};
})];
const carpProfile=[{x:15.5,width:.25},{x:14.7,width:1.3},...Array.from({length:19},(_,i)=>{
 const u=i/18;return{x:14-u*32.5,width:.55+Math.pow(Math.sin((.035+u*.94)*Math.PI),.82)*(7.8-3.9*u)};
})];
const pikeProfile=[{x:24.2,width:.2},{x:23.6,width:1.05},{x:18.4,width:1.5},...Array.from({length:19},(_,i)=>{
 const u=i/18;return{x:17.6-u*40.3,width:.45+Math.pow(Math.sin((.07+u*.88)*Math.PI),.9)*(3.5-u)};
})];
function bend(x:number,wave:number,amplitude:number,shape:Shape){
 const u=Math.max(0,(shape.head+1-x)/shape.length);return Math.sin(u*4.2-wave)*u*u*amplitude;
}
function body(ctx:CanvasRenderingContext2D,wave:number,amplitude:number,width:number,shape:Shape,offset=0){
 const profile=shape.profile;
 ctx.beginPath();
 for(let i=0;i<profile.length;i++){
  const p=profile[i],y=bend(p.x,wave,amplitude,shape)-p.width*width+offset;
  i?ctx.lineTo(p.x,y):ctx.moveTo(p.x,y);
 }
 for(let i=profile.length-1;i>=0;i--){const p=profile[i];ctx.lineTo(p.x,bend(p.x,wave,amplitude,shape)+p.width*width+offset)}
 ctx.closePath();ctx.fill();
}
function fin(ctx:CanvasRenderingContext2D,wave:number,amplitude:number,points:readonly (readonly [number,number])[],shape:Shape){
 for(let i=0;i<points.length;i++){const [x,y]=points[i],by=y+bend(x,wave,amplitude,shape);i?ctx.lineTo(x,by):ctx.moveTo(x,by)}ctx.closePath();
}
const tail=[[-15.6,-.9],[-21.2,-4.4],[-24.8,-4.9],[-23.4,-2.5],[-21.4,0],[-23.4,2.5],[-24.8,4.9],[-21.2,4.4],[-15.6,.9]] as const;
const dorsal=[[-9,-2.7],[-8.4,-5.1],[-6.9,-4.2],[-6,-7.2],[-4.6,-5.3],[-3.2,-7.7],[-2,-5.4],[-.5,-7.1],[.5,-4.7],[1.7,-5.8],[2.7,-3]] as const;
const nearFin=[[7.2,2.6],[4.3,5.7],[2.3,6.6],[1.4,6.2],[2,4.2],[4.4,2.5]] as const;
const farFin=[[7.4,-2.7],[4.8,-5.5],[3.2,-6.4],[2.3,-5.7],[3.1,-4.2],[4.6,-2.5]] as const;
const rearFin=[[-8.5,2],[-10.8,4.1],[-12.7,4.6],[-13.4,3.6],[-10.7,1.9]] as const;
const shapes:readonly Shape[]=[
 {profile:perchProfile,head:13.8,gill:7.4,length:41,tail,dorsal,near:nearFin,far:farFin,rear:rearFin},
 {profile:carpProfile,head:15.5,gill:8.4,length:45,
  tail:[[-17.8,-1],[-24.2,-5.6],[-28.5,-6.7],[-27.7,-3.1],[-24,0],[-27.7,3.1],[-28.5,6.7],[-24.2,5.6],[-17.8,1]],
  dorsal:[[-13.5,-2.2],[-12,-5.5],[-8.5,-8.2],[-5,-8.5],[-1,-7.2],[2.5,-5.2],[4,-4.5]],
  near:[[8.3,3.8],[5.4,8],[2.6,9.6],[.8,8.5],[2.7,5.3]],far:[[8.3,-3.8],[5.4,-8],[2.6,-9.6],[.8,-8.5],[2.7,-5.3]],rear:[[-10,2.4],[-13.1,6],[-15.7,5.6],[-16.1,3.6],[-13.8,1.7]]},
 {profile:pikeProfile,head:24.2,gill:11.9,length:60,
  tail:[[-22,-.8],[-29,-4.5],[-34.5,-6.4],[-33.7,-2.8],[-30.4,0],[-33.7,2.8],[-34.5,6.4],[-29,4.5],[-22,.8]],
  dorsal:[[-13.5,-1.4],[-17.1,-6.4],[-20.8,-7],[-23.1,-6],[-22,-.7]],
  near:[[12,1.7],[8.7,6.8],[6.4,7.5],[6.6,4],[9.4,1.6]],far:[[12,-1.7],[8.7,-6.8],[6.4,-7.5],[6.6,-4],[9.4,-1.6]],rear:[[-14,1.5],[-17.5,6.3],[-21.1,6.2],[-22.4,4.6],[-22,.8]]},
];
const SIDES=[-1,1] as const;

function marks(ctx:CanvasRenderingContext2D,variant:number,wave:number,amplitude:number,shape:Shape,aboveWater:boolean){
 const color=(aboveWater?landedPalettes:palettes)[variant];ctx.save();ctx.globalAlpha*=.62;ctx.fillStyle=color.mark;ctx.strokeStyle=color.mark;
 if(variant===0){
  // Broken, slightly swept perch bars remain inside the flank.
  ctx.lineWidth=.95;ctx.beginPath();
  for(let i=0;i<5;i++){const x=6-i*3.6,w=2.8-i*.28;ctx.moveTo(x+.6,bend(x+.6,wave,amplitude,shape)-w);ctx.lineTo(x-.55,bend(x-.55,wave,amplitude,shape)+w*.78)}ctx.stroke();
 }else if(variant===1){
  // Offset scale rows follow the broad carp flank, with short mouth barbels.
  ctx.lineWidth=.42;ctx.beginPath();
  for(let row=0;row<3;row++)for(let i=0;i<6;i++){
   const x=6.6-i*3.4+(row%2)*1.7,y=(row-1)*2.5+bend(x,wave,amplitude,shape);
   ctx.moveTo(x-.9,y-1.1);ctx.lineTo(x+.35,y);ctx.lineTo(x-.9,y+1.1);
  }ctx.stroke();ctx.beginPath();
  for(const side of SIDES){ctx.moveTo(14,side*1.4);ctx.lineTo(16.1,side*3);ctx.lineTo(14.5,side*4)}ctx.stroke();
 }else{
  // Pike are slender and mottled, with a long, unmistakably flat snout.
  ctx.beginPath();for(let i=0;i<10;i++){
   const x=10.3-i*3.1,y=(i%2?1.6:-1.4)+bend(x,wave,amplitude,shape);ctx.ellipse(x,y,.85,.45,0,0,TAU);
  }ctx.fill();ctx.strokeStyle='#284536';ctx.lineWidth=.55;ctx.beginPath();ctx.moveTo(16.2,0);ctx.lineTo(23.1,.15);ctx.stroke();
 }
 // Small eyes and gill cuts add anatomy without a bright outlined sprite.
 ctx.globalAlpha*=1.25;ctx.beginPath();
 ctx.fillStyle='#263d2a';for(const sign of SIDES)ctx.ellipse(shape.head-(variant===2?7:3.2),sign*1.6,.56,.44,0,0,TAU);
 ctx.fill();ctx.lineWidth=.5;ctx.beginPath();
 ctx.strokeStyle='#35503b';for(const sign of SIDES){const g=shape.gill;ctx.moveTo(g+1,bend(g+1,wave,amplitude,shape)+sign*.7);ctx.lineTo(g-.3,bend(g-.3,wave,amplitude,shape)+sign*2.1);ctx.lineTo(g+.25,bend(g+.25,wave,amplitude,shape)+sign*(variant===1?4.8:2.9))}ctx.stroke();ctx.restore();
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
export function drawFishingFish(ctx:CanvasRenderingContext2D,f: FishingFishOrbit,time:number,reduced:boolean,controlled?:ControlledFish){
 let scratch=drawings.get(f);if(!scratch){scratch={now:emptyPose(),then:emptyPose()};drawings.set(f,scratch)}
 // Reduced motion freezes the actual pose as well as fins and surface effects.
 if(reduced)time=0;
 const pose=controlled?.pose??poseAt(f,time,scratch.now),age=(time+f.rippleOffset)%f.period;
 const surface=controlled?.surface??Math.pow(.5+.5*Math.cos(age/f.period*TAU),3);
 const activity=controlled?.activity??Math.min(1.8,pose.speed/(Math.abs(f.speed)*(f.rx+f.ry)*.5));
 const variant=speciesIndex(f.variant,f.species),shape=shapes[variant];
 const wave=reduced?0:time*([10.7,7.9,9.3][variant]+activity*1.7)+f.phase*3+.5*Math.sin(time*f.tempo+f.phase);
 const amplitude=reduced?0:[2.1,1.75,2.8][variant]+activity*[1.8,1.4,2.3][variant];
 const color=(controlled?.aboveWater?landedPalettes:palettes)[variant],bodyWidth=1;
 ctx.save();ctx.translate(pose.x,pose.y);ctx.rotate(pose.angle);ctx.scale(f.size,f.size);
 ctx.globalAlpha*=controlled?.aboveWater?1:(.53+.22*surface)*(1-f.depth*.22);
 // All fins share one subdued, translucent pass below the fleshy body.
 ctx.save();ctx.globalAlpha*=.64;ctx.fillStyle=color.fin;ctx.beginPath();
 fin(ctx,wave,amplitude,shape.tail,shape);fin(ctx,wave,amplitude,shape.dorsal,shape);fin(ctx,wave,amplitude,shape.near,shape);fin(ctx,wave,amplitude,shape.far,shape);fin(ctx,wave,amplitude,shape.rear,shape);ctx.fill();ctx.restore();
 ctx.fillStyle=color.body;body(ctx,wave,amplitude,bodyWidth,shape);
 ctx.save();ctx.globalAlpha*=.78;ctx.fillStyle=color.flank;body(ctx,wave,amplitude,bodyWidth*.72,shape,.24);ctx.restore();
 ctx.save();ctx.globalAlpha*=.64;ctx.fillStyle=color.back;body(ctx,wave,amplitude,bodyWidth*.30,shape,-.42);ctx.restore();
 marks(ctx,variant,wave,amplitude,shape,!!controlled?.aboveWater);
 // A narrow, interrupted flank glint belongs inside the fish, never its edge.
 ctx.save();ctx.globalAlpha*=.25+.1*surface;ctx.strokeStyle=color.shine;ctx.lineWidth=.48;ctx.beginPath();
 for(let i=3;i<=11;i++){const p=shape.profile[i],y=bend(p.x,wave,amplitude,shape)-p.width*bodyWidth*.38;i===3?ctx.moveTo(p.x,y):ctx.lineTo(p.x,y)}ctx.stroke();ctx.restore();
 if(!reduced&&surface>.55&&!controlled?.aboveWater){
  // Two short trailing disturbances only appear as a fish nears the surface.
  ctx.save();ctx.globalAlpha*=surface*.11;ctx.strokeStyle='#a0b8a5';ctx.lineWidth=.55;ctx.beginPath();
  for(const side of SIDES)for(let i=0;i<6;i++){
   const x=(variant===2?-22:-17)-i*2.7,y=side*(5+i*.47)+bend(x,wave,amplitude,shape)*.24;i?ctx.lineTo(x,y):ctx.moveTo(x,y);
  }ctx.stroke();ctx.restore();
 }
 ctx.restore();
 if(reduced||controlled)return;
 const duration=2.1;if(age>=duration)return;
 // The disturbance stays where the fish surfaced while the animal swims on.
 const start=poseAt(f,time-age,scratch.then),radius=(2.5+age*10)*f.size;
 ctx.save();ctx.globalAlpha*=.21*(1-age/duration);ctx.strokeStyle='#b4c9b5';ctx.lineWidth=.85;
 brokenRing(ctx,start.x,start.y,radius,.49,.10);
 if(age>.33){ctx.globalAlpha*=.53;brokenRing(ctx,start.x,start.y,radius*.66,.49,-.08)}
 ctx.restore();
}

// The hooked fish is the same animal and anatomy as the reserved school fish.
// Reusable records avoid introducing a second ambient orbit or per-frame cache.
const controlledFish=palettes.map((_,variant)=>({
 fish:{x:0,y:0,rx:65,ry:45,phase:variant*.7,speed:.35,size:1,period:9,rippleOffset:0,tempo:.7,variant,species:speciesByVariant[variant],depth:.1,drawRadius:44} as FishingFishOrbit,
 control:{pose:emptyPose(),activity:1,surface:.6,aboveWater:false} as ControlledFish,
}));
export function drawFishingFishAt(ctx:CanvasRenderingContext2D,fish:{x:number;y:number;angle:number;size:number;variant:number;species?:string;kg?:number},time:number,reduced:boolean,activity=1,surface=.6,aboveWater=false){
 const drawing=controlledFish[speciesIndex(fish.variant,fish.species)];
 drawing.fish.size=fish.size;Object.assign(drawing.control.pose,{x:fish.x,y:fish.y,angle:fish.angle,speed:activity*20,phase:time});
 drawing.control.activity=activity;drawing.control.surface=surface;drawing.control.aboveWater=aboveWater;
 drawFishingFish(ctx,drawing.fish,time,reduced,drawing.control);
}

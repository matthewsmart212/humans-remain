import {timeOf,type World,type Enemy} from './survival-engine';
import {BRUTE} from './brute-model';
import {BRUTE_DISPLAY,BRUTE_CELL,bruteFrame,bruteView,bruteLift,bruteBodyOffset} from './brute-sprites';

const TAU=Math.PI*2,clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function bruteLandingCue(e:Enemy,t:number,reduced=false){
 const b=e.brute;if(e.hp<=0||!b?.jump||!['jump-windup','airborne'].includes(b.phase))return;
 const airborne=b.phase==='airborne',age=Math.max(0,t-b.since),progress=airborne?.45+.55*clamp(age/BRUTE.flight):.45*clamp(age/BRUTE.windup);
 return {...b.jump.to,radius:BRUTE.smashRadius,progress:reduced?.65:progress,rotation:e.id*.73,locked:airborne||age>=BRUTE.jumpTrack};
}
/** A fractured fault line around the true landing area, brightening into contact.
 * The footprint is full size from the first frame; only its inner fissures grow. */
export function drawBruteLandingWarning(ctx:CanvasRenderingContext2D,w:World,imgs:Record<string,HTMLImageElement>={}){
 const t=timeOf(w),reduced=!!w.weather?.reducedMotion;ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 for(const e of w.enemies){const cue=bruteLandingCue(e,t,reduced);if(!cue)continue;
  const {x,y,radius:r,progress:p,rotation:a}=cue;
  ctx.save();
  // Keep this self-lit ground effect behind the painted airborne body. Reuse
  // the adapter's cached alpha contour, so no readback runs on ordinary frames.
  const mask=ctx as CanvasRenderingContext2D&{artworkSilhouette?:(image:HTMLImageElement,crop:readonly number[])=>readonly (readonly [number,number])[];clipOutsidePath?:()=>void};
  if(mask.artworkSilhouette&&mask.clipOutsidePath){const frame=bruteFrame(e,t),view=bruteView(e.brute!.direction),image=imgs[view.key];if(image){const outline=mask.artworkSilhouette(image,[frame%4*BRUTE_CELL,Math.floor(frame/4)*BRUTE_CELL,BRUTE_CELL,BRUTE_CELL]),offset=bruteBodyOffset(e,t,reduced),lift=bruteLift(e,t,reduced),k=BRUTE_DISPLAY/BRUTE_CELL;ctx.beginPath();outline.forEach(([u,v],i)=>{const px=e.x+offset.x+(u*BRUTE_CELL-192)*k*(view.mirror?-1:1),py=e.y+offset.y-lift+(v*BRUTE_CELL-330)*k;i?ctx.lineTo(px,py):ctx.moveTo(px,py)});ctx.closePath();if(outline.length>=3)mask.clipOutsidePath()}}
  const point=(angle:number,radius:number)=>[x+Math.cos(angle)*radius,y+Math.sin(angle)*radius] as const;
  // A faint broken-earth wash keeps the unsafe interior readable on busy terrain.
  ctx.beginPath();for(let i=0;i<36;i++){const q=point(a+i*TAU/36,r*(i%3===1?.955:1));i?ctx.lineTo(...q):ctx.moveTo(...q)}ctx.closePath();ctx.fillStyle=cue.locked?'#972b161a':'#972b1610';ctx.fill();
  // Broken, angular perimeter pieces retain the same 160px reach in every view.
  ctx.beginPath();for(let i=0;i<12;i++){const base=a+i*TAU/12,start=base+.055,end=base+TAU/12-.055;ctx.moveTo(...point(start,r));ctx.lineTo(...point(start+(end-start)*.31,r*.955));ctx.lineTo(...point(start+(end-start)*.68,r*.985));ctx.lineTo(...point(end,r))}
  for(const [width,color] of [[11,`rgba(255,68,20,${.12+p*.12})`],[4.2,`rgba(255,97,30,${.65+p*.3})`],[1.25,p>.8?'#fff0bc':'#ffc779']] as const){ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke()}
  // Branching cracks load toward the rim rather than drawing a growing disk.
  ctx.beginPath();for(let i=0;i<6;i++){const angle=a+i*TAU/6,bend=(i%2?1:-1)*.16,reach=r*(.36+.49*p),root=r*.17;
   ctx.moveTo(...point(angle,root));ctx.lineTo(...point(angle+bend,reach*.5));ctx.lineTo(...point(angle-bend*.6,reach*.78));ctx.lineTo(...point(angle,reach));ctx.moveTo(...point(angle-bend*.6,reach*.78));ctx.lineTo(...point(angle+bend*1.7,reach*.92));
  }
  ctx.lineWidth=5;ctx.strokeStyle=`rgba(255,70,20,${.08+p*.15})`;ctx.stroke();ctx.lineWidth=1.4;ctx.strokeStyle=cue.locked?'#ffb365b8':'#eb914c85';ctx.stroke();
  ctx.restore();
 }
 ctx.restore();
}

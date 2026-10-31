import {runnerAxeFrame,runnerAxePoint,RUNNER_AXE_ART} from './runner-axe-art';
import {runnerCycle,type RunnerSprite} from './runner-cycles';
import {SURVIVOR_ART} from './survivor-art';
import {runnerLegView,drawRunnerLegs} from './runner-leg-motion';
import {axeProfile} from './axe-combat';
import type {World} from './survival-engine';
import {drawRunnerCombatUpper} from './runner-combat-head';

/** Reuse the approved painted boots below the belt. This cut excludes the old
 * hanging hands; upper-body attack art supplies the complete new jacket/arms. */
function drawLowerBody(ctx:CanvasRenderingContext2D,image:HTMLImageElement,sprite:RunnerSprite){
 ctx.save();ctx.beginPath();
 const outline=[[-17,-39],[17,-39],[17,-24],[32,-13],[64,0],[64,34],[-64,34],[-64,0],[-32,-13],[-17,-24]];
 outline.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();
 const [x,y,width,height]=sprite.crop,k=sprite.scale;
 ctx.drawImage(image,x,y,width,height,-sprite.anchor[0]*k,-sprite.anchor[1]*k,width*k,height*k);ctx.restore();
}

/** A very brief steel-coloured ribbon follows measured axe-head artwork.
 * It is local to the blade, not a magic projectile or a screen-space effect. */
function drawBladeTrail(ctx:CanvasRenderingContext2D,w:World,pose:NonNullable<ReturnType<typeof runnerAxeFrame>>){
 if(w.weather?.reducedMotion)return;
 const swing=w.axeSwing!,spec=axeProfile(swing),phase=(pose.age-spec.contact+.095)/.22;
 if(phase<0||phase>1)return;
 const art=RUNNER_AXE_ART,points=art.views[pose.view].blade,offset=swing.cut===2?4:0;
 if(!points?.[offset+2])return;
 const [a,b,c]=points.slice(offset,offset+3).map((p,i)=>runnerAxePoint(pose.view,offset+i,p));
 const control=[2*b[0]-(a[0]+c[0])/2,2*b[1]-(a[1]+c[1])/2];
 const at=(t:number)=>[(1-t)*(1-t)*a[0]+2*t*(1-t)*control[0]+t*t*c[0],(1-t)*(1-t)*a[1]+2*t*(1-t)*control[1]+t*t*c[1]];
 const head=Math.min(1,phase*1.3),tail=Math.max(0,head-.55),fade=Math.sin(Math.PI*phase)*.48;
 for(const [width,alpha,color] of [[swing.cut===2?7:5,.32,'#bf9f73'],[swing.cut===2?3.2:2.3,1,'#fff0ce']] as const){
  const left:number[][]=[],right:number[][]=[];
  for(let i=0;i<=12;i++){const t=tail+(head-tail)*i/12,p=at(t),next=at(Math.min(1,t+.005)),previous=at(Math.max(0,t-.005)),dx=next[0]-previous[0],dy=next[1]-previous[1],length=Math.hypot(dx,dy)||1,r=width*Math.sin(Math.PI*i/12);left.push([p[0]-dy/length*r,p[1]+dx/length*r]);right.push([p[0]+dy/length*r,p[1]-dx/length*r])}
  ctx.save();ctx.globalAlpha*=fade*alpha;ctx.fillStyle=color;ctx.beginPath();[...left,...right.reverse()].forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();ctx.restore();
 }
}

/** True upper-body attack poses over the approved locomotion. The same distance
 * phase continues through cut, combo, stop and return to normal walking. */
export function drawRunnerAxeAttack(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World){
 const pose=runnerAxeFrame(w),p=w.player;if(!pose||!imgs[pose.key])return false;
 const cycle=p.moving?runnerCycle(pose.direction,p.walkDistance,false):undefined;
 const lower=cycle?.sprite??SURVIVOR_ART[pose.view].idle,lowerImage=imgs[lower.sheet];
 if(!lowerImage)return false;
 ctx.save();if(pose.mirror)ctx.scale(-1,1);
 if(cycle)ctx.translate(0,cycle.bob*(p.walkBlend??1));
 const rear=pose.view==='up'||pose.view==='up-right';
 if(rear)drawBladeTrail(ctx,w,pose);
 const legView=cycle&&runnerLegView(pose.direction,false);
 if(legView&&imgs.runnerLegLayers)drawRunnerLegs(ctx,imgs.runnerLegLayers,legView,p.walkDistance,false);
 else drawLowerBody(ctx,lowerImage,lower);
 drawRunnerCombatUpper(ctx,imgs,pose.view,pose.frame,pose.key);
 if(!rear)drawBladeTrail(ctx,w,pose);
 ctx.restore();return true;
}

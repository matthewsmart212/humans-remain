import {timeOf,DIRECTION_ANGLES,type World,type Enemy,type Direction} from './survival-engine';
import {BRUTE,bruteCarrying} from './brute-model';
import {bruteCaptor,brutePlayerCarried} from './brute-control';
import {BRUTE_ATLAS,BRUTE_CELL,BRUTE_ANCHOR,BRUTE_DISPLAY,bruteView,bruteFrame,bruteLift,bruteHand,bruteGrip,bruteEyes,bruteBodyOffset} from './brute-sprites';
import {drawBruteTerrain,bruteDebrisDrawables,drawBruteDust} from './brute-impact';
import {drawBruteLandingWarning} from './brute-warning';
import {drawWorker} from './worker-renderer';
const TAU=Math.PI*2,k=BRUTE_DISPLAY/BRUTE_CELL,clamp=(n:number)=>Math.max(0,Math.min(1,n));
function circle(ctx:CanvasRenderingContext2D,x:number,y:number,r:number){ctx.beginPath();ctx.ellipse(x,y,r,r,0,0,TAU);ctx.closePath()}
function sprite(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,direction:Direction,frame:number,arms=false){
 const view=bruteView(direction),sheet=imgs[view.key];if(!sheet)return;ctx.save();if(view.mirror)ctx.scale(-1,1);const sx=frame%4*384,sy=Math.floor(frame/4)*384;
 if(arms){for(const [x,y,w,h] of BRUTE_ATLAS.forearms?.[view.source]?.[String(frame)]??[])ctx.drawImage(sheet,sx+x,sy+y,w,h,(x-192)*k,(y-330)*k,w*k,h*k)}
 else {ctx.drawImage(sheet,sx,sy,384,384,-192*k,-330*k,BRUTE_DISPLAY,BRUTE_DISPLAY);if(frame>=14)for(const [x,y,r] of bruteEyes(direction,frame)){ctx.fillStyle='#171c1d';circle(ctx,(x-192)*k,(y-330)*k,r*k*1.4);ctx.fill()}}
 ctx.restore();
}
export function bruteHeldPose(w:World,e:Enemy){
 const b=e.brute!,g=w.bruteGrab!,t=timeOf(w),grip=bruteGrip(e),physical={x:w.player.x,y:w.player.y-g.lift};
 const blend=b.phase==='hold'?clamp((t-b.since)/.16):b.phase==='release'?1-clamp((t-b.since)/BRUTE.release):1;
 return {x:physical.x+(grip.x-physical.x)*blend,y:physical.y+(grip.y+65-physical.y)*blend,tilt:b.phase==='crush'&&!w.weather?.reducedMotion?Math.sin((t-b.since)*72)*.055:0};
}
export function bruteDrawables(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World){
 const t=timeOf(w),out=w.enemies.filter(e=>e.hp>0&&e.kind==='iron-brute').map(e=>({y:e.y,draw:()=>{
  const b=e.brute,direction=b?.direction??e.motion?.direction??'down',frame=bruteFrame(e,t),lift=bruteLift(e,t,!!w.weather?.reducedMotion),held=w.bruteGrab?.enemyId===e.id&&bruteCarrying(b),rear=direction.startsWith('up');
  if(held&&rear)drawWorker(ctx,imgs,w,undefined,bruteHeldPose(w,e));
  const offset=bruteBodyOffset(e,t,!!w.weather?.reducedMotion);ctx.save();ctx.translate(e.x+offset.x,e.y-lift+offset.y);ctx.globalAlpha=clamp((t-(e.spawnedAt??-1))/.28);if(e.flashUntil>t)ctx.filter='brightness(1.65)';sprite(ctx,imgs,direction,frame);ctx.restore();
  if(held&&!rear){drawWorker(ctx,imgs,w,undefined,bruteHeldPose(w,e));ctx.save();ctx.translate(e.x,e.y);sprite(ctx,imgs,direction,frame,true);ctx.restore()}
 }}));
 for(const e of w.effects){const age=t-e.born;if(e.type==='kill'&&e.enemyKind==='iron-brute'&&age>=0&&age<1.65)out.push({y:e.y,draw:()=>{ctx.save();ctx.translate(e.x,e.y);ctx.globalAlpha=1-clamp((age-.65)/1);sprite(ctx,imgs,e.direction??'down',age<.28?14:15);ctx.restore()}})}
 // Physical earth/dust receive the world's lighting and sit beneath characters.
 if(w.effects.some(fx=>fx.type==='brute-slam'&&fx.heavy)){out.push({y:-9998,draw:()=>{drawBruteTerrain(ctx,imgs,w);drawBruteDust(ctx,w)}});out.push(...bruteDebrisDrawables(ctx,imgs,w))}return out;
}
export function drawBruteGround(ctx:CanvasRenderingContext2D,w:World,imgs:Record<string,HTMLImageElement>={}){
 drawBruteLandingWarning(ctx,w,imgs);
 const t=timeOf(w);ctx.save();
 for(const e of w.enemies){const b=e.brute;if(e.hp<=0||!b)continue;
  if(b.phase==='hook-windup'&&b.aim){
   const a=Math.atan2(b.aim.y-e.y,b.aim.x-e.x),dx=Math.cos(a),dy=Math.sin(a),reach=Math.min(BRUTE.hookRange,Math.hypot(b.aim.x-e.x,b.aim.y-e.y)+40),locked=t-b.since>=BRUTE.hookTrack;
   ctx.fillStyle=locked?'#eb7c281e':'#eb7c280c';ctx.beginPath();ctx.moveTo(e.x-dy*20,e.y+dx*20);ctx.lineTo(e.x+dx*reach-dy*20,e.y+dy*reach+dx*20);ctx.lineTo(e.x+dx*reach+dy*20,e.y+dy*reach-dx*20);ctx.lineTo(e.x+dy*20,e.y-dx*20);ctx.closePath();ctx.fill();
   ctx.strokeStyle=locked?'#ff995f':'#eebd6e80';ctx.lineWidth=1.5;ctx.setLineDash([9,8]);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+dx*reach,e.y+dy*reach);ctx.stroke();ctx.setLineDash([]);
  }
 }
 ctx.restore();
}
function cable(ctx:CanvasRenderingContext2D,x:number,y:number,ex:number,ey:number,retracting:boolean){
 const dx=ex-x,dy=ey-y,sag=Math.min(16,Math.hypot(dx,dy)*(retracting?.015:.06));
 for(const [width,color] of [[7,'#101a1ddd'],[4,'#7e9597'],[1,'#e8d9a5']] as const){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();for(let i=0;i<=14;i++){const u=i/14,px=x+dx*u,py=y+dy*u+Math.sin(u*Math.PI)*sag;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.stroke()}
}
function claw(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,e:Enemy,x:number,y:number){
 const direction=e.brute!.direction,view=bruteView(direction),url=BRUTE_ATLAS.claws?.[view.source],image=url?imgs['brute-'+url.split('/').at(-1)!.replace('.webp','')]:undefined;if(!image)return;
 ctx.save();ctx.translate(x,y);ctx.rotate(e.brute!.angle-DIRECTION_ANGLES[direction]);if(view.mirror)ctx.scale(-1,1);ctx.drawImage(image,-36,-36,72,72);ctx.restore();
}
export function drawBruteEffects(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World){
 const t=timeOf(w),reduced=!!w.weather?.reducedMotion;ctx.save();
 for(const e of w.enemies){const b=e.brute;if(e.hp<=0||e.kind!=='iron-brute'||!b)continue;const frame=bruteFrame(e,t),lift=bruteLift(e,t,reduced),view=bruteView(b.direction),hand=bruteHand(e,frame),offset=bruteBodyOffset(e,t,reduced);
  if(b.hook&&['hook-out','hook-return','pull'].includes(b.phase)){
   const end=b.phase==='pull'?{x:w.player.x,y:w.player.y-BRUTE.hookHeight-(w.bruteGrab?.lift??0)}: {x:b.hook.head.x,y:b.hook.head.y-BRUTE.hookHeight};
   cable(ctx,hand.x,hand.y,end.x,end.y,b.phase!=='hook-out');claw(ctx,imgs,e,end.x,end.y);
  }
  if(b.phase==='hook-windup'){
   const progress=clamp((t-b.since)/BRUTE.hookWindup),r=12+progress*13,halo=ctx.createRadialGradient(hand.x,hand.y,0,hand.x,hand.y,r*1.7);halo.addColorStop(0,'#ffe7aa90');halo.addColorStop(.35,'#ff862c60');halo.addColorStop(1,'#ff502000');ctx.fillStyle=halo;circle(ctx,hand.x,hand.y,r*1.7);ctx.fill();
   ctx.strokeStyle='#ffc477';ctx.lineWidth=1.6;ctx.beginPath();for(let i=0;i<3;i++){const a=i*TAU/3+.4,near=r*.75,far=near+(1-progress)*18+4;ctx.moveTo(hand.x+Math.cos(a)*near,hand.y+Math.sin(a)*near);ctx.lineTo(hand.x+Math.cos(a)*far,hand.y+Math.sin(a)*far)}ctx.stroke();
  }
  if(['jump-windup','melee-windup'].includes(b.phase)){
   const progress=clamp((t-b.since)/(b.phase==='jump-windup'?BRUTE.windup:BRUTE.meleeWindup));ctx.globalAlpha=.35+progress*.65;ctx.strokeStyle='#ffc486';ctx.lineWidth=2;ctx.beginPath();
   for(let i=0;i<3;i++){const x=hand.x+offset.x-9+i*9,y=hand.y+offset.y;ctx.moveTo(x,y+5);ctx.lineTo(x+(i-1)*3,y-5-progress*12)}ctx.stroke();ctx.globalAlpha=1;
  }
  for(const [ex,ey,radius] of bruteEyes(b.direction,frame)){
   const x=e.x+(ex-192)*k*(view.mirror?-1:1)+offset.x,y=e.y+(ey-330)*k-lift+offset.y,r=radius*k;
   // A carried character can obscure the recessed visor. Its light must stay
   // behind the character's head rather than painting red spots onto their hair.
   if(w.bruteGrab?.enemyId===e.id&&bruteCarrying(b)&&!b.direction.startsWith('up')){const held=bruteHeldPose(w,e);if(Math.abs(x-held.x)<34&&y>held.y-119&&y<held.y-62)continue}
   const halo=ctx.createRadialGradient(x,y,0,x,y,r*3);halo.addColorStop(0,'#ff3824ae');halo.addColorStop(1,'#ff241900');ctx.fillStyle=halo;circle(ctx,x,y,r*3);ctx.fill();ctx.fillStyle=b.phase==='crush'?'#fff0b2':'#ff7c5c';circle(ctx,x,y,r*.68);ctx.fill();
  }
  if(e.hp<e.maxHp||b.phase!=='stalk'){
   const hp=clamp(e.hp/e.maxHp),lag=e.motion?clamp((e.motion.healthFrom+(e.hp-e.motion.healthFrom)*clamp((t-e.motion.hitAt-.1)/.5))/e.maxHp):hp,x=e.x-49,y=e.y-245-lift;ctx.fillStyle='#122226ee';ctx.fillRect(x,y,98,9);ctx.fillStyle='#ffd299';ctx.fillRect(x+2,y+2,94*Math.max(hp,lag),5);ctx.fillStyle='#d95d3e';ctx.fillRect(x+2,y+2,94*hp,5);
  }
 }
 const owner=bruteCaptor(w);if(owner&&brutePlayerCarried(w)){
  const pose=bruteHeldPose(w,owner),x=pose.x,y=pose.y-145;ctx.font="900 12px 'Barlow Condensed'";ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#111e21';ctx.fillStyle='#ffe5b2';ctx.strokeText('BREAK FREE',x,y);ctx.fillText('BREAK FREE',x,y);
  for(let i=0;i<BRUTE.escapeTaps;i++){ctx.fillStyle=i<(w.bruteGrab?.escape??0)?'#a9edc1':'#6d4131';ctx.fillRect(x-26+i*14,y+5,10,4)}
 }
 for(const fx of w.effects){const age=t-fx.born;if(age<0)continue;
  if(fx.type==='brute-slam'&&!fx.heavy&&age<.22){
   // A compact knuckle contact, not a second earth-shattering landing.
   const life=1-age/.22,x=fx.x,y=fx.y-64;ctx.globalAlpha=life;ctx.strokeStyle=fx.amount?'#ffe3ab':'#c2d0ce88';ctx.lineWidth=2;ctx.beginPath();
   for(let i=0;i<(reduced?3:7);i++){const a=i*TAU/7+fx.id,r=5+(reduced?0:age*65);ctx.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);ctx.lineTo(x+Math.cos(a)*(r+life*10),y+Math.sin(a)*(r+life*10))}ctx.stroke();
  }
  if((fx.type==='brute-crush'||fx.type==='brute-catch')&&age<.35){const life=1-age/.35,x=fx.x,y=fx.y-(fx.type==='brute-catch'?65:0);ctx.globalAlpha=life;ctx.strokeStyle='#ffd3a0';ctx.lineWidth=2.2;ctx.beginPath();for(let i=0;i<(reduced?3:9);i++){const a=i*TAU/9+fx.id,r=8+(reduced?0:age*100);ctx.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);ctx.lineTo(x+Math.cos(a)*(r+life*12),y+Math.sin(a)*(r+life*12))}ctx.stroke()}
  if(fx.type==='brute-step'&&age<.3&&!reduced){ctx.globalAlpha=(1-age/.3)*.3;ctx.fillStyle='#bc9e6a25';ctx.beginPath();ctx.ellipse(fx.x+(fx.id%2?32:-32),fx.y,12+age*28,5+age*9,0,0,TAU);ctx.fill()}
 }
 ctx.restore();
}

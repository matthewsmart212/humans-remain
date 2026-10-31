import {houndDrawables,drawHoundGround,drawHoundEffects} from './hound-renderer';
import {bomberDrawables} from './bomber-renderer';
import {skitterDrawables,drawSkitterEffects} from './skitter-renderer';
import {bruteDrawables,drawBruteGround,drawBruteEffects} from './brute-renderer';
import {timeOf,type World,type Direction} from './survival-engine';
import {WALKER_ATTACK} from './combat-model';
import {walkerFrame,walkerView,walkerEyes,walkerRecoil,walkerFistOffset,WALKER_CELL,WALKER_ANCHOR,WALKER_DISPLAY} from './walker-sprites';

const SIZE=WALKER_DISPLAY,TAU=Math.PI*2,clamp=(n:number)=>Math.max(0,Math.min(1,n));
function drawSprite(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,direction:Direction,frame:number){
 const view=walkerView(direction),sheet=imgs[view.key];if(!sheet)return;
 ctx.save();if(view.mirror)ctx.scale(-1,1);
 const k=SIZE/WALKER_CELL;ctx.drawImage(sheet,(frame%4)*WALKER_CELL,Math.floor(frame/4)*WALKER_CELL,WALKER_CELL,WALKER_CELL,-WALKER_ANCHOR[0]*k,-WALKER_ANCHOR[1]*k,SIZE,SIZE);
 if(frame>=10){
  // Disabled glass is dark even if a generated fall pose retained red pixels.
  for(const [x,y,r] of walkerEyes(direction,frame)){ctx.fillStyle='#10191c';ctx.beginPath();ctx.ellipse((x-WALKER_ANCHOR[0])*k,(y-WALKER_ANCHOR[1])*k,r*k*1.25,r*k*1.1,0,0,TAU);ctx.fill()}
 }
 ctx.restore();
}
function sector(ctx:CanvasRenderingContext2D,x:number,y:number,angle:number,r:number){
 ctx.beginPath();ctx.moveTo(x,y);
 for(let i=0;i<=18;i++){const a=angle-WALKER_ATTACK.halfArc+WALKER_ATTACK.halfArc*2*i/18;ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r)}ctx.closePath();
}

/** Ground-space warnings match the actual reach and angle, with a steadily
 * filling edge (no flashing). Only the two committed attackers draw a sector. */
export function drawCombatGround(ctx:CanvasRenderingContext2D,w:World,imgs:Record<string,HTMLImageElement>={}){
 if(!w.combatTest)return;const t=timeOf(w);ctx.save();
 drawBruteGround(ctx,w,imgs);drawHoundGround(ctx,w,imgs);
 for(const e of w.enemies){const m=e.motion;if(e.kind==='scrap-bomber'||e.kind==='skitter'||e.kind==='iron-brute'||e.kind==='scrap-hound'||!m||!['windup','strike'].includes(m.phase))continue;
  const progress=m.phase==='strike'?1:clamp((t-m.since)/WALKER_ATTACK.windup);
  ctx.fillStyle=m.phase==='strike'?'#ff5a202d':'#cf261017';ctx.strokeStyle='#ff50102b';ctx.lineWidth=8;
  sector(ctx,e.x,e.y,m.angle,WALKER_ATTACK.reach);ctx.stroke();
  ctx.strokeStyle='#ff712bdf';ctx.lineWidth=2;
  sector(ctx,e.x,e.y,m.angle,WALKER_ATTACK.reach);ctx.fill();ctx.stroke();
  ctx.strokeStyle='#ffdf8c';ctx.lineWidth=3;ctx.beginPath();
  for(let i=0;i<=18;i++){const a=m.angle-WALKER_ATTACK.halfArc+WALKER_ATTACK.halfArc*2*i/18*progress,x=e.x+Math.cos(a)*WALKER_ATTACK.reach,y=e.y+Math.sin(a)*WALKER_ATTACK.reach;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();
 }
 ctx.restore();
}

export function combatDrawables(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World){
 const t=timeOf(w);
 const out=w.enemies.filter(e=>e.hp>0&&e.kind!=='scrap-bomber'&&e.kind!=='skitter'&&e.kind!=='iron-brute'&&e.kind!=='scrap-hound').map(e=>({y:e.y,draw:()=>{
  const m=e.motion,direction=m?.direction??(e.faceRight?'down-right':'down-left');
  ctx.save();ctx.translate(e.x,e.y);ctx.globalAlpha=clamp((t-(e.spawnedAt??-1))/.2);
  const recoil=walkerRecoil(e,t,!!w.weather?.reducedMotion);ctx.translate(recoil.x,recoil.y);
  if(e.flashUntil>t)ctx.filter='brightness(2)';
  drawSprite(ctx,imgs,direction,walkerFrame(e,t));ctx.restore();
  if(e.hp<e.maxHp||m?.phase==='windup'){
   const hp=clamp(e.hp/e.maxHp),lag=m?clamp((m.healthFrom+(e.hp-m.healthFrom)*clamp((t-m.hitAt-.1)/.45))/e.maxHp):hp;
   ctx.save();ctx.fillStyle='#0e2228eb';ctx.fillRect(e.x-31,e.y-153,62,7);
   ctx.fillStyle='#fce2ad';ctx.fillRect(e.x-29,e.y-151,58*Math.max(hp,lag),3);
   ctx.fillStyle='#d88457';ctx.fillRect(e.x-29,e.y-151,58*hp,3);ctx.restore();
  }
 }}));
 // Defeated enemies leave a brief, depth-sorted collapse rather than vanishing.
 for(const e of w.effects){const age=t-e.born;if(e.enemyKind!=='scrap-walker'||e.type!=='kill'||age<0||age>1.1)continue;
  out.push({y:e.y,draw:()=>{ctx.save();ctx.translate(e.x,e.y);ctx.globalAlpha=1-clamp((age-.35)/.75);drawSprite(ctx,imgs,e.direction??'down',age<.14?10:11);ctx.restore()}});
 }
 return [...out,...bomberDrawables(ctx,imgs,w),...skitterDrawables(ctx,imgs,w),...bruteDrawables(ctx,imgs,w),...houndDrawables(ctx,imgs,w)];
}

/** Self-lit visor lenses keep the same registration as the painted pose. */
export function drawWalkerEmissives(ctx:CanvasRenderingContext2D,w:World){
 const t=timeOf(w),k=SIZE/WALKER_CELL;
 for(const e of w.enemies){if(e.hp<=0||e.kind!=='scrap-walker')continue;
  const direction=e.motion?.direction??'down',view=walkerView(direction),frame=walkerFrame(e,t),recoil=walkerRecoil(e,t,!!w.weather?.reducedMotion);
  ctx.save();ctx.translate(e.x+recoil.x,e.y+recoil.y);if(view.mirror)ctx.scale(-1,1);ctx.globalAlpha=clamp((t-(e.spawnedAt??-1))/.2);
  for(const [ex,ey,radius] of walkerEyes(direction,frame)){
   const x=(ex-WALKER_ANCHOR[0])*k,y=(ey-WALKER_ANCHOR[1])*k,r=radius*k;
   const halo=ctx.createRadialGradient(x,y,0,x,y,r*3);halo.addColorStop(0,'#ff271aa6');halo.addColorStop(1,'#ff271a00');ctx.fillStyle=halo;ctx.beginPath();ctx.ellipse(x,y,r*3,r*3,0,0,TAU);ctx.fill();
   const lens=ctx.createRadialGradient(x,y,0,x,y,r);lens.addColorStop(0,'#fff1d4');lens.addColorStop(.2,'#ffa28b');lens.addColorStop(.55,'#ff3026');lens.addColorStop(1,'#ab1020');ctx.fillStyle=lens;ctx.beginPath();ctx.ellipse(x,y,r,r,0,0,TAU);ctx.fill();
  }
  ctx.restore();
 }
}

/** Short, pose-registered servo charge and tapered punch streaks. These render
 * after darkness, share the strike clock, and disappear immediately on interrupt. */
function drawWalkerPunch(ctx:CanvasRenderingContext2D,w:World,t:number){
 const reduced=!!w.weather?.reducedMotion;
 for(const e of w.enemies){const m=e.motion;if(e.hp<=0||e.kind!=='scrap-walker'||!m||!['windup','strike'].includes(m.phase))continue;
  const age=t-m.since,charging=m.phase==='windup',progress=charging?clamp(age/WALKER_ATTACK.windup):clamp(age/WALKER_ATTACK.strike);
  const fist=walkerFistOffset(m.direction,walkerFrame(e,t)),x=e.x+fist.x,y=e.y+fist.y,r=charging?13+progress*10:23-progress*8;
  ctx.save();ctx.globalAlpha=charging?.35+progress*.55:1-progress*.8;
  const halo=ctx.createRadialGradient(x,y,3,x,y,r*1.8);halo.addColorStop(0,'#ffca6840');halo.addColorStop(.45,'#ff641c70');halo.addColorStop(1,'#ff361000');
  ctx.fillStyle=halo;ctx.beginPath();ctx.ellipse(x,y,r*1.8,r*1.8,0,0,TAU);ctx.fill();
  if(charging){
   // Open crescent traces the knuckle casing, leaving the painted fist visible.
   const start=-Math.PI*.85,end=start+Math.PI*(.55+progress*1.1);
   for(const [width,color] of [[7,'#ff53164d'],[2,'#ffb73c'],[.8,'#fff0b9']] as const){
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();for(let i=0;i<=16;i++){const a=start+(end-start)*i/16,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r*.85;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.stroke();
   }
   if(!reduced){ctx.strokeStyle='#ffe6a5';ctx.lineWidth=1.4;ctx.beginPath();for(let i=0;i<5;i++){const a=i*TAU/5+e.id*.7,near=r+4,far=near+(1-progress)*15;ctx.moveTo(x+Math.cos(a)*near,y+Math.sin(a)*near);ctx.lineTo(x+Math.cos(a)*far,y+Math.sin(a)*far)}ctx.stroke()}
  }else if(!reduced){
   const from=walkerFistOffset(m.direction,4),sx=e.x+from.x,sy=e.y+from.y;
   // Curved streaks connect the actual raised and extended fist in each view.
   for(let strand=-1;strand<=1;strand++){
    const dx=x-sx,dy=y-sy,len=Math.max(1,Math.hypot(dx,dy)),bend=12+strand*6;
    for(const [width,color] of [[8,'#ff531630'],[3,'#ff861caa'],[1,'#fff0b9']] as const){
     ctx.lineWidth=width;ctx.strokeStyle=color;ctx.beginPath();
     for(let i=0;i<=14;i++){const u=.15+(.85*i/14),arc=Math.sin(u*Math.PI)*bend,px=sx+dx*u-dy/len*arc,py=sy+dy*u+dx/len*arc;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.stroke();
    }
   }
  }
  ctx.restore();
 }
}

function drawWalkerImpact(ctx:CanvasRenderingContext2D,x:number,y:number,age:number,angle:number,reduced:boolean,id:number){
 if(age>.3)return;const life=1-age/.3,r=reduced?17:12+age*115;
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha=life;
 const flash=ctx.createRadialGradient(0,0,0,0,0,r*1.5);flash.addColorStop(0,'#fff3bd');flash.addColorStop(.15,'#ffca66a0');flash.addColorStop(.5,'#ff581c45');flash.addColorStop(1,'#ff361000');ctx.fillStyle=flash;ctx.beginPath();ctx.ellipse(0,0,r*1.5,r*1.5,0,0,TAU);ctx.fill();
 ctx.strokeStyle='#ffb64c';ctx.lineWidth=2*life;ctx.beginPath();ctx.ellipse(0,0,r*.55,r,0,0,TAU);ctx.stroke();
 if(!reduced){
  for(const [width,color] of [[4,'#ff5d2280'],[1.6,'#fff0af']] as const){ctx.lineWidth=width;ctx.strokeStyle=color;ctx.beginPath();
   for(let i=0;i<10;i++){const a=i*TAU/10+id*.71,travel=9+age*(100+(i%3)*60),sx=Math.cos(a)*travel,sy=Math.sin(a)*travel;ctx.moveTo(sx,sy);ctx.lineTo(sx+Math.cos(a)*(4+life*12),sy+Math.sin(a)*(4+life*12))}ctx.stroke();
  }
 }
 ctx.restore();
}

/** Bounded, deterministic particles. No DOM nodes, textures, timers or random
 * allocation per spark; all expire with the existing 1.2-second effect queue. */
export function drawCombatFeedback(ctx:CanvasRenderingContext2D,w:World,imgs:Record<string,HTMLImageElement>={}){
 if(!w.combatTest)return;const t=timeOf(w),reduced=w.weather?.reducedMotion;ctx.save();
 drawWalkerPunch(ctx,w,t);
 drawSkitterEffects(ctx,w);drawHoundEffects(ctx,w);
 drawBruteEffects(ctx,imgs,w);
 for(const e of w.effects.slice(-48)){const age=t-e.born;if(age<0||age>1.05)continue;
  if(e.target==='animal'||e.target==='player')continue;
  if(e.type==='enemy-strike'&&e.enemyKind==='scrap-walker'){
   if((e.amount??0)>0)drawWalkerImpact(ctx,e.x,e.y,age,e.angle??0,!!reduced,e.id);
   continue;
  }
  if(['hit','kill','damage','enemy-strike'].includes(e.type)&&age<.38){
   const life=1-age/.38,isHit=e.type==='hit',isKill=e.type==='kill',floor=e.type==='enemy-strike'&&e.enemyKind!=='scrap-walker',count=reduced?3:isKill||e.heavy?12:8;
   ctx.globalAlpha=life;ctx.strokeStyle=e.type==='damage'?'#e68b7e':floor?'#e1b375':'#ffe2a3';ctx.lineWidth=isHit?2.6:1.7;ctx.beginPath();
   for(let i=0;i<count;i++){const angle=i*Math.PI*2/count+e.id*.71,travel=(reduced?8:12+age*(isKill?180:130)),x=e.x+Math.cos(angle)*travel,y=e.y-(floor?0:35)+Math.sin(angle)*travel*(floor?.4:.75)+age*age*80;ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(angle)*(3+life*8),y+Math.sin(angle)*(3+life*6))}ctx.stroke();
   if(floor||e.heavy){ctx.globalAlpha=life*(floor?.32:.16);ctx.strokeStyle='#d0b488';ctx.beginPath();ctx.ellipse(e.x,e.y,12+age*80,5+age*30,0,0,Math.PI*2);ctx.stroke()}
  }
  if(e.label&&['hit','damage','evade'].includes(e.type)){
   ctx.globalAlpha=1-clamp((age-.45)/.5);ctx.font="900 21px 'Barlow Condensed'";ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#10282dee';ctx.fillStyle=e.type==='damage'?'#ffa99a':e.type==='evade'?'#b9e7de':'#ffe4ad';
   const y=e.y-100-(reduced?0:Math.min(1,age/.55)*26);ctx.strokeText(e.label,e.x,y);ctx.fillText(e.label,e.x,y);
   if(e.interrupted){ctx.font="900 13px 'Barlow Condensed'";ctx.fillStyle='#c5e1d8';ctx.strokeText('INTERRUPT',e.x,y+17);ctx.fillText('INTERRUPT',e.x,y+17)}
  }
  if(e.type==='dodge'&&age<.22&&!reduced){ctx.globalAlpha=(1-age/.22)*.35;ctx.strokeStyle='#bfded0';ctx.lineWidth=2;ctx.beginPath();for(let i=-1;i<=1;i++){const a=e.angle??0,side=i*10,x=e.x-Math.sin(a)*side,y=e.y+Math.cos(a)*side-10;ctx.moveTo(x,y);ctx.lineTo(x-Math.cos(a)*(18+age*35),y-Math.sin(a)*(18+age*35))}ctx.stroke()}
 }
 ctx.restore();
}

export function drawCombatScreenFeedback(ctx:CanvasRenderingContext2D,w:World){
 if(!w.combatTest)return;const t=timeOf(w);let hit;
 for(let i=w.effects.length-1;i>=0;i--)if(w.effects[i].type==='damage'&&t-w.effects[i].born<.32){hit=w.effects[i];break}if(!hit)return;
 const {width,height}=ctx.canvas,fade=1-(t-hit.born)/.32;ctx.save();ctx.globalAlpha=fade*(w.weather?.reducedMotion?.14:.3);
 const glow=ctx.createRadialGradient(width/2,height/2,Math.min(width,height)*.25,width/2,height/2,Math.max(width,height)*.6);glow.addColorStop(0,'#b64c3200');glow.addColorStop(1,'#b64c32');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);ctx.restore();
}

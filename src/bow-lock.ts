import {BOW_SHOT} from './bow-combat';
import {hasGear} from './player-gear';
import {DIRECTION_ANGLES,timeOf,worldBlocked,type Animal,type Enemy,type Vec,type World} from './survival-engine';

export type BowTargetRef={kind:'animal'|'enemy';id:number};
export type BowLock=BowTargetRef&{acquiredAt:number;checkedAt:number;sampleAt:number;x:number;y:number;vx:number;vy:number};
export type BowTargetView={x:number;y:number;width:number;height:number;scale:number};
export type BowTarget={ref:BowTargetRef;entity:Animal|Enemy};
const views=new WeakMap<World,BowTargetView>();
/** Camera bounds only constrain the player's acquisition gesture, never a shot. */
export function setBowTargetView(w:World,view:BowTargetView){views.set(w,view)}
const canLock=(w:World)=>w.player.equipped==='bow'&&hasGear(w,'bow')&&w.player.hp>0&&!w.player.downedUntil&&w.phase!=='over'&&!w.stationPanel;
export function bowTarget(w:World,ref:BowTargetRef):BowTarget|undefined{
 const entity=(ref.kind==='animal'?w.animals:w.enemies).find(a=>a.id===ref.id&&a.hp>0);
 return entity?{ref,entity}:undefined;
}
/** Cheap read for HUD/rendering. Collision is checked by the fixed-step simulation. */
export function bowLockTarget(w:World):BowTarget|undefined{
 if(!w.bowLock||!canLock(w))return;
 const target=bowTarget(w,w.bowLock);
 return target&&Math.hypot(target.entity.x-w.player.x,target.entity.y-w.player.y)<=BOW_SHOT.range?target:undefined;
}
export function bowTargetName(target:BowTarget){
 if(target.ref.kind==='enemy'){const kind=(target.entity as Enemy).kind;return kind==='scrap-hound'?'SCRAP HOUND':kind==='iron-brute'?'IRON BRUTE':kind==='skitter'?'SKITTER':kind==='scrap-bomber'?'SCRAP BOMBER':'SCRAP WALKER'}
 const a=target.entity as Animal;
 return a.predator?.kind==='boar'?'BOAR':a.predator?.kind==='wolf'?'WOLF':a.deer?.kind==='stag'?'STAG':a.deer?'DOE':a.rabbit?'RABBIT':a.chicken?'CHICKEN':'WILDLIFE';
}
export function bowTargetHeight(target:BowTarget){
 if(target.ref.kind==='enemy')return (target.entity as Enemy).kind==='iron-brute'?210:(target.entity as Enemy).kind==='skitter'?60:(target.entity as Enemy).kind==='scrap-hound'?100:110;
 const a=target.entity as Animal;
 return a.predator?100:a.deer?.kind==='stag'?142:a.deer?124:a.rabbit?66:65;
}
/** Same collision and arrow radius as projectiles; sample thin authored cover. */
export function bowLineClear(w:World,to:Vec){
 const p=w.player,n=Math.max(1,Math.ceil(Math.hypot(to.x-p.x,to.y-p.y)/8));
 for(let i=1;i<=n;i++)if(worldBlocked(w,p.x+(to.x-p.x)*i/n,p.y+(to.y-p.y)*i/n,2,false))return false;
 return true;
}
export function clearBowLock(w:World){w.bowLock=undefined;if(w.bowShot&&!w.bowShot.released)w.bowShot.target=undefined}
export function stepBowLock(w:World,force=false){
 if(!w.bowLock)return;
 const target=bowLockTarget(w),lock=w.bowLock,t=timeOf(w);
 if(!target){clearBowLock(w);return}
 if(force||t-lock.checkedAt>=.12){
  if(!bowLineClear(w,target.entity)){clearBowLock(w);return}
  lock.checkedAt=t;
 }
 const dt=t-lock.sampleAt;
 if(dt>0){
  const vx=(target.entity.x-lock.x)/dt,vy=(target.entity.y-lock.y)/dt;
  // Ignore teleports and paused/replaced sessions; retain only real locomotion.
  if(dt<=.15&&Math.hypot(vx,vy)<=550){lock.vx=lock.vx*.25+vx*.75;lock.vy=lock.vy*.25+vy*.75}else{lock.vx=0;lock.vy=0}
  lock.x=target.entity.x;lock.y=target.entity.y;lock.sampleAt=t;
 }
 return target;
}
export function toggleBowLock(w:World,view=views.get(w)){
 if(!canLock(w))return false;
 if(w.bowLock){clearBowLock(w);return true}
 const p=w.player,angle=DIRECTION_ANGLES[p.direction];
 const candidates:BowTarget[]=[...w.animals.map(entity=>({entity,ref:{kind:'animal' as const,id:entity.id}})),...w.enemies.map(entity=>({entity,ref:{kind:'enemy' as const,id:entity.id}}))];
 const score=(target:BowTarget)=>{const dx=target.entity.x-p.x,dy=target.entity.y-p.y;return Math.hypot(dx,dy)*(1+.5*(1-Math.cos(Math.atan2(dy,dx)-angle)))};
 const target=candidates.filter(target=>{
  const a=target.entity,cy=a.y-bowTargetHeight(target)*.45;
  return a.hp>0&&Math.hypot(a.x-p.x,a.y-p.y)<=BOW_SHOT.range&&(!view||(a.x>=view.x+16/view.scale&&a.x<=view.x+view.width-16/view.scale&&cy>=view.y+16/view.scale&&cy<=view.y+view.height-16/view.scale));
 }).sort((a,b)=>score(a)-score(b)||a.ref.id-b.ref.id).find(target=>bowLineClear(w,target.entity));
 if(!target){w.notice='No clear target in range';w.noticeUntil=timeOf(w)+1.6;return false}
 const t=timeOf(w);
 w.bowLock={...target.ref,acquiredAt:t,checkedAt:t,sampleAt:t,x:target.entity.x,y:target.entity.y,vx:0,vy:0};
 return true;
}
/** Lead steady movement at release. Flight stays straight; arrows never home. */
export function bowLockedAim(w:World,target:BowTarget){
 const p=w.player,a=target.entity,lock=w.bowLock,dx=a.x-p.x,dy=a.y-p.y;
 if(!lock)return Math.atan2(dy,dx);
 const vx=lock.vx,vy=lock.vy,A=vx*vx+vy*vy-BOW_SHOT.speed**2,B=2*(dx*vx+dy*vy),C=dx*dx+dy*dy;
 const disc=B*B-4*A*C;
 const travel=disc>=0&&Math.abs(A)>.001?(-B-Math.sqrt(disc))/(2*A):0;
 const lead=travel>0&&travel<=BOW_SHOT.range/BOW_SHOT.speed?travel:0;
 const aim={x:a.x+vx*lead,y:a.y+vy*lead};
 // Prediction must never ask the player to shoot into cover or past bow range.
 const clear=lead>0&&Math.hypot(aim.x-p.x,aim.y-p.y)<=BOW_SHOT.range&&bowLineClear(w,aim);
 return Math.atan2((clear?aim.y:a.y)-p.y,(clear?aim.x:a.x)-p.x);
}

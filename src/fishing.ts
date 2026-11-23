import type {Direction,Vec,World} from './survival-engine';
import type {Placement} from './world-layout';
import {usesPaintedHomeTerrain} from './terrain-art';
import {riverWaterContains} from './river-collision';
import {fishingPiers,fishingPierDeckContains,fishingPierPoint} from './fishing-site-geometry';
import {fishingFishPosition,fishingFishSchool} from './fishing-water-life';
import {FISHING_REEDS_ID} from './fishing-site-art';
import {FISHING_ART} from './fishing-art';
import {gear,hasGear,GEAR} from './player-gear';
import {addInventory,canCarryCount,packWeight,PACK_CAPACITY} from './expedition-inventory';
import type {FishingProgress,FishingSession,FishingHud,FishingRenderState,FishingVisualFish} from './fishing-types';
export type {FishingProgress,FishingSession,FishingHud,FishingRenderState} from './fishing-types';

export const FISHING_BAIT_LIMIT=10;
export const FISHING_CAST_SECONDS=.68;
export const FISHING_BITE_SECONDS=2.2;
export const FISHING_LANDING_SECONDS=.9;
const TAU=Math.PI*2,now=(w:World)=>w.tick/60;
const fishClock=(w:World)=>w.weather?.reducedMotion?0:now(w);
const clamp=(n:number,min=0,max=1)=>Math.max(min,Math.min(max,n));
const length=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y);
const mix=(a:Vec,b:Vec,t:number):Vec=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
const smooth=(t:number)=>t*t*(3-2*t);
const directions:Direction[]=['right','down-right','down','down-left','left','up-left','up','up-right'];
const facing=(a:Vec,b:Vec)=>directions[(Math.round(Math.atan2(b.y-a.y,b.x-a.x)/(Math.PI/4))+8)%8];
function notice(w:World,message:string){w.notice=message;w.noticeUntil=now(w)+3.5}

/** Only progress and an undecided catch are saved. Held input is never saved. */
export function fishingProgress(w:World):FishingProgress{
 return w.fishing??={version:1,bait:0,claimed:false,attempts:0,caught:0,kept:0,released:0,bestKg:0,baitReadyAt:0,autoHook:false,toggleReel:false};
}
function available(w:World){
 const p=w.player;
 return !w.scene&&!!w.layout&&usesPaintedHomeTerrain(w.layout.terrainImage)&&w.phase!=='over'&&p.hp>0&&!p.downedUntil&&!w.stationPanel&&!w.bruteGrab&&!w.buildingRepair&&!w.dodge&&!w.axeSwing&&!w.spearThrust&&!w.swordThrust&&!w.bowShot&&now(w)>=w.attackUntil;
}
function equipped(w:World){return available(w)&&w.player.equipped==='fishingRod'&&hasGear(w,'fishingRod')}
/** The whole fish/float footprint stays in water and outside every deck. */
export function fishingOpenWater(w:World,p:Vec,r=32){
 if(!riverWaterContains(p.x,p.y,r))return false;
 for(const pier of fishingPiers(w.layout)){
  if(fishingPierDeckContains(pier,p.x,p.y))return false;
  for(let i=0;i<8;i++)if(fishingPierDeckContains(pier,p.x+Math.cos(i*TAU/8)*r,p.y+Math.sin(i*TAU/8)*r))return false;
 }
 return true;
}
function waterPath(w:World,a:Vec,b:Vec,r=28){
 const steps=Math.max(1,Math.ceil(length(a,b)/18));
 for(let i=0;i<=steps;i++)if(!fishingOpenWater(w,mix(a,b,i/steps),r))return false;
 return true;
}
/** A cast can leave a bank/deck, but must not cross land after entering water. */
function castLanding(w:World,origin:Vec,target:Vec):Vec|null{
 const distance=length(origin,target);if(distance<90||distance>520||!fishingOpenWater(w,target,36))return null;
 const steps=Math.ceil(distance/14);let landing:Vec|null=null;
 for(let i=1;i<=steps;i++){
  const point=mix(origin,target,i/steps),wet=fishingOpenWater(w,point,36);
  if(wet&&!landing)landing=point;
  else if(!wet&&landing)return null;
 }
 return landing&&length(landing,target)>52?landing:null;
}
function visualFish(pier:Placement,index:number,t:number):FishingVisualFish|null{
 const f=fishingFishSchool(pier)[index];if(!f||f.variant!==0)return null;
 const pose=fishingFishPosition(f,t);return{x:pose.x,y:pose.y,angle:pose.angle,size:f.size,variant:f.variant};
}
type CastChoice={pier:Placement;index:number;fish:FishingVisualFish;target:Vec;landing:Vec};
function chargedTarget(w:World,origin:Vec,fish:Vec,charge:number){
 const distance=length(origin,fish),dx=(fish.x-origin.x)/Math.max(1,distance),dy=(fish.y-origin.y)/Math.max(1,distance);
 // Length is intentionally forgiving: invalid far casts shorten at the bank.
 for(let extra=24+charge*100;extra>=0;extra-=12){
  const target={x:fish.x+dx*extra,y:fish.y+dy*extra},landing=castLanding(w,origin,target);
  if(landing&&waterPath(w,fish,target))return{target,landing};
 }
 const landing=castLanding(w,origin,fish);return landing?{target:{x:fish.x,y:fish.y},landing}:null;
}
function chooseCast(w:World,charge=0):CastChoice|null{
 let chosen:CastChoice|null=null,best=Infinity;
 for(const pier of fishingPiers(w.layout)){
  if(length(w.player,pier)>1100)continue;
  const school=fishingFishSchool(pier);
  for(let index=0;index<school.length;index++){
   const fish=visualFish(pier,index,fishClock(w));if(!fish)continue;
   const distance=length(w.player,fish);if(distance<100||distance>460)continue;
   const cast=chargedTarget(w,w.player,fish,charge);if(!cast)continue;
   // Prefer a nearby visible perch; tapping automatically faces that water.
   const score=distance+(facing(w.player,fish)===w.player.direction?0:35);
   if(score<best){best=score;chosen={pier,index,fish,...cast}}
  }
 }
 return chosen;
}
function phase(s:FishingSession,next:FishingSession['phase'],t:number){s.phase=next;s.started=t;s.input='none';s.holding=false}
function escape(w:World,message:string){const s=w.fishingSession;if(!s)return;s.fishStart={...s.fish};phase(s,'escaped',now(w));notice(w,message)}
function hook(w:World){
 const s=w.fishingSession;if(!s||s.phase!=='bite')return false;
 phase(s,'reeling',now(w));s.input='hook';s.tension=.24;s.distance=s.initialDistance=length(s.landingPoint,s.target);s.overload=0;s.slack=0;return true;
}
export function stopFishing(w:World,reason?:string){
 if(!w.fishingSession)return;
 w.fishingSession=undefined;if(reason)notice(w,reason);
}
export function pressFishingAction(w:World):boolean{
 const progress=fishingProgress(w),s=w.fishingSession;
 if(progress.pendingCatch||!equipped(w))return false;
 if(s){
  if(s.phase==='bite')return hook(w);
  if(s.phase==='reeling'){
   if(s.input==='reel')return false;
   s.input='reel';s.holding=progress.toggleReel?!s.holding:true;return true;
  }
  if(s.phase==='waiting'){stopFishing(w,'Line retrieved');return true}
  return false;
 }
 if(progress.bait<1){notice(w,'Gather worms beside the lakeshore reeds');return false}
 const choice=chooseCast(w);if(!choice)return false;
 const t=now(w),attempt=progress.attempts+1,origin={x:w.player.x,y:w.player.y};
 w.waypoint=undefined;w.attackQueuedUntil=undefined;
 w.player.direction=facing(origin,choice.target);w.player.moving=false;w.player.sprinting=false;w.player.walkBlend=0;w.player.runBlend=0;
 w.fishingSession={phase:'aiming',started:t,castStarted:t,origin,target:choice.target,landingPoint:choice.landing,direction:w.player.direction,pierId:choice.pier.id,fishIndex:choice.index,
  fishStart:{...choice.fish},fish:{...choice.fish},weight:Math.round((.35+((attempt*73+choice.index*37)%116)/100)*100)/100,
  charge:0,tension:0,holding:true,distance:0,initialDistance:0,overload:0,slack:0,surge:0,biteAt:0,lastHp:w.player.hp,attempt,input:'cast'};
 return true;
}
export function releaseFishingAction(w:World,cancelled=false):boolean{
 const s=w.fishingSession;if(!s)return false;
 if(s.phase==='aiming'){
  if(cancelled||!equipped(w)){stopFishing(w);return true}
  const pier=fishingPiers(w.layout).find(p=>p.id===s.pierId),fish=pier&&visualFish(pier,s.fishIndex,fishClock(w));
  // Re-sample on release: a held cast never teleports an old ambient position.
  const cast=fish&&chargedTarget(w,s.origin,fish,s.charge);
  if(!fish||!cast){stopFishing(w,'Try a clear patch of water');return false}
  s.fishStart={...fish};s.fish={...fish};s.target=cast.target;s.landingPoint=cast.landing;
  s.direction=w.player.direction=facing(s.origin,s.target);s.castStarted=now(w);
  fishingProgress(w).attempts=s.attempt;phase(s,'casting',now(w));return true;
 }
 if(s.phase==='reeling'){
  if(cancelled||!fishingProgress(w).toggleReel)s.holding=false;
  s.input='none';return true;
 }
 s.input='none';return false;
}
export function setFishingAssist(w:World,values:{autoHook?:boolean;toggleReel?:boolean}){
 const p=fishingProgress(w);
 if(typeof values.autoHook==='boolean')p.autoHook=values.autoHook;
 if(typeof values.toggleReel==='boolean'){p.toggleReel=values.toggleReel;if(w.fishingSession){w.fishingSession.holding=false;w.fishingSession.input='none'}}
}
export function resolveFishingCatch(w:World,keep:boolean):boolean{
 const p=fishingProgress(w),caught=p.pendingCatch;if(!caught)return false;
 if(keep&&addInventory(w,'rawFish',1)!==1){notice(w,'Pack full · Free some room or release the perch');return false}
 // Item award and clearing pending state are synchronous and happen once.
 p.pendingCatch=undefined;p.caught++;if(keep)p.kept++;else p.released++;
 p.bestKg=Math.max(p.bestKg,caught.kg);notice(w,keep?'Perch kept · Cook it at the campfire':'Perch released');return true;
}
function moveFish(w:World,s:FishingSession,point:Vec){
 if(!fishingOpenWater(w,point,26))return;
 const dx=point.x-s.fish.x,dy=point.y-s.fish.y;
 if(Math.hypot(dx,dy)>.001)s.fish.angle=Math.atan2(dy,dx);
 s.fish.x=point.x;s.fish.y=point.y;
}
export function stepFishing(w:World,dt:number){
 const s=w.fishingSession;if(!s)return;
 if(!equipped(w)||length(w.player,s.origin)>4||w.player.hp<s.lastHp||!fishingPiers(w.layout).some(p=>p.id===s.pierId)||!fishingOpenWater(w,s.target,32)){stopFishing(w);return}
 const t=now(w),age=t-s.started,p=fishingProgress(w);s.lastHp=w.player.hp;
 w.player.direction=s.direction;w.player.moving=false;w.player.sprinting=false;
 if(s.phase==='aiming'){
  s.charge=clamp(age/1.2);const cast=chargedTarget(w,s.origin,s.fishStart,s.charge);
  if(cast){s.target=cast.target;s.landingPoint=cast.landing;s.direction=w.player.direction=facing(s.origin,s.target)}
 }else if(s.phase==='casting'){
  if(age>=FISHING_CAST_SECONDS){phase(s,'waiting',t);s.fishStart={...s.fish};s.biteAt=t+3.6+(s.attempt%4)*.45}
 }else if(s.phase==='waiting'){
  const approach=clamp((age-.55)/Math.max(1,s.biteAt-s.started-.55)),point=mix(s.fishStart,s.target,smooth(approach));
  moveFish(w,s,point);
  if(t>=s.biteAt){
   if(p.bait<1){stopFishing(w,'No bait left');return}
   p.bait--;phase(s,'bite',t);s.biteAt=t;
   if(p.autoHook)hook(w);
  }
 }else if(s.phase==='bite'){
  if(p.autoHook)hook(w);
  else if(age>FISHING_BITE_SECONDS)escape(w,'Missed the bite · Watch for the float dipping');
 }else if(s.phase==='reeling'){
  // A readable rush, followed by a calm recovery. Holding through a rush
  // overloads the line; easing off always reduces tension, even at full load.
  const cycle=(age+(s.attempt%3)*.3)%4.8;
  s.surge=cycle>2.5&&cycle<4.05?Math.sin((cycle-2.5)/1.55*Math.PI):0;
  const delta=s.holding ? .105+s.surge*.40 : -.42;
  s.tension=clamp(s.tension+delta*dt);
  s.overload=s.tension>.95?s.overload+dt:Math.max(0,s.overload-dt*2);
  s.slack=s.holding?0:s.slack+dt;
  const reelSpeed=s.initialDistance/(12+s.weight*4);
  if(s.holding)s.distance=Math.max(0,s.distance-reelSpeed*(1-s.surge*.6)*dt);
  else s.distance=Math.min(s.initialDistance+80,s.distance+reelSpeed*(.06+s.surge*.6)*dt);
  if(s.overload>.85){escape(w,'The line snapped · Ease off when it pulls hard');return}
  if(s.slack>18||age>80){escape(w,'The perch slipped the hook');return}
  const along=clamp(s.distance/s.initialDistance),point=mix(s.landingPoint,s.target,along),dx=s.target.x-s.landingPoint.x,dy=s.target.y-s.landingPoint.y,dist=Math.max(1,Math.hypot(dx,dy));
  const sway=Math.sin(age*(2.8+s.surge*3))*Math.min(18,s.distance*.15)*(0.2+s.surge);
  const side={x:point.x-dy/dist*sway,y:point.y+dx/dist*sway};
  moveFish(w,s,fishingOpenWater(w,side,28)?side:point);
  if(s.distance<=2){phase(s,'landing',t);s.tension=.15}
 }else if(s.phase==='landing'){
  if(age>=FISHING_LANDING_SECONDS){
   p.pendingCatch={id:s.attempt,species:'perch',name:'Stillwater perch',kg:s.weight,isRecord:s.weight>p.bestKg,image:FISHING_ART.rawFish};
   w.fishingSession=undefined;
  }
 }else if(s.phase==='escaped'){
  const pier=fishingPiers(w.layout).find(p=>p.id===s.pierId),ambient=pier&&visualFish(pier,s.fishIndex,fishClock(w));
  if(ambient&&waterPath(w,s.fishStart,ambient,26))moveFish(w,s,mix(s.fishStart,ambient,smooth(clamp(age/1.05))));
  if(age>1.05)w.fishingSession=undefined;
 }
}
export function fishingHud(w:World):FishingHud|null{
 const p=w.fishing;if(!p?.pendingCatch&&w.player.equipped!=='fishingRod')return null;
 const progress=fishingProgress(w),s=w.fishingSession,caught=progress.pendingCatch;
 const phaseName=caught?'caught':s?.phase??'ready';
 const action:FishingHud['action']=caught?'CAUGHT':s?.phase==='waiting'?'RETRIEVE':s?.phase==='bite'?'HOOK':s?.phase==='reeling'?'REEL':s?.phase==='landing'?'LANDING':'CAST';
 const disabled=!!caught||!!s&&['casting','landing','escaped'].includes(s.phase)||!equipped(w)||!s&&(progress.bait<1||!chooseCast(w));
 let hint='Tap to cast · Hold for distance';
 if(caught)hint='Keep for camp cooking, or release';
 else if(s?.phase==='aiming')hint='Release to cast';
 else if(s?.phase==='casting')hint='Casting…';
 else if(s?.phase==='waiting')hint='Watch the float · Tap to retrieve';
 else if(s?.phase==='bite')hint='Bite! Hook it now';
 else if(s?.phase==='reeling')hint=s.tension>.78?'Ease off · Line under strain':s.surge>.3?'The perch is pulling · Ease off':progress.toggleReel?(s.holding?'Tap to ease off':'Tap to reel'):'Hold to reel · Release to ease off';
 else if(s?.phase==='landing')hint='Lifting your catch…';
 else if(s?.phase==='escaped')hint='The perch escaped';
 else if(!progress.bait)hint='Gather worms beside the lakeshore reeds';
 else if(disabled)hint='Move to the pier edge or a clear bank';
 return{phase:phaseName,action,hint,bait:progress.bait,tension:s?.tension??0,charge:s?.charge??0,holding:s?.holding??false,active:!!s||!!caught,disabled,
  canKeep:!!caught&&canCarryCount(w,'rawFish',1)>0,catch:caught,assists:{autoHook:progress.autoHook,toggleReel:progress.toggleReel},caught:progress.caught,bestKg:progress.bestKg};
}
export function fishingRenderState(w:World):FishingRenderState|null{
 const s=w.fishingSession;
 if(!s){
  if(w.player.equipped!=='fishingRod'||!hasGear(w,'fishingRod'))return null;
  return{phase:w.fishing?.pendingCatch?'caught':'equipped',age:0,phaseProgress:0,direction:w.player.direction,tension:0,holding:false,charge:0,lineVisible:false,bobberVisible:false};
 }
 const age=now(w)-s.started,casting=s.phase==='casting',landing=s.phase==='landing',fight=s.phase==='reeling';
 return{phase:s.phase,age,phaseProgress:clamp(age/(casting?FISHING_CAST_SECONDS:landing?FISHING_LANDING_SECONDS:1)),direction:s.direction,target:s.target,
  bobber:fight||landing?{x:s.fish.x,y:s.fish.y}:s.target,fish:s.phase==='aiming'?undefined:s.fish,pierId:s.pierId,fishIndex:s.fishIndex,
  tension:s.tension,holding:s.holding,charge:s.charge,lineVisible:!['aiming','escaped'].includes(s.phase),bobberVisible:!['aiming','escaped','landing'].includes(s.phase)};
}

export function fishingTackleTargets(w:World){
 if(!available(w)||w.fishingSession)return[];
 return fishingPiers(w.layout).map(p=>({id:p.id,...fishingPierPoint(p,490/1614,447/975)}));
}
/** Claiming is one expedition event, even when the rod is later in storage. */
export function claimFishingTackle(w:World,pierId:string):boolean{
 const p=fishingProgress(w),target=fishingTackleTargets(w).find(t=>t.id===pierId);
 if(p.claimed||!target||length(w.player,target)>70)return false;
 const inventory=gear(w),owned=(inventory.bag.fishingRod??0)+(inventory.chest.fishingRod??0)>0;
 if(!owned&&!w.creativeMode&&packWeight(w)+GEAR.fishingRod.weight>PACK_CAPACITY+1e-8){notice(w,'Make 0.8 kg of room for the fishing rod');return false}
 if(!owned)inventory.bag.fishingRod=1;
 p.claimed=true;p.bait=FISHING_BAIT_LIMIT;
 if(inventory.bag.fishingRod)w.player.equipped='fishingRod';
 notice(w,'Salvaged rod + 10 worms · Cast from the pier');return true;
}
export function fishingBaitTargets(w:World){
 if(!available(w)||!w.fishing?.claimed||w.fishingSession)return[];
 return (w.layout?.items??[]).filter(p=>p.assetId===FISHING_REEDS_ID).map(p=>({id:p.id,x:p.x,y:p.y}));
}
/** Damp reed beds replenish a small bait tin; the cooldown survives saving. */
export function gatherFishingBait(w:World,reedId:string):boolean{
 const p=fishingProgress(w),target=fishingBaitTargets(w).find(t=>t.id===reedId);
 if(!target||length(w.player,target)>70||p.bait>=FISHING_BAIT_LIMIT||now(w)<p.baitReadyAt)return false;
 const count=Math.min(4,FISHING_BAIT_LIMIT-p.bait);p.bait+=count;p.baitReadyAt=now(w)+45;
 notice(w,`${count} worms gathered · Bait ${p.bait}/${FISHING_BAIT_LIMIT}`);return true;
}

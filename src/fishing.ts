import type {Direction,Vec,World} from './survival-engine';
import type {Placement} from './world-layout';
import {usesPaintedHomeTerrain} from './terrain-art';
import {riverWaterContains} from './river-collision';
import {fishingPiers,fishingPierDeckContains,fishingPierPoint,fishingPierGeometry} from './fishing-site-geometry';
import {fishingFishPosition,fishingFishSchool,fishingAmbientFishWeight} from './fishing-water-life';
import {FISHING_REEDS_ID} from './fishing-site-art';
import {gear,hasGear,GEAR} from './player-gear';
import {packWeight,PACK_CAPACITY} from './expedition-inventory';
import {canKeepFishingCatch,keepFishingCatch,fishingCatchRewardLabel,fishingCatchRewardWeight,fishingPortions} from './fishing-rewards';
import {FISHING_SPECIES,fishingSpecies,fishingHash,fishingRandom} from './fishing-catalog';
import type {FishingProgress,FishingSession,FishingHud,FishingRenderState,FishingVisualFish,FishingSpecies,FishingFeedingSpot,FishingEvent,FishingEventType,FishingAftermath,FishingFightBehavior,FishingCatch,FishingCatchReceipt} from './fishing-types';
export type {FishingProgress,FishingSession,FishingHud,FishingRenderState} from './fishing-types';

export const FISHING_BAIT_LIMIT=10;
export const FISHING_CAST_SECONDS=.68;
export const FISHING_BITE_SECONDS=2.4;
export const FISHING_LANDING_SECONDS=1.15;
export const FISHING_RECEIPT_SECONDS=2.6;
export const FISHING_FEEDING_SECONDS=75;
const TAU=Math.PI*2,now=(w:World)=>w.tick/60;
const fishClock=(w:World)=>w.weather?.reducedMotion?0:now(w);
const clamp=(n:number,min=0,max=1)=>Math.max(min,Math.min(max,n));
const length=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y);
const mix=(a:Vec,b:Vec,t:number):Vec=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
const smooth=(t:number)=>t*t*(3-2*t);
const directions:Direction[]=['right','down-right','down','down-left','left','up-left','up','up-right'];
const facing=(a:Vec,b:Vec)=>directions[(Math.round(Math.atan2(b.y-a.y,b.x-a.x)/(Math.PI/4))+8)%8];
const fishRadius=(fish:FishingVisualFish)=>Math.max(28,Math.min(68,fish.size*(fish.species==='pike'?39:fish.species==='carp'?34:35)));
type Runtime={serial:number;event?:FishingEvent;hidden?:Map<string,number>;aftermath?:(Omit<FishingAftermath,'age'>&{started:number});
 receipt?:(Omit<FishingCatchReceipt,'age'>&{started:number});
 feeding?:{tick:number;layout:World['layout'];x:number;y:number;reduced:boolean;caught:number;salvagedAt:number;spots:FishingFeedingSpot[]}};
const runtimes=new WeakMap<World,Runtime>();
const salvageAnchors=new WeakMap<Placement,{geometry:ReturnType<typeof fishingPierGeometry>;epoch:number;point?:Vec}>();
function runtime(w:World){let r=runtimes.get(w);if(!r){r={serial:0};runtimes.set(w,r)}return r}
function emit(w:World,type:FishingEventType){const r=runtime(w);r.event={id:++r.serial,type,at:now(w)}}
function notice(w:World,message:string){w.notice=message;w.noticeUntil=now(w)+4}
/** Reading a receipt never creates an award or restarts its lifetime. */
export function fishingCatchReceipt(w:World):FishingCatchReceipt|undefined{
 const receipt=runtimes.get(w)?.receipt;if(!receipt)return;
 const age=now(w)-receipt.started;if(age<0||age>=receipt.duration)return;
 return{id:receipt.id,catch:receipt.catch,rewardLabel:receipt.rewardLabel,rewardWeight:receipt.rewardWeight,age,duration:receipt.duration};
}
/** A held or freshly landed animal cannot also reappear in the ambient school. */
export function fishingFishUnavailable(w:World,pierId:string,index:number){
 if(index<0)return false;
 const caught=w.fishing?.pendingCatch;
 return caught?.pierId===pierId&&caught.fishIndex===index||(runtimes.get(w)?.hidden?.get(pierId+':'+index)??0)>now(w);
}

/** Progress and undecided rewards are saved; contacts, feedback and casts are not. */
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
/** A cast may leave a bank or deck; it cannot cross land after reaching water. */
function castLanding(w:World,origin:Vec,target:Vec,r=36):Vec|null{
 const distance=length(origin,target);if(distance<90||distance>520||!fishingOpenWater(w,target,r))return null;
 const steps=Math.ceil(distance/14);let landing:Vec|null=null;
 for(let i=1;i<=steps;i++){
  const point=mix(origin,target,i/steps),wet=fishingOpenWater(w,point,r);
  if(wet&&!landing)landing=point;
  else if(!wet&&landing)return null;
 }
 return landing&&length(landing,target)>42?landing:null;
}
function visualFish(pier:Placement,index:number,t:number):FishingVisualFish|null{
 const f=fishingFishSchool(pier)[index];if(!f)return null;
 const pose=fishingFishPosition(f,t),species=f.species??fishingSpecies(f.variant);
 return{x:pose.x,y:pose.y,angle:pose.angle,size:f.size,variant:f.variant,species,kg:fishingAmbientFishWeight(f,index)};
}
function feedingIndex(w:World,pier:Placement){
 const school=fishingFishSchool(pier),epoch=Math.floor(now(w)/FISHING_FEEDING_SECONDS)+Math.floor((w.fishing?.caught??0)/3);
 const start=school.length?(fishingHash(pier.id)+epoch)%school.length:0;
 for(let offset=0;offset<school.length;offset++){const index=(start+offset)%school.length;if(!fishingFishUnavailable(w,pier.id,index))return index}
 return start;
}
/** A brief, seeded salvage opportunity is visible before the player chooses it. */
function salvageSpot(w:World,pier:Placement):FishingFeedingSpot|undefined{
 const epoch=Math.floor(now(w)/FISHING_FEEDING_SECONDS);
 if(fishingHash(pier.id+':salvage:'+epoch)%17!==0||w.fishing?.salvagedAt!==undefined&&Math.floor(w.fishing.salvagedAt/FISHING_FEEDING_SECONDS)===epoch)return;
 const geometry=fishingPierGeometry(pier),cached=salvageAnchors.get(pier);
 let point=cached?.geometry===geometry&&cached.epoch===epoch?cached.point:undefined;
 if(!cached||cached.geometry!==geometry||cached.epoch!==epoch){
  const ordered=[...fishingFishSchool(pier)].sort((a,b)=>length(b,pier)-length(a,pier));
  point=ordered.find(f=>fishingOpenWater(w,f,46));salvageAnchors.set(pier,{geometry,epoch,point});
 }
 if(point)return{x:point.x,y:point.y,radius:25,species:'drone',kind:'salvage',active:true,pierId:pier.id,fishIndex:-1};
}
export function fishingFeedingSpots(w:World):FishingFeedingSpot[]{
 const r=runtime(w),cached=r.feeding,reduced=!!w.weather?.reducedMotion,caught=w.fishing?.caught??0,salvagedAt=w.fishing?.salvagedAt??-1;
 if(cached&&cached.tick===w.tick&&cached.layout===w.layout&&cached.x===w.player.x&&cached.y===w.player.y&&cached.reduced===reduced&&cached.caught===caught&&cached.salvagedAt===salvagedAt)return cached.spots;
 const spots:FishingFeedingSpot[]=[];
 for(const pier of fishingPiers(w.layout)){
  if(length(w.player,pier)>1300)continue;
  const index=feedingIndex(w,pier),fish=visualFish(pier,index,fishClock(w));
  if(fish)spots.push({x:fish.x,y:fish.y,radius:42,species:fish.species!,active:true,kind:'fish',pierId:pier.id,fishIndex:index});
  const salvage=salvageSpot(w,pier);if(salvage)spots.push(salvage);
 }
 r.feeding={tick:w.tick,layout:w.layout,x:w.player.x,y:w.player.y,reduced,caught,salvagedAt,spots};return spots;
}
type CastChoice={pier:Placement;index:number;fish:FishingVisualFish;target:Vec;landing:Vec;productive:boolean};
function chargedTarget(w:World,origin:Vec,fish:FishingVisualFish,charge:number){
 const distance=length(origin,fish),dx=(fish.x-origin.x)/Math.max(1,distance),dy=(fish.y-origin.y)/Math.max(1,distance),radius=Math.max(36,fishRadius(fish));
 for(let extra=24+charge*100;extra>=0;extra-=12){
  const target={x:fish.x+dx*extra,y:fish.y+dy*extra},landing=castLanding(w,origin,target,radius);
  if(landing&&waterPath(w,fish,target,fishRadius(fish)))return{target,landing};
 }
 const landing=castLanding(w,origin,fish,radius);return landing?{target:{x:fish.x,y:fish.y},landing}:null;
}
function chooseCast(w:World,charge=0):CastChoice|null{
 let chosen:CastChoice|null=null,best=Infinity;
 for(const pier of fishingPiers(w.layout)){
  if(length(w.player,pier)>1100)continue;
  const school=fishingFishSchool(pier),feeding=feedingIndex(w,pier);
  for(let index=0;index<school.length;index++){
   if(fishingFishUnavailable(w,pier.id,index))continue;
   const fish=visualFish(pier,index,fishClock(w));if(!fish)continue;
   const distance=length(w.player,fish);if(distance<100||distance>460)continue;
   const cast=chargedTarget(w,w.player,fish,charge);if(!cast)continue;
   const score=distance+(facing(w.player,fish)===w.player.direction?0:35)-(feeding===index?40:0);
   if(score<best){best=score;chosen={pier,index,fish,...cast,productive:feeding===index}}
  }
 }
 return chosen;
}
/** Deliberate aim chooses visible water; it never replaces a fish with a reward roll. */
function chooseAtTarget(w:World,origin:Vec,target:Vec,allowSalvage=true):CastChoice|null{
 let chosen:CastChoice|null=null,best=Infinity;
 if(!castLanding(w,origin,target))return null;
 for(const pier of fishingPiers(w.layout)){
  if(length(origin,pier)>1100)continue;
  const salvage=allowSalvage&&salvageSpot(w,pier);
  if(salvage&&length(target,salvage)<50){
   const landing=castLanding(w,origin,target,42);
   if(landing){const kg=Math.round((3.2+fishingRandom(fishingHash(pier.id),Math.floor(now(w)/75))*2.9)*100)/100;
    return{pier,index:-1,fish:{x:target.x,y:target.y,angle:0,size:1.1,variant:3,species:'drone',kg},target,landing,productive:true}}
  }
  const school=fishingFishSchool(pier);
  for(let index=0;index<school.length;index++){
   if(fishingFishUnavailable(w,pier.id,index))continue;
   const fish=visualFish(pier,index,fishClock(w));if(!fish)continue;
   const distance=length(target,fish);if(distance>170||distance>=best)continue;
   const radius=Math.max(36,fishRadius(fish)),landing=castLanding(w,origin,target,radius);
   if(!landing||!waterPath(w,fish,target,fishRadius(fish)))continue;
   best=distance;chosen={pier,index,fish,target,landing,productive:feedingIndex(w,pier)===index&&distance<80};
  }
 }
 return chosen;
}
function refreshAim(w:World,s:FishingSession){
 if(!s.aimManual){
  const pier=fishingPiers(w.layout).find(p=>p.id===s.pierId),visible=pier&&visualFish(pier,s.fishIndex,fishClock(w));
  if(visible)s.fishStart={...visible};
 }
 const base=chargedTarget(w,s.origin,s.fishStart,s.charge);
 const distance=length(s.origin,s.fishStart),dx=(s.fishStart.x-s.origin.x)/Math.max(1,distance),dy=(s.fishStart.y-s.origin.y)/Math.max(1,distance);
 const raw=base?.target??{x:s.fishStart.x+dx*(24+s.charge*100),y:s.fishStart.y+dy*(24+s.charge*100)};
 const target={x:raw.x+s.aimOffset.x,y:raw.y+s.aimOffset.y};s.target=target;
 const landing=castLanding(w,s.origin,target),manualChoice=s.aimManual?chooseAtTarget(w,s.origin,target):null,hasChoice=s.aimManual?!!manualChoice:!!base;
 s.castValid=!!landing&&hasChoice;
 s.castHint=!landing?'Aim at clear lake water':!hasChoice?'Aim closer to a visible fish or feeding ripples':manualChoice?.fish.species==='drone'?'Metal glints below · Heavy salvage':s.aimManual?'Clear water · Release to cast':'Left stick aims · Release to cast';
 if(landing)s.landingPoint=landing;
 s.direction=w.player.direction=facing(s.origin,target);
}
/** Left-stick/keyboard input aims only while CAST is held; other phases still move/cancel. */
export function fishingAimInput(w:World,input:Vec,dt=1/60):boolean{
 const s=w.fishingSession;if(s?.phase!=='aiming')return false;
 const magnitude=Math.hypot(input.x,input.y);
 if(magnitude>.12){
  s.aimManual=true;const speed=180*Math.min(.05,Math.max(0,dt));
  s.aimOffset.x+=input.x/Math.max(1,magnitude)*speed;s.aimOffset.y+=input.y/Math.max(1,magnitude)*speed;
  const distance=Math.hypot(s.aimOffset.x,s.aimOffset.y);if(distance>270){s.aimOffset.x*=270/distance;s.aimOffset.y*=270/distance}
  refreshAim(w,s);
 }
 w.player.moving=false;w.player.sprinting=false;w.player.walkBlend=0;w.player.runBlend=0;
 return true;
}
function phase(s:FishingSession,next:FishingSession['phase'],t:number){s.phase=next;s.started=t;s.input='none';s.holding=false;s.nibbleAmount=0}
function escape(w:World,message:string){const s=w.fishingSession;if(!s)return;s.fishStart={...s.fish};s.failureReason=message;phase(s,'escaped',now(w));emit(w,'escape')}
function behavior(w:World,s:FishingSession,next:FishingFightBehavior){
 const t=now(w),profile=FISHING_SPECIES[s.species],random=fishingRandom(s.attempt*97+s.fishIndex*19,s.fightStep++);
 s.fightBehavior=next;s.behaviorSince=t;s.warning=0;s.surge=0;
 const duration=next==='warning'?.85+random*.35:next==='surge'?profile.runSeconds*(.8+random*.45):profile.calmSeconds*(.8+random*.4);
 s.behaviorUntil=t+duration;
 if(next==='warning')emit(w,s.species==='drone'?'signal':'surge');
}
function hook(w:World){
 const s=w.fishingSession;if(!s||s.phase!=='bite')return false;
 phase(s,'reeling',now(w));s.input='hook';s.tension=.22;s.distance=s.initialDistance=length(s.landingPoint,s.target);s.overload=0;s.slack=0;
 behavior(w,s,s.species==='drone'?'heavy':'calm');emit(w,'hook');return true;
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
  if(s.phase==='waiting'){stopFishing(w,'Bait kept');return true}
  return false;
 }
 if(progress.bait<1){notice(w,'Gather worms beside the lakeshore reeds');return false}
 const choice=chooseCast(w);if(!choice)return false;
 const t=now(w),attempt=progress.attempts+1,origin={x:w.player.x,y:w.player.y},species=choice.fish.species??fishingSpecies(choice.fish.variant);
 w.waypoint=undefined;w.attackQueuedUntil=undefined;runtime(w).aftermath=undefined;
 w.player.direction=facing(origin,choice.target);w.player.moving=false;w.player.sprinting=false;w.player.walkBlend=0;w.player.runBlend=0;
 w.fishingSession={phase:'aiming',started:t,castStarted:t,origin,target:choice.target,landingPoint:choice.landing,direction:w.player.direction,pierId:choice.pier.id,fishIndex:choice.index,
  fishStart:{...choice.fish},fish:{...choice.fish},weight:choice.fish.kg!,species,
  charge:0,tension:0,holding:true,distance:0,initialDistance:0,overload:0,slack:0,surge:0,biteAt:0,lastHp:w.player.hp,attempt,input:'cast',
  aimOffset:{x:0,y:0},aimManual:false,castValid:true,castHint:'Left stick aims · Release to cast',nibbleAmount:0,
  fightBehavior:'calm',behaviorSince:t,behaviorUntil:t,fightStep:0,warning:0,productive:choice.productive};
 return true;
}
export function releaseFishingAction(w:World,cancelled=false):boolean{
 const s=w.fishingSession;if(!s)return false;
 if(s.phase==='aiming'){
  if(cancelled||!equipped(w)){stopFishing(w);return true}
  // Release commits the displayed landing point. Revalidate the live animal
  // without moving the marker under the player's thumb on the release frame.
  const target={...s.target};let choice:CastChoice|null=null;
  if(s.aimManual)choice=s.castValid?chooseAtTarget(w,s.origin,target):null;
  else{
   const pier=fishingPiers(w.layout).find(p=>p.id===s.pierId),fish=pier&&visualFish(pier,s.fishIndex,fishClock(w));
   const landing=fish&&castLanding(w,s.origin,target,Math.max(36,fishRadius(fish)));
   if(pier&&fish&&landing&&waterPath(w,fish,target,fishRadius(fish)))choice={pier,index:s.fishIndex,fish,target,landing,productive:feedingIndex(w,pier)===s.fishIndex};
  }
  if(!choice){stopFishing(w,'Cast cancelled');return false}
  s.fishStart={...choice.fish};s.fish={...choice.fish};s.target=choice.target;s.landingPoint=choice.landing;
  s.pierId=choice.pier.id;s.fishIndex=choice.index;s.species=choice.fish.species!;s.weight=choice.fish.kg!;s.productive=choice.productive;
  s.direction=w.player.direction=facing(s.origin,s.target);s.castStarted=now(w);
  fishingProgress(w).attempts=s.attempt;phase(s,'casting',now(w));emit(w,'cast');return true;
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
function catchVisual(caught:FishingCatch):FishingVisualFish{
 return{x:caught.water?.x??0,y:caught.water?.y??0,angle:-Math.PI/2,size:caught.size??.9,variant:caught.variant??FISHING_SPECIES[caught.species].variant,species:caught.species,kg:caught.kg};
}
export function resolveFishingCatch(w:World,keep:boolean):boolean{
 const p=fishingProgress(w),caught=p.pendingCatch;if(!caught||w.phase==='over'||w.player.hp<=0||w.player.downedUntil)return false;
 if(keep&&!keepFishingCatch(w,caught)){notice(w,'Bag full · Catch held');return false}
 p.pendingCatch=undefined;p.caught++;if(keep)p.kept++;else p.released++;
 if(caught.species!=='drone'){
  p.bestKg=Math.max(p.bestKg,caught.kg);p.bestBySpecies??={};p.bestBySpecies[caught.species]=Math.max(p.bestBySpecies[caught.species]??0,caught.kg);
 }else p.salvagedAt=now(w);
 if(caught.pierId&&caught.fishIndex!==undefined&&caught.fishIndex>=0){const r=runtime(w);r.hidden??=new Map();r.hidden.set(caught.pierId+':'+caught.fishIndex,now(w)+(keep?7:2.2))}
 const water=caught.water??chooseCast(w)?.landing;
 if(water&&length(w.player,water)<600){
  const fish=catchVisual(caught);fish.x=water.x;fish.y=water.y;
  runtime(w).aftermath={kind:keep?'keep':'release',started:now(w),duration:keep?.85:2.2,from:{x:w.player.x,y:w.player.y},to:{...water},fish,pierId:caught.pierId,fishIndex:caught.fishIndex};
 }
 emit(w,keep?'keep':'release');
 const r=runtime(w);
 r.receipt=keep?{id:r.event!.id,catch:{...caught},rewardLabel:fishingCatchRewardLabel(caught),rewardWeight:fishingCatchRewardWeight(caught),started:now(w),duration:FISHING_RECEIPT_SECONDS}:undefined;
 return true;
}
function moveFish(w:World,s:FishingSession,point:Vec){
 if(!fishingOpenWater(w,point,fishRadius(s.fish)))return;
 const dx=point.x-s.fish.x,dy=point.y-s.fish.y;
 if(Math.hypot(dx,dy)>.001)s.fish.angle=Math.atan2(dy,dx);
 s.fish.x=point.x;s.fish.y=point.y;
}
export function stepFishing(w:World,dt:number){
 // A full bag keeps the whole animal pending. Making room (including after
 // loading an old pending catch) retries the same atomic collection path.
 const pending=w.fishing?.pendingCatch;
 if(pending&&canKeepFishingCatch(w,pending))resolveFishingCatch(w,true);
 const s=w.fishingSession;if(!s)return;
 if(!equipped(w)||length(w.player,s.origin)>4||w.player.hp<s.lastHp||!fishingPiers(w.layout).some(p=>p.id===s.pierId)||s.phase!=='aiming'&&!fishingOpenWater(w,s.target,Math.max(32,fishRadius(s.fish)))){stopFishing(w);return}
 const t=now(w),age=t-s.started,p=fishingProgress(w);s.lastHp=w.player.hp;
 w.player.direction=s.direction;w.player.moving=false;w.player.sprinting=false;
 if(s.phase==='aiming'){
  s.charge=clamp(age/1.2);refreshAim(w,s);
 }else if(s.phase==='casting'){
  if(age>=FISHING_CAST_SECONDS){
   phase(s,'waiting',t);s.fishStart={...s.fish};s.biteAt=t+(s.productive?2.0:3.15)+fishingRandom(s.attempt,s.fishIndex+8)*.65;
   emit(w,'splash');
  }
 }else if(s.phase==='waiting'||s.phase==='nibble'){
  const waitingSince=s.castStarted+FISHING_CAST_SECONDS,approach=clamp((t-waitingSince-.25)/Math.max(1,s.biteAt-waitingSince-.45));
  moveFish(w,s,mix(s.fishStart,s.target,smooth(approach)));
  if(s.phase==='waiting'&&t>=s.biteAt-1.05){phase(s,'nibble',t);s.lastNibble=t;emit(w,s.species==='drone'?'signal':'nibble')}
  if(s.phase==='nibble')s.nibbleAmount=Math.max(0,Math.sin((t-s.started)*Math.PI*4))*.58;
  if(t>=s.biteAt){
   if(p.bait<1){stopFishing(w,'No bait left');return}
   p.bait--;phase(s,'bite',t);s.biteAt=t;emit(w,'bite');
   if(p.autoHook)hook(w);
  }
 }else if(s.phase==='bite'){
  if(p.autoHook)hook(w);
  else if(age>FISHING_BITE_SECONDS)escape(w,s.species==='drone'?'Lost the snag · Tap HOOK when the float sinks':'Missed the bite · Tap HOOK when the float sinks');
 }else if(s.phase==='reeling'){
  const progress=clamp(1-s.distance/s.initialDistance),profile=FISHING_SPECIES[s.species];
  if(t>=s.behaviorUntil){
   const next=s.fightBehavior==='warning'?'surge':s.fightBehavior==='surge'?(progress>.68?'tiring':s.species==='drone'?'heavy':'calm'):'warning';
   behavior(w,s,next);
  }
  const behaviorProgress=clamp((t-s.behaviorSince)/Math.max(.1,s.behaviorUntil-s.behaviorSince));
  s.warning=s.fightBehavior==='warning'?behaviorProgress:0;
  s.surge=s.fightBehavior==='surge'?(Math.sin(behaviorProgress*Math.PI)*.55+.45)*(progress>.7?.62:1):0;
  // A full visible warning precedes every load spike. Letting go always helps.
  const delta=s.holding?.105+s.surge*profile.pull:-.60;
  s.tension=clamp(s.tension+delta*dt);
  s.overload=s.tension>.95?s.overload+dt:Math.max(0,s.overload-dt*2);
  s.slack=s.holding?0:s.slack+dt;
  const reelSeconds=profile.reelSeconds+Math.max(0,s.weight-1)*.18,reelSpeed=s.initialDistance/reelSeconds;
  if(s.holding)s.distance=Math.max(0,s.distance-reelSpeed*(s.fightBehavior==='warning'?.8:1-s.surge*.83)*dt);
  else s.distance=Math.min(s.initialDistance+45,s.distance+reelSpeed*(.025+s.surge*.38)*dt);
  if(s.overload>.7){escape(w,'Line snapped · Release REEL before the big pull');return}
  if(s.slack>14||age>65){escape(w,s.species==='drone'?'The snag slipped free · Keep hauling between pulls':'Fish slipped the hook · Reel between the pulls');return}
  const along=clamp(s.distance/s.initialDistance),point=mix(s.landingPoint,s.target,along),dx=s.target.x-s.landingPoint.x,dy=s.target.y-s.landingPoint.y,dist=Math.max(1,Math.hypot(dx,dy));
  const lateral=s.species==='pike'?1.5:s.species==='carp'?.6:s.species==='drone'?.18:1;
  const sway=Math.sin(age*(s.species==='pike'?4.5:2.7))*Math.min(18,s.distance*.13)*(.25+s.surge)*lateral;
  const side={x:point.x-dy/dist*sway,y:point.y+dx/dist*sway};
  moveFish(w,s,fishingOpenWater(w,side,fishRadius(s.fish))?side:point);
  if(s.distance<=2){phase(s,'landing',t);s.tension=.15;emit(w,'land')}
 }else if(s.phase==='landing'){
  if(age>=FISHING_LANDING_SECONDS){
   const best=s.species==='drone'?Infinity:p.bestBySpecies?.[s.species]??(s.species==='perch'?p.bestKg:0);
   p.pendingCatch={id:s.attempt,species:s.species,name:FISHING_SPECIES[s.species].name,kg:s.weight,isRecord:s.weight>best,image:FISHING_SPECIES[s.species].image,
    portions:fishingPortions(s.species,s.weight),water:{...s.landingPoint},size:s.fish.size,variant:s.fish.variant,pierId:s.pierId,fishIndex:s.fishIndex};
   w.fishingSession=undefined;
   if(canKeepFishingCatch(w,p.pendingCatch))resolveFishingCatch(w,true);
  }
 }else if(s.phase==='escaped'){
  const pier=fishingPiers(w.layout).find(p=>p.id===s.pierId),ambient=pier&&visualFish(pier,s.fishIndex,fishClock(w));
  if(ambient&&waterPath(w,s.fishStart,ambient,fishRadius(s.fish)))moveFish(w,s,mix(s.fishStart,ambient,smooth(clamp(age/1.1))));
  if(age>1.15)w.fishingSession=undefined;
 }
}
export function fishingHud(w:World):FishingHud|null{
 const p=w.fishing;if(!p?.pendingCatch&&w.player.equipped!=='fishingRod')return null;
 const progress=fishingProgress(w),s=w.fishingSession,caught=progress.pendingCatch;
 const phaseName=caught?'caught':s?.phase??'ready',species=caught?.species??s?.species;
 const action:FishingHud['action']=caught?'CAUGHT':s?.phase==='waiting'?'RETRIEVE':s?.phase==='nibble'?'WAIT':s?.phase==='bite'?'HOOK':s?.phase==='reeling'?'REEL':s?.phase==='landing'?'LANDING':'CAST';
 const disabled=!!caught||!!s&&['casting','nibble','landing','escaped'].includes(s.phase)||!equipped(w)||!s&&(progress.bait<1||!chooseCast(w));
 const toggle=progress.toggleReel,reel=toggle?'TAP TO REEL':'HOLD TO REEL',ease=!s?.holding?'WAIT · LINE EASING':toggle?'TAP TO EASE OFF':'RELEASE TO EASE OFF';
 let command='TAP TO CAST',detail='Hold CAST and use the left stick to aim.',tone:FishingHud['tone']='neutral';
 if(caught){command=caught.species==='drone'?'SALVAGE RECOVERED':'CHOOSE YOUR CATCH';detail=fishingCatchRewardLabel(caught);tone='good'}
 else if(s?.phase==='aiming'){command=s.castValid?'RELEASE TO CAST':'ADJUST YOUR AIM';detail='Move the landing marker to choose your cast.';tone=s.castValid?'good':'warn'}
 else if(s?.phase==='casting'){command='CASTING';detail='Watch the float land.'}
 else if(s?.phase==='waiting'){command='WATCH THE FLOAT';detail=s.productive?'Fish are feeding here. Tap RETRIEVE to stop.':'Waiting for a fish. Tap RETRIEVE to stop.'}
 else if(s?.phase==='nibble'){command='WAIT';detail=s.species==='drone'?'Something heavy below. Wait for the float to sink.':'Just a nibble. Wait for the float to sink.';tone='warn'}
 else if(s?.phase==='bite'){command='TAP HOOK';detail=s.species==='drone'?'The line caught something. Hook it now!':'The float is under. Hook the fish now!';tone='good'}
 else if(s?.phase==='reeling'){
  const danger=s.tension>.78,warning=s.fightBehavior==='warning',surge=s.fightBehavior==='surge';
  if(danger||warning||surge){command=ease;detail=danger?'Line under strain. Let it recover.':warning?(s.species==='drone'?'The snag is tightening. Ease off before the pull.':'Fish is turning. A strong pull is coming.'):'Strong pull. Let the line settle.';tone=danger?'danger':'warn'}
  else{command=toggle?(s.holding?'REELING · TAP TO EASE':reel):reel;detail=s.fightBehavior==='tiring'?'Nearly there. Reel while it is tired.':s.species==='drone'?'Heavy salvage. Haul steadily between pulls.':'Fish is resting. Bring it closer.';tone='good'}
 }else if(s?.phase==='landing'){command=species==='drone'?'LIFTING SALVAGE':'LANDING YOUR FISH';detail='Your catch is coming aboard.';tone='good'}
 else if(s?.phase==='escaped'){command='CATCH LOST';detail=s.failureReason??'Try again when the line is ready.';tone='warn'}
 else if(!progress.bait){command='GATHER BAIT';detail='Walk to the lakeshore reeds and tap BAIT.';tone='warn'}
 else if(disabled){command='FIND CLEAR WATER';detail='Move to the pier edge or a clear bank.'}
 return{phase:phaseName,action,command,detail,hint:command+' · '+detail,tone,bait:progress.bait,tension:s?.tension??0,charge:s?.charge??0,holding:s?.holding??false,active:!!s||!!caught,disabled,
  progress:s&&s.initialDistance>0?clamp(1-s.distance/s.initialDistance):caught?1:0,fightBehavior:s?.phase==='reeling'?s.fightBehavior:undefined,castValid:s?.castValid??!disabled,castHint:s?.castHint??'',nibbleAmount:s?.nibbleAmount??0,species,
  canKeep:!!caught&&canKeepFishingCatch(w,caught),catch:caught,rewardLabel:caught?fishingCatchRewardLabel(caught):undefined,rewardWeight:caught?fishingCatchRewardWeight(caught):undefined,receipt:fishingCatchReceipt(w),
  assists:{autoHook:progress.autoHook,toggleReel:progress.toggleReel},caught:progress.caught,bestKg:progress.bestKg,event:runtimes.get(w)?.event};
}
export function fishingRenderState(w:World):FishingRenderState|null{
 const s=w.fishingSession,r=runtimes.get(w),effect=r?.aftermath,effectAge=effect?now(w)-effect.started:Infinity;
 const aftermath: FishingAftermath|undefined=effect&&effectAge<effect.duration?{kind:effect.kind,age:effectAge,duration:effect.duration,from:effect.from,to:effect.to,fish:effect.fish,pierId:effect.pierId,fishIndex:effect.fishIndex}:undefined;
 const equippedRod=w.player.equipped==='fishingRod'&&hasGear(w,'fishingRod');
 if(!s){
  if(!equippedRod&&!aftermath)return null;
  const caught=w.fishing?.pendingCatch;
  return{phase:caught?'caught':'equipped',age:0,phaseProgress:0,direction:w.player.direction,tension:0,holding:false,charge:0,lineVisible:false,bobberVisible:false,
   fish:caught?catchVisual(caught):undefined,species:caught?.species,pierId:caught?.pierId??aftermath?.pierId,fishIndex:caught?.fishIndex??aftermath?.fishIndex,aftermath,feedingSpots:equippedRod?fishingFeedingSpots(w):[],event:r?.event};
 }
 const age=now(w)-s.started,casting=s.phase==='casting',landing=s.phase==='landing',fight=s.phase==='reeling';
 return{phase:s.phase,age,phaseProgress:clamp(age/(casting?FISHING_CAST_SECONDS:landing?FISHING_LANDING_SECONDS:1)),direction:s.direction,target:s.target,
  bobber:fight||landing?{x:s.fish.x,y:s.fish.y}:s.target,fish:s.phase==='aiming'?undefined:s.fish,pierId:s.pierId,fishIndex:s.fishIndex,
  tension:s.tension,holding:s.holding,charge:s.charge,lineVisible:!['aiming','escaped'].includes(s.phase),bobberVisible:!['aiming','escaped','landing'].includes(s.phase),
  aimPreview:s.phase==='aiming'?s.target:undefined,aimValid:s.castValid,aimReason:s.castHint,nibbleAmount:s.nibbleAmount,fightBehavior:s.fightBehavior,warning:s.warning,surge:s.surge,species:s.species,
  progress:s.initialDistance>0?clamp(1-s.distance/s.initialDistance):0,aftermath,feedingSpots:s.phase==='aiming'?fishingFeedingSpots(w):undefined,event:r?.event};
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
 notice(w,'Salvaged rod + 10 worms · Tap CAST from the pier');return true;
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

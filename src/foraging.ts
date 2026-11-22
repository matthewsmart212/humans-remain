import {FORAGE_BY_ID} from './forage-art';
import {visiblePlacements} from './layout-views';
import {placementContact} from './placement-contact';
import {placementBounds,placementPoint,type Placement} from './world-layout';
import {addInventory,canCarryCount} from './expedition-inventory';
import {withinActionReach,timeOf,type World} from './survival-engine';
import {chooseInteractionFocus} from './interaction-focus';

export type ForageState={remaining:number;regrowRound?:number;pickedAt:number;picked:number;to:{x:number;y:number}};
export const FORAGE_PICK_COOLDOWN=.42;
function regrowthDays(p:Placement,wildDays:number){
 return /^smallholding-(potato|carrot)-\d+$/.test(p.id)?1:wildDays;
}
/** Only picked plants allocate state. Regrowth uses run days and needs no per-frame map scan. */
export function forageRemaining(w:World,p:Placement){
 const art=FORAGE_BY_ID.get(p.assetId);if(!art)return 0;
 const s=w.forage?.[p.id];
 if(!s)return art.capacity;
 // Crops harvested in older gardens have no scheduled return.
 if(!s.remaining&&regrowthDays(p,art.regrowDays)>0&&w.round>=(s.regrowRound??0))return art.capacity;
 return s.remaining;
}
export const forageRoot=(p:Placement)=>{const [x,y]=placementPoint(p,p.x,p.y);return{x,y}};
export function canForage(w:World){const t=timeOf(w);return w.phase!=='over'&&w.player.hp>0&&!w.player.downedUntil&&!w.stationPanel&&!w.axeSwing&&!w.spearThrust&&!w.swordThrust&&!w.bowShot&&!w.dodge&&w.attackUntil<=t&&w.player.hurtUntil<=t}
export type ForageTarget={placement:Placement;remaining:number;fits:number;distance:number;root:{x:number;y:number};contact:{x:number;y:number};regrowDays:number};
export function nearbyForageTargets(w:World):ForageTarget[]{
 if(!w.layout||w.scene)return [];
 const player=w.player,targets:ForageTarget[]=[];
 for(const p of visiblePlacements(w.layout,{x:player.x-170,y:player.y-170,width:340,height:340})){
  const art=FORAGE_BY_ID.get(p.assetId);if(!art)continue;
  const root=forageRoot(p);
  let contact=root;
  if(art.kind==='apple')contact=placementContact(p,player);
  else if(art.kind==='berries'){
   // Berries can be gathered along the bush, including the ends of a scaled hedge.
   const [localX]=placementPoint(p,player.x,player.y,true);
   const half=placementBounds(p).width*.32;
   const [x,y]=placementPoint(p,Math.max(p.x-half,Math.min(p.x+half,localX)),p.y);
   contact={x,y};
  }
  const d=Math.hypot(contact.x-player.x,contact.y-player.y);
  if(!withinActionReach(w,contact))continue;
  const remaining=forageRemaining(w,p);
  const s=w.forage?.[p.id];
  targets.push({placement:p,remaining,fits:canCarryCount(w,art.kind,Math.min(1,remaining)),distance:d,root,contact,regrowDays:remaining?0:Math.max(1,(s?.regrowRound??w.round+art.regrowDays)-w.round)});
 }
 return targets;
}
export function nearbyForage(w:World){
 const targets=nearbyForageTargets(w),ripe=targets.filter(p=>p.remaining>0);
 return chooseInteractionFocus(w,(ripe.length?ripe:targets).map(value=>({id:`forage:${value.placement.id}`,...value.contact,available:!!value.remaining&&!!value.fits,value})));
}
/** Revalidate the visible target. Full packs and repeated taps cannot consume fruit. */
export function pickForage(w:World,id:string){
 if(!canForage(w)||timeOf(w)<(w.forageReadyAt??0))return false;
 const target=nearbyForageTargets(w).find(p=>p.placement.id===id);if(!target||!target.remaining||!target.fits)return false;
 const art=FORAGE_BY_ID.get(target.placement.assetId)!,count=addInventory(w,art.kind,1);if(!count)return false;
 const remaining=target.remaining-count,t=timeOf(w),days=regrowthDays(target.placement,art.regrowDays);
 (w.forage??={})[id]={remaining,...(!remaining&&days>0?{regrowRound:w.round+days}:{}),pickedAt:t,picked:count,to:{x:w.player.x,y:w.player.y-40}};
 w.forageReadyAt=t+FORAGE_PICK_COOLDOWN;
 w.notice=`+${count} ${art.kind==='berries'?'berry portion':art.kind} · Added to backpack`;w.noticeUntil=t+2.5;
 return true;
}

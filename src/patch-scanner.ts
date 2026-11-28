import {patchChat} from './patch-chat';
import {patchRescueSite,patchRouteSite} from './patch-placement';
import {canTalkToPatch,type PatchQuestState} from './patch-quest';
import {nextPatchFootprints,onPatchBridge,PATCH_TRAIL_FORK,patchScannerTrail,type PatchTrack,type PatchTrailStage} from './patch-scanner-trail';
import {DIRECTION_ANGLES,STEP,facing,timeOf,withinActionReach,type Vec,type World} from './survival-engine';

const RADIUS=410,HALF_ANGLE=52*Math.PI/180;
const SWEEP_SECONDS=1.6,PRINT_HOLD=.7,PRINT_FADE=2.1,UPDATE_SECONDS=.08;
export type PatchScanPrint=PatchTrack&{opacity:number};
type Ray={angle:number;radius:number};
export type PatchScanFrame={origin:Vec;angle:number;halfAngle:number;radius:number;rays:readonly Ray[];
 sweep:number;opacity:number;prints:readonly PatchScanPrint[];aperture?:Vec};
type RevealedPrint={mark:PatchTrack;seen:number};
type Scan={tick:number;stage:PatchTrailStage;prints:Map<PatchTrack,RevealedPrint>;hint:string};
const scans=new WeakMap<PatchQuestState,Scan>();

export function canBorrowPatchScanner(w:World){
 const q=w.patchQuest;
 return !!q?.diagnosed&&!q.scannerLoaned&&!q.servoClaimed&&canTalkToPatch(w);
}
export function borrowPatchScanner(w:World){
 if(!patchChat(w)||!canBorrowPatchScanner(w))return false;
 w.patchQuest!.scannerLoaned=true;w.player.equipped='scanner';w.repairCheckpoint=true;
 w.notice='Scanner equipped · Follow the blue tracks. Switch tools to put it away.';w.noticeUntil=timeOf(w)+5;
 return true;
}
export function patchScannerAvailable(w:World){
 const q=w.patchQuest;
 return !!q?.scannerLoaned&&!!q.diagnosed&&!!w.layout&&!!w.progression&&!w.scene&&w.phase!=='over'&&
  w.player.hp>0&&!w.player.downedUntil&&!patchChat(w)&&!w.stationPanel&&!w.patchRepair&&!w.buildingRepair&&!w.fishingSession&&!w.bruteGrab;
}
const stageFor=(q:PatchQuestState):PatchTrailStage=>q.dispatchRead?'haulage':'footprints';

/** The scanner reads through scenery; its light never uses collision geometry. */
export function isPatchScannerEquipped(w:World){
 return w.player.equipped==='scanner'&&patchScannerAvailable(w);
}
const emitting=(w:World)=>isPatchScannerEquipped(w)&&!w.dodge&&!w.axeSwing&&!w.spearThrust&&!w.swordThrust&&!w.bowShot;
const compassNames={up:'north','up-right':'northeast',right:'east','down-right':'southeast',
 down:'south','down-left':'southwest',left:'west','up-left':'northwest'} as const;

function reading(w:World,prints:readonly PatchTrack[],stage:PatchTrailStage){
 const site=patchRescueSite(w.layout),ledger=patchRouteSite(w.layout,'dispatch');
 if(stage==='footprints'&&site&&ledger){
  const found=w.patchQuest?.footprintsFound??0;
  if(found===3)return 'His prints end at the orange mast. Take the spare W-6 at its base.';
  if(!found&&Math.hypot(w.player.x-site.robot.x,w.player.y-site.robot.y)<=145)return 'Equip the scanner and face his feet.';
  const next=nextPatchFootprints(w.layout!,found);
  if(next){
   const bearing=compassNames[facing(next.x-w.player.x,next.y-w.player.y)];
   if(!prints.length)return `Face ${bearing} toward the next prints with the scanner equipped.`;
   if(found===1&&Math.hypot(w.player.x-site.robot.x,w.player.y-site.robot.y)<=145){
    const start=compassNames[facing(PATCH_TRAIL_FORK.x-site.approach.x,PATCH_TRAIL_FORK.y-site.approach.y)];
    return `Footprint matched. Follow the prints ${start} from the cot.`;
   }
   const local=prints.find(mark=>mark.section===found);
   const onward=local?compassNames[facing(Math.cos(local.angle),Math.sin(local.angle))]:bearing;
   return `Follow the prints ${onward}. Keep the scanner out as you follow the bank.`;
  }
 }
 if(stage==='haulage'&&!prints.length&&ledger&&withinActionReach(w,ledger.approach,80)){
  return 'Start beside the dispatch post. Sweep the mud for sled runners.';
 }
 if(!prints.length){
  if(onPatchBridge(w.player,100))return 'Dry boards. Cross and scan the mud on the far bank.';
  return 'No marks here. Sweep the last print or mark the lead in your journal.';
 }
 const has=(kind:PatchTrack['kind'])=>prints.some(mark=>mark.kind===kind);
 if(has('crawler'))return 'Broad crawler cleats pressed into the ground.';
 if(has('rope'))return 'Twin runners scored the mud.';
 if(has('right-tread')&&has('left-skid'))return 'A deep right tread. A scraped left toe.';
 return has('left-skid')?'A shallow scrape from the left toe.':'A deep right tread.';
}
/** Update only on simulation ticks: rendering/interpolation never advances the quest. */
export function stepPatchScanner(w:World,force=false){
 const q=w.patchQuest;if(!q)return false;
 const stage=stageFor(q),now=timeOf(w);
 let scan=scans.get(q);
 if(scan&&(stage!==scan.stage||w.tick<scan.tick)){scans.delete(q);scan=undefined}
 if(scan)for(const [key,print] of scan.prints)if(now-print.seen>=PRINT_HOLD+PRINT_FADE)scan.prints.delete(key);
 if(!emitting(w))return false;
 if(!force&&scan&&(w.tick-scan.tick)*STEP<UPDATE_SECONDS)return true;
 if(!scan){scan={tick:w.tick,stage,prints:new Map(),hint:''};scans.set(q,scan)}
 scan.tick=w.tick;
 const angle=DIRECTION_ANGLES[w.player.direction],origin=w.player;
 const visible=patchScannerTrail(w.layout!,stage).filter(mark=>{
  const dx=mark.x-origin.x,dy=mark.y-origin.y;
  return dx*dx+dy*dy<=RADIUS*RADIUS&&Math.cos(Math.atan2(dy,dx)-angle)>=Math.cos(HALF_ANGLE);
 });
 for(const mark of visible)scan.prints.set(mark,{mark,seen:now});
 const expected=(q.footprintsFound??0)+1;
 // Broad illumination must not let a distant fringe skip an unvisited stretch.
 const nearest=[...visible].sort((a,b)=>Math.hypot(a.x-origin.x,a.y-origin.y)-Math.hypot(b.x-origin.x,b.y-origin.y)).slice(0,6);
 if(stage==='footprints'&&expected<=3&&nearest.some(mark=>mark.section===expected)){
  q.footprintsFound=expected;w.repairCheckpoint=true;
 }
 scan.hint=reading(w,visible,stage);
 return true;
}
/** Kept for scripted quest interactions; normal play scans continuously while equipped. */
export function pulsePatchScanner(w:World){return stepPatchScanner(w,true)}
export function patchScannerHint(w:World){
 const scan=w.patchQuest&&scans.get(w.patchQuest);
 return emitting(w)&&scan?.stage===stageFor(w.patchQuest!)?scan.hint:undefined;
}
export function samplePatchScan(w:World):PatchScanFrame|undefined{
 if(!patchScannerAvailable(w))return;
 const active=emitting(w),q=w.patchQuest!,scan=scans.get(q),now=timeOf(w);
 const prints=scan?.stage===stageFor(q)&&w.tick>=scan.tick?[...scan.prints.values()].flatMap(({mark,seen})=>{
  const opacity=Math.max(0,Math.min(1,1-(now-seen-PRINT_HOLD)/PRINT_FADE));
  return opacity>0?[{...mark,opacity}]:[];
 }):[];
 if(!active&&!prints.length)return;
 const angle=DIRECTION_ANGLES[w.player.direction];
 const rays=Array.from({length:13},(_,i)=>({angle:angle-HALF_ANGLE+2*HALF_ANGLE*i/12,radius:RADIUS}));
 return {origin:{x:w.player.x,y:w.player.y},angle,halfAngle:HALF_ANGLE,radius:RADIUS,rays,
  sweep:(now%SWEEP_SECONDS)/SWEEP_SECONDS,opacity:active?1:0,prints};
}

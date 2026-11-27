import {patchChat} from './patch-chat';
import {patchRescueSite,patchRouteSite} from './patch-placement';
import {canTalkToPatch,type PatchQuestState} from './patch-quest';
import {nextPatchFootprints,onPatchBridge,PATCH_TRACK_WIDTH,PATCH_TRAIL_FORK,patchScannerTrail,type PatchTrack,type PatchTrailStage} from './patch-scanner-trail';
import {DIRECTION_ANGLES,STEP,facing,timeOf,withinActionReach,worldBlocked,type Vec,type World} from './survival-engine';

const RADIUS=290,HALF_ANGLE=40*Math.PI/180;
const SWEEP_SECONDS=.65,FADE_START=3.6,END=5.2;
export type PatchScanPrint=PatchTrack&{opacity:number};
type Ray={angle:number;radius:number};
export type PatchScanFrame={origin:Vec;angle:number;halfAngle:number;radius:number;rays:readonly Ray[];
 sweep:number;opacity:number;prints:readonly PatchScanPrint[]};
type Scan={tick:number;stage:PatchTrailStage;origin:Vec;angle:number;rays:Ray[];prints:(PatchTrack&{distance:number})[];hint:string};
const scans=new WeakMap<PatchQuestState,Scan>();

export function canBorrowPatchScanner(w:World){
 const q=w.patchQuest;
 return !!q?.diagnosed&&!q.scannerLoaned&&!q.servoClaimed&&canTalkToPatch(w);
}
export function borrowPatchScanner(w:World){
 if(!patchChat(w)||!canBorrowPatchScanner(w))return false;
 w.patchQuest!.scannerLoaned=true;w.repairCheckpoint=true;
 w.notice=w.patchQuest!.dispatchRead?'Field scanner ready · Scan for sled tracks.':'Field scanner ready · Face his footprints and tap SCAN.';w.noticeUntil=timeOf(w)+5;
 return true;
}
export function patchScannerAvailable(w:World){
 const q=w.patchQuest;
 return !!q?.scannerLoaned&&!!q.diagnosed&&!q.servoClaimed&&!!w.layout&&!!w.progression&&!w.scene&&w.phase!=='over'&&
  w.player.hp>0&&!w.player.downedUntil&&!patchChat(w)&&!w.stationPanel&&!w.patchRepair&&!w.buildingRepair&&!w.fishingSession&&!w.bruteGrab;
}
const stageFor=(q:PatchQuestState):PatchTrailStage=>q.dispatchRead?'haulage':'footprints';

// Test the short beams only on a tap. Per-frame rendering never queries
// collision or searches a path. Both the light and marks stop at obstructions.
function beamReach(w:World,origin:Vec,angle:number,limit=RADIUS){
 const dx=Math.cos(angle),dy=Math.sin(angle);
 for(let r=12;r<limit;r+=12){if(worldBlocked(w,origin.x+r*dx,origin.y+r*dy,5))return r-12}
 return worldBlocked(w,origin.x+limit*dx,origin.y+limit*dy,5)?Math.max(0,limit-12):limit;
}
const compassNames={up:'north','up-right':'northeast',right:'east','down-right':'southeast',
 down:'south','down-left':'southwest',left:'west','up-left':'northwest'} as const;

function reading(w:World,prints:readonly PatchTrack[],stage:PatchTrailStage){
 const site=patchRescueSite(w.layout),ledger=patchRouteSite(w.layout,'dispatch');
 if(stage==='footprints'&&site&&ledger){
  const found=w.patchQuest?.footprintsFound??0;
  if(found===3)return 'His prints end at the orange mast. Take the spare W-6 at its base.';
  if(!found&&Math.hypot(w.player.x-site.robot.x,w.player.y-site.robot.y)<=145)return 'Face his feet and tap SCAN.';
  const next=nextPatchFootprints(w.layout!,found);
  if(next){
   const bearing=compassNames[facing(next.x-w.player.x,next.y-w.player.y)];
   if(!prints.length)return `Face ${bearing} toward the next prints and scan again.`;
   if(found===1&&Math.hypot(w.player.x-site.robot.x,w.player.y-site.robot.y)<=145){
    const start=compassNames[facing(PATCH_TRAIL_FORK.x-site.approach.x,PATCH_TRAIL_FORK.y-site.approach.y)];
    return `Footprint matched. Follow the prints ${start} from the cot.`;
   }
   const local=prints.find(mark=>mark.section===found);
   const onward=local?compassNames[facing(Math.cos(local.angle),Math.sin(local.angle))]:bearing;
   return `Follow the prints ${onward}. Scan again farther along the bank.`;
  }
 }
 if(stage==='haulage'&&!prints.length&&ledger&&withinActionReach(w,ledger.approach,80)){
  return 'Start beside the dispatch post. Sweep the mud for sled runners.';
 }
 if(!prints.length){
  if(onPatchBridge(w.player,100))return 'Dry boards. Cross and scan the mud on the far bank.';
  return 'No marks here. Rescan the last print or mark the lead in your journal.';
 }
 const has=(kind:PatchTrack['kind'])=>prints.some(mark=>mark.kind===kind);
 if(has('crawler'))return 'Broad crawler cleats pressed into the ground.';
 if(has('rope'))return 'Twin runners scored the mud.';
 if(has('right-tread')&&has('left-skid'))return 'A deep right tread. A scraped left toe.';
 return has('left-skid')?'A shallow scrape from the left toe.':'A deep right tread.';
}
export function pulsePatchScanner(w:World){
 if(!patchScannerAvailable(w)||w.dodge||w.axeSwing||w.spearThrust||w.swordThrust||w.bowShot)return false;
 const q=w.patchQuest!,old=scans.get(q);
 if(old&&w.tick>=old.tick&&(w.tick-old.tick)*STEP<.35)return false;
 const angle=DIRECTION_ANGLES[w.player.direction],origin={x:w.player.x,y:w.player.y},stage=stageFor(q);
 const rays=Array.from({length:13},(_,i)=>{
  const rayAngle=angle-HALF_ANGLE+2*HALF_ANGLE*i/12;
  return {angle:rayAngle,radius:beamReach(w,origin,rayAngle)};
 });
 const prints=patchScannerTrail(w.layout!,stage).flatMap(mark=>{
  const dx=mark.x-origin.x,dy=mark.y-origin.y,distance=Math.hypot(dx,dy),heading=Math.atan2(dy,dx);
  if(distance>RADIUS||Math.cos(heading-angle)<Math.cos(HALF_ANGLE))return [];
  // All four painted frames fit inside a circle of this radius, including
  // their rotated corners. Never light half a tread through a rock or river.
  const clearance=PATCH_TRACK_WIDTH[mark.kind]*.60;
  if(worldBlocked(w,mark.x,mark.y,clearance)||beamReach(w,origin,heading,distance)<distance)return [];
  return [{...mark,distance}];
 }).sort((a,b)=>a.distance-b.distance).slice(0,3);
 const expected=(q.footprintsFound??0)+1;
 if(stage==='footprints'&&prints.some(mark=>mark.section===expected)){
  q.footprintsFound=expected;w.repairCheckpoint=true;
 }
 scans.set(q,{tick:w.tick,stage,origin,angle,rays,prints,hint:reading(w,prints,stage)});
 return true;
}
function activeScan(w:World){
 const q=w.patchQuest;
 if(!q)return;
 const scan=scans.get(q);
 if(scan&&w.tick>=scan.tick&&(w.tick-scan.tick)*STEP<END&&stageFor(q)===scan.stage&&patchScannerAvailable(w))return scan;
}
export function patchScannerHint(w:World){return activeScan(w)?.hint}
export function samplePatchScan(w:World):PatchScanFrame|undefined{
 const scan=activeScan(w);if(!scan)return;
 const age=(w.tick-scan.tick)*STEP,sweep=Math.min(1,age/SWEEP_SECONDS),opacity=Math.min(1,(END-age)/(END-FADE_START));
 const prints=scan.prints.map(({distance,...print})=>({...print,opacity:opacity*Math.max(0,Math.min(1,(age-distance/RADIUS*SWEEP_SECONDS)/.16))}));
 const light=Math.max(0,Math.min(1,(SWEEP_SECONDS+.45-age)/.45));
 return {origin:scan.origin,angle:scan.angle,halfAngle:HALF_ANGLE,radius:RADIUS,rays:scan.rays,sweep,opacity:light,prints};
}

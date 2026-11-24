import type {FishingHud,FishingCatchReceipt} from './fishing-types';
import {FISHING_SPECIES} from './fishing-catalog';

export type FishingHudKind='full'|'fight'|'receipt'|'lost'|'bait'|'hidden';
export function fishingHudKind(hud?:FishingHud,receipt?:FishingCatchReceipt):FishingHudKind{
 if(hud?.catch&&!hud.canKeep)return'full';
 if(hud?.phase==='reeling')return'fight';
 if(receipt??hud?.receipt)return'receipt';
 if(hud?.phase==='escaped')return'lost';
 return hud?'bait':'hidden';
}
export const fishingHudWidth=(kind:FishingHudKind)=>({full:176,fight:132,receipt:178,lost:148,bait:38,hidden:0})[kind];

/** Full guidance remains available to assistive technology without adding a
 * second set of changing instructions beside the visual fishing controls. */
export function fishingAccessibleStatus(hud:FishingHud,inputMode:'touch'|'keyboard'='touch'){
 if(hud.catch)return hud.canKeep?'Adding your catch to the bag.':'Bag full. Your catch is held safely. Open the bag to make room, or release the catch.';
 const touch=inputMode==='touch';
 const detail=hud.phase==='aiming'?(touch?'Drag on the left to move the landing marker.':'Use WASD to move the landing marker.')+' '+hud.castHint:
  hud.phase==='ready'&&!hud.disabled?(touch?'Hold CAST, then drag on the left to aim.':'Hold Space, then use WASD to aim.'):hud.detail;
 return`${hud.phase==='nibble'?'Nibble. ':hud.phase==='bite'?'Bite! ':''}${hud.command}. ${detail}`;
}
export function fishingLostLabel(hud:FishingHud){return hud.detail.split('·')[0].trim()||'Catch lost'}
export function fishingReceiptPresentation(receipt:FishingCatchReceipt){
 const caught=receipt.catch,drone=caught.species==='drone',species=FISHING_SPECIES[caught.species].shortName;
 return{
  title:`${species} ${drone?'salvaged':'caught'}`,
  detail:`${caught.kg.toFixed(2)} kg · In bag`,
  accessibilityLabel:`${species}, ${caught.kg.toFixed(2)} kilograms. Added to your bag: ${receipt.rewardLabel}. ${(receipt.rewardWeight).toFixed(2)} kilograms of pack weight.${caught.isRecord&&!drone?' New species best.':''}`,
  opacity:Math.max(0,Math.min(1,receipt.age/.12,(receipt.duration-receipt.age)/.35)),
 };
}

/** Auto-collection keeps the immediate save previously triggered by KEEP.
 * A remounted HUD or replacement world must not replay historical saves. */
export class FishingCatchCheckpoint{
 constructor(private owner?:object,private kept=0,private pendingId?:number){}
 update(owner:object,kept:number,pendingId?:number){
  const changed=this.owner===owner&&(kept>this.kept||pendingId!==undefined&&pendingId!==this.pendingId);
  this.owner=owner;this.kept=kept;this.pendingId=pendingId;return changed;
 }
}

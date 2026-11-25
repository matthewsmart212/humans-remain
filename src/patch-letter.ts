import type {World} from './survival-engine';
import {patchQuestSite,PATCH_SURVEYED_SITES} from './patch-placement';

export const PATCH_LETTER_POSTSCRIPT = 'I wondered who would light the fire. Now I know your footsteps. — Patch';

/** Pencil notes on the reverse describe the shed the player will recognize. */
export function patchLetterDirections(world:World){
 const site=patchQuestSite(world.layout);
 const westBank=site&&PATCH_SURVEYED_SITES.some(point=>Math.hypot(point.x-site.station.x,point.y-site.station.y)<300);
 return westBank
  ? 'Cross the southern bridge at Stillwater Lake. Look for the chain hoist beside the door on the west bank.'
  : 'Look for the chain hoist beside the door. I drew it here so you would know the place.';
}

export function patchLetterDescription(world:World){
 if(world.patchQuest?.suppliesDelivered)return 'Fresh pencil beneath the signature';
 return world.patchQuest?.noteRead?'Signed P-04':'Left with the supplies';
}

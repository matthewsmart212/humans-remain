import type {World} from './survival-engine';
import {patchSpeakerName} from './patch-quest';
import {patchRescueSite,PATCH_SURVEYED_SITES} from './patch-placement';

export const PATCH_LETTER_POSTSCRIPT = 'I wondered who would light the fire. Now I know your footsteps. — Patch';

/** Pencil notes on the reverse describe the shed the player will recognize. */
export function patchLetterDirections(world:World){
 const site=patchRescueSite(world.layout);
 const westBank=site&&PATCH_SURVEYED_SITES.some(point=>Math.hypot(point.x-site.station.x,point.y-site.station.y)<600);
 return westBank
  ? 'Cross the southern bridge at Stillwater Lake. Follow the west bank south to the old chain hoist. My shelter is under the awning beside it.'
  : 'I drew the old chain hoist. Look for the shelter awning beside it.';
}

export function patchLetterDescription(world:World){
 if(patchSpeakerName(world.patchQuest)==='Patch')return 'Fresh pencil beneath the signature';
 return world.patchQuest?.noteRead?'Signed P-04':'Left with the supplies';
}

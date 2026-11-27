import {nextPatchFootprints} from './patch-scanner-trail';
import {patchSpeakerName} from './patch-quest';
import {campLootChest} from './loot-chest';
import {patchRescueSite,patchRouteSite} from './patch-placement';
import type {Vec,World} from './survival-engine';

export type PatchMapLead=Vec&{label:string};

/** A lead only appears after the player has found evidence in this run.
 * Use actual placements so an edited station, or a waiting Patch, can be found. */
export function patchMapLead(world:World):PatchMapLead|undefined{
 const state=world.patchQuest;
 if(world.scene||!world.progression||!state)return;
 if(state.suppliesDelivered){
  const separated=Math.hypot(state.position.x-world.player.x,state.position.y-world.player.y)>450;
  if(state.command==='stay'||separated)return {...state.position,label:patchSpeakerName(state)};
  return;
 }
 if(state.recruited){
  const chest=campLootChest(world);
  if(chest)return {x:chest.x,y:chest.y+78,label:'Camp chest'};
  return;
 }
 if(state.servoInstalled)return {...state.position,label:'P-04'};
 if(!state.noteRead&&!state.discovered&&!state.servoClaimed)return;
 const site=patchRescueSite(world.layout);
 if(!site)return;
 if(!state.discovered)return {...site.approach,label:'Rescue shelter'};
 if(state.servoClaimed||!state.diagnosed)return {...site.robot,label:'P-04'};
 if(!state.dispatchRead){
  if(!state.scannerLoaned)return {...site.robot,label:'Field scanner'};
  if((state.footprintsFound??0)<3){
   const next=world.layout&&nextPatchFootprints(world.layout,state.footprintsFound??0);
   return next?{x:next.x,y:next.y,label:'P-04’s footprints'}:undefined;
  }
  const post=patchRouteSite(world.layout,'dispatch');
  return post?{...post.approach,label:'Spare W-6 drive'}:undefined;
 }
 const hauler=patchRouteSite(world.layout,'hauler');
 if(!hauler)return;
 if(state.haulerInspected)return hauler.release?{...hauler.release,label:'Brake housing'}:undefined;
 return {...hauler.approach,label:'Cable works'};
}

export function samePatchMapLead(a:PatchMapLead|undefined,b:PatchMapLead|undefined){
 return a?.label===b?.label&&a?.x===b?.x&&a?.y===b?.y;
}

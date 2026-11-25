import {campLootChest} from './loot-chest';
import {patchQuestSite} from './patch-placement';
import type {Vec,World} from './survival-engine';

export type PatchMapLead=Vec&{label:string};

/** A lead only appears after the player has found evidence in this run.
 * Use actual placements so an edited station, or a waiting Patch, can be found. */
export function patchMapLead(world:World):PatchMapLead|undefined{
 const state=world.patchQuest;
 if(world.scene||!world.progression||!state)return;
 if(state.suppliesDelivered){
  const separated=Math.hypot(state.position.x-world.player.x,state.position.y-world.player.y)>450;
  if(state.command==='stay'||separated)return {...state.position,label:'Patch'};
  return;
 }
 if(state.recruited){
  const chest=campLootChest(world);
  if(chest)return {x:chest.x,y:chest.y+78,label:'Camp chest'};
  return;
 }
 if(state.servoInstalled)return {...state.position,label:'P-04'};
 if(!state.noteRead&&!state.discovered&&!state.servoClaimed)return;
 const site=patchQuestSite(world.layout);
 if(!site)return;
 if(!state.discovered)return {...site.approach,label:'Maintenance station'};
 return state.servoClaimed?{...site.robot,label:'P-04'}:{...site.locker,label:'Service locker'};
}

export function samePatchMapLead(a:PatchMapLead|undefined,b:PatchMapLead|undefined){
 return a?.label===b?.label&&a?.x===b?.x&&a?.y===b?.y;
}

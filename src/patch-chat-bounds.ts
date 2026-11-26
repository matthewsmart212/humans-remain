import type {MenuInsets,MenuRect} from './station-menu-layout';
import type {PatchQuestState} from './patch-quest';
import type {Vec,World} from './survival-engine';
import {PATCH_ROBOT_SCALE} from './patch-art';

/** Reserve the screen-space reply controls when framing the actors. */
const bounds=new WeakMap<PatchQuestState,MenuRect&{safe?:MenuInsets}>();

export function setPatchChatBounds(world:World,rect:MenuRect|undefined,safe?:MenuInsets){
 const state=world.patchQuest;
 if(!state)return;
 if(rect)bounds.set(state,{...rect,safe});
 else {bounds.delete(state);actors.delete(state)}
}

export function patchChatBounds(world:World){
 return world.patchQuest?bounds.get(world.patchQuest):undefined;
}

type Actors={patch:MenuRect;survivor:MenuRect};
const actors=new WeakMap<PatchQuestState,Actors>();
const listeners=new WeakMap<PatchQuestState,Set<()=>void>>();

export function patchChatActors(world:World){
 return world.patchQuest?actors.get(world.patchQuest):undefined;
}

export function subscribePatchChatActors(world:World,listener:()=>void){
 const state=world.patchQuest;
 if(!state)return ()=>{};
 let set=listeners.get(state);
 if(!set){set=new Set();listeners.set(state,set)}
 set.add(listener);
 return ()=>{set.delete(listener)};
}

function sameRect(a:MenuRect,b:MenuRect){
 return a.x===b.x&&a.y===b.y&&a.width===b.width&&a.height===b.height;
}

/** Project the same interpolated feet and logical-pixel camera used to paint this frame. */
export function publishPatchChatActors(world:World,robot:Vec,camera:{x:number;y:number;scale:number}){
 const state=world.patchQuest;
 if(!state)return;
 const {x,y,scale}=camera;
 const rect=(feet:Vec,half:number,tall:number):MenuRect=>({
  x:Math.round((feet.x-half-x)*scale),y:Math.round((feet.y-tall-y)*scale),
  width:Math.round(2*half*scale),height:Math.round((tall+3)*scale),
 });
 const patch=rect(robot,(state.servoInstalled?92:83)*PATCH_ROBOT_SCALE,(state.servoInstalled?200:158)*PATCH_ROBOT_SCALE);
 const survivor=rect(world.player,39,119);
 const previous=actors.get(state);
 if(previous&&sameRect(previous.patch,patch)&&sameRect(previous.survivor,survivor))return;
 actors.set(state,{patch,survivor});
 listeners.get(state)?.forEach(update=>update());
}

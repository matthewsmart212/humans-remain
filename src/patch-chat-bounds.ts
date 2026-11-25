import type {MenuInsets,MenuRect} from './station-menu-layout';
import type {PatchQuestState} from './patch-quest';
import type {World} from './survival-engine';

/** Reserve the screen-space reply controls when framing the actors. */
const bounds=new WeakMap<PatchQuestState,MenuRect&{safe?:MenuInsets}>();

export function setPatchChatBounds(world:World,rect:MenuRect|undefined,safe?:MenuInsets){
 const state=world.patchQuest;
 if(!state)return;
 if(rect)bounds.set(state,{...rect,safe});
 else bounds.delete(state);
}

export function patchChatBounds(world:World){
 return world.patchQuest?bounds.get(world.patchQuest):undefined;
}

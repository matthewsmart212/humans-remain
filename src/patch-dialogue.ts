import type {World} from './survival-engine';
import {patchStatus} from './patch-quest';

export type PatchTopicId='supplies'|'identity'|'reclamation'|'damage';
type PatchTopic={id:PatchTopicId;label:string};

const topics:readonly PatchTopic[]=[
 {id:'supplies',label:'You left the supplies?'},
 {id:'identity',label:'Who are you?'},
 {id:'reclamation',label:'Why are you helping us?'},
];
const damagedTopics:readonly PatchTopic[]=[...topics,{id:'damage',label:'What happened to your leg?'}];
const noTopics:readonly PatchTopic[]=[];

/** Optional conversation only. Reading a reply never advances the rescue. */
export function patchDialogueTopics(world:World):readonly PatchTopic[]{
 const state=world.patchQuest;
 if(!state?.discovered)return noTopics;
 return state.servoInstalled?topics:damagedTopics;
}

export function patchDialogueReply(world:World,id:PatchTopicId):string|undefined{
 if(!patchDialogueTopics(world).some(topic=>topic.id===id))return;
 const state=world.patchQuest!;
 switch(id){
  case 'supplies':return state.suppliesDelivered
   ?'I left them in case someone came. You came back for me. That was more than I had hoped for.'
   :'I was told nobody would come. An empty camp seemed a poor way to find out. So I left the tools.';
  case 'identity':return state.suppliesDelivered
   ?'P-04 is stamped on the plate. Patch is better. It sounds like someone means to keep me.'
   :'P-04. Rescue unit. I am still working. More or less.';
  case 'reclamation':return 'I was built to bring people home. The Reclamation did not make that work less necessary.';
  case 'damage':return state.servoClaimed
   ?'That replacement should do. I made it here for parts. Getting back was the part I had not solved.'
   :'The drive servo gave out. I made it here for parts. Getting back was the part I had not solved.';
 }
}

/** The greeting follows real quest/command state; it does not replace its gates. */
export function patchOpeningLine(world:World):string{
 const status=patchStatus(world),state=world.patchQuest;
 if(!status||!state)return '';
 if(!state.discovered)return status.line;
 if(!state.servoInstalled)return state.servoClaimed
  ?'That is the part. I would be grateful for a little help with it.'
  :'You saw the signal. I hoped you would.';
 if(!state.recruited)return 'Both feet. Still a little uneven. Is there room by your fire?';
 if(!state.suppliesDelivered)return 'I kept something for the camp. Lead the way.';
 if(state.command==='follow')return 'With you. I am getting better at keeping up.';
 if(state.command==='camp')return 'Back to the fire, then. I know the way.';
 return status.line==='Shelter occupied.'
  ?'Shelter occupied. I like that reading.'
  :'I will wait here. You know where to find me.';
}

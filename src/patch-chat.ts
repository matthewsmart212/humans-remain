import type {World} from './survival-engine';
import {canTalkToPatch,commandPatch,patchStatus,recruitPatch,type PatchQuestState} from './patch-quest';
import {patchDialogueFollowup,patchDialogueReply,patchDialogueTopics,patchOpeningLine,type PatchTopicId} from './patch-dialogue';

type Choice={id:string;label:string};
type Turn={view:'greeting'}|{view:'topics'}|{view:'answer'|'followup';topic:PatchTopicId};
export type PatchChat={
 readonly speaker:string;readonly line:string;readonly choices:readonly Choice[];
 readonly pageIndex:number;readonly pageCount:number;readonly view:Turn['view'];readonly question?:string;
};
type Session={turn:Turn;pages:string[];snapshot:PatchChat;hp:number};

// The renderer sees an interpolated World. Quest identity is shared across
// those views, and replaced for a restored or restarted run.
const sessions=new WeakMap<PatchQuestState,Session>();
export function patchChat(w:World){return w.patchQuest?sessions.get(w.patchQuest)?.snapshot:undefined}
export function closePatchChat(w:World){return !!w.patchQuest&&sessions.delete(w.patchQuest)}

/** Prefer a pause between sentences. Only split a long sentence between words. */
function speechPages(line:string){
 const pages:string[]=[];
 let current='';
 for(const sentence of line.match(/[^.!?]+[.!?]+|[^.!?]+$/g)??[line]){
  const text=sentence.trim();
  if(!text)continue;
  if(current&&current.length+text.length+1>78){pages.push(current);current=''}
  for(const word of text.split(/\s+/)){
   if(current&&current.length+word.length+1>78){pages.push(current);current=''}
   current=current?current+' '+word:word;
  }
 }
 if(current)pages.push(current);
 return pages;
}

function show(w:World,turn:Turn,page:number|'last'=0,existingPages?:string[]){
 const state=w.patchQuest,status=patchStatus(w);
 if(!state||!status)return false;
 const topics=patchDialogueTopics(w);
 let line:string,question:string|undefined;
 let choices:Choice[];
 if(turn.view==='greeting'){
  line=patchOpeningLine(w);
  choices=[{id:'ask',label:'Ask Patch'}];
  if(status.canRecruit)choices.unshift({id:'recruit',label:'Come with us'});
  if(status.canCommand)choices.push({id:'follow',label:'Follow me'},{id:'stay',label:'Stay here'},{id:'camp',label:'Return to camp'});
 }else if(turn.view==='topics'){
  line='Listening.';
  choices=topics.map(topic=>({id:'topic:'+topic.id,label:topic.label}));
 }else{
  const selected=topics.find(topic=>topic.id===turn.topic);
  if(!selected)return false;
  const followup=patchDialogueFollowup(w,turn.topic);
  const reply=turn.view==='followup'?followup?.reply:patchDialogueReply(w,turn.topic);
  if(!reply)return false;
  question=turn.view==='followup'?followup?.question:selected.label;
  line=reply;
  choices=[{id:'ask',label:'Ask something else'}];
  if(turn.view==='answer'&&followup)choices.unshift({id:'followup',label:followup.question});
 }
 const pages=existingPages??speechPages(line);
 const index=page==='last'?pages.length-1:page;
 if(index<0||index>=pages.length)return false;
 if(index+1<pages.length)choices=[{id:'more',label:'Continue'}];
 if(index>0||turn.view!=='greeting')choices.push({id:'back',label:'Back'});
 const snapshot:PatchChat={speaker:status.title,line:pages[index],choices,pageIndex:index,pageCount:pages.length,view:turn.view,question};
 sessions.set(state,{turn,pages,snapshot,hp:w.player.hp});
 return true;
}

/** Called by inspectPatch after discovery and the physical interaction checks. */
export function openPatchChat(w:World){
 if(!w.patchQuest?.discovered||!canTalkToPatch(w))return false;
 return !!patchChat(w)||show(w,{view:'greeting'});
}

/** A displayed choice can outlive its target between a touch and its release. */
export function stepPatchChat(w:World){
 const session=w.patchQuest&&sessions.get(w.patchQuest);
 if(!session)return false;
 if(!canTalkToPatch(w)||w.player.hp<session.hp){closePatchChat(w);return false}
 session.hp=w.player.hp;
 return true;
}
export function choosePatchChat(w:World,id:string,expected?:PatchChat){
 const session=w.patchQuest&&sessions.get(w.patchQuest);
 if(!session||expected&&expected!==session.snapshot||!stepPatchChat(w)||!session.snapshot.choices.some(c=>c.id===id))return false;
 const {turn,snapshot,pages}=session;
 if(id==='more')return show(w,turn,snapshot.pageIndex+1,pages);
 if(id==='back')return backPatchChat(w);
 if(id==='ask')return show(w,{view:'topics'});
 if(id==='followup'&&'topic' in turn)return show(w,{view:'followup',topic:turn.topic});
 if(id==='recruit')return recruitPatch(w);
 if(id==='follow'||id==='stay'||id==='camp')return commandPatch(w,id);
 const topic=patchDialogueTopics(w).find(item=>'topic:'+item.id===id);
 return !!topic&&show(w,{view:'answer',topic:topic.id});
}
export function backPatchChat(w:World){
 const session=w.patchQuest&&sessions.get(w.patchQuest);
 if(!session||!stepPatchChat(w))return false;
 const {turn,snapshot,pages}=session;
 if(snapshot.pageIndex>0)return show(w,turn,snapshot.pageIndex-1,pages);
 if(turn.view==='followup')return show(w,{view:'answer',topic:turn.topic},'last');
 if(turn.view==='answer')return show(w,{view:'topics'});
 if(turn.view==='topics')return show(w,{view:'greeting'});
 return closePatchChat(w);
}

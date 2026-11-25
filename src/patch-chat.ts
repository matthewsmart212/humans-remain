import {facing,lineClear,worldBlocked,type Vec,type World} from './survival-engine';
import {canTalkToPatch,commandPatch,diagnosePatch,patchStatus,recruitPatch,type PatchQuestState} from './patch-quest';
import {patchDialogueFollowup,patchDialogueReply,patchDialogueTopics,patchOpeningLine,type PatchTopicId} from './patch-dialogue';

type Choice={id:string;label:string};
type Turn={view:'greeting'}|{view:'topics'}|{view:'answer'|'followup';topic:PatchTopicId;inspection?:boolean};
export type PatchChat={
 readonly speaker:string;readonly line:string;readonly choices:readonly Choice[];
 readonly pageIndex:number;readonly pageCount:number;readonly view:Turn['view'];readonly question?:string;
};
type Entrance={target:Vec;previousDistance:number};
type Session={turn:Turn;pages:string[];snapshot:PatchChat;hp:number;entrance?:Entrance};

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
  if(!state.servoClaimed&&!state.diagnosed)choices.unshift({id:'diagnose',label:'Inspect the damaged drive'});
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
  question=turn.inspection?'Inspect the damaged drive':turn.view==='followup'?followup?.question:selected.label;
  line=reply;
  choices=[{id:'ask',label:'Ask something else'}];
  if(turn.view==='answer'&&turn.topic==='damage'&&!state.diagnosed&&!state.servoClaimed)choices.unshift({id:'diagnose',label:'Inspect the damaged drive'});
  if(turn.view==='answer'&&followup)choices.unshift({id:'followup',label:followup.question});
 }
 const pages=existingPages??speechPages(line);
 const index=page==='last'?pages.length-1:page;
 if(index<0||index>=pages.length)return false;
 if(index+1<pages.length)choices=[{id:'more',label:'Continue'}];
 if(index>0||turn.view!=='greeting')choices.push({id:'back',label:'Back'});
 const snapshot:PatchChat={speaker:status.title,line:pages[index],choices,pageIndex:index,pageCount:pages.length,view:turn.view,question};
 sessions.set(state,{turn,pages,snapshot,hp:w.player.hp,entrance:sessions.get(state)?.entrance});
 return true;
}

/** The survivor's head and the robot's optic occupy the same screen space
 * on a head-on approach. Look for a dry, unobstructed shoulder of the scene. */
function entranceMark(w:World,robot:Vec):Entrance|undefined{
 const player=w.player,dx=player.x-robot.x,dy=player.y-robot.y;
 if(Math.abs(dx)>=61)return;
 const side=dx < -3?-1:1;
 const nearestY=Math.max(-16,Math.min(16,dy));
 const offsets=w.patchQuest?.servoInstalled&&dy>=0?[34,nearestY,16,-16,-32]:[nearestY,16,-16,32,-32];
 for(const reach of [68,64]){
  for(const sign of [side,-side]){
   for(const offset of new Set(offsets)){
    const target={x:robot.x+reach*sign,y:robot.y+offset};
    if(worldBlocked(w,target.x,target.y,19)||!lineClear(target,robot,w,-1,5))continue;
    const steps=Math.ceil(Math.hypot(target.x-player.x,target.y-player.y)/4);
    let clear=true;
    for(let i=1;i<=steps;i++){
     const t=i/steps;
     const point={x:player.x+(target.x-player.x)*t,y:player.y+(target.y-player.y)*t};
     if(worldBlocked(w,point.x,point.y,19)||!lineClear(point,robot,w,-1,5)){clear=false;break}
    }
    if(clear)return {target,previousDistance:Infinity};
   }
  }
 }
}

export function openPatchChat(w:World){
 const q=w.patchQuest;
 if(!q?.discovered||!canTalkToPatch(w))return false;
 if(patchChat(w))return true;
 if(!show(w,{view:'greeting'}))return false;
 sessions.get(q)!.entrance=entranceMark(w,q.position);
 return true;
}

/** This feeds the normal collision, walking gait and speed code once per tick.
 * One deliberate stick/keyboard movement hands control back for the whole chat. */
export function patchMeetingInput(w:World,input:Vec):Vec{
 const q=w.patchQuest,session=q&&sessions.get(q),entrance=session?.entrance;
 if(!q||!session||!entrance)return input;
 if(Math.hypot(input.x,input.y)>.05||w.player.hp<session.hp||!canTalkToPatch(w)){
  session.entrance=undefined;return input;
 }
 const dx=entrance.target.x-w.player.x,dy=entrance.target.y-w.player.y,d=Math.hypot(dx,dy);
 if(d<=1.4||d>=entrance.previousDistance-.025){
  session.entrance=undefined;
  w.player.direction=facing(q.position.x-w.player.x,0);
  return input;
 }
 entrance.previousDistance=d;
 const magnitude=Math.min(.56,Math.max(.16,d/5));
 return {x:dx/d*magnitude,y:dy/d*magnitude};
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
 if(id==='diagnose')return diagnosePatch(w)&&show(w,{view:'answer',topic:'damage',inspection:true});
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

import {facing,lineClear,worldBlocked,type Vec,type World} from './survival-engine';
import {acceptPatchRepair,canTalkToPatch,commandPatch,diagnosePatch,patchSpeakerName,recruitPatch,type PatchQuestState} from './patch-quest';
import {patchArrivalReply,patchDialogueFollowup,patchDialogueReply,patchDialogueTopics,patchOpeningLine,type PatchTopicId} from './patch-dialogue';

import {canBorrowPatchScanner,borrowPatchScanner} from './patch-scanner';

type Choice={id:string;label:string};
type Exchange='arrival'|'wire'|'homecoming'|'welcome';
type Turn={view:'greeting'|'topics'}|{view:'answer'|'followup';topic:PatchTopicId}|{view:'exchange';exchange:Exchange};
export type PatchChat={
 readonly speaker:string;readonly line:string;readonly choices:readonly Choice[];
 readonly pageIndex:number;readonly pageCount:number;readonly view:Turn['view'];readonly question?:string;
};
type Entrance={target:Vec;previousDistance:number};
type Cursor={turn:Turn;page:number};
type Session={turn:Turn;pages:string[];history:Cursor[];snapshot:PatchChat;hp:number;entrance?:Entrance};
const sessions=new WeakMap<PatchQuestState,Session>();
const accompanied=new WeakSet<PatchQuestState>();
/** Presence is local to a running room, independent of saved quest state. */
export function setPatchCrewPresent(w:World,present:boolean){
 const q=w.patchQuest;
 if(!q||present===accompanied.has(q))return;
 if(present)accompanied.add(q);else accompanied.delete(q);
 const session=sessions.get(q);
 if(session?.snapshot.choices.some(choice=>choice.id==='recruit')){
  session.snapshot={...session.snapshot,choices:session.snapshot.choices.map(choice=>choice.id==='recruit'?invite(q):choice)};
 }
}
export function patchChat(w:World){return w.patchQuest?sessions.get(w.patchQuest)?.snapshot:undefined}
export function closePatchChat(w:World){return !!w.patchQuest&&sessions.delete(w.patchQuest)}

/** Let the platform measure long sentences. Never split a spoken phrase by character count. */
function speechPages(line:string){
 const sentences=line.match(/[^.!?]+[.!?]+|[^.!?]+$/g)??[line];
 const pages:string[]=[];
 for(const sentence of sentences){
  const text=sentence.trim(),last=pages.length-1;
  if(!text)continue;
  if(last>=0&&pages[last].length+text.length+1<=78)pages[last]+=' '+text;
  else pages.push(text);
 }
 return pages;
}

const ask={id:'ask',label:'Ask something else'};
const back={id:'back',label:'Back'};
const repair={id:'repair',label:'Let’s fit the W-6.'};
const pauseRepair={id:'leave',label:'Give me a moment.'};
const wire={id:'tell-wire',label:'Will you tell me?'};
const leaveWire={id:'leave-wire',label:'We can leave it there.'};
const scanner={id:'borrow-scanner',label:'Take the scanner'};
const headOut={id:'leave',label:'I’ll follow the prints.'};
const firstPage:Cursor={turn:{view:'greeting'},page:0};
const invite=(q:PatchQuestState):Choice=>({id:'recruit',label:accompanied.has(q)?'Walk back with us.':'Walk back with me.'});

function greetingChoices(w:World):Choice[]{
 const q=w.patchQuest!;
 const questions={id:'ask',label:patchSpeakerName(q)==='Patch'?'Ask Patch':'Ask a question'};
 if(!q.servoClaimed&&!q.dispatchRead){
  if(q.scannerLoaned)return [q.footprintsFound===3?{id:'leave',label:'I’ll get the drive.'}:headOut,questions];
  return [scanner,{id:'arrival',label:patchArrivalReply(w).label},questions];
 }
 if(q.servoClaimed&&!q.servoInstalled)return [repair,questions,pauseRepair];
 if(q.servoInstalled&&!q.recruited)return [
  invite(q),questions,{id:'leave',label:'Rest here a while.'},
 ];
 if(q.suppliesDelivered)return [questions,{id:'follow',label:'Follow me'},{id:'stay',label:'Stay here'},{id:'camp',label:'Return to camp'}];
 if(canBorrowPatchScanner(w))return [scanner,questions];
 return [questions];
}

type Dialogue={line:string;choices:Choice[];question?:string};
function exchangeDialogue(w:World,exchange:Exchange):Dialogue{
 switch(exchange){
  case 'arrival':return {line:patchArrivalReply(w).line,choices:[scanner,{id:'arrival-followup',label:'Why leave supplies for strangers?'},ask]};
  case 'wire':return {line:'I cut it myself. The lamp runs on a separate circuit.',choices:[wire,leaveWire]};
  case 'homecoming':return {line:'I signed that letter P-04. Now that I’m staying… call me Patch.',choices:[{id:'welcome',label:'There’s room for you here, too.'},ask]};
  case 'welcome':return {line:'Thanks. I’ve made beds for half the valley. About time I claimed one.',choices:[ask]};
 }
}
function dialogue(w:World,turn:Turn):Dialogue|undefined{
 const q=w.patchQuest!;
 if(turn.view==='exchange')return exchangeDialogue(w,turn.exchange);
 if(turn.view==='greeting')return {line:patchOpeningLine(w),choices:greetingChoices(w)};
 const topics=patchDialogueTopics(w);
 if(turn.view==='topics')return {line:'What’s on your mind?',choices:topics.map(topic=>({id:'topic:'+topic.id,label:topic.label}))};
 if(!('topic' in turn))return;
 const selected=topics.find(topic=>topic.id===turn.topic);
 if(!selected)return;
 const followup=patchDialogueFollowup(w,turn.topic);
 if(turn.view==='followup')return followup&&{question:followup.question,line:followup.reply,choices:turn.topic==='reclamation'?[leaveWire,ask]:[ask]};
 const line=patchDialogueReply(w,turn.topic);if(!line)return;
 const choices:Choice[]=[];
 if(turn.topic==='bed')choices.push({id:'topic:reclamation',label:'Who cut that wire?'});
 if(turn.topic==='camp'&&w.player.hp<50)choices.push({id:'stay-close',label:'Stay close.'},{id:'stay',label:'I’ll rest here.'});
 if(turn.topic==='damage'){
  if(!q.servoClaimed&&!q.scannerLoaned)choices.push(scanner);
  else if(q.servoClaimed&&!q.servoInstalled)choices.push(repair);
 }
 if(followup)choices.push({id:'followup',label:followup.question});
 if(turn.topic==='reclamation')choices.push(leaveWire);
 choices.push(ask);
 return {line,choices,question:selected.label};
}

function show(w:World,turn:Turn,page=0,history:Cursor[]=[],existingPages?:string[]){
 const q=w.patchQuest;
 if(!q)return false;
 const text=dialogue(w,turn);if(!text)return false;
 const introduction=turn.view==='exchange'&&turn.exchange==='homecoming';
 const pages=existingPages??(introduction?['I signed that letter P-04. Now that I’m staying…','Call me Patch.']:speechPages(text.line));
 if(page<0||page>=pages.length)return false;
 if(introduction&&page===1&&q.nameIntroduced===false){q.nameIntroduced=true;w.repairCheckpoint=true}
 const choices=page+1<pages.length?[{id:'more',label:'Continue'}]:[...text.choices];
 if(page>0||history.length)choices.push(back);
 const snapshot:PatchChat={speaker:patchSpeakerName(q),line:pages[page],choices,pageIndex:page,pageCount:pages.length,view:turn.view,question:text.question};
 sessions.set(q,{turn,pages,history,snapshot,hp:w.player.hp,entrance:sessions.get(q)?.entrance});
 return true;
}

export function openPatchBedChat(w:World){
 if(!canTalkToPatch(w)||!patchDialogueTopics(w).some(topic=>topic.id==='bed'))return false;
 return show(w,{view:'answer',topic:'bed'},0,[firstPage]);
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
 const entry:Turn=q.suppliesDelivered&&q.nameIntroduced===false?{view:'exchange',exchange:'homecoming'}:{view:'greeting'};
 if(!show(w,entry))return false;
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
 const {turn,snapshot,pages,history}=session;
 const next=(to:Turn)=>show(w,to,0,[...history,{turn,page:snapshot.pageIndex}]);
 if(id==='more')return show(w,turn,snapshot.pageIndex+1,history,pages);
 if(id==='back')return backPatchChat(w);
 if(id==='ask')return show(w,{view:'topics'},0,[firstPage]);
 if(id==='leave')return closePatchChat(w);
 if(id==='leave-wire')return show(w,{view:'greeting'});
 if(id==='arrival'||id==='welcome')return next({view:'exchange',exchange:id});
 if(id==='arrival-followup')return next({view:'followup',topic:'supplies'});
 if(id==='followup'&&'topic' in turn)return next({view:'followup',topic:turn.topic});
 if(id==='borrow-scanner'){
  if(!w.patchQuest?.diagnosed&&!diagnosePatch(w))return false;
  if(!borrowPatchScanner(w))return false;
  return closePatchChat(w);
 }
 if(id==='repair')return acceptPatchRepair(w);
 if(id==='stay-close')return commandPatch(w,'follow');
 if(id==='recruit')return recruitPatch(w);
 if(id==='follow'||id==='stay'||id==='camp')return commandPatch(w,id);
 if(id==='topic:reclamation')return next({view:'exchange',exchange:'wire'});
 if(id==='tell-wire')return next({view:'answer',topic:'reclamation'});
 const topic=patchDialogueTopics(w).find(item=>'topic:'+item.id===id);
 return !!topic&&next({view:'answer',topic:topic.id});
}
export function backPatchChat(w:World){
 const session=w.patchQuest&&sessions.get(w.patchQuest);
 if(!session||!stepPatchChat(w))return false;
 const {turn,snapshot,pages,history}=session;
 if(snapshot.pageIndex>0)return show(w,turn,snapshot.pageIndex-1,history,pages);
 const previous=history.at(-1);
 return previous?show(w,previous.turn,previous.page,history.slice(0,-1)):closePatchChat(w);
}

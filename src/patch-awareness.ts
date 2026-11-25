import {patchChat} from './patch-chat';
import {facing,lineClear,timeOf,type Direction,type World} from './survival-engine';
import type {PatchQuestState} from './patch-quest';

const bearings:Record<Direction,string>={
 up:'north','up-right':'northeast',right:'east','down-right':'southeast',
 down:'south','down-left':'southwest',left:'west','up-left':'northwest',
};
type Observation={line:string;until:number;warnedAt:number;enemyId?:number;need?:string;nextScan:number};
// The renderer interpolates the world and player. Both views share the same companion.
const observations=new WeakMap<PatchQuestState,Observation>();

export function patchSupportSpeech(w:World){
 const q=w.patchQuest,observation=q&&observations.get(q);
 if(q?.command==='follow'&&!w.stationPanel&&!w.scene&&observation&&!patchChat(w)&&timeOf(w)<observation.until)return observation.line;
}

/** A nearby, following rescue unit keeps watch. It never marks unseen enemies. */
export function stepPatchAwareness(w:World){
 const q=w.patchQuest;
 if(!q?.suppliesDelivered||q.command!=='follow'||w.scene||w.stationPanel||patchChat(w)||w.phase==='over'||w.player.downedUntil||w.player.hp<=0)return;
 const t=timeOf(w);
 let state=observations.get(q);
 if(!state){state={line:'',until:0,warnedAt:-Infinity,nextScan:t};observations.set(q,state)}
 if(t<state.nextScan)return;
 state.nextScan=t+.5;
 if(Math.hypot(w.player.x-q.position.x,w.player.y-q.position.y)>210||!lineClear(q.position,w.player,w))return;
 if(t-state.warnedAt<9)return;
 let nearest,range=380;
 for(const enemy of w.enemies){
  const distance=Math.hypot(enemy.x-q.position.x,enemy.y-q.position.y);
  if(enemy.hp>0&&distance<range&&lineClear(q.position,enemy,w)){nearest=enemy;range=distance}
 }
 let line;
 if(nearest){
  if(nearest.id===state.enemyId)return;
  state.enemyId=nearest.id;
  line='Machine to the '+bearings[facing(nearest.x-w.player.x,nearest.y-w.player.y)]+'.';
 }else{
  state.enemyId=undefined;
  const need=w.player.hp<30?'You’re hurt. Stay close.':w.thirst<20?'Water first. I can wait.':w.hunger<20?'Time to eat. I’ll watch.':undefined;
  if(need===state.need)return;
  state.need=need;line=need;
 }
 if(line){state.line=line;state.until=t+3.8;state.warnedAt=t}
}

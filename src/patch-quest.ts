import {facing,moveBody,pathTo,timeOf,withinActionReach,worldBlocked,STEP,type Direction,type Vec,type World} from './survival-engine';
import {campLootChest,lootChestContents,lootChestInMenuRange,LOOT_CHEST_ID,LOOT_CHEST_REWARDS} from './loot-chest';
import {PATCH_ROBOT_FRAMES,PATCH_WALK_CYCLE_DISTANCE} from './patch-art';
import {nearbyCombatThreat} from './combat-model';
import {closePatchChat,openPatchChat,openPatchBedChat,patchChat,stepPatchChat} from './patch-chat';
import {patchSupportSpeech} from './patch-awareness';
import {patchRescueSite,patchRouteSite} from './patch-placement';
import {patchObjective} from './patch-journal';
import {patchCotPosition} from './patch-scenery';

export {PATCH_QUEST_TITLE} from './patch-journal';
export const PATCH_REPAIR_SECONDS=6;
export const PATCH_NOTE_TEXT=`To whoever finds this place,

The tools are yours. I kept the handles wrapped so they’d stay dry.

My left knee keeps slipping. I’m heading back to my shelter before it gives out.

Cross the southern bridge at Stillwater Lake, then follow the west bank south. Look for three amber flashes under the old hoist. That’s my lamp.

Light the fire if you stay. I’d like to know someone made it.

P-04`;

export type PatchCommand='follow'|'stay'|'camp';
/** These are run-owned facts. Editor placements never contain quest progress. */
export type PatchQuestState={
 version:1;noteRead:boolean;discovered:boolean;servoClaimed:boolean;servoInstalled:boolean;
 /** Older runs can already have the component without having seen these clues. */
 diagnosed?:boolean;dispatchRead?:boolean;haulerInspected?:boolean;
 /** A successful sweep on each successive stretch of the west-bank trail. */
 footprintsFound?:number;
 scannerLoaned?:boolean;
 recruited:boolean;returnedToCamp:boolean;suppliesDelivered:boolean;nameIntroduced?:boolean;
 position:Vec;direction:Direction;command:PatchCommand;moving:boolean;walkDistance:number;
 /** Real walked ground preserves a way back through bridges and open gates. */
 followTrail:Vec[];homeTrail:Vec[];
};
export type PatchRepair={worked:number;duration:number;held:boolean;updatedAt:number;origin:Vec;hp:number;hurtUntil:number};
type PatchTarget='robot'|'cot'|'spare'|'hauler-inspect'|'hauler-salvage';
export type PatchInteraction={key:`patch:${PatchTarget}`;action:'patch';target:PatchTarget;label:string;shortLabel:'INSPECT'|'TALK'|'TAKE'|'SALVAGE';canRepair?:boolean;disabled:boolean;x:number;y:number};
export type PatchStatus={title:string;line:string;objective:string;canRepair:boolean;canRecruit:boolean;canCommand:boolean;servo:boolean};

// Stay just outside action reach so a following companion does not replace
// the player's tool button. A small step towards him opens conversation.
const BODY=15,INTERACT_REACH=80,FOLLOW_GAP=88,FOLLOW_SETTLE=2,TRAIL_STEP=28;
const point=(p:Vec):Vec=>({x:p.x,y:p.y});
const distance=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y);
type Runtime={repairOffered?:boolean;path:Vec[];routeAt:number;routeTarget?:Vec;speed:number;speech?:string;speechUntil:number;homeSample?:Vec;followSample?:Vec};
// Presentation interpolates the player into a new World every frame. The
// quest object is shared by those views and identifies this particular run.
const runtimes=new WeakMap<PatchQuestState,Runtime>();
function runtime(state:PatchQuestState){
 let r=runtimes.get(state);
 if(!r){r={path:[],routeAt:0,speed:0,speechUntil:0};runtimes.set(state,r)}
 return r;
}
function say(w:World,line:string,seconds=3){
 const r=runtime(w.patchQuest!);
 r.speech=line;r.speechUntil=timeOf(w)+seconds;
}
export function patchSpeech(w:World){
 const r=w.patchQuest&&runtimes.get(w.patchQuest);
 return patchChat(w)?.line??(r&&timeOf(w)<r.speechUntil?r.speech:patchSupportSpeech(w));
}
export function patchBeacon(w:World){
 const t=timeOf(w);
 if(w.patchQuest?.servoInstalled){
  // His caged lamp brightens as his voice opens, then settles.
  const speaking=!!patchSpeech(w);
  if(!speaking)return .32;
  return w.weather?.reducedMotion ? .8 : .76+.12*Math.cos(t*9);
 }
 if(w.weather?.reducedMotion)return .65;
 const phase=t%5.4,on=phase%.9;
 if(phase>=2.7||on>=.42)return .1;
 const envelope=Math.min(1,on/.055,(.42-on)/.13);
 return .1+.85*envelope;
}
function active(w:World){return !w.scene&&!!w.progression&&!!w.layout&&w.phase!=='over'&&w.player.hp>0&&!w.player.downedUntil}
function available(w:World){return active(w)&&!w.bruteGrab&&!w.dodge&&!w.buildingRepair&&!w.fishingSession&&!w.axeSwing&&!w.spearThrust&&!w.swordThrust&&!w.bowShot&&timeOf(w)>=w.attackUntil}
function robotPresent(w:World,state:PatchQuestState){return state.servoInstalled||!!patchRescueSite(w.layout)}
function nearRobot(w:World,state:PatchQuestState){return robotPresent(w,state)&&withinActionReach(w,state.position,INTERACT_REACH)}

/** The paper remains readable even if an owner deliberately removes the site. */
export function ensurePatchQuest(w:World):PatchQuestState|undefined{
 if(w.scene||!w.progression||!w.layout)return;
 const site=patchRescueSite(w.layout);
 const state=w.patchQuest??={version:1,noteRead:false,discovered:false,servoClaimed:false,servoInstalled:false,
  recruited:false,returnedToCamp:false,suppliesDelivered:false,position:point(site?.robot??campLootChest(w)??w.player),
  direction:'down-right',command:'stay',moving:false,walkDistance:0,followTrail:[],homeTrail:[]};
 // An unrepaired unit belongs to its actual editor placement. A repaired unit
 // is a run actor and never jumps back when an owner moves that placement.
 if(!state.servoInstalled&&site){state.position.x=site.robot.x;state.position.y=site.robot.y}
 return state;
}
export function readPatchNote(w:World){
 if(!active(w)||!['rare-cache','patch-note'].includes(w.stationPanel??'')||(w.lootChestId??LOOT_CHEST_ID)!==LOOT_CHEST_ID||!w.lootChests?.[LOOT_CHEST_ID]||!lootChestInMenuRange(w,LOOT_CHEST_ID))return false;
 const state=ensurePatchQuest(w);if(!state)return false;
 if(!state.noteRead){state.noteRead=true;w.repairCheckpoint=true}return true;
}
export function canTalkToPatch(w:World){
 const state=w.patchQuest;
 return !!state&&available(w)&&!w.stationPanel&&!w.patchRepair&&w.player.hurtUntil<=timeOf(w)&&
  nearRobot(w,state)&&(!w.combatTest||!nearbyCombatThreat(w));
}
// At shallow angles below him, the painted three-quarter idle keeps Patch's
// amber optic visible as he looks toward the survivor.
function faceDuringConversation(state:PatchQuestState,player:Vec){
 const dx=player.x-state.position.x,dy=player.y-state.position.y;
 if(!state.servoInstalled||Math.hypot(dx,dy)<=3)return;
 const heading=facing(dx,dy);
 state.direction=dy>0&&(heading==='right'||heading==='left')?(dx>0?'down-right':'down-left'):heading;
}
export function inspectPatch(w:World){
 const state=ensurePatchQuest(w);
 if(!state||!canTalkToPatch(w))return false;
 if(!state.discovered){state.discovered=true;w.repairCheckpoint=true}
 state.moving=false;
 if(distance(w.player,state.position)>3){
  w.player.direction=facing(state.position.x-w.player.x,state.position.y-w.player.y);
 }
 faceDuringConversation(state,w.player);
 runtime(state).speechUntil=0;runtime(state).repairOffered=false;
 return openPatchChat(w);
}
export function diagnosePatch(w:World){
 const q=w.patchQuest;
 if(!q?.discovered||q.diagnosed||q.servoClaimed||!patchChat(w)||!canTalkToPatch(w))return false;
 q.diagnosed=true;w.repairCheckpoint=true;
 return true;
}
function inspectHauler(w:World){
 const q=w.patchQuest,hauler=patchRouteSite(w.layout,'hauler');
 if(!q?.dispatchRead||q.haulerInspected||q.servoClaimed||!hauler||!withinActionReach(w,hauler.approach,INTERACT_REACH))return false;
 q.haulerInspected=true;w.repairCheckpoint=true;w.notice='Load plate matches · Reach the brake housing on the far side.';w.noticeUntil=timeOf(w)+6;
 return true;
}
/** The retired machine has a service plate on one side and a brake on the other.
 * The unique salvaged drive travels independently of backpack capacity. */
export function claimPatchServo(w:World){
 const q=w.patchQuest,hauler=patchRouteSite(w.layout,'hauler');
 if(!q?.haulerInspected||!q.dispatchRead||q.servoClaimed||!available(w)||w.stationPanel||patchChat(w)||!hauler?.release||!withinActionReach(w,hauler.release,INTERACT_REACH))return false;
 q.servoClaimed=true;w.repairCheckpoint=true;w.notice='W-6 drive recovered · Bring it back to P-04.';w.noticeUntil=timeOf(w)+5;
 return true;
}
export function examinePatchSite(w:World,target:Exclude<PatchTarget,'robot'>){
 if(!available(w)||w.stationPanel||patchChat(w))return false;
 if(target==='cot'){
  const cot=patchCotPosition(w.layout);
  if(!cot||w.patchQuest?.recruited||!withinActionReach(w,cot,48)||!inspectPatch(w))return false;
  return openPatchBedChat(w);
 }
 if(target==='spare'){
  const q=w.patchQuest,post=patchRouteSite(w.layout,'dispatch');
  if(!q?.scannerLoaned||q.dispatchRead||q.footprintsFound!==3||q.servoClaimed||!post||!withinActionReach(w,post.approach,INTERACT_REACH))return false;
  q.servoClaimed=true;w.repairCheckpoint=true;
  w.notice='W-6 collected · Return to P-04 at the shelter.';w.noticeUntil=timeOf(w)+5;
  return true;
 }
 if(target==='hauler-inspect')return inspectHauler(w);
 return target==='hauler-salvage'&&claimPatchServo(w);
}
export function patchSpeakerName(state:PatchQuestState|undefined){
 // Completed saves from before the introduction already know his name.
 return state?.suppliesDelivered&&state.nameIntroduced!==false?'Patch':'P-04';
}
export function patchInteraction(w:World):PatchInteraction|null{
 const state=ensurePatchQuest(w);if(!state||!active(w)||w.stationPanel||patchChat(w))return null;
 const choices:PatchInteraction[]=[];
 if(nearRobot(w,state)){
  const repair=state.discovered&&state.servoClaimed&&!state.servoInstalled;
  choices.push({key:'patch:robot',action:'patch',target:'robot',...state.position,
   label:state.discovered?'Talk to '+patchSpeakerName(state):'Inspect P-04',
   shortLabel:state.discovered?'TALK':'INSPECT',canRepair:repair,disabled:!available(w)});
 }
 if(!state.recruited&&nearRobot(w,state)){
  const cot=patchCotPosition(w.layout);
  if(cot&&withinActionReach(w,cot,48)){
   choices.push({key:'patch:cot',action:'patch',target:'cot',...cot,label:'Look at the dry bedroll',shortLabel:'INSPECT',disabled:!available(w)});
  }
 }
 if(!state.servoClaimed&&(state.dispatchRead||state.scannerLoaned&&state.footprintsFound===3)){
  const site=patchRouteSite(w.layout,state.dispatchRead?'hauler':'dispatch');
  const target=state.dispatchRead?(state.haulerInspected?'hauler-salvage':'hauler-inspect'):'spare';
  const position=state.haulerInspected?site?.release:site?.approach;
  if(position&&withinActionReach(w,position,INTERACT_REACH)){
   const label=target==='spare'?'Take the spare W-6 drive':target==='hauler-inspect'?'Inspect the hauler load plate':'Release the brake and salvage the drive';
   choices.push({key:`patch:${target}`,action:'patch',target,...position,label,
    shortLabel:target==='spare'?'TAKE':target==='hauler-inspect'?'INSPECT':'SALVAGE',disabled:!available(w)});
  }
 }
 if(!state.scannerLoaned||state.servoClaimed)return choices.find(choice=>choice.target==='robot')??choices[0]??null;
 choices.sort((a,b)=>distance(w.player,a)-distance(w.player,b));return choices[0]??null;
}
export function patchStatus(w:World):PatchStatus|null{
 const state=ensurePatchQuest(w);if(!state)return null;
 const title=patchSpeakerName(state);
 const canRepair=state.discovered&&state.servoClaimed&&!state.servoInstalled;
 const canRecruit=state.servoInstalled&&!state.recruited,canCommand=state.suppliesDelivered;
 const home=homePoint(w),campIdle=state.command==='stay'&&!!home&&distance(state.position,home)<150;
 const line=state.suppliesDelivered?(campIdle?'Shelter occupied.':state.command==='follow'?'With you.':state.command==='camp'?'On my way home.':'I will wait here.'):state.recruited?'I have something for the camp.':state.servoInstalled?'I can walk again.':state.servoClaimed?'Replacement servo secured.':'Drive servo damaged.';
 const objective=state.suppliesDelivered?'':patchObjective(state);
 return{title,line,objective,canRepair,canRecruit,canCommand,servo:state.servoClaimed&&!state.servoInstalled};
}
export const patchRepairProgress=(w:World)=>w.patchRepair?Math.max(0,Math.min(1,w.patchRepair.worked/w.patchRepair.duration)):0;
/** A reply hands input back to the hold control. It never starts the repair timer. */
export function acceptPatchRepair(w:World){
 const q=w.patchQuest;
 if(!q?.servoClaimed||q.servoInstalled||!patchChat(w)||!canTalkToPatch(w))return false;
 closePatchChat(w);runtime(q).repairOffered=true;
 w.notice='Hold REPAIR beside P-04 for six seconds.';w.noticeUntil=timeOf(w)+5;
 return true;
}
export function patchRepairOffered(w:World){
 const q=w.patchQuest;
 return !!q&&q.servoClaimed&&!q.servoInstalled&&!!runtimes.get(q)?.repairOffered&&nearRobot(w,q);
}
export function beginPatchRepair(w:World){
 const state=ensurePatchQuest(w);
 if(!state||!available(w)||w.patchRepair||!state.discovered||!state.servoClaimed||state.servoInstalled||!nearRobot(w,state)||w.player.hurtUntil>timeOf(w)||w.stationPanel)return false;
 closePatchChat(w);w.attackQueuedUntil=undefined;
 w.player.moving=false;w.player.sprinting=false;w.player.direction=facing(state.position.x-w.player.x,state.position.y-w.player.y);
 w.patchRepair={worked:0,duration:PATCH_REPAIR_SECONDS,held:false,updatedAt:timeOf(w),origin:point(w.player),hp:w.player.hp,hurtUntil:w.player.hurtUntil};
 return true;
}
export function cancelPatchRepair(w:World,notify=false){
 if(!w.patchRepair)return false;w.patchRepair=undefined;
 if(notify){w.notice='Repair stopped · Servo kept';w.noticeUntil=timeOf(w)+2}
 return true;
}
export function holdPatchRepair(w:World,held:boolean){
 if(!w.patchRepair)return false;
 if(!held)return cancelPatchRepair(w);
 w.patchRepair.held=true;return true;
}
function stepRepair(w:World,input:Vec){
 const job=w.patchRepair,state=w.patchQuest;if(!job||!state)return;
 const p=w.player;
 if(!available(w)||w.stationPanel||Math.hypot(input.x,input.y)>.05||distance(p,job.origin)>3||p.hp<job.hp||p.hurtUntil>job.hurtUntil||!state.servoClaimed||state.servoInstalled||!nearRobot(w,state)){
  cancelPatchRepair(w,true);return;
 }
 const dt=Math.min(STEP,Math.max(0,timeOf(w)-job.updatedAt));job.updatedAt=timeOf(w);
 if(!job.held)return;
 job.worked=Math.min(job.duration,job.worked+dt);
 if(job.worked>=job.duration-1e-8){
  // The servo is committed once, only after the final uninterrupted tick.
  state.servoInstalled=true;runtime(state).repairOffered=false;state.moving=false;w.patchRepair=undefined;w.repairCheckpoint=true;
  say(w,'That’s both feet under me. Thank you.',4);w.notice='Drive restored · Speak to P-04';w.noticeUntil=timeOf(w)+4;
 }
}
export function recruitPatch(w:World){
 const state=ensurePatchQuest(w);
 if(!state||!available(w)||!state.servoInstalled||state.recruited||!nearRobot(w,state)||w.stationPanel)return false;
 state.recruited=true;w.repairCheckpoint=true;state.command='follow';state.followTrail=[point(w.player)];
 runtime(state).followSample=point(w.player);closePatchChat(w);say(w,'I know that camp. Lead the way.',4);return true;
}
export function commandPatch(w:World,command:PatchCommand){
 const state=ensurePatchQuest(w);
 if(!state||!available(w)||!state.suppliesDelivered||!nearRobot(w,state)||!['follow','stay','camp'].includes(command)||w.stationPanel)return false;
 state.command=command;state.moving=false;state.followTrail=[];
 const r=runtime(state);r.path=[];r.routeAt=0;r.routeTarget=undefined;r.followSample=point(w.player);
 if(command==='follow')state.followTrail.push(point(w.player));
 closePatchChat(w);say(w,command==='follow'?'With you.':command==='stay'?'I will wait here.':'Returning to camp.');return true;
}

/** Streamed artwork is not physical geometry. A distant companion can still
 * return over real dry ground while the player's camera loads other tiles. */
function navigationWorld(w:World){return w.outdoorReady?{...w,outdoorReady:undefined}:w}
function clearSegment(w:World,a:Vec,b:Vec){
 const span=distance(a,b);
 // Long absences use saved ground trails or the bounded route query instead
 // of sweeping the whole world every animation frame.
 if(span>720)return false;
 const samples=Math.max(1,Math.ceil(span/9));
 for(let i=1;i<=samples;i++)if(worldBlocked(w,a.x+(b.x-a.x)*i/samples,a.y+(b.y-a.y)*i/samples,BODY))return false;
 return true;
}
function appendTrail(w:World,trail:Vec[],p:Vec,max:number){
 if(!trail.length){trail.push(point(p));return}
 if(distance(trail.at(-1)!,p)<TRAIL_STEP)return;
 // Merge only short, fully swept clear segments; never bridge a lake, fence
 // or closed gate merely because the destination is clear.
 const previous=trail.at(-2);
 if(previous&&distance(previous,p)<340&&clearSegment(w,previous,p))trail[trail.length-1]=point(p);
 else if(trail.length<max)trail.push(point(p));
}
function recordPlayerTrail(w:World,state:PatchQuestState,r:Runtime){
 const previous=r.followSample;
 if(previous&&distance(previous,w.player)<TRAIL_STEP)return;
 r.followSample=point(w.player);
 // Scene transitions or editor teleports do not become fake walkable links.
 if(previous&&distance(previous,w.player)>600){r.path=[];r.routeAt=0;return}
 appendTrail(w,state.followTrail,w.player,512);
}
const headings=Object.fromEntries(Object.entries(PATCH_ROBOT_FRAMES).map(([direction,row])=>{
 const angle=row*Math.PI/4;
 return [direction,{x:Math.sin(angle),y:Math.cos(angle)}];
})) as Record<Direction,Vec>;
function turnTowards(state:PatchQuestState,dx:number,dy:number){
 const length=Math.hypot(dx,dy),axis=headings[state.direction];
 // Five degrees of overlap keeps a slightly changing diagonal from flipping
 // the whole painted silhouette back and forth along a sector boundary.
 if(length>.001&&dx*axis.x+dy*axis.y<length*.887)
  state.direction=facing(dx,dy);
}
function walkTowards(w:World,state:PatchQuestState,r:Runtime,target:Vec,speed:number){
 const dx=target.x-state.position.x,dy=target.y-state.position.y,d=Math.hypot(dx,dy);
 if(d<.001)return;
 // Take up the load gradually after a stop. Distance to a waypoint caps the
 // displacement, so acceleration never carries him through a turn or wall.
 r.speed=Math.min(speed,r.speed+1000*STEP);
 const travel=Math.min(r.speed*STEP,d),before=point(state.position);
 moveBody(w,state.position,dx/d*travel,dy/d*travel,BODY);
 const moved=distance(before,state.position);state.moving=moved>.01;
 if(state.moving){
  turnTowards(state,state.position.x-before.x,state.position.y-before.y);
  state.walkDistance=(state.walkDistance+moved)%PATCH_WALK_CYCLE_DISTANCE;
 }
}
function routeTowards(w:World,state:PatchQuestState,r:Runtime,target:Vec,speed:number,direct=clearSegment(w,state.position,target)){
 if(direct){r.path=[];walkTowards(w,state,r,target,speed);return}
 const t=timeOf(w);
 if(t>=r.routeAt&&(!r.path.length||!r.routeTarget||distance(r.routeTarget,target)>90)){
  r.path=pathTo(state.position,target,w,4096,29);
  r.routeTarget=point(target);r.routeAt=t+1.3;
 }
 while(r.path.length&&distance(state.position,r.path[0])<12)r.path.shift();
 // A grid search makes right angles, even in open ground. Aim a few cells
 // ahead when Patch's entire body fits on that diagonal.
 for(let i=Math.min(3,r.path.length-1);i>0;i--){
  if(clearSegment(w,state.position,r.path[i])){r.path.splice(0,i);break}
 }
 const next=r.path[0];
 if(next&&clearSegment(w,state.position,next))walkTowards(w,state,r,next,speed);
 else if(next){r.path=[];r.routeAt=Math.max(r.routeAt,t+.25)}
}
function homePoint(w:World){const chest=campLootChest(w);return chest?{x:chest.x,y:chest.y+78}:undefined}
/** Rewards stay in the original chest, including when the player's bag is full. */
export function deliverPatchSupplies(w:World){
 const state=w.patchQuest,home=homePoint(w);
 // Let the survivor witness the homecoming, including when Patch catches
 // up along an old trail after the survivor has already passed the chest.
 if(!state||!state.recruited||state.suppliesDelivered||!home||distance(state.position,home)>80||distance(w.player,home)>200)return false;
 const nav=navigationWorld(w);
 if(!clearSegment(nav,state.position,home))return false;
 const chests=w.lootChests??={};
 if(!chests[LOOT_CHEST_ID])chests[LOOT_CHEST_ID]={openedAt:w.tick,menuShown:true,rewardVersion:2,contents:Object.fromEntries(LOOT_CHEST_REWARDS.map(reward=>[reward.kind,reward.amount]))};
 const contents=lootChestContents(w,LOOT_CHEST_ID);
 contents.pallets=(contents.pallets??0)+2;contents.scrap=(contents.scrap??0)+2;
 state.returnedToCamp=true;state.suppliesDelivered=true;state.nameIntroduced=false;w.repairCheckpoint=true;state.command='stay';state.moving=false;
 state.followTrail=[];state.homeTrail=[point(state.position)];
 const r=runtime(state);r.path=[];r.homeSample=point(state.position);
 say(w,'Shelter occupied.',6);w.notice='This time, someone brought the rescuer home.';w.noticeUntil=timeOf(w)+6;
 return true;
}
/** One actor, bounded route queries, swept collision and no teleport recovery. */
export function stepPatchQuest(w:World,input:Vec={x:0,y:0}){
 const chatting=stepPatchChat(w);
 const state=ensurePatchQuest(w);if(!state)return;
 const wasMoving=state.moving;
 state.moving=false;
 if(!active(w)){cancelPatchRepair(w);return}
 stepRepair(w,input);
 if(chatting){
  faceDuringConversation(state,w.player);
  return;
 }
 if(!state.servoInstalled||!state.recruited||state.command==='stay')return;
 const nav=navigationWorld(w),r=runtime(state);
 if(!wasMoving)r.speed=0;
 if(!state.suppliesDelivered){
  const home=homePoint(w);
  // Near the chest, finish the last few steps independently of follower gap.
  if(home&&distance(w.player,home)<170&&distance(state.position,home)<340){
   routeTowards(nav,state,r,home,260);deliverPatchSupplies(w);return;
  }
 }
 if(state.command==='follow'){
  recordPlayerTrail(nav,state,r);
  while(state.followTrail.length&&distance(state.position,state.followTrail[0])<24)state.followTrail.shift();
  const playerDistance=distance(state.position,w.player),clearApproach=clearSegment(nav,state.position,w.player);
  // A nearby player across a wall is not an arrived follower. Complete the
  // real route before settling, even if straight-line distance is short.
  if(!clearApproach||playerDistance>FOLLOW_GAP+FOLLOW_SETTLE){
   // Direct following remains swept; otherwise use the survivor's actual path.
   let target:Vec=w.player;
   if(clearApproach)state.followTrail=[point(w.player)];
   else if(state.followTrail.length)target=state.followTrail[0];
   // Proportional catch-up removes the old abrupt 270/470 speed switch and
   // eases into stationary feet. Corners retain enough speed to round safely.
   const speed=Math.min(470,Math.max(clearApproach?0:160,(playerDistance-FOLLOW_GAP)*4));
   routeTowards(nav,state,r,target,speed,clearApproach||target!==w.player&&clearSegment(nav,state.position,target));
  }else if(playerDistance>8){
   turnTowards(state,w.player.x-state.position.x,w.player.y-state.position.y);
  }
  if(state.returnedToCamp&&state.moving){
   if(!r.homeSample||distance(r.homeSample,state.position)>=TRAIL_STEP){appendTrail(nav,state.homeTrail,state.position,1024);r.homeSample=point(state.position)}
  }
 }else{
  while(state.homeTrail.length>1&&distance(state.position,state.homeTrail.at(-1)!)<24)state.homeTrail.pop();
  const home=homePoint(w),last=state.homeTrail.at(-1),target=last&&!(state.homeTrail.length===1&&distance(state.position,last)<24)?last:home;
  if(target)routeTowards(nav,state,r,target,300);
  if(home&&distance(state.position,home)<65&&clearSegment(nav,state.position,home)){state.command='stay';state.moving=false;state.homeTrail=[point(state.position)];say(w,'Home.');}
 }
 if(!state.suppliesDelivered)deliverPatchSupplies(w);
}

const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const finite=(value:unknown,min:number,max:number):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
const savedPoint=(value:unknown):value is Vec=>record(value)&&finite(value.x,-30000,30000)&&finite(value.y,-30000,30000);
/** Invalid linked milestones must never mint another component or parcel. */
export function validPatchQuest(value:unknown):value is PatchQuestState|undefined{
 if(value===undefined)return true;
 if(!record(value)||value.version!==1)return false;
 if(!['noteRead','discovered','servoClaimed','servoInstalled','recruited','returnedToCamp','suppliesDelivered','moving'].every(key=>typeof value[key]==='boolean'))return false;
 if(value.nameIntroduced!==undefined&&(typeof value.nameIntroduced!=='boolean'||!value.suppliesDelivered))return false;
 if(!savedPoint(value.position)||!['down','right','up','left','down-right','down-left','up-right','up-left'].includes(String(value.direction))||!['follow','stay','camp'].includes(String(value.command))||!finite(value.walkDistance,0,112))return false;
 if(!Array.isArray(value.followTrail)||value.followTrail.length>512||!value.followTrail.every(savedPoint)||!Array.isArray(value.homeTrail)||value.homeTrail.length>1024||!value.homeTrail.every(savedPoint))return false;
 if(['diagnosed','dispatchRead','haulerInspected','scannerLoaned'].some(key=>value[key]!==undefined&&typeof value[key]!=='boolean'))return false;
 if(value.footprintsFound!==undefined&&(!finite(value.footprintsFound,0,3)||!Number.isInteger(value.footprintsFound)||!value.scannerLoaned))return false;
 if(value.scannerLoaned&&!value.diagnosed||value.diagnosed&&!value.discovered||value.dispatchRead&&!value.diagnosed||value.haulerInspected&&!value.dispatchRead)return false;
 if(value.servoInstalled&&(!value.servoClaimed||!value.discovered)||value.recruited&&!value.servoInstalled||value.returnedToCamp&&!value.recruited||value.suppliesDelivered&&!value.returnedToCamp)return false;
 if(!value.recruited&&value.command!=='stay'||value.command==='camp'&&!value.suppliesDelivered)return false;
 return true;
}
/** Restore facts and real route history, never a held repair or stale speech. */
export function restorePatchQuest(w:World){
 closePatchChat(w);
 w.patchRepair=undefined;
 if(w.patchQuest){runtimes.delete(w.patchQuest);w.patchQuest.moving=false}
 return ensurePatchQuest(w);
}

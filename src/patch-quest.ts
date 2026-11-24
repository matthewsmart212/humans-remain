import {facing,moveBody,pathTo,timeOf,withinActionReach,worldBlocked,STEP,type Direction,type Vec,type World} from './survival-engine';
import {campLootChest,lootChestContents,lootChestInMenuRange,LOOT_CHEST_ID,LOOT_CHEST_REWARDS} from './loot-chest';
import {patchQuestSite} from './patch-placement';

export const PATCH_QUEST_TITLE='Someone Was Here';
export const PATCH_REPAIR_SECONDS=6;
export const PATCH_NOTE_TEXT=`To whoever finds this place,

The tools are yours.

I was told nobody would come. I thought it best to leave these anyway.

The well needs work. So do the walls. I wanted to have more ready for you, but I need a few replacement parts myself.

There is an old maintenance station beyond the lake. I am going to try there.

If you see three short amber flashes in the trees, that will be me. Please do not shoot.

Light the fire if you decide to stay.

I would like to know someone made it.

P-04`;

export type PatchCommand='follow'|'stay'|'camp';
/** These are run-owned facts. Editor placements never contain quest progress. */
export type PatchQuestState={
 version:1;noteRead:boolean;discovered:boolean;servoClaimed:boolean;servoInstalled:boolean;
 recruited:boolean;returnedToCamp:boolean;suppliesDelivered:boolean;
 position:Vec;direction:Direction;command:PatchCommand;moving:boolean;walkDistance:number;
 /** Real walked ground preserves a way back through bridges and open gates. */
 followTrail:Vec[];homeTrail:Vec[];
};
export type PatchRepair={worked:number;duration:number;held:boolean;updatedAt:number;origin:Vec;hp:number;hurtUntil:number};
export type PatchInteraction={key:'patch:robot'|'patch:locker';action:'patch';target:'robot'|'locker';label:string;shortLabel:'INSPECT'|'REPAIR'|'PATCH'|'TAKE';disabled:boolean;x:number;y:number};
export type PatchStatus={title:string;line:string;objective:string;canRepair:boolean;canRecruit:boolean;canCommand:boolean;servo:boolean};

// Stay just outside action reach so a following companion does not replace
// the player's tool button. A small step towards him opens conversation.
const BODY=15,INTERACT_REACH=80,FOLLOW_GAP=88,FOLLOW_SETTLE=2,TRAIL_STEP=28;
const point=(p:Vec):Vec=>({x:p.x,y:p.y});
const distance=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y);
type Runtime={path:Vec[];routeAt:number;routeTarget?:Vec;speech?:string;speechUntil:number;homeSample?:Vec;followSample?:Vec};
const runtimes=new WeakMap<World,Runtime>();
function runtime(w:World){let r=runtimes.get(w);if(!r){r={path:[],routeAt:0,speechUntil:0};runtimes.set(w,r)}return r}
function say(w:World,line:string,seconds=3){const r=runtime(w);r.speech=line;r.speechUntil=timeOf(w)+seconds}
export function patchSpeech(w:World){const r=runtimes.get(w);return r&&timeOf(w)<r.speechUntil?r.speech:undefined}
export function patchBeacon(w:World){
 if(w.patchQuest?.servoInstalled)return .25;
 // Three readable pulses, followed by a long pause. Reduced motion is steady.
 if(w.weather?.reducedMotion)return .65;
 const phase=timeOf(w)%5.4;
 return phase<2.7&&phase%.9<.42?.95:.1;
}
function active(w:World){return !w.scene&&!!w.progression&&!!w.layout&&w.phase!=='over'&&w.player.hp>0&&!w.player.downedUntil}
function available(w:World){return active(w)&&!w.bruteGrab&&!w.dodge&&!w.buildingRepair&&!w.fishingSession&&!w.axeSwing&&!w.spearThrust&&!w.swordThrust&&!w.bowShot&&timeOf(w)>=w.attackUntil}
function robotPresent(w:World,state:PatchQuestState){return state.servoInstalled||!!patchQuestSite(w.layout)}
function nearRobot(w:World,state:PatchQuestState){return robotPresent(w,state)&&withinActionReach(w,state.position,INTERACT_REACH)}

/** The paper remains readable even if an owner deliberately removes the site. */
export function ensurePatchQuest(w:World):PatchQuestState|undefined{
 if(w.scene||!w.progression||!w.layout)return;
 const site=patchQuestSite(w.layout);
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
 const state=ensurePatchQuest(w);if(!state)return false;state.noteRead=true;return true;
}
export function inspectPatch(w:World){
 const state=ensurePatchQuest(w);
 if(!state||!available(w)||!nearRobot(w,state)||w.stationPanel&&w.stationPanel!=='patch')return false;
 if(!state.discovered){state.discovered=true;say(w,'Human detected.');}
 w.stationPanel='patch';return true;
}
/** This unique component is a story fact, independent of backpack capacity. */
export function claimPatchServo(w:World){
 const state=ensurePatchQuest(w),site=patchQuestSite(w.layout);
 if(!state||!site||!available(w)||w.stationPanel||state.servoClaimed||!withinActionReach(w,site.locker,INTERACT_REACH))return false;
 state.servoClaimed=true;w.notice='Drive servo secured';w.noticeUntil=timeOf(w)+2.5;return true;
}
export function patchInteraction(w:World):PatchInteraction|null{
 const state=ensurePatchQuest(w);if(!state||!active(w)||w.stationPanel)return null;
 const site=patchQuestSite(w.layout),choices:PatchInteraction[]=[];
 if(nearRobot(w,state)){
  const repair=state.discovered&&state.servoClaimed&&!state.servoInstalled;
  choices.push({key:'patch:robot',action:'patch',target:'robot',...state.position,
   label:repair?'Fit drive servo':state.suppliesDelivered?'Talk to Patch':'Inspect P-04',
   shortLabel:repair?'REPAIR':state.servoInstalled?'PATCH':'INSPECT',disabled:!available(w)});
 }
 if(site&&!state.servoClaimed&&withinActionReach(w,site.locker,INTERACT_REACH))choices.push({key:'patch:locker',action:'patch',target:'locker',...site.locker,label:'Take drive servo',shortLabel:'TAKE',disabled:!available(w)});
 choices.sort((a,b)=>distance(w.player,a)-distance(w.player,b));return choices[0]??null;
}
export function patchStatus(w:World):PatchStatus|null{
 const state=ensurePatchQuest(w);if(!state)return null;
 const title=state.suppliesDelivered?'Patch':'P-04';
 const canRepair=state.discovered&&state.servoClaimed&&!state.servoInstalled;
 const canRecruit=state.servoInstalled&&!state.recruited,canCommand=state.suppliesDelivered;
 const home=homePoint(w),campIdle=state.command==='stay'&&!!home&&distance(state.position,home)<150;
 const line=state.suppliesDelivered?(campIdle?'Shelter occupied.':state.command==='follow'?'With you.':state.command==='camp'?'On my way home.':'I will wait here.'):state.recruited?'I have something for the camp.':state.servoInstalled?'Supplies… still required?':state.servoClaimed?'Replacement servo secured.':'Drive servo damaged.';
 const objective=state.suppliesDelivered?'':state.recruited?'Bring P-04 back to the camp chest.':state.servoInstalled?'Bring him home.':state.servoClaimed?'Hold REPAIR beside P-04.':'A service locker is nearby.';
 return{title,line,objective,canRepair,canRecruit,canCommand,servo:state.servoClaimed&&!state.servoInstalled};
}
export const patchRepairProgress=(w:World)=>w.patchRepair?Math.max(0,Math.min(1,w.patchRepair.worked/w.patchRepair.duration)):0;
export function beginPatchRepair(w:World){
 const state=ensurePatchQuest(w);
 if(!state||!available(w)||w.patchRepair||!state.discovered||!state.servoClaimed||state.servoInstalled||!nearRobot(w,state)||w.player.hurtUntil>timeOf(w)||w.stationPanel&&w.stationPanel!=='patch')return false;
 w.stationPanel=undefined;w.attackQueuedUntil=undefined;
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
  state.servoInstalled=true;state.moving=false;w.patchRepair=undefined;
  say(w,'Supplies… still required?',4);w.notice='Drive restored';w.noticeUntil=timeOf(w)+2.5;
 }
}
export function recruitPatch(w:World){
 const state=ensurePatchQuest(w);
 if(!state||!available(w)||!state.servoInstalled||state.recruited||!nearRobot(w,state)||w.stationPanel&&w.stationPanel!=='patch')return false;
 state.recruited=true;state.command='follow';state.followTrail=[point(w.player)];
 runtime(w).followSample=point(w.player);w.stationPanel=undefined;say(w,'Lead the way.');return true;
}
export function commandPatch(w:World,command:PatchCommand){
 const state=ensurePatchQuest(w);
 if(!state||!available(w)||!state.suppliesDelivered||!nearRobot(w,state)||!['follow','stay','camp'].includes(command)||w.stationPanel&&w.stationPanel!=='patch')return false;
 state.command=command;state.moving=false;state.followTrail=[];
 const r=runtime(w);r.path=[];r.routeAt=0;r.routeTarget=undefined;r.followSample=point(w.player);
 if(command==='follow')state.followTrail.push(point(w.player));
 w.stationPanel=undefined;say(w,command==='follow'?'With you.':command==='stay'?'I will wait here.':'Returning to camp.');return true;
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
function walkTowards(w:World,state:PatchQuestState,target:Vec,speed:number){
 const dx=target.x-state.position.x,dy=target.y-state.position.y,d=Math.hypot(dx,dy);if(d<.001)return;
 const travel=Math.min(speed*STEP,d),before=point(state.position);
 moveBody(w,state.position,dx/d*travel,dy/d*travel,BODY);
 const moved=distance(before,state.position);state.moving=moved>.01;
 if(state.moving){state.direction=facing(state.position.x-before.x,state.position.y-before.y);state.walkDistance=(state.walkDistance+moved)%112}
}
function routeTowards(w:World,state:PatchQuestState,r:Runtime,target:Vec,speed:number){
 if(clearSegment(w,state.position,target)){r.path=[];walkTowards(w,state,target,speed);return}
 const t=timeOf(w);
 if(t>=r.routeAt&&(!r.path.length||!r.routeTarget||distance(r.routeTarget,target)>90)){
  r.path=pathTo(state.position,target,w,4096,29);
  r.routeTarget=point(target);r.routeAt=t+1.3;
 }
 while(r.path.length&&distance(state.position,r.path[0])<12)r.path.shift();
 const next=r.path[0];
 if(next&&clearSegment(w,state.position,next))walkTowards(w,state,next,speed);
 else if(next){r.path=[];r.routeAt=Math.max(r.routeAt,t+.25)}
}
function homePoint(w:World){const chest=campLootChest(w);return chest?{x:chest.x,y:chest.y+78}:undefined}
/** Rewards stay in the original chest, including when the player's bag is full. */
export function deliverPatchSupplies(w:World){
 const state=w.patchQuest,home=homePoint(w);
 if(!state||!state.recruited||state.suppliesDelivered||!home||distance(state.position,home)>80)return false;
 const nav=navigationWorld(w);
 if(!clearSegment(nav,state.position,home))return false;
 const chests=w.lootChests??={};
 if(!chests[LOOT_CHEST_ID])chests[LOOT_CHEST_ID]={openedAt:w.tick,menuShown:true,rewardVersion:2,contents:Object.fromEntries(LOOT_CHEST_REWARDS.map(reward=>[reward.kind,reward.amount]))};
 const contents=lootChestContents(w,LOOT_CHEST_ID);
 contents.pallets=(contents.pallets??0)+2;contents.scrap=(contents.scrap??0)+2;
 state.returnedToCamp=true;state.suppliesDelivered=true;state.command='stay';state.moving=false;
 state.followTrail=[];state.homeTrail=[point(state.position)];
 const r=runtime(w);r.path=[];r.homeSample=point(state.position);
 say(w,'Shelter occupied.',4.5);w.notice='Patch joined the camp';w.noticeUntil=timeOf(w)+3;
 return true;
}
/** One actor, bounded route queries, swept collision and no teleport recovery. */
export function stepPatchQuest(w:World,input:Vec={x:0,y:0}){
 const state=ensurePatchQuest(w);if(!state)return;
 state.moving=false;
 if(!active(w)){cancelPatchRepair(w);return}
 stepRepair(w,input);
 // Conversation pauses motion without overwriting the selected command.
 // Otherwise Return to camp can walk the actor out of its own menu's reach.
 if(!state.servoInstalled||!state.recruited||state.command==='stay'||w.stationPanel==='patch')return;
 const nav=navigationWorld(w),r=runtime(w);
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
   routeTowards(nav,state,r,target,speed);
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
 if(!savedPoint(value.position)||!['down','right','up','left','down-right','down-left','up-right','up-left'].includes(String(value.direction))||!['follow','stay','camp'].includes(String(value.command))||!finite(value.walkDistance,0,112))return false;
 if(!Array.isArray(value.followTrail)||value.followTrail.length>512||!value.followTrail.every(savedPoint)||!Array.isArray(value.homeTrail)||value.homeTrail.length>1024||!value.homeTrail.every(savedPoint))return false;
 if(value.servoInstalled&&(!value.servoClaimed||!value.discovered)||value.recruited&&!value.servoInstalled||value.returnedToCamp&&!value.recruited||value.suppliesDelivered&&!value.returnedToCamp)return false;
 if(!value.recruited&&value.command!=='stay'||value.command==='camp'&&!value.suppliesDelivered)return false;
 return true;
}
/** Restore facts and real route history, never a held repair or stale speech. */
export function restorePatchQuest(w:World){
 w.patchRepair=undefined;runtimes.delete(w);
 if(w.patchQuest)w.patchQuest.moving=false;
 return ensurePatchQuest(w);
}

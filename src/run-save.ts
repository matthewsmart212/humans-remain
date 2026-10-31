import {grantStarterPickaxe} from './player-gear';
import {grantStarterRepairHammer} from './repair-hammer';
import {validRestorationSave} from './camp-restoration';
import {validBlueprintSave} from './headquarters-plans';
import {campAccessLevel,validCampLevelSave} from './camp-levels';
import {validJournalSave} from './headquarters-journal';
import type {World} from './survival-engine';
import type {SceneTravel,TravelSnapshot} from './scene-travel';
import {SCENES,CAMP_SCENE_ID} from './world-scenes';
import {resetHound} from './hound-ai';
import {addApprovedCampGarden} from './camp-garden-placement';
import {GARDEN_PLACEMENT_ID} from './camp-garden-art';
import {placementBodies} from './world-layout';
import {hitCollider} from './camp-collision';

export const RUN_SAVE_KEY='safety-last-expedition-v1';
const MAX_SAVE_BYTES=12_000_000;
const OMIT=new Set(['scene','outdoorReady','foliageMotions','puddleMotion','stepOnMotions','effects','combatStats','stationPanel','repairHammerUntil','buildingRepair','buildingHits','fieldKitTarget','fieldKitBuildingFocus','repairCheckpoint','furnaceId','smithyId','attackQueuedUntil','axeSwing','spearThrust','swordThrust','bowShot','bowLock','bruteGrab','dodge']);
export function encodeRun(travel:SceneTravel):string|null{
 if(travel.busy||!travel.current.progression)return null;
 const snapshot=travel.capture();
 return JSON.stringify({version:1,savedAt:new Date().toISOString(),...snapshot},(key,value)=>OMIT.has(key)?undefined:value instanceof Set?{$set:[...value]}:value);
}
function validateNumbers(value:unknown,depth=0):boolean{if(depth>35)return false;if(typeof value==='number')return Number.isFinite(value);if(Array.isArray(value))return value.length<15000&&value.every(v=>validateNumbers(v,depth+1));if(value&&typeof value==='object')return Object.entries(value).every(([k,v])=>!['__proto__','constructor','prototype'].includes(k)&&validateNumbers(v,depth+1));return true}
const point=(p:any)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const counters=(p:any)=>p&&typeof p==='object'&&!Array.isArray(p)&&Object.values(p).every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0);
export function decodeRun(text:string):TravelSnapshot{
 if(text.length>MAX_SAVE_BYTES)throw Error('The saved expedition is too large to open.');
 let data:any;try{data=JSON.parse(text)}catch{throw Error('The saved expedition could not be read.')}
 if(data?.version!==1||!Array.isArray(data.worlds)||data.worlds.length<1||data.worlds.length>12||!Array.isArray(data.route)||data.route.length>12||!validateNumbers(data))throw Error('The saved expedition is not a supported version.');
 const ids=new Set<string>();
 for(const pair of data.worlds){
  if(!Array.isArray(pair)||pair.length!==2)throw Error('The saved world is incomplete.');
  const [id,w]=pair as [string,World];
  if(typeof id!=='string'||ids.has(id)||id!==CAMP_SCENE_ID&&!SCENES.has(id)||!w?.layout||!Array.isArray(w.layout.items)||!w.player||!Number.isFinite(w.player.x)||!Number.isFinite(w.player.y)||!Number.isFinite(w.player.hp)||!Number.isSafeInteger(w.tick)||w.tick<0||!Array.isArray(w.enemies)||!Array.isArray(w.animals)||!Array.isArray(w.loot)||!w.bag||!w.stock||!w.camp||!w.fire||!['day','night','over'].includes(w.phase))throw Error('The saved world is incomplete.');
  if(w.progression&&!validRestorationSave(w.progression))throw Error('The saved building repairs are incomplete.');
  if(w.progression&&!validBlueprintSave(w.progression.blueprints))throw Error('The saved blueprints are incomplete.');
  if(w.progression&&!validJournalSave(w.progression))throw Error('The saved journal is incomplete.');
  if(w.progression){if(!validCampLevelSave(w.progression.campLevel))throw Error('The saved camp level is unsupported.');w.progression.campLevel=campAccessLevel(w);grantStarterRepairHammer(w);grantStarterPickaxe(w);}
  ids.add(id);const set=(w.minedRockColliders as unknown as {$set?:unknown})?.$set;
  if(![w.player.stamina,w.player.hurtUntil,w.hunger,w.thirst,w.phaseLeft,w.round,w.survived,w.serial].every(Number.isFinite)||!w.cycle||!Number.isInteger(w.cycle.pattern)||w.cycle.pattern<0||w.cycle.pattern>5||!counters(w.bag)||!counters(w.stock)||!counters(w.gear?.bag)||!counters(w.gear?.chest)||!w.camp.hearth||!Number.isFinite(w.camp.hearth.fuel)||w.fire.queue!==undefined&&!Array.isArray(w.fire.queue)||w.fire.rack!==undefined&&!Array.isArray(w.fire.rack)||w.enemies.some(e=>!point(e)||!Number.isFinite(e.hp)||!Array.isArray(e.path))||w.loot.some(l=>!point(l)||!Number.isFinite(l.amount)))throw Error('The saved expedition contains incomplete game data.');
  w.minedRockColliders=new Set(Array.isArray(set)?set.filter((v):v is string=>typeof v==='string'):[]);
  w.fire.queue??=[];w.fire.rack??=[];w.effects=[];w.buildingRepair=undefined;w.buildingHits=undefined;w.repairCheckpoint=undefined;w.stationPanel=undefined;w.attackUntil=0;w.attackQueuedUntil=undefined;w.axeSwing=undefined;w.spearThrust=undefined;w.swordThrust=undefined;w.bowShot=undefined;w.dodge=undefined;w.bruteGrab=undefined;
  w.player.moving=false;w.player.sprinting=false;w.player.hurtUntil=Math.max(w.player.hurtUntil,w.tick/60+1);
  for(const e of w.enemies){resetHound(w,e);e.path=[];e.repathAt=w.tick/60+.3;e.attackAt=w.tick/60+1;if(e.motion){e.motion.phase='recover';e.motion.since=w.tick/60;e.motion.resolved=true}if(e.brute){e.brute.phase='stalk';e.brute.since=w.tick/60;e.brute.hook=undefined;e.brute.jump=undefined;e.brute.recovery=undefined;e.brute.meleeAt=w.tick/60+1}}
  w.scene=id===CAMP_SCENE_ID?undefined:SCENES.get(id);
  if(id===CAMP_SCENE_ID){
   const next=addApprovedCampGarden(w.layout),garden=next.items.find(p=>p.id===GARDEN_PLACEMENT_ID);
   // A returning player standing on the new lot keeps their position. Add it on
   // a later load once clear rather than trapping or teleporting the player.
   if(!garden||!placementBodies(garden).some(c=>hitCollider(c,w.player.x,w.player.y,19)))w.layout=next;
  }
 }
 if(!ids.has(CAMP_SCENE_ID)||!ids.has(data.currentId)||data.route.some((r:any)=>!ids.has(r?.sceneId)||!r.spawn||!Number.isFinite(r.spawn.x)||!Number.isFinite(r.spawn.y)))throw Error('The expedition return route is missing.');
 const active=data.worlds.find(([id]:[string])=>id===data.currentId)[1] as World,p=active.progression;
 if(!p||p.version!==1||!point(p.camp)||!point(p.cache)||!p.siege||![p.hqHp,p.hqMax,p.defence,p.defenceMax,p.siege.spawned,p.siege.nextAt,p.siege.night,p.siege.ended].every(n=>Number.isFinite(n)&&n>=0)||p.hqMax<=0||p.defenceMax<=0||p.hqHp>p.hqMax||p.defence>p.defenceMax||![p.briefed,p.repairPart,p.furnaceRestored,p.metalCrafted,p.fortified,p.completed].every(v=>typeof v==='boolean'))throw Error('The saved expedition progress is incomplete.');
 return{currentId:data.currentId,worlds:data.worlds,route:data.route};
}
/** Async adapters serialize writes; an older autosave can never overtake a new run. */
export class RunSaveWriter{
 private pending:Promise<void>=Promise.resolve();
 error='';
 constructor(private write:(key:string,value:string)=>Promise<unknown>){}
 save(text:string){this.pending=this.pending.catch(()=>{}).then(async()=>{try{await this.write(RUN_SAVE_KEY,text);this.error=''}catch{this.error='Progress could not be saved on this device.'}});return this.pending}
 flush(){return this.pending}
}

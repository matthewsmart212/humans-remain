import {placeCampWorksites} from './camp-worksites-placement';
import {expandHeadquartersSpace} from './headquarters-space';
import {refineCampVegetation} from './camp-vegetation';
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
import {placementBodies,layoutBlocked,type WorldLayout} from './world-layout';
import {placeSouthFacingHeadquarters} from './headquarters-south-placement';
import {fitHeadquartersInterior,headquartersRefitReturnPoint} from './headquarters-interior';
import {hitCollider} from './camp-collision';
import {addApprovedCampPerimeter} from './camp-perimeter';
import {requiredImages} from './world-assets';

export const RUN_SAVE_KEY='safety-last-expedition-v1';
/** Saved camps may retain older or owner-edited assets. Prepare their own
 * images even when the active save is inside another scene. */
export async function prepareSavedCampArtwork(snapshot:TravelSnapshot,load:(sources:Record<string,string>)=>Promise<unknown>){
 const camp=snapshot.worlds.find(([id])=>id===CAMP_SCENE_ID)?.[1];
 if(camp?.layout)await load(requiredImages(camp.layout.items.map(p=>p.assetId),camp.layout.terrainImage));
}
const MAX_SAVE_BYTES=12_000_000;
const OMIT=new Set(['scene','outdoorReady','foliageMotions','puddleMotion','stepOnMotions','effects','combatStats','stationPanel','repairHammerUntil','buildingRepair','buildingHits','fieldKitTarget','fieldKitBuildingFocus','repairCheckpoint','furnaceId','smithyId','attackQueuedUntil','axeSwing','spearThrust','swordThrust','bowShot','bowLock','bruteGrab','dodge']);
/** Shared with the native compact store so both formats retain identical state. */
export function runSaveValue(key:string,value:unknown):unknown{return OMIT.has(key)?undefined:value instanceof Set?{$set:[...value]}:value}
export function encodeRun(travel:SceneTravel):string|null{
 if(travel.busy||!travel.current.progression)return null;
 const snapshot=travel.capture();
 return JSON.stringify({version:1,savedAt:new Date().toISOString(),...snapshot},runSaveValue);
}
function validateNumbers(value:unknown,depth=0):boolean{if(depth>35)return false;if(typeof value==='number')return Number.isFinite(value);if(Array.isArray(value))return value.length<15000&&value.every(v=>validateNumbers(v,depth+1));if(value&&typeof value==='object')return Object.entries(value).every(([k,v])=>!['__proto__','constructor','prototype'].includes(k)&&validateNumbers(v,depth+1));return true}
const point=(p:any)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const counters=(p:any)=>p&&typeof p==='object'&&!Array.isArray(p)&&Object.values(p).every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0);
type SavedPoint={x:number;y:number};
function nearbyClearGround(layout:WorldLayout,from:SavedPoint):SavedPoint|undefined{
 if(!layoutBlocked(layout,from.x,from.y,19))return from;
 // Search nearest rings first. A boundary update only nudges an occupied
 // landing to nearby clear ground; it never resets the run to camp spawn.
 for(let radius=6;radius<=480;radius+=6){
  const count=Math.max(16,Math.min(192,Math.ceil(2*Math.PI*radius/6)));
  for(let i=0;i<count;i++){
   const angle=i*Math.PI*2/count,position={x:from.x+Math.cos(angle)*radius,y:from.y+Math.sin(angle)*radius};
   if(!layoutBlocked(layout,position.x,position.y,19))return position;
  }
 }
}
/** Continued expeditions own their own layout snapshots. Upgrade only their
 * perimeter, retaining all run state and safe camp return points. */
export function migrateSavedCampPerimeter(w:World,route:{sceneId:string;spawn:SavedPoint}[]){
 if(!w.layout)return false;
 const next=placeCampWorksites(expandHeadquartersSpace(fitHeadquartersInterior(placeSouthFacingHeadquarters(addApprovedCampPerimeter(w.layout)))));if(next===w.layout)return false;
 const previous=new Map(w.layout.items.map(p=>[p.id,p]));
 const added=next.items.filter(p=>{
  const old=previous.get(p.id);
  return p.assetId.startsWith('camp_circular_wall_')||!old||old.x!==p.x||old.y!==p.y||old.scale!==p.scale||JSON.stringify(old.collision)!==JSON.stringify(p.collision);
 }).flatMap(p=>placementBodies(p));
 const occupied=(p:SavedPoint)=>added.some(c=>hitCollider(c,p.x,p.y,19));
 const points=[w.player,next.spawn,...route.filter(r=>r?.sceneId===CAMP_SCENE_ID&&point(r.spawn)).map(r=>r.spawn)];
 const moves:{target:SavedPoint;position:SavedPoint}[]=[];
 for(const target of points){
  const refit=headquartersRefitReturnPoint(w.layout,next,target);
  if(!refit&&!occupied(target))continue;
  const position=nearbyClearGround(next,refit||target);
  // An unusually obstructed custom landing keeps the old snapshot until a
  // later load. Never trap the survivor or discard progress to force an edit.
  if(!position)return false;
  moves.push({target,position});
 }
 // The migration returns a new layout but may share its spawn object. Keep
 // the previous snapshot immutable when a spawn adjustment is necessary.
 const spawn=moves.find(move=>move.target===next.spawn)?.position;
 w.layout=spawn?{...next,spawn:{...spawn}}:next;
 for(const move of moves)if(move.target!==next.spawn)Object.assign(move.target,move.position);
 return true;
}
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
   migrateSavedCampPerimeter(w,data.route);
   const next=addApprovedCampGarden(w.layout),garden=next.items.find(p=>p.id===GARDEN_PLACEMENT_ID);
   // A returning player standing on the new lot keeps their position. Add it on
   // a later load once clear rather than trapping or teleporting the player.
   if(!garden||!placementBodies(garden).some(c=>hitCollider(c,w.player.x,w.player.y,19)))w.layout=next;
   w.layout=refineCampVegetation(w.layout);
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

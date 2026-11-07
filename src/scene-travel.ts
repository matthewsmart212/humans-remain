import {cancelBuildingRepair} from './building-repair';
import {setCampThreatSource} from './camp-hud';
import {stepCampSiege} from './camp-siege';
import {stepBonfireCooking} from './survival-engine';
import {resetHound} from './hound-ai';
import {releaseBruteGrab} from './brute-control';
import {createWorld,worldBlocked,timeOf,type World} from './survival-engine';
import {emptyLayout} from './world-layout';
import {ASSET_BY_ID} from './world-assets';
import {CAMP_SCENE_ID,SCENES,sceneId,sceneName,scenePortals} from './world-scenes';
import {inSceneArea} from './scene-collision';
import type {SceneDefinition,ScenePortal,SceneSpawn} from './scene-model';
import type {SceneResources} from './scene-resources';

const FADE_SECONDS=.18;
export type ReturnRoute={sceneId:string;spawn:SceneSpawn};
type Trip={portal:ScenePortal;sceneId:string;spawn:SceneSpawn;returning:boolean};
type Phase='idle'|'loading'|'out'|'in';
export type TravelSnapshot={currentId:string;worlds:[string,World][];route:ReturnRoute[]};
const SHARED_RUN_KEYS=['survivorRole','progression','cause','ironworks','gear','cycle','kit','combatTest','survivalEnabled','survival','weather','nightAmount','tick','phase','round','phaseLeft','survived','bag','loads','stock','tools','torchOn','hunger','thirst','cooked','cookedRabbit','cookedVenison','needsDamageAt','drinkReady','kills','scrap','revives','attackReady'] as const;
function shareRun(from:World,to:World){for(const key of SHARED_RUN_KEYS)(to as any)[key]=from[key]}

/** A session keeps each map's local world, while player/run data travels with you.
 * No DOM, image decoding, HTTP or saved-draft mutations happen in tick(). */
export class SceneTravel{
 current:World;
 opacity=0;
 phase:Phase='idle';
 error='';
 private worlds=new Map<string,World>();
 private route:ReturnRoute[]=[];
 private trip?:Trip;
 private elapsed=0;
 private cooldown=0;
 private suppressed=new Set<string>();
 private epoch=0;
 private disposed=false;
 constructor(world:World,private resources:SceneResources,private changed:(world:World)=>void=()=>{},private status:(message:string)=>void=()=>{},private scenes:ReadonlyMap<string,SceneDefinition>=SCENES){
  this.current=world;this.worlds.set(sceneId(world),world);this.prefetch();
 }
 get busy(){return this.phase!=='idle'}
 private prefetch(){
  const currentId=sceneId(this.current),back=this.route.at(-1)?.sceneId;
  this.resources.pin([currentId,...(back?[back]:[])]);
  const next=scenePortals(this.current).find(p=>'sceneId' in p.destination&&this.scenes.has(p.destination.sceneId));
  if(next&&'sceneId' in next.destination)void this.resources.prepare(next.destination.sceneId).catch(()=>{});
 }
 private destination(portal:ScenePortal):Trip{
  if('return' in portal.destination){const back=this.route.at(-1);if(!back)throw Error('No return route is available.');return{portal,sceneId:back.sceneId,spawn:back.spawn,returning:true}}
  const scene=this.scenes.get(portal.destination.sceneId),spawn=scene?.spawns[portal.destination.spawnId];
  if(!scene||!spawn)throw Error('This map entrance has not been configured.');
  return{portal,sceneId:scene.id,spawn,returning:false};
 }
 private request(portal:ScenePortal){
  try{
   this.trip=this.destination(portal);this.error='';
   this.resources.pin([sceneId(this.current),this.trip.sceneId]);
   if(this.resources.ready(this.trip.sceneId)){this.phase='out';this.elapsed=0;return}
   const token=++this.epoch;this.phase='loading';this.status('Preparing '+(this.scenes.get(this.trip.sceneId)?.name||'camp')+'…');
   void this.resources.prepare(this.trip.sceneId).then(()=>{if(this.disposed||token!==this.epoch)return;this.phase='out';this.elapsed=0;this.status('')}).catch(e=>{if(!this.disposed&&token===this.epoch)this.fail(e)});
  }catch(e){this.suppressed.add(portal.id);this.fail(e)}
 }
 private fail(error:unknown){
  if(this.trip)this.suppressed.add(this.trip.portal.id);
  this.error=error instanceof Error?error.message:'The next map could not load. Please retry.';
  this.status(this.error);this.trip=undefined;this.phase=this.opacity>0?'in':'idle';this.elapsed=0;
 }
 retry(){this.error='';this.status('');this.suppressed.clear()}
 private worldFor(id:string,spawn:SceneSpawn){
  const existing=this.worlds.get(id);if(existing)return existing;
  const scene=this.scenes.get(id);if(!scene)throw Error('The destination map is unavailable.');
  const layout=scene.layout?JSON.parse(JSON.stringify(scene.layout)):{...emptyLayout(),name:scene.name,spawn:{x:spawn.x,y:spawn.y}};
  const world=createWorld(layout);world.scene=scene;world.editorPreview=true;world.notice='';world.noticeUntil=0;
  this.worlds.set(id,world);return world;
 }
 private safeArrival(world:World,desired:SceneSpawn):SceneSpawn{
  if(!worldBlocked(world,desired.x,desired.y,19))return desired;
  // An owner may have moved a prop over an entrance while a map was inactive.
  for(let radius=24;radius<=120;radius+=24)for(let i=0;i<16;i++){
   const point={...desired,x:desired.x+Math.cos(i*Math.PI/8)*radius,y:desired.y+Math.sin(i*Math.PI/8)*radius};
   if(!worldBlocked(world,point.x,point.y,19))return point;
  }
  throw Error('The destination entrance is blocked. Clear the landing before travelling.');
 }
 private transfer(next:World,spawn:SceneSpawn){
  const from=this.current;cancelBuildingRepair(from,false);cancelBuildingRepair(next,false);releaseBruteGrab(from);releaseBruteGrab(next);
  // Local entities, doors, drops, cooking and collision stay on their own map.
  shareRun(from,next);
  next.player={...from.player,...spawn,moving:false,sprinting:false,walkBlend:0,runBlend:0};
  next.furnaceId=undefined;next.smithyId=undefined;next.stationPanel=undefined;next.axeSwing=undefined;next.spearThrust=undefined;next.swordThrust=undefined;next.attackUntil=0;next.attackQueuedUntil=undefined;next.dodge=undefined;next.dodgeReady=from.dodgeReady;next.combatStats=from.combatStats;
  // An inactive map must not resume a half-finished strike at the doorway.
  // New attacks always get a fresh, visible wind-up after the arrival fade.
  for(const enemy of next.enemies){resetHound(next,enemy);if(enemy.brute){enemy.brute.phase='stalk';enemy.brute.since=timeOf(next);enemy.brute.hook=undefined;enemy.brute.jump=undefined;enemy.brute.meleeAt=timeOf(next)+.75;enemy.brute.sample=undefined;enemy.brute.velocity=undefined;enemy.brute.recovery=undefined}enemy.path=[];enemy.repathAt=timeOf(next)+.3;enemy.attackAt=Math.max(enemy.attackAt,timeOf(next)+.75);if(enemy.motion){enemy.motion.phase='recover';enemy.motion.since=timeOf(next);enemy.motion.resolved=true}}
  next.effects=next.effects.filter(e=>!e.type.startsWith('hound-'));
  for(const animal of next.animals){const m=animal.predator;if(!m||animal.hp<=0)continue;m.engaged=false;m.state='return';m.since=timeOf(next);m.readyAt=timeOf(next)+.75;m.contactAt=undefined;m.wolf=undefined;m.boar=undefined;m.hitAt=undefined;m.reactedHitAt=undefined;animal.moving=false}
  this.current=next;this.cooldown=.75;
  const camp=this.worlds.get(CAMP_SCENE_ID);if(camp)setCampThreatSource(next,camp);
  this.suppressed=new Set(scenePortals(next).map(p=>p.id));
  this.changed(next);
 }
 tick(seconds:number,enabled=true){
  if(this.disposed)return;
  const dt=Math.min(.1,Math.max(0,seconds));this.cooldown=Math.max(0,this.cooldown-dt);
  if(this.phase==='loading')return;
  if(this.phase==='out'){
   this.elapsed+=dt;this.opacity=Math.min(1,this.elapsed/FADE_SECONDS);
   if(this.opacity<1)return;
   try{
    const trip=this.trip!,next=this.worldFor(trip.sceneId,trip.spawn),spawn=this.safeArrival(next,trip.spawn);
    if(trip.returning)this.route.pop();else this.route.push({sceneId:sceneId(this.current),spawn:trip.portal.returnSpawn});
    this.transfer(next,spawn);this.trip=undefined;this.phase='in';this.elapsed=0;this.prefetch();
   }catch(e){this.fail(e)}
   return;
  }
  if(this.phase==='in'){this.elapsed+=dt;this.opacity=Math.max(0,1-this.elapsed/FADE_SECONDS);if(this.opacity===0){this.phase='idle';this.elapsed=0}return}
  if(!enabled)return;
  if(this.current.scene&&this.current.progression){
   const home=this.worlds.get(CAMP_SCENE_ID);
   if(home){shareRun(this.current,home);stepCampSiege(home,true);stepBonfireCooking(home);if(home.phase==='over'){this.current.phase='over';this.current.cause=home.cause}}
  }
  const w=this.current,portals=scenePortals(w);
  for(const portal of portals){
   const inside=inSceneArea(portal.area,w.player.x,w.player.y);
   if(!inside){if(this.cooldown===0)this.suppressed.delete(portal.id);continue}
   if(this.cooldown>0||this.suppressed.has(portal.id))continue;
   if(portal.animationPlacementId){
    const p=w.layout?.items.find(p=>p.id===portal.animationPlacementId),asset=p&&ASSET_BY_ID.get(p.assetId);
    if(asset?.animationMode==='step-on'&&asset.frames?.length&&(w.stepOnMotions?.[p!.id]?.position||0)<asset.frames.length-1)continue;
   }
   this.request(portal);break;
  }
 }
 capture():TravelSnapshot{
  return{currentId:sceneId(this.current),worlds:[...this.worlds].map(([id,w])=>{const copy={...w};shareRun(this.current,copy);return[id,copy]}),route:this.route.map(r=>({...r,spawn:{...r.spawn}}))};
 }
 async restore(snapshot:TravelSnapshot){
  this.phase='loading';
  try{if(snapshot.currentId!==CAMP_SCENE_ID)await this.resources.prepare(snapshot.currentId)}catch(e){this.phase='idle';throw e}
  if(this.disposed)return;
  this.worlds=new Map(snapshot.worlds);this.route=snapshot.route;this.current=this.worlds.get(snapshot.currentId)!;
  const camp=this.worlds.get(CAMP_SCENE_ID);
  for(const w of this.worlds.values()){shareRun(this.current,w);if(camp)setCampThreatSource(w,camp)}
  this.phase='idle';this.opacity=0;this.trip=undefined;this.elapsed=0;this.cooldown=.75;
  this.suppressed=new Set(scenePortals(this.current).map(p=>p.id));this.changed(this.current);this.prefetch();
 }
 /** Build always edits the authored camp; never serialise an interior into its draft. */
 returnToCamp(){
  this.epoch++;this.trip=undefined;this.phase='idle';this.opacity=0;this.elapsed=0;this.error='';this.status('');
  const home=this.worlds.get(CAMP_SCENE_ID);
  if(home&&this.current!==home){
   const back=this.route.find(r=>r.sceneId===CAMP_SCENE_ID),fallback:SceneSpawn={...home.layout!.spawn,direction:'down'};
   let spawn=fallback;try{spawn=this.safeArrival(home,back?.spawn||fallback)}catch{/* Build must stay accessible even if an owner blocks the entrance. */}
   this.transfer(home,spawn);
  }
  this.route=[];this.prefetch();return this.current;
 }
 dispose(){this.disposed=true;this.epoch++;this.trip=undefined;this.worlds.clear();this.route=[]}
 get location(){return sceneName(this.current)}
}

import type {World} from './survival-engine';
import {requiredImages} from './world-assets';
import {wavePlan} from './camp-siege';
import {spawnImages,type SpawnKind} from './play-spawns';
import {RUNNER_AXE_IMAGE_SOURCES} from './runner-axe-art';
import {RUNNER_CYCLE_SOURCES} from './runner-cycles';
import {ENGINEER_IMAGE_SOURCES} from './engineer-sprites';
import {HUNTER_IMAGE_SOURCES} from './hunter-sprites';
import {BOW_IMAGES} from './bow-art';
import {SWORD_IMAGES} from './swords';
import {SPEAR_IMAGES} from './spears';
import {KNIFE_IMAGES} from './knives';
import {MINING_IMAGES} from './pickaxes';
import {REPAIR_HAMMER_IMAGES} from './repair-hammer';
import {FURNACE_FIRE_IMAGES} from './ironworks-data';
import {furnaceWorking} from './camp-furnace';
import {PROVISION_IMAGES} from './food-provisions-art';
import {BONFIRE_FOOD_IMAGES} from './bonfire-food-art';
import {RABBIT_FOOD_IMAGES,VENISON_FOOD_IMAGES} from './food-items';

/** Small, shared player/food set. Other animation families have a live owner. */
export const PLAYER_MOVEMENT_IMAGES:Record<string,string>={...RUNNER_CYCLE_SOURCES,...ENGINEER_IMAGE_SOURCES,...REPAIR_HAMMER_IMAGES,...PROVISION_IMAGES,...BONFIRE_FOOD_IMAGES,...RABBIT_FOOD_IMAGES,...VENISON_FOOD_IMAGES,stone:MINING_IMAGES.stone,torch:'/survival/equipment/torch-v1.png',bagScrap:'/survival/ui-backpack-v1/scrap.png',bagFuel:'/survival/ui-backpack-v1/fuel.png'};
const equipment:Record<string,string>={...MINING_IMAGES,...KNIFE_IMAGES,...SWORD_IMAGES,...SPEAR_IMAGES};
/** Prefetch carried tools and nearby creatures, preserving the original art. */
export function gameplayImageSources(w:World):Record<string,string>{
 const out:Record<string,string>={},gear=new Set(Object.entries(w.gear?.bag??{}).filter(([,count])=>!!count).map(([id])=>id));
 if(w.survivorRole==='hunter')Object.assign(out,HUNTER_IMAGE_SOURCES);
 if(w.player.equipped)gear.add(w.player.equipped);
 for(const drop of w.loot)gear.add(drop.kind);
 for(const id of gear){
  if(equipment[id])out[id]=equipment[id];
  if(id==='bow')Object.assign(out,BOW_IMAGES);
  if(id==='woodenAxe'||id==='axe')Object.assign(out,Object.fromEntries(Object.entries(RUNNER_AXE_IMAGE_SOURCES).filter(([key])=>key.startsWith(id==='axe'?'runnerAxe-':'runnerWoodenAxe-'))));
 }
 if(w.bowArrows?.length)Object.assign(out,BOW_IMAGES);
 const kinds=new Set<SpawnKind>();
 // Load the approaching wave before it spawns, never every future night.
 if(w.progression&&!w.scene&&w.phase!=='over')for(const kind of wavePlan(w.round))kinds.add(kind as SpawnKind);
 for(const e of w.enemies)if(e.kind)kinds.add(e.kind as SpawnKind);
 for(const effect of w.effects)if(effect.enemyKind)kinds.add(effect.enemyKind as SpawnKind);
 for(const a of w.animals){
  if(Math.hypot(a.x-w.player.x,a.y-w.player.y)>2200)continue;
  const kind=a.chicken?'chicken':a.rabbit?'rabbit':a.deer?.kind??a.predator?.kind;
  if(kind)kinds.add(kind);
 }
 for(const kind of kinds)Object.assign(out,spawnImages(kind));
 if(w.stationPanel==='furnace'||Object.values(w.ironworks?.stations??{}).some(furnaceWorking))Object.assign(out,FURNACE_FIRE_IMAGES);
 return out;
}

/** Stream placed camp art close to the player instead of requiring every
 * distant image before Play. Keep a broad lookahead for sprinting and iOS-like
 * landscape camera framing. The current world layout is not changed.
 */
export function nearbyPlacedArtwork(w:World,animationFrames=false):Record<string,string>{
 const layout=w.layout;
 if(!layout||w.scene)return {};
 const {x,y}=w.player;
 const ids=layout.items.filter(p=>Math.abs(p.x-x)<1650&&Math.abs(p.y-y)<1650).map(p=>p.assetId);
 return requiredImages(ids,layout.terrainImage,{animationFrames});
}

/** Retire unused families; late loads never resurrect abandoned artwork. */
export class GameplayArtwork{
 private wanted:Record<string,string>={};
 private resident=new Set<string>();
 private touched=new Map<string,number>();
 private pending=new Map<string,Promise<void>>();
 private failedUntil=new Map<string,number>();
 private closed=false;
 constructor(private load:(sources:Record<string,string>)=>Promise<void>,private release:(keys:string[])=>void,private pinned:ReadonlySet<string>=new Set(),private graceMs=8000){}
 update(sources:Record<string,string>,now=performance.now(),retry=false){
  if(this.closed)return Promise.resolve();
  this.wanted=Object.fromEntries(Object.entries(sources).filter(([key])=>!this.pinned.has(key)));
  for(const key of Object.keys(this.wanted))this.touched.set(key,now);
  const retired=[...this.resident].filter(key=>!(key in this.wanted)&&now-(this.touched.get(key)??0)>=this.graceMs);
  if(retired.length){for(const key of retired){this.resident.delete(key);this.touched.delete(key)}this.release(retired)}
  const jobs=Object.entries(this.wanted).map(([key,url])=>{
   if(this.resident.has(key))return Promise.resolve();
   const pending=this.pending.get(key);if(pending)return pending;
   if(!retry&&(this.failedUntil.get(key)??0)>now)return Promise.resolve();
   const task=this.load({[key]:url}).then(()=>{
    this.failedUntil.delete(key);
    if(this.closed||!(key in this.wanted)){this.release([key]);this.touched.delete(key)}else this.resident.add(key);
   }).catch(error=>{this.failedUntil.set(key,performance.now()+5000);throw error}).finally(()=>this.pending.delete(key));
   this.pending.set(key,task);return task;
  });
  for(const key of this.failedUntil.keys())if(!(key in this.wanted))this.failedUntil.delete(key);
  return Promise.all(jobs).then(()=>{});
 }
 clear(){this.wanted={};this.release([...this.resident]);this.resident.clear();this.touched.clear();this.failedUntil.clear()}
 stats(){return{resident:this.resident.size,pending:this.pending.size,wanted:Object.keys(this.wanted).length}}
 dispose(){if(this.closed)return;this.closed=true;this.clear()}
}

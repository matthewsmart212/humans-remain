import {placementUseFace} from './placement-contact';
import {BED_CENTRES,GARDEN_GATE_CENTRE} from './camp-garden-art';
import {buildingRestored,campBuildingPlacements} from './camp-restoration';
import {addInventory,canCarryCount,itemCount,takeInventory} from './expedition-inventory';
import {placementArtPoint,type Placement} from './world-layout';
import {timeOf,withinActionReach,type World} from './survival-engine';
export const POTATO_YIELD=4,POTATO_GROW_SECONDS=240;
export type CropKind='potato'|'carrot';
export type GardenCrop={kind:CropKind;plantedAt:number};
export type PotatoPatchState={tier:1;plantedAt:number[];beds?:(GardenCrop|null)[];harvestedAt?:number};
const checkedPatches=new WeakSet<object>();
export const isGardenCrop=(kind:unknown):kind is CropKind=>kind==='potato'||kind==='carrot';
/** Migrate old potato-only saves once. Null slots preserve the other beds on harvest. */
export const potatoPatch=(w:World):PotatoPatchState=>{
 const s=w.potatoPatch??={tier:1 as const,plantedAt:[]};
 if(!checkedPatches.has(s)){
  s.tier=1;
  const old=Array.isArray(s.plantedAt)?s.plantedAt.filter(v=>Number.isFinite(v)&&v>=0).slice(0,4):[];
  s.beds=Array.from({length:4},(_,i)=>{
   if(!Array.isArray(s.beds))return old[i]===undefined?null:{kind:'potato',plantedAt:old[i]};
   const c=s.beds[i];return c&&isGardenCrop(c.kind)&&Number.isFinite(c.plantedAt)&&c.plantedAt>=0?{kind:c.kind,plantedAt:c.plantedAt}:null;
  });
  s.plantedAt=s.beds.flatMap(c=>c?[c.plantedAt]:[]);
  checkedPatches.add(s);
 }
 return s;
};
export const gardenBeds=(w:World)=>potatoPatch(w).beds!;
export const potatoSlots=(_w:World)=>4;
export function gardenLocation(w:World){
 if(w.scene)return null;
 const placement=campBuildingPlacements(w.layout).find(site=>site.id==='garden')?.placement;
 return placement?{placement,...placementArtPoint(placement,...GARDEN_GATE_CENTRE)}:null;
}
export function gardenBedPoint(placement:Placement,bed:number){
 const [u,v]=BED_CENTRES[bed];
 return placementArtPoint(placement,u,v);
}
export function nearPotatoPatch(w:World){
 const garden=gardenLocation(w);
 if(!garden)return null;
 let nearest:{placement:Placement;bed:number;x:number;y:number}|null=null,best=Infinity;
 for(let bed=0;bed<BED_CENTRES.length;bed++){
  const [u,v]=BED_CENTRES[bed];
  const point=placementUseFace(garden.placement,[u-.065,v+.018],[u+.065,v-.018],w.player);
  const distance=Math.hypot(w.player.x-point.x,w.player.y-point.y);
  if(distance<best&&withinActionReach(w,point,58)){
   nearest={placement:garden.placement,bed,...gardenBedPoint(garden.placement,bed)};
   best=distance;
  }
 }
 return nearest;
}
export const potatoGrowth=(w:World,start:number)=>Math.max(0,Math.min(1,(timeOf(w)-start)/POTATO_GROW_SECONDS));
export const readyPotatoes=(w:World)=>gardenBeds(w).filter(c=>c&&potatoGrowth(w,c.plantedAt)>=1).length;
const canGarden=(w:World)=>buildingRestored(w,'garden')&&w.phase!=='over'&&w.player.hp>0&&!w.player.downedUntil&&!w.stationPanel;
const syncLegacy=(w:World)=>{const s=potatoPatch(w);s.plantedAt=s.beds!.flatMap(c=>c?[c.plantedAt]:[])};
const plural=(kind:CropKind)=>kind==='potato'?'potatoes':'carrots';
/** Select either crop in the quick bar; otherwise use the first crop in the bag. */
export function plantingCrop(w:World):CropKind|null{
 if(isGardenCrop(w.player.equipped))return itemCount(w,w.player.equipped)>0?w.player.equipped:null;
 return itemCount(w,'potato')>0?'potato':itemCount(w,'carrot')>0?'carrot':null;
}
export function plantPotato(w:World,kind:CropKind=plantingCrop(w)??'potato',index=nearPotatoPatch(w)?.bed){
 if(index===undefined||nearPotatoPatch(w)?.bed!==index||!isGardenCrop(kind)||!canGarden(w))return false;
 const beds=gardenBeds(w);
 if(beds[index]||!takeInventory(w,kind,1))return false;
 beds[index]={kind,plantedAt:timeOf(w)};syncLegacy(w);
 w.notice=`1 ${kind} planted in bed ${index+1} · 4 ${plural(kind)} at harvest`;w.noticeUntil=timeOf(w)+3;return true;
}
/** Capture and revalidate a bed so a repeated/stale tap cannot harvest another crop. */
export function harvestPotatoes(w:World,index=nearPotatoPatch(w)?.bed,expected?:GardenCrop){
 if(index===undefined||nearPotatoPatch(w)?.bed!==index||!canGarden(w))return false;
 const beds=gardenBeds(w),crop=beds[index];
 if(!crop||expected&&(crop.kind!==expected.kind||crop.plantedAt!==expected.plantedAt)||potatoGrowth(w,crop.plantedAt)<1||canCarryCount(w,crop.kind,4)<4)return false;
 if(addInventory(w,crop.kind,4)!==4)return false;
 beds[index]=null;const patch=potatoPatch(w);patch.harvestedAt=timeOf(w);syncLegacy(w);
 w.notice=`+4 ${plural(crop.kind)} harvested · Eat them or replant one`;w.noticeUntil=timeOf(w)+3;return true;
}
export function potatoPatchAction(w:World,patch=nearPotatoPatch(w)){
 if(!patch||!buildingRestored(w,'garden'))return null;
 const bed=patch.bed,crop=gardenBeds(w)[bed],name=`Bed ${bed+1}`;
 if(crop){
  const growth=potatoGrowth(w,crop.plantedAt);
  if(growth<1)return {kind:'inspect' as const,crop:crop.kind,bed,label:'Vegetables are growing',shortLabel:'GROWING',detail:`${name} · ${Math.ceil((1-growth)*POTATO_GROW_SECONDS)}s to harvest`,disabled:true,perform:()=>false};
  const fits=canCarryCount(w,crop.kind,4)>=4;
  return {kind:'harvest' as const,crop:crop.kind,bed,label:`Harvest 4 ${plural(crop.kind)} from bed ${bed+1}`,shortLabel:fits?'HARVEST':'PACK FULL',detail:fits?`${name} ready · 4 ${plural(crop.kind)}`:`Backpack needs room for 4 ${plural(crop.kind)}`,disabled:!fits,perform:()=>harvestPotatoes(w,bed,crop)};
 }
 const kind=plantingCrop(w);
 if(kind)return {kind:'plant' as const,crop:kind,bed,label:`Plant 1 ${kind} in bed ${bed+1}`,shortLabel:'PLANT',detail:`${name} · Plant one to grow four`,disabled:false,perform:()=>plantPotato(w,kind,bed)};
 return {kind:'inspect' as const,crop:undefined,bed,label:'Vegetable patch · Bring potatoes or carrots',shortLabel:'INSPECT',detail:`${name} · Bring a potato or carrot to plant`,disabled:true,perform:()=>false};
}

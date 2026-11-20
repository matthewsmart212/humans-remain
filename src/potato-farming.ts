import {buildingRestored} from './camp-restoration';
import {addInventory,canCarryCount,itemCount,takeInventory} from './expedition-inventory';
import {placementBounds} from './world-layout';
import {timeOf,type World} from './survival-engine';
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
 if(w.scene||!w.layout)return null;
 const p=w.layout.items.find(p=>p.id==='camp-garden-v1'||p.assetId.startsWith('art_camp_garden_'));
 if(!p)return null;
 const b=placementBounds(p);return {placement:p,x:b.x+b.width*.82,y:b.y+b.height*.63};
}
export function nearPotatoPatch(w:World){
 const at=gardenLocation(w);return at&&Math.hypot(w.player.x-at.x,w.player.y-at.y)<165?at:null;
}
export const potatoGrowth=(w:World,start:number)=>Math.max(0,Math.min(1,(timeOf(w)-start)/POTATO_GROW_SECONDS));
export const readyPotatoes=(w:World)=>gardenBeds(w).filter(c=>c&&potatoGrowth(w,c.plantedAt)>=1).length;
const canGarden=(w:World)=>!!nearPotatoPatch(w)&&buildingRestored(w,'garden')&&w.phase!=='over'&&w.player.hp>0&&!w.player.downedUntil&&!w.stationPanel;
const syncLegacy=(w:World)=>{const s=potatoPatch(w);s.plantedAt=s.beds!.flatMap(c=>c?[c.plantedAt]:[])};
const plural=(kind:CropKind)=>kind==='potato'?'potatoes':'carrots';
/** Select either crop in the quick bar; otherwise use the first crop in the bag. */
export function plantingCrop(w:World):CropKind|null{
 if(isGardenCrop(w.player.equipped))return itemCount(w,w.player.equipped)>0?w.player.equipped:null;
 return itemCount(w,'potato')>0?'potato':itemCount(w,'carrot')>0?'carrot':null;
}
export function plantPotato(w:World,kind:CropKind=plantingCrop(w)??'potato'){
 if(!isGardenCrop(kind)||!canGarden(w))return false;
 const beds=gardenBeds(w),i=beds.findIndex(c=>!c);
 if(i<0||!takeInventory(w,kind,1))return false;
 beds[i]={kind,plantedAt:timeOf(w)};syncLegacy(w);
 w.notice=`1 ${kind} planted in bed ${i+1} · 4 ${plural(kind)} at harvest`;w.noticeUntil=timeOf(w)+3;return true;
}
/** Capture and revalidate a bed so a repeated/stale tap cannot harvest another crop. */
export function harvestPotatoes(w:World,index=gardenBeds(w).findIndex(c=>c&&potatoGrowth(w,c.plantedAt)>=1),expected?:GardenCrop){
 if(!canGarden(w))return false;
 const beds=gardenBeds(w),crop=beds[index];
 if(!crop||expected&&(crop.kind!==expected.kind||crop.plantedAt!==expected.plantedAt)||potatoGrowth(w,crop.plantedAt)<1||canCarryCount(w,crop.kind,4)<4)return false;
 if(addInventory(w,crop.kind,4)!==4)return false;
 beds[index]=null;const patch=potatoPatch(w);patch.harvestedAt=timeOf(w);syncLegacy(w);
 w.notice=`+4 ${plural(crop.kind)} harvested · Eat them or replant one`;w.noticeUntil=timeOf(w)+3;return true;
}
export function potatoPatchAction(w:World){
 if(!nearPotatoPatch(w)||!buildingRestored(w,'garden'))return null;
 const beds=gardenBeds(w),readyIndex=beds.findIndex(c=>c&&potatoGrowth(w,c.plantedAt)>=1),growing=beds.filter(Boolean).length;
 if(readyIndex>=0){
  const crop=beds[readyIndex]!,fits=canCarryCount(w,crop.kind,4)>=4;
  return {kind:'harvest' as const,crop:crop.kind,bed:readyIndex,label:`Harvest 4 ${plural(crop.kind)} from bed ${readyIndex+1}`,shortLabel:fits?'HARVEST':'PACK FULL',detail:fits?`Bed ${readyIndex+1} ready · 4 ${plural(crop.kind)}`:`Backpack needs room for 4 ${plural(crop.kind)}`,disabled:!fits,perform:()=>harvestPotatoes(w,readyIndex,crop)};
 }
 const crop=plantingCrop(w);
 if(crop&&growing<4)return {kind:'plant' as const,crop,bed:beds.findIndex(c=>!c),label:`Plant 1 ${crop} to grow 4`,shortLabel:'PLANT',detail:`${growing}/4 beds planted · Select potato or carrot in quick bar`,disabled:false,perform:()=>plantPotato(w,crop)};
 const until=growing?Math.min(...beds.flatMap(c=>c?[Math.max(0,POTATO_GROW_SECONDS-(timeOf(w)-c.plantedAt))]:[])):0;
 return {kind:'inspect' as const,crop:undefined,bed:-1,label:growing?'Vegetables are growing':'Vegetable patch · Bring potatoes or carrots',shortLabel:growing?'GROWING':'INSPECT',detail:growing?`${growing}/4 beds planted · ~${Math.ceil(until)}s to harvest`:'Pick wild potatoes or carrots, then plant one here',disabled:true,perform:()=>false};
}

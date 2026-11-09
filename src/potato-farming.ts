import {buildingRestored} from './camp-restoration';
import {campAccessLevel} from './camp-levels';
import {canPayMaterials,payMaterials} from './camp-materials';
import {addInventory,canCarryCount,itemCount,takeInventory} from './expedition-inventory';
import {placementBounds} from './world-layout';
import {timeOf,type World} from './survival-engine';
export const POTATO_YIELD=4,POTATO_GROW_SECONDS=240;
export const POTATO_UPGRADE_COST={pallets:4,stone:2,scrap:2} as const;
export type PotatoPatchState={tier:1|2;plantedAt:number[]};
export const potatoPatch=(w:World):PotatoPatchState=>{
 const s=w.potatoPatch??={tier:1 as const,plantedAt:[]};
 if(s.tier!==1&&s.tier!==2)s.tier=1;
 if(!Array.isArray(s.plantedAt))s.plantedAt=[];
 s.plantedAt=s.plantedAt.filter(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0).slice(0,4);
 return s;
};
export const potatoSlots=(w:World)=>potatoPatch(w).tier===2?4:2;
export function gardenLocation(w:World){
 if(w.scene||!w.layout)return null;
 const p=w.layout.items.find(p=>p.id==='camp-garden-v1'||p.assetId.startsWith('art_camp_garden_'));
 if(!p)return null;
 const b=placementBounds(p);return {placement:p,x:b.x+b.width*.82,y:b.y+b.height*.63};
}
export function nearPotatoPatch(w:World){
 const at=gardenLocation(w);return at&&Math.hypot(w.player.x-at.x,w.player.y-at.y)<165?at:null;
}
export function readyPotatoes(w:World){const t=timeOf(w);return potatoPatch(w).plantedAt.filter(start=>t-start>=POTATO_GROW_SECONDS).length}
export const potatoGrowth=(w:World,start:number)=>Math.max(0,Math.min(1,(timeOf(w)-start)/POTATO_GROW_SECONDS));
export function plantPotato(w:World){
 if(!nearPotatoPatch(w)||!buildingRestored(w,'garden')||w.phase==='over'||w.player.hp<=0||w.player.downedUntil||w.stationPanel)return false;
 const patch=potatoPatch(w);if(patch.plantedAt.length>=potatoSlots(w)||!takeInventory(w,'potato',1))return false;
 patch.plantedAt.push(timeOf(w));w.notice='1 potato planted · 4 potatoes at harvest';w.noticeUntil=timeOf(w)+2.7;return true;
}
export function harvestPotatoes(w:World){
 if(!nearPotatoPatch(w)||!buildingRestored(w,'garden')||w.phase==='over'||w.player.hp<=0||w.player.downedUntil||w.stationPanel||!readyPotatoes(w)||canCarryCount(w,'potato',4)<4)return false;
 const patch=potatoPatch(w),i=patch.plantedAt.findIndex(start=>potatoGrowth(w,start)>=1);
 if(i<0||addInventory(w,'potato',4)!==4)return false;
 patch.plantedAt.splice(i,1);w.notice='+4 potatoes harvested · Replant one to grow more';w.noticeUntil=timeOf(w)+3;return true;
}
export function upgradePotatoPatch(w:World){
 if(!nearPotatoPatch(w)||!buildingRestored(w,'garden')||w.phase==='over'||w.player.hp<=0||w.player.downedUntil||w.stationPanel||campAccessLevel(w)<2||potatoPatch(w).tier===2||!payMaterials(w,POTATO_UPGRADE_COST))return false;
 potatoPatch(w).tier=2;w.notice='Potato patch upgraded · 4 growing slots';w.noticeUntil=timeOf(w)+3;return true;
}
export function potatoPatchAction(w:World){
 if(!nearPotatoPatch(w)||!buildingRestored(w,'garden'))return null;
 const patch=potatoPatch(w),ready=readyPotatoes(w),slots=potatoSlots(w),count=itemCount(w,'potato');
 if(ready)return {kind:'harvest' as const,label:'Harvest 4 potatoes',shortLabel:'HARVEST',detail:canCarryCount(w,'potato',4)<4?'Backpack needs room for 4 potatoes':`${ready} planting${ready===1?'':'s'} ready · 4 each`,disabled:canCarryCount(w,'potato',4)<4,perform:()=>harvestPotatoes(w)};
 if(patch.tier===1&&campAccessLevel(w)>=2&&canPayMaterials(w,POTATO_UPGRADE_COST))return {kind:'upgrade' as const,label:'Upgrade patch · 4 logs, 2 stone, 2 scrap',shortLabel:'UPGRADE',detail:'Expand from 2 growing slots to 4',disabled:false,perform:()=>upgradePotatoPatch(w)};
 if(count&&patch.plantedAt.length<slots)return {kind:'plant' as const,label:'Plant 1 potato to grow 4',shortLabel:'PLANT',detail:`${patch.plantedAt.length}/${slots} growing · 1 potato = 4`,disabled:false,perform:()=>plantPotato(w)};
 const growing=patch.plantedAt.length,until=growing?Math.min(...patch.plantedAt.map(t=>Math.max(0,POTATO_GROW_SECONDS-(timeOf(w)-t)))):0;
 return {kind:'inspect' as const,label:growing?'Potatoes are growing':'Potato patch · Bring potatoes to plant',shortLabel:growing?'GROWING':'PATCH',detail:growing?`${growing}/${slots} planted · ~${Math.ceil(until)}s to harvest`:`${slots} planting slots · Requires potatoes`,disabled:true,perform:()=>false};
}

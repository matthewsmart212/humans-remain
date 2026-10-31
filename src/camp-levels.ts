import {buildingRestored,buildingEstablished} from './camp-restoration';
import type {World} from './survival-engine';
import type {MaterialCost} from './forge-recipes';

export type CampLevel=0|1|2;
export const CAMP_LEVEL_NAMES={0:'Abandoned camp',1:'Makeshift camp',2:'Working camp'} as const;
/** Starter resources only: metalworking must never be needed to unlock itself. */
export const CAMP_EXPANSION_COST:MaterialCost={pallets:8,stone:4};
/** Legacy runs keep access they had already discovered or put into use. */
export function campAccessLevel(w:World):CampLevel{
 const p=w.progression;
 if(!p)return 2;
 if(p.restoredBuildings!==undefined)return buildingEstablished(w,'headquarters')?(p.campLevel===2?2:1):0;
 if(p.furnaceRestored||p.metalCrafted||p.fortified||!!p.blueprints?.length)return 2;
 if(p.campLevel!==undefined)return p.campLevel;
 return p.repairPart?2:1;
}
export const validCampLevelSave=(value:unknown)=>value===undefined||value===0||value===1||value===2;
/** Presence and repair are both required before a facility can serve the camp. */
export function campFacilities(w:World){
 const items=w.layout?.items??[];
 return {workshop:buildingRestored(w,'workshop')&&items.some(p=>p.assetId==='base_workshop_t1'),warehouse:buildingRestored(w,'warehouse')&&items.some(p=>p.assetId==='misc_ceaf1a05-5426-45df-8a51-d3e2e07c6f9f')};
}

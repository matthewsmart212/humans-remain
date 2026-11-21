import {CAMP_REPAIRS,buildingRestored,campBuildingPlacements,campAccessLevel,type CampBuildingId} from './camp-restoration';
import type {World} from './survival-engine';
import type {MaterialCost} from './forge-recipes';

export {campAccessLevel};
export type CampLevel=0|1|2|3|4;
export type BuiltCampLevel=Exclude<CampLevel,0>;
export const CAMP_LEVEL_NAMES={
 0:'Abandoned camp',1:'Makeshift camp',2:'Working camp',3:'Established camp',4:'Fortified settlement'
} as const;
export const CAMP_MILESTONES:Record<BuiltCampLevel,{requires:readonly CampBuildingId[];cost:MaterialCost}>={
 1:{requires:[],cost:CAMP_REPAIRS.headquarters.cost},
 2:{requires:['well','fire'],cost:{pallets:8,stone:4}},
 3:{requires:['warehouse','garden'],cost:{pallets:12,stone:6,scrap:2}},
 4:{requires:['workshop','furnace'],cost:{pallets:16,stone:8,scrap:4}},
};
export const nextCampLevel=(level:CampLevel):BuiltCampLevel|undefined=>level===4?undefined:([1,2,3,4] as const)[level];
export function campRequirementMet(w:World,id:CampBuildingId){
 return buildingRestored(w,id)&&campBuildingPlacements(w.layout).some(site=>site.id===id);
}
export const validCampLevelSave=(value:unknown)=>value===undefined||[0,1,2,3,4].some(level=>value===level);

/** Earlier camps could build in a different order. Keep every purchased facility usable. */
export function migrateCampLevel(w:World){
 const p=w.progression;
 if(!p||p.version!==1)return;
 let level=campAccessLevel(w);
 if(p.restoredBuildings===undefined)level=4; // Pre-restoration saves already own the original camp.
 else for(const id of p.restoredBuildings){
  const minimum=CAMP_REPAIRS[id].level;
  if(minimum>level)level=minimum;
 }
 p.campLevel=level;
 p.version=2;
}

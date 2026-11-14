import {WORKSITE_ROOT} from './camp-worksites-art';
import {WORKSHOP_BROKEN_IMAGE} from './workshop-animation-art';
import {FURNACE_BROKEN_IMAGE} from './furnace-animation-art';
import {TREATMENT_BROKEN_IMAGE} from './treatment-animation-art';
import type {World} from './survival-engine';
import type {MaterialCost} from './forge-recipes';
import {HQ_SOUTH_RUIN,HQ_SOUTH_RUIN_INTERIOR} from './headquarters-south-art';

export const CAMP_BUILDING_IDS=['headquarters','treatment','garden','workshop','furnace','bunker','warehouse','well','fire'] as const;
export type CampBuildingId=typeof CAMP_BUILDING_IDS[number];
export const CAMP_REPAIRS:Record<CampBuildingId,{name:string;assetId:string;level:0|1|2;cost:MaterialCost}>={
 headquarters:{name:'Headquarters',assetId:'base_shelter_t1',level:0,cost:{pallets:4}},
 workshop:{name:'Workshop',assetId:'base_workshop_t1',level:1,cost:{pallets:3}},
 warehouse:{name:'Warehouse',assetId:'misc_ceaf1a05-5426-45df-8a51-d3e2e07c6f9f',level:1,cost:{pallets:4}},
 well:{name:'Well',assetId:'base_well_t1',level:1,cost:{pallets:2,stone:1}},
 fire:{name:'Campfire',assetId:'base_hearth_t1',level:1,cost:{pallets:1,stone:2}},
 bunker:{name:'Bunker',assetId:'misc_2dd09bb8-883b-42e3-b765-c2a1c735b016',level:1,cost:{pallets:3,stone:2,scrap:3}},
 treatment:{name:'Treatment centre',assetId:'base_medical_t2',level:1,cost:{pallets:3,scrap:2}},
 garden:{name:'Potato patch',assetId:'art_camp_garden_broken',level:1,cost:{pallets:3}},
 furnace:{name:'Furnace',assetId:'art_camp_smelting_furnace',level:2,cost:{pallets:4,stone:3,scrap:4}},
};
export const BROKEN_CAMP_ART=Object.fromEntries(CAMP_BUILDING_IDS.map(id=>[id,id==='headquarters'?HQ_SOUTH_RUIN:id==='furnace'||id==='warehouse'?`${WORKSITE_ROOT}/${id}-broken.webp`:`/survival/camp-ruins-v1/${id}.webp`])) as Record<CampBuildingId,string>;
export const BROKEN_HQ_INTERIOR=HQ_SOUTH_RUIN_INTERIOR;
BROKEN_CAMP_ART.workshop=WORKSHOP_BROKEN_IMAGE;
BROKEN_CAMP_ART.furnace=FURNACE_BROKEN_IMAGE;
BROKEN_CAMP_ART.treatment=TREATMENT_BROKEN_IMAGE;
export function campBuildingId(assetId:string):CampBuildingId|undefined{
 if(['art_camp_garden_broken','art_camp_garden_t1','art_camp_garden_t2','art_camp_garden_t3'].includes(assetId))return 'garden';
 return CAMP_BUILDING_IDS.find(id=>CAMP_REPAIRS[id].assetId===assetId);
}
/** Absent restoration state means an existing run: keep its established facilities. */
export function buildingEstablished(w:Pick<World,'progression'>,id:CampBuildingId){
 const p=w.progression;if(!p)return true;
 if(id==='furnace')return p.furnaceRestored;
 return p.restoredBuildings===undefined?p.campLevel!==0:p.restoredBuildings.includes(id);
}
export const BUILDING_MAX_HP:Record<CampBuildingId,number>={headquarters:240,workshop:180,warehouse:220,well:140,fire:100,bunker:280,treatment:160,garden:120,furnace:220};
export const buildingMaxHp=(w:Pick<World,'progression'>,id:CampBuildingId)=>id==='headquarters'?(w.progression?.hqMax??240):BUILDING_MAX_HP[id];
export const buildingHp=(w:Pick<World,'progression'>,id:CampBuildingId)=>id==='headquarters'?(w.progression?.hqHp??240):w.progression?.buildingHp?.[id]??buildingMaxHp(w,id);
/** Zero health disables a facility without forgetting its unlock or construction history. */
export const buildingRestored=(w:Pick<World,'progression'>,id:CampBuildingId)=>buildingEstablished(w,id)&&buildingHp(w,id)>0;
export const buildingNeedsRepair=(w:Pick<World,'progression'>,id:CampBuildingId)=>!buildingEstablished(w,id)||buildingHp(w,id)<buildingMaxHp(w,id)||id==='headquarters'&&!!w.progression&&w.progression.defence<w.progression.defenceMax;
export function campBuildingArt(w:World,assetId:string):{image:string;roof?:string}|undefined{
 if(w.scene)return;
 const id=campBuildingId(assetId);if(!id)return;
 if(!buildingRestored(w,id))return id==='headquarters'?{image:BROKEN_HQ_INTERIOR,roof:BROKEN_CAMP_ART.headquarters}:{image:BROKEN_CAMP_ART[id]};
 // Restore the authored abandoned garden without moving or replacing its lot.
 if(id==='garden'&&w.progression?.restoredBuildings&&assetId==='art_camp_garden_broken')return {image:'/survival/camp-garden-v1/tier-1.webp'};
}
export function restorationImages(assetId:string){
 const id=campBuildingId(assetId);return !id?[]:id==='headquarters'?[BROKEN_CAMP_ART[id],BROKEN_HQ_INTERIOR]:id==='garden'?[BROKEN_CAMP_ART[id],'/survival/camp-garden-v1/tier-1.webp']:[BROKEN_CAMP_ART[id]];
}
export function validRestorationSave(p:{restoredBuildings?:unknown;campLevel?:unknown;furnaceRestored?:unknown;starterRepairHammer?:unknown;starterPickaxe?:unknown;buildingHp?:unknown}){
 if(p.starterPickaxe!==undefined&&typeof p.starterPickaxe!=='boolean')return false;
 if(p.starterRepairHammer!==undefined&&typeof p.starterRepairHammer!=='boolean')return false;
 if(p.buildingHp!==undefined&&(!p.buildingHp||Array.isArray(p.buildingHp)||typeof p.buildingHp!=='object'||!Object.entries(p.buildingHp).every(([id,hp])=>id!=='headquarters'&&CAMP_BUILDING_IDS.includes(id as CampBuildingId)&&typeof hp==='number'&&Number.isFinite(hp)&&hp>=0&&hp<=BUILDING_MAX_HP[id as CampBuildingId])))return false;
 const ids=p.restoredBuildings;
 if(ids===undefined)return p.campLevel!==0;
 return Array.isArray(ids)&&ids.length<=CAMP_BUILDING_IDS.length&&new Set(ids).size===ids.length&&ids.every(id=>CAMP_BUILDING_IDS.includes(id))
  &&(p.campLevel===0?ids.length===0:ids.includes('headquarters'))&&ids.includes('furnace')===!!p.furnaceRestored;
}

const placements=new WeakMap<NonNullable<World['layout']>,{placement:NonNullable<World['layout']>['items'][number];id:CampBuildingId}[]>();
export function campBuildingPlacements(layout:World['layout']){
 if(!layout)return [];let list=placements.get(layout);if(!list){list=layout.items.flatMap(placement=>{const id=campBuildingId(placement.assetId);return id?[{placement,id}]:[]});placements.set(layout,list)}return list;
}

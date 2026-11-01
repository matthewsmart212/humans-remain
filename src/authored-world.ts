import {addCampIronworks} from './ironworks-planting';
import {addApprovedCampGarden} from './camp-garden-placement';
import {placeFurnaceByWorkshop} from './camp-furnace-placement';
import {addForagingPlants} from './forage-planting';
import {addApprovedHeadquartersProps} from './headquarters-dressing';
import {addApprovedCampWell} from './camp-centrepiece';
import {addApprovedFoliageTrial,addApprovedFoliageExpansion,addApprovedTerrainFoliage} from './foliage-trial';
import {addApprovedCampFoliage,refineApprovedCampFoliage} from './camp-foliage';
import {addApprovedCampPuddles} from './camp-puddles';
import {addApprovedCampPerimeter} from './camp-perimeter';
import {addApprovedCampOutskirts} from './camp-outskirts';
import {addApprovedCampRiver} from './camp-river';
import {refineApprovedWoodlandZones} from './woodland-zones';
import {addApprovedWorldPlanting} from './world-planting';
import {addApprovedCampFringe} from './camp-fringe';
import {addApprovedTreeVariants} from './tree-variants';
import type {WorldLayout} from './world-layout';

/** Idempotent approved world upgrades, in the same order on web and native. */
const upgrades:[string,(layout:WorldLayout)=>WorldLayout][]=[
 ['Headquarters',addApprovedHeadquartersProps],['Well',addApprovedCampWell],['Foliage trial',addApprovedFoliageTrial],
 ['Foliage expansion',addApprovedFoliageExpansion],['Terrain foliage',addApprovedTerrainFoliage],['Camp foliage',addApprovedCampFoliage],
 ['Refine foliage',refineApprovedCampFoliage],['Puddles',addApprovedCampPuddles],['Perimeter',addApprovedCampPerimeter],
 ['Outskirts',addApprovedCampOutskirts],['River',addApprovedCampRiver],['Woodland',refineApprovedWoodlandZones],
 ['World planting',addApprovedWorldPlanting],['Fringe',addApprovedCampFringe],['Tree variants',addApprovedTreeVariants],['Foraging',addForagingPlants],['Ironworks',addCampIronworks],['Furnace',placeFurnaceByWorkshop],['Garden',addApprovedCampGarden]];
export function prepareAuthoredWorld(layout:WorldLayout):WorldLayout{
 return upgrades.reduce((world,[name,upgrade])=>{try{return upgrade(world)}catch(e){const error=e instanceof Error?e:Error(String(e));error.message=`${name}: ${error.message}`;throw error}},layout);
}

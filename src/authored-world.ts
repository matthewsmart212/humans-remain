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
export function prepareAuthoredWorld(layout:WorldLayout):WorldLayout{
 return [addApprovedHeadquartersProps,addApprovedCampWell,addApprovedFoliageTrial,
  addApprovedFoliageExpansion,addApprovedTerrainFoliage,addApprovedCampFoliage,
  refineApprovedCampFoliage,addApprovedCampPuddles,addApprovedCampPerimeter,
  addApprovedCampOutskirts,addApprovedCampRiver,refineApprovedWoodlandZones,
  addApprovedWorldPlanting,addApprovedCampFringe,addApprovedTreeVariants,addForagingPlants,addCampIronworks,placeFurnaceByWorkshop,addApprovedCampGarden]
  .reduce((world,upgrade)=>upgrade(world),layout);
}

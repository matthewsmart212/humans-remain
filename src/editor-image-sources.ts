import {REPAIR_HAMMER_IMAGES} from './repair-hammer';
import {NIGHT_WAVES} from './camp-siege';
import {spawnImages} from './play-spawns';
import {IRONWORKS_IMAGES,FURNACE_FIRE_IMAGES} from './ironworks-data';
import {MINING_IMAGES} from './pickaxes';
import {PROVISION_IMAGES} from './food-provisions-art';
import {KNIFE_IMAGES} from './knives';
import {BOW_IMAGES} from './bow-art';
import {SWORD_IMAGES} from './swords';
import {SPEAR_IMAGES} from './spears';
import {DEER_IMAGES} from './deer-art';
import {PREDATOR_IMAGES} from './predator-art';
import {CHICKEN_IMAGES} from './chicken-art';
import {RABBIT_IMAGES} from './rabbit-art';
import {RABBIT_FOOD_IMAGES,VENISON_FOOD_IMAGES} from './food-items';
import {RIVER_PREVIEW_IMAGES,RIVER_MOTION_IMAGES} from './river-art';
import {BONFIRE_FOOD_IMAGES} from './bonfire-food-art';
import {CAMPFIRE_ART} from './campfire-art';
import {SURVIVOR_IMAGE_SOURCES} from './survivor-art';
import {ENGINEER_IMAGE_SOURCES} from './engineer-sprites';
import {SCRAP_IMAGES} from './scrap-salvage';
import {WAREHOUSE_IMAGES} from './warehouse';
import {AXE_IMAGE_SOURCES} from './axe-renderer';
import {RUNNER_AXE_IMAGE_SOURCES} from './runner-axe-art';
import {HOME_TERRAIN,usesPaintedHomeTerrain} from './terrain-art';
import {WORLD_GROUND_MATERIAL_SOURCES} from './world-ground';
import {WORLD_ROAD_MATERIAL_SOURCES} from './world-road-materials';
import {ROAD_OVERVIEW_IMAGES} from './world-road-pilot';
import {requiredImages} from './world-assets';
import type {WorldLayout} from './world-layout';
import type {ArtworkPriority,ArtworkProgress} from './artwork-loading';
import {playerMovementImagesForRole} from './gameplay-artwork';
import type {SurvivorRoleId} from './survivor-roles';

// The editor has no legacy factory scene, monsters, spare hearth tiers or asset-yard backdrops.
// Placed art is supplied separately by requiredImages(), including roofs and every animated frame.
export const RAID_IMAGE_SOURCES:Record<string,string>=Object.assign({},...Array.from(new Set(NIGHT_WAVES.flat())).map(kind=>spawnImages(kind)));
export const EDITOR_IMAGE_SOURCES:Record<string,string>={...REPAIR_HAMMER_IMAGES,...RAID_IMAGE_SOURCES,...IRONWORKS_IMAGES,...FURNACE_FIRE_IMAGES,...MINING_IMAGES,...PROVISION_IMAGES,...BOW_IMAGES,...SWORD_IMAGES,...SPEAR_IMAGES,...KNIFE_IMAGES,...SCRAP_IMAGES,...WAREHOUSE_IMAGES,torch:'/survival/equipment/torch-v1.png',...CHICKEN_IMAGES,...RABBIT_IMAGES,...DEER_IMAGES,...PREDATOR_IMAGES,...CAMPFIRE_ART,...BONFIRE_FOOD_IMAGES,...RABBIT_FOOD_IMAGES,...VENISON_FOOD_IMAGES,bagScrap:'/survival/ui-backpack-v1/scrap.png',bagFuel:'/survival/ui-backpack-v1/fuel.png',...SURVIVOR_IMAGE_SOURCES,...ENGINEER_IMAGE_SOURCES,...AXE_IMAGE_SOURCES,...RUNNER_AXE_IMAGE_SOURCES,homeGround:HOME_TERRAIN.image};
// Build opens with placed objects, the camp overview, its static cooking and
// storage props, and the idle player. Spare weapons, food and furnace animation
// frames cannot block opening the world. Play prepares only the current run.
export const EDITOR_ENTRY_IMAGES:Record<string,string>={...IRONWORKS_IMAGES,...SCRAP_IMAGES,...WAREHOUSE_IMAGES,...CAMPFIRE_ART,survivorBase:SURVIVOR_IMAGE_SOURCES.survivorBase,survivorRear:SURVIVOR_IMAGE_SOURCES.survivorRear,...AXE_IMAGE_SOURCES,homeGround:HOME_TERRAIN.image};
export const EDITOR_MOVEMENT_IMAGES=Object.fromEntries(Object.entries(EDITOR_IMAGE_SOURCES).filter(([key])=>!(key in EDITOR_ENTRY_IMAGES)));
/** Prioritise camp assets near spawn instead of holding up the start screen
 * while hundreds of distant world images download on mobile Safari.
 */
const nearby=(layout:WorldLayout,center:{x:number;y:number},radius:number)=>layout.items.filter(p=>Math.abs(p.x-center.x)<=radius&&Math.abs(p.y-center.y)<=radius).map(p=>p.assetId);
export const editorEntryArtwork=(layout:WorldLayout,nearSpawnRadius?:number)=>requiredImages(
 nearSpawnRadius===undefined?layout.items.map(p=>p.assetId):nearby(layout,layout.spawn,nearSpawnRadius),
 layout.terrainImage,{animationFrames:false}
);
export const editorTerrainDetail=(terrain?:{url:string})=>usesPaintedHomeTerrain(terrain)?{...WORLD_GROUND_MATERIAL_SOURCES,...WORLD_ROAD_MATERIAL_SOURCES,...ROAD_OVERVIEW_IMAGES,...RIVER_PREVIEW_IMAGES,...RIVER_MOTION_IMAGES}:{};

type ArtworkRenderer={loadImages:(sources:Record<string,string>,progress?:((p:ArtworkProgress)=>void),priority?:ArtworkPriority)=>Promise<void>;warmImages:(sources:Record<string,string>,priority?:ArtworkPriority)=>Promise<void>};
/** A Play/Walk request promotes these shared jobs ahead of optional map detail. */
export async function prepareEditorMovement(renderer:ArtworkRenderer,layout:WorldLayout,priority:ArtworkPriority='foreground',center=layout.spawn,role:SurvivorRoleId='survivor'){
 // Walking only needs nearby objects; movement never waits on distant scenery.
 const near=requiredImages(nearby(layout,center,1650),layout.terrainImage,{animationFrames:false});
 // Fruit is painted as a separate layer over forage plants. It must be ready before
  // the first playable frame or ripe berry bushes and apple trees appear empty.
  // Keep the preload small: only these two world-fruit images are necessary.
  await Promise.all([renderer.loadImages(near,undefined,priority),renderer.warmImages({...playerMovementImagesForRole(role),provision_berries:PROVISION_IMAGES.provision_berries,provision_apple:PROVISION_IMAGES.provision_apple},priority)]);
}

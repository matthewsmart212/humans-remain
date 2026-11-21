import {buildingRestored} from './camp-restoration';
import {lootChestOpened,lootChestInMenuRange} from './loot-chest';
import {nearbyHeadquarters} from './run-progression';
import {nearbyFurnace} from './camp-furnace';
import {nearbySmithy} from './camp-smithy';
import {nearbyWarehouse} from './warehouse';
import {layoutViews} from './layout-views';
import {placementPoint,type Placement} from './world-layout';
import {campAction,withinActionReach,type World} from './survival-engine';
export function chestDock(p:Placement){
 const [x,y]=placementPoint(p,p.x,p.y+22*p.scale);
 return {x,y};
}
export function nearbyChest(world:World){
 if(!buildingRestored(world,'headquarters'))return null;
 let nearest:string|null=null,distance=Infinity;
 for(const p of layoutViews(world.layout).chests){const {x,y}=chestDock(p),d=Math.hypot(world.player.x-x,world.player.y-y);if(d<distance&&withinActionReach(world,{x,y})){distance=d;nearest=p.id}}
 return nearest;
}
export const atStorage=(w:World)=>buildingRestored(w,'warehouse')&&!!nearbyWarehouse(w)||!!nearbyChest(w)||campAction(w)==='deposit';
export const atStation=(w:World)=>w.stationPanel==='rare-cache'?lootChestOpened(w,w.lootChestId)&&lootChestInMenuRange(w):w.stationPanel==='headquarters'?!!nearbyHeadquarters(w):w.stationPanel==='smithy'?buildingRestored(w,'workshop')&&!!w.smithyId&&nearbySmithy(w)?.placement.id===w.smithyId:w.stationPanel==='furnace'?buildingRestored(w,'furnace')&&!!w.furnaceId&&nearbyFurnace(w)?.placement.id===w.furnaceId:w.stationPanel==='fire'?campAction(w)==='cook':w.stationPanel==='storage'?atStorage(w):w.stationPanel==='warehouse'?buildingRestored(w,'warehouse')&&!!nearbyWarehouse(w):false;

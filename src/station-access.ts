import {buildingRestored} from './camp-restoration';
import {nearbyHeadquarters,REPAIR_CACHE} from './run-progression';
import {nearbyFurnace} from './camp-furnace';
import {nearbySmithy} from './camp-smithy';
import {nearbyWarehouse} from './warehouse';
import {layoutViews} from './layout-views';
import {placementPoint} from './world-layout';
import {campAction,lineClear,type World} from './survival-engine';
export function nearbyChest(world:World){
 if(!buildingRestored(world,'headquarters'))return null;
 let nearest:string|null=null,distance=110;
 for(const p of layoutViews(world.layout).chests){if(p.id===REPAIR_CACHE)continue;const [x,y]=placementPoint(p,p.x,p.y+22*p.scale),d=Math.hypot(world.player.x-x,world.player.y-y);if(d<distance&&lineClear(world.player,{x,y},world)){distance=d;nearest=p.id}}
 return nearest;
}
export const atStorage=(w:World)=>buildingRestored(w,'warehouse')&&!!nearbyWarehouse(w)||!!nearbyChest(w)||campAction(w)==='deposit';
export const atStation=(w:World)=>w.stationPanel==='headquarters'?!!nearbyHeadquarters(w):w.stationPanel==='smithy'?buildingRestored(w,'workshop')&&!!w.smithyId&&nearbySmithy(w)?.placement.id===w.smithyId:w.stationPanel==='furnace'?buildingRestored(w,'furnace')&&!!w.furnaceId&&nearbyFurnace(w)?.placement.id===w.furnaceId:w.stationPanel==='fire'?campAction(w)==='cook':w.stationPanel==='storage'?atStorage(w):w.stationPanel==='warehouse'?buildingRestored(w,'warehouse')&&!!nearbyWarehouse(w):false;

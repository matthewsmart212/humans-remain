import {WORLD_ROADS,traceWorldRoad,type WorldRoad} from './world-roads';
import {WORLD_ROAD_MATERIALS} from './world-road-materials';
import {terrainIntersects,type TerrainView} from './outdoor-terrain';
import {EAST_TERRAIN_SCALE} from './east-approach';

/** Draw over world soil and under the original camp, placed decals and objects. */
export function drawWorldRoads(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,view?:TerrainView){
 const visible=WORLD_ROADS.filter(road=>!view||terrainIntersects(road.bounds,view));if(!visible.length)return;
 const target=ctx as CanvasRenderingContext2D&{drawRoadSurfaces?:(roads:readonly WorldRoad[],images:HTMLImageElement[],scale:number)=>void};
 const materials=WORLD_ROAD_MATERIALS.map(m=>imgs[m.key]);
 if(target.drawRoadSurfaces&&materials.every(Boolean)){target.drawRoadSurfaces(visible,materials,EAST_TERRAIN_SCALE);return}
 // Optional art loads after editor entry. A quiet earth fill remains usable if
 // a download is still pending; no black flash and no new entry-loading gate.
 ctx.save();ctx.fillStyle='#8d704d';ctx.globalAlpha*=.6;
 for(const road of visible){
  traceWorldRoad(ctx,road);ctx.fill();
 }
 ctx.restore();
}

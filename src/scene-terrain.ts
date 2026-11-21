import type {SceneDefinition} from './scene-model';
import {terrainIntersects,type TerrainView} from './outdoor-terrain';

/** The shared Canvas/Skia adapter draws each registered texture at world scale. */
export function drawSceneTerrain(ctx:CanvasRenderingContext2D,images:Record<string,HTMLImageElement>,scene:SceneDefinition,viewport?:TerrainView){
 if(scene.terrain.tiles?.length){
  const canvas=ctx as CanvasRenderingContext2D&{drawTerrainTile?:(image:HTMLImageElement,tile:TerrainView)=>void};
  for(const tile of scene.terrain.tiles){
   if(viewport&&!terrainIntersects(tile,viewport,8))continue;
   const image=images[tile.key];if(!image)continue;
   // Tiling needs full pixel coverage at shared edges during fractional camera pans.
   if(canvas.drawTerrainTile)canvas.drawTerrainTile(image,tile);
   else ctx.drawImage(image,tile.x,tile.y,tile.width,tile.height);
  }
 }else{
  const image=images[scene.terrain.key];if(image)ctx.drawImage(image,0,0,scene.width,scene.height);
 }
}

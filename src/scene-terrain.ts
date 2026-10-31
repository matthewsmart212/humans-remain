import type {SceneDefinition} from './scene-model';

/** The shared Canvas/Skia adapter draws each registered texture at world scale. */
export function drawSceneTerrain(ctx:CanvasRenderingContext2D,images:Record<string,HTMLImageElement>,scene:SceneDefinition){
 if(scene.terrain.tiles?.length){
  for(const tile of scene.terrain.tiles){const image=images[tile.key];if(image)ctx.drawImage(image,tile.x,tile.y,tile.width,tile.height)}
 }else{
  const image=images[scene.terrain.key];if(image)ctx.drawImage(image,0,0,scene.width,scene.height);
 }
}

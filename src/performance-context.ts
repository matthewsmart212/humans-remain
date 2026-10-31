import type {World} from './survival-engine';
export type TerrainPerformance=Record<'roads'|'camp'|'rivers',{bytes:number;missing:number}>&{graphics?:{backend:string;gpuCacheBytes?:number|null;gpuCacheLimitBytes?:number|null;shaderFieldBytes:number}};
/** Cheap lengths/coordinates; no scene traversal, screenshots or asset copies. */
export function performanceWorldContext(world:World,zoom:number,terrain:TerrainPerformance|undefined,width:number,height:number){
 return {scene:world.scene?.id||'camp',tick:world.tick,player:{x:Math.round(world.player.x),y:Math.round(world.player.y),sprinting:world.player.sprinting},
  counts:{placed:world.layout?.items.length||0,enemies:world.enemies.length,animals:world.animals?.length||0,loot:world.loot.length,effects:world.effects.length},
  zoom,viewport:{width,height},environment:{phase:world.phase,nightAmount:world.nightAmount,rain:world.weather?.rain||0,heavyRain:world.weather?.heavy||0,fog:world.weather?.fog||0,lightning:world.weather?.flash||0},terrain};
}

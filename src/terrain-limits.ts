/** Terrain uploads are larger than individual catalogue sprites. */
export const MAX_TERRAIN_FILE=64*1024*1024;
export const MAX_TERRAIN_PIXELS=32_000_000;
export const MAX_TERRAIN_EDGE=8192;
export function validTerrainBorder(width:number,height:number,border:number){
 return Number.isInteger(border)&&border>=0&&(border===0||(width===height&&border<=width/4));
}

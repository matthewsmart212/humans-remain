import {EAST_TERRAIN_SCALE} from './east-approach';
import {HOME_TERRAIN} from './terrain-art';
import {WORLD_GROUND_TILES} from './world-ground';
import {groundFootprint} from './terrain-footprint';

export type TerrainView={x:number;y:number;width:number;height:number};
type SourceTile=TerrainView&{key:string;image:string;paintRight:number;paintBottom:number;fadeTop:number;fadeBottom:number;fadeRight:number;fadeLeft?:number;northKey?:string;coveredTop?:number;westKey?:string;topNeighborKey?:string;northBlendKey?:string;eastBlendKey?:string;southBlendKey?:string;rotation?:number;mirror?:boolean};
export const OUTDOOR_SOURCE_TILES:readonly SourceTile[]=WORLD_GROUND_TILES;
export const OUTDOOR_TILES=OUTDOOR_SOURCE_TILES.map(t=>({...t,sourceWidth:t.width,sourceHeight:t.height,x:(t.x-HOME_TERRAIN.border)*EAST_TERRAIN_SCALE,y:(t.y-HOME_TERRAIN.border)*EAST_TERRAIN_SCALE,width:t.width*EAST_TERRAIN_SCALE,height:t.height*EAST_TERRAIN_SCALE,paintRight:t.paintRight*EAST_TERRAIN_SCALE,paintBottom:t.paintBottom*EAST_TERRAIN_SCALE,coveredTop:(t.coveredTop||0)*EAST_TERRAIN_SCALE,fadeTop:t.fadeTop*EAST_TERRAIN_SCALE,fadeBottom:t.fadeBottom*EAST_TERRAIN_SCALE,fadeRight:t.fadeRight*EAST_TERRAIN_SCALE,fadeLeft:(t.fadeLeft||0)*EAST_TERRAIN_SCALE}));
export type OutdoorTile=typeof OUTDOOR_TILES[number];
/** Keep sampling gutters, but paint shared rows/columns only once. A missing
 * northern download leaves the existing southern artwork available in full. */
export function terrainPaintRegion(t:OutdoorTile,hasImage:(key:string)=>boolean){
 const paintTop=t.northKey&&hasImage(t.northKey)?t.coveredTop:0;
 // The new left feather ends before the old right fade begins. This keeps
 // contacts opaque and unfinished corners gradual without changing old fades.
 // If only a short connector is missing, keep the old image in full and remove
 // its outer fade when the main northern clearing already reaches that edge.
 // A southward extension feathers over the old bottom edge. If that northern
 // neighbour is unavailable, keep the new image complete across its overlap.
 const fadeTop=paintTop||t.topNeighborKey&&hasImage(t.topNeighborKey)||t.northBlendKey&&!hasImage(t.northBlendKey)?0:t.fadeTop;
 // Returning west uses the same contact rule in reverse: the new right feather
 // starts where the existing eastern image becomes opaque.
 return{...t,paintTop,fadeTop,fadeBottom:t.southBlendKey&&!hasImage(t.southBlendKey)?0:t.fadeBottom,fadeLeft:t.westKey&&!hasImage(t.westKey)?0:t.fadeLeft,fadeRight:t.eastBlendKey&&!hasImage(t.eastBlendKey)?0:t.fadeRight,paintWidth:t.width-t.paintRight,paintHeight:t.height-paintTop-t.paintBottom};
}
export const terrainIntersects=(a:TerrainView,b:TerrainView,pad=0)=>a.x<=b.x+b.width+pad&&a.x+a.width>=b.x-pad&&a.y<=b.y+b.height+pad&&a.y+a.height>=b.y-pad;
const inRect=(t:TerrainView,x:number,y:number)=>x>=t.x&&x<=t.x+t.width&&y>=t.y&&y<=t.y+t.height;
const base={x:-HOME_TERRAIN.border*EAST_TERRAIN_SCALE,y:-HOME_TERRAIN.border*EAST_TERRAIN_SCALE,width:HOME_TERRAIN.fullSize*EAST_TERRAIN_SCALE,height:HOME_TERRAIN.fullSize*EAST_TERRAIN_SCALE};
export const OUTDOOR_FOOTPRINT=groundFootprint([base,...OUTDOOR_TILES.map(t=>({...t,width:t.width-t.paintRight,height:t.height-t.paintBottom}))]);
export const OUTDOOR_SOURCE_SIZE={width:Math.round(OUTDOOR_FOOTPRINT.bounds.width/EAST_TERRAIN_SCALE),height:Math.round(OUTDOOR_FOOTPRINT.bounds.height/EAST_TERRAIN_SCALE)};
export const OUTDOOR_SOURCE_BOUNDS={x:Math.round(OUTDOOR_FOOTPRINT.bounds.x/EAST_TERRAIN_SCALE+HOME_TERRAIN.border),y:Math.round(OUTDOOR_FOOTPRINT.bounds.y/EAST_TERRAIN_SCALE+HOME_TERRAIN.border),...OUTDOOR_SOURCE_SIZE};
/** Never walk onto a missing texture if a download is slow or fails. */
export function outdoorTerrainReadyAt(ready:ReadonlySet<string>|undefined,x:number,y:number,r=19){
 if(!ready)return true;
 return [[x-r,y-r],[x+r,y-r],[x-r,y+r],[x+r,y+r]].every(([px,py])=>inRect(base,px,py)||OUTDOOR_TILES.some(t=>ready.has(t.key)&&inRect(t,px,py)));
}

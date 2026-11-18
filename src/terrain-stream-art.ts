import manifest from './terrain-stream-manifest.json';
import {EAST_TERRAIN_SCALE} from './east-approach';
import {HOME_TERRAIN} from './terrain-art';
export const TERRAIN_CHUNKS=manifest.chunks;
export const ROAD_CHUNKS=TERRAIN_CHUNKS.filter(t=>t.layer==='road');
export const CAMP_CHUNKS=TERRAIN_CHUNKS.filter(t=>t.layer==='camp');
export const CAMP_CHUNK_IMAGES=Object.fromEntries(CAMP_CHUNKS.flatMap(t=>t.levels.map(l=>[l.key,l.url])));
export const RIVER_TEXTURE_SIZES=new Map(manifest.rivers.map(p=>[p.key,p]));
export const TERRAIN_CHUNK_IMAGES=Object.fromEntries(TERRAIN_CHUNKS.flatMap(t=>t.levels.map(l=>[l.key,l.url])));
// Promote before the currently displayed level has to stretch its texels.
const campOverviewDensity=HOME_TERRAIN.width/HOME_TERRAIN.fullSize/EAST_TERRAIN_SCALE;
const campHalfDensity=.5/EAST_TERRAIN_SCALE;
export function campTerrainDivisor(pixelsPerWorldUnit:number){
 if(pixelsPerWorldUnit<campOverviewDensity)return 4;
 return pixelsPerWorldUnit>=campHalfDensity?1:2;
}
export function streamPatches(layer:'road'|'camp'){
 const half=layer==='camp'?campHalfDensity:.55/EAST_TERRAIN_SCALE;
 const overview=layer==='camp'?campOverviewDensity:.19/EAST_TERRAIN_SCALE;
 return TERRAIN_CHUNKS.filter(t=>t.layer===layer).flatMap(t=>t.levels.map(l=>({
  key:l.key,x:t.x,y:t.y,width:t.width,height:t.height,bytes:l.bytes,
  minPixelsPerWorldUnit:l.divisor===1?half:overview,
  maxPixelsPerWorldUnit:l.divisor===2?half:Infinity,
 })));
}

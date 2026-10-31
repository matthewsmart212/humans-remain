import manifest from './terrain-stream-manifest.json';
import {EAST_TERRAIN_SCALE} from './east-approach';
export const TERRAIN_CHUNKS=manifest.chunks;
export const ROAD_CHUNKS=TERRAIN_CHUNKS.filter(t=>t.layer==='road');
export const CAMP_CHUNKS=TERRAIN_CHUNKS.filter(t=>t.layer==='camp');
export const RIVER_TEXTURE_SIZES=new Map(manifest.rivers.map(p=>[p.key,p]));
export const TERRAIN_CHUNK_IMAGES=Object.fromEntries(TERRAIN_CHUNKS.flatMap(t=>t.levels.map(l=>[l.key,l.url])));
export const streamPatches=(layer:'road'|'camp')=>TERRAIN_CHUNKS.filter(t=>t.layer===layer).flatMap(t=>t.levels.map(l=>({
 key:l.key,x:t.x,y:t.y,width:t.width,height:t.height,bytes:l.bytes,
 // Select resolution by screen texel density, including device pixel ratio.
 minPixelsPerWorldUnit:(l.divisor===1?.55:layer==='road'?.19:.28)/EAST_TERRAIN_SCALE,
 maxPixelsPerWorldUnit:l.divisor===2?.55/EAST_TERRAIN_SCALE:Infinity,
})));

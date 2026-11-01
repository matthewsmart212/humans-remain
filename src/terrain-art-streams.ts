import {RoadArtStream} from './road-art-stream';
import {RIVER_SECTIONS,RIVER_DETAIL_IMAGES} from './river-art';
import {TERRAIN_CHUNK_IMAGES,streamPatches,RIVER_TEXTURE_SIZES} from './terrain-stream-art';
import {EAST_TERRAIN_SCALE} from './east-approach';
import type {ArtworkPriority} from './artwork-loading';
import {RIVER_DETAIL_PATCHES,riverDetailDensity} from './river-detail';
import type {GamePerformanceRecorder} from './performance-recording';

/** Shared quality thresholds, lookahead and texture budgets for both platforms.
 * The camp budget must hold the retained ring around the player; a smaller one
 * evicts chunks seconds after they load and reloads them whenever the player turns. */
export function createTerrainArtStreams(load:(sources:Record<string,string>,priority?:ArtworkPriority)=>Promise<void>,release:(keys:string[])=>void,promote?:(keys:string[])=>void,diagnostics?:GamePerformanceRecorder){
 const roads=new RoadArtStream(load,release,undefined,promote,diagnostics);
 const camp=new RoadArtStream(load,release,{name:'camp',patches:streamPatches('camp'),sources:TERRAIN_CHUNK_IMAGES,maxBytes:48*1024*1024},promote,diagnostics);
 const rivers=new RoadArtStream(load,release,{name:'rivers',patches:[...RIVER_SECTIONS.map(p=>({...p,bytes:RIVER_TEXTURE_SIZES.get(p.key)!.bytes,minPixelsPerWorldUnit:RIVER_TEXTURE_SIZES.get(p.key)!.previewDensity/EAST_TERRAIN_SCALE*1.15,maxPixelsPerWorldUnit:riverDetailDensity(p.batch)})),...RIVER_DETAIL_PATCHES.map(p=>({...p,minPixelsPerWorldUnit:riverDetailDensity(p.batch)}))],sources:RIVER_DETAIL_IMAGES,maxBytes:20*1024*1024},promote,diagnostics);
 return {roads,camp,rivers,dispose(){roads.dispose();camp.dispose();rivers.dispose()}};
}

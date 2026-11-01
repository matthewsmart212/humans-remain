import {RoadArtStream,type ArtworkStreamPolicy} from './road-art-stream';
import {RIVER_SECTIONS,RIVER_DETAIL_IMAGES} from './river-art';
import {TERRAIN_CHUNK_IMAGES,streamPatches,RIVER_TEXTURE_SIZES} from './terrain-stream-art';
import {EAST_TERRAIN_SCALE} from './east-approach';
import type {ArtworkPriority} from './artwork-loading';
import {RIVER_DETAIL_PATCHES,riverDetailDensity} from './river-detail';
import type {GamePerformanceRecorder} from './performance-recording';

// iOS has more preparation lead time, not lower-resolution artwork. Reserve
// at most 40 MiB extra detail bytes (156 vs 116 MiB across three layers); visible
// coverage can still raise a layer's floor at unusual viewport/zoom sizes.
export const NATIVE_TERRAIN_STREAM_POLICY:ArtworkStreamPolicy={prefetchMargin:1000,retainMargin:2800,lookaheadMs:3200,maxLead:1500,residencyMs:4000};
/** Shared quality thresholds; the native profile adds bounded preparation lead.
 * The camp budget must hold the retained ring around the player; a smaller one
 * evicts chunks seconds after they load and reloads them whenever the player turns. */
export function createTerrainArtStreams(load:(sources:Record<string,string>,priority?:ArtworkPriority)=>Promise<void>,release:(keys:string[])=>void,promote?:(keys:string[])=>void,diagnostics?:GamePerformanceRecorder,profile:'default'|'native'='default'){
 const policy=profile==='native'?NATIVE_TERRAIN_STREAM_POLICY:undefined;
 const roads=new RoadArtStream(load,release,{name:'roads',patches:streamPatches('road'),sources:TERRAIN_CHUNK_IMAGES,maxBytes:(policy?64:48)*1024*1024,policy},promote,diagnostics);
 const camp=new RoadArtStream(load,release,{name:'camp',patches:streamPatches('camp'),sources:TERRAIN_CHUNK_IMAGES,maxBytes:(policy?64:48)*1024*1024,policy},promote,diagnostics);
 const rivers=new RoadArtStream(load,release,{name:'rivers',patches:[...RIVER_SECTIONS.map(p=>({...p,bytes:RIVER_TEXTURE_SIZES.get(p.key)!.bytes,minPixelsPerWorldUnit:RIVER_TEXTURE_SIZES.get(p.key)!.previewDensity/EAST_TERRAIN_SCALE*1.15,maxPixelsPerWorldUnit:riverDetailDensity(p.batch)})),...RIVER_DETAIL_PATCHES.map(p=>({...p,minPixelsPerWorldUnit:riverDetailDensity(p.batch)}))],sources:RIVER_DETAIL_IMAGES,maxBytes:(policy?28:20)*1024*1024,policy},promote,diagnostics);
 return {roads,camp,rivers,async settled(){await Promise.all([roads.settled(),camp.settled(),rivers.settled()]);if(roads.visibleMissing||camp.visibleMissing||rivers.visibleMissing)throw new Error('Nearby terrain detail could not load. Please retry.')},dispose(){roads.dispose();camp.dispose();rivers.dispose()}};
}

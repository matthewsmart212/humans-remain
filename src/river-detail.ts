import manifest from './river-detail-manifest.json';
import {EAST_TERRAIN_SCALE} from './east-approach';
export type RiverDetailPatch={key:string;batch:number;x:number;y:number;width:number;height:number;sample:{x:number;y:number;width:number;height:number};image:string;bytes:number};
export const RIVER_DETAIL_PATCHES=manifest.patches as RiverDetailPatch[];
export const RIVER_DETAIL_BY_BATCH=new Map(manifest.batches.map(b=>[b.batch,RIVER_DETAIL_PATCHES.filter(p=>p.batch===b.batch)]));
export const RIVER_DETAIL_CHUNK_IMAGES=Object.fromEntries(RIVER_DETAIL_PATCHES.map(p=>[p.key,p.image]));
export const RIVER_MEDIUM_IMAGES=Object.fromEntries((manifest.sections as {key:string;image:string}[]).map(p=>[p.key,p.image]));
export const RIVER_HIGH_PREVIEW_IMAGES=Object.fromEntries((manifest.sections as {key:string;preview:string}[]).map(p=>[p.key+'Preview',p.preview]));
export const riverDetailDensity=(batch:number)=>{const b=(manifest.batches as {batch:number;mediumDensity:number}[]).find(b=>b.batch===batch);return b?b.mediumDensity/EAST_TERRAIN_SCALE*.95:Infinity};

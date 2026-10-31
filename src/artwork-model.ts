import type {AnimationMode,AnimationArea} from './asset-animation';
import type {AssetCollision} from './asset-collision';
import type {CustomAsset} from './custom-assets';
/** Persisted artwork is versioned independently of catalogue IDs and approval marks. */
export type ArtworkFile={id:string;url:string;name:string;mime:string;width:number;height:number;bytes:number};
export type BuildingShape={left:number;top:number;right:number;bottom:number;doorSide:'south'|'north'|'east'|'west';doorStart:number;doorEnd:number};
export type ArtworkConfig={kind:'sprite'|'building';base:ArtworkFile;frames:ArtworkFile[];animationMode?:AnimationMode;animationArea?:AnimationArea;roof?:ArtworkFile;unlit?:ArtworkFile;fps:number;worldWidth:number;anchor:[number,number];solid:boolean;allowTransparency?:boolean;footprint:{width:number;depth:number};building?:BuildingShape;collision?:AssetCollision};
export type ArtworkRecord={id:string;revision:number;updatedAt:string;config:ArtworkConfig;customAsset?:CustomAsset};
export const MAX_ART_FILE=20*1024*1024;
export const defaultBuilding:BuildingShape={left:.08,top:.25,right:.92,bottom:.94,doorSide:'south',doorStart:.36,doorEnd:.64};
export function artworkUrls(a:ArtworkRecord){return [a.config.base,...a.config.frames,a.config.roof,a.config.unlit].filter((x):x is ArtworkFile=>!!x)}

import type {ArtworkRecord} from './artwork-model';
import type {AssetCollision} from './asset-collision';
import exports from './camp-worksites-exports.json';

export const WORKSITE_ROOT='/survival/camp-craft-v2';
export const WAREHOUSE_ASSET_ID='misc_ceaf1a05-5426-45df-8a51-d3e2e07c6f9f';
export const WAREHOUSE_ARTWORK={empty:WORKSITE_ROOT+'/warehouse-empty.webp',half:WORKSITE_ROOT+'/warehouse-half.webp',full:WORKSITE_ROOT+'/warehouse-full.webp'};
export const WAREHOUSE_ANCHOR:[number,number]=[.5,.84];
// Trace the diagonal ground footprint, never the elevated eaves or chimney.
export const WAREHOUSE_COLLISION:AssetCollision={lineWidth:.008,paths:[{closed:true,points:[[.06,.64],[.51,.42],[.94,.70],[.94,.79],[.76,.84],[.65,.77],[.64,.66],[.60,.64],[.40,.64],[.23,.76],[.06,.70]]}]};
export const FURNACE_COLLISION:AssetCollision={lineWidth:.008,paths:[{closed:true,points:[[.08,.74],[.33,.67],[.64,.63],[.92,.72],[.92,.77],[.69,.88],[.29,.93],[.08,.84]]}]};
export const FURNACE_FIREBOX={x:.600,y:.535,width:.217,height:.198,light:[.482,.60] as const,
 points:[[.602,.730],[.607,.649],[.637,.590],[.680,.552],[.723,.536],[.767,.555],[.798,.607],[.814,.701]] as const};

/** Replace this approved source only. Future owner-uploaded artwork wins. */
export function resolveWorksiteWarehouse(record:ArtworkRecord):ArtworkRecord{
 const c=record.config;
 if(record.id!==WAREHOUSE_ASSET_ID||c.base.id!=='511df250-f10f-4b4e-8b9d-f091fe490070'||c.kind!=='sprite'||c.frames.length||c.roof||c.unlit)return record;
 const file=exports.find(f=>f.name==='warehouse-full')!;
 return {...record,config:{...c,base:{...c.base,url:WAREHOUSE_ARTWORK.full,name:'warehouse-full.webp',mime:'image/webp',width:file.width,height:file.height,bytes:file.bytes},worldWidth:1254,anchor:WAREHOUSE_ANCHOR,collision:WAREHOUSE_COLLISION}};
}

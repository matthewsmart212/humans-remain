import {FISHING_PIER_IMAGE,FISHING_PIER_SIZE,FISHING_PIER_WIDTH,FISHING_PIER_ANCHOR} from './fishing-site-art';

export type FishingPierMetadata={
 image:string;size:readonly [number,number];crop:readonly [number,number,number,number];
 width:number;height:number;anchor:readonly [number,number];
};
type PierAsset={image:string;crop:readonly number[];width:number;height:number;anchor:readonly number[]};
const approved:FishingPierMetadata={
 image:FISHING_PIER_IMAGE,size:FISHING_PIER_SIZE,crop:[0,0,...FISHING_PIER_SIZE],
 width:FISHING_PIER_WIDTH,height:FISHING_PIER_WIDTH*FISHING_PIER_SIZE[1]/FISHING_PIER_SIZE[0],
 anchor:FISHING_PIER_ANCHOR,
};
let current=approved;

/** The registry supplies active artwork after imports are installed. Keeping
 * this data here lets water collision read it without importing the registry. */
export function installFishingPierMetadata(asset?:PierAsset){
 current=asset?{
  image:asset.image,size:[asset.crop[2],asset.crop[3]],
  crop:[asset.crop[0],asset.crop[1],asset.crop[2],asset.crop[3]],
  width:asset.width,height:asset.height,
  anchor:[asset.anchor[0]/asset.crop[2],asset.anchor[1]/asset.crop[3]],
 }:approved;
}
export function fishingPierMetadata():FishingPierMetadata{return current}

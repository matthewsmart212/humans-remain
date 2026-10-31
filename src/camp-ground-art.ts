import registration from './camp-ground-art.json';
import type {GroundArtwork,WorldAsset} from './world-assets';

/** Match known artwork only: a later replacement upload keeps its own footprint. */
export function groundForCampArt(image:string):GroundArtwork|undefined{
 const entry=registration.find(g=>g.sources.includes(image));
 if(!entry)return undefined;
 return {image:entry.image,size:entry.size as [number,number],rect:entry.rect as [number,number,number,number]};
}
export function addCampGround(asset:WorldAsset):WorldAsset{
 const ground=groundForCampArt(asset.image);
 return ground?{...asset,ground}:asset;
}

import {entries} from './catalogue-model';
import retired from './asset-library-retired.json';

const catalogueIds=new Set(entries.map(e=>e.id));
const retiredCustomIds=new Set(retired.customAssetIds);

/** One-time library cleanup, not a live 'placed only' filter. New uploads remain
 * available before placement, and removing a placement never deletes its asset. */
export function isLibraryAssetId(id:string){
 return catalogueIds.has(id)||(id.startsWith('misc_')&&!retiredCustomIds.has(id));
}

/** Tier 2 walls are selected on a placed wall, rather than duplicating every
 * wall piece in the palette. Legacy game assets remain resolvable internally. */
export function libraryAssets<T extends {id:string}>(assets:readonly T[]):T[]{
 return assets.filter(a=>isLibraryAssetId(a.id));
}

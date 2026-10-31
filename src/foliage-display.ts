import type {WorldAsset} from './world-assets';

/** A local workspace view preference, never a change to saved placements. */
const KEY='safety-last-foliage-hidden';
export const isFoliageAsset=(asset?:Pick<WorldAsset,'id'|'foliage'>)=>!!asset&&(!!asset.foliage||asset.id==='prop_tree'||asset.id.startsWith('art_tree_')||asset.id.startsWith('art_forage_'));
export function readFoliageHidden(){try{return localStorage.getItem(KEY)==='true'}catch{return false}}
export function rememberFoliageHidden(hidden:boolean){try{localStorage.setItem(KEY,String(hidden))}catch{}}

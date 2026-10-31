import thumbnails from './headquarters-thumbnails.json';

/** Menu-sized copies prevent a second set of full-size world textures in Safari.
 * Unknown/custom artwork keeps its original URL instead of showing stale art. */
export function headquartersMenuImage(path:string){
 return (thumbnails as Record<string,string>)[path]??path;
}
export const headquartersMenuSource=(path:string)=>({uri:headquartersMenuImage(path)});

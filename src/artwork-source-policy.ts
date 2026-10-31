import retiredPaths from './retired-artwork-paths.json';
const retired=new Set(retiredPaths);
/** Historical downloads removed from the app must not remain in the library UI. */
export const currentArtworkSources=(urls:readonly string[]|undefined)=>urls?.filter(url=>!retired.has(url));

/** Shared 768px footprint for the approved four-bed garden, before and after repair. */
export const GARDEN_FAMILY='Potato patch';
export const GARDEN_PLACEMENT_ID='camp-garden-v1';
/** Hidden compatibility ID for worlds saved with the retired second tier. */
export const GARDEN_LEGACY_ID='art_camp_garden_t2';
export const GARDEN_CANVAS=768;
export const GARDEN_ANCHOR=[.5,.90] as const;
export const GARDEN_WIDTH=340;
export const GARDEN_ART=[
 {id:'art_camp_garden_broken',tier:0,name:'Broken potato patch',file:'broken'},
 {id:'art_camp_garden_t1',tier:1,name:'Potato patch – Tier 1',file:'tier-1-stage-0'},
].map(a=>({...a,image:`/survival/potato-patch-v2/${a.file}.webp`,size:[GARDEN_CANVAS,GARDEN_CANVAS] as [number,number],worldWidth:GARDEN_WIDTH}));
export const GARDEN_IDS=new Set([...GARDEN_ART.map(a=>a.id),GARDEN_LEGACY_ID]);
/** Ground contact only: no invisible wall underneath the greenhouse's roof. */
export const GARDEN_COLLISION={lineWidth:.01,paths:[] as {closed:boolean;points:[number,number][]}[]};

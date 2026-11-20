import type {AssetCollision,CollisionPoint} from './asset-collision';

/** Shared 768px footprint for the approved four-bed garden, before and after repair. */
export const GARDEN_FAMILY='Vegetable patch';
export const GARDEN_PLACEMENT_ID='camp-garden-v1';
/** Hidden compatibility ID for worlds saved with the retired second tier. */
export const GARDEN_LEGACY_ID='art_camp_garden_t2';
export const GARDEN_CANVAS=768;
export const GARDEN_ANCHOR=[.5,.90] as const;
export const GARDEN_WIDTH=340;
export const GARDEN_ART=[
 {id:'art_camp_garden_broken',tier:0,name:'Broken vegetable patch',file:'broken'},
 {id:'art_camp_garden_t1',tier:1,name:'Vegetable patch – Tier 1',file:'tier-1-stage-0'},
].map(a=>({...a,image:`/survival/potato-patch-v2/${a.file}.webp`,size:[GARDEN_CANVAS,GARDEN_CANVAS] as [number,number],worldWidth:GARDEN_WIDTH}));
export const GARDEN_IDS=new Set([...GARDEN_ART.map(a=>a.id),GARDEN_LEGACY_ID]);
// Both sprites have the same opening between the two front gateposts.
export const GARDEN_GATE_CENTRE=[.662,.780] as const;
export const GARDEN_FENCE_FEET:CollisionPoint[]=[
 [.565,.809],[.301,.851],[.070,.520],[.615,.312],[.925,.685],[.758,.751],
];
export const GARDEN_COLLISION:AssetCollision={
 lineWidth:.014,
 paths:[{closed:false,points:GARDEN_FENCE_FEET}],
};

/** Four individually planted positions on the approved square-padded painted asset.
 * Keep these in this order so every crop belongs to a real, visible soil bed. */
export const BED_CENTRES=[[.303,.485],[.570,.417],[.427,.650],[.700,.590]] as const;

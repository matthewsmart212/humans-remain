/** Source crops and measured ground-contact anchors, in source pixels.
 * Individual PNG masters are preserved; runtime crops do not alter their alpha.
 */
export const CAMP_ART={
 campHearth:{crop:[234,238,984,711],anchor:[494,694]},
 campWell:{crop:[189,73,1091,1012],anchor:[471,995]},
 campFlame:{crop:[340,72,643,1101],anchor:[321,1090]},
} as const;

/** Every lit AND unlit export shares the same canvas and ground pivot. Only the
 * flame layer changes: never trim or fit individual frames to their alpha bounds.
 * Tiers beyond one remain artwork previews, not implemented gameplay upgrades.
 */
export const HEARTH_FRAME_SIZE=1024,HEARTH_FRAME_COUNT=8,HEARTH_FPS=10;
export const HEARTH_ART_ROOT='/survival/bonfire-v3';
export const HEARTH_GROUND_ANCHOR=[512,960] as const;
export const hearthFrameUrl=(tier:1|2|3,frame:number|'unlit')=>`${HEARTH_ART_ROOT}/tier-${tier}-${frame==='unlit'?'unlit':`flame-${frame}`}.webp`;
export const HEARTH_ART={
 1:{name:'Camp bonfire',width:112,litPrefix:'hearth1Frame',unlit:'hearth1Off',litAnchor:HEARTH_GROUND_ANCHOR,unlitAnchor:HEARTH_GROUND_ANCHOR},
 2:{name:'Braced bonfire',width:132,litPrefix:'hearth2Frame',unlit:'hearth2Off',litAnchor:HEARTH_GROUND_ANCHOR,unlitAnchor:HEARTH_GROUND_ANCHOR},
 3:{name:'Cooking bonfire',width:164,litPrefix:'hearth3Frame',unlit:'hearth3Off',litAnchor:HEARTH_GROUND_ANCHOR,unlitAnchor:HEARTH_GROUND_ANCHOR},
} as const;
export type HearthTier=keyof typeof HEARTH_ART;

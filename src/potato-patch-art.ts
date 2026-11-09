/** Approved 9 November 2026 potato illustrations, shared by web and iOS. */
export const POTATO_PATCH_ROOT='/survival/potato-patch-v2';
export const potatoStageUrl=(tier:1|2,stage:0|1|2|3|4|5)=>
 `${POTATO_PATCH_ROOT}/tier-${tier}-stage-${stage}.webp`;
export const POTATO_PATCH_BROKEN=`${POTATO_PATCH_ROOT}/broken.webp`;
export const POTATO_WILD_RIPE=`${POTATO_PATCH_ROOT}/wild-ripe.webp`;
export const POTATO_WILD_PICKED=`${POTATO_PATCH_ROOT}/wild-picked.webp`;
export const POTATO_ITEM_IMAGE=`${POTATO_PATCH_ROOT}/potato-item.webp`;
export const POTATO_PATCH_IMAGES=[
 POTATO_PATCH_BROKEN,
 ...([1,2] as const).flatMap(tier=>([0,1,2,3,4,5] as const).map(stage=>potatoStageUrl(tier,stage))),
 POTATO_WILD_RIPE,POTATO_WILD_PICKED,POTATO_ITEM_IMAGE,
];

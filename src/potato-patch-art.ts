/** The four-plot painted garden replaces the former patch in web and iOS. */
export const POTATO_PATCH_ROOT='/survival/potato-patch-v2';
/** Growth is now drawn separately into the four real beds, so the fence and beds never swap artwork. */
export const potatoStageUrl=(_tier:1,_stage:0|1|2|3|4|5)=>
 `${POTATO_PATCH_ROOT}/tier-1-stage-0.webp`;
export const POTATO_PATCH_BROKEN=`${POTATO_PATCH_ROOT}/broken.webp`;
export const POTATO_PATCH_IMAGES=[
 POTATO_PATCH_BROKEN,
 potatoStageUrl(1,0),
];

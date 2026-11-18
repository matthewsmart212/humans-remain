import type {CropKind} from './potato-farming';
export const CROP_ROOT='/survival/vegetable-crops-v1';
const GARDEN_CROP_ROOT='/survival/vegetable-garden-v1';
export const cropStage=(growth:number)=>growth>=1?3:growth>=.6?2:growth>=.25?1:0;
export const cropStageUrl=(kind:CropKind,stage:number)=>`${CROP_ROOT}/${kind}-stage-${stage}.webp`;
export const gardenCropStageUrl=(kind:CropKind,stage:number)=>`${GARDEN_CROP_ROOT}/${kind}-stage-${stage}.webp`;
export const cropPickedUrl=(kind:CropKind)=>`${CROP_ROOT}/${kind}-picked.webp`;
export const cropItemUrl=(kind:CropKind)=>`${CROP_ROOT}/${kind}-item.webp`;
export const CROP_IMAGES=(['potato','carrot'] as const).flatMap(kind=>[
 ...[0,1,2,3].map(stage=>gardenCropStageUrl(kind,stage)),cropStageUrl(kind,3),cropPickedUrl(kind),cropItemUrl(kind),
]);

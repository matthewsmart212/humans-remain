import type {CropKind} from './potato-farming';
const CROP_ITEM_ROOT='/survival/vegetable-crops-v1';
const GARDEN_CROP_ROOT='/survival/vegetable-garden-v1';
export const WILD_FORAGE_ROOT='/survival/woodland-forage-v2';
export const cropStage=(growth:number)=>growth>=1?3:growth>=.6?2:growth>=.25?1:0;
export const cropRipeUrl=(kind:CropKind)=>`${WILD_FORAGE_ROOT}/wild-${kind}.webp`;
export const gardenCropStageUrl=(kind:CropKind,stage:number)=>`${GARDEN_CROP_ROOT}/${kind}-stage-${stage}.webp`;
export const cropPickedUrl=(kind:CropKind)=>`${WILD_FORAGE_ROOT}/wild-${kind}-picked.webp`;
export const cropItemUrl=(kind:CropKind)=>`${CROP_ITEM_ROOT}/${kind}-item.webp`;
export const CROP_IMAGES=(['potato','carrot'] as const).flatMap(kind=>[
 ...[0,1,2,3].map(stage=>gardenCropStageUrl(kind,stage)),cropItemUrl(kind),
]);

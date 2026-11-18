import {buildingRestored} from './camp-restoration';
import {gardenBeds,potatoGrowth,type CropKind} from './potato-farming';
import {cropStage,cropStageUrl,cropPickedUrl,gardenCropStageUrl} from './crop-art';
import {POTATO_PATCH_BROKEN,potatoStageUrl} from './potato-patch-art';
import {assetImageKey} from './world-assets';
import {placementBounds,type Placement} from './world-layout';
import type {World} from './survival-engine';

type Ctx=CanvasRenderingContext2D;
type LoadedImages=Record<string,HTMLImageElement>;

/** Four individually planted positions on the approved square-padded painted asset.
 * Keep these in this order so every crop belongs to a real, visible soil bed. */
export const BED_CENTRES=[[.303,.485],[.570,.417],[.427,.650],[.700,.590]] as const;
// Four small plants follow each bed's two sloping rows. Roots stay on the soil.
const BED_PLANTS=[[-.055,-.014],[.034,-.034],[-.025,.030],[.064,.010]] as const;

/** Editor and real survival both carry editorPreview=true. In an active run,
 * progression must take precedence so the unbuilt garden starts broken even if
 * the saved world placement was selected as a repaired variant in the editor. */
export function potatoPatchImageForWorld(w:Pick<World,'editorPreview'|'progression'>,assetId:string){
 const broken=w.progression
  ?!buildingRestored(w,'garden')
  :w.editorPreview?assetId==='art_camp_garden_broken':!buildingRestored(w,'garden');
 return broken?POTATO_PATCH_BROKEN:potatoStageUrl(1,0);
}

/** Two identical anchors: broken until repaired, with planted crops only after repair. */
export function drawPotatoPatch(ctx:Ctx,imgs:LoadedImages,w:World,p:Placement){
 if(!p.assetId.startsWith('art_camp_garden_'))return false;
 const imageUrl=potatoPatchImageForWorld(w,p.assetId);
 const broken=imageUrl===POTATO_PATCH_BROKEN;
 const beds=gardenBeds(w);
 const sprite=imgs[assetImageKey(imageUrl)];
 if(!sprite)return false;
 const bounds=placementBounds(p),width=bounds.width,height=bounds.height;
 const left=bounds.x,top=bounds.y;
 ctx.drawImage(sprite,left,top,width,height);
 if(broken)return true;
 for(let index=0;index<BED_CENTRES.length;index++){
  const crop=beds[index];if(!crop)continue;
  const plant=imgs[assetImageKey(gardenCropStageUrl(crop.kind,cropStage(potatoGrowth(w,crop.plantedAt))))];
  if(!plant)continue;
  const [rx,ry]=BED_CENTRES[index],size=width*.13;
  for(const [dx,dy] of BED_PLANTS){
   const x=left+(rx+dx)*width,y=top+(ry+dy)*height;
   ctx.drawImage(plant,x-size*.5,y-size*.86,size,size);
  }
 }
 return true;
}

/** Wild forage uses its own ripe and picked sprites. */
export function drawWildPotatoPlant(ctx:Ctx,imgs:LoadedImages,w:World,p:Placement,ripe:boolean,kind:CropKind='potato'){
 const image=imgs[assetImageKey(ripe?cropStageUrl(kind,3):cropPickedUrl(kind))];
 if(!image)return false;
 const bounds=placementBounds(p);
 ctx.drawImage(image,bounds.x,bounds.y,bounds.width,bounds.height);
 return true;
}

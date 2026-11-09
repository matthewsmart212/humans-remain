import {buildingRestored} from './camp-restoration';
import {potatoGrowth,potatoPatch} from './potato-farming';
import {POTATO_PATCH_BROKEN,POTATO_WILD_PICKED,POTATO_WILD_RIPE,potatoStageUrl} from './potato-patch-art';
import {assetImageKey} from './world-assets';
import {placementBounds,type Placement} from './world-layout';
import {timeOf,type World} from './survival-engine';

type Ctx=CanvasRenderingContext2D;
type LoadedImages=Record<string,HTMLImageElement>;

/** The game uses the approved paintings directly; no procedural fence or foliage.
 * All frames for a tier share the same anchor and texture dimensions. */
export function drawPotatoPatch(ctx:Ctx,imgs:LoadedImages,w:World,p:Placement){
 if(!p.assetId.startsWith('art_camp_garden_'))return false;
 const broken=!buildingRestored(w,'garden')||(p.assetId==='art_camp_garden_broken'&&!w.progression);
 const patch=potatoPatch(w);
 const tier=broken?0:(w.editorPreview&&p.assetId==='art_camp_garden_t2'?2:patch.tier);
 let imageUrl=POTATO_PATCH_BROKEN;
 if(tier){
  const highestGrowth=patch.plantedAt.length?Math.max(...patch.plantedAt.map(start=>potatoGrowth(w,start))):0;
  const recentlyHarvested=!patch.plantedAt.length&&patch.harvestedAt!==undefined&&timeOf(w)-patch.harvestedAt<8;
  const stage=recentlyHarvested?5:!patch.plantedAt.length?0:Math.min(4,Math.floor(highestGrowth*5)) as 0|1|2|3|4|5;
  imageUrl=potatoStageUrl(tier,stage);
 }
 const sprite=imgs[assetImageKey(imageUrl)];
 if(!sprite)return false;
 const bounds=placementBounds(p),scale=tier===2?1.12:1;
 const width=bounds.width*scale,height=bounds.height*scale;
 ctx.drawImage(sprite,bounds.x-(width-bounds.width)/2,bounds.y+bounds.height-height,width,height);
 return true;
}

/** The same shared artwork is used before and after a wild potato is picked. */
export function drawWildPotatoPlant(ctx:Ctx,imgs:LoadedImages,w:World,p:Placement,ripe:boolean){
 const image=imgs[assetImageKey(ripe?POTATO_WILD_RIPE:POTATO_WILD_PICKED)];
 if(!image)return false;
 const bounds=placementBounds(p);
 ctx.drawImage(image,bounds.x,bounds.y,bounds.width,bounds.height);
 return true;
}

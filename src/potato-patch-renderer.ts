import {buildingRestored} from './camp-restoration';
import {potatoGrowth,potatoPatch} from './potato-farming';
import {POTATO_PATCH_BROKEN,POTATO_WILD_PICKED,POTATO_WILD_RIPE,potatoStageUrl} from './potato-patch-art';
import {assetImageKey} from './world-assets';
import {placementBounds,type Placement} from './world-layout';
import type {World} from './survival-engine';

type Ctx=CanvasRenderingContext2D;
type LoadedImages=Record<string,HTMLImageElement>;

/** Four individually planted positions on the approved square-padded painted asset.
 * Keep these in this order so every crop belongs to a real, visible soil bed. */
const BED_CENTRES=[[.345,.485],[.632,.443],[.404,.677],[.716,.645]] as const;

/** Draw only the living crop on top of the fixed garden illustration.
 * Former stage paintings must never replace the new fence or the four beds. */
function drawPotatoSprout(ctx:Ctx,x:number,y:number,scale:number,growth:number){
 const g=Math.max(0,Math.min(1,growth));
 const radius=(2.5+7*Math.pow(g,.7))*scale;
 ctx.save();
 ctx.fillStyle='rgba(48,31,15,0.24)';
 ctx.beginPath();ctx.arc(x,y+radius*.4,radius*.86,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#52662d';ctx.lineWidth=Math.max(.8,radius*.19);
 ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-radius*.85);ctx.stroke();
 const leaves=[[-.87,-.48,.68,'#567b30'],[.87,-.58,.68,'#6a8a38'],[-.52,-1.03,.61,'#8a9d46'],[.54,-1.10,.65,'#6e8d38'],[0,-1.32,.52,'#91a451']] as const;
 for(const [dx,dy,ratio,color] of leaves){
  ctx.fillStyle=color;ctx.beginPath();ctx.arc(x+dx*radius,y+dy*radius,radius*ratio,0,Math.PI*2);ctx.fill();
 }
 if(g>=.93){
  ctx.fillStyle='#d0c58b';
  for(const [dx,dy] of [[-.4,-.9],[.35,-.65],[.05,-1.28]]){
   ctx.beginPath();ctx.arc(x+dx*radius,y+dy*radius,radius*.16,0,Math.PI*2);ctx.fill();
  }
 }
 ctx.restore();
}

/** One fixed road-facing four-plot asset for broken, Tier 1 and Tier 2.
 * Repairs, planting, harvesting, and upgrade logic are unchanged. */
export function drawPotatoPatch(ctx:Ctx,imgs:LoadedImages,w:World,p:Placement){
 if(!p.assetId.startsWith('art_camp_garden_'))return false;
 const broken=!buildingRestored(w,'garden')||(p.assetId==='art_camp_garden_broken'&&!w.progression);
 const patch=potatoPatch(w);
 const tier=broken?0:(w.editorPreview&&p.assetId==='art_camp_garden_t2'?2:patch.tier);
 const imageUrl=tier?potatoStageUrl(tier,0):POTATO_PATCH_BROKEN;
 const sprite=imgs[assetImageKey(imageUrl)];
 if(!sprite)return false;
 const bounds=placementBounds(p),scale=tier===2?1.12:1;
 const width=bounds.width*scale,height=bounds.height*scale;
 const left=bounds.x-(width-bounds.width)/2,top=bounds.y+bounds.height-height;
 ctx.drawImage(sprite,left,top,width,height);
 if(!tier||w.editorPreview)return true;
 for(let index=0;index<patch.plantedAt.length&&index<BED_CENTRES.length;index++){
  const [rx,ry]=BED_CENTRES[index];
  drawPotatoSprout(ctx,left+rx*width,top+ry*height,width/340,potatoGrowth(w,patch.plantedAt[index]));
 }
 return true;
}

/** Wild potatoes continue to use their own existing sprite pair. */
export function drawWildPotatoPlant(ctx:Ctx,imgs:LoadedImages,w:World,p:Placement,ripe:boolean){
 const image=imgs[assetImageKey(ripe?POTATO_WILD_RIPE:POTATO_WILD_PICKED)];
 if(!image)return false;
 const bounds=placementBounds(p);
 ctx.drawImage(image,bounds.x,bounds.y,bounds.width,bounds.height);
 return true;
}

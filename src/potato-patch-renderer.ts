import {buildingRestored} from './camp-restoration';
import {gardenBeds,potatoGrowth,type CropKind} from './potato-farming';
import {cropStage,cropRipeUrl,cropPickedUrl,gardenCropStageUrl} from './crop-art';
import {POTATO_PATCH_BROKEN,potatoStageUrl} from './potato-patch-art';
import {ASSET_BY_ID,assetImageKey} from './world-assets';
import {drawFoliage} from './foliage-renderer';
import {BED_CENTRES,GARDEN_IDS,GARDEN_FENCE_FEET} from './camp-garden-art';
import {placementBounds,placementPoint,type Placement} from './world-layout';
import type {World} from './survival-engine';

type Ctx=CanvasRenderingContext2D;
type LoadedImages=Record<string,HTMLImageElement>;

export {BED_CENTRES} from './camp-garden-art';
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

// Rails traced on a 400-unit reference of the square sprite. The two front
// panels end at the painted gateposts. Keep the open earth between them clear.
// Order follows GARDEN_FENCE_FEET, starting at the left post of the gate.
const FENCE_PANELS:readonly (readonly [number,number][])[]=[
 [[103,280],[113,270],[126,274],[131,294],[145,286],[153,288],[208,274],[209,268],[225,264],[237,270],[235,316],[222,325],[184,338],[168,350],[137,346],[125,340],[112,345]],
 [[10,165],[31,162],[48,191],[56,190],[62,209],[75,231],[84,235],[90,249],[111,272],[123,278],[124,337],[104,331],[80,294],[42,244],[15,213]],
 [[5,145],[25,130],[41,141],[88,120],[113,118],[128,116],[128,103],[145,99],[156,111],[190,97],[222,92],[231,88],[232,81],[251,76],[260,90],[252,134],[146,160],[41,187],[29,213],[12,209]],
 [[244,96],[260,96],[300,137],[309,144],[316,160],[344,182],[364,198],[379,203],[389,219],[384,276],[365,283],[352,239],[298,181],[247,132]],
 [[291,253],[303,241],[316,248],[349,236],[359,231],[355,215],[367,204],[380,207],[389,224],[384,276],[374,285],[314,307],[298,311],[291,301]],
];

type PatchDrawable={y:number;ground?:boolean;draw:()=>void};

export function potatoPatchDrawables(ctx:Ctx,imgs:LoadedImages,w:World,p:Placement):PatchDrawable[]|undefined{
 if(!GARDEN_IDS.has(p.assetId))return;
 const imageUrl=potatoPatchImageForWorld(w,p.assetId);
 const sprite=imgs[assetImageKey(imageUrl)];
 if(!sprite)return;
 const b=placementBounds(p),drawSprite=()=>ctx.drawImage(sprite,b.x,b.y,b.width,b.height);
 const draws:PatchDrawable[]=[{y:-Infinity,ground:true,draw:drawSprite}];
 const feet=GARDEN_FENCE_FEET.map(([u,v])=>placementPoint(p,b.x+u*b.width,b.y+v*b.height));
 for(const [index,panel] of FENCE_PANELS.entries()){
  const [ax,ay]=feet[index],[bx,by]=feet[index+1],dx=bx-ax,dy=by-ay;
  // A long sloping fence changes depth along its length. Sample its footing
  // at the survivor's screen x after applying the placement transform.
  const t=Math.max(0,Math.min(1,Math.abs(dx)>1?(w.player.x-ax)/dx:(w.player.y-ay)/(dy||1)));
  draws.push({y:ay+t*dy,draw:()=>{
   ctx.save();ctx.beginPath();
   panel.forEach(([u,v],i)=>{
    const x=b.x+u/400*b.width,y=b.y+v/400*b.height;
    if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
   });
   ctx.closePath();ctx.clip();drawSprite();ctx.restore();
  }});
 }
 if(imageUrl===POTATO_PATCH_BROKEN)return draws;
 for(const [index,crop] of gardenBeds(w).entries()){
  if(!crop)continue;
  const plant=imgs[assetImageKey(gardenCropStageUrl(crop.kind,cropStage(potatoGrowth(w,crop.plantedAt))))];
  if(!plant)continue;
  const [rx,ry]=BED_CENTRES[index],size=b.width*.13;
  for(const [dx,dy] of BED_PLANTS){
   const x=b.x+(rx+dx)*b.width,y=b.y+(ry+dy)*b.height;
   draws.push({y:placementPoint(p,x,y)[1],draw:()=>ctx.drawImage(plant,x-size*.5,y-size*.86,size,size)});
  }
 }
 return draws;
}

/** Wild forage uses its own ripe and picked sprites. */
export function drawWildPotatoPlant(ctx:Ctx,imgs:LoadedImages,w:World,p:Placement,ripe:boolean,kind:CropKind='potato',animate=true){
 const image=imgs[assetImageKey(ripe?cropRipeUrl(kind):cropPickedUrl(kind))];
 if(!image)return false;
 const asset=ASSET_BY_ID.get(p.assetId);
 if(ripe&&asset&&animate&&w.foliageMotions?.[p.id]){
  drawFoliage(ctx,image,w,p,asset);
  return true;
 }
 const bounds=placementBounds(p);
 ctx.drawImage(image,bounds.x,bounds.y,bounds.width,bounds.height);
 return true;
}

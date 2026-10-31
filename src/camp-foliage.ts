import field from './camp-planting.json';
import {usesPaintedHomeTerrain} from './terrain-art';
import {ASSET_BY_ID} from './world-assets';
import {MAX_LAYOUT_ITEMS} from './layout-limits';
import {MAP_WIDTH,MAP_HEIGHT} from './factory-map';
import {newPlacement,placementBounds,placementPoint,placementLimits,insideBuilding,layoutBlocked,type Placement,type WorldLayout} from './world-layout';
export const CAMP_FOLIAGE_PREFIX='camp-natural-v1-';
/** One approved full-terrain conversion. The actual selected draft is the source:
 * it is never replaced with a historical fixture or a prebuilt saved layout. */
export function addApprovedCampFoliage(layout:WorldLayout):WorldLayout{
 if(layout.terrainFoliageVersion||!usesPaintedHomeTerrain(layout.terrainImage))return layout;
 const fire=layout.items.find(p=>p.id==='06c42057-0d46-43ef-977b-f183d7c50561'&&p.role==='hearth');
 if(!fire)return layout;
 if(layout.items.some(p=>p.id.startsWith(CAMP_FOLIAGE_PREFIX)))return{...layout,terrainFoliageVersion:1};
 const structures=layout.items.filter(p=>ASSET_BY_ID.get(p.assetId)?.interior);
 const features=layout.items.filter(p=>!ASSET_BY_ID.get(p.assetId)?.foliage&&p.id!=='e8fa45f8-d2c4-4ae0-a463-98d4550869a9'&&!ASSET_BY_ID.get(p.assetId)?.interior&&p.layer!==-8);
 const oldPlants=layout.items.filter(p=>ASSET_BY_ID.get(p.assetId)?.foliage);
 const additions:Placement[]=[];
 for(let i=0;i<field.items.length;i++){
  const [index,x,y,scale,rotation,flip]=field.items[i],assetId=field.assets[index];if(!ASSET_BY_ID.has(assetId))continue;
  const p:Placement={...newPlacement(assetId,x,y),id:CAMP_FOLIAGE_PREFIX+(i+1),scale,rotation,flipX:!!flip,locked:false,allowTransparency:false,solid:false,layer:0};
  const b=placementBounds(p),limits=placementLimits(assetId),cx=b.x+b.width/2,cy=b.y+b.height/2;
  if(x<limits.left||x>limits.right||y<limits.top||y>limits.bottom)continue;
  // Keep the existing planted clearing, cooking area and walking approach.
  if(Math.hypot((cx-fire.x)/1.1,cy-fire.y)<250||cy>fire.y-40&&cy<fire.y+570&&Math.abs(cx-fire.x)<190)continue;
  if(oldPlants.some(q=>Math.hypot(q.x-x,q.y-y)<75))continue;
  if(structures.some(q=>insideBuilding(q,cx,cy)||insideBuilding(q,b.x,b.y)||insideBuilding(q,b.x+b.width,b.y)||insideBuilding(q,b.x,b.y+b.height)||insideBuilding(q,b.x+b.width,b.y+b.height)))continue;
  if(features.some(q=>{const r=placementBounds(q);return cx>r.x-35&&cx<r.x+r.width+35&&cy>r.y-15&&cy<r.y+r.height+45}))continue;
  if(x>45&&x<MAP_WIDTH-45&&y>45&&y<MAP_HEIGHT-45&&layoutBlocked(layout,x,y,32))continue;
  additions.push(p);
 }
 // Do not mark a partial upgrade as complete when an unusually busy draft is full.
 if(layout.items.length+additions.length>MAX_LAYOUT_ITEMS)return layout;
 return{...layout,terrainFoliageVersion:1,items:[...layout.items,...additions],updatedAt:new Date().toISOString()};
}

// Traced from the inside of the camp's stone ring on the registered 1200px
// terrain preview. This follows the actual clearing, not a radius around a fire
// that the owner may subsequently move. Paths and the outer woodland stay put.
export const CAMP_INNER_RING=([
 [592,361],[652,372],[712,395],[757,424],[788,471],[810,530],
 [827,594],[818,649],[791,699],[753,738],[704,768],[650,787],
 [590,795],[534,787],[486,768],[444,738],[410,701],[386,650],
 [378,595],[384,537],[400,485],[432,439],[477,404],[532,377],
] as const).map(([x,y])=>[(x-150)/900*MAP_WIDTH,(y-150)/900*MAP_HEIGHT] as const);
export function inCampInnerRing(x:number,y:number){
 let inside=false;
 for(let i=0,j=CAMP_INNER_RING.length-1;i<CAMP_INNER_RING.length;j=i++){
  const [ax,ay]=CAMP_INNER_RING[i],[bx,by]=CAMP_INNER_RING[j];
  if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
 }
 return inside;
}
/** Include the crown as well as the root, so a shrub outside the ring cannot
 * leave half its leaves hanging into the newly cleared fighting/cooking area. */
export function foliageOverlapsInnerRing(p:Placement){
 if(inCampInnerRing(p.x,p.y))return true;
 const b=placementBounds(p);
 for(const u of [.12,.5,.88])for(const v of [.15,.5,.85]){
  const [x,y]=placementPoint(p,b.x+u*b.width,b.y+v*b.height);
  if(inCampInnerRing(x,y))return true;
 }
 return false;
}
const randomAt=(x:number,y:number,seed:number)=>{
 let h=Math.imul(x^seed,374761393)+Math.imul(y,668265263);
 h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;
};
const smooth=(n:number)=>n*n*(3-2*n);
function fieldNoise(x:number,y:number,span:number,seed:number){
 x/=span;y/=span;const ix=Math.floor(x),iy=Math.floor(y),u=smooth(x-ix),v=smooth(y-iy);
 const a=randomAt(ix,iy,seed)*(1-u)+randomAt(ix+1,iy,seed)*u;
 const b=randomAt(ix,iy+1,seed)*(1-u)+randomAt(ix+1,iy+1,seed)*u;
 return a*(1-v)+b*v;
}
function originalNaturalPlant(p:Placement){
 if(!p.id.startsWith(CAMP_FOLIAGE_PREFIX))return false;
 const slot=Number(p.id.slice(CAMP_FOLIAGE_PREFIX.length))-1,source=field.items[slot];
 if(!source)return false;const [index,x,y,scale,rotation,flip]=source;
 return p.assetId===field.assets[index]&&p.x===x&&p.y===y&&p.scale===scale&&
  (p.rotation||0)===rotation&&!!p.flipX===!!flip&&!p.flipY&&!p.locked&&!p.frame&&
  !p.solid&&!p.collision&&!p.footprint&&(p.layer??0)===0&&p.allowTransparency===false;
}
/** One-time polish of the existing living woodland. Never regenerates removed
 * plants, relocates owner edits, or overwrites an unrelated terrain upload. */
export function refineApprovedCampFoliage(layout:WorldLayout):WorldLayout{
 if(layout.terrainFoliageVersion!==1||!usesPaintedHomeTerrain(layout.terrainImage))return layout;
 const items:Placement[]=[];
 for(const p of layout.items){
  if(!ASSET_BY_ID.get(p.assetId)?.foliage){items.push(p);continue}
  if(foliageOverlapsInnerRing(p))continue;
  if(!originalNaturalPlant(p)){items.push(p);continue}
  const id=Number(p.id.slice(CAMP_FOLIAGE_PREFIX.length));
  // Smooth, neighbouring decisions form irregular open pockets and dense
  // thickets, rather than independently scattering gaps like confetti.
  const patch=fieldNoise(p.x,p.y,490,71)*.72+fieldNoise(p.x,p.y,205,19)*.28;
  const edge=Math.max(0,Math.min(1,(patch-.29)/.22));
  if(patch<.28||randomAt(id,3,53)>.34+edge*.64)continue;
  const community=fieldNoise(p.x,p.y,670,113),choice=randomAt(id,5,41);
  const low=edge<.45||randomAt(id,7,79)<.30;
  const palette=low?['forest_ivy','fern','ochre_meadow_grass','forest_ivy','white_woodland_flowers']:
   community<.42?['forest_ivy','blue_fern','sage_fan','moss_rosette','berry_bramble','forest_ivy']:
   community>.6?['copper_leaf','moss_rosette','yellow_woodland_flowers','sage_fan','berry_bramble','lime_rosette']:
   ['moss_rosette','forest_ivy','blue_fern','sage_fan','flower_leaf_clump','lime_rosette','berry_bramble'];
  const assetId='art_foliage_'+palette[Math.min(palette.length-1,Math.floor(choice*palette.length))],a=ASSET_BY_ID.get(assetId)!;
  const width=low?65+randomAt(id,11,37)*62:120+randomAt(id,13,89)*90;
  // Keep the leafy centre on the original sampled ground. Changes in anchor
  // height must not slide the crown across a stone path or into a building.
  const old=placementBounds(p),scale=+(width/a.width).toFixed(3),height=a.height*scale;
  const q:Placement={...p,assetId,scale,x:old.x+old.width/2+(a.anchor[0]/a.crop[2]-.5)*width,
   y:old.y+old.height/2+(a.anchor[1]/a.crop[3]-.5)*height};
  const limits=placementLimits(assetId);
  if(q.x<limits.left||q.x>limits.right||q.y<limits.top||q.y>limits.bottom||foliageOverlapsInnerRing(q))continue;
  items.push(q);
 }
 return{...layout,terrainFoliageVersion:2,items,updatedAt:new Date().toISOString()};
}

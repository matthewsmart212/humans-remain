import {FISHING_PIER_ID,FISHING_PIER_PLACEMENT_ID,FISHING_REEDS_ID,FISHING_REEDS_IMAGE,FISHING_REEDS_VISIBLE_BOUNDS,FISHING_PIER_DECK} from './fishing-site-art';
import {fishingPierDeckContains,fishingPierGeometry} from './fishing-site-geometry';
import {foliageEnvelope} from './foliage-composition';
import {MAX_LAYOUT_ITEMS} from './layout-limits';
import {riverWaterBlocked} from './river-collision';
import {usesPaintedHomeTerrain} from './terrain-art';
import {ASSET_BY_ID} from './world-assets';
import {campContains} from './world-bounds';
import {layoutBlocked,placementArtPoint,type Placement,type WorldLayout} from './world-layout';

type Point={x:number;y:number};
type Rect={x:number;y:number;width:number;height:number};
export const FISHING_REEDS_PLACEMENT_IDS=['stillwater-fishing-reeds-north','stillwater-fishing-reeds-south'] as const;
// Bank-end anchors on the existing lake's eastern shore. The deck extends
// southwest over the water, with the open approach facing the camp.
const sites=[{x:-1470,y:6500},{x:-1330,y:6800},{x:-1430,y:7000}];
const ids=new Set<string>([FISHING_PIER_PLACEMENT_ID,...FISHING_REEDS_PLACEMENT_IDS]);
const assetIds=new Set([FISHING_PIER_ID,FISHING_REEDS_ID]);

function siteItems(site:Point):Placement[]{
 return [
  {id:FISHING_PIER_PLACEMENT_ID,assetId:FISHING_PIER_ID,...site,
   scale:1,solid:true,allowTransparency:false,role:'prop',roof:'auto'},
  {id:FISHING_REEDS_PLACEMENT_IDS[0],assetId:FISHING_REEDS_ID,
   x:site.x-10,y:site.y-140,scale:1.3,solid:false,role:'prop',roof:'auto'},
  {id:FISHING_REEDS_PLACEMENT_IDS[1],assetId:FISHING_REEDS_ID,
   x:site.x+150,y:site.y+245,scale:1.4,flipX:true,solid:false,role:'prop',roof:'auto'},
 ];
}
const overlaps=(a:Rect,b:Rect,pad=16)=>a.x+a.width>b.x-pad&&a.x<b.x+b.width+pad&&a.y+a.height>b.y-pad&&a.y<b.y+b.height+pad;
function newPieceEnvelope(p:Placement):Rect{
 if(p.assetId!==FISHING_REEDS_ID||ASSET_BY_ID.get(p.assetId)?.image!==FISHING_REEDS_IMAGE)return foliageEnvelope(p);
 const [left,top,right,bottom]=FISHING_REEDS_VISIBLE_BOUNDS;
 const points=[[left,top],[right,top],[right,bottom],[left,bottom]].map(([u,v])=>placementArtPoint(p,u,v));
 const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
 return {x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
}
function siteClear(layout:WorldLayout,items:Placement[],occupied:Rect[]){
 const [pier]=items,boxes=items.map(newPieceEnvelope);
 if(boxes.some(box=>occupied.some(existing=>overlaps(box,existing))))return false;
 for(const b of boxes)for(const u of [0,.5,1])for(const v of [0,.5,1]){
  if(!campContains(layout,b.x+b.width*u,b.y+b.height*v,25))return false;
 }
 // Check raw water, before the new deck can grant a walking surface. Keep a
 // generous dry entry and a clear approach instead of deleting shore scenery.
 for(let step=0;step<=6;step++){
  const x=pier.x+step*20,y=pier.y-step*10;
  if(riverWaterBlocked(x,y,35)||layoutBlocked(layout,x,y,35))return false;
 }
 // A bank-side prop is only a jetty when useful standing room reaches water.
 // The reeds may touch shallow water; they never provide a walking surface.
 const b=fishingPierGeometry(pier).deckBounds;
 let wetDeck=0;
 for(let y=b.y+19;y<b.y+b.height-19;y+=28)for(let x=b.x+19;x<b.x+b.width-19;x+=28){
  if(fishingPierDeckContains(pier,x,y,19)&&riverWaterBlocked(x,y,19)&&++wetDeck>=4)return true;
 }
 return false;
}

/** Add the approved visual site once, retaining owner moves and removals. */
export function placeStillwaterFishingSite(layout:WorldLayout):WorldLayout{
 if(layout.fishingSiteVersion!==undefined||!usesPaintedHomeTerrain(layout.terrainImage))return layout;
 // An unmarked editor copy can already contain an authored pier or reeds.
 // Mark that copy without replacing pieces or restoring deliberately missing art.
 if(layout.items.some(p=>ids.has(p.id)||assetIds.has(p.assetId)))return {...layout,fishingSiteVersion:1};
 if(layout.items.length+3>MAX_LAYOUT_ITEMS||!layout.items.some(p=>p.id==='camp-circular-wall-v1-14'))return layout;
 if(FISHING_PIER_DECK.length<3||!ASSET_BY_ID.has(FISHING_PIER_ID)||!ASSET_BY_ID.has(FISHING_REEDS_ID))return layout;
 const occupied=layout.items.map(p=>p.frame||ASSET_BY_ID.has(p.assetId)
  ?foliageEnvelope(p):{x:p.x-128,y:p.y-128,width:256,height:256});
 for(const site of sites){
  const items=siteItems(site);
  if(siteClear(layout,items,occupied))return {...layout,fishingSiteVersion:1,items:[...layout.items,...items]};
 }
 return layout;
}

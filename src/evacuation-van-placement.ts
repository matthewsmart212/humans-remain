import {
 EVACUATION_VAN_ID,EVACUATION_BACKPACK_ID,
 EVACUATION_VAN_PLACEMENT_ID,EVACUATION_BACKPACK_PLACEMENT_ID,
} from './evacuation-van-art';
import {foliageEnvelope} from './foliage-composition';
import {MAX_LAYOUT_ITEMS} from './layout-limits';
import {riverWaterBlocked} from './river-collision';
import {usesPaintedHomeTerrain} from './terrain-art';
import {ASSET_BY_ID} from './world-assets';
import {campContains} from './world-bounds';
import type {Placement,WorldLayout} from './world-layout';

type Point={x:number;y:number};
type Rect={x:number;y:number;width:number;height:number};
// Surveyed dry clearings south of camp. The second site is farther southwest.
const sites=[{x:1000,y:5400},{x:-600,y:5600},{x:3000,y:5600}];
const ids=new Set([EVACUATION_VAN_PLACEMENT_ID,EVACUATION_BACKPACK_PLACEMENT_ID]);
const assetIds=new Set([EVACUATION_VAN_ID,EVACUATION_BACKPACK_ID]);

function siteItems(site:Point):Placement[]{
 return [
  {id:EVACUATION_VAN_PLACEMENT_ID,assetId:EVACUATION_VAN_ID,...site,
   scale:1,solid:true,role:'prop',roof:'auto'},
  {id:EVACUATION_BACKPACK_PLACEMENT_ID,assetId:EVACUATION_BACKPACK_ID,
   x:site.x+300,y:site.y-200,scale:1,solid:false,role:'prop',roof:'auto'},
 ];
}
const overlaps=(a:Rect,b:Rect)=>a.x+a.width>b.x&&a.x<b.x+b.width&&a.y+a.height>b.y&&a.y<b.y+b.height;
function siteClear(layout:WorldLayout,items:Placement[],occupied:Rect[]){
 const boxes=items.map(foliageEnvelope),pad=70;
 const left=Math.min(...boxes.map(b=>b.x))-pad,top=Math.min(...boxes.map(b=>b.y))-pad;
 const right=Math.max(...boxes.map(b=>b.x+b.width))+pad,bottom=Math.max(...boxes.map(b=>b.y+b.height))+pad;
 const plot={x:left,y:top,width:right-left,height:bottom-top};
 if(occupied.some(b=>overlaps(plot,b)))return false;
 // Check the complete site, including its approach, against actual river masks.
 // Existing scenery is never moved or culled to force a candidate to fit.
 const columns=Math.ceil(plot.width/50),rows=Math.ceil(plot.height/50);
 for(let i=0;i<=columns;i++)for(let j=0;j<=rows;j++){
  const x=left+plot.width*i/columns,y=top+plot.height*j/rows;
  if(!campContains(layout,x,y,25)||riverWaterBlocked(x,y,25))return false;
 }
 return true;
}

/** Add the wreck and separate backpack once; owner moves and removals survive. */
export function placeEvacuationVan(layout:WorldLayout):WorldLayout{
 if(layout.evacuationVanVersion===1||!usesPaintedHomeTerrain(layout.terrainImage))return layout;
 // An unversioned editor copy may already contain one or both pieces. Treat it
 // as authored rather than replacing it or restoring a deliberately absent part.
 if(layout.items.some(p=>ids.has(p.id)||assetIds.has(p.assetId)))return {...layout,evacuationVanVersion:1};
 if(layout.items.length+2>MAX_LAYOUT_ITEMS||!layout.items.some(p=>p.id==='camp-circular-wall-v1-14'))return layout;
 const occupied=layout.items.map(p=>p.frame||ASSET_BY_ID.has(p.assetId)
  ?foliageEnvelope(p):{x:p.x-128,y:p.y-128,width:256,height:256});
 for(const site of sites){
  const items=siteItems(site);
  if(siteClear(layout,items,occupied))return {...layout,evacuationVanVersion:1,items:[...layout.items,...items]};
 }
 return layout;
}

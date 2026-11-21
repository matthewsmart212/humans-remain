import {foliageEnvelope} from './foliage-composition';
import {MAX_LAYOUT_ITEMS} from './layout-limits';
import {SMALLHOLDING_COTTAGE_ID} from './smallholding-cottage';
import {smallholdingCrops} from './smallholding-crops';
import {smallholdingFences} from './smallholding-fences';
import {smallholdingPath} from './smallholding-path';
import {usesPaintedHomeTerrain} from './terrain-art';
import {WOODEN_LOOT_ID} from './wooden-loot-art';
import {ASSET_BY_ID} from './world-assets';
import {placementArtPoint,type Placement,type WorldLayout} from './world-layout';

export const SOUTHEAST_SMALLHOLDING='southeast-smallholding-cottage';

// Dry meadow clearings beyond the southeast road. The alternate sites are for
// owner-edited camps where something already occupies the first clearing.
const sites=[{x:3040,y:4980},{x:3760,y:5375},{x:4195,y:5255}];

function smallholdingItems(origin:{x:number;y:number}):Placement[]{
 const {x,y}=origin;
 // The painted front door sits left of the cottage centre, aligned with the path.
 const cottage:Placement={id:SOUTHEAST_SMALLHOLDING,assetId:SMALLHOLDING_COTTAGE_ID,
  x:x+98,y:y-160,scale:1,solid:true,locked:true,role:'prop',roof:'auto'};
 const chest:Placement={id:cottage.id+'-chest',assetId:WOODEN_LOOT_ID,
  ...placementArtPoint(cottage,.606,.60),scale:.75,solid:true,locked:true,role:'prop',roof:'auto'};
 const path:Placement={id:'smallholding-footpath',assetId:smallholdingPath.id,
  x,y:y+229,scale:1,layer:-7,solid:false,locked:true,role:'prop',roof:'auto'};
 const verge=[
  ['forest_ivy',-470,288,.77],['copper_leaf',371,375,.89],['ochre_meadow_grass',-140,449,.7],
  ['white_woodland_flowers',-462,-61,.74],['fern',474,-217,.78],['forest_ivy',463,48,.91],
  ['ochre_meadow_grass',152,-38,.75],
 ] as const;
 const weeds=verge.map(([name,dx,dy,scale],index):Placement=>({
  id:'smallholding-verge-'+(index+1),assetId:'art_foliage_'+name,x:x+dx,y:y+dy,scale,
  solid:false,locked:true,role:'prop',roof:'auto',
 }));
 return [path,...smallholdingFences(origin),...smallholdingCrops(origin),...weeds,cottage,chest];
}

export function placeSoutheastSmallholding(layout:WorldLayout):WorldLayout{
 if(layout.smallholdingVersion===1||!usesPaintedHomeTerrain(layout.terrainImage))return layout;
 if(!layout.items.some(p=>p.id==='camp-circular-wall-v1-14'))return layout;
 if(layout.items.some(p=>p.id===SOUTHEAST_SMALLHOLDING))return {...layout,smallholdingVersion:1};
 const occupied=layout.items.map(p=>{
  // Published worlds can contain owner-uploaded sprites whose artwork has
  // not loaded yet. Reserve their location even if no frame data is available.
  const bounds=p.frame||ASSET_BY_ID.has(p.assetId)?foliageEnvelope(p):{x:p.x-128,y:p.y-128,width:256,height:256};
  return {bounds,foliage:!p.solid&&p.assetId.startsWith('art_foliage_')};
 });
 const site=sites.find(({x,y})=>occupied.every(({bounds:b,foliage})=>{
  // Meadows can grow around the enclosure. Keep the full cottage painting
  // clear, including the interior plate that sorts behind its furnishings.
  if(foliage)return b.x+b.width<x-202||b.x>x+398||b.y+b.height<y-483||b.y>y-83;
  return b.x+b.width<x-610||b.x>x+610||b.y+b.height<y-590||b.y>y+550;
 }));
 if(!site)return layout;
 const additions=smallholdingItems(site);
 if(layout.items.length+additions.length>MAX_LAYOUT_ITEMS)return layout;
 const ids=new Set(layout.items.map(p=>p.id));
 if(additions.some(p=>ids.has(p.id)))return layout;
 return {...layout,smallholdingVersion:1,items:[...layout.items,...additions]};
}

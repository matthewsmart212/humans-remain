import {foliageEnvelope} from './foliage-composition';
import {MAX_LAYOUT_ITEMS} from './layout-limits';
import {SMALLHOLDING_COTTAGE_ID} from './smallholding-cottage';
import {smallholdingCrops} from './smallholding-crops';
import {smallholdingYard,yardPoint} from './smallholding-yard';
import {usesPaintedHomeTerrain} from './terrain-art';
import {WOODEN_LOOT_ID} from './wooden-loot-art';
import {ASSET_BY_ID} from './world-assets';
import {insideBuilding,placementArtPoint,type Placement,type WorldLayout} from './world-layout';

export const SOUTHEAST_SMALLHOLDING='southeast-smallholding-cottage';
type Point={x:number;y:number};
// Cottage anchors in the original southeast clearing and the two alternate sites.
const sites=[{x:3138,y:4820},{x:3858,y:5215},{x:4293,y:5095}];
const oldSitePart=/^smallholding-(footpath|fence-(gate|back|(west|east)-[0-4]-[01])|verge-[1-7]|(potato|carrot)-(bed|[1-5]))$/;
const meadowPlant=(p:Placement)=>p.assetId.startsWith('art_foliage_')&&!p.solid&&!p.frame&&!p.collision&&/^(camp-fringe-v1-|world-plant-v1-|scenery-cluster-v1-)/.test(p.id);
function smallholdingItems(site:Point):Placement[]{
 const cottage:Placement={id:SOUTHEAST_SMALLHOLDING,assetId:SMALLHOLDING_COTTAGE_ID,
  ...site,scale:1.48,solid:true,locked:true,role:'prop',roof:'auto'};
 const chest:Placement={id:cottage.id+'-chest',assetId:WOODEN_LOOT_ID,
  ...placementArtPoint(cottage,.606,.60),scale:.85,solid:true,locked:true,role:'prop',roof:'auto'};
 return [...smallholdingYard(site),...smallholdingCrops(site),cottage,chest];
}

export function placeSoutheastSmallholding(layout:WorldLayout):WorldLayout{
 if(layout.smallholdingVersion===2||!usesPaintedHomeTerrain(layout.terrainImage))return layout;
 if(!layout.items.some(p=>p.id==='camp-circular-wall-v1-14'))return layout;
 const old=layout.items.find(p=>p.id===SOUTHEAST_SMALLHOLDING);
 if(layout.smallholdingVersion===1&&!old)return {...layout,smallholdingVersion:2};
 const keep=old?layout.items.filter(p=>p!==old&&p.id!==old.id+'-chest'&&!oldSitePart.test(p.id)):layout.items;
 const occupied=keep.filter(p=>!meadowPlant(p)).map(p=>p.frame||ASSET_BY_ID.has(p.assetId)
  ?foliageEnvelope(p):{x:p.x-128,y:p.y-128,width:256,height:256});
 const candidates=old?[old,...sites]:sites;
 const site=candidates.find(s=>occupied.every(b=>
  b.x+b.width<s.x-910||b.x>s.x+715||b.y+b.height<s.y-560||b.y>s.y+780));
 if(!site)return layout;
 const additions=smallholdingItems({x:site.x,y:site.y});
 // Retire seeded meadow clumps in the painted plot, including the cottage floor.
 // Other editor placements and existing inventory/forage state keep their identities.
 const nw=yardPoint(site,90,-40),se=yardPoint(site,1320,741);
 const items=keep.filter(p=>!meadowPlant(p)||p.x<nw.x||p.x>se.x||p.y<nw.y||p.y>se.y);
 if(items.length+additions.length>MAX_LAYOUT_ITEMS)return layout;
 const ids=new Set(items.map(p=>p.id));
 if(additions.some(p=>ids.has(p.id)))return layout;
 return {...layout,smallholdingVersion:2,items:[...items,...additions]};
}

export function smallholdingReturnPoint(before:WorldLayout,after:WorldLayout,point:Point){
 if(before.smallholdingVersion!==1||after.smallholdingVersion!==2)return;
 const old=before.items.find(p=>p.id===SOUTHEAST_SMALLHOLDING);
 const cottage=after.items.find(p=>p.id===SOUTHEAST_SMALLHOLDING);
 if(!old||!cottage||!insideBuilding(old,point.x,point.y))return;
 const ratio=cottage.scale/old.scale;
 return {x:cottage.x+(point.x-old.x)*ratio,y:cottage.y+(point.y-old.y)*ratio};
}

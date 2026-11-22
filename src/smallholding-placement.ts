import {foliageEnvelope} from './foliage-composition';
import {MAX_LAYOUT_ITEMS} from './layout-limits';
import {SMALLHOLDING_COTTAGE_ID,SOUTHEAST_SMALLHOLDING} from './smallholding-cottage';
import {smallholdingCrops} from './smallholding-crops';
import {smallholdingYard,yardPoint} from './smallholding-yard';
import {usesPaintedHomeTerrain} from './terrain-art';
import {WOODEN_LOOT_ID} from './wooden-loot-art';
import {boundCampPoint} from './world-bounds';
import {translateTierPositions} from './world-tiers';
import {ASSET_BY_ID} from './world-assets';
import {insideBuilding,placementArtPoint,type Placement,type WorldLayout} from './world-layout';

export {SOUTHEAST_SMALLHOLDING};
type Point={x:number;y:number};
// Dry clearings beyond the southeast approaches, in order of preference.
const sites=[{x:6980,y:7530},{x:9220,y:7460},{x:9850,y:8370}];
const oldSitePart=/^smallholding-(footpath|fence-(gate|back|(west|east)-[0-4]-[01])|verge-[1-7]|(potato|carrot)-(bed|[1-5]))$/;
const meadowPlant=(p:Placement)=>p.assetId.startsWith('art_foliage_')&&!p.solid&&!p.frame&&!p.collision&&/^(camp-fringe-v1-|world-plant-v1-|scenery-cluster-v1-)/.test(p.id);
function smallholdingItems({x,y}:Point):Placement[]{
 const site={x,y};
 const cottage:Placement={id:SOUTHEAST_SMALLHOLDING,assetId:SMALLHOLDING_COTTAGE_ID,
  ...site,scale:1.48,solid:true,locked:true,role:'prop',roof:'auto'};
 const chest:Placement={id:cottage.id+'-chest',assetId:WOODEN_LOOT_ID,
  ...placementArtPoint(cottage,.606,.60),scale:1,solid:true,locked:true,role:'prop',roof:'auto'};
 return [...smallholdingYard(site),...smallholdingCrops(site),cottage,chest];
}

export function placeSoutheastSmallholding(layout:WorldLayout):WorldLayout{
 if(layout.smallholdingVersion===3||!usesPaintedHomeTerrain(layout.terrainImage))return layout;
 if(!layout.items.some(p=>p.id==='camp-circular-wall-v1-14'))return layout;
 const old=layout.items.find(p=>p.id===SOUTHEAST_SMALLHOLDING);
 if(layout.smallholdingVersion&&!old)return {...layout,smallholdingVersion:3};
 const siteIds=new Set(old?smallholdingItems(old).map(p=>p.id):[]);
 const keep=old?layout.items.filter(p=>!siteIds.has(p.id)&&(layout.smallholdingVersion===2||!oldSitePart.test(p.id))):layout.items;
 const occupied=keep.filter(p=>!meadowPlant(p)).map(p=>p.frame||ASSET_BY_ID.has(p.assetId)
  ?foliageEnvelope(p):{x:p.x-128,y:p.y-128,width:256,height:256});
 const site=sites.find(s=>occupied.every(b=>
  b.x+b.width<s.x-910||b.x>s.x+715||b.y+b.height<s.y-560||b.y>s.y+780));
 if(!site)return layout;
 // Move the existing v2 placements as a group, retaining edits, removed plants
 // and the stable IDs used by the harvesting and chest inventories.
 const additions=layout.smallholdingVersion===2&&old
  ?layout.items.filter(p=>siteIds.has(p.id)).map(p=>{
    const position={x:site.x+(p.x-old.x),y:site.y+(p.y-old.y)};
    const moved=translateTierPositions(p,position,point=>boundCampPoint(point,layout));
    return p.id===old.id+'-chest'&&p.scale===.85?{...moved,scale:1}:moved;
   })
  :smallholdingItems(site);
 // Retire seeded meadow clumps in the painted plot, including the cottage floor.
 // Other editor placements and existing inventory/forage state keep their identities.
 const nw=yardPoint(site,90,-40),se=yardPoint(site,1320,741);
 const items=keep.filter(p=>!meadowPlant(p)||p.x<nw.x||p.x>se.x||p.y<nw.y||p.y>se.y);
 if(items.length+additions.length>MAX_LAYOUT_ITEMS)return layout;
 const ids=new Set(items.map(p=>p.id));
 if(additions.some(p=>ids.has(p.id)))return layout;
 return {...layout,smallholdingVersion:3,items:[...items,...additions]};
}

export function smallholdingReturnPoint(before:WorldLayout,after:WorldLayout,point:Point){
 if(after.smallholdingVersion!==3||before.smallholdingVersion===3)return;
 const old=before.items.find(p=>p.id===SOUTHEAST_SMALLHOLDING);
 const cottage=after.items.find(p=>p.id===SOUTHEAST_SMALLHOLDING);
 if(!old||!cottage||!insideBuilding(old,point.x,point.y))return;
 const ratio=cottage.scale/old.scale;
 return {x:cottage.x+(point.x-old.x)*ratio,y:cottage.y+(point.y-old.y)*ratio};
}

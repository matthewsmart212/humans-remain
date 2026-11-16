import {FORAGE_ART} from './forage-art';
import {usesPaintedHomeTerrain} from './terrain-art';
import {campBounds,campContains} from './world-bounds';
import {riverWaterBlocked} from './river-collision';
import {layoutBlocked,type Placement,type WorldLayout} from './world-layout';
import {MAX_LAYOUT_ITEMS} from './layout-limits';
/** Deterministic one-time crops even on worlds that already contain forage. */
export function addWildPotatoes(layout:WorldLayout):WorldLayout{
 if(layout.potatoForageVersion===1||!usesPaintedHomeTerrain(layout.terrainImage))return layout;
 const art=FORAGE_ART.find(a=>a.kind==='potato');if(!art)return layout;
 const bounds=campBounds(layout),plants:Placement[]=[];let seed=0x5189a11;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 for(let tries=0;tries<1000&&plants.length<24;tries++){
  // Eight nearby plants make the new food loop discoverable without turning
  // the camp itself into a farm. The remaining plants reward exploration.
  const nearby=plants.length<8&&tries<550;
  const angle=random()*Math.PI*2,radius=1450+random()*1000;
  const x=nearby?layout.spawn.x+Math.cos(angle)*radius:bounds.left+80+random()*Math.max(1,bounds.width-160);
  const y=nearby?layout.spawn.y+Math.sin(angle)*radius:bounds.top+80+random()*Math.max(1,bounds.height-160);
  if(!campContains(layout,x,y,28)||riverWaterBlocked(x,y,28)||layoutBlocked(layout,x,y,38)||plants.some(p=>Math.hypot(x-p.x,y-p.y)<220))continue;
  plants.push({id:`wild-potato-v1-${plants.length}`,assetId:art.id,x,y,scale:.9+random()*.2,solid:false,roof:'auto',role:'prop'});
 }
 if(layout.items.length+plants.length>MAX_LAYOUT_ITEMS)return layout;
 return {...layout,potatoForageVersion:1,items:[...layout.items,...plants],updatedAt:new Date().toISOString()};
}

/** Carrots are a separate one-time migration, so existing potato worlds gain them too. */
export function addWildCarrots(layout:WorldLayout):WorldLayout{
 if(layout.carrotForageVersion===1||!usesPaintedHomeTerrain(layout.terrainImage))return layout;
 const art=FORAGE_ART.find(a=>a.kind==='carrot');if(!art)return layout;
 const plants:Placement[]=[],existing=layout.items.filter(p=>p.assetId===art.id);
 let seed=0xca7707;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const fire=layout.items.find(p=>p.role==='hearth'),cx=fire?.x??1718,cy=fire?.y??1574;
 for(let tries=0;tries<1800&&plants.length+existing.length<24;tries++){
  // Scatter outside the palisade, including plants just beyond the camp exits.
  const angle=random()*Math.PI*2,radius=1800+random()*1000;
  const x=cx+Math.cos(angle)*radius,y=cy+Math.sin(angle)*radius;
  if(!campContains(layout,x,y,28)||riverWaterBlocked(x,y,28)||layoutBlocked(layout,x,y,38)||[...existing,...plants].some(p=>Math.hypot(x-p.x,y-p.y)<180))continue;
  let approaches=0;
  for(let i=0;i<8;i++){const a=i*Math.PI/4,px=x+Math.cos(a)*75,py=y+Math.sin(a)*75;if(!layoutBlocked(layout,px,py,19)&&!riverWaterBlocked(px,py,19))approaches++}
  if(approaches<5)continue;
  plants.push({id:`wild-carrot-v1-${plants.length+existing.length}`,assetId:art.id,x,y,scale:.9+random()*.2,solid:false,roof:'auto',role:'prop'});
 }
 if(layout.items.length+plants.length>MAX_LAYOUT_ITEMS)return layout;
 return {...layout,carrotForageVersion:1,items:[...layout.items,...plants],updatedAt:new Date().toISOString()};
}

/** Easy-to-find ripe samples on opposite verges just outside the NW road exit.
 * Stable IDs retain picked state and any editor moves on subsequent loads. */
export function addNorthwestTestCrops(layout:WorldLayout):WorldLayout{
 if(!usesPaintedHomeTerrain(layout.terrainImage))return layout;
 const samples:Placement[]=[
  {id:'northwest-test-potato-v1',assetId:'art_forage_wild_potato',x:430,y:330,scale:1.15,solid:false,roof:'auto',role:'prop'},
  {id:'northwest-test-carrot-v1',assetId:'art_forage_wild_carrot',x:585,y:205,scale:1.15,solid:false,roof:'auto',role:'prop'},
 ];
 const missing=samples.filter(p=>!layout.items.some(q=>q.id===p.id));
 if(!missing.length||layout.items.length+missing.length>MAX_LAYOUT_ITEMS)return layout;
 return {...layout,items:[...layout.items,...missing],updatedAt:new Date().toISOString()};
}

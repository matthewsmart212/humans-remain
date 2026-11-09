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
 for(let tries=0;tries<700&&plants.length<16;tries++){
  const x=bounds.left+80+random()*Math.max(1,bounds.width-160),y=bounds.top+80+random()*Math.max(1,bounds.height-160);
  if(!campContains(layout,x,y,28)||riverWaterBlocked(x,y,28)||layoutBlocked(layout,x,y,38)||plants.some(p=>Math.hypot(x-p.x,y-p.y)<220))continue;
  plants.push({id:`wild-potato-v1-${plants.length}`,assetId:art.id,x,y,scale:.9+random()*.2,solid:false,roof:'auto',role:'prop'});
 }
 if(layout.items.length+plants.length>MAX_LAYOUT_ITEMS)return layout;
 return {...layout,potatoForageVersion:1,items:[...layout.items,...plants],updatedAt:new Date().toISOString()};
}

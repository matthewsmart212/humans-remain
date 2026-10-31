import planting from './camp-outskirts-planting.json';
import {usesPaintedHomeTerrain} from './terrain-art';
import {ASSET_BY_ID} from './world-assets';
import {MAX_LAYOUT_ITEMS} from './layout-limits';
import {layoutBlocked,placementBounds,type Placement,type WorldLayout} from './world-layout';

export const CAMP_OUTSKIRTS_PREFIX='camp-outskirts-v1-';
/** Approved first expansion, run once on the selected draft. Stored placements
 * remain editable; clearing a grove never regenerates it on the next load. */
export function addApprovedCampOutskirts(layout:WorldLayout):WorldLayout{
 if(layout.campOutskirtsVersion||!usesPaintedHomeTerrain(layout.terrainImage))return layout;
 const fire=layout.items.find(p=>p.id==='06c42057-0d46-43ef-977b-f183d7c50561'&&p.role==='hearth');
 if(!fire||Math.hypot(fire.x-1718.1676,fire.y-1573.5125)>160)return layout;
 if(layout.items.some(p=>p.id.startsWith(CAMP_OUTSKIRTS_PREFIX)))return{...layout,campOutskirtsVersion:1};
 const features=layout.items.filter(p=>{const a=ASSET_BY_ID.get(p.assetId);return a&&!a.foliage&&!a.puddle;});
 const additions=(planting.placements as Placement[]).filter(p=>{
  const a=ASSET_BY_ID.get(p.assetId);if(!a||layoutBlocked(layout,p.x,p.y,a.foliage?30:85))return false;
  // Respect anything the owner built after this planting pass was authored.
  return !features.some(q=>{const b=placementBounds(q);return p.x>b.x-75&&p.x<b.x+b.width+75&&p.y>b.y-40&&p.y<b.y+b.height+85;});
 }).map(p=>({...p}));
 if(layout.items.length+additions.length>MAX_LAYOUT_ITEMS)return layout;
 return{...layout,campOutskirtsVersion:1,items:[...layout.items,...additions],updatedAt:new Date().toISOString()};
}

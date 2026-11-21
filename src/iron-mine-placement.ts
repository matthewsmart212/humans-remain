import {IRON_MINE_ENTRANCE_ID} from './iron-mine-entrance';
import {MAX_LAYOUT_ITEMS} from './layout-limits';
import {usesPaintedHomeTerrain} from './terrain-art';
import type {Placement,WorldLayout} from './world-layout';

export const NORTHWEST_IRON_MINE='northwest-iron-mine';

// Face the track toward the end of the northwest logging road, across the western river.
const sites=[{x:-5460,y:-3000},{x:-5230,y:-3190},{x:-5690,y:-3130}];

export function placeNorthwestIronMine(layout:WorldLayout):WorldLayout{
 if(layout.ironMineVersion===1||!usesPaintedHomeTerrain(layout.terrainImage))return layout;
 if(layout.items.some(p=>p.assetId===IRON_MINE_ENTRANCE_ID||p.id===NORTHWEST_IRON_MINE))return {...layout,ironMineVersion:1};
 if(layout.items.length>=MAX_LAYOUT_ITEMS||!layout.items.some(p=>p.id==='camp-circular-wall-v1-14'))return layout;
 const site=sites.find(site=>!layout.items.some(p=>p.solid&&Math.abs(p.x-site.x)<405&&p.y>site.y-280&&p.y<site.y+190));
 if(!site)return layout;
 const entrance:Placement={id:NORTHWEST_IRON_MINE,assetId:IRON_MINE_ENTRANCE_ID,...site,scale:1,solid:true,role:'prop',roof:'auto'};
 return {...layout,ironMineVersion:1,items:[...layout.items,entrance]};
}

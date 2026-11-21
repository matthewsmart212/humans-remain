import {ABANDONED_CAMP_ID,ABANDONED_CAMP_WIDTH,ABANDONED_CAMP_SIZE} from './abandoned-camp-art';
import {MAX_LAYOUT_ITEMS} from './layout-limits';
import {usesPaintedHomeTerrain} from './terrain-art';
import type {Placement,WorldLayout} from './world-layout';

export const NORTHWEST_ABANDONED_CAMP='northwest-abandoned-woodland-camp';
const northwestCamp:Placement={
 id:NORTHWEST_ABANDONED_CAMP,assetId:ABANDONED_CAMP_ID,
 x:-115,y:710,scale:1,solid:true,role:'prop',roof:'auto',
};

/** Add the camp to the surveyed birch clearing once. Respect owner moves and deletions. */
export function placeNorthwestAbandonedCamp(layout:WorldLayout):WorldLayout{
 if(layout.abandonedCampVersion===1||!usesPaintedHomeTerrain(layout.terrainImage))return layout;
 if(layout.items.some(p=>p.id===northwestCamp.id))return {...layout,abandonedCampVersion:1};
 if(layout.items.length>=MAX_LAYOUT_ITEMS||!layout.items.some(p=>p.id==='camp-circular-wall-v1-14'))return layout;
 const halfWidth=ABANDONED_CAMP_WIDTH/2,halfHeight=halfWidth*ABANDONED_CAMP_SIZE[1]/ABANDONED_CAMP_SIZE[0];
 if(layout.items.some(p=>p.solid&&Math.abs(p.x-northwestCamp.x)<=halfWidth&&Math.abs(p.y-northwestCamp.y)<=halfHeight))return layout;
 return {...layout,abandonedCampVersion:1,items:[...layout.items,{...northwestCamp}]};
}

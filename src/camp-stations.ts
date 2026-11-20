import {placementPoint,type Placement,type WorldLayout} from './world-layout';
import {GROUND_SCALE} from './camp-buildings';

/** B1a: independent starter objects. Reserved upgrade lots NEVER collide.
 * Positions are per-run state; art, contact geometry and use sockets share one origin.
 * No build/move/upgrade UI is exposed until those lifecycle rules are implemented.
 */
export type StationId='hearth'|'well'|'storage';
export type StationPlacement={x:number;y:number;tier:1};
export type CampState={hearth:StationPlacement&{fuel:number};well:StationPlacement;storage:StationPlacement&{openedUntil:number}};
export const HEARTH_CAPACITY=480;
export const STATION_DEFS={
 hearth:{image:'campHearth',width:112,body:{hw:43,hh:23},useOffset:24,reserve:[384,352],label:'HEARTH'},
 well:{image:'campWell',width:138,body:{hw:46,hh:30},useOffset:24,reserve:[416,352],label:'WELL'},
 storage:{image:'salvage',width:118,body:{hw:46,hh:26},useOffset:24,reserve:[512,448],label:'SUPPLIES'},
} as const;
export const STATION_IDS:StationId[]=['hearth','well','storage'];
export function createCamp():CampState {
 const at=(x:number,y:number):StationPlacement=>({x:x*GROUND_SCALE,y:y*GROUND_SCALE,tier:1});
 return {hearth:{...at(609,724),fuel:180},well:at(446,735),storage:{...at(530,670),openedUntil:0}};
}
const stationPlacements=new WeakMap<WorldLayout,Partial<Record<StationId,Placement>>>();
export function stationFront(camp:CampState,id:StationId,layout?:WorldLayout){
 if(layout){
  let placed=stationPlacements.get(layout);
  if(!placed){
   placed={};
   for(const station of STATION_IDS)placed[station]=layout.items.find(p=>p.role===station);
   stationPlacements.set(layout,placed);
  }
  const p=placed[id];
  if(p){
   const [x,y]=placementPoint(p,p.x,p.y+STATION_DEFS[id].useOffset);
   return {x:camp[id].x+(x-p.x),y:camp[id].y+(y-p.y)};
  }
 }
 return {x:camp[id].x,y:camp[id].y+STATION_DEFS[id].useOffset};
}
export function stationBody(camp:CampState,id:StationId){const {hw,hh}=STATION_DEFS[id].body;return{x:camp[id].x,y:camp[id].y-hh,hw,hh}}

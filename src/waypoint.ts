import type {Vec,World} from './survival-engine';
import {worldBounds} from './world-bounds';

export type Waypoint=Vec&{sceneId:string};
export const WAYPOINT_PIN='M0 16C-3 10-12 2-12-6A12 12 0 1 1 12-6C12 2 3 10 0 16Z';
export const WAYPOINT_NEEDLE='M0 -11L8 9L0 5L-8 9Z';
// A forgiving arrival area, roughly six short steps; no exact pixel hunting.
export const WAYPOINT_ARRIVAL_RADIUS=300;
export const waypointBearing=(player:Vec,target:Vec)=>Math.atan2(target.y-player.y,target.x-player.x)+Math.PI/2;
export const waypointScene=(world:World)=>world.scene?.id??'camp';
export const currentWaypoint=(world:World)=>world.waypoint?.sceneId===waypointScene(world)?world.waypoint:undefined;
export function placeWaypoint(world:World,point:Vec){
 const b=worldBounds(world);
 if(!Number.isFinite(point.x)||!Number.isFinite(point.y)||point.x<b.left||point.x>b.right||point.y<b.top||point.y>b.bottom)return false;
 world.waypoint={x:point.x,y:point.y,sceneId:waypointScene(world)};return true;
}
export function clearWaypoint(world:World){world.waypoint=undefined}

/** Reject drags, pinches and cancelled contacts before placing a destination. */
export class WaypointTap{
 private start:{x:number;y:number;id:string|number}|null=null;
 get pending(){return this.start!==null}
 begin(id:string|number,x:number,y:number,count:number){this.start=count===1?{id,x,y}:null}
 move(x:number,y:number,count:number){if(this.start&&(count!==1||Math.hypot(x-this.start.x,y-this.start.y)>12))this.start=null}
 end(id:string|number,x:number,y:number){const old=this.start;this.start=null;return!!old&&old.id===id&&Math.hypot(x-old.x,y-old.y)<=12}
 cancel(){this.start=null}
}
/** Simulation-owned arrival works even while the atlas is open. */
export function stepWaypoint(world:World){
 const target=currentWaypoint(world);
 if(target&&Math.hypot(target.x-world.player.x,target.y-world.player.y)<=WAYPOINT_ARRIVAL_RADIUS){clearWaypoint(world);return true}
 return false;
}

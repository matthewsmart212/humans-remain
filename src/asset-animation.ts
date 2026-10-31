import {collisionError,type CollisionPoint} from './asset-collision';

export type AnimationMode='loop'|'step-on';
/** A walkable trigger, in fractions of the unchanged image canvas. */
export type AnimationArea={points:CollisionPoint[]};
export const defaultAnimationArea=():AnimationArea=>({points:[[.1,.1],[.9,.1],[.9,.95],[.1,.95]]});
export function animationAreaError(value:unknown):string{
 const area=value as AnimationArea;
 const error=collisionError({lineWidth:.012,paths:[{closed:true,points:area?.points}]});
 return error?'Draw a closed activation area with 3–64 points inside the image. Keep points apart and edges uncrossed.':'';
}
/** Shared by the actual simulation and the artwork preview. Position is continuous
 * so changing direction never restarts the sequence or skips to an endpoint. */
export function advanceAnimation(position:number,active:boolean,count:number,fps:number,seconds:number){
 const last=Math.max(0,count-1),current=Math.max(0,Math.min(last,position)),distance=Math.max(0,seconds)*fps;
 return active?Math.min(last,current+distance):Math.max(0,current-distance);
}
export const animationFrame=(position:number,count:number)=>Math.max(0,Math.min(count-1,Math.round(position)));

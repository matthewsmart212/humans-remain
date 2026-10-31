import {campBounds,type WorldBounds} from './world-bounds';
/** Uniform scaling prevents tall phones stretching the worker. Camera follows inside the factory. */
export function worldCamera(width:number,height:number,player:{x:number;y:number},bounds:WorldBounds=campBounds()){
 // Rotate without magnifying the worker: landscape reveals more world horizontally.
 const scale=width>height?Math.max(width/1800,height/900):Math.max(width/900,height/1200),visibleW=width/scale,visibleH=height/scale;
 const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
 return{scale,x:visibleW>=bounds.width?bounds.left+(bounds.width-visibleW)/2:clamp(player.x-visibleW/2,bounds.left,bounds.right-visibleW),y:visibleH>=bounds.height?bounds.top+(bounds.height-visibleH)/2:clamp(player.y-visibleH*.53,bounds.top,bounds.bottom-visibleH)};
}

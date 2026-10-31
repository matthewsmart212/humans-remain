import {MIN_PLAY_ZOOM} from './play-zoom';

export const ATLAS_FULL_ZOOM=.56;
/** Camera fades may be fractional while a gesture is held, never when idle. */
export function normalizeAtlasZoom(amount:number,minimum=0){
 const value=Number.isFinite(amount)?Math.max(minimum,Math.min(1,amount)):1;
 return Math.abs(value-MIN_PLAY_ZOOM)<1e-7?MIN_PLAY_ZOOM:value;
}
export function settleAtlasZoom(amount:number){
 const value=normalizeAtlasZoom(amount);
 return value>ATLAS_FULL_ZOOM&&value<MIN_PLAY_ZOOM?value>=(ATLAS_FULL_ZOOM+MIN_PLAY_ZOOM)/2?MIN_PLAY_ZOOM:ATLAS_FULL_ZOOM:value;
}
export function atlasZoomTween(start:number,target:number,progress:number){
 if(progress>=1)return target;
 return start+(target-start)*(1-Math.pow(1-Math.max(0,progress),3));
}

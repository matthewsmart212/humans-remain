import {getFieldKitTarget} from './field-kit-target';
import {DIRECTION_ANGLES,type World} from './survival-engine';

export type FocusCandidate<T>={id:string;x:number;y:number;available:boolean;value:T};
/** Available actions win. A small distance/facing margin prevents border flicker. */
export function chooseInteractionFocus<T>(w:World,candidates:FocusCandidate<T>[]):T|null{
 if(!candidates.length)return null;
 const facing=DIRECTION_ANGLES[w.player.direction],score=(c:FocusCandidate<T>)=>{
  const dx=c.x-w.player.x,dy=c.y-w.player.y;
  return Math.hypot(dx,dy)+(1-Math.cos(Math.atan2(dy,dx)-facing))*14;
 };
 candidates.sort((a,b)=>Number(b.available)-Number(a.available)||score(a)-score(b));
 const best=candidates[0],previous=candidates.find(c=>c.id===getFieldKitTarget(w)?.id);
 return previous&&previous.available===best.available&&score(previous)<=score(best)+28?previous.value:best.value;
}

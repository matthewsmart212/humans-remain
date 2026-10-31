import type {GestureResponderEvent} from 'react-native';
import {PlayPinchZoom} from '../src/play-zoom';

/** World and movement touches register here; action-button touches never do.
 * Raw events on their common ancestor keep a pinch across both surfaces intact
 * without taking the native responder away from an action button. */
export function createNativePlayZoom(options:{enabled:()=>boolean;getZoom:()=>number;setZoom:(zoom:number)=>void;onMinimumZoom?:()=>void;onPinchStart?:()=>void;minimumZoom?:()=>number;onGestureEnd?:(interrupted:boolean)=>void}){
 const pinch=new PlayPinchZoom(),ids=new Set<string>();let movementBlocked=false;
 const cancel=()=>{const completed=movementBlocked;ids.clear();pinch.cancel();movementBlocked=false;if(completed&&options.enabled())options.onGestureEnd?.(true)};
 const update=(e:GestureResponderEvent,interrupted=false)=>{
  if(!options.enabled()){cancel();return}
  const touches=e.nativeEvent.touches;
  for(const id of ids)if(!touches.some(t=>t.identifier===id))ids.delete(id);
  const points=touches.filter(t=>ids.has(t.identifier)).map(t=>({id:t.identifier,x:t.pageX,y:t.pageY}));
  if(points.length>=2&&!movementBlocked){movementBlocked=true;options.onPinchStart?.()}
  const completed=movementBlocked&&!points.length;
  if(!points.length)movementBlocked=false;
  pinch.setMinimum(options.minimumZoom?.()??.7);
  options.setZoom(pinch.update(points,options.getZoom()));
  if(completed)options.onGestureEnd?.(interrupted);
  if(pinch.takeMapRequest()&&!options.minimumZoom)options.onMinimumZoom?.();
 };
 const start=(e:GestureResponderEvent)=>{if(!options.enabled()){cancel();return}ids.add(e.nativeEvent.identifier);update(e)};
 return {start,touchHandlers:{onTouchMove:update,onTouchEnd:update,onTouchCancel:(e:GestureResponderEvent)=>update(e,true)},blocksMovement:()=>movementBlocked||!options.enabled(),cancel};
}

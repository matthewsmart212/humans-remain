import React,{useCallback,useEffect,useRef,useState} from 'react';

import {movementTrailDots,type MovementTrail} from './movement-trail';

type Point={x:number;y:number};
type Props={input:React.MutableRefObject<Point>;onStart:()=>void;isPinching?:()=>boolean};

/** Each touch sets an invisible origin. One finger owns movement independently
 * of the action buttons, even when its drag leaves the starting region. */
export default function FieldKitMovement({input,onStart,isPinching}:Props){
 const region=useRef<HTMLDivElement>(null);
 const pointer=useRef<{id:number;origin:Point;offset:Point;target:HTMLDivElement}|null>(null);
 const [active,setActive]=useState(false);
 const [trail,setTrail]=useState<MovementTrail|null>(null);
 const releasePointer=useCallback(()=>{
  const held=pointer.current;pointer.current=null;input.current={x:0,y:0};
  if(held?.target.hasPointerCapture(held.id))held.target.releasePointerCapture(held.id);
 },[input]);
 const clear=useCallback(()=>{releasePointer();setActive(false);setTrail(null)},[releasePointer]);
 useEffect(()=>{
  const hide=()=>{if(document.hidden)clear()};
  window.addEventListener('blur',clear);window.addEventListener('resize',clear);
  window.visualViewport?.addEventListener('resize',clear);window.visualViewport?.addEventListener('scroll',clear);
  document.addEventListener('visibilitychange',hide);
  const el=region.current;let previous=el?.getBoundingClientRect();
  const observer=new ResizeObserver(()=>{const next=el?.getBoundingClientRect();if(previous&&next&&(next.width!==previous.width||next.height!==previous.height))clear();previous=next});
  if(el)observer.observe(el);
  return()=>{releasePointer();observer.disconnect();window.removeEventListener('blur',clear);window.removeEventListener('resize',clear);window.visualViewport?.removeEventListener('resize',clear);window.visualViewport?.removeEventListener('scroll',clear);document.removeEventListener('visibilitychange',hide)};
 },[clear,releasePointer]);
 const move=(e:React.PointerEvent<HTMLDivElement>)=>{
  if(isPinching?.()){clear();return}
  const held=pointer.current;if(held?.id!==e.pointerId)return;
  const dx=e.clientX-held.origin.x,dy=e.clientY-held.origin.y,distance=Math.hypot(dx,dy);
  setTrail({origin:{x:held.origin.x-held.offset.x,y:held.origin.y-held.offset.y},current:{x:e.clientX-held.offset.x,y:e.clientY-held.offset.y}});
  input.current=distance<5?{x:0,y:0}:{x:dx/Math.max(30,distance),y:dy/Math.max(30,distance)};
 };
 const end=(e:React.PointerEvent<HTMLDivElement>)=>{if(e.pointerId===pointer.current?.id)clear()};
 return <div ref={region} className="kit-movement-region" role="application" aria-label="Movement touch area" aria-description="Touch anywhere in the left 40 percent of the screen, then drag from that starting point to move. Release to stop." data-active={active}
  onContextMenu={e=>e.preventDefault()} onPointerDown={e=>{if(isPinching?.()){clear();return}if(e.button!==0||pointer.current)return;e.preventDefault();e.stopPropagation();const rect=e.currentTarget.getBoundingClientRect();pointer.current={id:e.pointerId,origin:{x:e.clientX,y:e.clientY},offset:{x:rect.left,y:rect.top},target:e.currentTarget};const point={x:e.clientX-rect.left,y:e.clientY-rect.top};setTrail({origin:point,current:point});input.current={x:0,y:0};e.currentTarget.setPointerCapture(e.pointerId);setActive(true);onStart()}}
  onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
   {trail&&<svg className="kit-movement-trail" aria-hidden="true">{movementTrailDots(trail).map((dot,i)=><circle key={i} cx={dot.x} cy={dot.y} r={dot.r} opacity={dot.opacity}/>)}</svg>}
  </div>;
}

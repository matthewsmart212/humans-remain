import React,{useLayoutEffect,useRef} from 'react';
import {
 isPatchCommand,patchReplyStripLayout,patchReplySizing,primaryPatchReply,patchReplyIcon,type PatchReplyStripProps,
} from './patch-reply-strip-layout';
import {usePatchReplyEdges} from './use-patch-reply-edges';
import './patch-reply-strip.css';

const art='/survival/patch-ui-v1/';
type Press={button:Element|null;pointer:number;x:number;y:number;left:number;inList:boolean;dragged:boolean};
const buttonAt=(target:EventTarget|null)=>target instanceof Element?target.closest('button'):null;

export function PatchReplyStrip({width,height,safe,choices,choiceSetKey,speaker,command,onChoose,onClose}:PatchReplyStripProps){
 const list=useRef<HTMLDivElement>(null),press=useRef<Press|null>(null),keyboardChoice=useRef(false);
 const {bounds,row,paintHeight,gap,closeWidth,closeSize,fontSize,listWidth}=patchReplyStripLayout(width,height,safe);
 const {minimum,padding,grow}=patchReplySizing(listWidth,gap,choices.length,fontSize);
 const {left,right,measure}=usePatchReplyEdges();
 useLayoutEffect(()=>{
  const el=list.current;
  if(!el)return;
  const read=()=>measure(el.scrollLeft,el.clientWidth,el.scrollWidth);
  const observer=new ResizeObserver(read);
  observer.observe(el);
  for(const button of el.children)observer.observe(button);
  read();
  return ()=>observer.disconnect();
 },[choiceSetKey,choices.length,measure]);
 useLayoutEffect(()=>{
  press.current=null;
  if(!list.current)return;
  list.current.scrollLeft=0;
  if(keyboardChoice.current){
   list.current.querySelector('button')?.focus({preventScroll:true});
   keyboardChoice.current=false;
  }
 },[choiceSetKey]);

 const down=(event:React.PointerEvent)=>{
  event.stopPropagation();
  press.current={button:buttonAt(event.target),pointer:event.pointerId,x:event.clientX,y:event.clientY,left:list.current?.scrollLeft??0,inList:list.current?.contains(event.target as Node)??false,dragged:!event.isPrimary};
 };
 const move=(event:React.PointerEvent)=>{
  event.stopPropagation();
  const start=press.current;
  if(!start||start.pointer!==event.pointerId)return;
  const dx=event.clientX-start.x;
  if(Math.hypot(dx,event.clientY-start.y)>7)start.dragged=true;
  // Claim a horizontal drag after the tap tolerance. The browser's history swipe
  // would otherwise take over when a finger keeps moving beyond the last reply.
  if(start.dragged&&start.inList&&event.buttons!==0&&list.current){
   if(!list.current.hasPointerCapture(event.pointerId))list.current.setPointerCapture(event.pointerId);
   list.current.scrollLeft=start.left-dx;
  }
 };
 const touchEnd=(event:React.TouchEvent)=>{
  // Mobile browsers can suppress the compatibility click immediately following
  // a scroll. Finish a verified tap here, and cancel that later click.
  event.stopPropagation();
  if(event.cancelable)event.preventDefault();
  const start=press.current,touch=event.changedTouches[0];
  press.current=null;
  if(!start?.button||start.dragged||event.touches.length||!touch)return;
  if(Math.hypot(touch.clientX-start.x,touch.clientY-start.y)>7)return;
  if(buttonAt(document.elementFromPoint(touch.clientX,touch.clientY))!==start.button)return;
  const id=start.button.getAttribute('data-choice');
  keyboardChoice.current=false;
  if(id!==null)onChoose(id);
  else onClose();
 };
 const activate=(event:React.MouseEvent)=>{
  const start=press.current;
  press.current=null;
  // Inspect can unmount under a finger; its mouse-compatible click may arrive
  // on the new HUD. Only a complete press on this control can activate it.
  if(event.detail>0&&(!start||start.dragged||start.button!==buttonAt(event.target))){
   event.preventDefault();event.stopPropagation();
  }
 };
 return <>
  <div aria-hidden="true" className="patch-reply-shade" style={{top:bounds.y-28}}/>
  <div className="patch-reply-strip" role="group" aria-label={speaker+' response choices'}
   style={{left:bounds.x,top:bounds.y,width:bounds.width,height:bounds.height,
    '--reply-gap':gap+'px','--reply-paint':paintHeight+'px','--reply-close-size':closeSize+'px','--reply-min':minimum+'px','--reply-pad':padding+'px','--reply-grow':grow,'--reply-font':fontSize+'px'} as React.CSSProperties}
   onPointerDown={down} onPointerMove={move} onPointerUp={e=>e.stopPropagation()}
   onPointerCancel={e=>{press.current=null;e.stopPropagation()}}
   onTouchEnd={touchEnd} onClickCapture={activate} onClick={e=>e.stopPropagation()} onWheel={e=>e.stopPropagation()}>
   <div className="patch-reply-label" aria-hidden="true" style={{visibility:choices.length?'visible':'hidden'}}>
    {choices[0]?.id==='more'?'CONVERSATION':'YOUR REPLY'}<span/>
   </div>
   <div className="patch-reply-row" style={{height:row}}>
    <div className="patch-reply-list" ref={list} onScroll={e=>{
     const el=e.currentTarget;measure(el.scrollLeft,el.clientWidth,el.scrollWidth);
    }}>
     {choices.map(choice=>{
      const primary=primaryPatchReply(choice.id,choices),icon=patchReplyIcon(choice.id),selected=isPatchCommand(choice.id)&&command===choice.id;
      return <button type="button" key={choice.id} data-choice={choice.id} data-primary={primary}
       aria-pressed={isPatchCommand(choice.id)?selected:undefined}
       onClick={event=>{keyboardChoice.current=event.detail===0;onChoose(choice.id)}}>
       {icon&&<img alt="" draggable={false} src={art+icon+'.png'}/>}
       <span>{choice.label}</span>{selected&&<i aria-hidden="true">✓</i>}
      </button>;
     })}
    </div>
    {left&&<span aria-hidden="true" className="patch-reply-fade patch-reply-fade--left"/>}
    {right&&<span aria-hidden="true" className="patch-reply-fade patch-reply-fade--right" style={{right:closeWidth+gap}}/>}
    <button type="button" className="patch-reply-close" aria-label="Close conversation"
     title="Close conversation" style={{width:closeWidth,height:row}} onClick={onClose}>
     <img src={art+'reply-close.webp'} alt="" draggable={false}/>
    </button>
   </div>
  </div>
 </>;
}

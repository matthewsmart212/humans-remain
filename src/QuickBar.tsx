import React,{useEffect,useId,useRef,useState} from 'react';
import {availableQuickItems,quickItemCount,quickBarWidth,quickBarSliceImage,QUICK_BAR_LAYOUT as layout,QUICK_BAR_SLICES,type QuickBarProps} from './quick-items';
import {quickItemArt} from './quick-item-art';
import {ACTION_HEX} from './action-hex';

export default function QuickBar({selected,torch,cooked,cookedRabbit=0,cookedVenison=0,provisions,axes,disabled,onSelect,onExpandedChange}:QuickBarProps){
 const [expanded,setExpanded]=useState(false),root=useRef<HTMLElement>(null),toggle=useRef<HTMLButtonElement>(null),itemsId=useId();
 const notifyExpanded=useRef(onExpandedChange);notifyExpanded.current=onExpandedChange;
 const pointer=useRef<{id:number;x:number;y:number;moved:boolean}|null>(null);
 const items=availableQuickItems({torch,cooked,cookedRabbit,cookedVenison,provisions,axes}),active=items.find(item=>item.id===selected)??items[0],open=expanded&&!disabled;
 const visible=open?items:[active];
 useEffect(()=>{notifyExpanded.current?.(open)},[open]);
 useEffect(()=>()=>notifyExpanded.current?.(false),[]);
 useEffect(()=>{if(disabled)setExpanded(false)},[disabled]);
 useEffect(()=>{
  if(!open)return;
  const dismiss=(event:PointerEvent)=>{if(event.target instanceof Node&&!root.current?.contains(event.target))setExpanded(false)};
  document.addEventListener('pointerdown',dismiss,true);
  return()=>document.removeEventListener('pointerdown',dismiss,true);
 },[open]);
 const close=()=>{setExpanded(false);toggle.current?.focus({preventScroll:true})};
 // Pointer-up also works while the other thumb is walking. A horizontal swipe
 // cancels the tap, so scrolling a full row cannot equip an item by accident.
 const tap=(activate:()=>void)=>({
  onPointerDown:(e:React.PointerEvent<HTMLButtonElement>)=>{e.stopPropagation();if(disabled||e.button!==0)return;pointer.current={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};e.currentTarget.setPointerCapture(e.pointerId)},
  onPointerMove:(e:React.PointerEvent<HTMLButtonElement>)=>{const p=pointer.current;if(p?.id===e.pointerId&&Math.hypot(e.clientX-p.x,e.clientY-p.y)>8)p.moved=true},
  onPointerUp:(e:React.PointerEvent<HTMLButtonElement>)=>{const p=pointer.current;if(p?.id!==e.pointerId)return;pointer.current=null;e.stopPropagation();if(!disabled&&!p.moved){e.preventDefault();activate()}},
  onPointerCancel:()=>{pointer.current=null},onLostPointerCapture:()=>{pointer.current=null},
  onClick:(e:React.MouseEvent<HTMLButtonElement>)=>{e.stopPropagation();if(!disabled&&e.detail===0&&!(e.nativeEvent as PointerEvent).pointerType)activate()},
 });
 return <nav ref={root} className="kit-quickbar" aria-label="Quick item selection" data-expanded={open}
  style={{width:open?quickBarWidth(visible.length):layout.closedWidth,'--quick-closed-width':`${layout.closedWidth}px`,'--quick-slot-width':`${layout.slotWidth}px`,'--quick-height':`${layout.height}px`,'--quick-toggle-width':`${layout.toggleWidth}px`,'--quick-padding':`${layout.padding}px`,'--quick-gap':`${layout.gap}px`,'--quick-action-clearance':`${ACTION_HEX.width+14}px`} as React.CSSProperties}
  onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()} onContextMenu={e=>e.preventDefault()}
  onKeyDown={e=>{if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();close()}else if(e.key===' '||e.key==='Enter')e.stopPropagation()}} onKeyUp={e=>{if(e.key===' '||e.key==='Enter'||e.key==='Escape')e.stopPropagation()}}>
  <span className="kit-quick-skin" aria-hidden="true">{open?QUICK_BAR_SLICES.map(part=><span key={part.id} className="kit-quick-slice" style={{...('width' in part?{width:part.width}:{flex:1}),...('flip' in part?{transform:'scaleX(-1)'}:{})}}><img src="/survival/ui-field-kit-v1/vitals.png" style={quickBarSliceImage(part)} alt="" draggable={false}/></span>):<img className="kit-quick-hex" src="/survival/ui-action-hex-v1/primary.png" alt="" draggable={false}/>}</span>
  <div className="kit-quick-items" id={itemsId} role="group" aria-label={open?'Available tools and items':'Active tool or item'}>
   {visible.map(item=>{const count=quickItemCount(item.id,cooked,cookedRabbit,cookedVenison,axes?.arrows??0,provisions),size=open?layout.iconSize:layout.closedIconSize,art=quickItemArt(item.id,size);return <button type="button" key={item.id} className="kit-quick-slot"
    aria-label={`${item.label}${count!==undefined?`, ${count} ${item.id==='bow'?'arrows':'portions'}`:''}${open?'':'. Active item. Open item selector'}`} title={open?`${item.label} · Select and close`:'Open item selector'} aria-pressed={active.id===item.id} aria-expanded={open?undefined:false} disabled={disabled}
    {...tap(()=>{if(open){onSelect(item.id);close()}else setExpanded(true)})}>
    <span className="kit-quick-icon" aria-hidden="true" style={{width:size,height:size}}><span className="kit-quick-art-crop" style={{...art.crop,left:(size-art.crop.width)/2,top:(size-art.crop.height)/2,transform:`rotate(${art.rotation}deg)`}}><img src={item.image} style={art.image} alt="" draggable={false}/></span></span><span className="kit-quick-label">{item.label}</span>{count!==undefined&&<b>{count}</b>}
   </button>})}
  </div>
  <button ref={toggle} type="button" className="kit-quick-toggle" aria-label={open?'Close item selector':'Open item selector'} aria-expanded={open} aria-controls={itemsId} disabled={disabled} {...tap(()=>setExpanded(value=>!value))}>
   <svg viewBox="0 0 16 24" aria-hidden="true" data-open={open}><path d="m5 5 7 7-7 7"/></svg>
  </button>
 </nav>;
}

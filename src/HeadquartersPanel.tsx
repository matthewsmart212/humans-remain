import React,{useCallback,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {World} from './survival-engine';
import HeadquartersContent,{FurnaceRepairContent,type HeadquartersNavigation} from './HeadquartersContent';
import {headquartersMenuImage,headquartersMenuSource} from './headquarters-image-sources';
import StationMenu from './StationMenu';
import {presentStationMenu} from './station-menu-layout';
import {FURNACE_BROKEN_IMAGE} from './furnace-animation-art';
import './headquarters.css';
type Props={world:World;onClose:()=>void;onChange:()=>void};
const source=headquartersMenuSource;
export default function HeadquartersPanel({world,onClose,onChange}:Props){
 const navigation=useRef<HeadquartersNavigation>(null);
 const layer=useRef<HTMLDivElement>(null),[size,setSize]=useState({width:1000,height:600});
 useLayoutEffect(()=>{const el=layer.current;if(!el)return;const previous=document.activeElement as HTMLElement|null;
  const resize=()=>{const box=el.getBoundingClientRect();setSize({width:box.width,height:box.height})};resize();
  presentStationMenu(world,true);const ro=new ResizeObserver(resize);ro.observe(el);
  el.focus({preventScroll:true});
  return()=>{ro.disconnect();presentStationMenu(world,false);previous?.focus({preventScroll:true})};
 },[world.fire]);
 const focusControl=useCallback((id:string)=>{
  const control=layer.current?.querySelector<HTMLElement>(`[data-testid="${id}"]`);
  control?.focus();
 },[]);
 const onKeyDown=(event:React.KeyboardEvent)=>{
  event.stopPropagation();
  if(event.key==='Escape'){event.preventDefault();navigation.current?.back();return}
  const active=document.activeElement;
  if(active?.getAttribute('role')==='tab'&&['ArrowRight','ArrowLeft','Home','End'].includes(event.key)){
   const tabs=Array.from(layer.current?.querySelectorAll<HTMLElement>('[role="tab"]')??[]);
   const index=tabs.indexOf(active as HTMLElement);
   const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
   event.preventDefault();tabs[next]?.focus();tabs[next]?.click();return;
  }
  if(event.key!=='Tab')return;
  const controls=Array.from(layer.current?.querySelectorAll<HTMLElement>('button:not(:disabled),[tabindex="0"]')??[])
   .filter(el=>el.getClientRects().length>0&&el.getAttribute('aria-disabled')!=='true');
  const first=controls[0],last=controls.at(-1);
  if(active===layer.current&&controls.length){
   event.preventDefault();
   const campAction=controls.find(el=>el.dataset.testid==='hq-camp-action');
   (event.shiftKey?last:campAction??first)?.focus();
   return;
  }
  if(event.shiftKey&&active===first){event.preventDefault();last?.focus()}
  else if(!event.shiftKey&&active===last){event.preventDefault();first?.focus()}
 };
 return createPortal(<div className="headquarters-overlay" onPointerDown={e=>e.stopPropagation()} onKeyUp={e=>e.stopPropagation()} onKeyDown={onKeyDown}>
  <div ref={layer} tabIndex={-1} className="headquarters-full-menu" role="dialog" aria-modal="true" aria-label="Headquarters">
   <HeadquartersContent world={world} {...size} source={source} navigation={navigation} focusControl={focusControl} onClose={onClose} onChange={onChange}/>
  </div>
 </div>,document.body);
}
export function FurnaceRepairPanel({world,onClose,onChange}:Props){
 return <StationMenu compact fitContent world={world} title="Damaged furnace" image={headquartersMenuImage(FURNACE_BROKEN_IMAGE)} onClose={onClose} className="headquarters-menu">
  <FurnaceRepairContent world={world} source={source} onClose={onClose} onChange={onChange}/>
 </StationMenu>;
}

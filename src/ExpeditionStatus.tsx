import React,{useLayoutEffect,useRef,useState} from 'react';
import {TriangleAlert} from 'lucide-react';
import type {CampThreat} from './camp-hud';
import './camp-hud.css';

export default function ExpeditionStatus({threat}:{threat:CampThreat|null}){
 const ref=useRef<HTMLDivElement>(null),[position,setPosition]=useState<React.CSSProperties>({visibility:'hidden'});
 useLayoutEffect(()=>{
  const node=ref.current,hud=node?.parentElement;if(!node||!hud)return;
  const vitals=hud.querySelector('.kit-vitals-toggle'),utilities=hud.querySelector('.kit-utilities');
  const measure=()=>{
   const root=hud.getBoundingClientRect(),v=vitals?.getBoundingClientRect(),u=utilities?.getBoundingClientRect(),clock=hud.querySelector('.sky-horizon-button')?.getBoundingClientRect();
   if(!v||!u)return;
   const left=v.right-root.left+12,right=Math.min(u.left,clock?.left??u.left)-root.left-12,gap=right-left;
   const text=node.querySelector('strong'),icon=node.querySelector('.camp-threat-icon'),style=getComputedStyle(node),pixels=(value:string)=>Number.parseFloat(value)||0;
   // The previous max-width may clip this flex row; the text retains its intrinsic scroll width.
   const naturalWidth=Math.ceil(text?text.scrollWidth+(icon?.getBoundingClientRect().width??0)+(icon?pixels(style.columnGap):0)+pixels(style.paddingLeft)+pixels(style.paddingRight)+pixels(style.borderLeftWidth)+pixels(style.borderRightWidth):node.scrollWidth);
   const inRow=root.width>root.height&&gap>=naturalWidth;
   const width=Math.min(naturalWidth,root.width-32);
   setPosition({left:inRow?left+(gap-width)/2:(root.width-width)/2,top:inRow?Math.max(v.top,u.top)-root.top+7:Math.max(v.bottom,u.bottom,clock?.bottom??0)-root.top+8,maxWidth:inRow?gap:root.width-32,visibility:'visible'});
  };
  measure();const observer=new ResizeObserver(measure);[hud,node,vitals,utilities,hud.querySelector('.sky-horizon-button')].forEach(el=>{if(el)observer.observe(el)});
  return()=>observer.disconnect();
 },[!!threat,threat?.title]);
 if(!threat)return null;
 return <div ref={ref} className="camp-threat" data-critical={threat.critical} data-approaching={threat.approaching} style={position} role="status" aria-live="polite" aria-atomic="true" aria-label={threat.title+(threat.detail?'. '+threat.detail:'')}>
  <TriangleAlert className="camp-threat-icon" size={16} strokeWidth={2.3} aria-hidden="true"/><strong>{threat.title}</strong>
 </div>;
}

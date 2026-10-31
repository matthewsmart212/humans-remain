import React,{useEffect,useRef,useState} from 'react';
import {HORIZON,DIAL_GLOW,skyClockView,horizonPosition,DAY_WING,type SkyCycle} from './sky-clock';
import {useSkyCycle,type SkyWorldRef} from './use-sky-cycle';
import './sky-clock.css';
export default function SkyClock({cycle:fallback,world,paused=false,onExpanded}:{cycle:SkyCycle;world?:SkyWorldRef;paused?:boolean;onExpanded?:(open:boolean)=>void}){
 const cycle=useSkyCycle(fallback,world,paused);
 const [open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null),button=useRef<HTMLButtonElement>(null),view=skyClockView(cycle);
 useEffect(()=>{onExpanded?.(open)},[open,onExpanded]);
 useEffect(()=>()=>onExpanded?.(false),[onExpanded]);
 useEffect(()=>{if(!open)return;const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false)};document.addEventListener('pointerdown',outside,true);return()=>document.removeEventListener('pointerdown',outside,true)},[open]);
 return <div ref={root} className="sky-clock" style={{'--sky-day-width':`${DAY_WING.width}px`,'--sky-height':`${HORIZON.height}px`,'--sky-radius':`${HORIZON.radius}px`,'--sky-icon':`${HORIZON.icon}px`,'--sky-glow':`${DIAL_GLOW.size}px`,'--sky-pulse':`${DIAL_GLOW.pulseMs}ms`} as React.CSSProperties} data-night={cycle.night} data-paused={paused} data-expanded={open} onPointerDown={e=>e.stopPropagation()} onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape'){setOpen(false);button.current?.focus()}}} onKeyUp={e=>e.stopPropagation()}>
  <button ref={button} type="button" className="sky-horizon-button" aria-label={`${view.label} ${open?'Collapse':'Expand'} day display`} aria-expanded={open} onClick={()=>setOpen(!open)}>
   <span className="sky-dial-art" aria-hidden="true">
    <img className="sky-scene" src="/survival/ui-survivor-dial-v2/day.png?frame=slim34" alt="" draggable={false}/>
    <img className="sky-scene sky-scene-night" src="/survival/ui-survivor-dial-v2/night.png?frame=slim34" alt="" draggable={false} style={{opacity:view.nightMix}}/>
    <span className="sky-flight-window">{view.orbs.map(orb=>{const p=horizonPosition(orb);return <span key={orb.icon} className="sky-flight" data-body={orb.icon} data-setting={orb.setting} style={{transform:`translate3d(${p.x}px,${p.y}px,0)`,opacity:orb.opacity,transition:orb.opacity===0?'none':undefined}}><img className="sky-orb-glow" src={`/survival/ui-survivor-dial-v2/${orb.icon}-glow.png`} alt="" draggable={false}/><img className="sky-flight-sprite" src={`/survival/ui-survivor-dial-v2/${orb.icon}.png`} alt="" draggable={false}/></span>})}</span>
    <img className="sky-dial-rim" src="/survival/ui-survivor-dial-v2/rim.png?frame=slim34" alt="" draggable={false}/>
   </span>
   <span className="sky-day-wing" aria-hidden="true"><span className="sky-day-inlay"><small>DAY</small><b>{view.dayTag}</b><i/><i/></span></span>
  </button>

 </div>;
}

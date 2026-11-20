import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {World} from './survival-engine';
import {stationMenuLayout,presentStationMenu,type MenuInsets} from './station-menu-layout';
import {fieldKitArt} from './field-kit';
import {stationCSSColors} from './station-css-colors';
import './inventory-ui.css';
import './station-menu.css';
import './station-menu-audit.css';
import './station-menu-compact.css';
import './station-shell.css';

const focusable = 'button:not(:disabled), summary, input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]';

type Props={world:World;title:string;label?:string;subtitle?:string;image?:string;closeLabel?:string;onClose:()=>void;weight:number;loadLabel?:string;message?:string;hint?:string;kind?:'backpack';className?:string;compact?:boolean;fitContent?:boolean;footerAction?:React.ReactNode;children:React.ReactNode};
export default function StationMenu({world,title,label=title,subtitle,image,closeLabel=`Leave ${title.toLowerCase()}`,onClose,weight,loadLabel,message,hint,kind,className='',compact=false,fitContent=false,footerAction,children}:Props){
 const [feedback,setFeedback]=useState(message);
 useEffect(()=>{setFeedback(message);if(!message)return;const timer=setTimeout(()=>setFeedback(''),3200);return()=>clearTimeout(timer)},[message]);
 const layer=useRef<HTMLDivElement>(null),panel=useRef<HTMLElement>(null),close=useRef<HTMLButtonElement>(null),[frame,setFrame]=useState<ReturnType<typeof stationMenuLayout>>();
 useLayoutEffect(()=>{const el=layer.current;if(!el)return;const previous=document.activeElement as HTMLElement|null;
  const resize=()=>{const b=el.getBoundingClientRect(),s=getComputedStyle(el),safe:MenuInsets={top:parseFloat(s.paddingTop)||0,right:parseFloat(s.paddingRight)||0,bottom:parseFloat(s.paddingBottom)||0,left:parseFloat(s.paddingLeft)||0};setFrame(stationMenuLayout(b.width,b.height,safe));presentStationMenu(world,true,kind==='backpack',safe)};
  resize();close.current?.focus({preventScroll:true});const observer=new ResizeObserver(resize);observer.observe(el);window.addEventListener('resize',resize);
  return()=>{observer.disconnect();window.removeEventListener('resize',resize);presentStationMenu(world,false);previous?.focus({preventScroll:true})};
 },[world.fire,kind]);
 const keys = (event: React.KeyboardEvent) => {
  event.stopPropagation();
  if (event.defaultPrevented) return;
  if (event.key === 'Escape') {
   event.preventDefault();
   onClose();
   return;
  }
  if (event.key !== 'Tab') return;
  const controls = Array.from(panel.current?.querySelectorAll<HTMLElement>(focusable) ?? [])
   .filter(el => el.tabIndex >= 0 && el.getClientRects().length > 0 && !el.closest('[inert]'));
  const first = controls[0], last = controls.at(-1);
  const edge = event.shiftKey ? first : last;
  if (edge && (document.activeElement === edge || !panel.current?.contains(document.activeElement))) {
   event.preventDefault();
   (event.shiftKey ? last : first)?.focus();
  }
 };
 const heavy = weight > 18;
 const loadStatus = heavy ? 'Heavy pack' : loadLabel === 'Comfortable' ? '' : loadLabel;
 return <div ref={layer} style={stationCSSColors} className="station-menu-layer" onPointerDown={e=>e.stopPropagation()} onKeyDown={keys} onKeyUp={e=>e.stopPropagation()}>
  <button className="station-world-exit" aria-hidden="true" aria-label={closeLabel} tabIndex={-1} onClick={onClose}/>
  <section ref={panel} className={`supply-panel station-menu ${compact?'station-menu--simplified':''} ${fitContent?'station-menu--fit':''} ${className}`} role="dialog" aria-modal="true" aria-label={label} data-wide={frame?.wide} data-short={frame?.compact} style={frame?{left:frame.panel.x,top:frame.panel.y,width:frame.panel.width,height:fitContent?'auto':frame.panel.height,maxHeight:frame.panel.height}:undefined}>
   <header className="station-menu-header">
    <img src={image??fieldKitArt(kind==='backpack'?'backpack':'chest')} alt=""/>
    <div><h2>{title}</h2>{subtitle&&<small title={subtitle}>{subtitle}</small>}</div>
    <button ref={close} className="station-menu-close" aria-label={closeLabel} title={closeLabel} onClick={onClose}><span className="station-close-mark" aria-hidden="true"/></button>
   </header>
   <div className="station-menu-content">{children}</div>
   <footer className="station-menu-footer">
    {hint&&<p>{hint}</p>}
    <div className="station-menu-load">
     {feedback ? <p className="station-menu-feedback" role="status">{feedback}</p> : <>
     <img src={fieldKitArt('backpack')} alt=""/>
     <span>Pack <strong>{weight.toFixed(1)} / 24 kg</strong></span>
     {loadStatus&&<span className="station-load-status">{loadStatus}</span>}
     <div role="progressbar" aria-label="Backpack weight. Movement slows above 18 kilograms." aria-valuemin={0} aria-valuemax={24} aria-valuenow={Math.min(weight,24)} aria-valuetext={`${weight.toFixed(1)} kilograms`} data-heavy={heavy}><i style={{width:`${Math.min(100,weight/24*100)}%`}}/></div>
     </>}
     {footerAction&&<aside className="station-menu-footer-action">{footerAction}</aside>}
    </div>
   </footer>
  </section>
 </div>;
}

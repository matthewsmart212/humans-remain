import React,{useLayoutEffect,useRef,useState} from 'react';
import type {World} from './survival-engine';
import {stationMenuLayout,presentStationMenu,type MenuInsets} from './station-menu-layout';
import {menuPackReadout} from './station-menu-model';
import {fieldKitArt} from './field-kit';
import {stationCSSColors} from './station-css-colors';
import {patchPanelLayout} from './patch-panel-layout';
import './inventory-ui.css';
import './station-menu.css';
import './station-menu-audit.css';
import './station-menu-compact.css';
import './station-shell.css';

const focusable = 'button:not(:disabled), summary, input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]';

function currentControls(panel: HTMLElement) {
 const dialog = panel.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]') ?? panel;
 return Array.from(dialog.querySelectorAll<HTMLElement>(focusable))
  .filter(el => el.tabIndex >= 0 && el.getClientRects().length > 0 && !el.closest('[inert]'));
}

type Props={world:World;title:string;label?:string;subtitle?:string;image?:string;emblem?:React.ReactNode;closeLabel?:string;onClose:()=>void;onBack?:()=>void;weight?:number;loadLabel?:string;message?:string;hint?:string;kind?:'backpack';className?:string;compact?:boolean;fitContent?:boolean;presentation?:'station'|'letter';footerAction?:React.ReactNode;children:React.ReactNode};
export default function StationMenu({world,title,label=title,subtitle,image,emblem,closeLabel=`Leave ${title.toLowerCase()}`,onClose,onBack=onClose,weight,loadLabel,message,hint,kind,className='',compact=false,fitContent=false,presentation='station',footerAction,children}:Props){
 const pointerStartedHere=useRef(false);
 const layer=useRef<HTMLDivElement>(null),panel=useRef<HTMLElement>(null),[frame,setFrame]=useState<ReturnType<typeof stationMenuLayout>>();
 useLayoutEffect(()=>{const el=layer.current;if(!el)return;const previous=document.activeElement as HTMLElement|null;
  const resize=()=>{const b=el.getBoundingClientRect(),s=getComputedStyle(el),safe:MenuInsets={top:parseFloat(s.paddingTop)||0,right:parseFloat(s.paddingRight)||0,bottom:parseFloat(s.paddingBottom)||0,left:parseFloat(s.paddingLeft)||0};setFrame(presentation==='station'?stationMenuLayout(b.width,b.height,safe):patchPanelLayout(b.width,b.height,safe));presentStationMenu(world,true,kind==='backpack',safe)};
  resize();panel.current?.focus({preventScroll:true});const observer=new ResizeObserver(resize);observer.observe(el);window.addEventListener('resize',resize);
  return()=>{observer.disconnect();window.removeEventListener('resize',resize);presentStationMenu(world,false);previous?.focus({preventScroll:true})};
 },[world.fire,kind,presentation]);
 // Taking the last item or spending the last ingredient can remove or disable
 // the focused button. Keep the next keyboard action inside the building.
 useLayoutEffect(() => {
  const el = panel.current;
  if (!el) return;
  let focused: HTMLElement | null = null;
  let position = 0;
  const remember = (event: FocusEvent) => {
   focused = event.target as HTMLElement;
   position = Math.max(0, currentControls(el).indexOf(focused));
  };
  const recover = new MutationObserver(() => {
   if (!focused || (document.activeElement !== document.body && document.activeElement !== focused)) return;
   if (focused.isConnected && !focused.matches(':disabled')) return;
   const controls = currentControls(el);
   controls[Math.min(position, controls.length - 1)]?.focus({preventScroll: true});
  });
  el.addEventListener('focusin', remember);
  recover.observe(el, {childList: true, subtree: true, attributes: true, attributeFilter: ['disabled']});
  return () => {el.removeEventListener('focusin', remember); recover.disconnect()};
 }, []);
 const keys = (event: React.KeyboardEvent) => {
  event.stopPropagation();
  if (event.defaultPrevented) return;
  if (event.key === 'Escape') {
   event.preventDefault();
   onBack();
   return;
  }
  if (event.key !== 'Tab') return;
  const controls = panel.current ? currentControls(panel.current) : [];
  const first = controls[0], last = controls.at(-1);
  if (document.activeElement === panel.current && controls.length) {
   event.preventDefault();
   const content = controls.find(el => el.closest('.station-menu-content'));
   (event.shiftKey ? last : content ?? first)?.focus();
   return;
  }
  const edge = event.shiftKey ? first : last;
  if (edge && (document.activeElement === edge || !panel.current?.contains(document.activeElement))) {
   event.preventDefault();
   (event.shiftKey ? last : first)?.focus();
  }
 };
 const pack = menuPackReadout(weight, loadLabel, kind === 'backpack');
 return <div ref={layer} style={stationCSSColors} className={`station-menu-layer${presentation==='station'?'':` patch-story-layer patch-story-layer--${presentation}`}`} onPointerDown={e=>{pointerStartedHere.current=true;e.stopPropagation()}}
  onPointerCancel={()=>{pointerStartedHere.current=false}}
  onClickCapture={e=>{
   // INSPECT opens on touch-down. Releasing that same finger can dispatch a
   // click to a newly mounted footer button at the old HUD coordinates.
   if(e.detail>0&&!pointerStartedHere.current){e.preventDefault();e.stopPropagation()}
   pointerStartedHere.current=false;
  }} onKeyDown={keys} onKeyUp={e=>e.stopPropagation()}>
  <button className="station-world-exit" aria-hidden="true" aria-label={closeLabel} tabIndex={-1} onClick={onClose}/>
  <section ref={panel} tabIndex={-1} className={`supply-panel station-menu ${compact?'station-menu--simplified':''} ${fitContent?'station-menu--fit':''} ${className}`} role="dialog" aria-modal="true" aria-label={label} data-wide={frame?.wide} data-short={frame?.compact} style={frame?{left:frame.panel.x,top:frame.panel.y,width:frame.panel.width,height:fitContent?'auto':frame.panel.height,maxHeight:frame.panel.height}:undefined}>
   <header className="station-menu-header">
    {emblem?<span className="station-menu-custom-emblem" aria-hidden="true">{emblem}</span>:<img src={image??fieldKitArt(kind==='backpack'?'backpack':'chest')} alt=""/>}
    <div><h2>{title}</h2>
     {subtitle&&!message&&<small>{subtitle}</small>}
     <div role="status" className="station-menu-feedback">{message}</div>
    </div>
    <button className="station-menu-close" aria-label={closeLabel} title={closeLabel} onClick={onClose}><span className="station-close-mark" aria-hidden="true"/></button>
   </header>
   <div className="station-menu-content">{children}</div>
   {(pack || hint || footerAction) && <footer className="station-menu-footer">
    {hint&&<p>{hint}</p>}
    <div className="station-menu-load">
     {pack&&<>
      <img src={fieldKitArt('backpack')} alt="Backpack"/>
      <strong>{pack.amount}</strong>
      {pack.status&&<span className="station-load-status">{pack.status}</span>}
     </>}
     {footerAction&&<aside className="station-menu-footer-action">{footerAction}</aside>}
    </div>
   </footer>}
  </section>
 </div>;
}

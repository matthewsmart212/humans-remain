import React,{useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {World} from './survival-engine';
import HeadquartersContent from './HeadquartersContent';
import {headquartersMenuSource} from './headquarters-image-sources';
import StationMenu from './StationMenu';
import {presentStationMenu} from './station-menu-layout';
import {packWeight} from './expedition-inventory';
import {costRows,RESTORE_FURNACE_COST} from './run-progression';
import {blueprintLearned} from './headquarters-plans';
import {campAccessLevel} from './camp-levels';
import {canPayMaterials} from './camp-materials';
import './headquarters.css';
type Props={world:World;onClose:()=>void;onChange:()=>void};
const source=headquartersMenuSource;
export default function HeadquartersPanel({world,onClose,onChange}:Props){
 const layer=useRef<HTMLDivElement>(null),[size,setSize]=useState({width:1000,height:600});
 useLayoutEffect(()=>{const el=layer.current;if(!el)return;const previous=document.activeElement as HTMLElement|null;
  const resize=()=>{const box=el.getBoundingClientRect();setSize({width:box.width,height:box.height})};resize();
  presentStationMenu(world,true);const ro=new ResizeObserver(resize);ro.observe(el);
  const focus=requestAnimationFrame(()=>el.querySelector<HTMLElement>('[aria-label="Leave headquarters"]')?.focus());
  return()=>{cancelAnimationFrame(focus);ro.disconnect();presentStationMenu(world,false);previous?.focus({preventScroll:true})};
 },[world.fire]);
 // Keep shared native/web controls outside the editor’s generic button styles.
 return createPortal(<div className="headquarters-overlay" onPointerDown={e=>e.stopPropagation()} onKeyUp={e=>e.stopPropagation()} onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();onClose()}if(e.key==='Tab'){const controls=Array.from(layer.current?.querySelectorAll<HTMLElement>('button:not(:disabled),[role="button"][tabindex="0"],[role="tab"][tabindex="0"]')??[]).filter(el=>el.getClientRects().length>0&&el.getAttribute('aria-disabled')!=='true');const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}}}><div ref={layer} className="headquarters-full-menu" role="dialog" aria-modal="true" aria-label="Headquarters"><HeadquartersContent world={world} {...size} source={source} onClose={onClose} onChange={onChange}/></div></div>,document.body);
}
export function Costs({world,cost}:{world:World;cost:typeof RESTORE_FURNACE_COST}){return <div className="hq-costs">{costRows(world,cost).map(m=><span key={m.id} data-enough={m.have>=m.needed}><small>{m.name}</small><b>{m.have} / {m.needed}</b></span>)}</div>}
export function FurnaceRepairPanel({world:w,onClose}:Props){return <StationMenu compact world={w} title="Damaged furnace" subtitle="RESTORE METALWORKING" image="/survival/ironworks-v1/camp-furnace.png" weight={packWeight(w)} onClose={onClose} className="headquarters-menu"><div className="hq-scroll"><section className="hq-furnace-hero"><img src="/survival/ironworks-v1/camp-furnace.png" alt="Cold camp furnace"/><div><span className="hq-eyebrow">CAMP LEVEL 2</span><h3>Bring the forge back to life</h3><p>Equip your repair hammer beside the furnace to restore it with camp materials.</p></div></section><div className="hq-part" data-ready={campAccessLevel(w)>=2}>{campAccessLevel(w)>=2?'✓ Camp level 2 unlocked':'Requires Camp level 2'}</div><Costs world={w} cost={RESTORE_FURNACE_COST}/><button className="hq-primary" onClick={onClose}>Return to camp · Equip repair hammer</button><p className="hq-note">Materials come from your backpack and camp stores. Repairs persist with this expedition.</p></div></StationMenu>}

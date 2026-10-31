import React,{useEffect,useRef,useState,type RefObject} from 'react';
import {Axe,Hand} from 'lucide-react';
import type {World} from './survival-engine';
import './axe-controls.css';

export function AxeToggle({equipped,disabled=false,onToggle}:{equipped:boolean;disabled?:boolean;onToggle:()=>void}){
 return <button type="button" className="axe-toggle" aria-label={equipped?'Stow axe':'Equip axe'} aria-pressed={equipped} disabled={disabled} title="Equip or stow camp axe · 1" onPointerDown={e=>{e.stopPropagation();if(e.button!==0||disabled)return;e.preventDefault();onToggle()}} onClick={e=>{e.stopPropagation();if(e.detail===0&&!disabled)onToggle()}} onKeyDown={e=>{if(e.key===' '||e.key==='Enter')e.stopPropagation()}} onKeyUp={e=>e.stopPropagation()}><Axe size={23}/><span>AXE<small>{equipped?'EQUIPPED':'STOWED'}</small></span></button>;
}
export function AxeSwingButton({equipped,onHeld,onSwing,world}:{equipped:boolean;onHeld:(held:boolean)=>void;onSwing:()=>void;world?:RefObject<World>}){
 const pointer=useRef<number|null>(null),held=useRef(onHeld);held.current=onHeld;
 const [state,setState]=useState(0);
 const release=()=>{pointer.current=null;held.current(false)};
 useEffect(()=>()=>held.current(false),[]);
 useEffect(()=>{if(!world)return;const update=()=>{const w=world.current,s=w.axeSwing;setState((s?(s.cut===2?2:1):0)|(s?.queued?4:0)|(w.player.downedUntil?8:0))};update();const timer=setInterval(update,80);return()=>clearInterval(timer)},[world]);
 return <button type="button" className="axe-swing" data-cut={state&3} disabled={!!(state&8)} aria-label={equipped?'Swing axe':'Punch'} title={equipped?'Tap for one cut; tap again or hold for a two-hit combo · Space':'Punch · Space'} onPointerDown={e=>{e.stopPropagation();if(e.button!==0||pointer.current!==null)return;e.preventDefault();pointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);onHeld(true);onSwing()}} onPointerUp={e=>{if(e.pointerId===pointer.current)release()}} onPointerCancel={release} onLostPointerCapture={release} onClick={e=>{if(e.detail===0)onSwing()}} onKeyDown={e=>{if(e.key===' '||e.key==='Enter')e.stopPropagation()}} onKeyUp={e=>e.stopPropagation()}>{equipped?<Axe size={27}/>:<Hand size={27}/>}<b>{equipped?'SWING':'PUNCH'}</b>{equipped&&<span className="axe-combo-pips" aria-hidden="true"><i data-lit={!!(state&3)}/><i data-lit={!!(state&2)} data-queued={!!(state&4)}/></span>}</button>;
}

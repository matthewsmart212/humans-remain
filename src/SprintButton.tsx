import React,{useCallback,useRef,useState} from 'react';
import {FastForward} from 'lucide-react';
import './sprint.css';

export function useSprintControl(){
 const requested=useRef(false),toggleOn=useRef(false),shift=useRef(false);
 const [active,setActive]=useState(false);
 const refresh=useCallback(()=>{requested.current=toggleOn.current||shift.current;setActive(requested.current)},[]);
 const toggle=useCallback(()=>{toggleOn.current=!toggleOn.current;refresh()},[refresh]);
 const setShift=useCallback((held:boolean)=>{shift.current=held;refresh()},[refresh]);
 const reset=useCallback(()=>{toggleOn.current=false;shift.current=false;refresh()},[refresh]);
 return {requested,active,toggle,setShift,reset};
}

/** A toggle leaves the right thumb free to fight while the left thumb steers. */
export default function SprintButton({active,disabled=false,onToggle,className=''}:{active:boolean;disabled?:boolean;onToggle:()=>void;className?:string}){
 // Handle the second finger directly: Safari need not synthesise a mouse click
 // for a non-primary touch while the first finger is holding the joystick.
 const activationKey=(e:React.KeyboardEvent)=>{if(e.key===' '||e.key==='Enter')e.stopPropagation()};
 return <button type="button" className={`sprint-button ${className}`} aria-label="Toggle sprint" aria-pressed={active} disabled={disabled} title="Tap to toggle sprint · Hold Shift on keyboard" onPointerDown={e=>{e.stopPropagation();if(disabled||e.button!==0)return;e.preventDefault();onToggle()}} onClick={e=>{e.stopPropagation();if(!disabled&&e.detail===0)onToggle()}} onKeyDown={activationKey} onKeyUp={activationKey}>
  <FastForward size={21}/><span>SPRINT<small>{active?'ON':'OFF'}</small></span>
 </button>;
}

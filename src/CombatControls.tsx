import React,{useEffect,useState,type RefObject} from 'react';
import {Wind} from 'lucide-react';
import {timeOf,type World} from './survival-engine';
import {COMBAT_DODGE} from './combat-model';

export default function CombatDodgeButton({world,onDodge}:{world:RefObject<World>;onDodge:()=>boolean}){
 const [remaining,setRemaining]=useState(0),[downed,setDowned]=useState(false);
 useEffect(()=>{const update=()=>{setRemaining(Math.max(0,Math.ceil(((world.current.dodgeReady??0)-timeOf(world.current))*10)/10));setDowned(!!world.current.player.downedUntil)};update();const timer=setInterval(update,80);return()=>clearInterval(timer)},[world]);
 const dodge=()=>{if(onDodge())setRemaining(COMBAT_DODGE.cooldown)};
 return <button className="combat-dodge" type="button" aria-label="Dodge" title="Dodge in your movement direction · Q" disabled={remaining>0||downed} style={{'--dodge-ready':1-remaining/COMBAT_DODGE.cooldown} as React.CSSProperties} onPointerDown={e=>{e.stopPropagation();if(e.button!==0)return;e.preventDefault();dodge()}} onClick={e=>{if(e.detail===0)dodge()}} onKeyDown={e=>{if(e.key===' '||e.key==='Enter')e.stopPropagation()}} onKeyUp={e=>e.stopPropagation()}><Wind size={22}/><span>DODGE<small>{remaining>0?remaining.toFixed(1)+'s':'READY'}</small></span></button>;
}

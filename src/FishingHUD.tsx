import React from 'react';
import type {FishingHud} from './fishing-types';
import {FISHING_ART} from './fishing-art';
import './fishing-hud.css';

export type FishingHUDProps={hud:FishingHud;disabled?:boolean;onCatch:(keep:boolean)=>void};

/** Fishing stays alongside the existing action hexagons, leaving the float and
 * fish visible. The simulation is the single source of both labels and meters. */
export default function FishingHUD({hud,disabled=false,onCatch}:FishingHUDProps){
 const tension=Math.max(0,Math.min(1,hud.tension)),charge=Math.max(0,Math.min(1,hud.charge));
 const fighting=hud.phase==='reeling',aiming=hud.phase==='aiming';
 const danger=fighting&&tension>=.78;
 const heldCatch=hud.catch;
 const stopKeys=(event:React.KeyboardEvent)=>{if(event.key!=='Escape')event.stopPropagation()};
 if(heldCatch)return <section className="fishing-hud fishing-catch" aria-label="Your catch" onKeyDown={stopKeys} onKeyUp={stopKeys}>
  <div className="fishing-catch-title"><span>YOUR CATCH</span>{heldCatch.isRecord&&<strong>NEW BEST</strong>}</div>
  <div className="fishing-catch-fish"><img src={heldCatch.image||FISHING_ART.rawFish} alt="" draggable={false}/><div><h2>{heldCatch.species}</h2><p><strong>{heldCatch.kg.toFixed(2)}</strong> kg</p></div></div>
  <p className="fishing-catch-note" role="status">{hud.canKeep?'A fresh catch for the campfire.':'Your bag is full. Release this fish, or make room in your bag.'}</p>
  <div className="fishing-catch-actions"><button type="button" disabled={disabled||!hud.canKeep} onClick={()=>onCatch(true)}>KEEP</button><button type="button" className="fishing-release" disabled={disabled} onClick={()=>onCatch(false)}>RELEASE</button></div>
  {!hud.canKeep&&<span className="fishing-bag-full">BAG FULL · CATCH HELD SAFELY</span>}
 </section>;
 return <section className="fishing-hud" data-phase={hud.phase} data-danger={danger} aria-label="Fishing" onKeyDown={stopKeys} onKeyUp={stopKeys}>
  <div className="fishing-heading"><span>{hud.phase==='bite'?'BITE!':fighting?'LINE TENSION':aiming?'CAST DISTANCE':hud.phase==='landing'?'BRINGING IT IN':'LAKE FISHING'}</span><span className="fishing-bait" aria-label={`${hud.bait} bait remaining`}><img src={FISHING_ART.worms} alt="" draggable={false}/><b>{hud.bait}</b><small>BAIT</small></span></div>
  {(fighting||aiming)&&<div className={`fishing-meter ${aiming?'fishing-cast-meter':''}`} role="meter" aria-label={aiming?'Cast distance':'Line tension'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((aiming?charge:tension)*100)} aria-valuetext={aiming?`${Math.round(charge*100)} percent distance`:danger?'High tension. Ease off':tension<.18?'Slack line. Reel in':'Steady tension'}>
   <span className="fishing-meter-track"><i style={{width:`${(aiming?charge:tension)*100}%`}}/>{fighting&&<b className="fishing-danger-mark"/>}</span>
   <span className="fishing-meter-ends"><span>{aiming?'NEAR':'SLACK'}</span><span>{aiming?'FAR':'SNAP'}</span></span>
  </div>}
  <p className="fishing-hint" role="status">{hud.hint}</p>
  {!hud.active&&<div className="fishing-footer"><span>{hud.bestKg>0?`BEST ${hud.bestKg.toFixed(2)} kg`:'PERCH WATERS'}</span></div>}
 </section>;
}

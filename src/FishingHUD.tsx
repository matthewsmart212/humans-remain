import React from 'react';
import type {FishingHud} from './fishing-types';
import {FISHING_ART} from './fishing-art';
import {FISHING_SPECIES} from './fishing-catalog';
import {fishingStageLabel,fishingTensionLabel,fishingProgressLabel} from './fishing-feedback';
import './fishing-hud.css';

export type FishingHUDProps={hud:FishingHud;disabled?:boolean;onCatch:(keep:boolean)=>void;inputMode?:'touch'|'keyboard'};

/** The action is always the largest line. Status and instructions never rely
 * on colour, sound or knowing what a moving meter means. */
export default function FishingHUD({hud,disabled=false,onCatch,inputMode='touch'}:FishingHUDProps){
 const tension=Math.max(0,Math.min(1,hud.tension)),charge=Math.max(0,Math.min(1,hud.charge));
 const fighting=hud.phase==='reeling',aiming=hud.phase==='aiming',progress=Math.round(Math.max(0,Math.min(1,hud.progress))*100);
 const heldCatch=hud.catch,drone=heldCatch?.species==='drone';
 const detail=aiming?(inputMode==='touch'?'Drag on the left to move the landing marker.':'Use WASD to move the landing marker.'):hud.phase==='ready'&&!hud.disabled?(inputMode==='touch'?'Hold CAST, then drag on the left to aim.':'Hold Space, then use WASD to aim.'):hud.detail;
 const stopKeys=(event:React.KeyboardEvent)=>{if(event.key!=='Escape')event.stopPropagation()};
 if(heldCatch)return <section className="fishing-hud fishing-catch" aria-label={drone?'Your salvage':'Your catch'} onKeyDown={stopKeys} onKeyUp={stopKeys}>
  <div className="fishing-catch-title"><span>{drone?'SALVAGE FOUND':'YOUR CATCH'}</span>{heldCatch.isRecord&&!drone&&<strong>SPECIES BEST</strong>}</div>
  <div className="fishing-catch-fish"><img src={heldCatch.image||FISHING_ART.rawFish} alt="" draggable={false}/><div><h2>{FISHING_SPECIES[heldCatch.species].shortName}</h2><p><strong>{heldCatch.kg.toFixed(2)}</strong> kg</p></div></div>
  <div className="fishing-reward"><strong>{hud.rewardLabel}</strong><span>{(hud.rewardWeight??0).toFixed(2)} kg in bag</span></div>
  <p className="fishing-catch-note" role="status">{!hud.canKeep?'Bag full. Make room or return this catch to the lake.':drone?'Recover the useful metal, or return it to the water.':'Keep for cooking, or release it back into the lake.'}</p>
  <div className="fishing-catch-actions"><button type="button" disabled={disabled||!hud.canKeep} onClick={()=>onCatch(true)}>{drone?'SALVAGE':'KEEP'}</button><button type="button" className="fishing-release" disabled={disabled} onClick={()=>onCatch(false)}>{drone?'RETURN':'RELEASE'}</button></div>
  {!hud.canKeep&&<span className="fishing-bag-full">CATCH HELD SAFELY · OPEN BAG TO MAKE ROOM</span>}
 </section>;
 return <section className="fishing-hud" data-phase={hud.phase} data-tone={hud.tone} aria-label="Fishing" onKeyDown={stopKeys} onKeyUp={stopKeys}>
  <div className="fishing-heading"><span>{fishingStageLabel(hud)}</span><span className="fishing-bait" aria-label={`${hud.bait} bait remaining`}><img src={FISHING_ART.worms} alt="" draggable={false}/><b>{hud.bait}</b><small>BAIT</small></span></div>
  <div className="fishing-instruction" role="status" aria-live={hud.phase==='bite'?'assertive':'polite'}><strong className="fishing-command">{hud.command}</strong><p className="fishing-detail">{detail}</p></div>
  {fighting&&<>
   <div className="fishing-meter" role="meter" aria-label="Line tension" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(tension*100)} aria-valuetext={fishingTensionLabel(hud)}>
    <div className="fishing-meter-label"><span>LINE TENSION</span><b>{fishingTensionLabel(hud)}</b></div>
    <span className="fishing-meter-track"><i style={{width:`${tension*100}%`}}/><b className="fishing-danger-mark"/></span>
   </div>
   <div className="fishing-progress" role="progressbar" aria-label="Catch brought to shore" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
    <div className="fishing-meter-label"><span>{fishingProgressLabel(hud)}</span><b>{progress}%</b></div><span className="fishing-progress-track"><i style={{width:`${progress}%`}}/></span>
   </div>
  </>}
  {aiming&&<div className="fishing-aim">
   <div className="fishing-meter-label"><span>CAST DISTANCE</span><b>{Math.round(charge*100)}%</b></div><span className="fishing-progress-track"><i style={{width:`${charge*100}%`}}/></span>
   <p className="fishing-target" data-valid={hud.castValid}><b aria-hidden="true">{hud.castValid?'✓':'×'}</b>{hud.castHint}</p>
  </div>}
  {!hud.active&&<div className="fishing-footer"><span>{hud.bestKg>0?`BEST ${hud.bestKg.toFixed(2)} kg`:'PERCH · CARP · PIKE'}</span></div>}
 </section>;
}

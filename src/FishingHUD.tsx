import React from 'react';
import type {FishingHud} from './fishing-types';
import {FISHING_ART} from './fishing-art';
import {FISHING_SPECIES} from './fishing-catalog';
import {fishingTensionLabel,fishingProgressLabel} from './fishing-feedback';
import {fishingCompactCopy,fishingCompactReward,FISHING_HUD_WIDTH,FISHING_CATCH_WIDTH} from './fishing-hud-presentation';
import './fishing-hud.css';

export type FishingHUDProps={hud:FishingHud;disabled?:boolean;onCatch:(keep:boolean)=>void;inputMode?:'touch'|'keyboard'};

/** The action is always the largest line. Status and instructions never rely
 * on colour, sound or knowing what a moving meter means. */
export default function FishingHUD({hud,disabled=false,onCatch,inputMode='touch'}:FishingHUDProps){
 const tension=Math.max(0,Math.min(1,hud.tension));
 const fighting=hud.phase==='reeling',aiming=hud.phase==='aiming',progress=Math.round(Math.max(0,Math.min(1,hud.progress))*100);
 const heldCatch=hud.catch,drone=heldCatch?.species==='drone';
 const copy=fishingCompactCopy(hud,inputMode);
 const stopKeys=(event:React.KeyboardEvent)=>{if(event.key!=='Escape')event.stopPropagation()};
 if(heldCatch)return <section className="fishing-hud fishing-catch" style={{width:FISHING_CATCH_WIDTH}} aria-label={drone?'Your salvage':'Your catch'} onKeyDown={stopKeys} onKeyUp={stopKeys}>
  <div className="fishing-catch-fish"><img src={heldCatch.image||FISHING_ART.rawFish} alt="" draggable={false}/><div className="fishing-catch-summary"><div className="fishing-catch-name"><h2>{FISHING_SPECIES[heldCatch.species].shortName}</h2>{heldCatch.isRecord&&!drone&&<strong className="fishing-record" aria-label="Species best">BEST</strong>}</div><p><strong>{heldCatch.kg.toFixed(2)}</strong> kg</p></div></div>
  <p className="fishing-reward" aria-label={`${hud.rewardLabel}. ${(hud.rewardWeight??0).toFixed(2)} kg in bag`}>{fishingCompactReward(hud)}</p>
  {!hud.canKeep&&<p className="fishing-bag-full" role="status"><strong>Bag full · catch held safely</strong><span>Open bag to make room</span></p>}
  <div className="fishing-catch-actions"><button type="button" aria-label={drone?'Salvage metal into your bag':`Keep ${heldCatch.species} in your bag for cooking`} disabled={disabled||!hud.canKeep} onClick={()=>onCatch(true)}>{drone?'SALVAGE':'KEEP'}</button><button type="button" className="fishing-release" aria-label={`${drone?'Return drone':'Release '+heldCatch.species} to the lake`} disabled={disabled} onClick={()=>onCatch(false)}>{drone?'RETURN':'RELEASE'}</button></div>
 </section>;
 return <section className="fishing-hud" style={{width:FISHING_HUD_WIDTH}} data-phase={hud.phase} data-tone={hud.tone} aria-label="Fishing" onKeyDown={stopKeys} onKeyUp={stopKeys}>
  <div className="fishing-instruction" role="status" aria-live={hud.phase==='bite'?'assertive':'polite'} aria-atomic="true" aria-label={copy.accessibilityLabel}>
   <span className="fishing-sr-only">{copy.accessibilityLabel}</span>
   <div className="fishing-heading"><strong className="fishing-command" aria-hidden="true">{copy.command}</strong><span className="fishing-bait" aria-label={`${hud.bait} bait remaining`}><img src={FISHING_ART.worms} alt="" draggable={false}/><b>{hud.bait}</b></span></div>
   {copy.detail&&<p className="fishing-detail" aria-hidden="true" data-valid={aiming?hud.castValid:undefined}>{aiming&&<b>{hud.castValid?'✓ ':'× '}</b>}{copy.detail}</p>}
  </div>
  {fighting&&<>
   <div className="fishing-meter" role="meter" aria-label="Line tension" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(tension*100)} aria-valuetext={fishingTensionLabel(hud)}>
    <div className="fishing-meter-label"><span>LINE TENSION</span><b>{fishingTensionLabel(hud)}</b></div>
    <span className="fishing-meter-track"><i style={{width:`${tension*100}%`}}/><b className="fishing-danger-mark"/></span>
   </div>
   <div className="fishing-progress" role="progressbar" aria-label="Catch brought to shore" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
    <div className="fishing-meter-label"><span>{fishingProgressLabel(hud)}</span><b>{progress}%</b></div><span className="fishing-progress-track"><i style={{width:`${progress}%`}}/></span>
   </div>
  </>}
 </section>;
}

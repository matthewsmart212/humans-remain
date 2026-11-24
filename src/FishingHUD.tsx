import React from 'react';
import type {FishingHud,FishingCatchReceipt} from './fishing-types';
import {FISHING_ART} from './fishing-art';
import {FISHING_SPECIES} from './fishing-catalog';
import {fishingTensionLabel} from './fishing-feedback';
import {fishingAccessibleStatus,fishingHudKind,fishingHudWidth,fishingLostLabel,fishingReceiptPresentation} from './fishing-hud-presentation';
import './fishing-hud.css';

export type FishingHUDProps={hud?:FishingHud;receipt?:FishingCatchReceipt;disabled?:boolean;onCatch:(keep:boolean)=>void;onOpenBag:()=>void;inputMode?:'touch'|'keyboard'};

/** The lake and action button teach the loop; this overlay only shows resources,
 * the fight's two meters, a short receipt, or the full-bag exception. */
export default function FishingHUD({hud,receipt,disabled=false,onCatch,onOpenBag,inputMode='touch'}:FishingHUDProps){
 const notice=receipt??hud?.receipt,kind=fishingHudKind(hud,notice);
 const stopKeys=(event:React.KeyboardEvent)=>{if(event.key!=='Escape')event.stopPropagation()};
 if(kind==='hidden')return null;
 if(kind==='full'&&hud?.catch){
  const caught=hud.catch,drone=caught.species==='drone';
  return <section className="fishing-hud fishing-full" data-kind={kind} style={{width:fishingHudWidth(kind)}} aria-label="Catch held safely" onKeyDown={stopKeys} onKeyUp={stopKeys}>
   <div className="fishing-held-catch"><img src={caught.image||FISHING_ART.rawFish} alt="" draggable={false}/><strong>{FISHING_SPECIES[caught.species].shortName}<small>{caught.kg.toFixed(2)} kg</small></strong></div>
   <p className="fishing-full-note" role="status" aria-label={`${fishingAccessibleStatus(hud)} ${hud.rewardLabel}. ${(hud.rewardWeight??0).toFixed(2)} kg in bag.`}>Bag full · catch held</p>
   <div className="fishing-catch-actions"><button type="button" disabled={disabled} onClick={onOpenBag} aria-label="Open bag to make room for your catch">BAG</button><button type="button" className="fishing-release" disabled={disabled} onClick={()=>onCatch(false)} aria-label={`Return ${drone?'drone':caught.species} to the lake`}>{drone?'RETURN':'RELEASE'}</button></div>
  </section>;
 }
 if(kind==='receipt'&&notice){
  const copy=fishingReceiptPresentation(notice);
  return <section key={notice.id} className="fishing-hud fishing-receipt" data-kind={kind} style={{width:fishingHudWidth(kind),opacity:copy.opacity}} role="status" aria-live="polite" aria-atomic="true" aria-label={copy.accessibilityLabel}>
   <img src={notice.catch.image||FISHING_ART.rawFish} alt="" draggable={false}/><div><strong>{copy.title}</strong><span>{copy.detail}</span></div><b className="fishing-stowed" aria-hidden="true">✓</b>
  </section>;
 }
 if(!hud)return null;
 const status=fishingAccessibleStatus(hud,inputMode),tension=Math.max(0,Math.min(1,hud.tension)),progress=Math.round(Math.max(0,Math.min(1,hud.progress))*100);
 const warning=hud.tension>.78||hud.fightBehavior==='warning'||hud.fightBehavior==='surge';
 return <section className={`fishing-hud fishing-${kind}`} data-kind={kind} data-phase={hud.phase} data-warning={warning} data-danger={tension>.78} style={{width:fishingHudWidth(kind)}} aria-label="Fishing">
  <span className="fishing-sr-only" role="status" aria-live={hud.phase==='bite'?'assertive':'polite'} aria-atomic="true">{status}</span>
  {kind==='fight'?<>
   <div className="fishing-meter" role="meter" aria-label="Line tension" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(tension*100)} aria-valuetext={fishingTensionLabel(hud)}>
    <div className="fishing-meter-label"><span>TENSION</span><b className="fishing-strain" aria-hidden="true" style={{visibility:warning?'visible':'hidden'}}>!</b></div>
    <span className="fishing-meter-track"><i style={{width:`${tension*100}%`}}/><b className="fishing-danger-mark"/></span>
   </div>
   <div className="fishing-progress" role="progressbar" aria-label="Catch brought to shore" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
    <div className="fishing-meter-label"><span>TO SHORE</span></div><span className="fishing-progress-track"><i style={{width:`${progress}%`}}/></span>
   </div>
  </>:kind==='lost'?<span className="fishing-lost-label">{fishingLostLabel(hud)}</span>:<span className="fishing-bait-count" data-empty={hud.bait===0} aria-label={`${hud.bait} bait remaining`}><img src={FISHING_ART.worms} alt="" draggable={false}/><b>{hud.bait}</b></span>}
 </section>;
}

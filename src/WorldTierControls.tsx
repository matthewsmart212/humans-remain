import React from 'react';
import {tierIdentity,tierOptions,tierTargets} from './world-tiers';
import type {Placement,WorldLayout} from './world-layout';

export default function WorldTierControls({layout,placement,pending,disabled,onChange}:{layout:WorldLayout;placement:Placement;pending:boolean;disabled:boolean;onChange:(tier:number)=>void}){
 const identity=tierIdentity(placement.assetId),options=tierOptions(placement.assetId);
 if(!identity||options.length<2)return null;
 const targets=tierTargets(layout,placement.id),mixed=targets.some(p=>tierIdentity(p.assetId)?.tier!==identity.tier);
 return <section className="we-tiers" aria-label={identity.wall?'Linked wall tiers':'Object tiers'} aria-busy={pending}>
  <div className="we-tier-heading"><strong>{identity.wall?'Perimeter tier':'Item tier'}</strong><span>{mixed?'Mixed tiers':identity.tier===0?'Broken':`Tier ${identity.tier}`}</span></div>
  <div className="we-tier-options" role="group" aria-label="Choose tier">{options.map(option=>{
   const available=option.available&&targets.every(p=>tierOptions(p.assetId).some(o=>o.tier===option.tier&&o.available));
   return <button type="button" key={option.tier} disabled={disabled||pending||!available} aria-pressed={!mixed&&identity.tier===option.tier} onClick={()=>onChange(option.tier)}>
    <b data-broken={option.tier===0}>{option.tier===0?'Broken':'T'+option.tier}</b><span>{option.name}<small>{available?'': 'Artwork needed'}</small></span>
   </button>;
  })}</div>
  <p>{pending?'Loading tier artwork…':identity.wall?`Changes all ${targets.length} wall pieces together, including locked and mirrored copies.`:'Switch tiers to edit each upgrade separately.'}</p>
  <small>Each tier remembers its own position. Move or nudge a tier, then switch back to confirm the lower tier has not moved. Dimensions, rotation, layers and blockers remain shared. Undo restores the previous edit.</small>
 </section>;
}

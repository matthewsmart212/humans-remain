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
  <p>{pending?'Loading tier artwork…':identity.wall?`Changes all ${targets.length} placed wall pieces together, including locked and mirrored copies.`:'Switch up or down without moving this object.'}</p>
  <small>Position, dimensions, rotation, layers and blockers stay fixed. Undo restores the previous tier.</small>
 </section>;
}

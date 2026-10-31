import React from 'react';
import {Check,Shield,TriangleAlert} from 'lucide-react';
import type {FieldKitTarget} from './field-kit-target';
import {targetCaption} from './target-caption';
const materials:Record<string,string>={pallets:'/survival/ui-field-kit-v1/logs.png',stone:'/survival/world-rocks-v1/river-stone-trio.webp',scrap:'/survival/ui-backpack-v1/scrap.png',ironIngot:'/survival/ironworks-v1/iron-ingot.png'};
export default function FieldKitTargetCard({target:t,description}:{target:FieldKitTarget;description:string}){
 const caption=targetCaption(t),otherProgress=!caption.repair&&t.progress!==undefined?Math.round(t.progress*100):undefined;
 return <div className="kit-target" data-building-repair={caption.repair} data-blocked={!!t.blocked} data-repair={t.repairState} role="group" aria-label={caption.accessibilityLabel} title={description}>
  <div className="kit-target-heading">
   <b className="kit-target-name">{caption.label}</b>
   {caption.status&&<><span className="kit-target-separator" aria-hidden="true">·</span><span className="kit-target-state">{caption.status}</span></>}
   {caption.shield&&<Shield className="kit-target-shield" size={13} strokeWidth={2} aria-hidden="true"/>}
   {caption.progress!==undefined&&<strong className="kit-repair-percent" role="progressbar" aria-label="Repair progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={caption.progress}>{caption.progress}%</strong>}
  </div>
  {caption.repair?<div className="kit-target-row">
   {caption.hint&&<span className="kit-repair-hint" data-kind={caption.hintKind} title={caption.hint}>
    {caption.hintKind==='equipment'&&<img src="/survival/equipment/repair-hammer-v1.webp" alt=""/>}
    <span>{caption.hint}</span>
   </span>}
   <span className="kit-repair-materials" aria-label="Required repair materials">
    {caption.materials.map(row=><span key={row.id} className="kit-repair-material" data-missing={!row.available} aria-label={`${row.needed} ${row.name.toLowerCase()} required, ${row.have} available${row.missing?`, need ${row.missing} more`:''}`}>
     <img src={materials[row.id]} alt=""/><strong>{row.needed}</strong>
     {!caption.hint&&(row.available?<Check size={13} strokeWidth={3} className="kit-material-check" aria-hidden="true"/>:<TriangleAlert size={12} className="kit-material-missing" aria-hidden="true"/>)}
    </span>)}
   </span>
  </div>:<>
   {caption.detail&&<small>{caption.detail}</small>}
   {otherProgress!==undefined&&<span className="kit-target-progress" role="progressbar" aria-label={t.progressLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={otherProgress}><i style={{width:`${otherProgress}%`}}/></span>}
  </>}
 </div>;
}

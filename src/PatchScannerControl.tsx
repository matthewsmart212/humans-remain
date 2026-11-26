import React from 'react';
import './patch-scanner-control.css';

type Props={hint?:string;onScan:()=>void};

export default function PatchScannerControl({hint,onScan}:Props){
 const key=(event:React.KeyboardEvent)=>{if(event.key==='Enter'||event.key===' ')event.stopPropagation()};
 return <div className="patch-scanner-control">
  <span className="patch-scanner-hint" role="status" aria-live="polite">{hint}</span>
  <button type="button" aria-label="Pulse field scanner" title="Pulse field scanner" onKeyDown={key} onKeyUp={key}
   onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()}
   onClick={e=>{e.stopPropagation();onScan()}}>
   <img src="/survival/patch-ui-v1/scanner-control.webp" alt="" draggable={false}/>
   <span aria-hidden="true">SCAN</span>
  </button>
 </div>;
}

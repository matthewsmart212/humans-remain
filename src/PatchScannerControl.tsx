import React from 'react';
import './patch-scanner-control.css';

type Props={hint?:string;powered:boolean;onToggle?:()=>void};

export function ScannerPowerGlyph({powered,size=36}:{powered:boolean;size?:number}){
 const color=powered?'#a0edff':'#a7b8b7';
 return <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
  <circle cx="18" cy="18" r="16" fill={powered?'#245c6b66':'#17373766'}/>
  <path d="M10.2 10.2a11 11 0 1 0 15.6 0M18 4.5V17" stroke={color} strokeWidth="2.3" strokeLinecap="round"/>
 </svg>;
}

export default function PatchScannerControl({hint,powered,onToggle}:Props){
 return <div className="patch-scanner-control">
  <span className="patch-scanner-hint" role="status" aria-live="polite">{hint}</span>
  {onToggle&&<button type="button" className="patch-scanner-power" aria-label={powered?'Turn scanner off':'Turn scanner on'} aria-pressed={powered}
   onPointerDown={e=>e.stopPropagation()} onKeyDown={e=>e.stopPropagation()} onKeyUp={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onToggle()}}>
   <ScannerPowerGlyph powered={powered} size={25}/><span aria-hidden="true">{powered?'ON':'OFF'}</span>
  </button>}
 </div>;
}

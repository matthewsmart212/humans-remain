import React from 'react';
import './patch-scanner-control.css';

type Props={hint?:string};

export default function PatchScannerControl({hint}:Props){
 return <div className="patch-scanner-control">
  <span className="patch-scanner-hint" role="status" aria-live="polite">{hint}</span>
 </div>;
}

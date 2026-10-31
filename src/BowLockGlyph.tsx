import React from 'react';
export default function BowLockGlyph({locked=false}:{locked?:boolean}){
 return <svg viewBox="0 0 28 28" width="25" height="25" fill="none" aria-hidden="true">
  <g stroke="#122f2b" strokeWidth="4.5" strokeLinejoin="round"><path d="M10 4H4v6m14-6h6v6M4 18v6h6m14-6v6h-6"/><circle cx="14" cy="14" r="5.5"/></g>
  <g stroke={locked?'#d7edab':'#f1d39b'} strokeWidth="2" strokeLinejoin="round"><path d="M10 4H4v6m14-6h6v6M4 18v6h6m14-6v6h-6"/><circle cx="14" cy="14" r="5.5"/></g>
  <path d="m14 11 3 3-3 3-3-3Z" fill={locked?'#c2e98a':'#f4e6c7'}/>
 </svg>;
}

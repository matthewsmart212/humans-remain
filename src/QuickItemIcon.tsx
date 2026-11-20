import React from 'react';
import {quickItemArt} from './quick-item-art';
import type {QuickItem} from './quick-items';

export default function QuickItemIcon({item,size}:{item:{id:QuickItem;image:string};size:number}){
 const art=quickItemArt(item.id,size);
 return <span className="kit-quick-icon" aria-hidden="true" style={{width:size,height:size}}>
  <span className="kit-quick-art-crop" style={{...art.crop,left:(size-art.crop.width)/2,top:(size-art.crop.height)/2,transform:`rotate(${art.rotation}deg)`}}>
   <img src={item.image} style={art.image} alt="" draggable={false}/>
  </span>
 </span>;
}

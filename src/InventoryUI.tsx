import React from 'react';
import {fieldKitArt} from './field-kit';
import type {BagItem,BagItemId} from './backpack';
import './inventory-ui.css';
import './inventory-catalog.css';

export function InventoryHeader({title,eyebrow,kind,onClose,closeRef,image,closeLabel}:{image?:string;closeLabel?:string;title:string;eyebrow:string;kind:'chest'|'backpack';onClose:()=>void;closeRef?:React.Ref<HTMLButtonElement>}){
 return <header className="supply-header"><div className="supply-emblem"><img src={image??fieldKitArt(kind)} alt=""/></div><div><small>{eyebrow}</small><h2>{title}</h2></div><button ref={closeRef} className="supply-close" onClick={onClose} aria-label={closeLabel??`Close ${kind}`}><img src={fieldKitArt('close')} alt=""/></button></header>;
}
export function InventoryCapacity({weight,label}:{weight:number;label:string}){
 return <div className="supply-capacity"><img src={fieldKitArt('backpack')} alt=""/><div className="supply-load"><div><span>Carry weight</span><strong>{weight.toFixed(1)} <small>/ 24 kg</small></strong></div><div className="supply-meter" data-heavy={weight>18} role="progressbar" aria-label="Backpack weight. Movement slows above 18 kilograms." aria-valuemin={0} aria-valuemax={24} aria-valuenow={weight}><i style={{width:`${Math.min(100,weight/24*100)}%`}}/><b/></div></div><span className="supply-load-label" data-heavy={weight>18}>{label}</span></div>;
}
export function InventorySources({store,fromStore,onChange}:{store:'Chest'|'Warehouse';fromStore:boolean;onChange:(fromStore:boolean)=>void}){
 return <div className="inventory-sources" role="group" aria-label="Choose inventory">
  {[true,false].map(stored=>{
   const name=stored?store:'Backpack';
   const label=store==='Chest'?(stored?'Take from chest':'Store from backpack'):`View ${name.toLowerCase()} resources`;
   return <button key={name} type="button" aria-label={label} aria-pressed={stored===fromStore} onClick={()=>onChange(stored)}>
    <img src={fieldKitArt(stored?'chest':'backpack')} alt=""/>{name}
   </button>;
  })}
 </div>;
}

export function InventoryGrid({items,selected,equipped,onSelect,showCounts=false,source}:{items:BagItem[];selected?:BagItemId;equipped?:string;onSelect:(id:BagItemId)=>void;showCounts?:boolean;source?:'chest'|'backpack'}){
 return <div className="supply-grid" role="group" aria-label={source?`Items in ${source}`:'Inventory items'}>
  {items.map(item=><button key={item.id} type="button" className="supply-slot" aria-pressed={item.id===selected}
    aria-label={`${item.name}, ${item.count}${source?` in ${source}`:''}${equipped===item.id?', equipped':''}`} onClick={()=>onSelect(item.id)}>
   <img src={item.image} alt="" draggable={false}/><span>{item.name}</span>
   {equipped===item.id&&<small>IN HAND</small>}
   {(showCounts||item.count>1)&&<b>×{item.count}</b>}
  </button>)}
 </div>;
}
export function InventoryDetail({item,children,showInfo=true}:{item:BagItem;children?:React.ReactNode;showInfo?:boolean}){
 const benefits=[{icon:'food',amount:item.food,label:'food'},{icon:'heart',amount:item.health,label:'health'},{icon:'water',amount:item.water,label:'water'},{icon:'stamina',amount:item.stamina,label:'stamina'},{icon:'heart',amount:item.healthOverTime,label:`health over ${item.duration??20}s`}] as const;
 return <article className="supply-detail" aria-label="Selected item"><div className="supply-detail-copy"><div className="supply-item-heading"><div className="supply-item-art"><img src={item.image} alt=""/></div><div><small>{item.raw?'RAW · COOK FIRST':item.food?'READY TO EAT':item.category==='Gear'?'SURVIVAL GEAR':'CAMP MATERIAL'}</small><h3>{item.name}</h3></div></div>
 {benefits.some(b=>(b.amount??0)>0)&&<div className="supply-benefits">{benefits.filter(b=>(b.amount??0)>0).map(b=><span key={b.label}><img src={fieldKitArt(b.icon)} alt=""/><b>+{b.amount}</b> {b.label}</span>)}{item.raw&&<small>AFTER COOKING</small>}</div>}
 <dl className="supply-facts">{item.facts.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{showInfo&&<details className="supply-more"><summary>Item info</summary><p className="supply-description">{item.description}</p><p className="supply-hint">{item.hint}</p></details>}</div>{children}</article>;
}
export function InventoryEmpty({kind,title,children}:{kind:'chest'|'backpack';title:string;children:React.ReactNode}){
 return <div className="supply-empty"><div className="supply-empty-art"><img src={fieldKitArt(kind)} alt=""/></div><h3>{title}</h3>{children}</div>;
}

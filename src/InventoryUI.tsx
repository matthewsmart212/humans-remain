import React from 'react';
import {fieldKitArt} from './field-kit';
import {backpackDetail, type BagItem, type BagItemId} from './backpack';
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
   const label=stored?`Take from ${store.toLowerCase()}`:'Store from backpack';
   return <button key={name} type="button" aria-label={label} aria-pressed={stored===fromStore} onClick={()=>onChange(stored)}>
    <img src={fieldKitArt(stored?'chest':'backpack')} alt=""/>{stored?'Take':'Store'}
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
 const {benefits, benefitLabel, keyFact, otherFacts} = backpackDetail(item);
 const facts = <dl className="supply-facts">{otherFacts.map(([name, value]) =>
  <div key={name}><dt>{name}</dt><dd>{value}</dd></div>
 )}</dl>;
 return <article className="supply-detail" aria-label="Selected item">
  <div className="supply-detail-copy">
   <div className="supply-item-heading">
    <div className="supply-item-art"><img src={item.image} alt=""/></div>
    <div><h3>{item.name}</h3>{keyFact&&<span className="bag-key-fact">{keyFact.join(' · ')}</span>}</div>
   </div>
   {benefitLabel&&<small className="bag-benefit-label">{benefitLabel}</small>}
   {benefits.length>0&&<div className="supply-benefits">{benefits.map(b=>
    <span key={b.label}><img src={fieldKitArt(b.icon)} alt=""/><b>+{b.amount}</b> {b.label}</span>
   )}</div>}
   {showInfo ? <details key={item.id} className="supply-more">
    <summary>Item details</summary>{facts}
    <p className="supply-description">{item.description}</p><p className="supply-hint">{item.hint}</p>
   </details> : facts}
  </div>
  {children}
 </article>;
}
export function InventoryEmpty({kind,title,children}:{kind:'chest'|'backpack';title:string;children:React.ReactNode}){
 return <div className="supply-empty"><div className="supply-empty-art"><img src={fieldKitArt(kind)} alt=""/></div><h3>{title}</h3>{children}</div>;
}

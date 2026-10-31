import React,{useCallback,useEffect,useId,useRef,useState} from 'react';
import StationMenu from './StationMenu';
import {fieldKitArt} from './field-kit';
import {smithyView} from './smithy-view';
import {smithyAction} from './station-menu-model';
import type {World} from './survival-engine';
import type {GearKind} from './player-gear';
import type {CraftCategory} from './forge-recipes';
import './smithy.css';

export default function SmithyPanel({world,onClose,onChange}:{world:World;onClose:()=>void;onChange:()=>void}){
 const [category,setCategory]=useState<CraftCategory>('tools');
 const [selected,setSelected]=useState<GearKind>('woodenAxe');
 const [more,setMore]=useState(false),[message,setMessage]=useState('');
 const infoButton=useRef<HTMLButtonElement>(null),infoClose=useRef<HTMLButtonElement>(null);
 const closeInfo=useCallback(()=>{setMore(false);infoButton.current?.focus({preventScroll:true})},[]);
 useEffect(()=>{
  if(!more)return;
  infoClose.current?.focus({preventScroll:true});
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeInfo()}};
  document.addEventListener('keydown',escape,true);
  return()=>document.removeEventListener('keydown',escape,true);
 },[more,closeInfo]);
 const infoId=useId(),v=smithyView(world);
 if(!v)return null;
 const recipes=v.recipes.filter(recipe=>recipe.category===category);
 const r=recipes.find(recipe=>recipe.id===selected)??recipes[0];
 const chooseCategory=(next:CraftCategory)=>{
  setCategory(next);
  setSelected(v.recipes.find(recipe=>recipe.category===next)!.id);
  setMore(false);setMessage('');
 };
 const craft=()=>{setMessage(r.craft()?`${r.name} added to your backpack.`:'Supplies or space changed. Check the recipe.');onChange()};
 const action=r.canCraft?(r.count>1?`Craft ×${r.count}`:'Craft'):smithyAction(r);

 return <StationMenu compact world={world} title="Camp smithy" image={v.image} closeLabel="Leave smithy" onClose={onClose} weight={v.weight} loadLabel={v.loadLabel} message={message} className="smithy-menu">
  <div className="smithy-category-tabs" role="group" aria-label="Equipment category">
   {v.categories.map(c=><button key={c.id} aria-pressed={category===c.id} onClick={()=>chooseCategory(c.id)}>{c.label}</button>)}
  </div>
  <div className="smithy-catalog" data-category={category} role="group" aria-label={`${v.categories.find(c=>c.id===category)!.label} recipes`}>
   {recipes.map(item=><button className="smithy-tile" key={item.id} aria-pressed={r.id===item.id} aria-label={`Select ${item.name}. ${item.owned} in backpack. ${item.status}`} onClick={()=>{setSelected(item.id);setMore(false);setMessage('')}}>
    <img className="smithy-tile-art" src={item.image} alt=""/>
    <strong>{item.name}</strong>
    {item.owned>0&&<span className="smithy-bag-badge" aria-label={`${item.owned} in backpack`}><img src={fieldKitArt('backpack')} alt=""/>×{item.owned}</span>}
   </button>)}
  </div>
  <section className="smithy-selection" aria-label="Selected recipe">
   <div className="smithy-selection-heading">
    <img src={r.image} alt=""/><h3>{r.name}</h3>
    <button ref={infoButton} className="smithy-info-toggle" aria-label={`Item information for ${r.name}`} aria-expanded={more} aria-controls={infoId} onClick={()=>more?closeInfo():setMore(true)}><span aria-hidden="true">i</span></button>
    <small>Backpack + camp</small>
   </div>
   {more&&<div id={infoId} className="smithy-info-card" role="region" aria-label={`${r.name} information`} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeInfo()}}}>
    <div className="smithy-info-heading"><strong>{r.name}</strong><button ref={infoClose} aria-label="Close item information" onClick={closeInfo}>×</button></div>
    <p className="smithy-info-stats">{r.stat[0]} <b>{r.stat[1]}</b><span> · {r.weight.toFixed(2).replace(/0$/,'')} kg</span></p>
    <p>{r.description}</p><p className="smithy-info-ownership">Backpack <b>{r.owned}</b><span>Storage <b>{r.stored}</b></span></p>
   </div>}
   <div className="smithy-craft-row">
    <div className="smithy-costs" aria-label="Materials needed">
     {r.ingredients.map(m=><div className="smithy-cost" key={m.id} data-enough={m.enough} title={`${m.bag} in backpack · ${m.camp} in camp stores`}>
      <img src={m.image} alt=""/><span>{m.name}</span><b aria-label={`${m.available} available, ${m.needed} needed`}>{m.available}<small> / {m.needed}</small></b>
     </div>)}
    </div>
    <button className="supply-primary smithy-craft-action" disabled={!r.canCraft} aria-label={`Craft ${r.name}. ${r.status}`} onClick={craft}>{action}</button>
   </div>
  </section>
 </StationMenu>;
}

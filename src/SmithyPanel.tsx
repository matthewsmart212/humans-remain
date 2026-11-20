import {useStationFeedback} from './use-station-feedback';
import React,{useState} from 'react';
import StationMenu from './StationMenu';
import {ProductionDialog,ProductionRecipe} from './ProductionControls';
import {smithyView} from './smithy-view';
import {smithyAction} from './station-menu-model';
import type {World} from './survival-engine';
import type {GearKind} from './player-gear';
import type {CraftCategory} from './forge-recipes';
import './inventory-catalog.css';
import './smithy.css';

export default function SmithyPanel({world,onClose,onChange}:{world:World;onClose:()=>void;onChange:()=>void}){
 const [category,setCategory]=useState<CraftCategory>('tools');
 const [inspection,setInspection]=useState<GearKind|null>(null);
 const [message,setMessage]=useStationFeedback();
 const v=smithyView(world);
 if(!v)return null;
 const recipes=v.recipes.filter(recipe=>recipe.category===category);
 const inspected=recipes.find(recipe=>recipe.id===inspection);

 return <StationMenu compact fitContent={!inspected} world={world} title="Workshop" image={v.image} closeLabel="Leave workshop" onClose={onClose}
  message={message} className="production-menu smithy-menu">
  <div className="smithy-category-tabs" role="group" aria-label="Equipment category">
   {v.categories.map(c=><button key={c.id} type="button" aria-pressed={category===c.id}
    onClick={()=>{setCategory(c.id);setInspection(null);setMessage('')}}>{c.label}</button>)}
  </div>
  <ul key={category} className="smithy-catalog production-list" aria-label="Equipment recipes">
   {recipes.map(recipe=><ProductionRecipe key={recipe.id} name={recipe.name} image={recipe.image}
    detail={recipe.costLabel} blocked={recipe.canCraft?'':smithyAction(recipe)} limit={recipe.canCraft?1:0}
    action="Craft" actionLabel={()=>`Craft ${recipe.name}. ${recipe.status}`} onDetails={()=>setInspection(recipe.id)}
    onSubmit={()=>{
     setMessage(recipe.craft()?`${recipe.name} added to your backpack.`:'Supplies or space changed. Check the recipe.');
     onChange();
    }}/>)}
  </ul>
  {inspected&&<ProductionDialog title={inspected.name} closeLabel="Close item information" onClose={()=>setInspection(null)}>
   <div className="production-output"><img src={inspected.image} alt=""/><strong>{inspected.stat.join(' · ')}</strong></div>
   <p>{inspected.description}</p>
   <p>{Number(inspected.weight.toFixed(2))} kg · {inspected.owned} in backpack · {inspected.stored} in storage</p>
   <ul className="production-costs" aria-label="Materials available and required">
    {inspected.ingredients.map(m=><li key={m.id}><img src={m.image} alt=""/>{m.name}<b data-blocked={!m.enough||undefined}>{m.available} / {m.needed}</b></li>)}
   </ul>
   <p>{v.hint}</p>
  </ProductionDialog>}
 </StationMenu>;
}

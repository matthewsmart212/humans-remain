import React,{useState} from 'react';
import StationMenu from './StationMenu';
import {ProductionDialog,RecipeChoice} from './ProductionControls';
import {smithyView} from './smithy-view';
import {smithyAction} from './station-menu-model';
import type {World} from './survival-engine';
import type {GearKind} from './player-gear';
import type {CraftCategory} from './forge-recipes';
import './inventory-catalog.css';
import './smithy.css';

export default function SmithyPanel({world,onClose,onChange}:{world:World;onClose:()=>void;onChange:()=>void}){
 const [category,setCategory]=useState<CraftCategory>('tools');
 const [selected,setSelected]=useState<GearKind>('woodenAxe');
 const [more,setMore]=useState(false),[message,setMessage]=useState('');
 const v=smithyView(world);
 if(!v)return null;
 const recipes=v.recipes.filter(recipe=>recipe.category===category);
 const recipe=recipes.find(item=>item.id===selected)??recipes[0];
 const chooseCategory=(next:CraftCategory)=>{
  setCategory(next);
  setSelected(v.recipes.find(item=>item.category===next)!.id);
  setMore(false);
  setMessage('');
 };
 const craft=()=>{
  setMessage(recipe.craft()?`${recipe.name} added to your backpack.`:'Supplies or space changed. Check the recipe.');
  onChange();
 };
 const status=recipe.canCraft?'Ready to craft':smithyAction(recipe);

 return <StationMenu compact world={world} title="Camp smithy" image={v.image} closeLabel="Leave smithy" onClose={onClose}
  weight={v.weight} loadLabel={v.loadLabel} message={message} className="production-menu smithy-menu">
  <div className="smithy-category-tabs" role="group" aria-label="Equipment category">
   {v.categories.map(c=><button key={c.id} type="button" aria-pressed={category===c.id} onClick={()=>chooseCategory(c.id)}>{c.label}</button>)}
  </div>
  <div className="smithy-catalog production-recipes" role="group" aria-label={`${v.categories.find(c=>c.id===category)!.label} recipes`}>
   {recipes.map(item=><RecipeChoice key={item.id} name={item.name} image={item.image}
    detail={item.canCraft?'Ready to craft':smithyAction(item)} stock={`${item.owned} in backpack`}
    label={`Select ${item.name}. ${item.owned} in backpack. ${item.status}`} selected={recipe.id===item.id}
    onSelect={()=>{setSelected(item.id);setMore(false);setMessage('')}} />)}
  </div>
  <section className="production-batch" aria-label="Selected recipe">
   <div className="production-batch-summary">
    <strong>{recipe.name}</strong>
    <button type="button" className="production-icon" aria-haspopup="dialog" aria-label={`Item information for ${recipe.name}`} onClick={()=>setMore(true)}>
     <span className="production-info-mark" aria-hidden="true">i</span>
    </button>
    <span data-blocked={!recipe.canCraft||undefined}>{status}</span>
   </div>
   <div className="smithy-craft-row">
    <div className="smithy-costs" role="group" aria-label="Materials available and required from backpack and camp">
     {recipe.ingredients.map(m=><div className="smithy-cost" key={m.id} data-blocked={!m.enough||undefined}
      title={`${m.bag} in backpack · ${m.camp} in camp stores`}>
      <img src={m.image} alt=""/><span>{m.name}<b aria-label={`${m.available} available, ${m.needed} needed`}>{m.available} / {m.needed}</b></span>
     </div>)}
    </div>
    <button type="button" className="production-primary" disabled={!recipe.canCraft}
     aria-label={`Craft ${recipe.name}. ${status}`} onClick={craft}>{recipe.count>1?`Craft ×${recipe.count}`:'Craft'}</button>
   </div>
  </section>
  {more&&<ProductionDialog title={recipe.name} closeLabel="Close item information" onClose={()=>setMore(false)}>
   <div className="production-output"><img src={recipe.image} alt=""/><strong>{recipe.stat[0]} · {recipe.stat[1]}</strong></div>
   <p>{recipe.description}</p>
   <p>{Number(recipe.weight.toFixed(2))} kg · {recipe.owned} in backpack · {recipe.stored} in storage</p>
   <p>{v.hint}</p>
  </ProductionDialog>}
 </StationMenu>;
}

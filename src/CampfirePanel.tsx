import React,{useEffect,useRef,useState} from 'react';
import type {World} from './survival-engine';
import type {FoodSpecies} from './food-items';
import {campfireView} from './campfire-view';
import {campfireFoodSelection,queueCampfireFood} from './campfire-menu';
import {BAG_IMAGES} from './backpack';
import {packLoad} from './expedition-inventory';
import StationMenu from './StationMenu';
import './campfire-inventory.css';

export default function CampfirePanel({world,onClose,onChange}:{world:World;onClose:()=>void;onChange:()=>void}){
 const [selected,setSelected]=useState<FoodSpecies|null>(null),[quantity,setQuantity]=useState(1),[message,setMessage]=useState(''),[more,setMore]=useState<'food'|'meal'|null>(null);
 const body=useRef<HTMLDivElement>(null),focusInside=useRef<HTMLElement|null>(null),fuelButton=useRef<HTMLButtonElement>(null),focusAfterAdd=useRef(false);
 const v=campfireView(world),load=packLoad(world),available=v.food.filter(f=>f.count>0),jobs=v.jobs.filter(j=>j!==null),ready=v.food.filter(f=>f.ready>0);
 const {food,limit,amount,blocked}=campfireFoodSelection(v,selected,quantity),ownedKey=available.map(f=>`${f.species}:${f.count}`).join(',');
 useEffect(()=>{
  if(selected&&!available.some(f=>f.species===selected)){setSelected(null);setQuantity(1);setMore(null)}
  if(focusAfterAdd.current){focusAfterAdd.current=false;(body.current??fuelButton.current)?.focus({preventScroll:true})}
 },[selected,ownedKey]);
 useEffect(()=>{const previous=focusInside.current;if(previous&&!previous.isConnected){focusInside.current=null;if(document.activeElement===document.body)body.current?.focus({preventScroll:true})}});
 const act=(run:()=>boolean|number,success:string)=>{setMessage(run()?success:'Supplies or backpack space changed.');onChange()};
 const add=()=>{
  if(!food||!amount)return;
  const n=queueCampfireFood(world,food.species,amount),remaining=campfireView(world).food.find(f=>f.species===food.species)!.count;
  setMessage(n?`${n} ${n===1?'portion':'portions'} added to the fire.${v.burning?'':' Add wood to cook.'}`:'Food or fire space changed.');
  setQuantity(1);setMore(null);
  if(n&&!remaining){setSelected(null);focusAfterAdd.current=true}
  onChange();
 };
 const jobLabel=(label:string)=>label==='NO HEAT'?'Waiting for wood':label==='RACK FULL'?'Collect food first':label==='WAIT'?'Waiting':`${label} left`;
 const waiting=jobs.length&&!v.burning?(v.incoming?'Lighting the fire…':'Add wood to cook'):jobs.length&&v.ready>=v.rackMax?'Collect food to continue':'';
 return <StationMenu compact fitContent={!available.length&&!jobs.length&&!ready.length&&!more} world={world} title="Campfire" label="Tend the campfire" image="/survival/ui-field-kit-v1/cook.png" closeLabel="Leave campfire" onClose={onClose} weight={load.weight} loadLabel={load.label} message={message} className="campfire-menu" footerAction={v.preparedMeal.count>0?<button className="campfire-prepare-link" aria-expanded={more==='meal'} onClick={()=>setMore('meal')}>Prepare meal <span aria-hidden="true">›</span></button>:undefined}>
  <div ref={body} className="campfire-body" tabIndex={-1} role="region" aria-label="Campfire food and cooking" onFocusCapture={event=>{focusInside.current=event.target as HTMLElement}}>
   <section className="campfire-fuel-card" aria-label="Campfire fuel">
    <img src={BAG_IMAGES.logs} alt=""/><div><strong>{v.burning?`Fire ${v.time}`:v.incoming?'Lighting…':'Fire out'}</strong><div className="campfire-meter" role="progressbar" aria-label="Fire fuel remaining" aria-valuemin={0} aria-valuemax={v.fuelMax} aria-valuenow={Math.ceil(v.fuel*v.fuelMax)}><i style={{width:`${v.fuel*100}%`}}/></div></div>
    <small>{v.logs} wood</small><button ref={fuelButton} disabled={!v.canStoke} title="1 log adds 90 seconds of fire" aria-label={`Add wood. ${v.packLogs} in backpack, ${v.storedLogs} in camp`} onClick={()=>act(v.stoke,'Added a log · +90s fire.')}>{!v.logs?'Need wood':!v.canStoke?'Fire full':'Add wood'}</button>
   </section>
   <section className="campfire-bag-section" aria-label="Raw food in your backpack">
    <div className="campfire-section-title"><h3>In your backpack</h3>{available.length>0&&<span>Raw food</span>}</div>
    {available.length?<div className="campfire-food-grid">{available.map(f=><button className="campfire-food-tile" key={f.species} aria-pressed={selected===f.species} aria-label={`Select raw ${f.name.toLowerCase()}, ${f.count} in backpack`} onClick={()=>{setSelected(f.species);setQuantity(1);setMore(null);setMessage('')}}><img src={f.raw} alt=""/><strong>Raw {f.name.toLowerCase()}</strong><b>×{f.count}</b></button>)}</div>:<div className="campfire-empty"><strong>No raw food in your backpack</strong><p>{jobs.length||ready.length?'Food already on the fire is shown below.':'Bring raw food here to cook.'}</p></div>}
   </section>
   {(jobs.length>0||ready.length>0)&&<div className="campfire-status" data-both={jobs.length>0&&ready.length>0}>
    {jobs.length>0&&<section className="campfire-cooking"><div className="campfire-section-title"><h3>On the fire</h3><span>{jobs.length} / {v.queueMax}</span></div><div className="campfire-job-grid">{jobs.map(job=><button key={job.id} className="campfire-job" data-active={job.active} disabled={!job.canReturn} aria-label={`Return raw ${job.name.toLowerCase()} to backpack. ${jobLabel(job.label)}`} title="Return raw food to backpack" onClick={()=>act(job.remove,'Raw food returned to backpack.')}><img src={job.image} alt=""/><span><strong>{job.name}</strong><small>{jobLabel(job.label)}</small></span><b aria-hidden="true">×</b><div className="campfire-job-progress" role="progressbar" aria-label={`${job.name} cooking`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(job.progress*100)}><i style={{width:`${job.progress*100}%`}}/></div></button>)}</div></section>}
    {ready.length>0&&<section className="campfire-ready"><div className="campfire-section-title"><h3>Ready</h3><span>{v.ready} / {v.rackMax}</span>{v.ready>1&&<button disabled={!v.canCollect} aria-label="Collect cooked food that fits in backpack" onClick={()=>act(v.collect,'Cooked food added to backpack.')}>{v.canCollect?'Collect food':'Pack full'}</button>}</div><div className="campfire-ready-grid">{ready.map(f=><button key={f.species} disabled={!f.canTake} aria-label={`Take 1 cooked ${f.name.toLowerCase()}, ${f.ready} ready`} onClick={()=>act(f.take,'Cooked food added to backpack.')}><img src={f.cooked} alt=""/><span><strong>{f.name}</strong><small>{f.canTake?'Take 1':'Pack full'}</small></span><b>×{f.ready}</b></button>)}</div></section>}
   </div>}
   {!!waiting&&<p className="campfire-waiting" role="status">{waiting}</p>}
  </div>
  {available.length>0&&<section className="campfire-transfer" aria-label="Add selected raw food to fire" onFocusCapture={event=>{focusInside.current=event.target as HTMLElement}}><div className="campfire-selection">{food?<><img src={food.raw} alt=""/><strong>Raw {food.name.toLowerCase()}</strong><button className="campfire-info-button" aria-label={`About raw ${food.name.toLowerCase()}`} aria-expanded={more==='food'} onClick={()=>setMore('food')}>i</button><span>{limit?`${food.count} in bag`:blocked}</span></>:<span className="campfire-prompt">Select raw food to add</span>}</div><div className="campfire-transfer-controls" role="group" aria-label="Food quantity"><button aria-label="Decrease food quantity" disabled={amount<=1} onClick={()=>setQuantity(amount-1)}>−</button><output aria-label="Selected food quantity" aria-live="polite">{amount}</output><button aria-label="Increase food quantity" disabled={!limit||amount>=limit} onClick={()=>setQuantity(amount+1)}>+</button><button aria-label="Select maximum food that fits on fire" disabled={!limit} onClick={()=>setQuantity(limit)}>Max</button><button className="campfire-add-action" disabled={!food||!amount} aria-label={food?`Add ${amount} raw ${food.name.toLowerCase()} to fire`:'Select raw food to add to fire'} onClick={add}>{food&&!limit?'Fire full':<>Add to fire{amount>0&&` ×${amount}`}</>}</button></div></section>}
  {more==='food'&&food&&<CampfireInfo title={`Raw ${food.name.toLowerCase()}`} onClose={()=>setMore(null)}><div className="campfire-output"><img src={food.raw} alt=""/><span aria-hidden="true">→</span><img src={food.cooked} alt=""/><strong>Cooked {food.name.toLowerCase()}</strong></div><p>Each portion cooks in {food.seconds} seconds while the fire is lit.</p><p>Cooked food restores {food.food} food{food.health>0?` and ${food.health} health`:''}. Collect it from the fire when it is ready.</p><p className="campfire-info-note">Only food in your backpack can be added. Cooking waits safely if the fire goes out or the ready rack is full.</p></CampfireInfo>}
  {more==='meal'&&<CampfireInfo title="Hunter’s meal" onClose={()=>setMore(null)}><div className="campfire-output"><img src={v.preparedMeal.image} alt=""/><strong>1 cooked meat + 2 berries</strong></div><p>Prepare a meal using ingredients in your backpack.</p><p>Restores {v.preparedMeal.food} food and {v.preparedMeal.healthOverTime} health over {v.preparedMeal.duration} seconds.</p><button className="campfire-prepare-action" disabled={!v.preparedMeal.canPrepare} onClick={()=>{if(v.preparedMeal.prepare()){setMessage('Hunter’s meal added to backpack.');setMore(null)}else setMessage('Ingredients or backpack space changed.');onChange()}}>{v.preparedMeal.canPrepare?'Prepare meal':!v.preparedMeal.count?'Need ingredients':v.preparedMeal.actionLabel==='PACK FULL'?'Backpack full':'Wait a moment'}</button></CampfireInfo>}
 </StationMenu>;
}

function CampfireInfo({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){
 const dialog=useRef<HTMLDivElement>(null),close=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null,fallback=dialog.current?.closest('.station-menu')?.querySelector<HTMLButtonElement>('.station-menu-close');close.current?.focus({preventScroll:true});return()=>{(previous?.isConnected?previous:fallback)?.focus({preventScroll:true})}},[]);
 const keys=(event:React.KeyboardEvent)=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();onClose()}else if(event.key==='Tab'){const buttons=Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')??[]),first=buttons[0],last=buttons[buttons.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}};
 return <div className="campfire-info-backdrop" onClick={onClose}><div ref={dialog} className="campfire-info" role="dialog" aria-modal="true" aria-label={title} onClick={event=>event.stopPropagation()} onKeyDown={keys}><header><h3>{title}</h3><button ref={close} aria-label="Close food information" onClick={onClose}>×</button></header><div>{children}</div></div></div>;
}

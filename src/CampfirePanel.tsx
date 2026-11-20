import React, {useEffect, useRef, useState} from 'react';
import type {World} from './survival-engine';
import type {FoodSpecies} from './food-items';
import {campfireView} from './campfire-view';
import {campfireFoodSelection, queueCampfireFood} from './campfire-menu';
import {LOG_BURN_SECONDS} from './camp-kitchen';
import {packLoad} from './expedition-inventory';
import {BatchAction, FuelControl, ProductionDialog, ProductionJob, RecipeChoice} from './ProductionControls';
import StationMenu from './StationMenu';

type Props = {world: World; onClose: () => void; onChange: () => void};

export default function CampfirePanel({world, onClose, onChange}: Props) {
 const [selected, setSelected] = useState<FoodSpecies | null>(null);
 const [quantity, setQuantity] = useState(1);
 const [message, setMessage] = useState('');
 const [details, setDetails] = useState<'food' | 'meal' | null>(null);
 const body = useRef<HTMLDivElement>(null);
 const focusInside = useRef<HTMLElement | null>(null);
 const v = campfireView(world), load = packLoad(world);
 const available = v.food.filter(f => f.count > 0), jobs = v.jobs.filter(j => j !== null);
 const {food, amount, limit, blocked} = campfireFoodSelection(v, selected, quantity);
 const foodName = food ? `Raw ${food.name.toLowerCase()}` : '';
 // A queued or consumed last portion removes its card, selection and details.
 useEffect(() => {
  if (selected && !food) {
   setSelected(null); setQuantity(1);
   if (details === 'food') setDetails(null);
  }
 }, [selected, food, details]);
 useEffect(() => {
  if (focusInside.current && !focusInside.current.isConnected && document.activeElement === document.body) {
   focusInside.current = null;
   body.current?.focus({preventScroll:true});
  }
 });
 const act = (run: () => boolean | number, success: string) => {
  setMessage(run() ? success : 'Supplies or backpack space changed.');
  onChange();
 };
 const cook = () => {
  if (!food || !amount) return;
  const n = queueCampfireFood(world, food.species, amount);
  setMessage(n ? `${n} ${n === 1 ? 'portion' : 'portions'} added to the fire.${v.burning || v.incoming ? '' : ' Add wood to cook.'}` : 'Food or fire space changed.');
  setQuantity(1);
  if (n && !campfireView(world).food.find(f => f.species === food.species)?.count) {
   setSelected(null);
   body.current?.focus({preventScroll:true});
  }
  onChange();
 };

 return <StationMenu compact fitContent={!available.length && !jobs.length && !details} world={world} title="Campfire"
  label="Tend the campfire" image="/survival/ui-field-kit-v1/cook.png" closeLabel="Leave campfire" onClose={onClose}
  weight={load.weight} loadLabel={load.label} message={message} className="campfire-menu production-menu"
  footerAction={v.preparedMeal.count > 0 && <button type="button" aria-haspopup="dialog" onClick={() => setDetails('meal')}>Prepare meal</button>}>
  <div className="production-scroll" ref={body} tabIndex={-1} role="region" aria-label="Campfire food and cooking"
   onFocusCapture={event => {focusInside.current = event.target as HTMLElement;}}>
   <section className="production-section" aria-label="Raw food in your backpack">
    {available.length > 0 ? <>
     <header><h3>Raw food</h3><small>Backpack</small></header>
     <div className="production-recipes">{available.map(f =>
      <RecipeChoice key={f.species} name={`Raw ${f.name.toLowerCase()}`} image={f.raw} detail={`${f.seconds}s per portion`} stock={`×${f.count} in bag`} label={`Select raw ${f.name.toLowerCase()}, ${f.count} in backpack`}
       selected={selected === f.species} onSelect={() => {setSelected(f.species); setQuantity(1); setMessage('');}} />
     )}</div>
    </> : <div className="production-empty">
     <img src="/survival/camp-cooking-v1/roasting-spit.webp" alt="" />
     <div><h3>No raw food in your backpack</h3><p>Bring raw meat, chicken or rabbit to cook here.</p></div>
    </div>}
   </section>
   <FuelControl label={v.burning ? `Fire · ${v.time}` : v.incoming ? 'Lighting fire…' : 'Fire out'}
    seconds={Math.ceil(v.fuel * v.fuelMax)} capacity={v.fuelMax} logs={v.logs}
    duration={LOG_BURN_SECONDS} disabled={!v.canStoke} onAdd={() => act(v.stoke, `Added one log · +${LOG_BURN_SECONDS}s fire.`)} />
   {jobs.length > 0 && <section className="production-section" aria-label="Cooking queue">
    <header><h3>On the fire</h3><small>{jobs.length} / {v.queueMax}</small></header>
    <ul className="production-jobs">{jobs.map(job =>
     <ProductionJob key={job.id} name={job.name} image={job.image} progress={job.progress}
      status={job.label === 'NO HEAT' ? v.incoming ? 'Lighting fire…' : 'Needs wood' : job.label === 'WAIT' ? 'Waiting' : `${job.label} left`}
      canCancel={job.canReturn} cancelLabel={`Return raw ${job.name.toLowerCase()} to backpack. ${job.canReturn ? 'Cancel cooking.' : 'Backpack full.'}`}
      onCancel={() => act(job.remove, 'Raw food returned to backpack.')} />
    )}</ul>
    <p className="production-quiet">Cooked food lands on the ground beside the fire.</p>
   </section>}
  </div>
  {available.length > 0 && <BatchAction name={foodName || 'Select raw food'}
   detail={food ? (blocked || `${food.seconds * amount}s cook time`) : ''} blocked={!!food && !!blocked}
   infoLabel={`About ${foodName.toLowerCase()}`} onInfo={food ? () => setDetails('food') : undefined}
   amount={amount} limit={limit} onQuantity={setQuantity} action={amount ? `Cook ×${amount}` : 'Cook'}
   actionLabel={food ? `Add ${amount} raw ${food.name.toLowerCase()} to fire. Cook selected portions.` : 'Select raw food to add to fire'} onSubmit={cook} />}
  {details === 'food' && food && <ProductionDialog title={foodName} closeLabel="Close food information" onClose={() => setDetails(null)}>
   <div className="production-output"><img src={food.cooked} alt="" /><strong>Cooked {food.name.toLowerCase()}</strong></div>
   <p>One portion cooks in {food.seconds} seconds and restores {food.food} food{food.health > 0 ? ` and ${food.health} health` : ''}.</p>
   <p>Cooking pauses when the fire goes out. Collect finished portions from the ground beside the fire.</p>
  </ProductionDialog>}
  {details === 'meal' && <ProductionDialog title="Hunter’s meal" onClose={() => setDetails(null)}>
   <div className="production-output"><img src={v.preparedMeal.image} alt="" /><strong>{v.preparedMeal.ingredientLabel}</strong></div>
   <p>Uses ingredients from your backpack. Restores {v.preparedMeal.food} food and {v.preparedMeal.healthOverTime} health over {v.preparedMeal.duration} seconds.</p>
   <button type="button" className="production-primary" aria-label="Prepare Hunter’s meal" disabled={!v.preparedMeal.canPrepare} onClick={() => {
    if (v.preparedMeal.prepare()) {setMessage('Hunter’s meal added to backpack.'); setDetails(null);}
    else setMessage('Ingredients or backpack space changed.');
    onChange();
   }}>{v.preparedMeal.canPrepare ? 'Prepare meal' : !v.preparedMeal.count ? 'Need ingredients' : v.preparedMeal.actionLabel === 'PACK FULL' ? 'Backpack full' : 'Wait a moment'}</button>
  </ProductionDialog>}
 </StationMenu>;
}

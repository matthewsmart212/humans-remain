import {useStationFeedback} from './use-station-feedback';
import React, {useEffect, useState} from 'react';
import type {World} from './survival-engine';
import type {FoodSpecies} from './food-items';
import {campfireView} from './campfire-view';
import {campfireFoodSelection, queueCampfireFood} from './campfire-menu';
import {LOG_BURN_SECONDS} from './camp-kitchen';
import {FuelControl, ProductionBatch, ProductionDialog, ProductionJob, ProductionRecipe} from './ProductionControls';
import StationMenu from './StationMenu';

type Props = {world: World; onClose: () => void; onChange: () => void};

export default function CampfirePanel({world, onClose, onChange}: Props) {
 const [message, setMessage] = useStationFeedback();
 const [details, setDetails] = useState<FoodSpecies | 'meal' | null>(null);
 const v = campfireView(world);
 const available = v.food.filter(f => f.count > 0), jobs = v.jobs.filter(j => j !== null);
 const food = available.find(f => f.species === details);
 const batch = food && campfireFoodSelection(v, food.species, 1);
 useEffect(() => {
  if (details && details !== 'meal' && !food) setDetails(null);
 }, [details, food]);
 const act = (run: () => boolean | number, success: string) => {
  setMessage(run() ? success : 'Supplies or backpack space changed.');
  onChange();
 };
 const cook = (species: FoodSpecies, amount: number) => {
  const n = queueCampfireFood(world, species, amount);
  setMessage(n ? `${n} ${n === 1 ? 'portion' : 'portions'} added to the fire.${v.burning || v.incoming ? '' : ' Add wood to cook.'}` : 'Food or fire space changed.');
  onChange();
 };
 const fuel = <FuelControl label={v.burning ? `Fire · ${v.time}` : v.incoming ? 'Lighting fire…' : 'Fire out'}
  seconds={Math.ceil(v.fuel * v.fuelMax)} capacity={v.fuelMax} logs={v.logs} duration={LOG_BURN_SECONDS}
  disabled={!v.canStoke} onAdd={() => act(v.stoke, `Added one log · +${LOG_BURN_SECONDS}s fire.`)} />;
 const needsFuel = jobs.length > 0 && !v.burning;

 const full = jobs.length >= v.queueMax;
 const queueList = jobs.length > 0 && <section className="production-section" aria-label="Cooking queue">
    <header><h3>{full ? 'Fire full' : 'On the fire'}</h3><small>{jobs.length} / {v.queueMax}</small></header>
    <ul className="production-jobs">{jobs.map(job =>
     <ProductionJob key={job.id} name={job.name} image={job.image} progress={job.progress}
      status={job.label === 'NO HEAT' ? v.incoming ? 'Lighting fire…' : 'Needs wood' : job.label === 'WAIT' ? 'Waiting' : `${job.label} left`}
      canCancel={job.canReturn} cancelLabel={`Return raw ${job.name.toLowerCase()} to backpack. ${job.canReturn ? 'Cancel cooking.' : 'Backpack full.'}`}
      onCancel={() => act(job.remove, 'Raw food returned to backpack.')} />
    )}</ul>
    <p className="production-quiet">Cooked food lands on the ground beside the fire.</p>
   </section>;

 return <StationMenu compact fitContent={!details} world={world} title="Campfire"
  label="Tend the campfire" image="/survival/ui-field-kit-v1/cook.png" closeLabel="Leave campfire" onClose={onClose}
  message={message} className="campfire-menu production-menu"
  footerAction={v.preparedMeal.count > 0 && <button type="button" aria-haspopup="dialog" onClick={() => setDetails('meal')}>Prepare meal</button>}>
  <div className="production-scroll" role="region" aria-label="Campfire food and cooking">
   {needsFuel && fuel}
   {full && queueList}
   <section className="production-section" aria-label="Raw food in your backpack">
    {available.length > 0 ? <ul className="production-list">{available.map(f => {
     const name = `Raw ${f.name.toLowerCase()}`;
     const {blocked} = campfireFoodSelection(v, f.species, 1);
     return <ProductionRecipe key={f.species} name={name} image={f.raw}
      detail={`${f.count} in bag · ${f.seconds}s`} disabled={!!blocked} blocked={full ? '' : blocked}
      action="Cook" actionLabel={`Cook 1 ${name.toLowerCase()}`}
      onDetails={() => setDetails(f.species)} onSubmit={() => cook(f.species, 1)} />;
    })}</ul> : <div className="production-empty">
     <img src="/survival/camp-cooking-v1/roasting-spit.webp" alt="" />
     <h3>No raw food in your backpack</h3>
    </div>}
   </section>
   {!needsFuel && fuel}
   {!full && queueList}
  </div>
  {food && batch && <ProductionDialog title={`Raw ${food.name.toLowerCase()}`} closeLabel="Close food information" onClose={() => setDetails(null)}>
   <div className="production-output"><img src={food.cooked} alt="" /><strong>{food.seconds}s · +{food.food} food{food.health > 0 ? ` · +${food.health} health` : ''}</strong></div>
   <p>Collect the cooked portion beside the fire.</p>
   <ProductionBatch name={`Raw ${food.name}`} action="Cook" limit={batch.limit} blocked={batch.blocked}
    actionLabel={n => `Cook ${n} raw ${food.name.toLowerCase()}`} onSubmit={n => {cook(food.species, n); setDetails(null);}} />
  </ProductionDialog>}
  {details === 'meal' && <ProductionDialog title="Hunter’s meal" onClose={() => setDetails(null)}>
   <div className="production-output"><img src={v.preparedMeal.image} alt="" /><strong>{v.preparedMeal.ingredientLabel}</strong></div>
   <p>+{v.preparedMeal.food} food · +{v.preparedMeal.healthOverTime} health over {v.preparedMeal.duration}s.</p>
   <button type="button" className="production-primary" aria-label="Prepare Hunter’s meal" disabled={!v.preparedMeal.canPrepare} onClick={() => {
    if (v.preparedMeal.prepare()) {setMessage('Hunter’s meal added to backpack.'); setDetails(null);}
    else setMessage('Ingredients or backpack space changed.');
    onChange();
   }}>{v.preparedMeal.canPrepare ? 'Prepare meal' : !v.preparedMeal.count ? 'Need ingredients' : v.preparedMeal.actionLabel === 'PACK FULL' ? 'Backpack full' : 'Wait a moment'}</button>
  </ProductionDialog>}
 </StationMenu>;
}

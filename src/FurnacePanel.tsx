import React, {useState} from 'react';
import {furnaceView} from './furnace-view';
import {IRONWORKS_IMAGES, FURNACE_LOG_SECONDS, FURNACE_RULES, type SmeltRecipe} from './ironworks-data';
import {furnaceBatchSelection, queueFurnaceBatches, smeltMaterialName, smeltCostLabel, furnaceCollectCount, furnaceFuelTime, furnaceJobLabel} from './furnace-menu';
import {BatchAction, FuelControl, ProductionDialog, ProductionJob, RecipeChoice} from './ProductionControls';
import StationMenu from './StationMenu';
import type {World} from './survival-engine';

type Props = {world: World; onClose: () => void; onChange: () => void};

export default function FurnacePanel({world, onClose, onChange}: Props) {
 const [message, setMessage] = useState('');
 const [selected, setSelected] = useState<SmeltRecipe>('ore');
 const [quantity, setQuantity] = useState(1);
 const [details, setDetails] = useState<'recipe' | 'upgrade' | null>(null);
 const v = furnaceView(world);
 if (!v) return null;
 const {recipe, input, limit, amount, blocked} = furnaceBatchSelection(v, selected, quantity);
 const material = smeltMaterialName(recipe.id);
 const upgrade = FURNACE_RULES[2];
 const collectCount = furnaceCollectCount(world, v);
 const act = (run: () => number | boolean, success: string) => {
  setMessage(run() ? success : 'Supplies or backpack space changed.');
  onChange();
 };
 const queue = () => {
  const n = queueFurnaceBatches(world, recipe.id, amount);
  setMessage(n ? `Queued ${n} ${n === 1 ? 'ingot' : 'ingots'}.${v.fuel ? '' : ' Add wood to start.'}` : 'Supplies or queue space changed.');
  setQuantity(1);
  onChange();
 };

 return <StationMenu compact world={world} title="Camp furnace" image={v.image} closeLabel="Leave furnace"
  className="furnace-menu production-menu" onClose={onClose} weight={v.weight} loadLabel={v.loadLabel} message={message}
  footerAction={<button type="button" aria-haspopup="dialog" onClick={() => setDetails('upgrade')}>{v.upgrade.complete ? 'Reinforced bellows' : 'Bellows upgrade'}</button>}>
  <div className="production-scroll">
   <section className="production-section" aria-label="Smelting recipes">
    <header><h3>Smelting recipes</h3><small>Backpack + camp</small></header>
    <div className="production-recipes">
     {v.recipes.map(r => <RecipeChoice key={r.id} name={smeltMaterialName(r.id)} image={r.image}
      detail={smeltCostLabel(r.id)} stock={`${r.available} available`} selected={r.id === selected}
      onSelect={() => {setSelected(r.id); setQuantity(1); setMessage('');}} />)}
    </div>
   </section>
   <div className="production-utilities">
    <FuelControl label={v.fuel ? `Fuel · ${furnaceFuelTime(v.fuel)}` : 'Furnace cold'} seconds={v.fuel} capacity={v.fuelMax} logs={v.logs}
     disabled={!v.canFuel} duration={FURNACE_LOG_SECONDS} onAdd={() => act(v.feed, `Added one log · +${FURNACE_LOG_SECONDS}s heat.`)} />
    <section className="production-utility" aria-label="Furnace output">
     <img src={IRONWORKS_IMAGES.ironIngot} alt="" />
     <div className="production-utility-copy"><strong>{v.ready} ready</strong><small>{v.ready && !v.canTake ? 'Backpack full' : v.ready >= v.rackMax ? 'Output full' : 'Iron ingots'}</small></div>
     <button type="button" className="production-secondary" disabled={!v.canTake} onClick={() => act(v.collect, 'Ingots added to backpack.')}
      aria-label={`Collect ${collectCount} ready ${collectCount === 1 ? 'ingot' : 'ingots'}`}>Collect{collectCount > 1 ? ` ×${collectCount}` : ''}</button>
    </section>
   </div>
   <section className="production-section" aria-label="Smelting queue">
    <header><h3>Smelting queue</h3><small>{v.queueSize} / {v.queueMax}</small></header>
    {v.jobs.length > 0 ? <ul className="production-jobs">{v.jobs.map(job =>
     <ProductionJob key={job.id} name={job.name} image={job.image} status={furnaceJobLabel(job.label)} progress={job.progress}
      canCancel={job.canCancel} cancelLabel={`Cancel ${job.name.toLowerCase()} and return materials to camp`}
      onCancel={() => act(job.cancel, 'Materials returned to camp stores.')} />
    )}</ul> : <p className="production-quiet">No ingots queued.</p>}
   </section>
  </div>
  <BatchAction name={material} blocked={!!blocked} detail={blocked || `${input.count * amount} ${recipe.id === 'ore' ? 'ore' : 'scrap'} · ${Math.ceil(recipe.seconds * amount)}s`}
   infoLabel={`${material} recipe details`} onInfo={() => setDetails('recipe')}
   amount={amount} limit={limit} action={`Queue ×${amount}`} actionLabel={`Queue ${amount} ${amount === 1 ? 'ingot' : 'ingots'} using ${material.toLowerCase()}`}
   onQuantity={setQuantity} onSubmit={queue} />
  {details && <ProductionDialog title={details === 'recipe' ? material : v.upgrade.complete ? 'Reinforced bellows' : 'Bellows upgrade'} onClose={() => setDetails(null)}>
   {details === 'recipe' ? <>
    <div className="production-output"><img src={recipe.image} alt="" /><strong>{smeltCostLabel(recipe.id)}</strong></div>
    <p>Each ingot takes {Math.ceil(recipe.seconds)} seconds. The furnace uses materials from your backpack first, then camp stores.</p>
    <p>Add wood to keep it running and collect finished ingots to free up output space. Queued batches keep their progress while you explore.</p>
   </> : <>
    <p>Reinforced bellows smelt faster and hold {upgrade.queue} queued ingots, {upgrade.rack} finished ingots and {upgrade.fuel} seconds of fuel.</p>
    {v.upgrade.complete ? <p>Installed on this furnace.</p> : <>
     <ul className="production-costs">{v.upgrade.ingredients.map(m =>
      <li key={m.id}><img src={m.image} alt="" /><span>{m.name}</span><b data-blocked={!m.enough}>{m.enough ? `${m.available} / ${m.needed}` : `Need ${m.needed - m.available} more`}</b></li>
     )}</ul>
     <button type="button" className="production-primary" disabled={!v.upgrade.canUpgrade} onClick={() => {
      if (v.upgrade.run()) {setDetails(null); setMessage('Bellows reinforced.');}
      else setMessage('Supplies changed.');
      onChange();
     }}>Upgrade bellows</button>
    </>}
   </>}
  </ProductionDialog>}
 </StationMenu>;
}

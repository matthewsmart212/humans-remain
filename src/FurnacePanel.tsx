import {useStationFeedback} from './use-station-feedback';
import React, {useState} from 'react';
import {furnaceView} from './furnace-view';
import {IRONWORKS_IMAGES, FURNACE_LOG_SECONDS, FURNACE_RULES, type SmeltRecipe} from './ironworks-data';
import {furnaceBatchSelection, queueFurnaceBatches, smeltMaterialName, smeltCostLabel, furnaceCollectCount, furnaceFuelTime, furnaceJobLabel} from './furnace-menu';
import {FuelControl, ProductionDialog, ProductionJob, ProductionRecipe} from './ProductionControls';
import StationMenu from './StationMenu';
import type {World} from './survival-engine';

type Props = {world: World; onClose: () => void; onChange: () => void};

export default function FurnacePanel({world, onClose, onChange}: Props) {
 const [message, setMessage] = useStationFeedback();
 const [details, setDetails] = useState<SmeltRecipe | 'upgrade' | null>(null);
 const v = furnaceView(world);
 if (!v) return null;
 const recipe = v.recipes.find(r => r.id === details);
 const upgrade = FURNACE_RULES[2];
 const collectCount = furnaceCollectCount(world, v);
 const act = (run: () => number | boolean, success: string) => {
  setMessage(run() ? success : 'Supplies or backpack space changed.');
  onChange();
 };
 const queue = (id: SmeltRecipe, amount: number) => {
  const n = queueFurnaceBatches(world, id, amount);
  setMessage(n ? `Queued ${n} ${n === 1 ? 'ingot' : 'ingots'}.${v.fuel ? '' : ' Add wood to start.'}` : 'Supplies or queue space changed.');
  onChange();
 };

 const needsFuel = v.state === 'NEEDS WOOD';
 const fuel = <FuelControl label={v.fuel ? `Fuel · ${furnaceFuelTime(v.fuel)}` : 'Furnace cold'} seconds={v.fuel} capacity={v.fuelMax} logs={v.logs}
  disabled={!v.canFuel} duration={FURNACE_LOG_SECONDS} onAdd={() => act(v.feed, `Added one log · +${FURNACE_LOG_SECONDS}s heat.`)} />;

 return <StationMenu compact fitContent={!details} world={world} title="Camp furnace" image={v.image} closeLabel="Leave furnace"
  className="furnace-menu production-menu" onClose={onClose} message={message}
  footerAction={!v.upgrade.complete && <button type="button" aria-haspopup="dialog" onClick={() => setDetails('upgrade')}>Bellows upgrade</button>}>
  <div className="production-scroll">
   {v.ready > 0 && <section className="production-utility production-ready" aria-label="Furnace output">
    <img src={IRONWORKS_IMAGES.ironIngot} alt="" />
    <div className="production-utility-copy"><strong>{v.ready} {v.ready === 1 ? 'ingot' : 'ingots'} ready</strong>
     {!v.canTake ? <small>Backpack full</small> : v.ready >= v.rackMax && <small>Output full</small>}
    </div>
    <button type="button" className="production-primary" disabled={!v.canTake} onClick={() => act(v.collect, 'Ingots added to backpack.')}
     aria-label={`Collect ${collectCount} ready ${collectCount === 1 ? 'ingot' : 'ingots'}`}>Collect{collectCount > 1 ? ` ×${collectCount}` : ''}</button>
   </section>}
   {needsFuel && fuel}
   <section className="production-section" aria-label="Smelting recipes">
    <ul className="production-list">{v.recipes.map(r => {
     const {limit, blocked} = furnaceBatchSelection(v, r.id, 1);
     const name = smeltMaterialName(r.id);
     return <ProductionRecipe key={r.id} name={name} image={r.image}
      detail={blocked ? smeltCostLabel(r.id) : `${smeltCostLabel(r.id)} · ${r.available} available`} blocked={blocked} limit={limit}
      action="Smelt" actionLabel={n => `Smelt ${n} ${n === 1 ? 'ingot' : 'ingots'} from ${name.toLowerCase()}`}
      onDetails={() => setDetails(r.id)} onSubmit={n => queue(r.id, n)} />;
    })}</ul>
   </section>
   {!needsFuel && fuel}
   {v.jobs.length > 0 && <section className="production-section" aria-label="Smelting queue">
    <header><h3>In the furnace</h3><small>{v.queueSize} / {v.queueMax}</small></header>
    <ul className="production-jobs">{v.jobs.map(job =>
     <ProductionJob key={job.id} name={job.name} image={job.image} status={furnaceJobLabel(job.label)} progress={job.progress}
      canCancel={job.canCancel} cancelLabel={`Cancel ${job.name.toLowerCase()} and return materials to camp`}
      onCancel={() => act(job.cancel, 'Materials returned to camp stores.')} />
    )}</ul>
   </section>}
  </div>
  {details && <ProductionDialog title={recipe ? smeltMaterialName(recipe.id) : 'Bellows upgrade'} onClose={() => setDetails(null)}>
   {recipe ? <>
    <div className="production-output"><img src={IRONWORKS_IMAGES.ironIngot} alt="" /><strong>{smeltCostLabel(recipe.id)} · {Math.ceil(recipe.seconds)}s</strong></div>
    <p>Uses materials from your backpack, then camp stores. Smelting pauses without wood.</p>
   </> : <>
    <p>Smelt faster. Hold {upgrade.queue} queued ingots, {upgrade.rack} finished ingots and {upgrade.fuel}s of heat.</p>
     <ul className="production-costs">{v.upgrade.ingredients.map(m =>
      <li key={m.id}><img src={m.image} alt="" /><span>{m.name}</span><b data-blocked={!m.enough}>{m.enough ? `${m.available} / ${m.needed}` : `Need ${m.needed - m.available} more`}</b></li>
     )}</ul>
     <button type="button" className="production-primary" disabled={!v.upgrade.canUpgrade} onClick={() => {
      if (v.upgrade.run()) {setDetails(null); setMessage('Bellows reinforced.');}
      else setMessage('Supplies changed.');
      onChange();
     }}>Upgrade bellows</button>
   </>}
  </ProductionDialog>}
 </StationMenu>;
}

import {useStationFeedback} from './use-station-feedback';
import React, {useState} from 'react';
import {furnaceView} from './furnace-view';
import {IRONWORKS_IMAGES, FURNACE_LOG_SECONDS, type SmeltRecipe} from './ironworks-data';
import {furnaceBatchSelection, queueFurnaceBatches, smeltMaterialName, smeltCostLabel, furnaceCollectCount, furnaceFuelTime, furnaceJobLabel} from './furnace-menu';
import {FuelControl, ProductionBatch, ProductionDialog, ProductionJob, ProductionRecipe} from './ProductionControls';
import StationMenu from './StationMenu';
import type {World} from './survival-engine';

type Props = {world: World; onClose: () => void; onChange: () => void};

export default function FurnacePanel({world, onClose, onChange}: Props) {
 const [message, setMessage] = useStationFeedback();
 const [details, setDetails] = useState<SmeltRecipe | null>(null);
 const v = furnaceView(world);
 if (!v) return null;
 const recipe = v.recipes.find(r => r.id === details);
 const batch = recipe && furnaceBatchSelection(v, recipe.id, 1);
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

 const full = v.queueSize >= v.queueMax;
 const queueList = v.jobs.length > 0 && <section className="production-section" aria-label="Smelting queue">
    <header><h3>{full ? 'Queue full' : 'In the furnace'}</h3><small>{v.queueSize} / {v.queueMax}</small></header>
    <ul className="production-jobs">{v.jobs.map(job =>
     <ProductionJob key={job.id} name={job.name} image={job.image} status={furnaceJobLabel(job.label)} progress={job.progress}
      canCancel={job.canCancel} cancelLabel={`Cancel ${job.name.toLowerCase()} and return materials to camp`}
      onCancel={() => act(job.cancel, 'Materials returned to camp stores.')} />
    )}</ul>
   </section>;

 return <StationMenu compact fitContent={!details} world={world} title="Camp furnace" image={v.image} closeLabel="Leave furnace"
  className="furnace-menu production-menu" onClose={onClose} message={message}>
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
   {full && queueList}
   <section className="production-section" aria-label="Smelting recipes">
    <ul className="production-list">{v.recipes.map(r => {
     const {blocked} = furnaceBatchSelection(v, r.id, 1);
     const name = smeltMaterialName(r.id);
     return <ProductionRecipe key={r.id} name={name} image={r.image}
      detail={smeltCostLabel(r.id)} disabled={!!blocked} blocked={full ? '' : blocked}
      action="Smelt" actionLabel={`Smelt 1 ingot from ${name.toLowerCase()}`}
      onDetails={() => setDetails(r.id)} onSubmit={() => queue(r.id, 1)} />;
    })}</ul>
   </section>
   {!needsFuel && fuel}
   {!full && queueList}
  </div>
  {recipe && batch && <ProductionDialog title={smeltMaterialName(recipe.id)} onClose={() => setDetails(null)}>
    <div className="production-output"><img src={IRONWORKS_IMAGES.ironIngot} alt="" /><strong>{smeltCostLabel(recipe.id)} · {Math.ceil(recipe.seconds)}s</strong></div>
    <p>{recipe.available} available in backpack and camp stores.</p>
    <ProductionBatch name={smeltMaterialName(recipe.id)} action="Smelt" limit={batch.limit} blocked={batch.blocked}
     actionLabel={n => `Smelt ${n} ${n === 1 ? 'ingot' : 'ingots'} from ${smeltMaterialName(recipe.id).toLowerCase()}`}
     onSubmit={n => {queue(recipe.id, n); setDetails(null);}} />
  </ProductionDialog>}
 </StationMenu>;
}

import React from 'react';
import StationMenu from './StationMenu';
import type {World} from './survival-engine';
import {chestItemCount,chestTransferLimit} from './chest-inventory';
import {packLoad} from './expedition-inventory';
import {atHeadquartersChest} from './player-gear';
import {InventorySources} from './InventoryUI';
import {chestItemEffects} from './station-menu-model';
import {useChestTransfer} from './use-chest-transfer';
import './chest-catalog.css';

type Props={world:World;onClose:()=>void;onChange:()=>void};
export default function ChestPanel({world,onClose,onChange}:Props){
 const c=useChestTransfer(world,onChange),load=packLoad(world);
 const source=c.packing?'chest':'backpack',destination=c.packing?'backpack':'chest';
 return <StationMenu compact fitContent world={world} title="Supply chest" label={atHeadquartersChest(world)?'Headquarters chest':'Camp chest'} onClose={onClose} weight={load.weight} loadLabel={load.label} message={c.message} className="chest-menu">
  <InventorySources store="Chest" fromStore={c.packing} onChange={fromChest=>c.changeSide(fromChest?'chest':'pack')}/>
  {c.filters.length>0&&<div className="chest-categories" role="group" aria-label="Filter items">{c.filters.map(f=><button key={f} aria-pressed={c.filter===f} onClick={()=>c.changeFilter(f)}>{f}</button>)}</div>}
  <div className="chest-browser" aria-label={`Items in ${source}`} onKeyDown={e=>{
   if(e.key==='Escape'&&c.selected){
    e.preventDefault();e.stopPropagation();
    e.currentTarget.querySelector<HTMLButtonElement>('.chest-item-toggle[aria-expanded="true"]')?.focus();
    c.collapse();
   }
  }}>
   {!c.items.length&&<p className="chest-empty">{c.emptyTitle}</p>}
   {c.items.map(item=>{
    const open=c.selected===item.id,limit=chestTransferLimit(world,item.id,c.side);
    const amount=Math.min(open?c.quantity:1,limit),blocked=c.packing?'Pack full':'Cannot store';
    const effects=open?chestItemEffects(item):[];
    return <div className="chest-item" key={item.id} data-expanded={open}>
     <div className="chest-item-row">
      <button className="chest-item-toggle" aria-expanded={open} aria-label={`${item.name}, ${item.count} in ${source}`} onClick={()=>c.select(item.id)}>
       <img src={item.image} alt=""/><strong>{item.name}</strong>{item.count>1&&<span>×{item.count}</span>}<i aria-hidden="true"/>
      </button>
      <button className="supply-primary chest-move" aria-label={`${c.verb} ${open?amount:'one'} ${item.name}`} disabled={!limit} onClick={()=>c.move(item.id,item.name,amount)}>
       {limit?(amount>1?`${c.verb} ${amount}`:c.verb):blocked}
      </button>
     </div>
     {open&&<div className="chest-expanded">
       {limit>1&&<div className="chest-stepper" role="group" aria-label="Transfer quantity">
        <button aria-label="Decrease quantity" disabled={amount<=1} onClick={()=>c.setQuantity(amount-1)}>−</button>
        <output aria-label="Selected quantity" aria-live="polite">{amount}</output>
        <button aria-label="Increase quantity" disabled={amount>=limit} onClick={()=>c.setQuantity(amount+1)}>+</button>
        <button aria-label="Select maximum quantity" disabled={amount>=limit} onClick={()=>c.setQuantity(limit)}>Max</button>
       </div>}
      <div className="chest-item-info">
       <p>{item.description}</p>{effects.length>0&&<p>{item.raw?'After cooking · ':''}{effects.join(' · ')}</p>}
       <dl><div><dt>In {destination}</dt><dd>{chestItemCount(world,item.id,c.packing?'pack':'chest')}</dd></div>{item.facts.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </div>
     </div>}
    </div>;
   })}
  </div>
 </StationMenu>;
}

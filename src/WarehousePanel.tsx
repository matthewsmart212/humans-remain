import React,{useId,useState} from 'react';
import type {World} from './survival-engine';
import {WAREHOUSE_MATERIALS,WAREHOUSE_ART,warehouseLevel,type WarehouseMaterial} from './warehouse';
import {WAREHOUSE_MASKS} from './warehouse-renderer';
import {transferWarehouse,warehouseView} from './warehouse-storage';
import {itemCount,packLoad,storedCount} from './expedition-inventory';
import {fieldKitArt} from './field-kit';
import StationMenu from './StationMenu';
import './warehouse.css';
export function WarehousePicture({world}:{world:World}){return <div className="warehouse-picture" aria-hidden="true"><img src={WAREHOUSE_ART.full} alt=""/>{(['pallets','scrap'] as const).map(id=>{const level=warehouseLevel(world.stock[id],id);return level<2&&<img key={id} src={level?WAREHOUSE_ART.half:WAREHOUSE_ART.empty} alt="" style={{clipPath:`polygon(${WAREHOUSE_MASKS[id].map(([x,y])=>`${x*100}% ${y*100}%`).join(',')})`}}/>})}</div>}
export default function WarehousePanel({world,onClose,onChange}:{world:World;onClose:()=>void;onChange:()=>void}){
 const [selected,setSelected]=useState<WarehouseMaterial>('pallets'),[taking,setTaking]=useState(false),[quantity,setQuantity]=useState(1),[message,setMessage]=useState(''),[showInfo,setShowInfo]=useState(false);
 const infoId=useId();
 const load=packLoad(world),v=warehouseView(world,selected,taking,quantity);
 const destination=taking?'backpack':'warehouse',route=taking?'Warehouse → Backpack':'Backpack → Warehouse';
 const afterBag=v.bag+(taking?v.amount:-v.amount),afterStored=v.stored+(taking?-v.amount:v.amount);
 const actionLabel=v.limit?`${taking?'Take':'Store'} ${v.amount} ${v.amount===1?v.material.singular:v.material.unit}`:taking?(v.stored?'Backpack full':`No ${v.material.name.toLowerCase()} in warehouse`):`No ${v.material.name.toLowerCase()} in backpack`;
 const transfer=()=>{const n=transferWarehouse(world,selected,taking,v.amount);setMessage(n?`${taking?'Took':'Stored'} ${n} ${n===1?v.material.singular:v.material.unit} ${taking?'into your backpack':'in the warehouse'}.`:'Supplies or backpack space changed.');setQuantity(1);onChange()};
 return <StationMenu world={world} title="Warehouse" label="Warehouse storage" onClose={onClose} weight={load.weight} loadLabel={load.label} message={message} className="warehouse-menu" compact fitContent>
 <div className="warehouse-overview">
  <div className="warehouse-mode" role="group" aria-label="Transfer direction">{[false,true].map(t=><button key={String(t)} aria-pressed={taking===t} aria-label={t?'Take resources from warehouse to backpack':'Store resources from backpack in warehouse'} onClick={()=>{setTaking(t);setQuantity(1);setMessage('');setShowInfo(false)}}><img src={fieldKitArt(t?'backpack':'chest')} alt=""/><span><strong>{t?'Take to backpack':'Store in warehouse'}</strong><small>{t?'Warehouse → Backpack':'Backpack → Warehouse'}</small></span></button>)}</div>
  <div className="warehouse-resources" role="group" aria-label="Choose material; backpack and warehouse amounts">{WAREHOUSE_MATERIALS.map(m=>{
   const bag=itemCount(world,m.id),stored=storedCount(world,m.id);
   return <button className="warehouse-resource" key={m.id} aria-pressed={selected===m.id} aria-label={`${m.name}: ${bag} in backpack, ${stored} in warehouse`} onClick={()=>{setSelected(m.id);setQuantity(1);setMessage('');setShowInfo(false)}}><span className="warehouse-resource-heading"><img src={m.image} alt=""/><strong>{m.name}</strong></span><span className="warehouse-resource-balances"><span data-source={!taking}><span>Backpack</span><b>{bag}</b></span><span data-source={taking}><span>Warehouse</span><b>{stored}</b></span></span></button>;
  })}</div>
  <div className="warehouse-selected">
   <div className="warehouse-selected-heading"><img src={v.material.image} alt=""/><h3>{v.material.name}</h3><button className="warehouse-info-toggle" aria-label={`${v.material.name} information`} aria-expanded={showInfo} aria-controls={infoId} onClick={()=>setShowInfo(!showInfo)}><span aria-hidden="true">i</span></button></div>
   <div className="warehouse-preview" aria-label={v.limit?`After transfer: ${afterBag} in backpack, ${afterStored} in warehouse`:route}><small>{v.limit?'After transfer':'Transfer direction'}</small>{v.limit?<span>Backpack <b>{afterBag}</b><i aria-hidden="true">·</i>Warehouse <b>{afterStored}</b></span>:<span>{route}</span>}</div>
  </div>
  {showInfo&&<p id={infoId} className="warehouse-info" role="note">{v.hint}</p>}
 </div>
 <div className="warehouse-actions"><div className="warehouse-quantity" role="group" aria-label={`${v.material.name} quantity`}><button aria-label="Decrease quantity" disabled={v.amount<=1} onClick={()=>setQuantity(v.amount-1)}>−</button><output aria-live="polite" aria-label="Selected quantity">{v.amount}</output><button aria-label="Increase quantity" disabled={v.amount>=v.limit} onClick={()=>setQuantity(v.amount+1)}>+</button><button disabled={!v.limit} aria-label={taking?'Select all that fit':'Select all available'} onClick={()=>setQuantity(v.limit)}>Max</button></div><button className="warehouse-primary" disabled={!v.limit} aria-label={v.limit?`${actionLabel} ${taking?'to':'in'} ${destination}`:actionLabel} onClick={transfer}><strong>{actionLabel}</strong>{v.limit>0&&<small>{taking?'To your backpack':'Into the warehouse'}</small>}</button></div>
 </StationMenu>;
}

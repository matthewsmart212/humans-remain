import React,{useId,useState} from 'react';
import type {World} from './survival-engine';
import {WAREHOUSE_MATERIALS,WAREHOUSE_ART,warehouseLevel,type WarehouseMaterial} from './warehouse';
import {WAREHOUSE_MASKS} from './warehouse-renderer';
import {transferWarehouse,warehouseView} from './warehouse-storage';
import {packLoad,storedCount} from './expedition-inventory';
import {fieldKitArt} from './field-kit';
import StationMenu from './StationMenu';
import './warehouse.css';
export function WarehousePicture({world}:{world:World}){return <div className="warehouse-picture" aria-hidden="true"><img src={WAREHOUSE_ART.full} alt=""/>{(['pallets','scrap'] as const).map(id=>{const level=warehouseLevel(world.stock[id],id);return level<2&&<img key={id} src={level?WAREHOUSE_ART.half:WAREHOUSE_ART.empty} alt="" style={{clipPath:`polygon(${WAREHOUSE_MASKS[id].map(([x,y])=>`${x*100}% ${y*100}%`).join(',')})`}}/>})}</div>}
export default function WarehousePanel({world,onClose,onChange}:{world:World;onClose:()=>void;onChange:()=>void}){
 const [selected,setSelected]=useState<WarehouseMaterial>('pallets'),[taking,setTaking]=useState(false),[quantity,setQuantity]=useState(1),[message,setMessage]=useState(''),[showInfo,setShowInfo]=useState(false);
 const infoId=useId();
 const load=packLoad(world),v=warehouseView(world,selected,taking,quantity);
 const transfer=()=>{const n=transferWarehouse(world,selected,taking,v.amount);setMessage(n?`${n} ${n===1?v.material.singular:v.material.unit} ${taking?'packed':'stored'}.`:'Supplies or backpack space changed.');setQuantity(1);onChange()};
 return <StationMenu world={world} title="Warehouse" label="Warehouse storage" onClose={onClose} weight={load.weight} loadLabel={load.label} message={message} className="warehouse-menu" compact fitContent>
 <div className="warehouse-overview">
  <div className="warehouse-mode" role="group" aria-label="Transfer direction">{[true,false].map(t=><button key={String(t)} aria-pressed={taking===t} aria-label={t?'Take from camp stores':'Store in camp'} onClick={()=>{setTaking(t);setQuantity(1);setMessage('');setShowInfo(false)}}><img src={fieldKitArt(t?'chest':'backpack')} alt=""/>{t?'Take':'Store'}</button>)}</div>
  <div className="warehouse-resources" role="group" aria-label="Choose material">{WAREHOUSE_MATERIALS.map(m=><button className="warehouse-resource" key={m.id} aria-pressed={selected===m.id} aria-label={`${m.name}, ${storedCount(world,m.id)} in camp`} onClick={()=>{setSelected(m.id);setQuantity(1);setMessage('');setShowInfo(false)}}><img src={m.image} alt=""/><strong>{m.name}</strong><span>Camp <b>{storedCount(world,m.id)}</b></span></button>)}</div>
  <div className="warehouse-selected">
   <div className="warehouse-selected-heading"><img src={v.material.image} alt=""/><h3>{v.material.name}</h3><button className="warehouse-info-toggle" aria-label={`${v.material.name} information`} aria-expanded={showInfo} aria-controls={infoId} onClick={()=>setShowInfo(!showInfo)}><span aria-hidden="true">i</span></button></div>
   <div className="warehouse-flow" aria-label={taking?`Camp ${v.stored} to backpack ${v.bag}`:`Backpack ${v.bag} to camp ${v.stored}`}><span>{taking?'Camp':'Bag'} <b>{taking?v.stored:v.bag}</b></span><span aria-hidden="true">→</span><span>{taking?'Bag':'Camp'} <b>{taking?v.bag:v.stored}</b></span></div>
  </div>
  <div className="warehouse-actions"><div className="warehouse-quantity" role="group" aria-label={`${v.material.name} quantity`}><button aria-label="Decrease quantity" disabled={v.amount<=1} onClick={()=>setQuantity(v.amount-1)}>−</button><output aria-live="polite" aria-label="Selected quantity">{v.amount}</output><button aria-label="Increase quantity" disabled={v.amount>=v.limit} onClick={()=>setQuantity(v.amount+1)}>+</button><button disabled={!v.limit} aria-label={taking?'Select all that fit':'Select all available'} onClick={()=>setQuantity(v.limit)}>Max</button></div><button className="warehouse-primary" disabled={!v.limit} aria-label={v.action} onClick={transfer}>{v.limit?`${taking?'Take':'Store'} ×${v.amount}`:v.action}</button></div>
  {showInfo&&<p id={infoId} className="warehouse-info" role="note">{v.hint}</p>}
 </div></StationMenu>;
}

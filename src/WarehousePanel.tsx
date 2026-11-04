import React,{useState} from 'react';
import type {World} from './survival-engine';
import {WAREHOUSE_ART,warehouseLevel,type WarehouseMaterial} from './warehouse';
import {warehouseStockMask} from './warehouse-renderer';
import {transferWarehouse,warehouseView} from './warehouse-storage';
import {warehouseInventoryItems,warehouseMaterialForItem} from './warehouse-inventory';
import {packLoad,storedCount} from './expedition-inventory';
import {fieldKitArt} from './field-kit';
import {InventoryGrid,InventoryDetail} from './InventoryUI';
import StationMenu from './StationMenu';
import './warehouse.css';

export function WarehousePicture({world}:{world:World}){return <div className="warehouse-picture" aria-hidden="true"><img src={WAREHOUSE_ART.empty} alt=""/>{(['pallets','stone','scrap'] as const).map(id=>{const level=warehouseLevel(storedCount(world,id),id);return level>0&&<img key={id} src={level===1?WAREHOUSE_ART.half:WAREHOUSE_ART.full} alt="" style={{clipPath:`polygon(${warehouseStockMask(id).map(([x,y])=>`${x*100}% ${y*100}%`).join(',')})`}}/>})}</div>}

export default function WarehousePanel({world,onClose,onChange}:{world:World;onClose:()=>void;onChange:()=>void}){
 const [selected,setSelected]=useState<WarehouseMaterial>('pallets'),[taking,setTaking]=useState(true),[message,setMessage]=useState('');
 const load=packLoad(world),v=warehouseView(world,selected,taking,1),items=warehouseInventoryItems(world,taking);
 const item=items.find(i=>warehouseMaterialForItem(i.id)===selected)!;
 const verb=taking?'Take':'Store',destination=taking?'to backpack':'in warehouse';
 const stackLabel=taking&&v.limit>0&&v.limit<v.stored?`Take ${v.limit}`:`${verb} all`;
 const blockedReason=taking?(v.stored?'Backpack full':`No ${v.material.name.toLowerCase()} in warehouse`):`No ${v.material.name.toLowerCase()} in backpack`;
 const transfer=(quantity:1|'all')=>{
  const n=transferWarehouse(world,selected,taking,quantity);
  setMessage(n?`${taking?'Took':'Stored'} ${n} ${n===1?v.material.singular:v.material.unit} ${taking?'into your backpack':'in the warehouse'}.`:'Supplies or backpack space changed.');
  onChange();
 };
 return <StationMenu world={world} title="Warehouse" label="Warehouse storage" onClose={onClose} weight={load.weight} loadLabel={load.label} message={message} className="warehouse-menu" compact fitContent>
  <div className="supply-tabs warehouse-tabs" role="group" aria-label="Choose inventory">
   {[true,false].map(t=><button key={String(t)} aria-pressed={taking===t} aria-label={t?'View warehouse resources':'View backpack resources'} onClick={()=>{setTaking(t);setMessage('')}}><img src={fieldKitArt(t?'chest':'backpack')} alt=""/>{t?'Warehouse':'Backpack'}</button>)}
  </div>
  <div className="supply-body warehouse-inventory-body">
   <div className="supply-inventory" role="group" aria-label={taking?'Warehouse resources':'Backpack resources'}>
    <InventoryGrid items={items} selected={item.id} showCounts onSelect={id=>{const material=warehouseMaterialForItem(id);if(material){setSelected(material);setMessage('')}}}/>
   </div>
   <InventoryDetail item={item} showInfo={false}>
    {!v.limit&&<p className="warehouse-empty-reason">{blockedReason}</p>}
    <div className="supply-actions warehouse-transfer-actions">
     <button className="supply-primary" disabled={!v.limit} aria-label={`${verb} 1 ${v.material.singular} ${destination}`} onClick={()=>transfer(1)}>{verb} 1</button>
     <button disabled={v.limit<=1} aria-label={`${stackLabel} ${v.material.unit} ${destination}`} onClick={()=>transfer('all')}>{stackLabel}</button>
    </div>
   </InventoryDetail>
  </div>
 </StationMenu>;
}

import {useStationFeedback} from './use-station-feedback';
import React,{useState} from 'react';
import type {World} from './survival-engine';
import {WAREHOUSE_ART,warehouseLevel,type WarehouseMaterial} from './warehouse';
import {warehouseStockMask} from './warehouse-renderer';
import {transferWarehouse} from './warehouse-storage';
import {warehouseStartsTaking,warehouseTransferRows} from './warehouse-inventory';
import {packLoad,storedCount} from './expedition-inventory';
import {InventorySources} from './InventoryUI';
import StationMenu from './StationMenu';
import './warehouse.css';

export function WarehousePicture({world}:{world:World}){return <div className="warehouse-picture" aria-hidden="true"><img src={WAREHOUSE_ART.empty} alt=""/>{(['pallets','stone','scrap'] as const).map(id=>{const level=warehouseLevel(storedCount(world,id),id);return level>0&&<img key={id} src={level===1?WAREHOUSE_ART.half:WAREHOUSE_ART.full} alt="" style={{clipPath:`polygon(${warehouseStockMask(id).map(([x,y])=>`${x*100}% ${y*100}%`).join(',')})`}}/>})}</div>}

export default function WarehousePanel({world,onClose,onChange}:{world:World;onClose:()=>void;onChange:()=>void}){
 const [taking,setTaking]=useState(()=>warehouseStartsTaking(world)),[message,setMessage]=useStationFeedback();
 const load=packLoad(world),verb=taking?'Take':'Store';
 const rows=warehouseTransferRows(world,taking);
 const transfer=(id:WarehouseMaterial,name:string,quantity:1|'all')=>{
  const n=transferWarehouse(world,id,taking,quantity);
  setMessage(n?`${taking?'Took':'Stored'} ${name} ×${n}.`:'Supplies or backpack space changed.');
  onChange();
 };
 return <StationMenu world={world} title="Warehouse" image={WAREHOUSE_ART.empty} label="Warehouse storage" onClose={onClose} weight={load.weight} loadLabel={load.label} message={message} className="warehouse-menu" compact fitContent>
  <InventorySources store="Warehouse" fromStore={taking} onChange={fromWarehouse=>{setTaking(fromWarehouse);setMessage('')}}/>
  <div className="warehouse-list" aria-label={taking?'Warehouse resources':'Backpack resources'}>
   {!rows.length&&<p className="warehouse-empty">{taking?'Warehouse empty':'No materials in your backpack'}</p>}
   {rows.map(({material,available,limit,singleLabel,stackLabel})=><div key={material.id} className="warehouse-row">
    <img src={material.image} alt=""/>
    <div className="warehouse-stock"><strong>{material.name}</strong><span>×{available}</span></div>
    <div className="warehouse-actions">
     <button disabled={!limit} aria-label={`${verb} 1 ${material.singular}`} onClick={()=>transfer(material.id,material.name,1)}>{singleLabel}</button>
     {limit>1&&<button className="supply-primary" aria-label={`${verb} ${limit} ${material.unit}`} onClick={()=>transfer(material.id,material.name,'all')}>{stackLabel}</button>}
    </div>
   </div>)}
  </div>
 </StationMenu>;
}

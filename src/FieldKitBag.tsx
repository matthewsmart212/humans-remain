import StationMenu from './StationMenu';
import React,{useEffect,useState} from 'react';
import {backpackItems,type BagItemId,type BagResult} from './backpack';
import {fieldKitArt,type FieldKitSnapshot} from './field-kit';
import {InventoryGrid,InventoryDetail,InventoryEmpty} from './InventoryUI';
type Props={open:boolean;stats:FieldKitSnapshot;onClose:()=>void;onUse:(id:BagItemId)=>boolean;onDrop:(id:BagItemId,quantity:1|'all')=>BagResult};
export default function FieldKitBag({open,stats,onClose,onUse,onDrop}:Props){
 const [selected,setSelected]=useState<BagItemId>('raw'),[message,setMessage]=useState('');
 const items=backpackItems(stats),item=items.find(i=>i.id===selected)??items.find(i=>i.category==='Food')??items[0];
 useEffect(()=>{if(open)setMessage('')},[open]);
 const use=()=>{const ok=onUse(item!.id);setMessage(ok?item?.food?'Meal eaten.':`${item!.name} ${stats.selected===item!.id?'stowed':'equipped'}.`:'Cannot use right now.')};
 const drop=(quantity:1|'all')=>setMessage(onDrop(item!.id,quantity).message);
 if(!open)return null;
 return <StationMenu world={stats.action.owner} kind="backpack" title="Your backpack" label="Backpack" subtitle="Paused · select an item" onClose={onClose} weight={stats.weight} loadLabel={stats.loadLabel} message={message}>
  <div className="supply-body" data-empty={!item}>{item?<><div className="supply-inventory"><div className="supply-inventory-label"><span>Everything you carry</span><span>{items.length} {items.length===1?'item':'items'}</span></div><InventoryGrid items={items} selected={item.id} equipped={stats.selected} onSelect={id=>{setSelected(id);setMessage('')}}/></div><InventoryDetail item={item}><div className="supply-actions">{item.useLabel&&<button className="supply-primary" disabled={item.useDisabled} onClick={use}>{item.useLabel}</button>}{item.droppable&&<><button className="supply-drop" disabled={stats.downed} onClick={()=>drop(1)}>Drop</button>{item.count>1&&<button className="supply-drop" disabled={stats.downed} onClick={()=>drop('all')}>Drop stack</button>}</>}</div></InventoryDetail></>:<InventoryEmpty kind="backpack" title="Your pack is empty"><p>Both axes are waiting in the headquarters chest. Choose your gear, or head out with just your fists.</p></InventoryEmpty>}</div>
 </StationMenu>;
}

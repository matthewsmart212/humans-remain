import React,{useEffect,useRef,useState} from 'react';
import StationMenu from './StationMenu';
import type {World} from './survival-engine';
import type {BagItem,BagItemId,BagFilter} from './backpack';
import {chestItemCount,chestItems,chestTransferLimit,moveChestItem,type ChestSide} from './chest-inventory';
import {packLoad} from './expedition-inventory';
import {atHeadquartersChest} from './player-gear';
import {fieldKitArt} from './field-kit';
import {InventoryEmpty} from './InventoryUI';
import {CHEST_FILTERS,filterChestItems,chestItemEffects} from './station-menu-model';
import './chest-catalog.css';

type Props={world:World;onClose:()=>void;onChange:()=>void};
export default function ChestPanel({world,onClose,onChange}:Props){
 const [side,setSide]=useState<ChestSide>('chest'),[filter,setFilter]=useState<BagFilter>('All');
 const [selected,setSelected]=useState<BagItemId|null>(null),[quantity,setQuantity]=useState(1);
 const [message,setMessage]=useState(''),[showInfo,setShowInfo]=useState(false);
 const infoButton=useRef<HTMLButtonElement>(null),infoClose=useRef<HTMLButtonElement>(null);
 const all=chestItems(world,side),items=filterChestItems(all,filter),item=items.find(i=>i.id===selected);
 const packing=side==='chest',verb=packing?'Take':'Store',load=packLoad(world);
 const limit=item?chestTransferLimit(world,item.id,side):0,amount=Math.min(Math.max(1,quantity),limit);
 useEffect(()=>{if(showInfo)infoClose.current?.focus({preventScroll:true})},[showInfo]);
 useEffect(()=>{if(selected&&!item){setSelected(null);setQuantity(1);setShowInfo(false)}},[selected,item?.id]);
 const reset=()=>{setSelected(null);setQuantity(1);setMessage('');setShowInfo(false)};
 const changeSide=(next:ChestSide)=>{setSide(next);reset()};
 const changeFilter=(next:BagFilter)=>{setFilter(next);reset()};
 const select=(id:BagItemId)=>{setSelected(id);setQuantity(1);setMessage('');setShowInfo(false)};
 const closeInfo=()=>{setShowInfo(false);infoButton.current?.focus({preventScroll:true})};
 const move=()=>{
  if(!item||!amount)return;
  const n=moveChestItem(world,item.id,side,amount);
  setMessage(n?`${item.name}${n>1?` ×${n}`:''} ${packing?'packed':'stored'}.`:'No room or supplies available.');
  setQuantity(1);setShowInfo(false);
  if(chestItemCount(world,item.id,side)===0)setSelected(null);
  onChange();
 };
 const action=!item?verb:!limit?packing?'Backpack full':'Cannot store here':`${verb} ×${amount}`;
 return <StationMenu compact world={world} title="Supply chest" label={atHeadquartersChest(world)?'Headquarters chest':'Camp chest'} onClose={onClose} weight={load.weight} loadLabel={load.label} message={message} className="chest-menu">
  <div className="chest-modes" role="group" aria-label="Choose transfer direction">{(['chest','pack'] as const).map(next=><button key={next} aria-pressed={side===next} aria-label={next==='chest'?'Take from chest':'Store from backpack'} onClick={()=>changeSide(next)}><img src={fieldKitArt(next==='chest'?'chest':'backpack')} alt=""/>{next==='chest'?'Take':'Store'}</button>)}</div>
  <div className="chest-categories" role="group" aria-label="Filter stored items">{CHEST_FILTERS.map(f=><button key={f} aria-pressed={filter===f} onClick={()=>changeFilter(f)}>{f}</button>)}</div>
  <div className="chest-browser">
   {items.length?<div className="chest-catalog" aria-label={packing?'Items in chest':'Items in backpack'}>{items.map(i=><button key={i.id} className="chest-catalog-item" aria-pressed={i.id===selected} aria-label={`${i.name}, ${i.count} ${packing?'in chest':'in backpack'}`} onClick={()=>select(i.id)}><img src={i.image} alt="" draggable={false}/><span>{i.name}</span><b>×{i.count}</b></button>)}</div>:<div className="chest-empty-state"><InventoryEmpty kind={packing?'chest':'backpack'} title={all.length?`No ${filter.toLowerCase()} here`:packing?'Nothing stored yet':'Your pack is empty'}><p>{all.length?'Try another category.':packing?'Store supplies from your backpack.':'Take supplies from the chest.'}</p><button onClick={()=>all.length?changeFilter('All'):changeSide(packing?'pack':'chest')}>{all.length?'Show all items':packing?'Store supplies':'Browse chest'}</button></InventoryEmpty></div>}
  </div>
  <div className="chest-selection" aria-label="Transfer selected item">
   <div className="chest-selection-heading">{item?<><img src={item.image} alt=""/><strong>{item.name}</strong><button ref={infoButton} className="chest-info-button" aria-label={`About ${item.name}`} aria-expanded={showInfo} onClick={()=>setShowInfo(!showInfo)}>i</button><span className="chest-stock">Chest <b>{chestItemCount(world,item.id,'chest')}</b><span> · </span>Bag <b>{chestItemCount(world,item.id,'pack')}</b></span></>:<span className="chest-selection-prompt">Select an item to {verb.toLowerCase()}</span>}</div>
   <div className="chest-transfer-controls"><div className="chest-stepper" role="group" aria-label="Transfer quantity"><button aria-label="Decrease quantity" disabled={amount<=1} onClick={()=>setQuantity(amount-1)}>−</button><output aria-live="polite" aria-label="Selected quantity">{amount}</output><button aria-label="Increase quantity" disabled={amount>=limit} onClick={()=>setQuantity(amount+1)}>+</button><button disabled={!limit} onClick={()=>setQuantity(limit)} aria-label="Select maximum quantity">Max</button></div><button className="supply-primary chest-transfer-button" disabled={!item||!limit} onClick={move} aria-label={item?`${verb} ${amount} ${item.name}`:`Select an item to ${verb.toLowerCase()}`}>{action}</button></div>
  </div>
  {showInfo&&item&&<section className="chest-item-info" aria-label={`${item.name} information`} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();closeInfo()}}}><header><h3>{item.name}</h3><button ref={infoClose} onClick={closeInfo} aria-label="Close item information">×</button></header><ItemInformation item={item}/></section>}
 </StationMenu>;
}

function ItemInformation({item}:{item:BagItem}){
 const effects=chestItemEffects(item);
 return <><p>{item.description}</p>{effects.length>0&&<p className="chest-item-effects">{item.raw&&<small>After cooking · </small>}{effects.join(' · ')}</p>}<dl>{item.facts.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="chest-info-hint">{item.hint}</p></>;
}

import {useStationFeedback} from './use-station-feedback';
import {useEffect,useState} from 'react';
import type {World} from './survival-engine';
import type {BagItemId,BagFilter} from './backpack';
import {chestItemCount,chestItems,chestTransferLimit,moveChestItem,type ChestSide} from './chest-inventory';
import {CHEST_FILTERS,filterChestItems} from './station-menu-model';

export function useChestTransfer(world:World,onChange:()=>void){
 const [side,setSide]=useState<ChestSide>(()=>
  !chestItems(world,'chest').length && chestItems(world,'pack').some(item=>chestTransferLimit(world,item.id,'pack')>0) ? 'pack' : 'chest'
 ),[filter,setFilter]=useState<BagFilter>('All');
 const [selected,setSelected]=useState<BagItemId|null>(null),[quantity,setQuantity]=useState(1);
 const [message,setMessage]=useStationFeedback();
 const all=chestItems(world,side),items=filterChestItems(all,filter);
 const categories=CHEST_FILTERS.filter(f=>f==='All'||f===filter||all.some(item=>item.category===f));
 const filters=categories.length>2||filter!=='All'?categories:[];
 const selectionExists=items.some(item=>item.id===selected);
 const collapse=()=>{setSelected(null);setQuantity(1);setMessage('')};
 useEffect(()=>{
  if(selected&&!selectionExists){setSelected(null);setQuantity(1)}
 },[selected,selectionExists]);
 const changeSide=(next:ChestSide)=>{setSide(next);setFilter('All');collapse()};
 const changeFilter=(next:BagFilter)=>{setFilter(next);collapse()};
 const select=(id:BagItemId)=>{collapse();setSelected(selected===id?null:id)};
 const move=(id:BagItemId,name:string,amount:number)=>{
  const n=moveChestItem(world,id,side,amount);
  setMessage(n?`${side==='chest'?'Took':'Stored'} ${n} × ${name}.`:'No room or supplies available.');
  if(id===selected){
   setQuantity(1);
   if(chestItemCount(world,id,side)===0)setSelected(null);
  }
  onChange();
 };
 const packing=side==='chest',verb=packing?'Take':'Store';
 const emptyTitle=all.length?`No ${filter.toLowerCase()} here`:packing?'Nothing stored yet':'Your pack is empty';
 return {side,packing,verb,filter,filters,selected,quantity,setQuantity,items,message,changeSide,changeFilter,select,collapse,move,emptyTitle};
}

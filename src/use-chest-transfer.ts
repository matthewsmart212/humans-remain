import {useStationFeedback} from './use-station-feedback';
import {useEffect,useState} from 'react';
import type {World} from './survival-engine';
import type {BagItemId,BagFilter} from './backpack';
import {chestItemCount,chestItems,moveChestItem,type ChestSide} from './chest-inventory';
import {CHEST_FILTERS,filterChestItems} from './station-menu-model';

export function useChestTransfer(world:World,onChange:()=>void){
 const [side,setSide]=useState<ChestSide>('chest'),[filter,setFilter]=useState<BagFilter>('All');
 const [selected,setSelected]=useState<BagItemId|null>(null),[quantity,setQuantity]=useState(1);
 const [message,setMessage]=useStationFeedback(),[showInfo,setShowInfo]=useState(false);
 const all=chestItems(world,side),items=filterChestItems(all,filter);
 const categories=CHEST_FILTERS.filter(f=>f==='All'||f===filter||all.some(item=>item.category===f));
 const filters=categories.length>2||filter!=='All'?categories:[];
 const selectionExists=items.some(item=>item.id===selected);
 const reset=()=>{setSelected(null);setQuantity(1);setMessage('');setShowInfo(false)};
 useEffect(()=>{
  if(selected&&!selectionExists){setSelected(null);setQuantity(1);setShowInfo(false)}
 },[selected,selectionExists]);
 const changeSide=(next:ChestSide)=>{setSide(next);setFilter('All');reset()};
 const changeFilter=(next:BagFilter)=>{setFilter(next);reset()};
 const select=(id:BagItemId)=>{reset();setSelected(selected===id?null:id)};
 const move=(id:BagItemId,name:string,amount:number)=>{
  const n=moveChestItem(world,id,side,amount);
  setMessage(n?`${side==='chest'?'Took':'Stored'} ${n} × ${name}.`:'No room or supplies available.');
  if(id===selected){
   setQuantity(1);
   setShowInfo(false);
   if(chestItemCount(world,id,side)===0)setSelected(null);
  }
  onChange();
 };
 const packing=side==='chest',verb=packing?'Take':'Store';
 const emptyTitle=all.length?`No ${filter.toLowerCase()} here`:packing?'Nothing stored yet':'Your pack is empty';
 const emptyAction=all.length?'Show all items':packing?'Store supplies':'Browse chest';
 const browse=()=>all.length?changeFilter('All'):changeSide(packing?'pack':'chest');
 return {side,packing,verb,filter,filters,selected,quantity,setQuantity,items,showInfo,setShowInfo,message,changeSide,changeFilter,select,move,emptyTitle,emptyAction,browse};
}

import StationMenu,{stationMenuLayout} from './StationMenu';
import React,{useState} from 'react';
import {View,Text,Image,ScrollView,useWindowDimensions} from 'react-native';
import {backpackItems,type BagItemId,type BagResult} from '../src/backpack';
import type {FieldKitSnapshot} from '../src/field-kit';
import {FIELD_KIT_NATIVE_ART as art} from './field-kit-art';
import {InventoryHeader,InventoryCapacity,InventoryGrid,InventoryDetail,InventoryEmpty,InventoryAction,s} from './InventoryUI';
export {ItemArt,s as BAG_STYLES} from './InventoryUI';
type Props={stats:FieldKitSnapshot;width:number;safe:{top:number;bottom:number;left:number;right:number};onClose:()=>void;onUse:(id:BagItemId)=>boolean;onDrop:(id:BagItemId,quantity:1|'all')=>BagResult};
export default function NativeFieldKitBag({stats,width,safe,onClose,onUse,onDrop}:Props){
 const {height}=useWindowDimensions(),[selected,setSelected]=useState<BagItemId>(stats.raw?'raw':'axe'),[message,setMessage]=useState('');
 const items=backpackItems(stats),item=items.find(i=>i.id===selected)??items.find(i=>i.category==='Food')??items[0],wide=stationMenuLayout(width,height,safe).panel.width>=460;
 const panelHeight=stationMenuLayout(width,height,safe).panel.height,compact=true;
 const use=()=>setMessage(onUse(item!.id)?item?.food?'Meal eaten.':`${item!.name} ${stats.selected===item!.id?'stowed':'equipped'}.`:'Cannot use right now.');
 const drop=(quantity:1|'all')=>setMessage(onDrop(item!.id,quantity).message);
 return <StationMenu world={stats.action.owner} kind="backpack" title="Your backpack" label="Backpack" subtitle="Paused · select an item" onClose={onClose} weight={stats.weight} loadLabel={stats.loadLabel} message={message} width={width} height={height} safe={safe}>
  <View style={[s.layout,wide&&s.wide]}>{item?<><ScrollView style={[s.inventory,!wide&&{maxHeight:90}]} contentContainerStyle={{padding:3}}><View style={s.packLabel}><Text style={s.small}>Everything you carry</Text><Text style={s.small}>{items.length} {items.length===1?'item':'items'}</Text></View><InventoryGrid items={items} selected={item.id} equipped={stats.selected} onSelect={id=>{setSelected(id);setMessage('')}}/></ScrollView><InventoryDetail item={item} wide={wide} maxHeight={Math.round(panelHeight*.46)}><View style={s.actions}>{item.useLabel&&<InventoryAction label={item.useLabel} onPress={use} disabled={item.useDisabled} primary/>}{item.droppable&&<><InventoryAction label="Drop" onPress={()=>drop(1)} disabled={stats.downed}/>{item.count>1&&<InventoryAction label="Drop stack" onPress={()=>drop('all')} disabled={stats.downed}/>}</>}</View></InventoryDetail></>:<InventoryEmpty kind="backpack" title="Your pack is empty"><Text style={[s.description,{textAlign:'center'}]}>Both axes are waiting in the headquarters chest. Choose your gear, or head out with just your fists.</Text></InventoryEmpty>}</View>
 </StationMenu>;
}

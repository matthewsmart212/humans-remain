import {useStationFeedback} from '../src/use-station-feedback';
import StationMenu,{stationMenuLayout} from './StationMenu';
import React,{useState} from 'react';
import {View,Text,ScrollView,useWindowDimensions} from 'react-native';
import {backpackItems,type BagItemId,type BagResult} from '../src/backpack';
import type {FieldKitSnapshot} from '../src/field-kit';
import {InventoryGrid,InventoryDetail,InventoryEmpty,InventoryAction,s} from './InventoryUI';
export {ItemArt,s as BAG_STYLES} from './InventoryUI';
type Props={stats:FieldKitSnapshot;width:number;safe:{top:number;bottom:number;left:number;right:number};onClose:()=>void;onUse:(id:BagItemId)=>boolean;onDrop:(id:BagItemId,quantity:1|'all')=>BagResult};
export default function NativeFieldKitBag({stats,width,safe,onClose,onUse,onDrop}:Props){
 const {height}=useWindowDimensions(),[selected,setSelected]=useState<BagItemId>(stats.raw?'raw':'axe'),[message,setMessage]=useStationFeedback();
 const items=backpackItems(stats),item=items.find(i=>i.id===selected)??items.find(i=>i.category==='Food')??items[0],wide=stationMenuLayout(width,height,safe).panel.width>=460;
 const panelHeight=stationMenuLayout(width,height,safe).panel.height;
 const use=()=>setMessage(onUse(item!.id)?item?.food?'Meal eaten.':`${item!.name} ${stats.selected===item!.id?'stowed':'equipped'}.`:'Cannot use right now.');
 const drop=(quantity:1|'all')=>setMessage(onDrop(item!.id,quantity).message);
 return <StationMenu world={stats.action.owner} kind="backpack" title="Backpack" label="Backpack" subtitle="Game paused" onClose={onClose} weight={stats.weight} loadLabel={stats.loadLabel} message={message} width={width} height={height} safe={safe}>
  <View style={[s.layout,wide&&s.wide]}>{item?<><ScrollView style={[s.inventory,!wide&&{maxHeight:90}]} contentContainerStyle={{padding:3}}><View style={s.packLabel}><Text style={s.small}>Contents</Text><Text style={s.small}>{items.length} {items.length===1?'item':'items'}</Text></View><InventoryGrid items={items} selected={item.id} equipped={stats.selected} onSelect={id=>{setSelected(id);setMessage('')}}/></ScrollView><InventoryDetail item={item} wide={wide} maxHeight={Math.round(panelHeight*.46)}><View style={s.actions}>{item.useLabel&&<InventoryAction label={item.useLabel} onPress={use} disabled={item.useDisabled} primary/>}{item.droppable&&<><InventoryAction label="Drop" onPress={()=>drop(1)} disabled={stats.downed}/>{item.count>1&&<InventoryAction label="Drop stack" onPress={()=>drop('all')} disabled={stats.downed}/>}</>}</View></InventoryDetail></>:<InventoryEmpty kind="backpack" title="Your pack is empty"><Text style={[s.description,{textAlign:'center'}]}>Take equipment from the headquarters chest or gather supplies in the field.</Text></InventoryEmpty>}</View>
 </StationMenu>;
}

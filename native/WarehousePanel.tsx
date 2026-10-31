import React,{useState} from 'react';
import {View,Text,Pressable,ScrollView,Image,StyleSheet} from 'react-native';
import StationMenu,{stationMenuLayout} from './StationMenu';
import type {World} from '../src/survival-engine';
import type {WarehouseMaterial} from '../src/warehouse';
import {warehouseView,transferWarehouse} from '../src/warehouse-storage';
import {warehouseInventoryItems,warehouseMaterialForItem} from '../src/warehouse-inventory';
import {packLoad} from '../src/expedition-inventory';
import {FIELD_KIT_NATIVE_ART as art} from './field-kit-art';
import {InventoryGrid,InventoryDetail,InventoryAction,s} from './InventoryUI';

type Props={world:World;width:number;height:number;onClose:()=>void;onChange:()=>void;safe:{top:number;bottom:number;left:number;right:number}};
export default function WarehousePanel({world,width,height,onClose,onChange,safe}:Props){
 const [selected,setSelected]=useState<WarehouseMaterial>('pallets'),[taking,setTaking]=useState(true),[message,setMessage]=useState('');
 const load=packLoad(world),v=warehouseView(world,selected,taking,1),items=warehouseInventoryItems(world,taking);
 const item=items.find(i=>warehouseMaterialForItem(i.id)===selected)!;
 const wide=stationMenuLayout(width,height,safe).wide;
 const verb=taking?'Take':'Store',stackLabel=taking&&v.limit>0&&v.limit<v.stored?`Take ${v.limit}`:`${verb} all`;
 const blockedReason=taking?(v.stored?'Backpack full':`No ${v.material.name.toLowerCase()} in warehouse`):`No ${v.material.name.toLowerCase()} in backpack`;
 const transfer=(quantity:1|'all')=>{
  const n=transferWarehouse(world,selected,taking,quantity);
  setMessage(n?`${taking?'Took':'Stored'} ${n} ${n===1?v.material.singular:v.material.unit} ${taking?'into your backpack':'in the warehouse'}.`:'Supplies or backpack space changed.');
  onChange();
 };
 return <StationMenu world={world} title="Warehouse" label="Warehouse storage" onClose={onClose} weight={load.weight} loadLabel={load.label} message={message} width={width} height={height} safe={safe} compact>
  <View accessibilityRole="tablist" style={[s.tabs,n.tabs]}>
   {[true,false].map(t=><Pressable key={String(t)} accessibilityRole="tab" accessibilityLabel={t?'View warehouse resources':'View backpack resources'} accessibilityState={{selected:taking===t}} onPress={()=>{setTaking(t);setMessage('')}} style={[s.tab,n.tab,taking===t&&s.tabOn]}><Image source={art[t?'chest':'backpack']} resizeMode="contain" style={n.tabIcon}/><Text style={n.tabText}>{t?'Warehouse':'Backpack'}</Text></Pressable>)}
  </View>
  <View style={[s.layout,n.layout,wide&&s.wide]}>
   <ScrollView accessibilityLabel={taking?'Warehouse resources':'Backpack resources'} style={[s.inventory,wide?n.inventoryWide:n.inventoryPortrait]} contentContainerStyle={n.inventoryContent}>
    <InventoryGrid items={items} selected={item.id} showCounts columns={wide?2:3} onSelect={id=>{const material=warehouseMaterialForItem(id);if(material){setSelected(material);setMessage('')}}}/>
   </ScrollView>
   <InventoryDetail item={item} wide showInfo={false} compact={!wide}>
    {!v.limit&&<Text accessibilityLiveRegion="polite" style={n.blocked}>{blockedReason}</Text>}
    <View style={[s.actions,n.actions]}>
     <InventoryAction label={`${verb} 1`} onPress={()=>transfer(1)} disabled={!v.limit} primary/>
     <InventoryAction label={stackLabel} onPress={()=>transfer('all')} disabled={v.limit<=1}/>
    </View>
   </InventoryDetail>
  </View>
 </StationMenu>;
}
const n=StyleSheet.create({
 tabs:{padding:2,flexShrink:0},tab:{minHeight:44},tabIcon:{width:23,height:23},tabText:{fontSize:13,fontWeight:'700',color:'#f1e3be'},
 layout:{gap:8},inventoryWide:{flex:0,width:'44%'},inventoryPortrait:{flex:0,height:82,minHeight:0},inventoryContent:{padding:3},
 actions:{flexWrap:'nowrap'},blocked:{fontSize:10,lineHeight:13,color:'#c2cfb6',marginBottom:5},
});

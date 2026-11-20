import {useStationFeedback} from '../src/use-station-feedback';
import React,{useState} from 'react';
import {View,Text,Pressable,ScrollView,StyleSheet} from 'react-native';
import StationMenu from './StationMenu';
import {StationButton} from './StationControls';
import {ItemArt} from './InventoryUI';
import {stationPalette as palette} from '../src/station-palette';
import type {World} from '../src/survival-engine';
import type {MenuInsets} from '../src/station-menu-layout';
import type {WarehouseMaterial} from '../src/warehouse';
import {transferWarehouse} from '../src/warehouse-storage';
import {warehouseTransferRows} from '../src/warehouse-inventory';
import {packLoad} from '../src/expedition-inventory';

type Props={world:World;width:number;height:number;onClose:()=>void;onChange:()=>void;safe:MenuInsets};
export default function WarehousePanel({world,width,height,onClose,onChange,safe}:Props){
 const [taking,setTaking]=useState(true),[message,setMessage]=useStationFeedback();
 const load=packLoad(world),verb=taking?'Take':'Store';
 const rows=warehouseTransferRows(world,taking);
 const transfer=(id:WarehouseMaterial,name:string,quantity:1|'all')=>{
  const n=transferWarehouse(world,id,taking,quantity);
  setMessage(n?`${taking?'Took':'Stored'} ${n} × ${name}.`:'Supplies or backpack space changed.');
  onChange();
 };
 return <StationMenu world={world} title="Warehouse" label="Warehouse storage" onClose={onClose} weight={load.weight} loadLabel={load.label} message={message} width={width} height={height} safe={safe} compact fitContent>
  <View style={s.sources}>{[true,false].map(t=><Pressable key={String(t)} accessibilityRole="button" accessibilityLabel={t?'Take from warehouse':'Store from backpack'}
   accessibilityState={{selected:taking===t}} onPress={()=>{setTaking(t);setMessage('')}} style={[s.tab,taking===t&&s.tabOn]}><Text style={s.tabText}>{t?'Take':'Store'}</Text></Pressable>)}</View>
  <ScrollView style={s.list} accessibilityLabel={taking?'Warehouse resources':'Backpack resources'}>
   {!rows.length&&<Text style={s.empty}>{taking?'Warehouse empty':'No materials in your backpack'}</Text>}
   {rows.map(({material,itemId,stockLabel,limit,singleLabel,stackLabel})=><View key={material.id} style={s.row}>
    <ItemArt id={itemId} size={30}/>
    <View style={s.stock}><Text style={s.name}>{material.name}</Text><Text style={s.count}>{stockLabel}</Text></View>
    <StationButton label={singleLabel} accessibilityLabel={`${verb} 1 ${material.singular}`} disabled={!limit} onPress={()=>transfer(material.id,material.name,1)}/>
    {limit>1&&<StationButton primary label={stackLabel} accessibilityLabel={`${verb} ${limit} ${material.unit}`} onPress={()=>transfer(material.id,material.name,'all')}/>}
   </View>)}
  </ScrollView>
 </StationMenu>;
}
const s=StyleSheet.create({
 sources:{flexDirection:'row',gap:4},tab:{flex:1,minHeight:42,alignItems:'center',justifyContent:'center',borderRadius:6,borderWidth:1,borderColor:palette.line,backgroundColor:palette.surface},
 tabOn:{borderColor:palette.brass},tabText:{fontSize:15,fontWeight:'700',color:palette.text},list:{flexGrow:0,flexShrink:1,flexBasis:'auto',minHeight:0},
 row:{flexDirection:'row',alignItems:'center',gap:5,paddingVertical:7,borderBottomWidth:1,borderColor:palette.line},
 empty:{fontSize:16,color:palette.muted,paddingVertical:12},stock:{flex:1,minWidth:0,gap:4},name:{fontSize:18,fontFamily:'FieldKitBarlow',color:palette.text},count:{fontSize:12,color:palette.muted},
});

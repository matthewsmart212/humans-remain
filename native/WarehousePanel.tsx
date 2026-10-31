import StationMenu,{stationMenuLayout} from './StationMenu';
import React,{useState} from 'react';
import {View,Text,Pressable,ScrollView,Image,StyleSheet} from 'react-native';
import type {World} from '../src/survival-engine';
import {WAREHOUSE_MATERIALS,type WarehouseMaterial} from '../src/warehouse';
import {warehouseView,transferWarehouse} from '../src/warehouse-storage';
import {packLoad,storedCount} from '../src/expedition-inventory';
import {FIELD_KIT_NATIVE_ART as art} from './field-kit-art';
import {ItemArt} from './InventoryUI';
type Props={world:World;width:number;height:number;onClose:()=>void;onChange:()=>void;safe:{top:number;bottom:number;left:number;right:number}};
export default function WarehousePanel({world,width,height,onClose,onChange,safe}:Props){
 const [selected,setSelected]=useState<WarehouseMaterial>('pallets'),[taking,setTaking]=useState(false),[quantity,setQuantity]=useState(1),[message,setMessage]=useState(''),[showInfo,setShowInfo]=useState(false);
 const load=packLoad(world),v=warehouseView(world,selected,taking,quantity),panel=stationMenuLayout(width,height,safe).panel,short=height<500,narrow=panel.width<360;
 const move=()=>{const n=transferWarehouse(world,selected,taking,v.amount);setMessage(n?`${n} ${n===1?v.material.singular:v.material.unit} ${taking?'packed':'stored'}.`:'Supplies or backpack space changed.');setQuantity(1);onChange()};
 return <StationMenu world={world} title="Warehouse" label="Warehouse storage" onClose={onClose} weight={load.weight} loadLabel={load.label} message={message} width={width} height={height} safe={safe} compact fitContent>
 <ScrollView style={n.scroll} contentContainerStyle={[n.body,short&&{gap:5}]}>
  <View style={n.modes}>{[true,false].map(t=><Pressable key={String(t)} accessibilityRole="button" accessibilityLabel={t?'Take from camp stores':'Store in camp'} accessibilityState={{selected:taking===t}} onPress={()=>{setTaking(t);setQuantity(1);setMessage('');setShowInfo(false)}} style={[n.mode,taking===t&&n.modeOn]}><Image source={art[t?'chest':'backpack']} resizeMode="contain" style={n.modeIcon}/><Text style={n.modeText}>{t?'Take':'Store'}</Text></Pressable>)}</View>
  <View style={n.resources}>{WAREHOUSE_MATERIALS.map(m=><Pressable key={m.id} accessibilityRole="button" accessibilityLabel={`${m.name}, ${storedCount(world,m.id)} in camp`} accessibilityState={{selected:selected===m.id}} onPress={()=>{setSelected(m.id);setQuantity(1);setMessage('');setShowInfo(false)}} style={[n.resource,short&&n.resourceShort,selected===m.id&&n.resourceOn]}><ItemArt id={m.id==='pallets'?'logs':m.id} size={short?40:narrow?48:62}/><Text style={[n.resourceName,(short||narrow)&&{fontSize:18}]}>{m.name}</Text><Text style={n.count}>Camp <Text style={n.countValue}>{storedCount(world,m.id)}</Text></Text></Pressable>)}</View>
  <View style={[n.selected,narrow&&{flexWrap:'wrap'}]}>
   <View style={n.selectedHeading}><ItemArt id={selected==='pallets'?'logs':selected} size={28}/><Text style={n.selectedName}>{v.material.name}</Text><Pressable accessibilityRole="button" accessibilityLabel={`${v.material.name} information`} accessibilityState={{expanded:showInfo}} onPress={()=>setShowInfo(!showInfo)} style={n.infoButton}><Text style={n.infoMark}>i</Text></Pressable></View>
   <View accessible accessibilityLabel={taking?`Camp ${v.stored} to backpack ${v.bag}`:`Backpack ${v.bag} to camp ${v.stored}`} style={n.flow}><Text style={n.flowText}>{taking?'Camp':'Bag'} <Text style={n.countValue}>{taking?v.stored:v.bag}</Text></Text><Text style={n.flowText}>→</Text><Text style={n.flowText}>{taking?'Bag':'Camp'} <Text style={n.countValue}>{taking?v.bag:v.stored}</Text></Text></View>
  </View>
  <View style={[n.actions,narrow&&{flexDirection:'column'}]}>
   <View style={n.quantity}>
    <Pressable accessibilityRole="button" accessibilityLabel="Decrease quantity" accessibilityState={{disabled:v.amount<=1}} disabled={v.amount<=1} onPress={()=>setQuantity(v.amount-1)} style={[n.step,narrow&&n.grow,v.amount<=1&&n.disabled]}><Text style={n.stepText}>−</Text></Pressable>
    <Text accessibilityLiveRegion="polite" accessibilityLabel={`Selected quantity ${v.amount}`} style={[n.amount,narrow&&n.grow]}>{v.amount}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Increase quantity" accessibilityState={{disabled:v.amount>=v.limit}} disabled={v.amount>=v.limit} onPress={()=>setQuantity(v.amount+1)} style={[n.step,narrow&&n.grow,v.amount>=v.limit&&n.disabled]}><Text style={n.stepText}>+</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={taking?'Select all that fit':'Select all available'} accessibilityState={{disabled:!v.limit}} disabled={!v.limit} onPress={()=>setQuantity(v.limit)} style={[n.step,narrow&&n.grow,!v.limit&&n.disabled]}><Text style={n.maxText}>Max</Text></Pressable>
   </View>
   <Pressable accessibilityRole="button" accessibilityLabel={v.action} accessibilityState={{disabled:!v.limit}} disabled={!v.limit} onPress={move} style={[n.primary,narrow&&{flex:0},!v.limit&&n.disabled]}><Text style={n.primaryText}>{v.limit?`${taking?'Take':'Store'} ×${v.amount}`:v.action}</Text></Pressable>
  </View>
  {showInfo&&<Text style={n.info}>{v.hint}</Text>}
 </ScrollView></StationMenu>;
}
const n=StyleSheet.create({
 scroll:{flexGrow:0,flexShrink:1},body:{gap:9,padding:2},
 modes:{flexDirection:'row',gap:5,padding:3,borderWidth:1,borderColor:'#72806738',borderRadius:9,backgroundColor:'#0b2425'},
 mode:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,minHeight:44,paddingHorizontal:9,paddingVertical:5,borderWidth:1,borderColor:'transparent',borderRadius:7},modeOn:{backgroundColor:'#45563d',borderColor:'#c9b477'},modeIcon:{width:26,height:26},modeText:{fontSize:14,fontWeight:'700',color:'#f1e3be'},
 resources:{flexDirection:'row',gap:7},resource:{flex:1,minWidth:0,minHeight:124,paddingVertical:9,paddingHorizontal:3,gap:3,borderWidth:1,borderBottomWidth:2,borderColor:'#65756070',borderRadius:9,backgroundColor:'#102b25',alignItems:'center',justifyContent:'center'},resourceShort:{minHeight:84,paddingVertical:5,gap:2},resourceOn:{borderColor:'#d8c284',borderBottomColor:'#a68a52',backgroundColor:'#435339'},resourceName:{fontFamily:'FieldKitBarlow',fontSize:22,lineHeight:24,color:'#f5e6bf',textAlign:'center'},count:{fontSize:11,color:'#b3c3aa'},countValue:{color:'#f0dfb8',fontWeight:'700'},
 selected:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:4,paddingTop:3,borderTopWidth:1,borderTopColor:'#b9ac7844'},selectedHeading:{flexDirection:'row',alignItems:'center',gap:5,flexShrink:1},selectedName:{fontFamily:'FieldKitBarlow',fontSize:21,color:'#f1e3bd',flexShrink:1},infoButton:{width:44,height:44,alignItems:'center',justifyContent:'center'},infoMark:{width:21,height:21,borderRadius:11,textAlign:'center',lineHeight:21,fontWeight:'800',fontSize:15,color:'#253a30',backgroundColor:'#e4c99a'},flow:{flexDirection:'row',alignItems:'center',gap:6,marginLeft:'auto'},flowText:{fontSize:11,color:'#b3c2ad'},
 actions:{flexDirection:'row',alignItems:'stretch',gap:7},quantity:{flexDirection:'row',alignItems:'center',gap:4},step:{width:44,height:44,paddingHorizontal:5,borderWidth:1,borderColor:'#7e8e7066',borderRadius:7,backgroundColor:'#1b3931',alignItems:'center',justifyContent:'center'},stepText:{fontSize:21,fontWeight:'700',color:'#f1e1b9'},maxText:{fontSize:12,fontWeight:'700',color:'#f1e1b9'},amount:{minWidth:32,height:44,textAlign:'center',lineHeight:44,borderWidth:1,borderColor:'#71836a55',borderRadius:7,backgroundColor:'#0e2a24',fontSize:17,fontWeight:'700',color:'#f4e6c4'},grow:{flex:1},primary:{flex:1,minHeight:46,paddingVertical:7,paddingHorizontal:9,borderWidth:1,borderBottomWidth:3,borderColor:'#f1d697',borderBottomColor:'#907046',borderRadius:8,backgroundColor:'#dfc38c',alignItems:'center',justifyContent:'center'},primaryText:{fontSize:13,fontWeight:'800',color:'#25372e',textAlign:'center'},disabled:{opacity:.55},info:{fontSize:11,lineHeight:16,color:'#c2cdb5',padding:8,borderRadius:7,borderWidth:1,borderColor:'#8b9b7250',backgroundColor:'#102c25'}
});

import React,{useState} from 'react';
import {View,Text,StyleSheet,type StyleProp,type ViewStyle} from 'react-native';
import {WAREHOUSE_MATERIALS} from '../src/warehouse';
import type {WarehouseStock} from '../src/warehouse-hud';
import {CaptionFade} from './FieldKitTargetCaption';
import {ItemArt} from './InventoryUI';

/** Read-only stock at the active warehouse. Repair captions take precedence. */
export default function WarehouseStockCaption({stock,width,style}:{stock:WarehouseStock;width:number;style?:StyleProp<ViewStyle>}){
 const [contentSize,setContentSize]=useState({width:Math.min(width,160),height:41});
 return <View pointerEvents="none" accessible accessibilityLabel={`Warehouse stock. ${WAREHOUSE_MATERIALS.map(m=>`${m.name}: ${stock[m.id]}`).join('. ')}.`} style={[s.caption,style,{width,minHeight:42}]}>
  <View style={[s.content,{maxWidth:width}]} onLayout={e=>{const {width:w,height:h}=e.nativeEvent.layout;setContentSize(old=>Math.abs(old.width-w)<.5&&Math.abs(old.height-h)<.5?old:{width:w,height:h})}}>
   <CaptionFade width={contentSize.width} height={contentSize.height}/>
   <View style={s.heading}><Text style={s.name}>Warehouse</Text><Text style={s.detail}>Stored</Text></View>
   <View style={s.materials}>{WAREHOUSE_MATERIALS.map(m=><View key={m.id} style={s.material}><ItemArt id={m.id==='pallets'?'logs':m.id} size={20}/><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.8} style={s.count}>{stock[m.id]}</Text></View>)}</View>
  </View>
 </View>;
}
const s=StyleSheet.create({
 caption:{position:'absolute',alignItems:'flex-end',justifyContent:'center'},content:{alignSelf:'flex-end',alignItems:'flex-end',gap:3},
 heading:{flexDirection:'row',alignItems:'baseline',justifyContent:'flex-end',gap:6},name:{fontFamily:'FieldKitBarlow',fontSize:14,lineHeight:18,color:'#fff0d2',textShadowColor:'#051c18',textShadowRadius:2,textShadowOffset:{width:0,height:1}},detail:{fontFamily:'FieldKitBarlow',fontSize:11,lineHeight:16,color:'#c2d0ae'},
 materials:{flexDirection:'row',alignItems:'center',justifyContent:'flex-end',flexWrap:'wrap',gap:9},material:{flexDirection:'row',alignItems:'center',gap:3},count:{fontFamily:'FieldKitBarlow',fontSize:14,lineHeight:18,color:'#f4e6c7',fontVariant:['tabular-nums'],maxWidth:72},
});

import React,{useEffect,useState} from 'react';
import {View,Text,Image,Pressable,ScrollView,StyleSheet} from 'react-native';
import StationMenu,{stationMenuLayout} from './StationMenu';
import type {World} from '../src/survival-engine';
import type {BagItemId,BagFilter} from '../src/backpack';
import {chestItemCount,chestItems,chestTransferLimit,moveChestItem,type ChestSide} from '../src/chest-inventory';
import {packLoad} from '../src/expedition-inventory';
import {atHeadquartersChest} from '../src/player-gear';
import {CHEST_FILTERS,filterChestItems,chestItemEffects} from '../src/station-menu-model';
import {FIELD_KIT_NATIVE_ART as art} from './field-kit-art';
import {ItemArt,InventoryEmpty,InventoryAction,s} from './InventoryUI';

type Props={world:World;width:number;height:number;onClose:()=>void;onChange:()=>void;safe:{top:number;bottom:number;left:number;right:number}};
export default function ChestPanel({world,width,height,onClose,onChange,safe}:Props){
 const [side,setSide]=useState<ChestSide>('chest'),[filter,setFilter]=useState<BagFilter>('All');
 const [selected,setSelected]=useState<BagItemId|null>(null),[quantity,setQuantity]=useState(1);
 const [message,setMessage]=useState(''),[showInfo,setShowInfo]=useState(false),[catalogHeight,setCatalogHeight]=useState(150);
 const p=stationMenuLayout(width,height,safe).panel,short=p.height<430,columns=p.width>=360?4:3,gap=4;
 const all=chestItems(world,side),items=filterChestItems(all,filter),item=items.find(i=>i.id===selected);
 const load=packLoad(world),limit=item?chestTransferLimit(world,item.id,side):0,amount=Math.min(Math.max(1,quantity),limit);
 const packing=side==='chest',verb=packing?'Take':'Store';
 const rowHeight=Math.max(40,Math.floor((catalogHeight-gap*2)/3)),artSize=Math.max(22,Math.min(54,rowHeight-23));
 const rows=Array.from({length:Math.ceil(items.length/columns)},(_,index)=>items.slice(index*columns,(index+1)*columns));
 useEffect(()=>{if(selected&&!item){setSelected(null);setQuantity(1);setShowInfo(false)}},[selected,item?.id]);
 const reset=()=>{setSelected(null);setQuantity(1);setMessage('');setShowInfo(false)};
 const changeSide=(next:ChestSide)=>{setSide(next);reset()};
 const changeFilter=(next:BagFilter)=>{setFilter(next);reset()};
 const select=(id:BagItemId)=>{setSelected(id);setQuantity(1);setMessage('');setShowInfo(false)};
 const move=()=>{
  if(!item||!amount)return;
  const n=moveChestItem(world,item.id,side,amount);
  setMessage(n?`${item.name}${n>1?` ×${n}`:''} ${packing?'packed':'stored'}.`:'No room or supplies available.');
  setQuantity(1);setShowInfo(false);
  if(chestItemCount(world,item.id,side)===0)setSelected(null);
  onChange();
 };
 const action=!item?verb:!limit?packing?'Backpack full':'Cannot store here':`${verb} ×${amount}`;
 return <StationMenu compact world={world} title="Supply chest" label={atHeadquartersChest(world)?'Headquarters chest':'Camp chest'} onClose={onClose} weight={load.weight} loadLabel={load.label} message={message} width={width} height={height} safe={safe}>
  <View style={c.modes}>{(['chest','pack'] as const).map(next=><Pressable key={next} accessibilityRole="button" accessibilityLabel={next==='chest'?'Take from chest':'Store from backpack'} accessibilityState={{selected:side===next}} onPress={()=>changeSide(next)} style={[c.mode,{minHeight:short?32:40},side===next&&c.modeOn]}><Image source={art[next==='chest'?'chest':'backpack']} resizeMode="contain" style={c.modeIcon}/><Text style={c.modeText}>{next==='chest'?'Take':'Store'}</Text></Pressable>)}</View>
  <View style={c.filters}>{CHEST_FILTERS.map(f=><Pressable key={f} accessibilityRole="button" accessibilityLabel={`${f} items`} accessibilityState={{selected:filter===f}} onPress={()=>changeFilter(f)} style={[c.filter,{minHeight:short?24:32},filter===f&&c.modeOn]}><Text style={c.filterText}>{f}</Text></Pressable>)}</View>
  <View style={c.browser} onLayout={event=>setCatalogHeight(event.nativeEvent.layout.height)}><ScrollView nestedScrollEnabled style={c.scroll} contentContainerStyle={{gap,flexGrow:items.length?0:1,padding:1}}>
   {items.length?rows.map((row,index)=><View key={index} style={{flexDirection:'row',gap,height:rowHeight}}>{Array.from({length:columns},(_,column)=>{const i=row[column];return i?<Pressable key={i.id} accessibilityRole="button" accessibilityLabel={`${i.name}, ${i.count} ${packing?'in chest':'in backpack'}`} accessibilityState={{selected:i.id===selected}} onPress={()=>select(i.id)} style={[c.tile,i.id===selected&&c.tileOn]}><ItemArt id={i.id} size={artSize}/><Text numberOfLines={1} style={[c.tileName,{fontSize:short?10:12}]}>{i.name}</Text><Text style={c.count}>×{i.count}</Text></Pressable>:<View key={column} style={{flex:1}}/>})}</View>):<InventoryEmpty kind={packing?'chest':'backpack'} title={all.length?`No ${filter.toLowerCase()} here`:packing?'Nothing stored yet':'Your pack is empty'}><Text style={s.description}>{all.length?'Try another category.':packing?'Store supplies from your backpack.':'Take supplies from the chest.'}</Text><InventoryAction label={all.length?'Show all items':packing?'Store supplies':'Browse chest'} onPress={()=>all.length?changeFilter('All'):changeSide(packing?'pack':'chest')}/></InventoryEmpty>}
  </ScrollView></View>
  <View style={[c.selection,short&&{paddingTop:3,gap:3}]}>
   <View style={[c.selectionHeading,short&&{minHeight:24}]}>{item?<><ItemArt id={item.id} size={22}/><Text numberOfLines={1} style={c.selectedName}>{item.name}</Text><Pressable accessibilityRole="button" accessibilityLabel={`About ${item.name}`} accessibilityState={{expanded:showInfo}} onPress={()=>setShowInfo(!showInfo)} hitSlop={5} style={[c.infoButton,short&&{width:24,height:24}]}><Text style={c.infoGlyph}>i</Text></Pressable><Text style={c.stock}>Chest <Text style={c.stockNumber}>{chestItemCount(world,item.id,'chest')}</Text> · Bag <Text style={c.stockNumber}>{chestItemCount(world,item.id,'pack')}</Text></Text></>:<Text style={c.prompt}>Select an item to {verb.toLowerCase()}</Text>}</View>
   <View style={c.actions}><View style={c.stepper}>
    <Pressable accessibilityRole="button" accessibilityLabel="Decrease quantity" accessibilityState={{disabled:amount<=1}} disabled={amount<=1} onPress={()=>setQuantity(amount-1)} style={[c.step,short&&{height:40},p.width<360&&c.smallStep,amount<=1&&c.disabled]}><Text style={c.stepText}>−</Text></Pressable>
    <Text accessibilityLiveRegion="polite" accessibilityLabel={`Selected quantity ${amount}`} style={c.amount}>{amount}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Increase quantity" accessibilityState={{disabled:amount>=limit}} disabled={amount>=limit} onPress={()=>setQuantity(amount+1)} style={[c.step,short&&{height:40},p.width<360&&c.smallStep,amount>=limit&&c.disabled]}><Text style={c.stepText}>+</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Select maximum quantity" accessibilityState={{disabled:!limit}} disabled={!limit} onPress={()=>setQuantity(limit)} style={[c.step,short&&{height:40},p.width<360&&c.smallStep,!limit&&c.disabled]}><Text style={c.max}>Max</Text></Pressable>
   </View><Pressable accessibilityRole="button" accessibilityLabel={item?`${verb} ${amount} ${item.name}`:`Select an item to ${verb.toLowerCase()}`} accessibilityState={{disabled:!item||!limit}} disabled={!item||!limit} onPress={move} style={[c.primary,short&&{minHeight:40},(!item||!limit)&&{opacity:.65}]}><Text style={c.primaryText}>{action}</Text></Pressable></View>
  </View>
  {showInfo&&item&&<View style={[c.info,{maxHeight:Math.max(110,p.height-195)}]}><View style={c.infoHeader}><Text style={c.infoTitle}>{item.name}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close item information" onPress={()=>setShowInfo(false)} style={c.infoClose}><Text style={c.stepText}>×</Text></Pressable></View><ScrollView nestedScrollEnabled style={{flexShrink:1}} contentContainerStyle={{gap:8}}><Text style={c.infoText}>{item.description}</Text>{chestItemEffects(item).length>0&&<Text style={[c.infoText,{color:'#ebd8aa'}]}>{item.raw?'After cooking · ':''}{chestItemEffects(item).join(' · ')}</Text>}<View style={c.facts}>{item.facts.map(([label,value])=><View key={label}><Text style={c.factLabel}>{label}</Text><Text style={c.factValue}>{value}</Text></View>)}</View><Text style={c.infoText}>{item.hint}</Text></ScrollView></View>}
 </StationMenu>;
}

const c=StyleSheet.create({
 modes:{flexDirection:'row',gap:4,padding:2,borderWidth:1,borderColor:'#72806738',borderRadius:9,backgroundColor:'#10292b',flexShrink:0},mode:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,borderWidth:1,borderColor:'transparent',borderRadius:7},modeOn:{backgroundColor:'#45563d',borderColor:'#bda76b'},modeIcon:{width:20,height:20},modeText:{fontSize:13,fontWeight:'700',color:'#eadfc0'},
 filters:{flexDirection:'row',gap:4,flexShrink:0},filter:{flex:1,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'transparent',borderRadius:6,backgroundColor:'#10292466'},filterText:{fontSize:10,fontWeight:'600',color:'#bfcdb2'},browser:{flex:1,minHeight:0},scroll:{flex:1,minHeight:0},
 tile:{flex:1,minWidth:0,alignItems:'center',justifyContent:'center',padding:2,gap:2,borderWidth:1,borderBottomWidth:2,borderColor:'#65756070',borderBottomColor:'#0c2223',borderRadius:7,backgroundColor:'#18322b',overflow:'hidden'},tileOn:{borderColor:'#d0b879',borderBottomColor:'#9b8154',backgroundColor:'#4b583a'},tileName:{lineHeight:13,fontWeight:'600',color:'#eee2c3',textAlign:'center',maxWidth:'100%'},count:{position:'absolute',right:3,top:2,fontSize:10,fontWeight:'700',color:'#eddbac',backgroundColor:'#0e2525df',borderRadius:3,paddingHorizontal:3,paddingVertical:2},
 selection:{borderTopWidth:1,borderTopColor:'#bda67940',paddingTop:4,gap:4,flexShrink:0},selectionHeading:{flexDirection:'row',alignItems:'center',gap:4,minHeight:28},selectedName:{fontFamily:'FieldKitBarlow',fontSize:15,color:'#f4e5c1',flexShrink:1},infoButton:{width:27,height:27,alignItems:'center',justifyContent:'center'},infoGlyph:{width:16,height:16,borderRadius:8,textAlign:'center',fontSize:12,lineHeight:16,fontWeight:'800',backgroundColor:'#e5ca91',color:'#21372e'},stock:{marginLeft:'auto',fontSize:10,color:'#b5c4ac'},stockNumber:{fontWeight:'600',color:'#efdaaa'},prompt:{fontSize:11,color:'#b5c4ac'},
 actions:{flexDirection:'row',gap:6,alignItems:'stretch'},stepper:{flexDirection:'row',alignItems:'center',gap:4},step:{width:42,height:42,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#76816b77',borderRadius:6,backgroundColor:'#1a352f'},smallStep:{width:35},stepText:{fontSize:19,fontWeight:'600',color:'#eee2c3'},amount:{minWidth:26,textAlign:'center',fontSize:15,fontWeight:'700',color:'#f4e4bc'},max:{fontSize:11,fontWeight:'600',color:'#eee2c3'},disabled:{opacity:.45},primary:{flex:1,minWidth:0,minHeight:42,padding:5,alignItems:'center',justifyContent:'center',borderWidth:1,borderBottomWidth:3,borderColor:'#f1d697',borderBottomColor:'#907046',borderRadius:7,backgroundColor:'#dfc38c'},primaryText:{fontSize:13,fontWeight:'700',textAlign:'center',color:'#25372e'},
 info:{position:'absolute',left:1,right:1,bottom:86,zIndex:5,padding:10,gap:6,borderWidth:1,borderColor:'#bea772',borderRadius:9,backgroundColor:'#16372f',shadowColor:'#000',shadowOpacity:.35,shadowRadius:12},infoHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6},infoTitle:{fontFamily:'FieldKitBarlow',fontSize:22,color:'#f4e5c1',flexShrink:1},infoClose:{width:34,height:34,alignItems:'center',justifyContent:'center'},infoText:{fontSize:11,lineHeight:15,color:'#c7cfb8'},facts:{flexDirection:'row',flexWrap:'wrap',gap:16},factLabel:{fontSize:10,color:'#a7b99f'},factValue:{fontSize:12,fontWeight:'600',color:'#eee0bb',marginTop:3},
});

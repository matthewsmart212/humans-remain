import React,{useState} from 'react';
import {View,Text,Image,Pressable,ScrollView,StyleSheet} from 'react-native';
import StationMenu,{stationMenuLayout} from './StationMenu';
import {ItemArt} from './InventoryUI';
import {FIELD_KIT_NATIVE_ART as art} from './field-kit-art';
import {smithyView} from '../src/smithy-view';
import {smithyAction} from '../src/station-menu-model';
import type {World} from '../src/survival-engine';
import type {GearKind} from '../src/player-gear';
import type {CraftCategory} from '../src/forge-recipes';

const materialArt:Record<string,number>={pallets:require('../public/survival/ui-field-kit-v1/logs.png'),ironIngot:require('../public/survival/ironworks-v1/iron-ingot.png')};
type Props={world:World;width:number;height:number;onClose:()=>void;onChange:()=>void;safe:{top:number;bottom:number;left:number;right:number}};

export default function SmithyPanel({world,width,height,onClose,onChange,safe}:Props){
 const [category,setCategory]=useState<CraftCategory>('tools'),[selected,setSelected]=useState<GearKind>('woodenAxe');
 const [more,setMore]=useState(false),[message,setMessage]=useState(''),[gridHeight,setGridHeight]=useState(150),[selectionHeight,setSelectionHeight]=useState(94);
 const v=smithyView(world),layout=stationMenuLayout(width,height,safe),compact=layout.panel.height<430,narrow=layout.panel.width<380;
 if(!v)return null;
 const recipes=v.recipes.filter(recipe=>recipe.category===category),r=recipes.find(recipe=>recipe.id===selected)??recipes[0];
 const columns=category==='weapons'?3:2,rows=Array.from({length:Math.ceil(recipes.length/columns)},(_,index)=>recipes.slice(index*columns,(index+1)*columns));
 const tileHeight=Math.max(48,(gridHeight-6*(rows.length-1)-4)/rows.length);
 const artSize=Math.max(24,Math.min(category==='tools'?106:100,tileHeight-(category==='tools'?10:compact?25:36)));
 const chooseCategory=(next:CraftCategory)=>{setCategory(next);setSelected(v.recipes.find(recipe=>recipe.category===next)!.id);setMore(false);setMessage('')};
 const craft=()=>{setMessage(r.craft()?`${r.name} added to backpack.`:'Check materials and backpack space.');onChange()};
 const action=r.canCraft?(r.count>1?`Craft ×${r.count}`:'Craft'):smithyAction(r);

 return <StationMenu compact world={world} title="Camp smithy" image={require('../public/survival/camp-workshop-v1/camp-workshop.webp')} closeLabel="Leave smithy" onClose={onClose} weight={v.weight} loadLabel={v.loadLabel} message={message} width={width} height={height} safe={safe}>
  <View style={f.tabs}>{v.categories.map(c=><Pressable key={c.id} accessibilityRole="button" accessibilityLabel={c.label} accessibilityState={{selected:category===c.id}} onPress={()=>chooseCategory(c.id)} style={[f.tab,category===c.id&&f.tabOn]}><Text numberOfLines={1} style={[f.tabText,narrow&&{fontSize:16},category===c.id&&{color:'#ffe8b5'}]}>{c.label}</Text></Pressable>)}</View>
  <ScrollView style={f.catalog} contentContainerStyle={[f.catalogContent,{minHeight:rows.length*48+6*(rows.length-1)+4}]} onLayout={e=>setGridHeight(e.nativeEvent.layout.height)}>
   {rows.map((row,index)=><View key={index} style={f.catalogRow}>{row.map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Select ${item.name}. ${item.owned} in backpack. ${item.status}`} accessibilityState={{selected:r.id===item.id}} onPress={()=>{setSelected(item.id);setMore(false);setMessage('')}} style={[f.tile,category==='tools'&&f.toolTile,r.id===item.id&&f.selected]}>
    <ItemArt id={item.id} size={artSize}/><Text numberOfLines={category==='tools'?2:1} adjustsFontSizeToFit minimumFontScale={.85} style={[f.tileName,{fontSize:compact?(category==='tools'?18:16):22},category==='tools'&&f.toolName]}>{item.name}</Text>
    {item.owned>0&&<View style={f.owned}><Image source={art.backpack} resizeMode="contain" style={{width:compact?13:17,height:compact?13:17}}/><Text style={[f.ownedText,compact&&{fontSize:10}]}>×{item.owned}</Text></View>}
   </Pressable>)}</View>)}
  </ScrollView>
  <View style={f.selection} onLayout={e=>setSelectionHeight(e.nativeEvent.layout.height)}>
   <View style={f.selectionHeading}>
    {!narrow&&<ItemArt id={r.id} size={compact?25:30}/>}
    <Text numberOfLines={1} style={[f.selectionName,{fontSize:compact?21:24}]}>{r.name}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`Item information for ${r.name}`} accessibilityState={{expanded:more}} onPress={()=>setMore(!more)} style={f.infoToggle}><View style={f.infoDisc}><Text style={f.infoLetter}>i</Text></View></Pressable>
    <Text style={[f.source,{fontSize:narrow?8:compact?9:11}]}>Backpack + camp</Text>
   </View>
   <View style={f.craftRow}>
    <View style={f.costs}>{r.ingredients.map(m=><View key={m.id} accessibilityLabel={`${m.name}: ${m.available} available, ${m.needed} needed. ${m.bag} in backpack and ${m.camp} in camp stores.`} style={[f.cost,!m.enough&&f.costMissing]}>
     <Image source={materialArt[m.id]} resizeMode="contain" style={{width:compact?22:28,height:compact?24:28}}/>
     {!(narrow&&r.ingredients.length>1)&&<Text numberOfLines={2} style={[f.materialName,{fontSize:compact?10:12}]}>{m.name}</Text>}
     <Text style={[f.materialAmount,{fontSize:compact?18:22},!m.enough&&{color:'#e8ac7d'}]}>{m.available}<Text style={[f.materialRequired,{fontSize:compact?11:14}]}> / {m.needed}</Text></Text>
    </View>)}</View>
    <Pressable accessibilityRole="button" accessibilityLabel={`Craft ${r.name}. ${r.status}`} accessibilityState={{disabled:!r.canCraft}} disabled={!r.canCraft} onPress={craft} style={[f.craftAction,!r.canCraft&&{opacity:.42}]}><Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={.85} style={[f.craftLabel,{fontSize:compact?19:22}]}>{action}</Text></Pressable>
   </View>
  </View>
  {more&&<View style={[f.infoCard,{bottom:selectionHeight+5}]} accessibilityLabel={`${r.name} information`}>
   <View style={f.infoHeading}><Text style={f.infoTitle}>{r.name}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close item information" onPress={()=>setMore(false)} style={f.infoToggle}><Text style={f.infoClose}>×</Text></Pressable></View>
   <ScrollView style={{maxHeight:Math.min(150,layout.panel.height*.37)}}><Text style={f.infoText}>{r.stat.join(' ')} · {r.weight.toFixed(2).replace(/0$/,'')} kg</Text><Text style={[f.infoText,{marginTop:5}]}>{r.description}</Text><Text style={[f.infoText,{marginTop:7,color:'#e7d8b4'}]}>Backpack {r.owned} · Storage {r.stored}</Text></ScrollView>
  </View>}
 </StationMenu>;
}

const f=StyleSheet.create({
 tabs:{flexDirection:'row',gap:3,padding:2,borderWidth:1,borderColor:'#76846355',borderRadius:8,backgroundColor:'#0d2523',flexShrink:0},
 tab:{flex:1,minHeight:44,paddingHorizontal:5,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:'transparent',borderRadius:6},
 tabOn:{borderColor:'#c5ad73',backgroundColor:'#3c4e36'},tabText:{fontFamily:'FieldKitBarlow',fontSize:18,color:'#b7c4ad'},
 catalog:{flex:1,minHeight:0},catalogContent:{flexGrow:1,gap:6,padding:2},catalogRow:{flex:1,flexDirection:'row',gap:6,minHeight:48},
 tile:{position:'relative',flex:1,minWidth:0,minHeight:48,padding:4,gap:2,borderWidth:1,borderColor:'#6c805c75',borderRadius:7,backgroundColor:'#143128',alignItems:'center',justifyContent:'center',overflow:'hidden'},
 toolTile:{flexDirection:'row',gap:7,paddingHorizontal:7},selected:{borderColor:'#d9be7b',backgroundColor:'#3c4e36'},
 tileName:{fontFamily:'FieldKitBarlow',color:'#f3e1b5',textAlign:'center',flexShrink:1},toolName:{flexShrink:1,maxWidth:'52%',textAlign:'left'},
 owned:{position:'absolute',top:3,right:3,flexDirection:'row',alignItems:'center',gap:2,paddingHorizontal:3,paddingVertical:2,borderRadius:4,backgroundColor:'#0b2524'},ownedText:{fontSize:12,fontWeight:'700',color:'#f0dfb5'},
 selection:{position:'relative',flexShrink:0,gap:2,paddingTop:2,borderTopWidth:1,borderTopColor:'#bda67955',zIndex:2},
 selectionHeading:{flexDirection:'row',alignItems:'center',gap:3,minHeight:44},selectionName:{fontFamily:'FieldKitBarlow',color:'#f6e5bf',flexShrink:1},source:{marginLeft:'auto',flexShrink:0,color:'#b2c3aa'},
 infoToggle:{width:44,height:44,alignItems:'center',justifyContent:'center',flexShrink:0},infoDisc:{width:21,height:21,borderRadius:11,backgroundColor:'#d9c296',alignItems:'center',justifyContent:'center'},infoLetter:{fontFamily:'Georgia',fontWeight:'700',fontSize:16,color:'#17342b'},
 craftRow:{flexDirection:'row',gap:5,alignItems:'stretch'},costs:{flex:1.5,flexDirection:'row',gap:4,minWidth:0},
 craftAction:{flex:.9,minWidth:100,minHeight:44,paddingHorizontal:7,paddingVertical:5,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#f1d697',borderBottomWidth:3,borderBottomColor:'#907046',borderRadius:7,backgroundColor:'#dfc38c'},craftLabel:{fontFamily:'FieldKitBarlow',color:'#25372e',textAlign:'center'},
 cost:{flex:1,minWidth:0,minHeight:44,flexDirection:'row',alignItems:'center',gap:3,padding:4,borderWidth:1,borderColor:'#75845c55',borderRadius:6,backgroundColor:'#1b362a'},costMissing:{borderColor:'#b1805f70',backgroundColor:'#3c3325'},materialName:{color:'#dfd9bd',flexShrink:1},materialAmount:{fontFamily:'FieldKitBarlow',marginLeft:'auto',color:'#c9d6a9'},materialRequired:{fontFamily:undefined,color:'#c7c5a5'},
 infoCard:{position:'absolute',left:0,right:0,zIndex:5,elevation:5,paddingHorizontal:11,paddingBottom:11,borderWidth:1,borderColor:'#c6af7b',borderRadius:8,backgroundColor:'#17372f',shadowColor:'#000',shadowOpacity:.35,shadowRadius:12},
 infoHeading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:5},infoTitle:{fontFamily:'FieldKitBarlow',fontSize:24,color:'#f5e1b5',flexShrink:1},infoClose:{fontSize:25,color:'#efdcad'},infoText:{fontSize:12,lineHeight:17,color:'#c7d1b8'},
});

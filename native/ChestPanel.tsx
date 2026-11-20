import React from 'react';
import {View,Text,Pressable,ScrollView,StyleSheet} from 'react-native';
import StationMenu from './StationMenu';
import type {World} from '../src/survival-engine';
import type {MenuInsets} from '../src/station-menu-layout';
import {chestItemCount,chestTransferLimit} from '../src/chest-inventory';
import {packLoad} from '../src/expedition-inventory';
import {atHeadquartersChest} from '../src/player-gear';
import {chestItemEffects} from '../src/station-menu-model';
import {useChestTransfer} from '../src/use-chest-transfer';
import {stationPalette as palette} from '../src/station-palette';
import {ItemArt} from './InventoryUI';
import {StationButton} from './StationControls';

type Props={world:World;width:number;height:number;onClose:()=>void;onChange:()=>void;safe:MenuInsets};
export default function ChestPanel({world,width,height,onClose,onChange,safe}:Props){
 const c=useChestTransfer(world,onChange),load=packLoad(world);
 const source=c.packing?'chest':'backpack',destination=c.packing?'backpack':'chest';
 return <StationMenu compact fitContent world={world} title="Supply chest" label={atHeadquartersChest(world)?'Headquarters chest':'Camp chest'} onClose={onClose}
  onBack={c.selected ? c.collapse : onClose} weight={load.weight} loadLabel={load.label} message={c.message} width={width} height={height} safe={safe}>
  <View style={s.tabs}>{(['chest','pack'] as const).map(next=><Pressable key={next} accessibilityRole="button"
   accessibilityLabel={next==='chest'?'Take from chest':'Store from backpack'} accessibilityState={{selected:c.side===next}}
   onPress={()=>c.changeSide(next)} style={[s.tab,c.side===next&&s.active]}><Text style={s.tabText}>{next==='chest'?'Take':'Store'}</Text></Pressable>)}</View>
  {c.filters.length>0&&<View style={s.tabs}>{c.filters.map(f=><Pressable key={f} accessibilityRole="button" accessibilityLabel={`${f} items`}
   accessibilityState={{selected:c.filter===f}} onPress={()=>c.changeFilter(f)} style={[s.filter,c.filter===f&&s.active]}><Text style={s.filterText}>{f}</Text></Pressable>)}</View>}
  <ScrollView style={s.scroll} contentContainerStyle={s.list} accessibilityLabel={`Items in ${source}`}>
   {!c.items.length&&<Text style={s.empty}>{c.emptyTitle}</Text>}
   {c.items.map(item=>{
    const open=c.selected===item.id,limit=chestTransferLimit(world,item.id,c.side);
    const amount=Math.min(open?c.quantity:1,limit),blocked=c.packing?'Pack full':'Cannot store';
    const effects=open?chestItemEffects(item):[];
    return <View key={item.id} style={s.item}>
     <View style={s.row}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}, ${item.count} in ${source}`} accessibilityState={{expanded:open}}
       onPress={()=>c.select(item.id)} style={s.itemToggle}>
       <ItemArt id={item.id} size={34}/><Text style={s.name}>{item.name}</Text>{item.count>1&&<Text style={s.count}>×{item.count}</Text>}
       <View accessible={false} style={[s.chevron,open&&s.chevronOpen]}/>
      </Pressable>
      <StationButton primary label={limit?(amount>1?`${c.verb} ${amount}`:c.verb):blocked} accessibilityLabel={`${c.verb} ${open?amount:'one'} ${item.name}`}
       disabled={!limit} onPress={()=>c.move(item.id,item.name,amount)}/>
     </View>
     {open&&<View style={s.expanded}>
       {limit>1&&<View style={s.stepper}>
        <StationButton label="−" accessibilityLabel="Decrease quantity" disabled={amount<=1} onPress={()=>c.setQuantity(amount-1)}/>
        <Text accessibilityLiveRegion="polite" accessibilityLabel={`Selected quantity ${amount}`} style={s.count}>{amount}</Text>
        <StationButton label="+" accessibilityLabel="Increase quantity" disabled={amount>=limit} onPress={()=>c.setQuantity(amount+1)}/>
        <StationButton label="Max" accessibilityLabel="Select maximum quantity" disabled={amount>=limit} onPress={()=>c.setQuantity(limit)}/>
       </View>}
       <Text style={s.copy}>{item.description}</Text>
       {effects.length>0&&<Text style={s.copy}>{item.raw?'After cooking · ':''}{effects.join(' · ')}</Text>}
       <View style={s.facts}><View><Text style={s.factLabel}>In {destination}</Text><Text style={s.copy}>{chestItemCount(world,item.id,c.packing?'pack':'chest')}</Text></View>
        {item.facts.map(([label,value])=><View key={label}><Text style={s.factLabel}>{label}</Text><Text style={s.copy}>{value}</Text></View>)}</View>
     </View>}
    </View>;
   })}
  </ScrollView>
 </StationMenu>;
}
const s=StyleSheet.create({
 tabs:{flexDirection:'row',gap:4},tab:{flex:1,minHeight:42,alignItems:'center',justifyContent:'center',borderRadius:6,borderWidth:1,borderColor:palette.line,backgroundColor:palette.surface},
 tabText:{fontSize:15,fontWeight:'700',color:palette.text},active:{borderColor:palette.brass,backgroundColor:palette.surface},
 filter:{flex:1,minHeight:32,alignItems:'center',justifyContent:'center',borderRadius:5,borderWidth:1,borderColor:'transparent'},
 filterText:{fontSize:12,fontWeight:'600',color:palette.text},scroll:{flexGrow:0,flexShrink:1,flexBasis:'auto',minHeight:0},list:{paddingHorizontal:2},
 item:{paddingVertical:4,borderBottomWidth:1,borderColor:palette.line},row:{flexDirection:'row',gap:6,alignItems:'center'},
 itemToggle:{minHeight:46,flex:1,minWidth:0,flexDirection:'row',gap:6,alignItems:'center',paddingVertical:2,paddingHorizontal:3},
 name:{flex:1,color:palette.text,fontFamily:'FieldKitBarlow',fontSize:18},count:{color:palette.muted,fontSize:13},
 chevron:{width:7,height:7,marginHorizontal:2,borderBottomWidth:1,borderRightWidth:1,borderColor:palette.muted,transform:[{rotate:'45deg'}]},
 chevronOpen:{transform:[{rotate:'225deg'}]},expanded:{padding:7,gap:7,backgroundColor:palette.inset,borderRadius:6},
 stepper:{flexDirection:'row',alignItems:'center',gap:5},
 empty:{paddingVertical:10,fontSize:15,color:palette.muted},
 copy:{fontSize:13,lineHeight:18,color:palette.text},facts:{flexDirection:'row',flexWrap:'wrap',gap:14},factLabel:{fontSize:12,color:palette.muted},
});

import React,{useState} from 'react';
import {View,Text,Pressable,ScrollView,StyleSheet} from 'react-native';
import StationMenu from './StationMenu';
import {ItemArt} from './InventoryUI';
import type {World} from '../src/survival-engine';
import {canCarryCount,packLoad} from '../src/expedition-inventory';
import {LOOT_CHEST_REWARDS,lootChestContents,lootChestRemaining,takeLootChestReward,takeAllLootChestRewards,type LootChestRewardKind} from '../src/loot-chest';
type Props={world:World;width:number;height:number;safe:{top:number;right:number;bottom:number;left:number};onClose:()=>void;onChange:()=>void};
export default function LootChestPanel({world,width,height,safe,onClose,onChange}:Props){
 const [message,setMessage]=useState('');
 const contents=lootChestContents(world),remaining=lootChestRemaining(world),load=packLoad(world);
 const take=(kind:LootChestRewardKind)=>{
  const gained=takeLootChestReward(world,kind);
  setMessage(gained?'Collected '+gained+' supplies.':'Backpack full. Make room before collecting.');
  onChange();
 };
 const all=()=>{
  const gained=takeAllLootChestRewards(world);
  setMessage(gained?'Collected '+gained+' supplies. Anything left stays inside.':'Backpack full. Make room before collecting.');
  onChange();
 };
 const canTake=LOOT_CHEST_REWARDS.some(r=>(contents[r.kind]??0)>0&&canCarryCount(world,r.kind,contents[r.kind]??0)>0);
 return <StationMenu compact world={world} title="Loot chest" subtitle="THE RECLAMATION · SEALED SUPPLIES" label="Rare supply cache" onClose={onClose} width={width} height={height} safe={safe} weight={load.weight} loadLabel={load.label} message={message}>
  <View style={s.hero}>
   <View style={{flex:1}}><Text style={s.eyebrow}>DISCOVERY UNLOCKED</Text><Text style={s.headline}>{remaining?'Forgotten supplies':'Cache emptied'}</Text><Text style={s.description}>{remaining?'See what is inside and choose what to take.':'Everything in this cache has been collected.'}</Text></View>
  </View>
  <View style={s.labelRow}><Text style={s.label}>CONTENTS</Text><Text style={s.count}>{remaining} remaining</Text></View>
  <ScrollView style={{flex:1,minHeight:0}} contentContainerStyle={{gap:5,paddingBottom:4}} showsVerticalScrollIndicator={remaining>4}>
   {LOOT_CHEST_REWARDS.map(reward=>{
    const count=contents[reward.kind]??0,capacity=canCarryCount(world,reward.kind,count);
    return <View key={reward.kind} style={[s.reward,!count&&{opacity:.45}]}>
     <ItemArt id={reward.artId} size={38}/>
     <View style={{flex:1,minWidth:0}}><Text style={s.name}>{reward.name}</Text><Text style={s.description} numberOfLines={1}>{reward.description}</Text></View>
     <Text style={s.amount}>×{count}</Text>
     <Pressable accessibilityRole="button" accessibilityLabel={'Take '+reward.name} disabled={!count||!capacity} onPress={()=>take(reward.kind)} style={[s.take,(!count||!capacity)&&{opacity:.35}]}><Text style={s.takeText}>{count?'TAKE':'EMPTY'}</Text></Pressable>
    </View>;
   })}
  </ScrollView>
  <Pressable accessibilityRole="button" accessibilityLabel="Collect all rewards that fit in backpack" disabled={!canTake} onPress={all} style={[s.all,!canTake&&{opacity:.4}]}><Text style={s.allText}>COLLECT ALL THAT FITS</Text><Text style={s.allText}>→</Text></Pressable>
 </StationMenu>;
}
const s=StyleSheet.create({
 hero:{height:92,flexDirection:'row',alignItems:'center',gap:5,borderRadius:9,borderWidth:1,borderColor:'#76eddf73',backgroundColor:'#194f48',paddingHorizontal:7,flexShrink:0},
 eyebrow:{fontSize:8,fontWeight:'800',letterSpacing:1,color:'#94f0e5'},
 headline:{fontSize:18,fontWeight:'800',color:'#ffe9bb'},
 description:{fontSize:10,lineHeight:13,color:'#d2e2d5'},
 labelRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:3},
 label:{fontSize:10,fontWeight:'900',letterSpacing:1,color:'#eee0b7'},
 count:{fontSize:10,color:'#86f4e3'},
 reward:{minHeight:48,borderRadius:7,borderColor:'#899f905c',borderWidth:1,backgroundColor:'#112c29',flexDirection:'row',alignItems:'center',gap:7,padding:5},
 name:{fontSize:12,fontWeight:'700',color:'#f6e4bc'},
 amount:{fontSize:15,fontWeight:'800',color:'#9ff7e7',minWidth:26,textAlign:'right'},
 take:{backgroundColor:'#d7bd83',borderRadius:6,minWidth:55,minHeight:36,justifyContent:'center',alignItems:'center',paddingHorizontal:5},
 takeText:{fontSize:11,fontWeight:'900',color:'#1a342e'},
 all:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:'#7de8d6',borderColor:'#c9fff7',borderWidth:1,borderRadius:7,minHeight:40,paddingHorizontal:13,flexShrink:0},
 allText:{fontSize:12,color:'#0c3630',fontWeight:'900'},
});

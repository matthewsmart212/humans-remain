import React from 'react';
import {Platform,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {World} from '../src/survival-engine';
import type {MenuInsets} from '../src/station-menu-layout';
import {stationPalette as palette} from '../src/station-palette';
import {LOOT_CHEST_ID,lootChestInMenuRange} from '../src/loot-chest';
import {PATCH_NOTE_TEXT,patchStatus,recruitPatch,commandPatch} from '../src/patch-quest';
import StationMenu from './StationMenu';
import {StationButton} from './StationControls';

type Props={world:World;width:number;height:number;safe:MenuInsets;onClose:()=>void;onChange:()=>void};

export function PatchNoteIcon(){
 return <View accessible={false} style={s.noteIcon}>
  <View style={s.noteFold}/>
  <View style={s.noteRule}/><View style={s.noteRule}/><View style={s.noteRule}/>
 </View>;
}

export function PatchNotePanel({world,onClose,onChange,...frame}:Props){
 const back=()=>{
  if(lootChestInMenuRange(world,LOOT_CHEST_ID)){
   world.lootChestId=LOOT_CHEST_ID;
   world.stationPanel='rare-cache';
   onChange();
  }else onClose();
 };
 return <StationMenu compact world={world} {...frame} title="A folded note" label="A folded note from P-04" closeLabel="Back to supplies" onClose={back}
  footerAction={<StationButton label="Back to supplies" onPress={back}/>}>
  <ScrollView style={s.paper} contentContainerStyle={s.paperContent} accessibilityLabel="P-04's note" showsVerticalScrollIndicator>
   {PATCH_NOTE_TEXT.split('\n\n').map((paragraph,index,all)=><Text selectable key={index} style={[s.paragraph,index===all.length-1&&s.signature]}>{paragraph}</Text>)}
  </ScrollView>
 </StationMenu>;
}

export default function PatchPanel({world,onClose,onChange,...frame}:Props){
 const status=patchStatus(world);
 if(!status)return null;
 const invite=()=>{if(recruitPatch(world)){onClose();onChange()}};
 const command=(value:'follow'|'stay'|'camp')=>{if(commandPatch(world,value)){onClose();onChange()}};
 return <StationMenu compact fitContent world={world} {...frame} title={status.title} label={`${status.title} companion`} image={require('../public/survival/patch-v1/portrait.webp')} onClose={onClose}>
  <View style={s.conversation}>
   <View accessible={false} style={s.signal}><View style={s.dot}/><View style={s.dot}/><View style={s.dot}/></View>
   <Text style={s.line}>{status.line}</Text>
   {!!status.objective&&!status.canCommand&&<Text style={s.objective}>{status.objective}</Text>}
  </View>
  <View style={s.choices}>
   {status.canRecruit?<StationButton primary grow label="Come with us" onPress={invite}/>:status.canCommand?<>
    <StationButton primary grow label="Follow me" onPress={()=>command('follow')}/>
    <StationButton grow label="Stay here" onPress={()=>command('stay')}/>
    <StationButton grow label="Return to camp" onPress={()=>command('camp')}/>
   </>:<StationButton grow label={status.canRepair?'Ready to repair':world.patchQuest?.recruited?'Let’s get you home':'I’ll look for it'} onPress={onClose}/>}
  </View>
 </StationMenu>;
}

const s=StyleSheet.create({
 paper:{flex:1,minHeight:0,borderWidth:1,borderColor:'#c2ad7f',borderRadius:4,backgroundColor:'#e2d5b3'},
 paperContent:{padding:15,gap:12},
 paragraph:{fontFamily:Platform.OS==='ios'?'Georgia':'serif',fontSize:16,lineHeight:23,color:'#343626'},
 signature:{fontWeight:'700'},
 conversation:{paddingVertical:6,gap:8},signal:{flexDirection:'row',gap:5},dot:{width:5,height:5,borderRadius:3,backgroundColor:'#e4b96b'},
 line:{fontSize:18,lineHeight:23,fontWeight:'600',color:palette.text},objective:{fontSize:13,lineHeight:18,color:palette.muted},
 choices:{flexDirection:'row',flexWrap:'wrap',gap:7,paddingVertical:4},
 noteIcon:{width:28,height:35,marginHorizontal:5,borderWidth:1,borderColor:'#b49d70',borderRadius:2,backgroundColor:'#dfd1ad',transform:[{rotate:'-5deg'}],paddingTop:10,gap:4,alignItems:'center'},
 noteFold:{position:'absolute',right:-1,top:-1,width:8,height:8,borderLeftWidth:1,borderBottomWidth:1,borderColor:'#b49d70',backgroundColor:'#ede3c8'},
 noteRule:{width:15,height:1,backgroundColor:'#787a62'},
});

import React from 'react';
import {Platform,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {World} from '../src/survival-engine';
import {stationMenuLayout,type MenuInsets} from '../src/station-menu-layout';
import {stationPalette as palette} from '../src/station-palette';
import {LOOT_CHEST_ID,lootChestInMenuRange} from '../src/loot-chest';
import {PATCH_NOTE_TEXT,patchStatus,recruitPatch,commandPatch} from '../src/patch-quest';
import StationMenu from './StationMenu';
import {StationButton} from './StationControls';

type Props={world:World;width:number;height:number;safe:MenuInsets;onClose:()=>void;onChange:()=>void};
const noteParagraphs=PATCH_NOTE_TEXT.split('\n\n');

export function PatchNoteIcon(){
 return <View accessible={false} style={s.noteIcon}>
  <View style={s.noteFold}/>
  <View style={s.noteRule}/><View style={s.noteRule}/><View style={s.noteRule}/>
 </View>;
}

export function PatchNotePanel({world,onClose,onChange,...frame}:Props){
 const tightNote=frame.height<440||stationMenuLayout(frame.width,frame.height,frame.safe).panel.width<374;
 const back=()=>{
  if(lootChestInMenuRange(world,LOOT_CHEST_ID)){
   world.lootChestId=LOOT_CHEST_ID;
   world.stationPanel='rare-cache';
   onChange();
  }else onClose();
 };
 return <StationMenu compact world={world} {...frame} title="A folded note" label="A folded note from P-04" emblem={<PatchNoteIcon/>} closeLabel="Back to supplies" onClose={back}
  footerAction={<Pressable accessibilityRole="button" accessibilityLabel="Back to supplies" onPress={back} style={({pressed})=>[s.returnButton,pressed&&s.returnPressed]}><Text style={s.returnLabel}>←  Back to supplies</Text></Pressable>}>
  <ScrollView style={s.paper} contentContainerStyle={[s.paperContent,tightNote&&s.paperContentTight]} accessibilityLabel="P-04's note" showsVerticalScrollIndicator>
   <View accessible={false} style={s.paperFold}/>
   <View style={s.provenance}><Text style={s.provenanceText}>LEFT WITH THE SUPPLIES</Text><View style={s.paperRule}/></View>
   {noteParagraphs.slice(0,-1).map((paragraph,index)=><Text selectable key={index} style={[s.paragraph,tightNote&&s.paragraphTight,index===0&&s.salutation,index===1&&s.promise]}>{paragraph}</Text>)}
   <View style={s.signature}><View accessible={false} style={s.signatureMark}><View style={s.signatureBar}/><View style={s.signatureBar}/><View style={s.signatureBar}/></View><Text selectable style={s.signatureText}>{noteParagraphs.at(-1)}</Text></View>
  </ScrollView>
 </StationMenu>;
}

export default function PatchPanel({world,onClose,onChange,...frame}:Props){
 const status=patchStatus(world);
 if(!status)return null;
 const invite=()=>{if(recruitPatch(world)){onClose();onChange()}};
 const command=(value:'follow'|'stay'|'camp')=>{if(commandPatch(world,value)){onClose();onChange()}};
 const current=world.patchQuest?.command;
 const condition=status.canCommand?(current==='follow'?'Following you':current==='camp'?'Returning to camp':'Waiting here'):world.patchQuest?.recruited?'Heading home':status.canRecruit?'Drive restored':'Rescue unit · P-04';
 return <StationMenu compact fitContent world={world} {...frame} title={status.title} subtitle={condition} label={`${status.title} companion`} image={require('../public/survival/patch-v1/portrait.webp')} onClose={onClose}>
  <View style={s.conversation}>
   <View accessible={false} style={s.signal}><View style={s.dot}/><View style={s.dot}/><View style={s.dot}/></View>
   <Text style={s.line}>{status.line}</Text>
   {!!status.objective&&!status.canCommand&&<Text style={s.objective}>{status.objective}</Text>}
  </View>
  <View style={s.choices}>
   {status.canRecruit?<StationButton primary label="Come with us" onPress={invite}/>:status.canCommand?<>
    <StationButton primary label="Follow me" accessibilityHint={current==='follow'?'Current instruction':undefined} onPress={()=>command('follow')}/>
    <View style={s.secondaryChoices}>
     <StationButton grow label="Stay here" accessibilityHint={current==='stay'?'Current instruction':undefined} onPress={()=>command('stay')}/>
     <StationButton grow label="Return to camp" accessibilityHint={current==='camp'?'Current instruction':undefined} onPress={()=>command('camp')}/>
    </View>
   </>:<StationButton label={status.canRepair?'Ready to repair':world.patchQuest?.recruited?'Let’s get you home':'I’ll look for it'} onPress={onClose}/>}
  </View>
 </StationMenu>;
}

const s=StyleSheet.create({
 paper:{flex:1,minHeight:0,borderWidth:1,borderColor:'#b8a476',borderRadius:3,borderTopRightRadius:10,backgroundColor:'#e8dfc6'},
 paperContent:{paddingHorizontal:23,paddingTop:19,paddingBottom:24,gap:14},
 paperContentTight:{paddingHorizontal:17,paddingTop:14,paddingBottom:20,gap:12},
 paragraph:{fontFamily:Platform.OS==='ios'?'Georgia':'serif',fontSize:17,lineHeight:26,color:'#303025'},
 paragraphTight:{fontSize:16,lineHeight:24},salutation:{fontStyle:'italic'},promise:{fontWeight:'700'},
 paperFold:{position:'absolute',right:0,top:0,width:16,height:16,borderTopRightRadius:9,borderBottomLeftRadius:3,borderLeftWidth:1,borderBottomWidth:1,borderColor:'#c7b48a',backgroundColor:'#f2ead4'},
 provenance:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:2},
 provenanceText:{color:'#444131',fontSize:9,fontWeight:'700',letterSpacing:.8},paperRule:{flex:1,height:1,backgroundColor:'#81745266'},
 signature:{flexDirection:'row',alignItems:'center',gap:10,marginTop:6},
 signatureText:{fontFamily:Platform.OS==='ios'?'Courier New':'monospace',fontSize:19,lineHeight:25,fontWeight:'700',letterSpacing:1.5,color:'#303025'},
 signatureMark:{flexDirection:'row',gap:3},signatureBar:{width:3,height:9,borderRadius:1,backgroundColor:'#716345'},
 returnButton:{minHeight:44,marginLeft:'auto',paddingHorizontal:7,justifyContent:'center'},returnPressed:{opacity:.7},returnLabel:{fontSize:13,fontWeight:'600',color:'#e6e4d5'},
 conversation:{paddingVertical:10,paddingHorizontal:12,gap:8,borderLeftWidth:2,borderLeftColor:'#c5a365',borderRadius:4,backgroundColor:'#181e1b'},
 signal:{flexDirection:'row',gap:5},dot:{width:4,height:4,borderRadius:2,backgroundColor:'#e4b96b'},
 line:{fontSize:18,lineHeight:23,fontWeight:'600',color:palette.text},objective:{fontSize:14,lineHeight:19,color:'#c6caba'},
 choices:{gap:7,paddingVertical:3},secondaryChoices:{flexDirection:'row',gap:7},
 noteIcon:{width:28,height:35,marginHorizontal:5,borderWidth:1,borderColor:'#b49d70',borderRadius:2,backgroundColor:'#dfd1ad',transform:[{rotate:'-5deg'}],paddingTop:10,gap:4,alignItems:'center'},
 noteFold:{position:'absolute',right:-1,top:-1,width:8,height:8,borderLeftWidth:1,borderBottomWidth:1,borderColor:'#b49d70',backgroundColor:'#ede3c8'},
 noteRule:{width:15,height:1,backgroundColor:'#787a62'},
});

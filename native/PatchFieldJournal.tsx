import React,{useEffect,useState} from 'react';
import {BackHandler,Image,ImageBackground,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {World} from '../src/survival-engine';
import {patchJournal,PATCH_QUEST_TITLE} from '../src/patch-journal';
import {FIELD_NOTE_ART,fieldNoteArt,fieldNoteDestination,fieldNotePage,markFieldNote} from '../src/patch-field-notes';
import {currentWaypoint} from '../src/waypoint';
import {BUNDLED_ART} from './bundled-art';

type Props={
 world:World;width:number;height:number;safe:{top:number;right:number;bottom:number;left:number};
 tracker?:string;concealTab?:boolean;top?:number;
};
const evidence:Record<string,number>={
 [FIELD_NOTE_ART.note]:require('../public/survival/patch-v4/station-sketch.webp'),
 [FIELD_NOTE_ART.drive]:require('../public/survival/patch-v5/drive-rubbing.webp'),
 [FIELD_NOTE_ART.dispatch]:require('../public/survival/patch-v5/dispatch-slip.webp'),
};
const paper=require('../public/survival/patch-v3/letter.webp');

function PageButton({text,label,disabled,onPress}:{text:string;label:string;disabled?:boolean;onPress:()=>void}){
 return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} accessibilityState={{disabled:!!disabled}} onPress={onPress}
  style={({pressed})=>[s.button,disabled&&s.disabled,pressed&&s.pressed]}><Text style={s.buttonText}>{text}</Text></Pressable>;
}

export function PatchFieldJournal({world,width,height,safe,tracker,concealTab,top}:Props){
 const [open,setOpen]=useState(false),[selected,setSelected]=useState<string>(),[,refresh]=useState(0);
 const left=Math.max(12,safe.left),right=Math.max(12,safe.right),upper=Math.max(10,safe.top),lower=Math.max(10,safe.bottom);
 const close=()=>{setOpen(false);setSelected(undefined)};
 useEffect(()=>{
  if(!open)return;
  const handle=BackHandler.addEventListener('hardwareBackPress',()=>{close();return true});
  return ()=>handle.remove();
 },[open]);
 if(!open){
  if(concealTab)return null;
  return <Pressable accessibilityRole="button" accessibilityLabel="Field journal" accessibilityHint={tracker} accessibilityState={{expanded:false}} onPress={()=>setOpen(true)}
   style={({pressed})=>[s.tab,{left,maxWidth:Math.min(244,width*.4)},top===undefined?{bottom:lower+56}:{top},pressed&&s.pressed]}>
   <Text style={s.tabTitle}>{tracker?PATCH_QUEST_TITLE:'Field journal'}</Text>{!!tracker&&<Text style={s.tabDetail}>{tracker}</Text>}
  </Pressable>;
 }
 const journal=patchJournal(world);
 if(!journal)return null;
 const {entry,index,older,newer}=fieldNotePage(journal,selected);
 if(!entry)return null;
 const art=fieldNoteArt(entry.id);
 const lead=!journal.complete&&fieldNoteDestination(world),waypoint=currentWaypoint(world);
 const marked=!!lead&&waypoint?.x===lead.x&&waypoint.y===lead.y;
 return <View style={[s.book,{left,top:upper,width:Math.min(480,width-left-right),maxHeight:height-upper-lower}]}>
  <View style={s.header}><View style={s.headerTitle}><Text style={s.legend}>FIELD JOURNAL</Text><Text accessibilityRole="header" style={s.title}>{journal.title}</Text></View>
   <Pressable accessibilityRole="button" accessibilityLabel="Close field journal" onPress={close} style={({pressed})=>[s.button,pressed&&s.pressed]}><Text style={s.close}>×</Text></Pressable></View>
  <ScrollView key={entry.id} style={s.scroll} showsVerticalScrollIndicator>
   <ImageBackground source={paper} resizeMode="stretch" style={s.paper} imageStyle={s.texture}>
    <Text style={s.objective}>◇  {journal.objective}</Text>
    <View style={s.entry}><Image source={evidence[art]??BUNDLED_ART[art]} resizeMode="contain" accessibilityIgnoresInvertColors style={{width:Math.min(115,width*.17),height:92}}/>
     <View style={s.story}><Text style={s.entryTitle}>{entry.title}</Text><Text style={s.body}>{entry.text}</Text></View></View>
   </ImageBackground>
  </ScrollView>
  <View style={s.footer}><View style={s.pages}><PageButton text="‹" label="Previous field note" disabled={!older} onPress={()=>setSelected(older)}/>
   <Text accessibilityLiveRegion="polite" style={s.count}>{index+1} / {journal.entries.length}</Text>
   <PageButton text="›" label="Next field note" disabled={!newer} onPress={()=>setSelected(newer)}/></View>
   {!!lead&&<PageButton text={marked?'Lead marked':'Mark on compass'} label={marked?'Lead marked':'Mark on compass'} disabled={marked} onPress={()=>{if(markFieldNote(world))refresh(n=>n+1)}}/>}</View>
 </View>;
}
const s=StyleSheet.create({
 tab:{position:'absolute',zIndex:8,minHeight:44,justifyContent:'center',backgroundColor:'#1b251feF',borderLeftColor:'#c59651',borderLeftWidth:2,paddingVertical:6,paddingHorizontal:11},
 tabTitle:{fontSize:14,fontWeight:'700',color:'#e9bf81'},tabDetail:{fontSize:13,lineHeight:16,color:'#f4ebd8',marginTop:2},
 book:{position:'absolute',zIndex:28,overflow:'hidden',backgroundColor:'#d8cbb0',borderColor:'#8b7954',borderWidth:1,borderLeftWidth:4,borderRadius:5},
 header:{backgroundColor:'#252d25',flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingLeft:15,paddingRight:5,paddingVertical:5},
 headerTitle:{flex:1},legend:{fontSize:10,letterSpacing:1.8,color:'#e5bd84',fontWeight:'600'},title:{fontFamily:'Georgia',fontSize:22,color:'#f4ecd7'},
 close:{color:'#f4ecd7',fontSize:25},button:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center',paddingHorizontal:6},
 buttonText:{fontSize:15,color:'#30392c',fontWeight:'600'},pressed:{opacity:.76},disabled:{opacity:.42},
 scroll:{flexShrink:1},paper:{padding:14,backgroundColor:'#ded3b9'},texture:{opacity:.65},
 objective:{fontSize:15,lineHeight:20,color:'#333428',fontWeight:'600',borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#918569',paddingBottom:9},
 entry:{flexDirection:'row',gap:12,alignItems:'center',paddingTop:12},story:{flex:1},entryTitle:{fontFamily:'Georgia',fontWeight:'bold',fontSize:17,color:'#302c23',marginBottom:5},
 body:{fontFamily:'Georgia',fontSize:15,lineHeight:21,color:'#302e26'},footer:{borderTopWidth:StyleSheet.hairlineWidth,borderColor:'#84795e',backgroundColor:'#cfc3a8',flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:6},
 pages:{flexDirection:'row',alignItems:'center'},count:{color:'#454335',fontSize:13},
});

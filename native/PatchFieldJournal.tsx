import React,{useEffect,useState} from 'react';
import {BackHandler,Image,ImageBackground,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {World} from '../src/survival-engine';
import {patchJournal} from '../src/patch-journal';
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

const cloth=require('../public/survival/patch-ui-v1/panel-texture.webp');
const corner=require('../public/survival/patch-ui-v1/copper-corner.png');
const journalIcon=require('../public/survival/patch-ui-v1/journal-book.png');

function CoverCloth(){
 return <View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill,s.cloth]}>
  <Image source={cloth} resizeMode="stretch" style={s.clothImage}/>
  <View style={s.insideEdge}/>
 </View>;
}
function CornerPins(){
 return <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
  <Image source={corner} style={[s.pin,s.pinTop]}/><Image source={corner} style={[s.pin,s.pinBottom]}/>
 </View>;
}

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
  return <Pressable accessibilityRole="button" accessibilityLabel="Open quest journal" accessibilityHint={tracker} accessibilityState={{expanded:false}} onPress={()=>setOpen(true)}
   style={({pressed})=>[s.tab,{left},tracker?s.iconTab:undefined,top===undefined?{bottom:lower+56}:{top},pressed&&s.pressed]}>
   <CoverCloth/><Image source={journalIcon} resizeMode="contain" style={s.bookIcon}/>
   {tracker?<Image accessible={false} source={corner} style={s.iconPin}/>:<><Text style={s.tabTitle}>Quest journal</Text><CornerPins/></>}
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
  <CoverCloth/>
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
  <CornerPins/>
 </View>;
}
const s=StyleSheet.create({
 tab:{position:'absolute',zIndex:8,minHeight:45,minWidth:136,paddingHorizontal:7,paddingVertical:5,gap:6,flexDirection:'row',alignItems:'center',
  borderWidth:1,borderColor:'#b19366',borderRadius:5,backgroundColor:'#103e40',shadowColor:'#071918',shadowOpacity:.65,shadowRadius:2,shadowOffset:{width:0,height:2},elevation:2},
 cloth:{overflow:'hidden',borderRadius:4,backgroundColor:'#146061'},
 clothImage:{width:'100%',height:'100%',opacity:.79},
 insideEdge:{position:'absolute',left:1,right:1,top:1,bottom:1,borderWidth:StyleSheet.hairlineWidth,borderColor:'#a9b3a35e',borderRadius:3},
 pin:{position:'absolute',width:16,height:16},pinTop:{left:-1,top:-1},pinBottom:{right:-1,bottom:-1,transform:[{rotate:'180deg'}]},
 iconTab:{height:44,width:44,minWidth:44,minHeight:44,justifyContent:'center',paddingHorizontal:0,paddingVertical:0,borderRadius:12,overflow:'hidden'},
 iconPin:{position:'absolute',top:2,right:2,width:9,height:9,transform:[{rotate:'90deg'}]},
 bookIcon:{width:22,height:22},tabTitle:{fontSize:14,lineHeight:17,fontWeight:'700',color:'#f5c77e'},
 book:{position:'absolute',zIndex:28,padding:3,backgroundColor:'#103e40',borderColor:'#b0956b',borderWidth:1,borderRadius:5,
  shadowColor:'#071918',shadowRadius:9,shadowOpacity:.62,shadowOffset:{width:0,height:5},elevation:5},
 header:{borderBottomWidth:1,borderColor:'#bba47999',flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingLeft:15,paddingRight:5,paddingVertical:5},
 headerTitle:{flex:1},legend:{fontSize:10,letterSpacing:1.6,color:'#ddbc87',fontWeight:'600'},title:{fontFamily:'Georgia',fontSize:22,color:'#fae1af'},
 close:{color:'#f4e4c3',fontSize:25},button:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center',paddingHorizontal:6,flexShrink:1},
 buttonText:{fontSize:15,color:'#f6d79f',fontWeight:'600'},pressed:{opacity:.82},disabled:{opacity:.50},
 scroll:{flexShrink:1,minHeight:0},paper:{padding:14,backgroundColor:'#ded3b9'},texture:{opacity:.65},
 objective:{fontSize:15,lineHeight:20,color:'#333428',fontWeight:'600',borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#918569',paddingBottom:9},
 entry:{flexDirection:'row',gap:12,alignItems:'center',paddingTop:12},story:{flex:1},entryTitle:{fontFamily:'Georgia',fontWeight:'bold',fontSize:17,color:'#302c23',marginBottom:5},
 body:{fontFamily:'Georgia',fontSize:16,lineHeight:23,color:'#302e26'},footer:{borderTopWidth:StyleSheet.hairlineWidth,borderColor:'#998665',flexWrap:'wrap',flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:6},
 pages:{flexDirection:'row',alignItems:'center'},count:{color:'#f1e6cd',fontSize:13},
});

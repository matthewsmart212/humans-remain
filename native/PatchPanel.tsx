import {PATCH_LETTER_POSTSCRIPT,patchLetterDirections} from '../src/patch-letter';
import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {AccessibilityInfo,BackHandler,Image,ImageBackground,Platform,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {World} from '../src/survival-engine';
import {type MenuInsets} from '../src/station-menu-layout';
import {patchPanelLayout} from '../src/patch-panel-layout';
import {LOOT_CHEST_ID,lootChestInMenuRange} from '../src/loot-chest';
import {PATCH_NOTE_TEXT,PATCH_QUEST_TITLE} from '../src/patch-quest';
import {patchJournalStage} from '../src/patch-journal';
import {patchDialogueReply} from '../src/patch-dialogue';
import {patchChat,backPatchChat,choosePatchChat} from '../src/patch-chat';
import {setPatchChatBounds} from '../src/patch-chat-bounds';
import StationMenu from './StationMenu';

type Props={world:World;width:number;height:number;safe:MenuInsets;onClose:()=>void;onChange:()=>void};
const noteParagraphs=PATCH_NOTE_TEXT.split('\n\n');
const letterArt=require('../public/survival/patch-v3/letter.webp');
const gateArt=require('../public/survival/patch-v4/gate-memory.webp');

export function PatchNoteIcon(){
 return <View accessible={false} style={s.noteIcon}>
  <View style={s.noteFold}/>
  <View style={s.noteRule}/><View style={s.noteRule}/><View style={s.noteRule}/>
 </View>;
}

/** The entire illustrated sheet scrolls; the real note remains selectable. */
export function PatchNotePanel({world,onClose,onChange,...frame}:Props){
 const [side,setSide]=useState<'letter'|'sketch'|'gate'>('letter');
 const reverse=side!=='letter',memory=side==='gate';
 const paperWidth=patchPanelLayout(frame.width,frame.height,frame.safe).panel.width;
 const tightNote=paperWidth<400;
 const shortSketch=reverse&&!tightNote&&frame.height<350;
 const back=()=>{
  if(lootChestInMenuRange(world,LOOT_CHEST_ID)){
   world.lootChestId=LOOT_CHEST_ID;
   world.stationPanel='rare-cache';
   onChange();
  }else onClose();
 };
 return <StationMenu presentation="letter" world={world} {...frame} title={PATCH_QUEST_TITLE} label={`${PATCH_QUEST_TITLE}, a folded note from P-04`} closeLabel="Back to supplies" onClose={back}
  footerAction={<View style={s.letterActions}>
   <Pressable accessibilityRole="button" accessibilityLabel={reverse?'Read the front of the letter':'Turn over to see the station sketch'} onPress={()=>setSide(reverse?'letter':'sketch')} style={({pressed})=>[s.turnButton,pressed&&s.returnPressed]}><Text style={s.turnLabel}>{reverse?'Read letter':'Turn over'} ↶</Text></Pressable>
   {reverse&&world.patchQuest?.suppliesDelivered&&<Pressable accessibilityRole="button" onPress={()=>setSide(memory?'sketch':'gate')} style={({pressed})=>[s.turnButton,pressed&&s.returnPressed]}><Text style={s.turnLabel}>{memory?'Station sketch':'Gate memory'}</Text></Pressable>}
   <Pressable accessibilityRole="button" accessibilityLabel="Back to supplies" onPress={back} style={({pressed})=>[s.returnButton,pressed&&s.returnPressed]}><Text style={s.returnLabel}>Back to supplies</Text></Pressable>
  </View>}>
  <ScrollView key={side} style={s.paper} contentContainerStyle={s.paperScrollContent} accessibilityLabel={memory?'The industrial gate':reverse?'Station sketch':"P-04's note"} showsVerticalScrollIndicator indicatorStyle="white">
   <ImageBackground source={letterArt} resizeMode="stretch" style={reverse?s.sketchSheet:s.paperSheet} imageStyle={s.paperArtwork}>
    <View style={[s.paperContent,tightNote&&s.paperContentTight,reverse&&s.sketchContent,shortSketch&&s.sketchContentShort]}>
     <View style={s.provenance}><Text style={s.provenanceText}>{memory?'FROM PATCH’S MEMORY':reverse?'PENCILLED ON THE REVERSE':'LEFT WITH THE SUPPLIES'}</Text><View style={s.paperRule}/></View>
     {memory?<View style={s.sketchRow}>
      <Image source={gateArt} resizeMode="contain" accessibilityLabel="P-04 hauling an injured evacuee through the industrial gate." style={[s.memoryArt,shortSketch&&s.memoryArtShort]}/>
      <Text accessibilityRole="header" style={s.sketchTitle}>The industrial gate</Text><Text selectable style={s.paragraph}>{patchDialogueReply(world,'reclamation')}</Text>
     </View>:reverse?<View style={[s.sketchRow,!tightNote&&s.sketchWide]}>
      <Image source={require('../public/survival/patch-v4/station-sketch.webp')} resizeMode="contain" accessibilityLabel="A pencil sketch of a broken-roofed shed with a chain hoist." style={[s.sketchArt,!tightNote&&s.sketchArtWide,shortSketch&&s.sketchArtShort]}/>
      <View style={s.sketchCaption}><Text style={s.sketchTitle}>Lakeside rescue shelter</Text><Text selectable style={s.paragraph}>{patchLetterDirections(world)}</Text></View>
     </View>:<>
      {noteParagraphs.slice(0,-1).map((paragraph,index)=><Text selectable key={index} style={[s.paragraph,tightNote&&s.paragraphTight,index===0&&s.salutation,index===1&&s.promise]}>{paragraph}</Text>)}
      <View style={s.signature}><View accessible={false} style={s.signatureMark}><View style={s.signatureBar}/><View style={s.signatureBar}/><View style={s.signatureBar}/></View><Text selectable style={s.signatureText}>{noteParagraphs.at(-1)}</Text></View>
      {world.patchQuest?.suppliesDelivered&&<Text selectable style={[s.paragraph,s.postscript]}>{PATCH_LETTER_POSTSCRIPT}</Text>}
     </>}
    </View>
   </ImageBackground>
  </ScrollView>
 </StationMenu>;
}

type ChatProps=Omit<Props,'onChange'>&{onChange:(save:boolean)=>void};
type Bounds={x:number;y:number;width:number;height:number};

/** Only the response controls receive touches; the renderer speaks over the robot. */
export function PatchChatHUD({world,width,height,safe,onClose,onChange}:ChatProps){
 const chat=patchChat(world);
 const scroll=useRef<React.ComponentRef<typeof ScrollView>>(null);
 const [rect,setRect]=useState<Bounds>();
 const safeWidth=width-safe.left-safe.right;
 const landscape=width>height;
 const trayWidth=Math.min(355,landscape?width*.42:safeWidth-24,safeWidth-24);
 const optionsWidth=trayWidth-48;
 const maxHeight=Math.min(height*(landscape ? .50 : .36),height-safe.top-safe.bottom-24);
 const bottom=Math.max(12,safe.bottom+10);
 const right=Math.max(12,safe.right+8);
 const live=!!chat;
 useLayoutEffect(()=>{
  setPatchChatBounds(world,live?rect:undefined,safe);
  return ()=>setPatchChatBounds(world,undefined);
 },[world,rect,live,safe.top,safe.bottom,safe.left,safe.right]);
 useEffect(()=>{
  if(chat?.line)AccessibilityInfo.announceForAccessibility(chat.speaker+'. '+chat.line);
  scroll.current?.scrollTo({y:0,animated:false});
  if(chat?.choices.length)scroll.current?.flashScrollIndicators?.();
 },[chat?.speaker,chat?.line,chat?.view,chat?.pageIndex]);
 const back=()=>{if(!backPatchChat(world))return false;onChange(false);return true};
 const backRef=useRef(back);backRef.current=back;
 useEffect(()=>{
  if(!live)return;
  const sub=BackHandler.addEventListener('hardwareBackPress',()=>backRef.current());
  return ()=>sub.remove();
 },[live]);
 if(!chat)return null;
 const choose=(id:string)=>{
  const stage=patchJournalStage(world),command=world.patchQuest?.command;
  if(choosePatchChat(world,id,chat))onChange(stage!==patchJournalStage(world)||command!==world.patchQuest?.command);
 };
 return <View pointerEvents="box-none" onAccessibilityEscape={back} style={[s.chatDock,{width:trayWidth,maxHeight,right,bottom}]}
  onLayout={event=>setRect(event.nativeEvent.layout)}>
  <ScrollView ref={scroll} style={[s.chatList,{width:optionsWidth,maxHeight}]}
   accessibilityLabel={chat.speaker+' response choices'} showsVerticalScrollIndicator persistentScrollbar indicatorStyle="white" bounces={false}>
   {chat.choices.map((item,index)=>{
    const isCommand=item.id==='follow'||item.id==='camp'||item.id==='stay';
    const selected=isCommand&&world.patchQuest?.command===item.id;
    return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.label}
     accessibilityState={isCommand?{selected}:undefined} onPress={()=>choose(item.id)}
     style={({pressed})=>[s.chatChoice,index>0&&s.chatDivider,pressed&&s.chatPressed]}>
     <View accessible={false} style={[s.chatDiamond,(index===0||selected)&&s.chatDiamondLit]}/>
     <Text style={[s.chatChoiceLabel,(index===0||selected)&&s.chatChoiceGold]}>{item.label}</Text>
     {selected&&<Text accessible={false} style={s.chatCheck}>✓</Text>}
    </Pressable>;
   })}
  </ScrollView>
   <Pressable accessibilityRole="button" accessibilityLabel="End conversation" onPress={onClose}
    style={({pressed})=>[s.chatEnd,pressed&&s.chatPressed]}><View style={s.chatEndRing}><Text allowFontScaling={false} style={s.chatEndMark}>×</Text></View></Pressable>
 </View>;
}

const s=StyleSheet.create({
 paper:{flex:1,minHeight:0},paperScrollContent:{flexGrow:1,paddingHorizontal:2,paddingBottom:3},
 paperSheet:{width:'100%',minHeight:600},paperArtwork:{opacity:1},
 paperContent:{paddingHorizontal:52,paddingTop:58,paddingBottom:66,gap:16},
 paperContentTight:{paddingHorizontal:28,paddingTop:43,paddingBottom:48,gap:15},
 paragraph:{fontFamily:Platform.OS==='ios'?'Georgia':'serif',fontSize:17,lineHeight:26,color:'#292a20'},
 paragraphTight:{fontSize:16,lineHeight:25},salutation:{fontStyle:'italic'},promise:{fontWeight:'700'},
 provenance:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:7},
 provenanceText:{color:'#353629',fontSize:10,lineHeight:14,fontWeight:'700',letterSpacing:1.3},paperRule:{flex:1,height:1,backgroundColor:'#83734e60'},
 signature:{flexDirection:'row',alignItems:'center',gap:11,marginTop:8},
 signatureText:{fontFamily:Platform.OS==='ios'?'Courier New':'monospace',fontSize:23,lineHeight:30,fontWeight:'700',letterSpacing:1.5,color:'#292a20'},
 signatureMark:{flexDirection:'row',gap:3},signatureBar:{width:3,height:10,borderRadius:1,backgroundColor:'#756243'},
 sketchSheet:{width:'100%',flexGrow:1},sketchContent:{paddingTop:26,paddingBottom:32},
 sketchContentShort:{paddingTop:14,paddingBottom:14,paddingHorizontal:32,gap:4},
 sketchArtShort:{width:'32%',height:100},
 sketchRow:{gap:12},sketchWide:{flexDirection:'row',alignItems:'center',gap:16},
 sketchArt:{width:'100%',height:155},sketchArtWide:{width:'45%',height:142},
 sketchCaption:{flexShrink:1,gap:6},sketchTitle:{fontFamily:Platform.OS==='ios'?'Georgia':'serif',fontWeight:'bold',fontSize:19,color:'#292a20'},
 postscript:{fontStyle:'italic',borderTopWidth:1,borderColor:'#83734e60',paddingTop:14},
 letterActions:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'},
 turnButton:{minHeight:44,paddingHorizontal:9,justifyContent:'center'},turnLabel:{fontSize:14,fontWeight:'600',color:'#ecc887'},
 returnButton:{minHeight:44,marginLeft:'auto',paddingHorizontal:9,justifyContent:'center'},returnPressed:{opacity:.7},returnLabel:{fontSize:14,fontWeight:'600',color:'#e7e2d1'},
 memoryArt:{width:'100%',height:175},memoryArtShort:{height:105},
 chatDock:{position:'absolute',flexDirection:'row',alignItems:'flex-end',gap:4},
 chatList:{backgroundColor:'#111913ed',borderTopWidth:1,borderBottomWidth:1,borderColor:'#9b855c88'},
 chatChoice:{minHeight:44,flexDirection:'row',alignItems:'center',gap:13,paddingHorizontal:13,paddingVertical:7},
 chatDivider:{borderTopWidth:StyleSheet.hairlineWidth,borderColor:'#b7a47755'},
 chatDiamond:{width:6,height:6,borderWidth:1,borderColor:'#c3ad83',transform:[{rotate:'45deg'}]},
 chatDiamondLit:{backgroundColor:'#e1b16a',borderColor:'#edc88c'},
 chatChoiceLabel:{flex:1,color:'#f7efdc',fontSize:16,lineHeight:21,fontWeight:'500'},chatChoiceGold:{color:'#ffe2ac'},
 chatCheck:{color:'#edc88c',fontSize:15},
 chatEnd:{width:44,minHeight:44,alignItems:'center',justifyContent:'center'},
 chatEndRing:{width:29,height:29,borderRadius:15,alignItems:'center',justifyContent:'center',backgroundColor:'#182019e8',borderWidth:1,borderColor:'#c7af8088'},
 chatEndMark:{fontSize:21,lineHeight:24,color:'#ede1c7'},chatPressed:{backgroundColor:'#433d2c'},
 noteIcon:{width:28,height:35,marginHorizontal:5,borderWidth:1,borderColor:'#b49d70',borderRadius:2,backgroundColor:'#dfd1ad',transform:[{rotate:'-5deg'}],paddingTop:10,gap:4,alignItems:'center'},
 noteFold:{position:'absolute',right:-1,top:-1,width:8,height:8,borderLeftWidth:1,borderBottomWidth:1,borderColor:'#b49d70',backgroundColor:'#ede3c8'},
 noteRule:{width:15,height:1,backgroundColor:'#787a62'},
});

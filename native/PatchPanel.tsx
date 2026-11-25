import {PATCH_LETTER_POSTSCRIPT,patchLetterDirections} from '../src/patch-letter';
import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {AccessibilityInfo,BackHandler,Image,ImageBackground,Platform,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {World} from '../src/survival-engine';
import {type MenuInsets} from '../src/station-menu-layout';
import {patchPanelLayout} from '../src/patch-panel-layout';
import {LOOT_CHEST_ID,lootChestInMenuRange} from '../src/loot-chest';
import {PATCH_NOTE_TEXT,PATCH_QUEST_TITLE} from '../src/patch-quest';
import {patchJournalStage} from '../src/patch-journal';
import {patchDialogueReply} from '../src/patch-dialogue';
import {patchChat,backPatchChat,choosePatchChat} from '../src/patch-chat';
import {patchConversationLayout,localPatchRect,patchChoiceIcon} from '../src/patch-conversation-layout';
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
const panelTexture=require('../public/survival/patch-ui-v1/panel-texture.webp');
const cornerArt=require('../public/survival/patch-ui-v1/copper-corner.png');
const portraitArt=require('../public/survival/patch-ui-v1/portrait.webp');
const closeArt=require('../public/survival/patch-ui-v1/close.png');
const glyphs={
 wrench:require('../public/survival/patch-ui-v1/wrench.png'),
 talk:require('../public/survival/patch-ui-v1/talk.png'),
 follow:require('../public/survival/patch-ui-v1/follow.png'),
};

function FramePaint({corner}:{corner:number}){
 return <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={s.framePaint}>
  <Image source={panelTexture} resizeMode="stretch" style={s.frameTexture}/>
  <View style={s.innerStroke}/>
  {[s.topLeft,s.topRight,s.lowerLeft,s.lowerRight].map((style,index)=><Image key={index} source={cornerArt} style={[{width:corner,height:corner},style]}/>)}
 </View>;
}

export function PatchChatHUD({world,width,height,safe,onClose,onChange}:ChatProps){
 const chat=patchChat(world),scroll=useRef<React.ComponentRef<typeof ScrollView>>(null);
 const copy=useRef<React.ComponentRef<typeof ScrollView>>(null);
 const {fontScale}=useWindowDimensions();
 const layout=patchConversationLayout(width,height,safe,chat?.view??'greeting',chat?.choices.length??0);
 const {hud,actions,speech,greeting,pad,row,header,font,labelFont}=layout;
 const corner=Math.min(36,Math.max(16,Math.round(width*.027)));
 const live=!!chat;
 useLayoutEffect(()=>{
  setPatchChatBounds(world,live?actions:undefined,safe);
  return ()=>setPatchChatBounds(world,undefined);
 },[world,live,actions.x,actions.y,actions.width,actions.height,safe.top,safe.bottom,safe.left,safe.right]);
 useEffect(()=>{
  if(chat?.line)AccessibilityInfo.announceForAccessibility(chat.speaker+'. '+chat.line);
  scroll.current?.scrollTo({y:0,animated:false});copy.current?.scrollTo({y:0,animated:false});
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
 const portrait=Math.round(layout.portrait*(fontScale>1.35 ? .76 : 1));
 return <View pointerEvents="box-none" onAccessibilityEscape={back} style={[s.absolute,localPatchRect(hud,{x:0,y:0,width,height})]}>
  {greeting&&<FramePaint corner={corner}/>}
  <View pointerEvents="box-none" style={[s.chatSpeech,localPatchRect(speech,hud),{gap:pad*1.4,paddingVertical:pad,paddingHorizontal:pad*1.55}]}>
   {!greeting&&<FramePaint corner={corner}/>}
   <Image source={portraitArt} resizeMode="contain" accessible={false} style={{width:portrait,height:portrait}}/>
   <View pointerEvents="box-none" style={s.chatCopy}>
     {greeting?<Text maxFontSizeMultiplier={1.4} style={[s.namePlate,{fontSize:font}]}>{chat.speaker}</Text>:
     <View accessible accessibilityLabel={chat.speaker} style={s.identity}><Text style={[s.identityName,{fontSize:font*1.14}]}>PATCH</Text><Text style={[s.designation,{fontSize:labelFont*.86}]}>P-04</Text></View>}
    <ScrollView ref={copy} style={s.speechScroll} bounces={false} showsVerticalScrollIndicator indicatorStyle="white">
     <Text selectable style={[s.speechLine,{fontSize:font,lineHeight:Math.round(font*1.25)}]}>{chat.line}</Text>
    </ScrollView>
   </View>
  </View>
  <View pointerEvents="box-none" style={[s.absolute,localPatchRect(actions,hud),
   {padding:pad,paddingTop:greeting?(layout.wide?pad:0):0,justifyContent:greeting?'center':'flex-start'}]}>
   {!greeting&&<FramePaint corner={corner}/>}
   {greeting&&layout.wide&&<View style={s.verticalRule}/>}
   {!greeting&&<View style={[s.panelHeading,{height:header,paddingRight:header}]}><Text maxFontSizeMultiplier={1.4} accessibilityRole="header" style={[s.panelTitle,{fontSize:font*1.2}]}>Ask Patch</Text></View>}
   <ScrollView ref={scroll} style={s.answerList} contentContainerStyle={greeting?s.rowsSpaced:undefined}
    accessibilityLabel={chat.speaker+' response choices'} showsVerticalScrollIndicator persistentScrollbar indicatorStyle="white" bounces={false}>
    {chat.choices.map((item,index)=>{
     const isCommand=item.id==='follow'||item.id==='camp'||item.id==='stay',selected=isCommand&&world.patchQuest?.command===item.id;
     const icon=(greeting||item.id==='topic:damage')&&patchChoiceIcon(item.id);
     return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={isCommand?{selected}:undefined}
      onPress={()=>choose(item.id)} style={({pressed})=>[s.choice,{minHeight:row,gap:pad,paddingHorizontal:pad*1.2},
       greeting?s.insetChoice:s.branchChoice,greeting&&index===0&&[s.primaryChoice,{marginRight:header}],!greeting&&index===0&&s.activeChoice,selected&&s.activeChoice,pressed&&s.choicePressed]}>
      {icon?<Image accessible={false} source={glyphs[icon]} style={{width:labelFont*1.56,height:labelFont*1.56}}/>:!greeting&&<View accessible={false} style={s.diamond}/>}
      <Text style={[s.choiceText,{fontSize:labelFont,lineHeight:Math.round(labelFont*1.2)},(index===0||selected)&&s.choiceGold]}>{item.label}</Text>
      {selected?<Text accessible={false} style={s.choiceGold}>✓</Text>:(greeting||item.id==='more')&&<View accessible={false} style={s.chevron}/>}
     </Pressable>;
    })}
   </ScrollView>
   <Pressable accessibilityRole="button" accessibilityLabel="End conversation" onPress={onClose}
    style={({pressed})=>[s.chatEnd,{width:header,height:header,right:pad,top:greeting?pad:0},pressed&&s.returnPressed]}>
    <Image source={closeArt} accessible={false} style={{width:header*.72,height:header*.72}}/>
   </Pressable>
  </View>
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
 absolute:{position:'absolute'},
 framePaint:{...StyleSheet.absoluteFill,borderRadius:9,backgroundColor:'#123434',overflow:'hidden',borderWidth:1,borderColor:'#be9c69'},
 frameTexture:{width:'100%',height:'100%',opacity:.88},innerStroke:{position:'absolute',inset:3,borderWidth:1,borderRadius:5,borderColor:'#86765177'},
 topLeft:{position:'absolute',left:0,top:0},topRight:{position:'absolute',right:0,top:0,transform:[{scaleX:-1}]},
 lowerLeft:{position:'absolute',left:0,bottom:0,transform:[{scaleY:-1}]},lowerRight:{position:'absolute',right:0,bottom:0,transform:[{rotate:'180deg'}]},
 chatSpeech:{position:'absolute',flexDirection:'row',alignItems:'center'},
 chatCopy:{flex:1,alignSelf:'stretch',justifyContent:'center',minHeight:0,gap:4},
 namePlate:{alignSelf:'flex-start',color:'#26291f',backgroundColor:'#d2b275',borderRadius:2,borderWidth:1,borderColor:'#e4c990',fontFamily:'FieldKitBarlow',letterSpacing:1,paddingHorizontal:10},
 identity:{flexDirection:'row',alignItems:'baseline',gap:8},identityName:{fontFamily:'FieldKitBarlow',color:'#edc787',letterSpacing:1},designation:{fontWeight:'600',color:'#c6b28e'},
 speechScroll:{flexGrow:0,flexShrink:1},speechLine:{color:'#fcf2d6',fontWeight:'600'},
 verticalRule:{position:'absolute',left:0,top:'13%',bottom:'13%',width:1,backgroundColor:'#9e8661'},
 panelHeading:{justifyContent:'center',marginHorizontal:4,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#99875588'},
 panelTitle:{fontFamily:'FieldKitBarlow',color:'#f7e8c5',paddingLeft:4},
 answerList:{flexGrow:0,flexShrink:1},rowsSpaced:{gap:4},
 choice:{minHeight:44,paddingVertical:5,flexDirection:'row',alignItems:'center'},
 insetChoice:{backgroundColor:'#214142',borderWidth:1,borderRadius:4,borderColor:'#aa925f'},primaryChoice:{borderColor:'#f1c97f'},
 branchChoice:{borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#777e6690',borderLeftWidth:3,borderLeftColor:'transparent'},
 activeChoice:{backgroundColor:'#415b49',borderLeftColor:'#e0b974'},choicePressed:{backgroundColor:'#496756'},
 choiceText:{flex:1,fontWeight:'600',color:'#f4e9cd'},choiceGold:{color:'#ffdf9e'},
 diamond:{width:6,height:6,marginHorizontal:4,transform:[{rotate:'45deg'}],borderWidth:1,borderColor:'#b5aa80'},
 chevron:{width:7,height:7,marginRight:3,transform:[{rotate:'-45deg'}],borderRightWidth:1.5,borderBottomWidth:1.5,borderColor:'#d8bf89'},
 chatEnd:{position:'absolute',minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},
 noteIcon:{width:28,height:35,marginHorizontal:5,borderWidth:1,borderColor:'#b49d70',borderRadius:2,backgroundColor:'#dfd1ad',transform:[{rotate:'-5deg'}],paddingTop:10,gap:4,alignItems:'center'},
 noteFold:{position:'absolute',right:-1,top:-1,width:8,height:8,borderLeftWidth:1,borderBottomWidth:1,borderColor:'#b49d70',backgroundColor:'#ede3c8'},
 noteRule:{width:15,height:1,backgroundColor:'#787a62'},
});

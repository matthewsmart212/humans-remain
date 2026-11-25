import React,{useEffect,useRef,useState} from 'react';
import {Image,ImageBackground,Platform,Pressable,ScrollView,StyleSheet,Text,useWindowDimensions,View} from 'react-native';
import type {World} from '../src/survival-engine';
import {type MenuInsets} from '../src/station-menu-layout';
import {patchPanelLayout} from '../src/patch-panel-layout';
import {LOOT_CHEST_ID,lootChestInMenuRange} from '../src/loot-chest';
import {PATCH_NOTE_TEXT,patchStatus,recruitPatch,commandPatch} from '../src/patch-quest';
import {patchDialogueTopics,patchDialogueReply,patchOpeningLine,type PatchTopicId} from '../src/patch-dialogue';
import StationMenu from './StationMenu';

type Props={world:World;width:number;height:number;safe:MenuInsets;onClose:()=>void;onChange:()=>void};
const noteParagraphs=PATCH_NOTE_TEXT.split('\n\n');
const letterArt=require('../public/survival/patch-v3/letter.webp');
const portraitArt=require('../public/survival/patch-v3/portrait.webp');

export function PatchNoteIcon(){
 return <View accessible={false} style={s.noteIcon}>
  <View style={s.noteFold}/>
  <View style={s.noteRule}/><View style={s.noteRule}/><View style={s.noteRule}/>
 </View>;
}

/** The entire illustrated sheet scrolls; the real note remains selectable. */
export function PatchNotePanel({world,onClose,onChange,...frame}:Props){
 const paperWidth=patchPanelLayout(frame.width,frame.height,frame.safe,'letter').panel.width;
 const tightNote=paperWidth<400;
 const back=()=>{
  if(lootChestInMenuRange(world,LOOT_CHEST_ID)){
   world.lootChestId=LOOT_CHEST_ID;
   world.stationPanel='rare-cache';
   onChange();
  }else onClose();
 };
 return <StationMenu presentation="letter" world={world} {...frame} title="A folded note" label="A folded note from P-04" closeLabel="Back to supplies" onClose={back}
  footerAction={<Pressable accessibilityRole="button" accessibilityLabel="Back to supplies" onPress={back} style={({pressed})=>[s.returnButton,pressed&&s.returnPressed]}><Text style={s.returnLabel}>Back to supplies</Text></Pressable>}>
  <ScrollView style={s.paper} contentContainerStyle={s.paperScrollContent} accessibilityLabel="P-04's note" showsVerticalScrollIndicator indicatorStyle="white">
   <ImageBackground source={letterArt} resizeMode="stretch" style={s.paperSheet} imageStyle={s.paperArtwork}>
    <View style={[s.paperContent,tightNote&&s.paperContentTight]}>
     <View style={s.provenance}><Text style={s.provenanceText}>LEFT WITH THE SUPPLIES</Text><View style={s.paperRule}/></View>
     {noteParagraphs.slice(0,-1).map((paragraph,index)=><Text selectable key={index} style={[s.paragraph,tightNote&&s.paragraphTight,index===0&&s.salutation,index===1&&s.promise]}>{paragraph}</Text>)}
     <View style={s.signature}><View accessible={false} style={s.signatureMark}><View style={s.signatureBar}/><View style={s.signatureBar}/><View style={s.signatureBar}/></View><Text selectable style={s.signatureText}>{noteParagraphs.at(-1)}</Text></View>
    </View>
   </ImageBackground>
  </ScrollView>
 </StationMenu>;
}

function Choice({label,onPress,primary=false,selected=false,grow=false}:{label:string;onPress:()=>void;primary?:boolean;selected?:boolean;grow?:boolean}){
 return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected}} accessibilityHint={selected?'Current instruction':undefined} onPress={onPress}
  style={({pressed})=>[s.choice,grow&&s.choiceGrow,primary&&s.choicePrimary,selected&&s.choiceSelected,pressed&&s.choicePressed]}>
  <Text style={[s.choiceText,primary&&s.choicePrimaryText]}>{label}</Text>
 </Pressable>;
}

/** Questions only change this conversation. Commands retain their quest gates. */
export default function PatchPanel({world,onClose,onChange,...frame}:Props){
 const [asking,setAsking]=useState(false),[topic,setTopic]=useState<PatchTopicId>();
 const dialogueScroll=useRef<React.ComponentRef<typeof ScrollView>>(null);
 const {fontScale}=useWindowDimensions();
 useEffect(()=>{dialogueScroll.current?.scrollTo({y:0,animated:false})},[asking,topic]);
 const status=patchStatus(world);
 if(!status)return null;
 const invite=()=>{if(recruitPatch(world)){onClose();onChange()}};
 const command=(value:'follow'|'stay'|'camp')=>{if(commandPatch(world,value)){onClose();onChange()}};
 const current=world.patchQuest?.command;
 const condition=status.canCommand?(current==='follow'?'Following you':current==='camp'?'Returning to camp':'Waiting here'):world.patchQuest?.recruited?'Heading home':status.canRecruit?'Drive restored':'Rescue unit · P-04';
 const topics=patchDialogueTopics(world),selected=topics.find(item=>item.id===topic);
 const reply=topic?patchDialogueReply(world,topic):undefined;
 const layout=patchPanelLayout(frame.width,frame.height,frame.safe,'conversation');
 const sidePortrait=layout.panel.width>=480;
 // At larger accessibility sizes a fixed portrait and command footer could
 // consume the entire short display. Let the conversation and actions share
 // one scroll area, and keep decorative art from displacing readable text.
 const largeText=fontScale>1.3;
 const flowingActions=largeText&&(layout.panel.height<380||!sidePortrait);
 const showPortrait=!(largeText&&layout.panel.height<340);
 const back=()=>{if(topic)setTopic(undefined);else if(asking)setAsking(false);else onClose()};
 const actions=<View style={[s.choices,status.canCommand&&sidePortrait&&s.choicesWide,flowingActions&&s.choicesFlow]}>
  {status.canRecruit?<Choice primary label="Come with us" onPress={invite}/>:status.canCommand?<>
   <Choice primary grow={sidePortrait} label="Follow me" selected={current==='follow'} onPress={()=>command('follow')}/>
   <View style={[s.secondaryChoices,sidePortrait&&s.secondaryWide]}>
    <Choice grow label="Stay here" selected={current==='stay'} onPress={()=>command('stay')}/>
    <Choice grow label="Return to camp" selected={current==='camp'} onPress={()=>command('camp')}/>
   </View>
  </>:<Choice label={status.canRepair?'Ready to repair':world.patchQuest?.recruited?'Let’s get you home':'I’ll look for it'} onPress={onClose}/>}
 </View>;
 return <StationMenu presentation="conversation" world={world} {...frame} title={status.title} subtitle={largeText&&layout.panel.height<340?undefined:condition} label={`${status.title} companion`} closeLabel="End conversation" onClose={onClose} onBack={back} footerAction={flowingActions?undefined:actions}>
  <View style={[s.conversation,sidePortrait&&s.conversationWide]}>
   {showPortrait&&<View accessible={false} style={[s.portraitFrame,sidePortrait?s.portraitSide:s.portraitTop,!sidePortrait&&largeText&&s.portraitTopCompact]}>
    <Image source={portraitArt} resizeMode="cover" style={s.portrait}/>
    <View style={s.portraitCaption}><Text style={s.portraitCode}>P-04</Text><Text style={s.portraitRole}>RESCUE UNIT</Text></View>
   </View>}
   <ScrollView ref={dialogueScroll} style={s.dialogueScroll} contentContainerStyle={s.dialogueContent} showsVerticalScrollIndicator indicatorStyle="white">
    {selected&&reply&&<Text style={s.questionEcho}>{selected.label}</Text>}
    <Text accessibilityLiveRegion="polite" style={s.line}>{reply??(asking?'What would you like to know?':patchOpeningLine(world))}</Text>
    {!!status.objective&&!status.canCommand&&!reply&&!asking&&<Text style={s.objective}>{status.objective}</Text>}
    {topics.length>0&&(topic?<Pressable accessibilityRole="button" onPress={()=>setTopic(undefined)} style={({pressed})=>[s.askButton,pressed&&s.choicePressed]}><Text style={s.askLabel}>Ask something else</Text></Pressable>:asking?<View style={s.questions}>
     {topics.map(item=><Pressable key={item.id} accessibilityRole="button" onPress={()=>setTopic(item.id)} style={({pressed})=>[s.question,pressed&&s.questionPressed]}><Text style={s.questionLabel}>{item.label}</Text><Text accessible={false} style={s.questionMark}>›</Text></Pressable>)}
     <Pressable accessibilityRole="button" onPress={()=>setAsking(false)} style={({pressed})=>[s.askButton,pressed&&s.choicePressed]}><Text style={s.askLabel}>Back to conversation</Text></Pressable>
    </View>:<Pressable accessibilityRole="button" onPress={()=>setAsking(true)} style={({pressed})=>[s.askButton,pressed&&s.choicePressed]}><Text style={s.askLabel}>Ask Patch</Text><Text accessible={false} style={s.questionMark}>›</Text></Pressable>)}
    {flowingActions&&actions}
   </ScrollView>
  </View>
 </StationMenu>;
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
 returnButton:{minHeight:44,marginLeft:'auto',paddingHorizontal:9,justifyContent:'center'},returnPressed:{opacity:.7},returnLabel:{fontSize:14,fontWeight:'600',color:'#e7e2d1'},
 conversation:{flex:1,minHeight:0,gap:12},conversationWide:{flexDirection:'row',gap:16},
 portraitFrame:{overflow:'hidden',backgroundColor:'#111a15',borderWidth:1,borderColor:'#6c70504d',borderRadius:4},
 portraitSide:{width:'31%',maxWidth:220,minWidth:128,alignSelf:'stretch'},portraitTop:{height:145,width:'100%'},portraitTopCompact:{height:90},
 portrait:{width:'100%',height:'100%'},
 portraitCaption:{position:'absolute',bottom:0,left:0,right:0,paddingHorizontal:12,paddingVertical:10,backgroundColor:'#111912cc',gap:2},
 portraitCode:{fontSize:15,fontWeight:'700',letterSpacing:2,color:'#e0c58e'},portraitRole:{fontSize:10,fontWeight:'600',letterSpacing:1.8,color:'#bbc2ae'},
 dialogueScroll:{flex:1,minHeight:0,minWidth:0},dialogueContent:{paddingRight:4,paddingTop:6,paddingBottom:5,gap:12},
 line:{fontFamily:Platform.OS==='ios'?'Georgia':'serif',fontSize:18,lineHeight:27,color:'#f1ead8'},
 objective:{fontSize:14,lineHeight:21,color:'#bbc8b1'},
 questionEcho:{fontSize:13,lineHeight:19,color:'#d7b981',fontStyle:'italic'},
 questions:{gap:3},question:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,paddingVertical:9,paddingHorizontal:10,borderWidth:1,borderColor:'#7380654d',borderRadius:3,backgroundColor:'#222d23'},
 questionPressed:{backgroundColor:'#344030',borderColor:'#c6a36b'},questionLabel:{flex:1,fontSize:15,lineHeight:21,color:'#e6e7d9'},questionMark:{fontSize:22,lineHeight:24,color:'#c6a36b'},
 askButton:{minHeight:44,paddingVertical:9,paddingHorizontal:2,flexDirection:'row',gap:10,alignItems:'center',alignSelf:'flex-start'},askLabel:{fontSize:14,lineHeight:20,fontWeight:'600',color:'#d7bb82'},
 choices:{flex:1,gap:6,paddingTop:8,borderTopWidth:1,borderTopColor:'#66725555'},choicesWide:{flexDirection:'row'},choicesFlow:{flex:0,alignSelf:'stretch'},secondaryChoices:{flexDirection:'row',gap:6},secondaryWide:{flex:2},
 choice:{minHeight:44,paddingHorizontal:10,paddingVertical:8,justifyContent:'center',alignItems:'center',borderWidth:1,borderRadius:4,borderColor:'#68745a',backgroundColor:'#263126'},
 choiceGrow:{flex:1},choicePrimary:{backgroundColor:'#c8a369',borderColor:'#e2c28e'},choiceSelected:{borderColor:'#e3ca98'},choicePressed:{opacity:.76},
 choiceText:{color:'#ede9d9',fontSize:14,lineHeight:19,fontWeight:'700',textAlign:'center'},choicePrimaryText:{color:'#242719'},
 noteIcon:{width:28,height:35,marginHorizontal:5,borderWidth:1,borderColor:'#b49d70',borderRadius:2,backgroundColor:'#dfd1ad',transform:[{rotate:'-5deg'}],paddingTop:10,gap:4,alignItems:'center'},
 noteFold:{position:'absolute',right:-1,top:-1,width:8,height:8,borderLeftWidth:1,borderBottomWidth:1,borderColor:'#b49d70',backgroundColor:'#ede3c8'},
 noteRule:{width:15,height:1,backgroundColor:'#787a62'},
});

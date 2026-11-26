import React,{memo,useCallback,useEffect,useLayoutEffect,useState,useSyncExternalStore} from 'react';
import {AccessibilityInfo,Animated,Image,Pressable,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {Canvas,Circle,Group,LinearGradient,Path,vec} from '@shopify/react-native-skia';
import type {PatchChat} from '../src/patch-chat';
import type {World} from '../src/survival-engine';
import type {MenuInsets} from '../src/station-menu-layout';
import {patchChatActors,subscribePatchChatActors} from '../src/patch-chat-bounds';
import {conversationBubbleMetrics,conversationBubblePath,placeConversationBubble} from '../src/patch-bubble-placement';

type Props={
 chat:PatchChat;world:World;width:number;height:number;safe:MenuInsets;replyTop:number;
 onContinue:()=>void;onReadable:(ready:boolean)=>void;
};
type MeasuredLine={text:string;width:number;height:number};
const texture=require('../public/survival/patch-ui-v1/panel-texture.webp');

const BubblePaint=memo(function BubblePaint({path,width:w,height:h}:{path:string;width:number;height:number}){
 const bleed=25;
 return <>
  <Canvas pointerEvents="none" style={{position:'absolute',left:-bleed,top:-bleed,width:w+bleed*2,height:h+bleed*2}}>
   <Group transform={[{translateX:bleed},{translateY:bleed}]}>
    <Path path={path} color="#1e2c24"/>
    <Path path={path} style="stroke" strokeWidth={1.4} strokeJoin="round">
     <LinearGradient start={vec(0,0)} end={vec(w,h)} colors={['#e0ac79','#967253','#c39063','#805c44','#c99668']}/>
    </Path>
    {[7,w-7].map(x=><Group key={x}>
     <Circle cx={x} cy={6.5} r={2} color="#0a1712"/>
     <Circle cx={x} cy={6} r={1.5} color="#a87a55"/>
     <Circle cx={x-.4} cy={5.6} r={.55} color="#dfa574"/>
    </Group>)}
   </Group>
  </Canvas>
  <View pointerEvents="none" style={s.surface}><Image accessible={false} source={texture} resizeMode="stretch" style={s.texture}/></View>
 </>;
});

export function PatchConversationBubble(props:Props){
 const {fontScale}=useWindowDimensions();
 const m=conversationBubbleMetrics(props.width,props.height,props.safe,props.replyTop,fontScale);
 // Drop old measurements synchronously with a turn or a font/geometry change.
 return <MeasuredBubble key={JSON.stringify([props.chat.view,props.chat.question,props.chat.line,props.chat.pageIndex,m.width,m.font,m.maxLines])} {...props} metrics={m}/>;
}

function MeasuredBubble({chat,world,width,height,safe,replyTop,onContinue,onReadable,metrics:m}:Props&{metrics:ReturnType<typeof conversationBubbleMetrics>}){
 const [lines,setLines]=useState<MeasuredLine[]>([]),[section,setSection]=useState(0);
 const subscribe=useCallback((listener:()=>void)=>subscribePatchChatActors(world,listener),[world]);
 const snapshot=useCallback(()=>patchChatActors(world),[world]);
 const actors=useSyncExternalStore(subscribe,snapshot,snapshot);
 const visible=lines.slice(section*m.maxLines,(section+1)*m.maxLines);
 const moreHere=(section+1)*m.maxLines<lines.length;
 const canAdvance=moreHere||chat.choices.some(choice=>choice.id==='more');
 const body=visible.map(line=>line.text.trimEnd()).join('\n');
 const ready=visible.length>0&&!moreHere&&!!actors;
 useLayoutEffect(()=>onReadable(ready),[onReadable,ready]);
 useEffect(()=>{
  if(body)AccessibilityInfo.announceForAccessibility(chat.speaker+'. '+body.replace(/\n/g,' '));
 },[chat.speaker,body]);
 const [opacity]=useState(()=>new Animated.Value(1));
 const reducedMotion=!!world.weather?.reducedMotion;
 useEffect(()=>{
  if(!body||reducedMotion){opacity.setValue(1);return}
  opacity.setValue(.76);
  const arrival=Animated.timing(opacity,{toValue:1,duration:110,useNativeDriver:true,isInteraction:false});
  arrival.start();
  return ()=>arrival.stop();
 },[body,reducedMotion,opacity]);
 const bodyStyle={fontSize:m.font,lineHeight:m.lineHeight};
 const w=lines.length===1?Math.min(m.width,Math.max(148,Math.ceil(lines[0].width)+2*m.padX+3)):m.width;
 const textHeight=visible.reduce((sum,line)=>sum+Math.max(line.height,m.lineHeight),0);
 const h=Math.ceil(2*m.padY+m.headerHeight+textHeight);
 const card=actors&&visible.length?placeConversationBubble(width,height,safe,replyTop,actors.patch,actors.survivor,w,h):undefined;
 const advance=()=>{
  if(moreHere)setSection(section+1);
  else if(canAdvance)onContinue();
 };
 return <>
  <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.measure,{width:m.width-2*m.padX}]}>
   <Text allowFontScaling={false} textBreakStrategy="simple" lineBreakStrategyIOS="none" style={[s.dialogue,bodyStyle]}
    onTextLayout={event=>{
     const next=event.nativeEvent.lines;
     setLines(previous=>next.length===previous.length&&next.every((line,i)=>line.text===previous[i].text&&line.width===previous[i].width&&line.height===previous[i].height)?previous:next);
    }}>{chat.line}</Text>
  </View>
  {card&&<Pressable accessible accessibilityRole={canAdvance?'button':'text'} accessibilityLabel={chat.speaker+'. '+body.replace(/\n/g,' ')}
    accessibilityHint={canAdvance?'Continue conversation':undefined} onPress={advance}
    style={{position:'absolute',left:card.x,top:card.y,width:card.width,height:card.height,paddingHorizontal:m.padX,paddingVertical:m.padY}}>
   <BubblePaint path={conversationBubblePath(card)} width={card.width} height={card.height}/>
   <View style={{height:m.headerHeight}}>
    <View style={s.heading}>
     <Text allowFontScaling={false} style={[s.name,{fontSize:m.font*.95}]}>{chat.speaker.toUpperCase()}</Text>
     {chat.speaker==='Patch'&&<Text allowFontScaling={false} style={[s.designation,{fontSize:m.font*.74}]}>P-04</Text>}
     {canAdvance&&<Text allowFontScaling={false} style={[s.continue,{fontSize:m.font*.83}]}>▸</Text>}
    </View>
    <View style={s.rule}/>
   </View>
   <Animated.Text allowFontScaling={false} textBreakStrategy="simple" lineBreakStrategyIOS="none" style={[s.dialogue,bodyStyle,{opacity}]}>{body}</Animated.Text>
  </Pressable>}
 </>;
}

const s=StyleSheet.create({
 measure:{position:'absolute',top:0,left:0,opacity:0},
 surface:{position:'absolute',top:1,bottom:1,left:1,right:1,borderRadius:7,overflow:'hidden'},
 texture:{width:'100%',height:'100%',opacity:.29},
 heading:{flexDirection:'row',alignItems:'baseline',gap:9},
 name:{fontFamily:'FieldKitBarlow',color:'#efa145',letterSpacing:1.1,includeFontPadding:false},
 designation:{fontFamily:'FieldKitBarlow',color:'#c9bba1',letterSpacing:1,includeFontPadding:false},
 continue:{marginLeft:'auto',color:'#e2b980',includeFontPadding:false},
 rule:{height:StyleSheet.hairlineWidth,backgroundColor:'#bd97745e',marginTop:2},
 dialogue:{fontWeight:'600',color:'#faeed6',includeFontPadding:false},
});

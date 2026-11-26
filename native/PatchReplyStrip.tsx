import React,{useLayoutEffect,useRef} from 'react';
import {Image,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {
 isPatchCommand,patchReplyStripLayout,patchReplySizing,primaryPatchReply,type PatchReplyStripProps,
} from '../src/patch-reply-strip-layout';
import {usePatchReplyEdges} from '../src/use-patch-reply-edges';

const pine=require('../public/survival/patch-ui-v1/reply-pine.webp');
const amber=require('../public/survival/patch-ui-v1/reply-amber.webp');
const wrench=require('../public/survival/patch-ui-v1/wrench.png');
const follow=require('../public/survival/patch-ui-v1/follow.png');
const close=require('../public/survival/patch-ui-v1/reply-close.webp');

export function PatchReplyStrip({width,height,safe,choices,choiceSetKey,speaker,command,onChoose,onClose}:PatchReplyStripProps){
 const list=useRef<React.ComponentRef<typeof ScrollView>>(null);
 const touch=useRef({x:0,y:0,dragged:false});
 const scroll=useRef({offset:0,content:0});
 const {left,right,measure}=usePatchReplyEdges();
 const {bounds,row,paintHeight,labelHeight,gap,closeWidth,closeSize,listWidth,fontSize}=patchReplyStripLayout(width,height,safe);
 const lineHeight=Math.round(fontSize*1.16);
 const maxScale=Math.min(1.65,(row-8)/lineHeight);
 const {minimum,padding,grow}=patchReplySizing(listWidth,gap,choices.length,fontSize);
 const shadeTop=bounds.y-28,shadeHeight=height-shadeTop;
 useLayoutEffect(()=>{
  scroll.current.offset=0;
  list.current?.scrollTo({x:0,animated:false});
 },[choiceSetKey]);
 return <>
  <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants"
   style={[s.shade,{top:shadeTop,width,height:shadeHeight}]}/>
  <View style={[s.absolute,{left:bounds.x,top:bounds.y,width:bounds.width,height:bounds.height}]}>
   <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[s.heading,{height:labelHeight,opacity:choices.length?1:0}]}>
    <Text maxFontSizeMultiplier={1.25} style={s.headingText}>YOUR REPLY</Text><View style={s.rule}/>
   </View>
   <View style={[s.row,{height:row,gap}]}>
    <ScrollView ref={list} horizontal directionalLockEnabled alwaysBounceHorizontal={false} bounces={false}
     showsHorizontalScrollIndicator={false} scrollsToTop={false} canCancelContentTouches
     accessibilityLabel={speaker+' response choices'} style={s.list} contentContainerStyle={{gap,flexGrow:1}}
     scrollEventThrottle={32}
     onContentSizeChange={content=>{
      scroll.current.content=content;
      measure(scroll.current.offset,listWidth,content);
     }}
     onLayout={e=>measure(scroll.current.offset,e.nativeEvent.layout.width,scroll.current.content)}
     onScroll={e=>{
      const {contentOffset,layoutMeasurement,contentSize}=e.nativeEvent;
      scroll.current.offset=contentOffset.x;
      measure(contentOffset.x,layoutMeasurement.width,contentSize.width);
     }}
     onTouchStart={e=>{touch.current={x:e.nativeEvent.pageX,y:e.nativeEvent.pageY,dragged:false}}}
     onTouchMove={e=>{
      if(Math.hypot(e.nativeEvent.pageX-touch.current.x,e.nativeEvent.pageY-touch.current.y)>7)touch.current.dragged=true;
     }}
     onTouchCancel={()=>{touch.current.dragged=true}}
     onScrollBeginDrag={()=>{touch.current.dragged=true}}>
     {choices.map(choice=>{
      const primary=primaryPatchReply(choice.id),selected=isPatchCommand(choice.id)&&command===choice.id;
      return <Pressable key={choice.id} accessibilityRole="button" accessibilityLabel={choice.label}
       accessibilityState={isPatchCommand(choice.id)?{selected}:undefined}
       onPress={event=>{
        // Screen-reader activation has no touch sequence.
        if(!touch.current.dragged||event.nativeEvent.pageX===undefined)onChoose(choice.id);
       }}
       style={({pressed})=>[s.choice,{minWidth:minimum,height:row,paddingHorizontal:padding,flexGrow:grow},pressed&&s.pressed]}>
       <Image source={primary?amber:pine} resizeMode="stretch" accessible={false} style={[s.frame,{top:(row-paintHeight)/2,height:paintHeight}]}/>
       {primary&&<Image source={choice.id==='diagnose'?wrench:follow} resizeMode="contain" accessible={false}
        style={{width:fontSize*1.25,height:fontSize*1.25,tintColor:'#f9e0b2'}}/>}
       <Text numberOfLines={1} maxFontSizeMultiplier={maxScale} style={[s.choiceText,{fontSize,lineHeight}]}>{choice.label}</Text>
       {selected&&<Text accessible={false} style={s.selected}>✓</Text>}
      </Pressable>;
     })}
    </ScrollView>
    {left&&<View pointerEvents="none" accessible={false} style={[s.edge,s.leftEdge]}/>}
    {right&&<View pointerEvents="none" accessible={false} style={[s.edge,s.rightEdge,{right:closeWidth+gap}]}/>}
    <Pressable accessibilityRole="button" accessibilityLabel="Close conversation" onPress={onClose}
     style={({pressed})=>[s.close,{width:closeWidth,height:row},pressed&&s.pressed]}>
     <Image source={close} accessible={false} style={{width:closeSize,height:closeSize}}/>
    </Pressable>
   </View>
  </View>
 </>;
}

const s=StyleSheet.create({
 absolute:{position:'absolute'},
 shade:{position:'absolute',left:0,backgroundImage:'linear-gradient(to bottom, #0c100c00 0%, #0c100c70 37%, #0c100cde 100%)'},
 heading:{flexDirection:'row',alignItems:'center',gap:10},
 headingText:{fontSize:10,lineHeight:13,fontWeight:'700',letterSpacing:1.7,color:'#e9d6ae'},
 rule:{height:StyleSheet.hairlineWidth,backgroundColor:'#b89c6988',flex:1},
 row:{flexDirection:'row',alignItems:'stretch'},
 list:{flex:1,minWidth:0},
 edge:{position:'absolute',top:0,bottom:0,width:18},
 leftEdge:{left:0,backgroundImage:'linear-gradient(to right, #171c16c7, #171c1600)'},
 rightEdge:{backgroundImage:'linear-gradient(to left, #171c16c7, #171c1600)'},
 choice:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,flexShrink:0},
 frame:{position:'absolute',left:0,width:'100%'},
 choiceText:{color:'#fff2d9',fontWeight:'600',textAlign:'center',flexShrink:0,includeFontPadding:false,
  textShadowColor:'#16120db0',textShadowOffset:{width:0,height:1},textShadowRadius:2},
 selected:{color:'#efba69',fontWeight:'bold'},
 pressed:{opacity:.78},
 close:{alignItems:'center',justifyContent:'center',flexShrink:0},
});

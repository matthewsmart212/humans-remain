import React from 'react';
import {View,Text,StyleSheet} from 'react-native';
import {Canvas,Path} from '@shopify/react-native-skia';
import type {CampThreat} from '../src/camp-hud';
import {CaptionFade} from './FieldKitTargetCaption';

export default function CampThreatBanner({threat,width,height,left,right,top,toolbarWidth,vitalsExpanded}:{threat:CampThreat;width:number;height:number;left:number;right:number;top:number;toolbarWidth:number;vitalsExpanded:boolean}){
 const portrait=height>=width,gap=width-left-right-toolbarWidth-(vitalsExpanded?278:232)-24,inRow=!portrait&&gap>=160;
 const panelWidth=Math.min(inRow?gap:width-left-right,Math.max(148,Math.min(240,threat.title.length*6.3+26))),panelHeight=27;
 const x=inRow?left+(vitalsExpanded?278:232)+12+(gap-panelWidth)/2:(width-panelWidth)/2;
 const y=top+(inRow?7:portrait?(vitalsExpanded?210:98):vitalsExpanded?100:51);
 const accent=threat.approaching?'#eabb65':threat.critical?'#ff8c6d':'#ef775c';
 const accessibilityLabel=threat.title+(threat.detail&&!threat.title.includes(threat.detail)?'. '+threat.detail:'');
 return <View pointerEvents="none" accessible accessibilityRole="alert" accessibilityLabel={accessibilityLabel} style={[s.panel,{left:x,top:y,width:panelWidth,height:panelHeight}]}>
  <CaptionFade width={panelWidth} height={panelHeight}/>
  <Canvas pointerEvents="none" style={s.icon}><Path path="M8 1L15 14H1Z" color={accent} strokeJoin="round"/><Path path="M8 5V8.5M8 11V11.4" color="#142724" style="stroke" strokeWidth={1.7} strokeCap="round"/></Canvas>
  <Text numberOfLines={1} style={s.title}>{threat.title}</Text>
  <View pointerEvents="none" style={[s.underline,{backgroundColor:accent}]}/>
 </View>;
}
const s=StyleSheet.create({panel:{position:'absolute',zIndex:4,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},icon:{width:16,height:16,flexShrink:0},title:{fontFamily:'FieldKitBarlow',fontSize:14,lineHeight:18,color:'#f4e6c7',flexShrink:1,textShadowColor:'#061a18',textShadowRadius:2,textShadowOffset:{width:0,height:1}},underline:{position:'absolute',bottom:0,left:'30%',width:'40%',height:1.5,opacity:.8}});

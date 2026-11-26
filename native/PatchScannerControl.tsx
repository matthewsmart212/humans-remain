import React,{useEffect} from 'react';
import Animated,{FadeIn,FadeOut} from 'react-native-reanimated';
import {AccessibilityInfo,Image,Platform,Pressable,StyleSheet,Text,View} from 'react-native';

type Props={right:number;bottom:number;hint?:string;onScan:()=>void};
const arrive=FadeIn.duration(140),depart=FadeOut.duration(140);
const art=require('../public/survival/patch-ui-v1/scanner-control.webp');

export default function PatchScannerControl({right,bottom,hint,onScan}:Props){
 useEffect(()=>{if(hint&&Platform.OS==='ios')AccessibilityInfo.announceForAccessibility(hint)},[hint]);
 return <View pointerEvents="box-none" style={[s.control,{right,bottom}]}>
  {hint&&<Animated.View entering={arrive} exiting={depart} pointerEvents="none" style={s.readout}><Text accessibilityLiveRegion="polite" style={s.hint}>{hint}</Text></Animated.View>}
  <Pressable accessibilityRole="button" accessibilityLabel="Pulse field scanner" onPress={onScan}
   style={({pressed})=>[s.button,pressed&&s.pressed]}>
   <Image accessible={false} source={art} style={s.image}/>
   <Text accessible={false} allowFontScaling={false} style={s.label}>SCAN</Text>
  </Pressable>
 </View>;
}

const s=StyleSheet.create({
 control:{position:'absolute',flexDirection:'row',alignItems:'center',gap:8},
 readout:{maxWidth:204,paddingHorizontal:10,paddingVertical:6,backgroundColor:'#1e3029ed',borderWidth:1,borderColor:'#a88956',borderRadius:5},
 hint:{fontWeight:'600',fontSize:13,lineHeight:16,color:'#ffefd1'},
 button:{width:58,height:58,alignItems:'center',justifyContent:'flex-end',paddingBottom:12},
 image:{position:'absolute',width:58,height:58,top:0,left:0},
 label:{fontWeight:'800',fontSize:10,lineHeight:12,letterSpacing:.45,color:'#ffedc6',textShadowColor:'#211b0e',textShadowOffset:{width:0,height:1},textShadowRadius:2},
 pressed:{opacity:.84},
});

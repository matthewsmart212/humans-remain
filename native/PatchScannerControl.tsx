import React,{useEffect} from 'react';
import {AccessibilityInfo,Image,Platform,Pressable,StyleSheet,Text,View} from 'react-native';

type Props={right:number;bottom:number;hint?:string;onScan:()=>void};
const art=require('../public/survival/patch-ui-v1/scanner-control.webp');

export default function PatchScannerControl({right,bottom,hint,onScan}:Props){
 useEffect(()=>{if(hint&&Platform.OS==='ios')AccessibilityInfo.announceForAccessibility(hint)},[hint]);
 return <View pointerEvents="box-none" style={[s.control,{right,bottom}]}>
  <Pressable accessibilityRole="button" accessibilityLabel="Pulse field scanner" accessibilityHint={hint} onPress={onScan}
   style={({pressed})=>[s.button,pressed&&s.pressed]}>
   <Image accessible={false} source={art} style={s.image}/>
   <Text accessible={false} allowFontScaling={false} style={s.label}>SCAN</Text>
  </Pressable>
 </View>;
}

const s=StyleSheet.create({
 control:{position:'absolute',flexDirection:'row',alignItems:'center',gap:8},
 button:{width:58,height:58,alignItems:'center',justifyContent:'flex-end',paddingBottom:12},
 image:{position:'absolute',width:58,height:58,top:0,left:0},
 label:{fontWeight:'800',fontSize:10,lineHeight:12,letterSpacing:.45,color:'#ffedc6',textShadowColor:'#211b0e',textShadowOffset:{width:0,height:1},textShadowRadius:2},
 pressed:{opacity:.84},
});

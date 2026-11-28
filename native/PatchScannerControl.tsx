import React,{useEffect} from 'react';
import {AccessibilityInfo,Platform,StyleSheet,View} from 'react-native';

type Props={right:number;bottom:number;hint?:string};

export default function PatchScannerControl({right,bottom,hint}:Props){
 useEffect(()=>{if(hint&&Platform.OS==='ios')AccessibilityInfo.announceForAccessibility(hint)},[hint]);
 return <View pointerEvents="none" accessible={!!hint} accessibilityRole="text" accessibilityLabel={hint} accessibilityLiveRegion="polite" style={[s.control,{right,bottom}]}/>;
}

const s=StyleSheet.create({
 control:{position:'absolute',width:1,height:1,overflow:'hidden'},
});

import React,{useEffect} from 'react';
import {AccessibilityInfo,Platform,Pressable,StyleSheet,Text,View} from 'react-native';
import {Canvas,Circle,Group,Path} from '@shopify/react-native-skia';

type Props={right:number;bottom:number;hint?:string;powered:boolean;onToggle?:()=>void};

export function ScannerPowerGlyph({powered,size=36}:{powered:boolean;size?:number}){
 return <View pointerEvents="none" style={{width:size,height:size}}><Canvas style={{width:size,height:size}}><Group transform={[{scale:size/36}]}>
  <Circle cx={18} cy={18} r={16} color={powered?'#245c6b66':'#17373766'}/>
  <Path path="M10.2 10.2a11 11 0 1 0 15.6 0M18 4.5V17" color={powered?'#a0edff':'#a7b8b7'} style="stroke" strokeWidth={2.3} strokeCap="round"/>
 </Group></Canvas></View>;
}

export default function PatchScannerControl({right,bottom,hint,powered,onToggle}:Props){
 useEffect(()=>{if(hint&&Platform.OS==='ios')AccessibilityInfo.announceForAccessibility(hint)},[hint]);
 return <View pointerEvents="box-none" style={[s.control,{right,bottom}]}>
  <View pointerEvents="none" accessible={!!hint} accessibilityRole="text" accessibilityLabel={hint} accessibilityLiveRegion="polite" style={s.hint}/>
  {onToggle&&<Pressable accessibilityRole="button" accessibilityLabel={powered?'Turn scanner off':'Turn scanner on'} accessibilityState={{selected:powered}} onPress={onToggle} style={({pressed})=>[s.power,powered&&s.on,pressed&&s.pressed]}>
   <ScannerPowerGlyph powered={powered} size={25}/><Text accessible={false} style={[s.label,powered&&s.onLabel]}>{powered?'ON':'OFF'}</Text>
  </Pressable>}
 </View>;
}

const s=StyleSheet.create({
 control:{position:'absolute'},
 hint:{position:'absolute',width:1,height:1,overflow:'hidden'},
 power:{width:44,height:48,borderWidth:1,borderColor:'#71847c',borderRadius:11,backgroundColor:'#143334ed',alignItems:'center',justifyContent:'center',gap:1},
 on:{borderColor:'#65b5c6',backgroundColor:'#163e45f2'},
 label:{color:'#a7b8b7',fontFamily:'FieldKitBarlow',fontSize:9,lineHeight:10,letterSpacing:.6},
 onLabel:{color:'#a0edff'},
 pressed:{opacity:.72},
});

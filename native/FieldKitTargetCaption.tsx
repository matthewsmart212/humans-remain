import React,{useState} from 'react';
import {View,Text,Image,StyleSheet,type StyleProp,type ViewStyle} from 'react-native';
import {Canvas,Group,Rect,Path,RadialGradient} from '@shopify/react-native-skia';
import type {FieldKitTarget} from '../src/field-kit-target';
import {targetCaption} from '../src/target-caption';

const materialArt:Record<string,number>={
 pallets:require('../public/survival/ui-field-kit-v1/logs.png'),
 stone:require('../public/survival/world-rocks-v1/river-stone-trio.webp'),
 scrap:require('../public/survival/ui-backpack-v1/scrap.png'),
 ironIngot:require('../public/survival/ironworks-v1/iron-ingot.png'),
};
const hammer=require('../public/survival/equipment/repair-hammer-v1.webp');
/** One small feathered shader; no blur, framed backdrop or input surface. */
export function CaptionFade({width,height}:{width:number;height:number}){
 const w=width+24,h=height+16;
 return <Canvas pointerEvents="none" style={{position:'absolute',left:-12,top:-8,width:w,height:h}}><Group transform={[{scaleY:h/w}]}><Rect x={0} y={0} width={w} height={w}><RadialGradient c={{x:w/2,y:w/2}} r={w/2} colors={['#071d18df','#071d18b8','#071d1800']} positions={[0,.5,1]}/></Rect></Group></Canvas>;
}
function Shield(){return <Canvas pointerEvents="none" style={{width:12,height:14}}><Path path="M6 1L11 3V7C11 10 8 12 6 13C4 12 1 10 1 7V3Z" color="#e6bc72" style="stroke" strokeWidth={1.4} strokeJoin="round"/></Canvas>}
export default function FieldKitTargetCaption({target,width,style}:{target:FieldKitTarget;width:number;style?:StyleProp<ViewStyle>}){
 const c=targetCaption(target),hasProgress=!c.repair&&target.progress!==undefined,height=hasProgress?46:42;
 const [contentSize,setContentSize]=useState({width:Math.min(width,160),height:38});
 return <View pointerEvents="none" accessible accessibilityLabel={c.accessibilityLabel} style={[s.caption,style,{width,height}]}>
  <View style={[s.content,{maxWidth:width}]} onLayout={e=>{const {width:w,height:h}=e.nativeEvent.layout;setContentSize(old=>Math.abs(old.width-w)<.5&&Math.abs(old.height-h)<.5?old:{width:w,height:h})}}>
  <CaptionFade width={contentSize.width} height={contentSize.height}/>
  <View style={s.heading}><Text numberOfLines={1} style={s.name}>{c.label}</Text>{!!c.status&&<><Text style={s.separator}>·</Text><Text numberOfLines={1} style={[s.status,target.repairState==='falling'&&s.falling]}>{c.status}</Text>{c.shield&&<Shield/>}</>}{c.progress!==undefined&&<Text style={[s.percent,target.repairState==='falling'&&s.falling]}>{c.progress}%</Text>}</View>
  {c.repair?<View style={s.detailRow}>
   {!!c.hint&&<View style={s.hint}>{c.hintKind==='equipment'&&<Image source={hammer} resizeMode="contain" style={s.hammer}/>}<Text numberOfLines={1} style={[s.detail,c.hintKind==='shortage'&&s.missing]}>{c.hint}</Text></View>}
   <View style={s.materials}>{c.materials.map(row=><View key={row.id} accessibilityLabel={`${row.needed} ${row.name.toLowerCase()} required; ${row.have} available`} style={s.material}><Image source={materialArt[row.id]} resizeMode="contain" style={s.resource}/><Text style={[s.count,!row.available&&s.missing]}>{row.needed}</Text>{!c.hint&&<Text style={[s.check,!row.available&&s.missing]}>{row.available?'✓':'!'}</Text>}</View>)}</View>
  </View>:<>{!!c.detail&&<Text numberOfLines={1} style={[s.detail,target.blocked&&s.missing]}>{c.detail}</Text>}{hasProgress&&<View accessible accessibilityRole="progressbar" accessibilityLabel={target.progressLabel} accessibilityValue={{min:0,max:100,now:Math.round(Math.max(0,Math.min(1,target.progress!))*100)}} style={s.progress}><View style={[s.progressFill,{width:`${Math.max(0,Math.min(1,target.progress!))*100}%`}]}/></View>}</>}
  </View>
 </View>;
}
const s=StyleSheet.create({
 caption:{position:'absolute',alignItems:'flex-end',justifyContent:'center'},content:{alignSelf:'flex-end',alignItems:'flex-end',gap:3},
 heading:{maxWidth:'100%',flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:4},
 name:{fontFamily:'FieldKitBarlow',fontSize:14,lineHeight:18,color:'#fff0d2',flexShrink:1,textShadowColor:'#051c18',textShadowRadius:2,textShadowOffset:{width:0,height:1}},
 status:{fontFamily:'FieldKitBarlow',fontSize:13,lineHeight:18,color:'#e3c188'},separator:{fontFamily:'FieldKitBarlow',fontSize:12,lineHeight:18,color:'#cbbd93'},
 percent:{fontFamily:'FieldKitBarlow',fontSize:15,lineHeight:18,color:'#ffd37d',fontVariant:['tabular-nums']},falling:{color:'#c8aa7b'},
 detailRow:{maxWidth:'100%',height:20,flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:7},
 hint:{flexDirection:'row',alignItems:'center',gap:3,flexShrink:1,minWidth:0},detail:{fontFamily:'FieldKitBarlow',fontSize:12,lineHeight:17,color:'#eadab5',textAlign:'right',flexShrink:1},hammer:{width:17,height:19},
 materials:{flexDirection:'row',alignItems:'center',gap:9,flexShrink:0},material:{flexDirection:'row',alignItems:'center',gap:3},resource:{width:20,height:20},count:{fontFamily:'FieldKitBarlow',fontSize:14,lineHeight:18,color:'#f4e6c7',fontVariant:['tabular-nums']},check:{fontFamily:'FieldKitBarlow',fontSize:13,lineHeight:17,color:'#a9ce7f'},missing:{color:'#ffb395'},
 progress:{width:100,height:3,marginTop:1,backgroundColor:'#061c19a8'},progressFill:{height:3,backgroundColor:'#d6bc80'},
});

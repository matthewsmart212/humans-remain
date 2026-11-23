import React from 'react';
import {View,Text,Pressable,StyleSheet,type StyleProp,type ViewStyle} from 'react-native';
import type {FishingHud} from '../src/fishing-types';
import {FISHING_ART} from '../src/fishing-art';
import {actionImageGlyph} from './FieldItemArt';

type Props={hud:FishingHud;disabled?:boolean;compact?:boolean;style?:StyleProp<ViewStyle>;onCatch:(keep:boolean)=>void};
export default function FishingHUD({hud,disabled=false,compact=false,style,onCatch}:Props){
 const tension=Math.max(0,Math.min(1,hud.tension)),charge=Math.max(0,Math.min(1,hud.charge)),fighting=hud.phase==='reeling',aiming=hud.phase==='aiming',danger=fighting&&tension>=.78;
 const caught=hud.catch;
 return <View style={[s.frame,compact&&s.compact,hud.phase==='bite'&&s.bite,style]}>
  <View pointerEvents="none" style={s.innerRim}/><View pointerEvents="none" style={[s.rivet,{left:5,top:5}]}/><View pointerEvents="none" style={[s.rivet,{right:5,bottom:5}]}/>
  {caught?<>
   <View style={s.heading}><Text style={s.eyebrow}>YOUR CATCH</Text>{caught.isRecord&&<Text style={s.record}>NEW BEST</Text>}</View>
   <View style={[s.catchFish,compact&&{marginVertical:1}]}><View pointerEvents="none" style={{height:compact?64:78,justifyContent:'center'}}>{actionImageGlyph(caught.image||FISHING_ART.rawFish,compact?96:110)}</View><View style={{flex:1,minWidth:0}}><Text style={s.fishName}>{caught.species.toUpperCase()}</Text><View style={s.weightRow}><Text style={[s.weight,s.weightValue]}>{caught.kg.toFixed(2)}</Text><Text style={s.weight}>kg</Text></View></View></View>
   <Text accessibilityLiveRegion="polite" style={s.catchNote}>{hud.canKeep?'A fresh catch for the campfire.':'Your bag is full. Release this fish, or make room in your bag.'}</Text>
   <View style={s.catchActions}>{([true,false] as const).map(keep=><Pressable key={String(keep)} accessibilityRole="button" accessibilityLabel={keep?'Keep perch in your bag':'Release perch into the lake'} disabled={disabled||keep&&!hud.canKeep} onPress={()=>onCatch(keep)} style={({pressed})=>[s.catchButton,!keep&&s.releaseButton,(disabled||keep&&!hud.canKeep)&&s.disabled,pressed&&s.pressed]}><Text style={s.buttonLabel}>{keep?'KEEP':'RELEASE'}</Text></Pressable>)}</View>
   {!hud.canKeep&&<Text style={s.bagFull}>BAG FULL · CATCH HELD SAFELY</Text>}
  </>:<>
   <View style={s.heading}><Text style={[s.eyebrow,danger&&s.dangerText,hud.phase==='bite'&&s.biteText]}>{hud.phase==='bite'?'BITE!':fighting?'LINE TENSION':aiming?'CAST DISTANCE':hud.phase==='landing'?'BRINGING IT IN':'LAKE FISHING'}</Text><View accessible accessibilityLabel={`${hud.bait} bait remaining`} style={s.bait}>{actionImageGlyph(FISHING_ART.worms,24)}<Text style={s.baitCount}>{hud.bait}</Text><Text style={s.baitLabel}>BAIT</Text></View></View>
   {(fighting||aiming)&&<View accessibilityRole="progressbar" accessibilityLabel={aiming?'Cast distance':'Line tension'} accessibilityValue={{min:0,max:100,now:Math.round((aiming?charge:tension)*100),text:aiming?`${Math.round(charge*100)} percent distance`:danger?'High tension. Ease off':tension<.18?'Slack line. Reel in':'Steady tension'}} style={s.meter}>
    <View style={s.track}>{fighting&&<View style={s.dangerZone}/>}<View style={[s.fill,{width:`${(aiming?charge:tension)*100}%`,backgroundColor:aiming?'#c9ad70':danger?'#d18353':'#8dbf92'}]}/>{fighting&&<View style={s.dangerMark}/>}</View>
    <View style={s.meterEnds}><Text style={s.meterCaption}>{aiming?'NEAR':'SLACK'}</Text><Text style={s.meterCaption}>{aiming?'FAR':'SNAP'}</Text></View>
   </View>}
   <Text accessibilityLiveRegion="polite" style={s.hint}>{hud.hint}</Text>
   {!hud.active&&<View style={s.footer}><Text style={s.best}>{hud.bestKg>0?`BEST ${hud.bestKg.toFixed(2)} kg`:'PERCH WATERS'}</Text></View>}
  </>}
 </View>;
}

const font='FieldKitBarlow';
const s=StyleSheet.create({
 frame:{position:'absolute',paddingHorizontal:14,paddingVertical:11,borderWidth:1,borderColor:'#b5915c',borderTopLeftRadius:13,borderBottomRightRadius:13,borderTopRightRadius:5,borderBottomLeftRadius:5,backgroundColor:'#0c302ef5',shadowColor:'#000',shadowOpacity:.3,shadowRadius:6,shadowOffset:{width:0,height:4}},
 compact:{paddingHorizontal:11,paddingVertical:9},innerRim:{position:'absolute',left:2,right:2,top:2,bottom:2,borderWidth:1,borderColor:'#8c724c66',borderTopLeftRadius:10,borderBottomRightRadius:10,borderTopRightRadius:3,borderBottomLeftRadius:3},rivet:{position:'absolute',width:5,height:5,borderRadius:3,borderWidth:1,borderColor:'#543923',backgroundColor:'#c29f68'},
 heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},eyebrow:{fontFamily:font,fontSize:12,lineHeight:20,letterSpacing:.9,color:'#ead7ac'},bait:{flexDirection:'row',gap:3,alignItems:'center'},baitCount:{fontFamily:font,fontSize:14,color:'#e6d6ad'},baitLabel:{fontFamily:font,fontSize:9,color:'#afbea8',letterSpacing:.4,marginLeft:2},
 hint:{fontFamily:font,fontSize:14,lineHeight:18,color:'#e0dcc5',marginTop:6},meter:{marginTop:8},track:{height:9,backgroundColor:'#173b34',borderRadius:5,borderWidth:1,borderColor:'#9b845c7f',overflow:'hidden'},fill:{height:'100%',borderTopWidth:1,borderTopColor:'#e0deb880',borderRadius:4},dangerZone:{position:'absolute',left:'78%',right:0,top:0,bottom:0,backgroundColor:'#63392f'},dangerMark:{position:'absolute',left:'78%',top:0,bottom:0,width:1,backgroundColor:'#dcc0809a'},meterEnds:{flexDirection:'row',justifyContent:'space-between',marginTop:2},meterCaption:{fontFamily:font,fontSize:9,color:'#adae96',letterSpacing:.6},dangerText:{color:'#ffc792'},bite:{borderColor:'#f3ce8b',shadowColor:'#d3a25e',shadowOpacity:.35},biteText:{color:'#ffe0a2',fontSize:16},
 footer:{flexDirection:'row',alignItems:'center',borderTopWidth:1,borderTopColor:'#b0915435',marginTop:9,paddingTop:8},best:{fontFamily:font,fontSize:10,color:'#adbaa6',letterSpacing:.5},
 record:{fontFamily:font,fontSize:9,letterSpacing:.5,color:'#18372f',backgroundColor:'#dcc18a',borderRadius:3,paddingHorizontal:5,paddingVertical:3},catchFish:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,marginVertical:5},fishName:{fontFamily:font,fontSize:22,color:'#f5e4bd',letterSpacing:.9},weightRow:{flexDirection:'row',gap:3,alignItems:'baseline'},weight:{fontFamily:font,fontSize:14,color:'#cfcdac',marginTop:1},weightValue:{fontSize:24,color:'#f5e4bd',fontVariant:['tabular-nums']},catchNote:{fontFamily:font,fontSize:13,lineHeight:17,color:'#cdd4bd',marginBottom:10},catchActions:{flexDirection:'row',gap:8},catchButton:{flex:1,minHeight:38,borderWidth:1,borderColor:'#c2a269',borderRadius:5,backgroundColor:'#245149',alignItems:'center',justifyContent:'center'},releaseButton:{backgroundColor:'#0b2828',borderColor:'#7f8062'},buttonLabel:{fontFamily:font,fontSize:13,color:'#f8e7bf',letterSpacing:.6},disabled:{opacity:.4},pressed:{opacity:.72},bagFull:{fontFamily:font,textAlign:'center',fontSize:9,color:'#e0b985',letterSpacing:.5,marginTop:7},
});

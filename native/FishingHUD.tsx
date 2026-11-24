import React from 'react';
import {View,Text,Pressable,StyleSheet,type StyleProp,type ViewStyle} from 'react-native';
import type {FishingHud} from '../src/fishing-types';
import {FISHING_ART} from '../src/fishing-art';
import {FISHING_SPECIES} from '../src/fishing-catalog';
import {fishingTensionLabel,fishingProgressLabel} from '../src/fishing-feedback';
import {FISHING_HUD_WIDTH,FISHING_CATCH_WIDTH,fishingCompactCopy,fishingCompactReward} from '../src/fishing-hud-presentation';
import {actionImageGlyph} from './FieldItemArt';

type Props={hud:FishingHud;disabled?:boolean;style?:StyleProp<ViewStyle>;onCatch:(keep:boolean)=>void};
export default function FishingHUD({hud,disabled=false,style,onCatch}:Props){
 const tension=Math.max(0,Math.min(1,hud.tension)),fighting=hud.phase==='reeling',aiming=hud.phase==='aiming';
 const caught=hud.catch,drone=caught?.species==='drone',progress=Math.round(Math.max(0,Math.min(1,hud.progress))*100);
 const copy=fishingCompactCopy(hud,'touch');
 return <View style={[s.frame,{width:caught?FISHING_CATCH_WIDTH:FISHING_HUD_WIDTH},hud.phase==='bite'&&s.bite,style]}>
  {caught?<>
   <View style={s.catchFish}>
    <View pointerEvents="none" style={s.catchArt}>{actionImageGlyph(caught.image||FISHING_ART.rawFish,44)}</View>
    <View style={s.catchSummary}><View style={s.catchHeading}><Text style={s.fishName}>{FISHING_SPECIES[caught.species].shortName.toUpperCase()}</Text>{caught.isRecord&&!drone&&<Text accessibilityLabel="Species best" style={s.record}>BEST</Text>}</View><Text style={s.weight}>{caught.kg.toFixed(2)} <Text style={s.weightUnit}>kg</Text></Text></View>
   </View>
   <Text accessibilityLabel={`${hud.rewardLabel}. ${(hud.rewardWeight??0).toFixed(2)} kg in bag`} style={s.reward}>{fishingCompactReward(hud)}</Text>
   {!hud.canKeep&&<Text accessibilityLiveRegion="polite" style={s.bagFull}>Bag full · catch held safely{'\n'}Open bag to make room</Text>}
   <View style={s.catchActions}>{([true,false] as const).map(keep=><Pressable key={String(keep)} accessibilityRole="button" accessibilityLabel={keep?(drone?'Salvage metal into your bag':`Keep ${caught.species} in your bag for cooking`):`Return ${drone?'drone':caught.species} to the lake`} accessibilityState={{disabled:disabled||keep&&!hud.canKeep}} disabled={disabled||keep&&!hud.canKeep} onPress={()=>onCatch(keep)} style={({pressed})=>[s.catchButton,!keep&&s.releaseButton,(disabled||keep&&!hud.canKeep)&&s.disabled,pressed&&s.pressed]}><Text style={s.buttonLabel}>{keep?(drone?'SALVAGE':'KEEP'):(drone?'RETURN':'RELEASE')}</Text></Pressable>)}</View>
  </>:<>
   <View accessible accessibilityLiveRegion={hud.phase==='bite'?'assertive':'polite'} accessibilityLabel={`${copy.accessibilityLabel}. ${hud.bait} bait remaining`}>
    <View style={s.heading}><Text style={[s.command,hud.tone==='warn'&&s.warningText,hud.tone==='danger'&&s.dangerText,hud.phase==='bite'&&s.biteText]}>{copy.command}</Text><View style={s.bait}>{actionImageGlyph(FISHING_ART.worms,18)}<Text style={s.baitCount}>{hud.bait}</Text></View></View>
    {!!copy.detail&&<Text style={[s.detail,aiming&&!hud.castValid&&s.dangerText]}>{aiming?(hud.castValid?'✓ ':'× '):''}{copy.detail}</Text>}
   </View>
   {fighting&&<>
    <View accessibilityRole="progressbar" accessibilityLabel="Line tension" accessibilityValue={{min:0,max:100,now:Math.round(tension*100),text:fishingTensionLabel(hud)}} style={s.meter}>
     <View style={s.meterLabels}><Text style={s.meterCaption}>LINE TENSION</Text><Text style={s.meterValue}>{fishingTensionLabel(hud)}</Text></View><View style={s.track}><View style={s.dangerZone}/><View style={[s.fill,{width:`${tension*100}%`,backgroundColor:hud.tone==='danger'?'#d18353':'#8dbf92'}]}/><View style={s.dangerMark}/></View>
    </View>
    <View style={s.progress} accessibilityRole="progressbar" accessibilityLabel="Catch brought to shore" accessibilityValue={{min:0,max:100,now:progress}}><View style={s.meterLabels}><Text style={s.meterCaption}>{fishingProgressLabel(hud)}</Text><Text style={s.meterValue}>{progress}%</Text></View><View style={s.progressTrack}><View style={[s.progressFill,{width:`${progress}%`}]}/></View></View>
   </>}
  </>}
 </View>;
}

const font='FieldKitBarlow';
const s=StyleSheet.create({
 frame:{position:'absolute',padding:8,borderWidth:1,borderColor:'#b5915c80',borderRadius:6,backgroundColor:'#0c302ed9',shadowColor:'#000',shadowOpacity:.18,shadowRadius:4,shadowOffset:{width:0,height:2}},
 heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6},command:{flexShrink:1,fontFamily:font,fontSize:16,lineHeight:19,letterSpacing:.2,color:'#fff0c8'},bait:{flexDirection:'row',gap:2,alignItems:'center',flexShrink:0},baitCount:{fontFamily:font,fontSize:12,lineHeight:18,color:'#e6d6ad',fontVariant:['tabular-nums']},
 detail:{fontFamily:font,fontSize:12,lineHeight:15,color:'#d9dfc9',marginTop:3},warningText:{color:'#ffda96'},dangerText:{color:'#ffc19f'},bite:{borderColor:'#f3ce8b'},biteText:{color:'#ffe6ac'},
 meter:{marginTop:6},meterLabels:{flexDirection:'row',justifyContent:'space-between',alignItems:'baseline',gap:5,marginBottom:2},meterCaption:{fontFamily:font,fontSize:10,lineHeight:12,color:'#c3cfba',letterSpacing:.2},meterValue:{fontFamily:font,fontSize:10,lineHeight:12,color:'#e6dbb4',letterSpacing:.2},track:{height:6,backgroundColor:'#173b34',borderRadius:3,borderWidth:1,borderColor:'#9b845c7f',overflow:'hidden'},fill:{height:'100%',borderRadius:2},dangerZone:{position:'absolute',left:'78%',right:0,top:0,bottom:0,backgroundColor:'#63392f'},dangerMark:{position:'absolute',left:'78%',top:0,bottom:0,width:1,backgroundColor:'#dcc0809a'},progress:{marginTop:4},progressTrack:{height:4,borderWidth:1,borderColor:'#b2945c40',borderRadius:2,overflow:'hidden',backgroundColor:'#071f20'},progressFill:{height:'100%',backgroundColor:'#d2b57a'},
 catchFish:{flexDirection:'row',alignItems:'center',gap:7},catchArt:{width:44,height:44,justifyContent:'center'},catchSummary:{flex:1,minWidth:0},catchHeading:{flexDirection:'row',alignItems:'center',gap:5},fishName:{flexShrink:1,fontFamily:font,fontSize:16,lineHeight:19,color:'#f5e4bd',letterSpacing:.3},record:{fontFamily:font,fontSize:9,lineHeight:12,letterSpacing:.2,color:'#e5d09e',backgroundColor:'#bfa36a26',borderRadius:2,paddingHorizontal:3,paddingVertical:1},weight:{fontFamily:font,fontSize:16,lineHeight:19,color:'#f5e4bd',fontVariant:['tabular-nums']},weightUnit:{fontSize:12,color:'#cfcdac'},reward:{fontFamily:font,fontSize:12,lineHeight:15,color:'#e2d9bc',marginTop:3,marginBottom:7},bagFull:{fontFamily:font,fontSize:12,lineHeight:15,color:'#e0b985',marginBottom:7},
 catchActions:{flexDirection:'row',gap:6},catchButton:{flex:1,minHeight:44,borderWidth:1,borderColor:'#b59a658c',borderRadius:4,backgroundColor:'#245149',alignItems:'center',justifyContent:'center'},releaseButton:{backgroundColor:'#0b2828',borderColor:'#7f806280'},buttonLabel:{fontFamily:font,fontSize:13,color:'#f8e7bf',letterSpacing:.5},disabled:{opacity:.4},pressed:{opacity:.72},
});

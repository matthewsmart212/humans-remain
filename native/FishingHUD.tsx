import React from 'react';
import {View,Text,Pressable,StyleSheet,type StyleProp,type ViewStyle} from 'react-native';
import type {FishingHud,FishingCatchReceipt} from '../src/fishing-types';
import {FISHING_ART} from '../src/fishing-art';
import {FISHING_SPECIES} from '../src/fishing-catalog';
import {fishingTensionLabel} from '../src/fishing-feedback';
import {fishingHudKind,fishingHudWidth,fishingAccessibleStatus,fishingReceiptPresentation,fishingLostLabel} from '../src/fishing-hud-presentation';
import {actionImageGlyph} from './FieldItemArt';

type Props={hud?:FishingHud;receipt?:FishingCatchReceipt;disabled?:boolean;style?:StyleProp<ViewStyle>;onCatch:(keep:boolean)=>void;onOpenBag:()=>void};
export default function FishingHUD({hud,receipt:shownReceipt,disabled=false,style,onCatch,onOpenBag}:Props){
 const receipt=shownReceipt??hud?.receipt,kind=fishingHudKind(hud,receipt);
 if(kind==='hidden')return null;
 const frame=[s.frame,{width:fishingHudWidth(kind)},style];
 if(kind==='full'&&hud?.catch){
  const caught=hud.catch,drone=caught.species==='drone';
  return <View style={frame}>
   <View accessible accessibilityLiveRegion="polite" accessibilityLabel={`${FISHING_SPECIES[caught.species].shortName}, ${caught.kg.toFixed(2)} kg. ${hud.rewardLabel}. ${(hud.rewardWeight??0).toFixed(2)} kg needed in your bag. Bag full. Catch held safely. Open your bag to make room, or release it.`}>
    <View style={s.catchRow}><View pointerEvents="none" style={s.art}>{actionImageGlyph(caught.image||FISHING_ART.rawFish,28)}</View><View style={s.summary}><Text style={s.title}>{FISHING_SPECIES[caught.species].shortName}</Text><Text style={s.detail}>{caught.kg.toFixed(2)} kg</Text></View></View>
    <Text style={s.fullLabel}>Bag full · catch held</Text>
   </View>
   <View style={s.actions}>
    <Pressable accessibilityRole="button" accessibilityLabel="Open bag to make room for your catch" accessibilityState={{disabled}} disabled={disabled} onPress={onOpenBag} style={({pressed})=>[s.button,disabled&&s.disabled,pressed&&s.pressed]}><Text style={s.buttonLabel}>BAG</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`${drone?'Return drone':'Release '+caught.species} to the lake`} accessibilityState={{disabled}} disabled={disabled} onPress={()=>onCatch(false)} style={({pressed})=>[s.button,s.release,disabled&&s.disabled,pressed&&s.pressed]}><Text style={s.buttonLabel}>{drone?'RETURN':'RELEASE'}</Text></Pressable>
   </View>
  </View>;
 }
 if(kind==='receipt'&&receipt){
  const message=fishingReceiptPresentation(receipt);
  return <View key={receipt.id} pointerEvents="none" accessible accessibilityLiveRegion="polite" accessibilityLabel={message.accessibilityLabel} style={[...frame,s.catchRow,{opacity:message.opacity}]}>
   <View style={s.art}>{actionImageGlyph(receipt.catch.image||FISHING_ART.rawFish,28)}</View><View style={s.summary}><Text style={s.title}>{message.title}</Text><Text style={s.detail}>{message.detail}</Text></View><Text accessible={false} style={s.check}>✓</Text>
  </View>;
 }
 if(!hud)return null;
 const status=fishingAccessibleStatus(hud,'touch');
 if(kind==='lost')return <View pointerEvents="none" accessible accessibilityLabel={status} accessibilityLiveRegion="polite" style={[...frame,s.lost]}><Text accessible={false} style={s.lostMark}>×</Text><Text style={[s.title,s.lostTitle]}>{fishingLostLabel(hud)}</Text></View>;
 if(kind==='fight'){
  const tension=Math.max(0,Math.min(1,hud.tension)),progress=Math.round(Math.max(0,Math.min(1,hud.progress))*100),danger=tension>.78,warning=hud.fightBehavior==='warning'||hud.fightBehavior==='surge';
  return <View pointerEvents="none" style={[...frame,(danger||warning)&&s.strain]}>
   <View accessible accessibilityLiveRegion="polite" accessibilityLabel={status} style={s.accessibleStatus}/>
   <View accessible accessibilityRole="progressbar" accessibilityLabel="Line tension" accessibilityValue={{min:0,max:100,now:Math.round(tension*100),text:fishingTensionLabel(hud)}}>
    <View style={s.meterHeading}><Text style={s.caption}>TENSION</Text>{(danger||warning)&&<Text accessible={false} style={s.warningMark}>!</Text>}</View>
    <View style={s.track}><View style={s.dangerZone}/><View style={[s.fill,{width:`${tension*100}%`,backgroundColor:danger?'#e29a69':'#9ac49c'}]}/><View style={s.dangerMark}/></View>
   </View>
   <View accessible style={s.progress} accessibilityRole="progressbar" accessibilityLabel="Catch brought to shore" accessibilityValue={{min:0,max:100,now:progress}}><Text style={s.caption}>TO SHORE</Text><View style={s.progressTrack}><View style={[s.progressFill,{width:`${progress}%`}]}/></View></View>
  </View>;
 }
 return <View pointerEvents="none" accessible accessibilityLiveRegion={hud.phase==='bite'?'assertive':'polite'} accessibilityLabel={`${status}. ${hud.bait} bait remaining`} style={[s.bait,{width:fishingHudWidth(kind)},style]}>{actionImageGlyph(FISHING_ART.worms,18)}<Text style={[s.baitCount,hud.bait===0&&s.empty]}>{hud.bait}</Text></View>;
}

const font='FieldKitBarlow';
const s=StyleSheet.create({
 frame:{position:'absolute',padding:7,borderWidth:1,borderColor:'#ad916b42',borderRadius:6,backgroundColor:'#0c302ed1'},
 bait:{position:'absolute',height:24,paddingHorizontal:3,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:2,borderRadius:12,backgroundColor:'#0c302e9e'},baitCount:{fontFamily:font,fontSize:12,lineHeight:16,color:'#f3e2b9',fontVariant:['tabular-nums']},empty:{color:'#f2b28c'},
 accessibleStatus:{position:'absolute',width:1,height:1},
 meterHeading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',height:13},caption:{fontFamily:font,fontSize:10,lineHeight:13,letterSpacing:.25,color:'#d0d9bf'},warningMark:{fontFamily:font,fontSize:12,lineHeight:13,color:'#f3c58b'},strain:{borderColor:'#dcaa738c'},
 track:{height:6,backgroundColor:'#173b34',borderRadius:3,borderWidth:1,borderColor:'#9b845c65',overflow:'hidden'},fill:{height:'100%',borderRadius:2},dangerZone:{position:'absolute',left:'78%',right:0,top:0,bottom:0,backgroundColor:'#824e36'},dangerMark:{position:'absolute',left:'78%',top:0,bottom:0,width:1,backgroundColor:'#f0d19b'},
 progress:{marginTop:5},progressTrack:{height:4,borderWidth:1,borderColor:'#b2945c40',borderRadius:2,overflow:'hidden',backgroundColor:'#071f20'},progressFill:{height:'100%',backgroundColor:'#d2b57a'},
 catchRow:{flexDirection:'row',alignItems:'center',gap:6},art:{width:28,height:28,justifyContent:'center'},summary:{flex:1,minWidth:0},title:{fontFamily:font,fontSize:13,lineHeight:16,color:'#f7e6bd'},detail:{fontFamily:font,fontSize:11,lineHeight:14,color:'#c8d4bc',fontVariant:['tabular-nums']},check:{fontSize:15,lineHeight:20,color:'#b6d8a0'},fullLabel:{fontFamily:font,fontSize:12,lineHeight:15,color:'#eac393',marginVertical:6},
 actions:{flexDirection:'row',gap:6},button:{flex:1,minHeight:44,borderWidth:1,borderColor:'#b59a6573',borderRadius:4,backgroundColor:'#245149',alignItems:'center',justifyContent:'center'},release:{backgroundColor:'#0b2828',borderColor:'#7f80626e'},buttonLabel:{fontFamily:font,fontSize:12,color:'#f8e7bf',letterSpacing:.4},disabled:{opacity:.4},pressed:{opacity:.72},
 lost:{flexDirection:'row',alignItems:'center',gap:5},lostMark:{fontSize:17,lineHeight:18,color:'#edba92'},lostTitle:{flexShrink:1,color:'#edc29d'},
});

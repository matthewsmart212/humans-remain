import React,{useEffect,useRef,useState} from 'react';
import {View,Text,Image,Pressable,Animated,AccessibilityInfo,StyleSheet,Easing} from 'react-native';
import {HORIZON,DIAL_GLOW,skyClockView,horizonPosition,DAY_WING,type SkyCycle,type SkyOrb} from '../src/sky-clock';
import {useSkyCycle,type SkyWorldRef} from '../src/use-sky-cycle';
const art={
 day:require('../public/survival/ui-survivor-dial-v2/day.png'),night:require('../public/survival/ui-survivor-dial-v2/night.png'),rim:require('../public/survival/ui-survivor-dial-v2/rim.png'),
 sun:require('../public/survival/ui-survivor-dial-v2/sun.png'),moon:require('../public/survival/ui-survivor-dial-v2/moon.png'),
 sunGlow:require('../public/survival/ui-survivor-dial-v2/sun-glow.png'),moonGlow:require('../public/survival/ui-survivor-dial-v2/moon-glow.png')
};
function Orb({orb,paused,reduced}:{orb:SkyOrb;paused:boolean;reduced:boolean}){
 const p=horizonPosition(orb),motion=useRef(new Animated.ValueXY(p)).current,opacity=useRef(new Animated.Value(orb.opacity)).current,pulse=useRef(new Animated.Value(.5)).current;
 useEffect(()=>{if(paused||reduced||orb.opacity===0){motion.stopAnimation();opacity.stopAnimation();motion.setValue(p);opacity.setValue(orb.opacity);return}const animation=Animated.parallel([Animated.timing(motion,{toValue:p,duration:40,easing:Easing.linear,useNativeDriver:true}),Animated.timing(opacity,{toValue:orb.opacity,duration:40,easing:Easing.linear,useNativeDriver:true})]);animation.start();return()=>animation.stop()},[p.x,p.y,orb.opacity,paused,reduced,motion,opacity]);
 useEffect(()=>{if(reduced){pulse.setValue(.5);return}if(paused)return;const breathe=Animated.loop(Animated.sequence([Animated.timing(pulse,{toValue:1,duration:DIAL_GLOW.pulseMs/2,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),Animated.timing(pulse,{toValue:0,duration:DIAL_GLOW.pulseMs/2,easing:Easing.inOut(Easing.sin),useNativeDriver:true})]),{iterations:-1,resetBeforeIteration:false});breathe.start();return()=>breathe.stop()},[paused,reduced,pulse]);
 return <Animated.View style={{position:'absolute',left:0,top:0,width:HORIZON.icon,height:HORIZON.icon,opacity,transform:motion.getTranslateTransform()}}>
  <Animated.Image source={orb.icon==='sun'?art.sunGlow:art.moonGlow} style={{position:'absolute',left:(HORIZON.icon-DIAL_GLOW.size)/2,top:(HORIZON.icon-DIAL_GLOW.size)/2,width:DIAL_GLOW.size,height:DIAL_GLOW.size,opacity:pulse.interpolate({inputRange:[0,1],outputRange:[.65,1]}),transform:[{scale:pulse.interpolate({inputRange:[0,1],outputRange:[.92,1.08]})}]}}/>
  <Image source={art[orb.icon]} resizeMode="contain" style={{width:HORIZON.icon,height:HORIZON.icon}}/>
 </Animated.View>;
}
export default function SkyClock({cycle:fallback,world,paused=false,width=HORIZON.width,onExpanded}:{cycle:SkyCycle;world?:SkyWorldRef;paused?:boolean;width?:number;onExpanded?:(open:boolean)=>void}){
 const cycle=useSkyCycle(fallback,world,paused);
 const [open,setOpen]=useState(false),[reduced,setReduced]=useState(true),view=skyClockView(cycle),night=useRef(new Animated.Value(view.nightMix)).current,wing=useRef(new Animated.Value(0)).current;
 useEffect(()=>{onExpanded?.(open)},[open,onExpanded]);
 useEffect(()=>()=>onExpanded?.(false),[onExpanded]);
 useEffect(()=>{let live=true;AccessibilityInfo.isReduceMotionEnabled().then(v=>{if(live)setReduced(v)});const sub=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduced);return()=>{live=false;sub.remove()}},[]);
 useEffect(()=>{if(reduced){wing.setValue(open?DAY_WING.width:0);return}const motion=Animated.timing(wing,{toValue:open?DAY_WING.width:0,duration:DAY_WING.duration,easing:Easing.out(Easing.cubic),useNativeDriver:false});motion.start();return()=>motion.stop()},[open,reduced,wing]);
 useEffect(()=>{if(paused||reduced){night.stopAnimation();night.setValue(view.nightMix);return}const fade=Animated.timing(night,{toValue:view.nightMix,duration:40,easing:Easing.linear,useNativeDriver:true});fade.start();return()=>fade.stop()},[view.nightMix,paused,reduced,night]);
 return <Animated.View pointerEvents="box-none" style={[s.root,{width:Animated.add(width,wing)}]}>
  <Pressable hitSlop={5} accessibilityRole="button" accessibilityLabel={`${view.label} ${open?'Collapse':'Expand'} day display`} accessibilityState={{expanded:open}} onPress={()=>setOpen(!open)} style={s.button}>
   <Animated.View pointerEvents="none" style={[s.wing,{right:width-3,width:wing}]}><View style={s.inlay}><Image source={require('../public/survival/ui-field-kit-v1/utility-panel.png')} style={s.inlayArt}/><Text style={s.dayLabel}>DAY</Text><Text style={s.dayValue}>{view.dayTag}</Text><View style={[s.rivet,{top:6}]}/><View style={[s.rivet,{bottom:6}]}/></View></Animated.View>
   <View pointerEvents="none" style={[s.art,{right:(width-HORIZON.width)/2,transform:[{scale:width/HORIZON.width}]}]}>
    <Image source={art.day} style={s.scene}/><Animated.Image source={art.night} style={[s.scene,{opacity:night}]}/>
    <View style={s.clip}>{view.orbs.map(orb=><Orb key={orb.icon} orb={orb} paused={paused} reduced={reduced}/>)}</View>
    <Image source={art.rim} style={s.scene}/>
   </View>
  </Pressable>
 </Animated.View>;
}
const s=StyleSheet.create({
 root:{position:'relative',height:HORIZON.height+10,paddingVertical:5,zIndex:11},button:{height:HORIZON.height,width:'100%'},
 art:{position:'absolute',top:0,width:HORIZON.width,height:HORIZON.height,shadowColor:'#000',shadowOpacity:.65,shadowRadius:3,shadowOffset:{width:0,height:2}},
 scene:{position:'absolute',left:0,top:0,width:HORIZON.width,height:HORIZON.height},clip:{position:'absolute',left:0,right:0,top:0,bottom:0,borderRadius:HORIZON.radius,overflow:'hidden'},
 wing:{position:'absolute',top:0,height:HORIZON.height,overflow:'hidden'},inlay:{position:'absolute',right:0,top:0,width:DAY_WING.width,height:HORIZON.height,alignItems:'center',justifyContent:'center',paddingRight:3,borderWidth:2,borderRightWidth:0,borderColor:'#a68d58',borderTopLeftRadius:11,borderBottomLeftRadius:11,backgroundColor:'#123936',overflow:'hidden'},inlayArt:{position:'absolute',left:0,top:0,width:DAY_WING.width,height:HORIZON.height,opacity:.7},
 dayLabel:{fontFamily:'FieldKitBarlow',fontSize:7,lineHeight:8,letterSpacing:1.8,color:'#c5bb93'},dayValue:{fontFamily:'FieldKitBarlow',fontSize:19,lineHeight:19,letterSpacing:.5,color:'#f1dfb3',fontVariant:['tabular-nums']},rivet:{position:'absolute',left:6,width:2,height:2,borderRadius:1,backgroundColor:'#d1b477'}
});

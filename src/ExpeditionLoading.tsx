import React,{useEffect,useRef,useState} from 'react';
import {Animated,Easing,Image,Platform,StyleSheet,Text,View,type ImageSourcePropType} from 'react-native';

// The approved loading mockup, cropped without redrawing its artwork. Live
// progress uses the same atlas's empty track, ember fill and teal texture.
const ART={width:504,height:594};
type Props={width:number;height:number;artwork:ImageSourcePropType;progress:number;reducedMotion:boolean};
export default function ExpeditionLoading({width,height,artwork,progress,reducedMotion}:Props){
 const scale=Math.min(width/ART.width,height/ART.height),w=ART.width*scale,h=ART.height*scale;
 const target=Math.max(0,Math.min(1,progress)),amount=useRef(new Animated.Value(target)).current;
 const pulse=useRef(new Animated.Value(1)).current;
 const [display,setDisplay]=useState(Math.round(target*100));
 useEffect(()=>{const listener=amount.addListener(({value})=>setDisplay(Math.round(value*100)));return()=>amount.removeListener(listener)},[amount]);
 useEffect(()=>{const animation=Animated.timing(amount,{toValue:target,duration:reducedMotion?0:380,easing:Easing.out(Easing.cubic),useNativeDriver:false});animation.start();return()=>animation.stop()},[amount,target,reducedMotion]);
 useEffect(()=>{if(reducedMotion||target===1){pulse.setValue(1);return}const animation=Animated.loop(Animated.sequence([Animated.timing(pulse,{toValue:.55,duration:850,useNativeDriver:Platform.OS!=='web'}),Animated.timing(pulse,{toValue:1,duration:850,useNativeDriver:Platform.OS!=='web'})]));animation.start();return()=>animation.stop()},[pulse,reducedMotion,target===1]);
 const image=(x:number,y:number,partWidth:number,partHeight:number,left:number,top:number,outWidth=partWidth,outHeight=partHeight)=>{
  const sx=outWidth/partWidth*scale,sy=outHeight/partHeight*scale;
  return <View pointerEvents="none" style={{position:'absolute',left:left*scale,top:top*scale,width:outWidth*scale,height:outHeight*scale,overflow:'hidden'}}><Image accessible={false} source={artwork} resizeMode="stretch" style={{position:'absolute',left:-x*sx,top:-y*sy,width:ART.width*sx,height:ART.height*sy}}/></View>;
 };
 const stage=target===1?2:target<.25?0:1;
 return <View accessibilityRole="progressbar" accessibilityLabel="Preparing your world" aria-valuemin={0} aria-valuemax={100} aria-valuenow={display} aria-valuetext={`${display} percent. ${target===1?'Ready':stage===0?'Getting your camp ready':'Preparing your world'}`} accessibilityValue={{min:0,max:100,now:display,text:`${display} percent. ${target===1?'Ready':stage===0?'Getting your camp ready':'Preparing your world'}`}} style={{width:w,height:h,alignSelf:'flex-end'}}>
  <Image accessible={false} source={artwork} resizeMode="stretch" style={StyleSheet.absoluteFill}/>
  {/* Cover only the live regions, keeping the original frame and lettering. */}
  {image(295,325,100,23,38,325,362,23)}
  <Animated.View style={{position:'absolute',left:38*scale,top:325*scale,height:23*scale,width:amount.interpolate({inputRange:[0,1],outputRange:[0,362*scale]}),overflow:'hidden',borderRadius:7*scale}}>
   <Image accessible={false} source={artwork} resizeMode="stretch" style={{position:'absolute',width:ART.width*(362/243)*scale,height:ART.height*scale,left:-38*(362/243)*scale,top:-325*scale}}/>
  </Animated.View>
  {image(415,357,66,30,415,315,66,35)}
  <Text accessible={false} style={{position:'absolute',left:414*scale,top:316*scale,width:68*scale,height:34*scale,textAlign:'center',fontFamily:Platform.OS==='ios'?'Georgia':Platform.OS==='web'?'Georgia, serif':'serif',fontWeight:'700',fontSize:26*scale,lineHeight:33*scale,color:'#f4dfa9'}}>{display}%</Text>
  {[{left:64},{left:217},{left:378}].map(({left},index)=>{
   const done=index<stage||target===1,active=index===stage&&target!==1;
   return <View key={index} style={{position:'absolute',left:(left-25)*scale,top:374*scale,width:50*scale,height:51*scale}}>
    {image(330,425,50,20,0,0,50,51)}
    <Animated.View style={{position:'absolute',left:12*scale,top:12*scale,width:28*scale,height:28*scale,borderRadius:14*scale,borderWidth:2*scale,borderColor:done?'#f1ae42':active?'#ffbb31':'#7c8068',backgroundColor:done?'#83612738':active?'#bc740951':'#152f2a',opacity:active?pulse:1,boxShadow:active?`0 0 ${11*scale}px ${4*scale}px #ffa30070`:undefined,alignItems:'center',justifyContent:'center'}}>{done&&<Text accessible={false} style={{fontSize:20*scale,lineHeight:23*scale,color:'#f5bd57'}}>✓</Text>}</Animated.View>
   </View>;
  })}
 </View>;
}

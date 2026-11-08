import React,{useEffect,useRef,useState} from 'react';
import {Animated,Easing,Image,Platform,StyleSheet,Text,View,type ImageSourcePropType} from 'react-native';
import {nextLoadingProgress} from './loading-presentation';

// The approved loading mockup, cropped without redrawing its artwork. Live
// progress uses the same atlas's empty track, ember fill and teal texture.
const ART={width:504,height:594};
type Props={width:number;height:number;artwork:ImageSourcePropType;progress:number;reducedMotion:boolean};
export default function ExpeditionLoading({width,height,artwork,progress,reducedMotion}:Props){
 // The parent already constrains the menu to the safe landscape viewport.\n const scale=Math.max(.001,Math.min(width/ART.width,height/ART.height)),w=ART.width*scale,h=ART.height*scale;
 const target=Math.max(0,Math.min(1,progress)),amount=useRef(new Animated.Value(target)).current;
 const pulse=useRef(new Animated.Value(1)).current;
 const actual=useRef(target);actual.current=target;
 const presented=useRef(target),captionOpacity=useRef(new Animated.Value(1)).current;
 const [caption,setCaption]=useState('Getting your camp ready'),[dots,setDots]=useState(1);
 const [display,setDisplay]=useState(Math.round(target*100));
 useEffect(()=>{const listener=amount.addListener(({value})=>setDisplay(Math.round(value*100)));return()=>amount.removeListener(listener)},[amount]);
 useEffect(()=>{
  let last=Date.now();
  const timer=setInterval(()=>{const now=Date.now();presented.current=nextLoadingProgress(presented.current,actual.current,now-last);last=now;Animated.timing(amount,{toValue:presented.current,duration:reducedMotion?0:100,easing:Easing.linear,useNativeDriver:false}).start()},100);
  return()=>{clearInterval(timer);amount.stopAnimation()};
 },[amount,reducedMotion]);
 useEffect(()=>{
  let index=0;
  const messages=target===1?['Your expedition is ready']:target<.25?['Getting your camp ready','Unpacking your supplies','Preparing your expedition']:['Bringing the world to life','Preparing the paths ahead','Getting your survivor ready'];
  const change=()=>{captionOpacity.setValue(reducedMotion?1:0);setCaption(messages[index++%messages.length]);Animated.timing(captionOpacity,{toValue:1,duration:reducedMotion?0:360,useNativeDriver:Platform.OS!=='web'}).start()};
  change();const timer=setInterval(change,2800);return()=>{clearInterval(timer);captionOpacity.stopAnimation()};
 },[target===1,target<.25,reducedMotion,captionOpacity]);
 useEffect(()=>{if(reducedMotion)return;const timer=setInterval(()=>setDots(n=>n%3+1),500);return()=>clearInterval(timer)},[reducedMotion]);
 useEffect(()=>{if(reducedMotion||target===1){pulse.setValue(1);return}const animation=Animated.loop(Animated.sequence([Animated.timing(pulse,{toValue:.55,duration:850,useNativeDriver:Platform.OS!=='web'}),Animated.timing(pulse,{toValue:1,duration:850,useNativeDriver:Platform.OS!=='web'})]));animation.start();return()=>animation.stop()},[pulse,reducedMotion,target===1]);
 const image=(x:number,y:number,partWidth:number,partHeight:number,left:number,top:number,outWidth=partWidth,outHeight=partHeight)=>{
  const sx=outWidth/partWidth*scale,sy=outHeight/partHeight*scale;
  return <View pointerEvents="none" style={{position:'absolute',left:left*scale,top:top*scale,width:outWidth*scale,height:outHeight*scale,overflow:'hidden'}}><Image accessible={false} source={artwork} resizeMode="stretch" style={{position:'absolute',left:-x*sx,top:-y*sy,width:ART.width*sx,height:ART.height*sy}}/></View>;
 };
 const stage=target===1?2:target<.25?0:1;
 return <View accessibilityRole="progressbar" accessibilityLabel="Preparing your world" aria-valuemin={0} aria-valuemax={100} aria-valuenow={display} aria-valuetext={`${display} percent. ${target===1?'Ready':stage===0?'Getting your camp ready':'Preparing your world'}`} accessibilityValue={{min:0,max:100,now:display,text:`${display} percent. ${target===1?'Ready':stage===0?'Getting your camp ready':'Preparing your world'}`}} style={{width:w,height:h,alignSelf:'flex-end'}}>
  <Image accessible={false} source={artwork} resizeMode="stretch" style={StyleSheet.absoluteFill}/>
  {image(40,425,420,20,40,268,420,39)}
  <Animated.Text accessible={false} style={{position:'absolute',left:40*scale,top:271*scale,width:420*scale,textAlign:'center',fontFamily:Platform.OS==='ios'?'Georgia':Platform.OS==='web'?'Georgia, serif':'serif',fontStyle:'italic',fontSize:21*scale,lineHeight:28*scale,color:'#efdfb6',opacity:captionOpacity}}>{caption}{target===1?'':'.'.repeat(reducedMotion?1:dots)}</Animated.Text>
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
    <Animated.View style={{position:'absolute',left:12*scale,top:12*scale,width:28*scale,height:28*scale,borderRadius:14*scale,borderWidth:2*scale,borderColor:done?'#f1ae42':active?'#ffbb31':'#7c8068',backgroundColor:done?'#83612738':active?'#bc740951':'#152f2a',opacity:active?pulse:1,shadowColor:'#ffa300',shadowOpacity:active?.45:0,shadowRadius:11*scale,alignItems:'center',justifyContent:'center'}}>{done&&<Text accessible={false} style={{fontSize:20*scale,lineHeight:23*scale,color:'#f5bd57'}}>✓</Text>}</Animated.View>
   </View>;
  })}
 </View>;
}

import React,{useEffect,useRef,useState} from 'react';
import {Animated,Easing,Image,Platform,StyleSheet,View,type ImageSourcePropType} from 'react-native';

/**
 * The original survivor is baked into the camp video, not a separate view.
 * Overlay the retouched, feathered scene pixels FIRST; only then draw one
 * aligned, high-resolution survivor from four individually authored poses.
 *
 * Both textures are preloaded before replacing the video survivor. A slow
 * device never sees two characters or an empty loading pose. This is a
 * short cinematic pose transition, NOT low-resolution sprite frame playback.
 */
const SCENE={width:1536,height:864};
const CELL={width:540,height:600};
const FOOT={x:497,y:725};
const CHARACTER_SCALE=.65;
const artwork:ImageSourcePropType=Platform.OS==='web'
 ? {uri:'/survival/start-prepare-v2/preparation-poses.png'}
 : require('../public/survival/start-prepare-v2/preparation-poses.png');
const cleanLayer:ImageSourcePropType=Platform.OS==='web'
 ? {uri:'/survival/start-prepare-v2/remove-seated-survivor.png'}
 : require('../public/survival/start-prepare-v2/remove-seated-survivor.png');

type Props={width:number;height:number;reducedMotion:boolean;onFinished:()=>void};
const transitions=[
 {hold:420,duration:160}, // Seated -> lean forward
 {hold:560,duration:180}, // Push off the ground -> rise
 {hold:600,duration:160}, // Strap secure -> knife ready
] as const;

export default function SurvivorPreparation({width,height,reducedMotion,onFinished}:Props){
 const [imagesLoaded,setImagesLoaded]=useState({poses:false,clean:false});
 const [imageFailed,setImageFailed]=useState(false);
 const [complete,setComplete]=useState(false);
 const opacity=useRef([new Animated.Value(1),new Animated.Value(0),new Animated.Value(0),new Animated.Value(0)]).current;
 const breathe=useRef(new Animated.Value(0)).current;
 const completed=useRef(false);
 const cb=useRef(onFinished);cb.current=onFinished;
 const ready=imagesLoaded.poses&&imagesLoaded.clean;
 const finish=()=>{if(completed.current)return;completed.current=true;setComplete(true);cb.current()};
 useEffect(()=>{
  if(!ready&&!imageFailed)return;
  if(imageFailed){finish();return}
  if(reducedMotion){opacity.forEach((v,i)=>v.setValue(i===3?1:0));finish();return}
  const stages:Animated.CompositeAnimation[]=[];
  for(let i=0;i<3;i++){
   stages.push(Animated.delay(transitions[i].hold));
   stages.push(Animated.parallel([
    Animated.timing(opacity[i],{toValue:0,duration:transitions[i].duration,easing:Easing.inOut(Easing.cubic),useNativeDriver:Platform.OS!=='web'}),
    Animated.timing(opacity[i+1],{toValue:1,duration:transitions[i].duration,easing:Easing.inOut(Easing.cubic),useNativeDriver:Platform.OS!=='web'}),
   ]));
  }
  stages.push(Animated.delay(200));
  const animation=Animated.sequence(stages);
  animation.start(({finished})=>{if(finished)finish()});
  return()=>animation.stop();
 },[ready,imageFailed,reducedMotion,opacity]);
 useEffect(()=>{
  if(!complete||reducedMotion||imageFailed)return;
  const animation=Animated.loop(Animated.sequence([
   Animated.timing(breathe,{toValue:1,duration:1700,easing:Easing.inOut(Easing.sin),useNativeDriver:Platform.OS!=='web'}),
   Animated.timing(breathe,{toValue:0,duration:1700,easing:Easing.inOut(Easing.sin),useNativeDriver:Platform.OS!=='web'}),
  ]));
  animation.start();return()=>animation.stop();
 },[complete,reducedMotion,imageFailed,breathe]);

 // The background video uses "cover", not contain. Tie both sprites and the
 // repair matte to the same 1536x864 camera for landscape web AND Expo iOS.
 const scale=Math.max(width/SCENE.width,height/SCENE.height);
 const left=(width-SCENE.width*scale)/2,top=(height-SCENE.height*scale)/2;
 const cw=CELL.width*CHARACTER_SCALE*scale,ch=CELL.height*CHARACTER_SCALE*scale;
 const spriteX=left+FOOT.x*scale-cw/2,spriteY=top+FOOT.y*scale-ch;
 return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
  {/* Load both images BEFORE covering the seated character in the video. */}
  <Image accessible={false} source={artwork} onLoad={()=>setImagesLoaded(s=>({...s,poses:true}))} onError={()=>setImageFailed(true)} style={styles.hidden}/>
  <Image accessible={false} source={cleanLayer} onLoad={()=>setImagesLoaded(s=>({...s,clean:true}))} onError={()=>setImageFailed(true)} style={styles.hidden}/>
  {ready&&!imageFailed&&<>
   <Image accessible={false} source={cleanLayer} resizeMode="stretch" style={{position:'absolute',left,top,width:SCENE.width*scale,height:SCENE.height*scale}}/>
   <Animated.View style={{position:'absolute',left:spriteX,top:spriteY,width:cw,height:ch,transform:[{translateY:breathe.interpolate({inputRange:[0,1],outputRange:[0,-1.4*scale]})}]}}>
    {opacity.map((value,i)=><Animated.View key={i} style={{position:'absolute',left:0,top:0,width:cw,height:ch,overflow:'hidden',opacity:value}}>
     <Image accessible={false} source={artwork} resizeMode="stretch" style={{position:'absolute',left:-(i%2)*cw,top:-Math.floor(i/2)*ch,width:cw*2,height:ch*2}}/>
    </Animated.View>)}
   </Animated.View>
  </>}
 </View>;
}
const styles=StyleSheet.create({hidden:{position:'absolute',width:1,height:1,opacity:0}});
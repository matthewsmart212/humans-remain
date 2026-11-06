import React,{useEffect,useRef,useState} from 'react';
import {Animated,Easing,Image,Platform,StyleSheet,View,type ImageSourcePropType} from 'react-native';

/**
 * Cinematic Play -> Loading survivor animation.
 *
 * The source is one 7x6 atlas of 42 individually aligned and alpha-cleaned
 * frames. Unlike the earlier 4-illustration crossfade, only ONE fully opaque
 * pose is shown at any instant. The feet share a stable 1536x864 ground anchor
 * so changing poses never moves or rescales the character's viewport.
 *
 * The original camp video contains a seated character. A precomposited clean
 * matte must be decoded before showing the new survivor, otherwise both appear.
 * World boot readiness is handled independently by StartingScreen; completion
 * is reported only after the LAST frame has actually had time to display.
 */
const SCENE={width:1536,height:864};
const CELL={width:360,height:504};
const OUTPUT={width:400,height:560};
const FOOT={x:497,y:755};
const ORIGINAL_FOOT_IN_CELL=534;
const COLUMNS=7,ROWS=6,FRAMES=42;
const FRAME_MS=65;
const atlas:ImageSourcePropType=Platform.OS==='web'
 ? {uri:'/survival/start-prepare-v4/survivor-prepare.webp'}
 : require('../public/survival/start-prepare-v4/survivor-prepare.webp');
const cleanLayer:ImageSourcePropType=Platform.OS==='web'
 ? {uri:'/survival/start-prepare-v2/remove-seated-survivor.png'}
 : require('../public/survival/start-prepare-v2/remove-seated-survivor.png');

type Props={width:number;height:number;reducedMotion:boolean;onFinished:()=>void};
export default function SurvivorPreparation({width,height,reducedMotion,onFinished}:Props){
 const [atlasLoaded,setAtlasLoaded]=useState(false),[matteLoaded,setMatteLoaded]=useState(false);
 const [failed,setFailed]=useState(false),[frame,setFrame]=useState(0),[complete,setComplete]=useState(false);
 const finishedRef=useRef(false),callbackRef=useRef(onFinished);
 const breathe=useRef(new Animated.Value(0)).current;
 callbackRef.current=onFinished;
 const ready=atlasLoaded&&matteLoaded;
 const reportFinished=()=>{
  if(finishedRef.current)return;
  finishedRef.current=true;
  setComplete(true);
  callbackRef.current();
 };
 useEffect(()=>{
  if(failed){reportFinished();return;}
  if(!ready)return;
  if(reducedMotion){setFrame(FRAMES-1);reportFinished();return;}
  const started=Date.now();
  const tick=()=>{
   const elapsed=Math.max(0,Date.now()-started);
   if(elapsed>=FRAMES*FRAME_MS){setFrame(FRAMES-1);reportFinished();return true;}
   setFrame(Math.min(FRAMES-1,Math.floor(elapsed/FRAME_MS)));
   return false;
  };
  // Elapsed-time playback prevents iOS world startup work from queuing and
  // replaying dozens of late frames. Never finish before frame 42 has displayed.
  const interval=setInterval(()=>{if(tick())clearInterval(interval);},Math.floor(FRAME_MS/2));
  tick();
  return()=>clearInterval(interval);
 },[ready,failed,reducedMotion]);
 useEffect(()=>{
  if(!complete||reducedMotion||failed)return;
  const animation=Animated.loop(Animated.sequence([
   Animated.timing(breathe,{toValue:1,duration:1850,easing:Easing.inOut(Easing.sin),useNativeDriver:Platform.OS!=='web'}),
   Animated.timing(breathe,{toValue:0,duration:1850,easing:Easing.inOut(Easing.sin),useNativeDriver:Platform.OS!=='web'}),
  ]));
  animation.start();return()=>animation.stop();
 },[complete,reducedMotion,failed,breathe]);

 const scale=Math.max(width/SCENE.width,height/SCENE.height);
 const originX=(width-SCENE.width*scale)/2,originY=(height-SCENE.height*scale)/2;
 const cw=OUTPUT.width*scale,ch=OUTPUT.height*scale;
 const x=originX+(FOOT.x-OUTPUT.width/2)*scale;
 const y=originY+(FOOT.y-ORIGINAL_FOOT_IN_CELL)*scale;
 return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
  <Image accessible={false} source={atlas} onLoad={()=>setAtlasLoaded(true)} onError={()=>setFailed(true)} style={styles.preload}/>
  <Image accessible={false} source={cleanLayer} onLoad={()=>setMatteLoaded(true)} onError={()=>setFailed(true)} style={styles.preload}/>
  {ready&&!failed&&<>
   <Image accessible={false} source={cleanLayer} resizeMode="stretch" style={{position:'absolute',left:originX,top:originY,width:SCENE.width*scale,height:SCENE.height*scale}}/>
   <Animated.View style={{position:'absolute',left:x,top:y,width:cw,height:ch,overflow:'hidden',transform:[{translateY:breathe.interpolate({inputRange:[0,1],outputRange:[0,-1.5*scale]})}]}}>
    <Image accessible={false} source={atlas} resizeMode="stretch" style={{position:'absolute',left:-(frame%COLUMNS)*cw,top:-Math.floor(frame/COLUMNS)*ch,width:COLUMNS*cw,height:ROWS*ch}}/>
   </Animated.View>
  </>}
 </View>;
}
const styles=StyleSheet.create({preload:{position:'absolute',width:1,height:1,opacity:0}});
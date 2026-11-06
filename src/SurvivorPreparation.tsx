import React,{useEffect,useRef,useState} from 'react';
import {Animated,Easing,Image,Platform,View,type ImageSourcePropType} from 'react-native';

/**
 * The 32 frames share a single fixed 222x228 cell. Do NOT trim/recenter individual
 * frames: the stable canvas, ground baseline and headroom prevent the old jitter.
 * Playback starts only after the atlas is decoded; real world readiness is a
 * separate condition in StartingScreen.
 */
const CELL_WIDTH=222,CELL_HEIGHT=228,COLUMNS=8,FRAMES=32,FRAME_MS=90;
const SCENE_WIDTH=1536,SCENE_HEIGHT=864;
const atlas:ImageSourcePropType=Platform.OS==='web'
 ? {uri:'/survival/start-prepare-v1/prepare-atlas.png'}
 : require('../public/survival/start-prepare-v1/prepare-atlas.png');
const cleanPlate:ImageSourcePropType=Platform.OS==='web'
 ? {uri:'/previews/dawn-camp/assets/dawn-clean-plate.png'}
 : require('../public/previews/dawn-camp/assets/dawn-clean-plate.png');

type Props={width:number;height:number;reducedMotion:boolean;onFinished:()=>void};
export const SURVIVOR_PREPARATION_MS=FRAMES*FRAME_MS;

export default function SurvivorPreparation({width,height,reducedMotion,onFinished}:Props){
 const [assetReady,setAssetReady]=useState(false),[assetFailed,setAssetFailed]=useState(false);
 const [frame,setFrame]=useState(0),[done,setDone]=useState(false);
 const completed=useRef(false),callback=useRef(onFinished);
 const breath=useRef(new Animated.Value(0)).current;
 callback.current=onFinished;
 useEffect(()=>{
  if(!reducedMotion&&!assetReady&&!assetFailed)return;
  if(reducedMotion||assetFailed){
   setFrame(FRAMES-1);
   setDone(true);
   if(!completed.current){completed.current=true;callback.current();}
   return;
  }
  const started=Date.now();
  const tick=()=>{
   const elapsed=Math.max(0,Date.now()-started);
   if(elapsed>=SURVIVOR_PREPARATION_MS){
    setFrame(FRAMES-1);
    setDone(true);
    if(!completed.current){completed.current=true;callback.current();}
    return true;
   }
   setFrame(Math.min(FRAMES-1,Math.floor(elapsed/FRAME_MS)));
   return false;
  };
  // A monotonic elapsed-time clock avoids a slow iPhone or background tab
  // replaying every skipped sprite and making the loading screen stutter.
  const timer=setInterval(()=>{if(tick())clearInterval(timer)},30);
  tick();
  return()=>clearInterval(timer);
 },[assetReady,assetFailed,reducedMotion]);
 useEffect(()=>{
  if(!done||reducedMotion)return;
  const cycle=Animated.loop(Animated.sequence([
   Animated.timing(breath,{toValue:1,duration:1700,easing:Easing.inOut(Easing.sin),useNativeDriver:Platform.OS!=='web'}),
   Animated.timing(breath,{toValue:0,duration:1700,easing:Easing.inOut(Easing.sin),useNativeDriver:Platform.OS!=='web'})
  ]));
  cycle.start();
  return()=>cycle.stop();
 },[done,reducedMotion,breath]);

 // Match the original 1536x864 "cover" video coordinate system on browsers
 // and landscape iOS, rather than positioning by arbitrary percentages.
 const scale=Math.max(width/SCENE_WIDTH,height/SCENE_HEIGHT);
 const offsetX=(width-SCENE_WIDTH*scale)/2,offsetY=(height-SCENE_HEIGHT*scale)/2;
 const spriteScale=scale*2;
 const cellW=CELL_WIDTH*spriteScale,cellH=CELL_HEIGHT*spriteScale;
 const baseX=497,baseY=755;
 const left=offsetX+baseX*scale-cellW/2;
 // The last 9 transparent pixels beneath each foot are shared by every cell.
 const top=offsetY+baseY*scale-cellH+9*spriteScale;
 const patchX=325,patchY=296,patchW=342,patchH=490;
 return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{position:'absolute',top:0,bottom:0,left:0,right:0,overflow:'hidden'}}>
  {/* Only replace the seated character region; the fire and moving foliage
      outside it stay on the original animated camp video. */}
  {assetReady&&<View nativeID="survivor-prepare-clean-patch" style={{position:'absolute',left:offsetX+patchX*scale,top:offsetY+patchY*scale,width:patchW*scale,height:patchH*scale,overflow:'hidden',borderRadius:36*scale}}>
   <Image accessible={false} source={cleanPlate} resizeMode="stretch" style={{position:'absolute',left:-patchX*scale,top:-patchY*scale,width:SCENE_WIDTH*scale,height:SCENE_HEIGHT*scale}}/>
  </View>}
  <Animated.View style={{position:'absolute',left,top,width:cellW,height:cellH,overflow:'hidden',transform:[{translateY:breath.interpolate({inputRange:[0,1],outputRange:[0,-1.5*scale]})}]}}>
   <Image accessible={false} source={atlas} resizeMode="stretch" onLoad={()=>setAssetReady(true)} onError={()=>setAssetFailed(true)}
    style={{position:'absolute',left:-(frame%COLUMNS)*cellW,top:-Math.floor(frame/COLUMNS)*cellH,width:COLUMNS*cellW,height:4*cellH,opacity:assetReady?1:0}}/>
  </Animated.View>
 </View>;
}

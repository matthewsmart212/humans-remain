import React,{useEffect,useRef,useState} from 'react';
import {AppState,Image,StyleSheet,View} from 'react-native';
import {useVideoPlayer,VideoView} from 'expo-video';

// This single player stays mounted throughout the cinematic-to-menu transition.
// The menu's REAL controls are a separate transparent layer above the intro.
const poster=require('../public/previews/dawn-camp/start-scene-poster.jpg');
const loopSource=require('../public/previews/dawn-camp/start-scene.mp4');

export default function NativeMenuBackdrop({playing,onFirstFrame,onError}:{
 playing:boolean;
 onFirstFrame:()=>void;
 onError:()=>void;
}){
 const video=useVideoPlayer(loopSource,p=>{
  p.loop=true;
  p.muted=true;
  p.staysActiveInBackground=false;
 });
 const [frameReady,setFrameReady]=useState(false);
 const frameCallback=useRef(onFirstFrame),errorCallback=useRef(onError);
 frameCallback.current=onFirstFrame;
 errorCallback.current=onError;

 useEffect(()=>{
  const sync=()=>{
   if(playing&&AppState.currentState==='active')video.play();
   else video.pause();
  };
  sync();
  const sub=AppState.addEventListener('change',sync);
  return()=>{sub.remove();video.pause()};
 },[video,playing]);

 useEffect(()=>{
  const sub=video.addListener('statusChange',event=>{
   if(event.status==='error')errorCallback.current();
  });
  return()=>sub.remove();
 },[video]);

 return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
  <Image source={poster} resizeMode="cover" style={StyleSheet.absoluteFill}/>
  <VideoView
   player={video}
   contentFit="cover"
   nativeControls={false}
   allowsPictureInPicture={false}
   fullscreenOptions={{enable:false}}
   onFirstFrameRender={()=>{setFrameReady(true);frameCallback.current()}}
   style={[StyleSheet.absoluteFill,{opacity:frameReady?1:0}]}/>
 </View>;
}

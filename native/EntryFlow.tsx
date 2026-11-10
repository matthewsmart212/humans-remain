import React,{useCallback,useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,AppState,Easing,StyleSheet,View} from 'react-native';
import {useAudioPlayer,setAudioModeAsync} from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NativeOpeningFlow from './OpeningFlow';
import NativeStartingScreen from './StartingScreen';
import NativeMenuBackdrop from './MenuBackdrop';
import {START_PROFILE_KEY,readStartProfile} from '../src/start-profile';
import type {SurvivorRoleId} from '../src/survivor-roles';

// One native player outlives the cinematic-to-menu transition. The MP3 is
// bundled once for iOS and replaces the old start-menu.mp3 everywhere in
// this opening flow. Video narration remains in intro.mp4.
const musicSource=require('../public/previews/the-reclamation/soundtrack.mp3');

type Props={
 initialMenuVisible:boolean;
 onPlay:(role:SurvivorRoleId)=>void;
 onFriends:(role:SurvivorRoleId,name:string)=>void;
 loadingProgress?:number;
 loadError?:string;
 onLoadingComplete:()=>void;
};
type MusicMode='idle'|'cinematic'|'menu';

export default function NativeEntryFlow({initialMenuVisible,onPlay,onFriends,loadingProgress,loadError='',onLoadingComplete}:Props){
 const [menuRequested,setMenuRequested]=useState<'none'|'natural'|'skip'|'continue'>(initialMenuVisible?'continue':'none');
 const [menuVideoEnabled,setMenuVideoEnabled]=useState(initialMenuVisible);
 const [menuFrameReady,setMenuFrameReady]=useState(false);
 const [menuVideoFailed,setMenuVideoFailed]=useState(false);
 const [menuUiPhase,setMenuUiPhase]=useState<'hidden'|'revealing'|'shown'>(initialMenuVisible?'shown':'hidden');
 const [motion,setMotion]=useState(true),[reduced,setReduced]=useState(false);
 const [openingGone,setOpeningGone]=useState(initialMenuVisible);
 const openingOpacity=useRef(new Animated.Value(1)).current;
 const [musicMode,setMusicMode]=useState<MusicMode>(initialMenuVisible?'menu':'idle');
 const [muted,setMuted]=useState(false);
 const [profileReady,setProfileReady]=useState(false);
 const [audioReady,setAudioReady]=useState(false);
 const [active,setActive]=useState(AppState.currentState==='active');
 const music=useAudioPlayer(musicSource);
 // Read the exact same saved mute preference as the existing menu UI.
 useEffect(()=>{
  let live=true;
  void AsyncStorage.getItem(START_PROFILE_KEY)
   .then(text=>{if(live){const profile=readStartProfile(text);setMuted(profile.muted);setMotion(profile.motion)}})
   .catch(()=>{})
   .finally(()=>{if(live)setProfileReady(true)});
  return()=>{live=false};
 },[]);

 useEffect(()=>{
  let live=true;
  void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(live)setReduced(value)}).catch(()=>{});
  const sub=AccessibilityInfo.addEventListener('reduceMotionChanged',value=>setReduced(value));
  return()=>{live=false;sub.remove()};
 },[]);

 // Watch Intro must not be held up by downloading the track over the network:
 // it is statically bundled and loaded by expo-audio.
 useEffect(()=>{
  music.loop=true;
  music.volume=.72;
  return()=>music.pause();
 },[music]);

 useEffect(()=>{
  let live=true;
  void setAudioModeAsync({playsInSilentMode:true,shouldPlayInBackground:false,interruptionMode:'mixWithOthers'})
   .then(()=>{if(live)setAudioReady(true)})
   .catch(()=>{if(live)setAudioReady(true)});
  const sub=AppState.addEventListener('change',state=>setActive(state==='active'));
  setActive(AppState.currentState==='active');
  return()=>{live=false;sub.remove()};
 },[]);

 // One owner controls soundtrack playback through the title, film and menu.
 // Video buffering or starting narration must never pause or seek this loop.
 useEffect(()=>{
  if(!profileReady||!audioReady||!active||muted){
   music.pause();
   return;
  }
  // AVPlayer can queue play while its item is buffering. Waiting for a
  // separate loaded event here can discard an early title-screen tap.
  if((musicMode==='menu'||musicMode==='cinematic')&&!music.playing)music.play();
 },[music,musicMode,profileReady,audioReady,active,muted]);

 const chooseContinue=()=>{
  setMusicMode('menu');
  setMenuVideoEnabled(true);
 };
 const completeContinue=()=>setMenuRequested('continue');
 const chooseWatch=()=>{
  // The same shared soundtrack starts on the Watch Intro tap, not when
  // expo-video eventually renders its first frame four seconds later.
  setMusicMode('cinematic');
 };
 const beginFinalReveal=()=>setMenuUiPhase(phase=>phase==='hidden'?'revealing':phase);
 // The final footage of the intro is deliberately aligned with the END of
 // the menu's looping clip. Start its next loop near the final intro frame.
 const prepareLoop=()=>setMenuVideoEnabled(true);
 const arriveAtMenu=(kind:'natural'|'skip')=>{
  setMusicMode('menu');
  setMenuVideoEnabled(true);
  // If a device missed the 4-second update event, the completed menu must
  // never retain hidden or half-animated controls.
  if(kind==='natural')setMenuUiPhase('shown');
  setMenuRequested(kind);
 };
 const onBackgroundFrame=useCallback(()=>setMenuFrameReady(true),[]);
 const onBackgroundError=useCallback(()=>setMenuVideoFailed(true),[]);
 // The intro never unmounts over an unprepared or black video surface.
 useEffect(()=>{
  if(openingGone||menuRequested==='none'||(!menuFrameReady&&!menuVideoFailed&&motion&&!reduced))return;
  // Skip/Continue bring all the controls in with the short handoff; a
  // naturally finishing intro already animated them over its final 4s.
  if(menuRequested!=='natural')setMenuUiPhase('revealing');
  const animation=Animated.timing(openingOpacity,{
   toValue:0,
   duration:menuRequested==='natural'?85:220,
   easing:Easing.linear,
   useNativeDriver:true
  });
  animation.start(({finished})=>{if(finished)setOpeningGone(true)});
  return()=>animation.stop();
 },[openingGone,menuRequested,menuFrameReady,menuVideoFailed,motion,reduced,openingOpacity]);
 // Three distinct layers on iOS: one menu video at the back, the intro
 // above it, and the REAL menu UI over both during its final four seconds.
 // None of these players/UI trees are remounted during the natural handoff.
 return <View style={StyleSheet.absoluteFill}>
  <View pointerEvents="none" style={[StyleSheet.absoluteFill,{zIndex:0}]}>
   <NativeMenuBackdrop
    playing={menuVideoEnabled&&motion&&!reduced}
    onFirstFrame={onBackgroundFrame}
    onError={onBackgroundError}
   />
  </View>
  {!openingGone&&<Animated.View
    pointerEvents={menuRequested==='none'?'auto':'none'}
    style={[StyleSheet.absoluteFill,{opacity:openingOpacity,zIndex:1500,elevation:1500,backgroundColor:'#061117'}]}>
    <NativeOpeningFlow
     onComplete={arriveAtMenu}
     onPrepareMenu={prepareLoop}
     onUiReveal={beginFinalReveal}
     onContinueSelected={chooseContinue}
     onContinueComplete={completeContinue}
     onWatchSelected={chooseWatch}
    />
   </Animated.View>}
  <View pointerEvents={openingGone?'auto':'none'} style={[StyleSheet.absoluteFill,{zIndex:3000,elevation:3000}]}>
   <NativeStartingScreen
    onPlay={onPlay}
    onFriends={onFriends}
    loadingProgress={loadingProgress}
    loadError={loadError}
    onLoadingComplete={onLoadingComplete}
    onSoundtrackMuteChange={setMuted}
    onBackgroundMotionChange={setMotion}
    introUiPhase={menuUiPhase}
   />
  </View>
 </View>;
}

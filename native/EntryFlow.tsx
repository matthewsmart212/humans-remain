import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Animated,AppState,Easing,StyleSheet,View} from 'react-native';
import {useAudioPlayer,setAudioModeAsync} from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NativeOpeningFlow from './OpeningFlow';
import NativeStartingScreen from './StartingScreen';
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
 const [openingGone,setOpeningGone]=useState(initialMenuVisible);
 const openingOpacity=useRef(new Animated.Value(1)).current;
 const [musicMode,setMusicMode]=useState<MusicMode>(initialMenuVisible?'menu':'idle');
 const [muted,setMuted]=useState(false);
 const [profileReady,setProfileReady]=useState(false);
 const [audioReady,setAudioReady]=useState(false);
 const [musicLoaded,setMusicLoaded]=useState(false);
 const [active,setActive]=useState(AppState.currentState==='active');
 const music=useAudioPlayer(musicSource);
 const activeRef=useRef(active),mutedRef=useRef(muted),profileReadyRef=useRef(profileReady);
 activeRef.current=active;
 mutedRef.current=muted;
 profileReadyRef.current=profileReady;

 // Read the exact same saved mute preference as the existing menu UI.
 useEffect(()=>{
  let live=true;
  void AsyncStorage.getItem(START_PROFILE_KEY)
   .then(text=>{if(live)setMuted(readStartProfile(text).muted)})
   .catch(()=>{})
   .finally(()=>{if(live)setProfileReady(true)});
  return()=>{live=false};
 },[]);

 // Watch Intro must not be held up by downloading the track over the network:
 // it is statically bundled and loaded by expo-audio.
 useEffect(()=>{
  music.loop=true;
  music.volume=.72;
  setMusicLoaded(music.isLoaded);
  const sub=music.addListener('playbackStatusUpdate',event=>{
   setMusicLoaded(current=>current===event.isLoaded?current:event.isLoaded);
  });
  return()=>{sub.remove();music.pause()};
 },[music]);

 useEffect(()=>{
  let live=true;
  void setAudioModeAsync({playsInSilentMode:true,shouldPlayInBackground:false,interruptionMode:'mixWithOthers'})
   .then(()=>{if(live)setAudioReady(true)})
   .catch(()=>{if(live)setAudioReady(true)});
  const sub=AppState.addEventListener('change',state=>setActive(state==='active'));
  return()=>{live=false;sub.remove()};
 },[]);

 // The cinematic controls pausing/resuming while it is visible. The menu
 // runs the same player continuously, without ever seeking back to zero.
 useEffect(()=>{
  if(!profileReady||!audioReady||!musicLoaded||!active||muted){
   music.pause();
   return;
  }
  if(musicMode==='menu'&&!music.playing)music.play();
 },[music,musicMode,profileReady,audioReady,musicLoaded,active,muted]);

 const chooseContinue=()=>{
  setMusicMode('menu');
  setMenuVideoEnabled(true);
  setMenuRequested('continue');
 };
 const chooseWatch=()=>setMusicMode('cinematic');
 // The final footage of the intro is deliberately aligned with the END of
 // the menu's looping clip. Start its next loop near the final intro frame.
 const prepareLoop=()=>setMenuVideoEnabled(true);
 const arriveAtMenu=(kind:'natural'|'skip')=>{
  setMusicMode('menu');
  setMenuVideoEnabled(true);
  setMenuRequested(kind);
 };
 const onBackgroundFrame=useCallback(()=>setMenuFrameReady(true),[]);
 const onBackgroundError=useCallback(()=>setMenuVideoFailed(true),[]);
 // The intro never unmounts over an unprepared or black video surface.
 useEffect(()=>{
  if(openingGone||menuRequested==='none'||(!menuFrameReady&&!menuVideoFailed))return;
  const animation=Animated.timing(openingOpacity,{
   toValue:0,
   duration:menuRequested==='natural'?85:220,
   easing:Easing.linear,
   useNativeDriver:true
  });
  animation.start(({finished})=>{if(finished)setOpeningGone(true)});
  return()=>animation.stop();
 },[openingGone,menuRequested,menuFrameReady,menuVideoFailed,openingOpacity]);
 const musicAllowed=profileReady&&audioReady&&active&&!muted;
 return <View style={StyleSheet.absoluteFill}>
  <NativeStartingScreen
   onPlay={onPlay}
   onFriends={onFriends}
   loadingProgress={loadingProgress}
   loadError={loadError}
   onLoadingComplete={onLoadingComplete}
   onSoundtrackMuteChange={setMuted}
   allowBackgroundPlayback={menuVideoEnabled}
   onBackgroundFrame={onBackgroundFrame}
   onBackgroundError={onBackgroundError}
  />
  {!openingGone&&<Animated.View
    pointerEvents={menuRequested==='none'?'auto':'none'}
    style={[StyleSheet.absoluteFill,{opacity:openingOpacity}]}>
    <NativeOpeningFlow
     onComplete={arriveAtMenu}
     onPrepareMenu={prepareLoop}
     onContinueSelected={chooseContinue}
     onWatchSelected={chooseWatch}
     soundtrack={music}
     soundtrackReady={musicLoaded&&profileReady&&audioReady}
     soundtrackAllowed={musicAllowed}
    />
   </Animated.View>}
 </View>;
}

import React,{useEffect,useRef,useState} from 'react';
import {AppState,StyleSheet,View} from 'react-native';
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
 const [menuVisible,setMenuVisible]=useState(initialMenuVisible);
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

 const chooseContinue=()=>setMusicMode('menu');
 const chooseWatch=()=>setMusicMode('cinematic');
 const arriveAtMenu=()=>{
  setMusicMode('menu');
  setMenuVisible(true);
 };
 const musicAllowed=profileReady&&audioReady&&active&&!muted;
 return <View style={StyleSheet.absoluteFill}>
  {!menuVisible
   ?<NativeOpeningFlow
     onComplete={arriveAtMenu}
     onContinueSelected={chooseContinue}
     onWatchSelected={chooseWatch}
     soundtrack={music}
     soundtrackReady={musicLoaded&&profileReady&&audioReady}
     soundtrackAllowed={musicAllowed}
    />
   :<NativeStartingScreen
     onPlay={onPlay}
     onFriends={onFriends}
     loadingProgress={loadingProgress}
     loadError={loadError}
     onLoadingComplete={onLoadingComplete}
     onSoundtrackMuteChange={setMuted}
    />}
 </View>;
}

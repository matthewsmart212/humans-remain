import React,{useEffect,useRef,useState} from 'react';
import {View,Image,StyleSheet,AccessibilityInfo,StatusBar,useWindowDimensions,Platform} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Canvas,Rect,LinearGradient,vec} from '@shopify/react-native-skia';
import {useFonts} from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StartingScreen from '../src/StartingScreen';
import {START_SCREEN_MENU_FONT,type StartScreenArtwork} from '../src/start-screen-art';
import {START_PROFILE_KEY,DEFAULT_START_PROFILE,readStartProfile,type StartProfile} from '../src/start-profile';
import type {SurvivorRoleId} from '../src/survivor-roles';

const menuArtwork:StartScreenArtwork={
 logo:require('../public/survival/starting-screen-ui-v2/humans-remain-logo.png'),
 selectionGlow:require('../public/survival/starting-screen-ui-v2/play-selection-glow.png'),
 expeditionCards:require('../public/survival/expedition-menu-v2/approved-cards.webp'),
 expeditionPanels:{
  play:require('../public/survival/expedition-menu-v2/panels/play.png'),
  customise:require('../public/survival/expedition-menu-v2/panels/customise.png'),
  upgrades:require('../public/survival/expedition-menu-v2/panels/upgrades.png'),
  friends:require('../public/survival/expedition-menu-v2/panels/friends.png'),
 },
 expeditionLoading:require('../public/survival/expedition-menu-v2/loading-panel.webp'),
 icons:{
  play:require('../public/survival/starting-screen-ui-v2/play.png'),
  friends:require('../public/survival/starting-screen-ui-v2/friends.png'),
  customise:require('../public/survival/starting-screen-ui-v2/customise.png'),
  upgrades:require('../public/survival/starting-screen-ui-v2/upgrades.png'),
  lock:require('../public/survival/starting-screen-ui-v2/lock.png'),
  settings:require('../public/survival/starting-screen-ui-v2/settings.png'),
 },
};
const menuFonts={[START_SCREEN_MENU_FONT]:require('../public/fonts/camp-menu-semibold.ttf')};

export default function NativeStartingScreen({onPlay,onFriends,loadingProgress,onLoadingComplete,loadError='',onSoundtrackMuteChange,onBackgroundMotionChange,introUiPhase='shown'}:{onPlay:(role:SurvivorRoleId)=>void;onFriends:(role:SurvivorRoleId,name:string)=>void;loadingProgress?:number;onLoadingComplete:()=>void;loadError?:string;onSoundtrackMuteChange?:(muted:boolean)=>void;onBackgroundMotionChange?:(motion:boolean)=>void;introUiPhase?:'hidden'|'revealing'|'shown'}){
 const {width,height}=useWindowDimensions(),safe=useSafeAreaInsets();
 const [fontsLoaded,fontError]=useFonts(menuFonts);
 const [profile,setProfile]=useState(DEFAULT_START_PROFILE),[loaded,setLoaded]=useState(false),[reduced,setReduced]=useState(true),[notice,setNotice]=useState('');
 const writes=useRef(Promise.resolve());
 // The music now belongs to NativeEntryFlow and persists when the intro
 // transitions into this menu. This screen must not create a second player.
 useEffect(()=>{let live=true;void AsyncStorage.getItem(START_PROFILE_KEY).then(text=>{if(live)setProfile(readStartProfile(text))}).catch(()=>{if(live)setNotice('Your survivor preferences could not be read.')}).finally(()=>{if(live)setLoaded(true)});return()=>{live=false}},[]);
 useEffect(()=>{let live=true,changed=false;void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(live&&!changed)setReduced(value)}).catch(()=>{});const subscription=AccessibilityInfo.addEventListener('reduceMotionChanged',value=>{changed=true;setReduced(value)});return()=>{live=false;subscription.remove()}},[]);
 const save=(next:StartProfile)=>{setProfile(next);onSoundtrackMuteChange?.(next.muted);onBackgroundMotionChange?.(next.motion);writes.current=writes.current.then(()=>AsyncStorage.setItem(START_PROFILE_KEY,JSON.stringify(next))).catch(()=>setNotice('Your preferences could not be saved on this device.'))};
 // Keep the approved poster visible until the bundled face is ready, avoiding a
 // one-frame system-font menu. A font error still opens the usable fallback UI.
 if(!fontsLoaded&&!fontError)return <View pointerEvents="none" style={{flex:1}}/>;
 return <View style={{flex:1}}><StatusBar hidden/><StartingScreen width={width} height={height} safe={safe} profile={profile} onProfile={save} onPlay={()=>onPlay(profile.role)} onFriends={()=>onFriends(profile.role,profile.name)} busy={!loaded||loadingProgress!==undefined} loadingProgress={loadingProgress} reducedMotion={reduced||!profile.motion} introUiPhase={introUiPhase} transparentBackground onLoadingComplete={onLoadingComplete} notice={loadError||notice} artwork={menuArtwork} fontFamily={fontsLoaded?START_SCREEN_MENU_FONT:Platform.OS==='ios'?'Georgia':'serif'} portrait={profile.role==='hunter'?require('../public/survival/hunter-v1/portrait.png'):profile.role==='engineer'?require('../public/survival/engineer-v2/portrait.webp'):require('../public/survival/starting-screen-ui-v2/survivor-profile.png')}
  background={null}
  shade={<Canvas pointerEvents="none" style={StyleSheet.absoluteFill}><Rect x={0} y={0} width={width} height={height}><LinearGradient start={vec(0,0)} end={vec(width,0)} colors={['#05191b00','#05191b00','#05191b38','#05191bc4']} positions={[0,.58,.71,1]}/></Rect><Rect x={0} y={0} width={width} height={height}><LinearGradient start={vec(0,height)} end={vec(0,height*.74)} colors={['#06191be0','#06191b00']}/></Rect></Canvas>}/></View>;
}

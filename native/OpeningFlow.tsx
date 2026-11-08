import React,{useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,ActivityIndicator,Animated,AppState,Easing,Image,Platform,Pressable,StatusBar,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Canvas,LinearGradient,Rect,vec} from '@shopify/react-native-skia';
import {useVideoPlayer,VideoView} from 'expo-video';
import {useAudioPlayer,useAudioPlayerStatus,setAudioModeAsync} from 'expo-audio';

// These are short valid placeholder assets until the user's finished 60-second
// MP4 and separate soundtrack MP3 replace them at the exact same paths.
// Keeping static require() calls lets Expo bundle both files for offline iOS.
const introSource=require('../public/previews/the-reclamation/intro.mp4');
const soundtrackSource=require('../public/previews/the-reclamation/soundtrack.mp3');
const cover=require('../public/previews/dawn-camp/start-scene-poster.jpg');
const logo=require('../public/survival/starting-screen-ui-v2/humans-remain-logo.png');

type Props={onComplete:()=>void};
type Phase='welcome'|'cinematic';

export default function NativeOpeningFlow({onComplete}:Props){
 const [phase,setPhase]=useState<Phase>('welcome');
 const [reduced,setReduced]=useState(false);
 const opacity=useRef(new Animated.Value(1)).current;
 const transitioning=useRef(false);
 const insets=useSafeAreaInsets();
 const {width,height}=useWindowDimensions();

 useEffect(()=>{
  let mounted=true;
  AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(mounted)setReduced(value)}).catch(()=>{});
  const sub=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduced);
  return()=>{mounted=false;sub.remove()};
 },[]);

 const change=(next:'cinematic'|'menu')=>{
  if(transitioning.current)return;
  transitioning.current=true;
  Animated.timing(opacity,{toValue:0,duration:reduced?0:320,easing:Easing.inOut(Easing.cubic),useNativeDriver:true}).start(({finished})=>{
   if(!finished){transitioning.current=false;return}
   if(next==='menu'){onComplete();return}
   setPhase('cinematic');
   Animated.timing(opacity,{toValue:1,duration:reduced?0:420,easing:Easing.inOut(Easing.cubic),useNativeDriver:true}).start(()=>{transitioning.current=false});
  });
 };

 return <Animated.View style={[s.screen,{opacity}]}><StatusBar hidden/>
  {phase==='welcome'
   ?<Welcome width={width} height={height} insets={insets} onWatch={()=>change('cinematic')} onContinue={()=>change('menu')}/>
   :<Cinematic insets={insets} onDone={()=>change('menu')} onBack={()=>change('menu')}/>}
 </Animated.View>;
}

function Welcome({width,height,insets,onWatch,onContinue}:{width:number;height:number;insets:{top:number;bottom:number;left:number;right:number};onWatch:()=>void;onContinue:()=>void}){
 const portrait=height>width;
 const edge=Math.max(18,Math.min(width,height)*.052);
 const logoWidth=Math.min(width*(portrait?.72:.40),500);
 return <View style={s.screen}>
  <Image accessibilityIgnoresInvertColors source={cover} resizeMode="cover" style={StyleSheet.absoluteFill}/>
  <View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:'#03131b99'}]}/>
  <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
   <Rect x={0} y={0} width={width} height={height}>
    <LinearGradient start={vec(0,0)} end={vec(0,height)} colors={['#07151b60','#03121b1c','#020a0fef']} positions={[0,.50,1]}/>
   </Rect>
   <Rect x={0} y={0} width={width} height={height}>
    <LinearGradient start={vec(0,0)} end={vec(width,0)} colors={['#06151aaf','#071b1a00','#06151aaf']} positions={[0,.5,1]}/>
   </Rect>
  </Canvas>
  <View pointerEvents="none" style={[s.cornerLine,{top:insets.top+edge,left:insets.left+edge,right:insets.right+edge}]}/>
  <View style={[s.welcome,{paddingTop:insets.top+12,paddingBottom:insets.bottom+10,paddingLeft:insets.left+edge,paddingRight:insets.right+edge}]}>
   <Text style={s.eyebrow}>THE RECLAMATION</Text>
   <Image accessibilityLabel="Humans Remain" source={logo} resizeMode="contain" style={{width:logoWidth,height:Math.min(130,logoWidth*.44)}}/>
   <Text style={[s.tagline,{fontSize:portrait?12:14}]}>THE WORLD WAS TAKEN. WE ARE STILL HERE.</Text>
   <View pointerEvents="none" style={s.divider}/>
   <View style={[s.buttons,portrait&&s.buttonsPortrait]}>
    <Pressable accessibilityRole="button" accessibilityLabel="Watch the one-minute story introduction" onPress={onWatch} style={({pressed})=>[s.button,s.primaryButton,pressed&&s.pressed]}>
     <Text style={s.primaryText}>▶  WATCH INTRO</Text>
     <Text style={s.buttonSub}>THE STORY SO FAR  ·  60 SECONDS</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Continue to main menu" onPress={onContinue} style={({pressed})=>[s.button,s.secondaryButton,pressed&&s.pressed]}>
     <Text style={s.secondaryText}>CONTINUE  →</Text>
     <Text style={s.buttonSub}>GO TO MAIN MENU</Text>
    </Pressable>
   </View>
  </View>
  <Text pointerEvents="none" style={[s.footer,{bottom:insets.bottom+edge*.5}]}>SURVIVE THE DAY. DEFEND THE NIGHT.</Text>
 </View>;
}

function Cinematic({insets,onDone,onBack}:{insets:{top:number;bottom:number;left:number;right:number};onDone:()=>void;onBack:()=>void}){
 const video=useVideoPlayer(introSource,p=>{p.loop=false;p.muted=false;p.staysActiveInBackground=false;p.timeUpdateEventInterval=1});
 const soundtrack=useAudioPlayer(soundtrackSource);
 const soundStatus=useAudioPlayerStatus(soundtrack);
 const [state,setState]=useState<'loading'|'playing'|'unavailable'|'error'>('loading');
 const [videoReady,setVideoReady]=useState(video.status==='readyToPlay');
 const [audioSessionReady,setAudioSessionReady]=useState(false);
 const [firstFrame,setFirstFrame]=useState(false);
 const started=useRef(false),leaving=useRef(false),firstPlayback=useRef(true),seeking=useRef(false);
 const stop=()=>{
  video.pause();
  soundtrack.pause();
 };
 const leave=()=>{
  if(leaving.current)return;
  leaving.current=true;
  stop();
  onDone();
 };
 const leaveBack=()=>{
  if(leaving.current)return;
  leaving.current=true;
  stop();
  onBack();
 };

 // Preload the MP3 before the MP4 is allowed to start. The video already
 // carries the narration; the independent MP3 supplies only the music bed.
 useEffect(()=>{
  soundtrack.loop=false;
  soundtrack.volume=.72;
  let live=true;
  void setAudioModeAsync({playsInSilentMode:true,shouldPlayInBackground:false,interruptionMode:'mixWithOthers'})
   .then(()=>{if(live)setAudioSessionReady(true)})
   .catch(()=>{if(live)setState('error')});
  return()=>{live=false;soundtrack.pause()};
 },[soundtrack]);

 useEffect(()=>{
  const status=video.addListener('statusChange',event=>{
   if(event.status==='readyToPlay')setVideoReady(true);
   else if(event.status==='error'){stop();setState('error')}
  });
  const playback=video.addListener('playingChange',event=>{
   if(!event.isPlaying){soundtrack.pause();return}
   if(leaving.current)return;
   setState('playing');
   // This event is emitted when the native video actually starts, rather
   // than when a button is tapped or when the player is still buffering.
   if(firstPlayback.current){
    firstPlayback.current=false;
    soundtrack.play();
   }else{
    soundtrack.pause();
    void soundtrack.seekTo(video.currentTime).then(()=>{
     if(!leaving.current&&video.playing&&AppState.currentState==='active')soundtrack.play();
    }).catch(()=>setState('error'));
   }
  });
  const progress=video.addListener('timeUpdate',event=>{
   if(leaving.current||!video.playing||!soundtrack.playing||seeking.current)return;
   // Independent decoders cannot be guaranteed sample-perfect. Correct
   // larger drift, without frequent seeks that would cause audible clicks.
   const drift=event.currentTime-soundtrack.currentTime;
   if(Math.abs(drift)>.45&&event.currentTime<video.duration-1){
    seeking.current=true;
    void soundtrack.seekTo(event.currentTime).catch(()=>{}).finally(()=>{seeking.current=false});
   }
  });
  const ended=video.addListener('playToEnd',leave);
  const app=AppState.addEventListener('change',next=>{
   if(next!=='active')stop();
   else if(started.current&&!leaving.current)video.play();
  });
  return()=>{status.remove();playback.remove();progress.remove();ended.remove();app.remove();stop()};
 },[video,soundtrack]);

 useEffect(()=>{
  if(started.current||leaving.current||state==='error'||state==='unavailable')return;
  if(!videoReady||!soundStatus.isLoaded||!audioSessionReady)return;
  // The committed 1-second video is only a placeholder until replaced.
  if(video.duration>0&&video.duration<10){setState('unavailable');return}
  started.current=true;
  // Reset the soundtrack before releasing the video player. As soon as the
  // video reports playingChange(true), begin the preloaded music.
  void soundtrack.seekTo(0).then(()=>{
   if(!leaving.current){video.currentTime=0;video.play()}
  }).catch(()=>setState('error'));
 },[videoReady,soundStatus.isLoaded,audioSessionReady,video,soundtrack,state]);

 useEffect(()=>{
  if(soundStatus.error&&!started.current)setState('error');
 },[soundStatus.error]);

 return <View style={s.screen}>
  <Image source={cover} resizeMode="cover" style={StyleSheet.absoluteFill}/>
  <View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:'#02090dc9'}]}/>
  <VideoView player={video} contentFit="contain" nativeControls={false} allowsPictureInPicture={false} fullscreenOptions={{enable:false}} onFirstFrameRender={()=>setFirstFrame(true)} style={[StyleSheet.absoluteFill,{opacity:firstFrame?1:0,backgroundColor:'#020a0c'}]}/>
  <Pressable accessibilityRole="button" accessibilityLabel="Skip introduction" onPress={leave} style={({pressed})=>[s.skip,{top:insets.top+16,right:insets.right+20},pressed&&s.pressed]}><Text style={s.skipText}>SKIP  »</Text></Pressable>
  {state!=='playing'&&<View style={s.cinematicMessage}>
   {state==='loading'?<><ActivityIndicator size="small" color="#eac48b"/><Text style={s.message}>PREPARING THE RECLAMATION…</Text></>
   :<><Text style={s.messageTitle}>{state==='unavailable'?'THE RECLAMATION':'INTRO UNAVAILABLE'}</Text>
     <Text style={s.message}>{state==='unavailable'?'Your 60-second cinematic is not installed yet. Replace intro.mp4 and soundtrack.mp3 in GitHub.':'The video or soundtrack could not be played on this device.'}</Text>
     <Pressable accessibilityRole="button" onPress={leaveBack} style={s.messageButton}><Text style={s.secondaryText}>CONTINUE TO MENU  →</Text></Pressable></>}
  </View>}
 </View>;
}

const s=StyleSheet.create({
 screen:{flex:1,backgroundColor:'#061117',overflow:'hidden'},
 welcome:{flex:1,alignItems:'center',justifyContent:'center',gap:10},
 eyebrow:{fontSize:12,letterSpacing:5,fontWeight:'700',color:'#cba477',textAlign:'center'},
 tagline:{color:'#e5d6be',letterSpacing:2,fontWeight:'600',textAlign:'center',marginTop:-5},
 divider:{height:1,width:120,backgroundColor:'#b88d60a6',marginTop:8,marginBottom:8},
 buttons:{flexDirection:'row',justifyContent:'center',gap:14,marginTop:5},
 buttonsPortrait:{flexDirection:'column'},
 button:{minWidth:205,minHeight:60,paddingHorizontal:18,paddingVertical:9,borderRadius:7,borderWidth:1,alignItems:'center',justifyContent:'center',gap:5},
 primaryButton:{backgroundColor:'#b77c42e8',borderColor:'#edc592'},
 secondaryButton:{backgroundColor:'#071d24e0',borderColor:'#b49365'},
 pressed:{opacity:.78},
 primaryText:{fontSize:15,fontWeight:'800',color:'#130f0d',letterSpacing:1.3},
 secondaryText:{fontSize:15,fontWeight:'800',color:'#f3d9ac',letterSpacing:1.3},
 buttonSub:{fontSize:9,letterSpacing:1.2,color:'#e3d2b5',fontWeight:'600'},
 footer:{position:'absolute',alignSelf:'center',fontSize:10,color:'#b1a997',letterSpacing:2.3},
 cornerLine:{position:'absolute',height:1,backgroundColor:'#b58b5d4d'},
 skip:{position:'absolute',minHeight:48,minWidth:88,alignItems:'center',justifyContent:'center',paddingHorizontal:16,borderWidth:1,borderColor:'#b59b7680',borderRadius:6,backgroundColor:'#06141ac9'},
 skipText:{fontSize:13,fontWeight:'800',letterSpacing:1.8,color:'#f2d6a7'},
 cinematicMessage:{position:'absolute',top:0,right:0,bottom:0,left:0,alignItems:'center',justifyContent:'center',gap:17,paddingHorizontal:30},
 messageTitle:{fontSize:24,color:'#f2d6a7',letterSpacing:3,fontFamily:Platform.OS==='ios'?'Georgia':'serif',fontWeight:'700'},
 message:{fontSize:14,lineHeight:22,color:'#e0d1bc',textAlign:'center',maxWidth:520},
 messageButton:{paddingVertical:13,paddingHorizontal:26,borderWidth:1,borderColor:'#b49365',backgroundColor:'#071d24e0',borderRadius:6}
});

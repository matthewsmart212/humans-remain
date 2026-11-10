import React,{useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,AppState,Easing,Image,Platform,Pressable,StatusBar,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Canvas,LinearGradient,Rect,vec} from '@shopify/react-native-skia';
import {useVideoPlayer,VideoView} from 'expo-video';
import type {AudioPlayer} from 'expo-audio';
import {INTRO_TITLE_TRANSITION_MS,INTRO_BLACKOUT_MS,INTRO_LOGO_FADE_MS,introMusicTime} from './intro-transition';

// The movie contains spoken narration; NativeEntryFlow owns the music and
// preloads the matching menu video behind the final frames of this movie.
const introSource=require('../public/previews/the-reclamation/intro.mp4');
const cover=require('../public/previews/dawn-camp/start-scene-poster.jpg');
const logo=require('../public/survival/starting-screen-ui-v2/humans-remain-logo.png');

type Props={
 onComplete:(reason:'natural'|'skip')=>void;
 onPrepareMenu:()=>void;
 onUiReveal:()=>void;
 onContinueSelected:()=>void;
 onWatchSelected:()=>void;
 soundtrack:AudioPlayer;
 soundtrackReady:boolean;
 soundtrackAllowed:boolean;
};
type Phase='welcome'|'transition'|'cinematic';

export default function NativeOpeningFlow({onComplete,onPrepareMenu,onUiReveal,onContinueSelected,onWatchSelected,soundtrack,soundtrackReady,soundtrackAllowed}:Props){
 const [phase,setPhase]=useState<Phase>('welcome');
 const [welcomeVisible,setWelcomeVisible]=useState(true);
 const [reduced,setReduced]=useState(false);
 const welcomeOpacity=useRef(new Animated.Value(1)).current;
 const transitioning=useRef(false),watchPressed=useRef(false);
 const insets=useSafeAreaInsets();
 const {width,height}=useWindowDimensions();

 useEffect(()=>{
  let mounted=true;
  AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(mounted)setReduced(value)}).catch(()=>{});
  const sub=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduced);
  return()=>{mounted=false;sub.remove()};
 },[]);

 // Keep the actual title screen in front until the first frame of the intro
 // is decoded. Fading to transparent instead of black avoids the old flash.
 const revealCinematic=()=>{
  if(transitioning.current)return;
  transitioning.current=true;
  Animated.timing(welcomeOpacity,{toValue:0,duration:reduced?0:80,easing:Easing.inOut(Easing.cubic),useNativeDriver:true}).start(({finished})=>{
   if(finished)setWelcomeVisible(false);
  });
 };

 return <View style={s.screen}><StatusBar hidden/>
  <Cinematic active={phase==='cinematic'}
    insets={insets}
    soundtrack={soundtrack}
    soundtrackReady={soundtrackReady}
    soundtrackAllowed={soundtrackAllowed}
    onFirstFrame={revealCinematic}
    onPrepareMenu={onPrepareMenu}
    onUiReveal={onUiReveal}
    onDone={onComplete}/>
  {welcomeVisible&&<Animated.View pointerEvents={phase==='welcome'?'auto':'none'} style={[StyleSheet.absoluteFill,{opacity:welcomeOpacity}]}>
   <Welcome width={width} height={height} insets={insets} transitioning={phase==='transition'} reducedMotion={reduced}
      onWatch={()=>{if(watchPressed.current)return;watchPressed.current=true;onWatchSelected();setPhase('transition')}}
      onTransitionComplete={()=>setPhase('cinematic')}
      onContinue={onContinueSelected}/>
  </Animated.View>}
 </View>;
}

function Welcome({width,height,insets,onWatch,onTransitionComplete,onContinue,transitioning,reducedMotion}:{
 width:number;height:number;insets:{top:number;bottom:number;left:number;right:number};
 onWatch:()=>void;onTransitionComplete:()=>void;onContinue:()=>void;transitioning:boolean;reducedMotion:boolean;
}){
 const portrait=height>width;
 const edge=Math.max(18,Math.min(width,height)*.052);
 const logoWidth=Math.min(width*(portrait?.72:.40),500);
 const [logoTarget,setLogoTarget]=useState({x:0,y:0});
 const backdropBlack=useRef(new Animated.Value(0)).current;
 const buttonsOut=useRef(new Animated.Value(1)).current;
 const detailsOut=useRef(new Animated.Value(1)).current;
 const cornersOut=useRef(new Animated.Value(1)).current;
 const logoMove=useRef(new Animated.Value(0)).current;
 const logoFade=useRef(new Animated.Value(1)).current;
 const finishTransition=useRef(onTransitionComplete);
 finishTransition.current=onTransitionComplete;
 useEffect(()=>{
  if(!transitioning)return;
  // Every animated component keeps its original layout until the four seconds
  // are over. Black reaches full opacity by 3s; only the centred logo remains.
  const animation=Animated.parallel([
   Animated.timing(backdropBlack,{toValue:1,duration:INTRO_BLACKOUT_MS,easing:Easing.inOut(Easing.cubic),useNativeDriver:true}),
   Animated.timing(buttonsOut,{toValue:0,duration:reducedMotion?650:1550,easing:Easing.in(Easing.cubic),useNativeDriver:true}),
   Animated.sequence([Animated.delay(260),Animated.timing(detailsOut,{toValue:0,duration:reducedMotion?650:2180,easing:Easing.inOut(Easing.cubic),useNativeDriver:true})]),
   Animated.timing(cornersOut,{toValue:0,duration:1300,easing:Easing.in(Easing.quad),useNativeDriver:true}),
   Animated.timing(logoMove,{toValue:1,duration:reducedMotion?1000:INTRO_BLACKOUT_MS,easing:Easing.inOut(Easing.cubic),useNativeDriver:true}),
   Animated.sequence([Animated.delay(INTRO_BLACKOUT_MS),Animated.timing(logoFade,{toValue:0,duration:INTRO_LOGO_FADE_MS,easing:Easing.inOut(Easing.cubic),useNativeDriver:true})])
  ]);
  animation.start(({finished})=>{if(finished)finishTransition.current()});
  return()=>animation.stop();
 },[transitioning,reducedMotion,backdropBlack,buttonsOut,detailsOut,cornersOut,logoMove,logoFade]);
 const centreLogo={
  opacity:logoFade,
  transform:[
   {translateX:logoMove.interpolate({inputRange:[0,1],outputRange:[0,logoTarget.x]})},
   {translateY:logoMove.interpolate({inputRange:[0,1],outputRange:[0,logoTarget.y]})},
   {scale:logoMove.interpolate({inputRange:[0,.73,1],outputRange:[1,1.115,1.07]})}
  ]
 };
 const aura=logoMove.interpolate({inputRange:[0,.3,.78,1],outputRange:[0,.05,.2,.17]});
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
  <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:'#000000',opacity:backdropBlack}]}/>
  <Animated.View pointerEvents="none" style={[s.cornerLine,{top:insets.top+edge,left:insets.left+edge,right:insets.right+edge,opacity:cornersOut}]}/>
  <View style={[s.welcome,{paddingTop:insets.top+12,paddingBottom:insets.bottom+10,paddingLeft:insets.left+edge,paddingRight:insets.right+edge}]}>
   <Animated.Text style={[s.eyebrow,{opacity:detailsOut}]}>THE RECLAMATION</Animated.Text>
   <Animated.View onLayout={event=>{
    const bounds=event.nativeEvent.layout;
    const next={x:width/2-bounds.x-bounds.width/2,y:height/2-bounds.y-bounds.height/2};
    setLogoTarget(old=>old.x===next.x&&old.y===next.y?old:next);
   }} style={[{width:logoWidth,height:Math.min(130,logoWidth*.44),alignItems:'center',justifyContent:'center'},centreLogo]}>
    <Animated.View pointerEvents="none" style={[s.logoHalo,{opacity:aura}]}/>
    <Image accessibilityLabel="Humans Remain" source={logo} resizeMode="contain" style={{width:'100%',height:'100%'}}/>
   </Animated.View>
   <Animated.Text style={[s.tagline,{fontSize:portrait?12:14,opacity:detailsOut}]}>THE WORLD WAS TAKEN. WE ARE STILL HERE.</Animated.Text>
   <Animated.View pointerEvents="none" style={[s.divider,{opacity:detailsOut}]}/>
   <Animated.View pointerEvents={transitioning?'none':'auto'} style={[s.buttons,portrait&&s.buttonsPortrait,{opacity:buttonsOut,transform:[{translateY:buttonsOut.interpolate({inputRange:[0,1],outputRange:[22,0]})}]}]}>
    <Pressable accessibilityRole="button" accessibilityLabel="Watch the one-minute story introduction" disabled={transitioning} onPress={onWatch} style={({pressed})=>[s.button,s.primaryButton,pressed&&s.pressed]}>
     <Text style={s.primaryText}>▶  WATCH INTRO</Text>
     <Text style={s.buttonSub}>THE STORY SO FAR  ·  60 SECONDS</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Continue to main menu" disabled={transitioning} onPress={onContinue} style={({pressed})=>[s.button,s.secondaryButton,pressed&&s.pressed]}>
     <Text style={s.secondaryText}>CONTINUE  →</Text>
     <Text style={s.buttonSub}>GO TO MAIN MENU</Text>
    </Pressable>
   </Animated.View>
  </View>
  <Animated.Text pointerEvents="none" style={[s.footer,{bottom:insets.bottom+edge*.5,opacity:cornersOut}]}>SURVIVE THE DAY. DEFEND THE NIGHT.</Animated.Text>
 </View>;
}

function Cinematic({active,insets,onDone,onFirstFrame,onPrepareMenu,onUiReveal,soundtrack,soundtrackReady,soundtrackAllowed}:{
 active:boolean;
 insets:{top:number;bottom:number;left:number;right:number};
 onDone:(reason:'natural'|'skip')=>void;
 onFirstFrame:()=>void;
 onPrepareMenu:()=>void;
 onUiReveal:()=>void;
 soundtrack:AudioPlayer;
 soundtrackReady:boolean;
 soundtrackAllowed:boolean;
}){
 const video=useVideoPlayer(introSource,p=>{p.loop=false;p.muted=false;p.staysActiveInBackground=false;p.timeUpdateEventInterval=.05});
 const [state,setState]=useState<'loading'|'playing'|'unavailable'|'error'>('loading');
 const [videoReady,setVideoReady]=useState(video.status==='readyToPlay');
 const [firstFrame,setFirstFrame]=useState(false);
 const started=useRef(false),leaving=useRef(false),firstPlayback=useRef(true),seeking=useRef(false),prepared=useRef(false),uiRevealStarted=useRef(false);
 const allowed=useRef(soundtrackAllowed),activeRef=useRef(active),done=useRef(onDone),prepare=useRef(onPrepareMenu),onFrame=useRef(onFirstFrame),revealUi=useRef(onUiReveal);
 activeRef.current=active;
 allowed.current=soundtrackAllowed;
 done.current=onDone;
 prepare.current=onPrepareMenu;
 onFrame.current=onFirstFrame;
 revealUi.current=onUiReveal;
 const leave=(reason:'natural'|'skip')=>{
  if(leaving.current)return;
  leaving.current=true;
  // Keep this last decoded video frame rendered until the already-mounted
  // menu movie is playing. EntryFlow manages that handoff; no black fade.
  video.pause();
  done.current(reason);
 };

 useEffect(()=>{
  const status=video.addListener('statusChange',event=>{
   if(event.status==='readyToPlay')setVideoReady(true);
   else if(event.status==='error'){video.pause();setState('error');if(activeRef.current)onFrame.current()}
  });
  const playback=video.addListener('playingChange',event=>{
   if(!activeRef.current||!started.current)return;
   if(!event.isPlaying){
    if(!leaving.current&&!(video.duration>0&&video.currentTime>=video.duration-.75))soundtrack.pause();
    return;
   }
   if(leaving.current)return;
   setState('playing');
   if(firstPlayback.current){
    firstPlayback.current=false;
    if(allowed.current)soundtrack.play();
   }else{
    soundtrack.pause();
    void soundtrack.seekTo(introMusicTime(video.currentTime,soundtrack.duration)).then(()=>{
     if(!leaving.current&&video.playing&&allowed.current&&AppState.currentState==='active')soundtrack.play();
    }).catch(()=>setState('error'));
   }
  });
  const progress=video.addListener('timeUpdate',event=>{
   if(leaving.current)return;
   // The real menu logo, survivor bar and expedition cards animate on top of
   // the film over its last four seconds, driven by the VIDEO clock (not
   // wall-clock timers that run while decoding or the app is backgrounded).
   if(!uiRevealStarted.current&&video.duration>4&&video.duration-event.currentTime<=4){
    uiRevealStarted.current=true;
    revealUi.current();
   }
   // The user's intro ends on the last frame of start-scene.mp4's loop.
   // Cue that loop's first frame slightly before the final intro frame.
   if(!prepared.current&&video.duration>0&&video.duration-event.currentTime<=.12){
    prepared.current=true;
    prepare.current();
   }
   if(!video.playing||!soundtrack.playing||seeking.current)return;
   const expected=introMusicTime(event.currentTime,soundtrack.duration);
   const drift=expected-soundtrack.currentTime;
   if(Math.abs(drift)>.45&&event.currentTime<video.duration-1){
    seeking.current=true;
    void soundtrack.seekTo(expected).catch(()=>{}).finally(()=>{seeking.current=false});
   }
  });
  const ended=video.addListener('playToEnd',()=>leave('natural'));
  const app=AppState.addEventListener('change',next=>{
   if(next!=='active')video.pause();
   else if(activeRef.current&&started.current&&!leaving.current&&video.status==='readyToPlay')video.play();
  });
  return()=>{status.remove();playback.remove();progress.remove();ended.remove();app.remove();video.pause()};
 },[video,soundtrack]);

 useEffect(()=>{
  if(!soundtrackAllowed){soundtrack.pause();return}
  if(active&&video.playing&&!leaving.current&&!soundtrack.playing)soundtrack.play();
 },[active,soundtrackAllowed,video,soundtrack]);

 useEffect(()=>{
  if(!active||started.current||leaving.current)return;
  if(state==='error'||state==='unavailable'){onFrame.current();return}
  if(!videoReady)return;
  if(video.duration>0&&video.duration<10){setState('unavailable');onFrame.current();return}
  // The movie is already preloaded; start it only after the full 4-second
  // title sequence. Music began on Watch Intro and must not be reset here.
  started.current=true;
  video.currentTime=0;
  video.play();
 },[active,videoReady,video,state]);

 return <View style={s.screen}>
  <Image source={cover} resizeMode="cover" style={StyleSheet.absoluteFill}/>
  <View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:'#02090dc9'}]}/>
  <VideoView player={video} contentFit="cover" nativeControls={false} allowsPictureInPicture={false} fullscreenOptions={{enable:false}} onFirstFrameRender={()=>{setFirstFrame(true);if(activeRef.current)onFrame.current()}} style={[StyleSheet.absoluteFill,{opacity:firstFrame?1:0,backgroundColor:'#020a0c'}]}/>
  {active&&<Pressable accessibilityRole="button" accessibilityLabel="Skip introduction" onPress={()=>leave('skip')} style={({pressed})=>[s.skip,{top:insets.top+16,right:insets.right+20},pressed&&s.pressed]}><Text style={s.skipText}>SKIP  »</Text></Pressable>}
  {active&&(state==='error'||state==='unavailable')&&<View style={s.cinematicMessage}>
    <Text style={s.messageTitle}>INTRO UNAVAILABLE</Text>
    <Text style={s.message}>The intro video could not be played on this device.</Text>
    <Pressable accessibilityRole="button" onPress={()=>leave('skip')} style={s.messageButton}><Text style={s.secondaryText}>CONTINUE TO MENU  →</Text></Pressable>
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
 logoHalo:{position:'absolute',width:'125%',height:'90%',borderRadius:80,backgroundColor:'#c99e5e',shadowColor:'#f3bf76',shadowOpacity:.75,shadowRadius:42,shadowOffset:{width:0,height:0}},
 skip:{position:'absolute',minHeight:48,minWidth:88,alignItems:'center',justifyContent:'center',paddingHorizontal:16,borderWidth:1,borderColor:'#b59b7680',borderRadius:6,backgroundColor:'#06141ac9'},
 skipText:{fontSize:13,fontWeight:'800',letterSpacing:1.8,color:'#f2d6a7'},
 cinematicMessage:{position:'absolute',top:0,right:0,bottom:0,left:0,alignItems:'center',justifyContent:'center',gap:17,paddingHorizontal:30},
 messageTitle:{fontSize:24,color:'#f2d6a7',letterSpacing:3,fontFamily:Platform.OS==='ios'?'Georgia':'serif',fontWeight:'700'},
 message:{fontSize:14,lineHeight:22,color:'#e0d1bc',textAlign:'center',maxWidth:520},
 messageButton:{paddingVertical:13,paddingHorizontal:26,borderWidth:1,borderColor:'#b49365',backgroundColor:'#071d24e0',borderRadius:6}
});

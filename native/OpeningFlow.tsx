import React,{useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,AppState,Easing,Image,Platform,Pressable,StatusBar,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Canvas,LinearGradient,Rect,vec} from '@shopify/react-native-skia';
import {useVideoPlayer,VideoView} from 'expo-video';
import {INTRO_TITLE_TRANSITION_MS,INTRO_BLACKOUT_MS,INTRO_LOGO_FADE_MS} from './intro-transition';

// The movie contains spoken narration; NativeEntryFlow owns the music and
// preloads the matching menu video behind the final frames of this movie.
const introSource=require('../public/previews/the-reclamation/intro.mp4');
const cover=require('../public/previews/dawn-camp/start-scene-poster.jpg');
const logo=require('../public/survival/starting-screen-ui-v2/humans-remain-logo.png');
const skipArtwork=require('../public/survival/intro-ui/skip.webp');
// Cut from the approved intro mock-up; both PNGs retain their transparent
// silhouettes, metal corner brackets, engraved text and warm/cool glow.
const watchIntroButton=require('../public/previews/the-reclamation/buttons/watch-intro.png');
const continueButton=require('../public/previews/the-reclamation/buttons/continue.png');

type Props={
 onComplete:(reason:'natural'|'skip')=>void;
 onPrepareMenu:()=>void;
 onUiReveal:()=>void;
 onContinueSelected:()=>void;
 onContinueComplete:()=>void;
 onWatchSelected:()=>void;
 onFilmPlaying:()=>void;
};
type Phase='welcome'|'transition'|'cinematic';

export default function NativeOpeningFlow({onComplete,onPrepareMenu,onUiReveal,onContinueSelected,onContinueComplete,onWatchSelected,onFilmPlaying}:Props){
 const [phase,setPhase]=useState<Phase>('welcome');
 const [welcomeVisible,setWelcomeVisible]=useState(true);
 const [reduced,setReduced]=useState(false);
 const welcomeOpacity=useRef(new Animated.Value(1)).current;
 const transitioning=useRef(false),watchPressed=useRef(false);
 const selection=useRef<'watch'|'continue'>('watch');
 const choose=(choice:'watch'|'continue')=>{
  if(watchPressed.current)return;
  watchPressed.current=true;selection.current=choice;
  if(choice==='watch')onWatchSelected();else onContinueSelected();
  setPhase('transition');
 };
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
    onFirstFrame={revealCinematic}
    onFilmPlaying={onFilmPlaying}
    onPrepareMenu={onPrepareMenu}
    onUiReveal={onUiReveal}
    onDone={onComplete}/>
  {welcomeVisible&&<Animated.View pointerEvents={phase==='welcome'?'auto':'none'} style={[StyleSheet.absoluteFill,{opacity:welcomeOpacity}]}>
   <Welcome width={width} height={height} insets={insets} transitioning={phase==='transition'} reducedMotion={reduced}
      onWatch={()=>choose('watch')}
      onTransitionComplete={()=>{if(selection.current==='continue')onContinueComplete();else setPhase('cinematic')}}
      onContinue={()=>choose('continue')}/>
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
 // Size the two real plaques together so both remain fully within the
 // landscape iPhone safe area; stack them on portrait devices.
 const usableWidth=Math.max(1,width-insets.left-insets.right-edge*2);
 const usableHeight=Math.max(1,height-insets.top-insets.bottom);
 const buttonScale=portrait
  ?Math.min(.5,usableWidth*.88/426,usableHeight*.24/160)
  :Math.min(.5,(usableWidth-14)/824,usableHeight*.31/160);
 const [logoTarget,setLogoTarget]=useState({x:0,y:0});
 const [logoMeasured,setLogoMeasured]=useState(false);
 const [openingFinished,setOpeningFinished]=useState(false);
 // Start with the *same* centered black logo pose used at the end of the
 // outgoing title animation. Reversing these values avoids a separate splash
 // logo, preventing a one-frame size/position jump on iOS.
 const backdropBlack=useRef(new Animated.Value(1)).current;
 const buttonsOut=useRef(new Animated.Value(0)).current;
 const detailsOut=useRef(new Animated.Value(0)).current;
 const cornersOut=useRef(new Animated.Value(0)).current;
 const logoMove=useRef(new Animated.Value(1)).current;
 const logoFade=useRef(new Animated.Value(0)).current;
 const finishTransition=useRef(onTransitionComplete);
 finishTransition.current=onTransitionComplete;
 useEffect(()=>{
  if(!logoMeasured)return;
  if(reducedMotion){
   backdropBlack.setValue(0);
   logoMove.setValue(0);
   logoFade.setValue(1);
   buttonsOut.setValue(1);
   detailsOut.setValue(1);
   cornersOut.setValue(1);
   setOpeningFinished(true);
   return;
  }
  // Four-second reverse of Watch Intro: the centered logo comes up on
  // black, travels home while the campsite appears, then the other UI fades
  // in. Start only after layout supplies the exact translation vector.
  const opening=Animated.parallel([
   Animated.timing(logoFade,{toValue:1,duration:INTRO_LOGO_FADE_MS,easing:Easing.inOut(Easing.cubic),useNativeDriver:true}),
   Animated.sequence([Animated.delay(INTRO_LOGO_FADE_MS),Animated.timing(logoMove,{toValue:0,duration:INTRO_BLACKOUT_MS-400,easing:Easing.inOut(Easing.cubic),useNativeDriver:true})]),
   Animated.sequence([Animated.delay(INTRO_LOGO_FADE_MS),Animated.timing(backdropBlack,{toValue:0,duration:INTRO_BLACKOUT_MS,easing:Easing.inOut(Easing.cubic),useNativeDriver:true})]),
   Animated.sequence([Animated.delay(INTRO_TITLE_TRANSITION_MS-750),Animated.timing(detailsOut,{toValue:1,duration:300,easing:Easing.out(Easing.cubic),useNativeDriver:true})]),
   Animated.sequence([Animated.delay(INTRO_TITLE_TRANSITION_MS-600),Animated.timing(buttonsOut,{toValue:1,duration:450,easing:Easing.out(Easing.cubic),useNativeDriver:true})]),
   Animated.sequence([Animated.delay(INTRO_TITLE_TRANSITION_MS-350),Animated.timing(cornersOut,{toValue:1,duration:350,easing:Easing.out(Easing.cubic),useNativeDriver:true})])
  ]);
  opening.start(({finished})=>{if(finished)setOpeningFinished(true)});
  return()=>opening.stop();
 // Values are stable useRef instances. Measurement triggers once, and changes
 // to Reduce Motion mid-animation should not restart the opening sequence.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[logoMeasured]);
 useEffect(()=>{
  if(!transitioning)return;
  // Every animated component keeps its original layout until the four seconds
  // are over. Black reaches full opacity by 3s; only the centred logo remains.
  const animation=Animated.parallel([
   Animated.timing(backdropBlack,{toValue:1,duration:INTRO_BLACKOUT_MS,easing:Easing.inOut(Easing.cubic),useNativeDriver:true}),
   Animated.timing(buttonsOut,{toValue:0,duration:450,easing:Easing.in(Easing.cubic),useNativeDriver:true}),
   Animated.timing(detailsOut,{toValue:0,duration:300,easing:Easing.out(Easing.cubic),useNativeDriver:true}),
   Animated.timing(cornersOut,{toValue:0,duration:350,easing:Easing.in(Easing.quad),useNativeDriver:true}),
   Animated.sequence([Animated.delay(400),Animated.timing(logoMove,{toValue:1,duration:INTRO_BLACKOUT_MS-400,easing:Easing.inOut(Easing.cubic),useNativeDriver:true})]),
   Animated.sequence([Animated.delay(INTRO_TITLE_TRANSITION_MS-INTRO_LOGO_FADE_MS),Animated.timing(logoFade,{toValue:0,duration:INTRO_LOGO_FADE_MS,easing:Easing.inOut(Easing.cubic),useNativeDriver:true})])
  ]);
  animation.start(({finished})=>{if(finished)finishTransition.current()});
  return()=>animation.stop();
 },[transitioning,backdropBlack,buttonsOut,detailsOut,cornersOut,logoMove,logoFade]);
 const centreLogo={
  opacity:logoFade,
  transform:[
   {translateX:logoMove.interpolate({inputRange:[0,1],outputRange:[0,reducedMotion?0:logoTarget.x]})},
   {translateY:logoMove.interpolate({inputRange:[0,1],outputRange:[0,reducedMotion?0:logoTarget.y]})},
   {scale:logoMove.interpolate({inputRange:[0,.73,1],outputRange:reducedMotion?[1,1,1]:[1,1.115,1.07]})}
  ]
 };
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
  <Animated.View pointerEvents="none" style={[s.cornerLine,{bottom:insets.bottom+edge*.5+32,left:insets.left+edge,right:insets.right+edge,opacity:cornersOut}]}/>
  <View style={[s.welcome,{paddingTop:insets.top+12,paddingBottom:insets.bottom+10,paddingLeft:insets.left+edge,paddingRight:insets.right+edge}]}>
   <Animated.View onLayout={event=>{
    const bounds=event.nativeEvent.layout;
    const next={x:width/2-bounds.x-bounds.width/2,y:height/2-bounds.y-bounds.height/2};
    setLogoTarget(old=>old.x===next.x&&old.y===next.y?old:next);
    setLogoMeasured(true);
   }} style={[{width:logoWidth,height:Math.min(130,logoWidth*.44),alignItems:'center',justifyContent:'center'},centreLogo]}>
    <Image accessibilityLabel="Humans Remain" source={logo} resizeMode="contain" style={{width:'100%',height:'100%'}}/>
   </Animated.View>
   <Animated.Text style={[s.eyebrow,{opacity:detailsOut,marginTop:-4}]}>THE RECLAMATION</Animated.Text>
   <Animated.View pointerEvents="none" style={[s.divider,{opacity:detailsOut}]}/>
   <Animated.View pointerEvents={transitioning||!openingFinished?'none':'auto'} style={[s.buttons,portrait&&s.buttonsPortrait,{opacity:buttonsOut,transform:[{translateY:buttonsOut.interpolate({inputRange:[0,1],outputRange:[22,0]})}]}]}>
    <Pressable accessibilityRole="button" accessibilityLabel="Watch the one-minute story introduction" disabled={transitioning||!openingFinished} onPress={onWatch} style={({pressed})=>[s.artButton,{width:426*buttonScale,height:160*buttonScale},pressed&&s.pressed]}>
     <Image source={watchIntroButton} resizeMode="contain" style={s.artworkImage}/>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Continue to main menu" disabled={transitioning||!openingFinished} onPress={onContinue} style={({pressed})=>[s.artButton,{width:384*buttonScale,height:158*buttonScale},pressed&&s.pressed]}>
     <Image source={continueButton} resizeMode="contain" style={s.artworkImage}/>
    </Pressable>
   </Animated.View>
  </View>
  <Animated.Text pointerEvents="none" style={[s.footer,{bottom:insets.bottom+edge*.5,opacity:cornersOut}]}>SURVIVE THE DAY. DEFEND THE NIGHT.</Animated.Text>
 </View>;
}

function Cinematic({active,insets,onDone,onFirstFrame,onFilmPlaying,onPrepareMenu,onUiReveal}:{
 active:boolean;
 insets:{top:number;bottom:number;left:number;right:number};
 onDone:(reason:'natural'|'skip')=>void;
 onFirstFrame:()=>void;
 onFilmPlaying:()=>void;
 onPrepareMenu:()=>void;
 onUiReveal:()=>void;
}){
 const {width:screenWidth}=useWindowDimensions();
 const skipWidth=Math.min(210,Math.max(130,screenWidth*.175));
 const skipHeight=skipWidth*117/300;
 const video=useVideoPlayer(introSource,p=>{p.loop=false;p.muted=true;p.audioMixingMode='mixWithOthers';p.staysActiveInBackground=false;p.timeUpdateEventInterval=.05});
 const [state,setState]=useState<'loading'|'playing'|'unavailable'|'error'>('loading');
 const [videoReady,setVideoReady]=useState(video.status==='readyToPlay');
 const [firstFrame,setFirstFrame]=useState(false);
 // Five seconds of movie time per reveal; never show Skip in the final five.
 const skipOpacity=useRef(new Animated.Value(1)).current;
 const [skipTouchable,setSkipTouchable]=useState(true);
 const skipShown=useRef(true),skipHideAt=useRef(5),skipLocked=useRef(false);
 const started=useRef(false),leaving=useRef(false),prepared=useRef(false),uiRevealStarted=useRef(false),musicTriggered=useRef(false);
 const activeRef=useRef(active),done=useRef(onDone),prepare=useRef(onPrepareMenu),onFrame=useRef(onFirstFrame),revealUi=useRef(onUiReveal),filmPlaying=useRef(onFilmPlaying);
 activeRef.current=active;
 done.current=onDone;
 prepare.current=onPrepareMenu;
 onFrame.current=onFirstFrame;
 revealUi.current=onUiReveal;
 filmPlaying.current=onFilmPlaying;
 const setSkipShown=(visible:boolean)=>{
  if(skipShown.current===visible)return;
  skipShown.current=visible;
  setSkipTouchable(visible);
  skipOpacity.stopAnimation();
  Animated.timing(skipOpacity,{toValue:visible?1:0,duration:280,easing:Easing.inOut(Easing.quad),useNativeDriver:true}).start();
 };
 const wakeSkip=()=>{
  if(!activeRef.current||!started.current||leaving.current||skipLocked.current)return;
  if(video.duration>0&&video.duration-video.currentTime<=5)return;
  skipHideAt.current=video.currentTime+5;
  setSkipShown(true);
 };
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
   if(event.isPlaying&&!leaving.current){
    setState('playing');
    // The four-second logo animation is silent. Begin music only once
    // the actual narrated movie has entered its playing state.
    if(!musicTriggered.current){musicTriggered.current=true;filmPlaying.current()}
   }
  });
  const progress=video.addListener('timeUpdate',event=>{
   if(leaving.current)return;
   if(video.duration>0&&video.duration-event.currentTime<=5){
    skipLocked.current=true;
    setSkipShown(false);
   }else if(event.currentTime>=skipHideAt.current){
    setSkipShown(false);
   }
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
  });
  const ended=video.addListener('playToEnd',()=>leave('natural'));
  const app=AppState.addEventListener('change',next=>{
   if(next!=='active')video.pause();
   else if(activeRef.current&&started.current&&!leaving.current&&video.status==='readyToPlay')video.play();
  });
  return()=>{status.remove();playback.remove();progress.remove();ended.remove();app.remove();video.pause();skipOpacity.stopAnimation()};
 },[video,skipOpacity]);

 // All native players use the same mixing mode. The soundtrack is owned
 // solely by EntryFlow. It starts at actual movie playback and then
 // keeps playing across video buffering/stalls and the menu handoff.
 // The menu music preference applies to the MP3. Watching the film also
 // plays its narration, including when the player has muted the music.
 useEffect(()=>{video.muted=!active},[video,active]);

 // On some iPhones a paused, preloaded video can paint frame zero before the
 // four-second title animation finishes. The first-frame callback then fires
 // while the Welcome overlay is still up. Release it when playback begins,
 // otherwise that perfectly decoded video could stay hidden behind black.
 useEffect(()=>{
  if(active&&firstFrame&&state==='playing')onFrame.current();
 },[active,firstFrame,state]);

 useEffect(()=>{
  if(!active||started.current||leaving.current)return;
  if(state==='error'||state==='unavailable'){onFrame.current();return}
  if(!videoReady)return;
  if(video.duration>0&&video.duration<10){setState('unavailable');onFrame.current();return}
  // The movie is already preloaded; start it only after the full 4-second
  // title sequence. The playingChange event starts the music when the
  // movie actually begins; do not start it here while still buffering.
  started.current=true;
  video.currentTime=0;
  video.play();
 },[active,videoReady,video,state]);

 return <View style={s.screen}>
  <Image source={cover} resizeMode="cover" style={StyleSheet.absoluteFill}/>
  <View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:'#02090dc9'}]}/>
  <VideoView player={video} contentFit="cover" nativeControls={false} allowsPictureInPicture={false} fullscreenOptions={{enable:false}} onFirstFrameRender={()=>{setFirstFrame(true);if(activeRef.current)onFrame.current()}} style={[StyleSheet.absoluteFill,{opacity:firstFrame?1:0,backgroundColor:'#020a0c'}]}/>
  {active&&state==='playing'&&<Pressable accessible={false} onPress={wakeSkip} style={StyleSheet.absoluteFill}/>}
  {active&&state!=='error'&&state!=='unavailable'&&<Animated.View pointerEvents={skipTouchable?'auto':'none'} style={[s.skip,{top:insets.top+12,right:insets.right+16,width:skipWidth,height:skipHeight,opacity:skipOpacity}]}>
   <Pressable accessibilityRole="button" accessibilityLabel="Skip introduction" onPress={()=>leave('skip')} style={({pressed})=>[s.skipTouchTarget,pressed&&s.skipPressed]}>
    <Image accessibilityIgnoresInvertColors source={skipArtwork} resizeMode="contain" style={s.skipArtwork}/>
   </Pressable>
  </Animated.View>}
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
 divider:{height:1,width:120,backgroundColor:'#b88d60a6',marginTop:8,marginBottom:8},
 buttons:{flexDirection:'row',justifyContent:'center',gap:10,marginTop:5},
 buttonsPortrait:{flexDirection:'column'},
 artButton:{alignItems:'center',justifyContent:'center',backgroundColor:'transparent'},
 artworkImage:{width:'100%',height:'100%'},
 pressed:{opacity:.78},
 secondaryText:{fontSize:15,fontWeight:'800',color:'#f3d9ac',letterSpacing:1.3},
 footer:{position:'absolute',alignSelf:'center',fontSize:10,color:'#b1a997',letterSpacing:2.3},
 cornerLine:{position:'absolute',height:1,backgroundColor:'#b58b5d4d'},
 // Transparent illustrated plaque; its whole silhouette is a touch target.
 skip:{position:'absolute',minHeight:48,alignItems:'center',justifyContent:'center'},
 skipTouchTarget:{width:'100%',height:'100%',alignItems:'center',justifyContent:'center'},
 skipArtwork:{width:'100%',height:'100%'},
 skipPressed:{opacity:.82,transform:[{scale:.975}]},
 cinematicMessage:{position:'absolute',top:0,right:0,bottom:0,left:0,alignItems:'center',justifyContent:'center',gap:17,paddingHorizontal:30},
 messageTitle:{fontSize:24,color:'#f2d6a7',letterSpacing:3,fontFamily:Platform.OS==='ios'?'Georgia':'serif',fontWeight:'700'},
 message:{fontSize:14,lineHeight:22,color:'#e0d1bc',textAlign:'center',maxWidth:520},
 messageButton:{paddingVertical:13,paddingHorizontal:26,borderWidth:1,borderColor:'#b49365',backgroundColor:'#071d24e0',borderRadius:6}
});

import React,{useEffect,useRef,useState} from 'react';
import {View,Text,Pressable,TextInput,Image,ScrollView,StyleSheet,Platform,Animated,Easing,type ImageSourcePropType} from 'react-native';
import type {StartProfile} from './start-profile';
import {START_SCREEN_MENU_FONT,type StartScreenArtwork} from './start-screen-art';
import type {StartScreenIconName} from './start-screen-icons';
import ExpeditionMenu from './ExpeditionMenu';
import ExpeditionLoading from './ExpeditionLoading';
import SurvivorSelector from './SurvivorSelector';
import {survivorRole,type SurvivorRoleId} from './survivor-roles';


type Props={width:number;height:number;safe?:{top:number;bottom:number;left:number;right:number};background:React.ReactNode;shade:React.ReactNode;portrait:ImageSourcePropType;artwork:StartScreenArtwork;fontFamily?:string;profile:StartProfile;onProfile:(p:StartProfile)=>void;onPlay:()=>void;onFriends?:()=>void;onBack?:()=>void;busy?:boolean;notice?:string;playDisabled?:boolean;loadingProgress?:number;reducedMotion?:boolean;onLoadingComplete?:()=>void;introUiPhase?:'hidden'|'revealing'|'shown';transparentBackground?:boolean};
type Panel='customise'|'upgrades'|'settings'|null;
const serif=Platform.OS==='ios'?'Georgia':Platform.OS==='web'?'Georgia, serif':'serif';
const AnimatedPressable=Animated.createAnimatedComponent(Pressable);
export default function StartingScreen({width,height,safe={top:0,bottom:0,left:0,right:0},background,shade,portrait,artwork,fontFamily=START_SCREEN_MENU_FONT,profile,onProfile,onPlay,onFriends,onBack,busy=false,notice='',playDisabled=false,loadingProgress,reducedMotion=false,onLoadingComplete,introUiPhase='shown',transparentBackground=false}:Props){
 const [panel,setPanel]=useState<Panel>(null),[name,setName]=useState(profile.name),[role,setRole]=useState<SurvivorRoleId>(profile.role);
 const loading=loadingProgress!==undefined;
 const transition=useRef(new Animated.Value(loading?1:0)).current,sceneOpacity=useRef(new Animated.Value(1)).current;
 const complete=useRef(onLoadingComplete);complete.current=onLoadingComplete;
 // The exact same menu UI stays mounted across the intro's final frame.
 // Native drives this progress over the last four seconds of the film.
 const introReveal=useRef(new Animated.Value(introUiPhase==='shown'?1:0)).current;
 useEffect(()=>{
  introReveal.stopAnimation();
  if(introUiPhase==='hidden'){introReveal.setValue(0);return}
  if(introUiPhase==='shown'||reducedMotion){introReveal.setValue(1);return}
  const animation=Animated.timing(introReveal,{toValue:1,duration:4000,easing:Easing.linear,useNativeDriver:Platform.OS!=='web'});
  animation.start();
  return()=>animation.stop();
 },[introUiPhase,reducedMotion,introReveal]);
 const entrance=(start:number,end:number)=>introReveal.interpolate({inputRange:[0,start,end,1],outputRange:[0,0,1,1],extrapolate:'clamp'});
 const lift=(start:number,end:number,px:number)=>introReveal.interpolate({inputRange:[0,start,end,1],outputRange:[px,px,0,0],extrapolate:'clamp'});
 const logoEntrance={opacity:entrance(.015,.37),transform:[{translateY:lift(.015,.37,-18)}]};
 const statsEntrance={opacity:entrance(.25,.70),transform:[{translateY:lift(.25,.70,24)}]};
 const menuEntrance={opacity:entrance(.48,.985),transform:[{translateY:lift(.48,.985,32)}]};
 const controlsEntrance={opacity:entrance(.62,.96),transform:[{translateY:lift(.62,.96,-12)}]};
 const shadeEntrance={opacity:entrance(.38,.88)};
 const noticeEntrance={opacity:entrance(.83,1)};
 
 useEffect(()=>{const animation=Animated.timing(transition,{toValue:loading?1:0,duration:reducedMotion?0:420,easing:Easing.inOut(Easing.cubic),useNativeDriver:Platform.OS!=='web'});animation.start();return()=>animation.stop()},[loading,reducedMotion,transition]);
 useEffect(()=>{
  if(loadingProgress!==1){sceneOpacity.setValue(1);return}
  // The legacy stand-up atlas has been removed; enter when the world is ready.
  const animation=Animated.sequence([Animated.delay(550),Animated.timing(sceneOpacity,{toValue:0,duration:reducedMotion?0:360,easing:Easing.inOut(Easing.cubic),useNativeDriver:Platform.OS!=='web'})]);
  animation.start(({finished})=>{if(finished)complete.current?.()});return()=>animation.stop();
 },[loadingProgress===1,reducedMotion,sceneOpacity]);
 const play=()=>{if(!busy&&!loading&&!playDisabled){setPanel(null);onPlay()}};
 const portraitMode=height>width;
 const availableWidth=Math.max(1,width-safe.left-safe.right),availableHeight=Math.max(1,height-safe.top-safe.bottom);
 // The approved 1536px composition is the common artboard for web and iOS.
 const scale=portraitMode?Math.min(availableWidth/650,1):Math.min(availableWidth/1536,availableHeight/710,1.4);
 const unit=(value:number)=>value*scale;
 // One shared horizontal gutter and bottom baseline keep the HUD balanced.
 const gutter=availableWidth*.055;
 const bottomBaseline=safe.bottom+availableHeight*.056;
 // Reserve room for the lower HUD on every iPhone aspect ratio. Both menu
 // and loading panel use one identical artboard size, never the full atlas size.
 const menuWidth=portraitMode?Math.min(availableWidth*.83,420):Math.min(unit(430),availableWidth*.48);
 const maxMenuHeight=availableHeight*(portraitMode?.53:.67);
 const panelWidth=Math.min(menuWidth,maxMenuHeight*516/599);
 const panelHeight=panelWidth*599/516;
 const icon=(name:StartScreenIconName,size:number,style?:object)=><Image accessibilityIgnoresInvertColors source={artwork.icons[name]} resizeMode="contain" style={[{width:unit(size),height:unit(size)},style]}/>;
 const action=(label:string,fn:()=>void)=><Pressable accessibilityRole="button" onPress={fn} style={({pressed})=>[s.action,pressed&&s.pressed]}><Text style={s.actionText}>{label}</Text></Pressable>;
 return <Animated.View accessibilityLabel="Humans Remain starting screen" style={[s.root,{opacity:sceneOpacity,backgroundColor:transparentBackground?'transparent':'#071b1d'}]}>
  {background}<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill,shadeEntrance]}>{shade}</Animated.View>
  <Image accessible={false} pointerEvents="none" source={artwork.expeditionLoading} style={{position:'absolute',width:1,height:1,opacity:0}}/>
  <Animated.View pointerEvents="none" style={[s.logo,{left:safe.left+gutter,top:safe.top+availableHeight*.05,width:portraitMode?190:unit(216),height:portraitMode?84:unit(95)},logoEntrance]}>
   <View nativeID="start-logo-atmosphere" pointerEvents="none" style={[StyleSheet.absoluteFill,...(Platform.OS==='web'?[]:[{borderRadius:unit(28),backgroundColor:'#102e2f35',shadowColor:'#061a1c',shadowOpacity:.6,shadowRadius:unit(30)}])]} />
   <Image accessibilityLabel="Humans Remain" source={artwork.logo} resizeMode="contain" style={{width:'100%',height:'100%'}}/>
  </Animated.View>
  <AnimatedPressable accessibilityRole="switch" accessibilityLabel={profile.muted?'Unmute menu music':'Mute menu music'} accessibilityState={{checked:!profile.muted}} onPress={()=>onProfile({...profile,muted:!profile.muted})} hitSlop={6} style={[s.soundToggle,{right:safe.right+gutter+Math.max(44,unit(48))+unit(12),top:safe.top+availableHeight*.05,width:Math.max(44,unit(48)),height:Math.max(44,unit(48))},controlsEntrance]}>
   <View pointerEvents="none" style={{width:35,height:35,alignItems:'center',justifyContent:'center'}}>
    <Text style={{color:'#dfc99e',fontSize:27,fontWeight:'400',lineHeight:35}}>{profile.muted?'♩':'♫'}</Text>
   </View>
  </AnimatedPressable>
  <AnimatedPressable accessibilityRole="button" accessibilityLabel="Starting screen settings" disabled={busy||loading} onPress={()=>setPanel('settings')} hitSlop={8} style={[s.settings,{right:safe.right+gutter,top:safe.top+availableHeight*.05,width:Math.max(44,unit(48)),height:Math.max(44,unit(48))},controlsEntrance]}>{icon('settings',35)}</AnimatedPressable>
  <Animated.View style={[s.menu,{right:safe.right+gutter,bottom:portraitMode?bottomBaseline+unit(128):bottomBaseline,width:menuWidth},menuEntrance]}>
   <View style={{width:panelWidth,height:panelHeight,alignSelf:'flex-end'}}>
   <View nativeID="expedition-menu-atmosphere" pointerEvents="none" style={{position:'absolute',top:0,bottom:0,left:0,right:0,...(Platform.OS==='web'?{}:{top:-unit(18),bottom:-unit(18),left:-unit(18),right:-unit(18),borderRadius:unit(28),backgroundColor:'transparent'})}}/>
   <Animated.View pointerEvents={loading?'none':'auto'} accessibilityElementsHidden={loading} importantForAccessibility={loading?'no-hide-descendants':'auto'} style={[StyleSheet.absoluteFill,{opacity:transition.interpolate({inputRange:[0,1],outputRange:[1,0]}),transform:[{translateY:transition.interpolate({inputRange:[0,1],outputRange:[0,-unit(10)]})}]}]}>
   <ExpeditionMenu width={panelWidth} maxHeight={panelHeight} fontFamily={fontFamily} artwork={artwork} busy={busy} playDisabled={playDisabled} onPlay={play} onCustomise={()=>{setName(profile.name);setRole(profile.role);setPanel('customise')}} onUpgrades={()=>setPanel('upgrades')} onFriends={onFriends}/>
   </Animated.View>
   {loading&&<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill,{opacity:transition,transform:[{translateY:transition.interpolate({inputRange:[0,1],outputRange:[unit(12),0]})}]}]}><ExpeditionLoading width={panelWidth} height={panelHeight} artwork={artwork.expeditionLoading} progress={loadingProgress} reducedMotion={reducedMotion}/></Animated.View>}
   </View>
  </Animated.View>
  <Animated.View pointerEvents="none" style={[s.stats,{left:safe.left+gutter,right:safe.right+gutter,bottom:bottomBaseline,paddingBottom:unit(6),gap:unit(12)},statsEntrance]}>
   <Image source={portrait} resizeMode="contain" style={{width:unit(90),height:unit(82),transform:[{translateY:unit(3)}]}}/>
   <View style={[s.identity,{gap:unit(6),transform:[{translateY:unit(8)}]}]}>
    <View style={[s.nameRow,{gap:unit(16)}]}><Text numberOfLines={1} style={[s.name,{fontFamily,fontSize:Math.max(12,unit(23)),lineHeight:Math.max(17,unit(31)),letterSpacing:unit(1.5),textShadowColor:'#031719',textShadowRadius:unit(3),textShadowOffset:{width:0,height:unit(2)},maxWidth:unit(portraitMode?200:230)}]}>{profile.name.toUpperCase()}</Text><Text style={[s.level,{fontFamily,fontSize:Math.max(10,unit(17)),lineHeight:Math.max(14,unit(25)),letterSpacing:unit(1.1),textShadowColor:'#031719',textShadowRadius:unit(2)}]}>LEVEL 1 · {survivorRole(profile.role).label.toUpperCase()}</Text></View>
    <View style={[s.xpRow,{gap:unit(18)}]}><View accessibilityRole="progressbar" accessibilityLabel="Survivor experience" accessibilityValue={{min:0,max:1000,now:0,text:'0 out of 1,000 XP'}} style={[s.xp,{width:unit(portraitMode?230:276),height:Math.max(7,unit(13)),borderRadius:unit(8)}]}><View style={s.xpFill}/></View><Text style={[s.xpText,{fontFamily,fontSize:Math.max(10,unit(16)),lineHeight:Math.max(14,unit(21)),letterSpacing:unit(.6)}]}>0 / 1,000 XP</Text></View>
   </View>

  </Animated.View>
  {(!!notice||busy&&!loading)&&<Animated.View pointerEvents="none" style={[s.noticeBanner,{top:safe.top+8,left:safe.left+availableWidth*.28,right:safe.right+availableWidth*.11},noticeEntrance]}>
   {!!notice&&<Text accessibilityRole="alert" style={s.notice}>{notice}</Text>}
   {busy&&!loading&&<Text accessibilityLiveRegion="polite" style={s.detail}>Preparing your world…</Text>}
  </Animated.View>}
  {panel&&<View accessibilityViewIsModal style={[s.modal,{paddingTop:safe.top+12,paddingBottom:safe.bottom+12,paddingLeft:safe.left+20,paddingRight:safe.right+20}]}>
   <ScrollView style={s.dialog} contentContainerStyle={s.dialogContent} keyboardShouldPersistTaps="handled">
    <View style={s.panelHeader}><Text accessibilityRole="header" style={s.panelTitle}>{panel==='customise'?'Choose your survivor':panel==='upgrades'?'Camp upgrades':'Settings'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close panel" onPress={()=>setPanel(null)} style={s.close}><Text style={s.closeText}>×</Text></Pressable></View>
    {panel==='customise'?<><SurvivorSelector selected={role} onSelect={setRole} portrait={portrait}/><Text style={s.label}>SURVIVOR NAME</Text><TextInput accessibilityLabel="Survivor name" value={name} maxLength={20} onChangeText={setName} autoCapitalize="words" autoCorrect={false} returnKeyType="done" style={s.input}/>{action('Save survivor',()=>{onProfile({...profile,name:name.trim()||'Survivor',role});setPanel(null)})}</>:panel==='upgrades'?<><Text style={s.body}>Build a place worth defending.</Text><Text style={s.muted}>Repair Headquarters to reach Camp Level 1. Gather resources in camp storage, then use Camp Plans inside Headquarters to unlock the next level, buildings and tools.</Text><View style={s.upgrade}><Text style={s.upgradeTitle}>01  MAKESHIFT CAMP</Text><Text style={s.muted}>Repair the camp and restore its facilities.</Text></View><View style={s.upgrade}><Text style={s.upgradeTitle}>02  WORKING CAMP</Text><Text style={s.muted}>Expand your camp through Headquarters.</Text></View>{action('Enter camp',play)}</>:<><Text style={s.body}>Camp animation</Text><Text style={s.muted}>Wind, fire and survivor idle on the starting screen. Your device’s reduced motion setting also applies.</Text>{action(profile.motion?'Animation: On':'Animation: Off',()=>onProfile({...profile,motion:!profile.motion}))}<Text style={s.muted}>Survivor name and preferences are saved on this device. Each time you press Play, a fresh Survival run begins.</Text>{onBack&&action('World editor',()=>{setPanel(null);onBack()})}</>}
   </ScrollView>
  </View>}
 </Animated.View>;
}
const s=StyleSheet.create({
 root:{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'#071b1d',zIndex:1000,overflow:'hidden'},
 logo:{position:'absolute'},
 settings:{backgroundColor:'transparent',borderWidth:0,padding:0,position:'absolute',alignItems:'flex-end',justifyContent:'center'},
 soundToggle:{position:'absolute',alignItems:'center',justifyContent:'center',backgroundColor:'transparent',borderWidth:0,padding:0},
 menu:{position:'absolute'},
 pressed:{backgroundColor:'#d995261c'},detail:{color:'#d5bea0',fontSize:12,letterSpacing:3},noticeBanner:{position:'absolute',paddingHorizontal:12,paddingVertical:8,gap:5,backgroundColor:'#061c1ee8',borderRadius:5},notice:{color:'#ffe2b8',fontSize:13,lineHeight:18},
 stats:{position:'absolute',flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:'#ad8e5770'},identity:{},nameRow:{flexDirection:'row',alignItems:'center'},name:{color:'#f2dfb0',flexShrink:1},level:{color:'#e1b66e',flexShrink:1},xpRow:{flexDirection:'row',alignItems:'center'},xp:{borderWidth:1,borderColor:'#cfaa5c',backgroundColor:'#081d1fc9',overflow:'hidden'},xpFill:{height:'100%',width:0,backgroundColor:'#ffa312',borderRadius:8},xpText:{color:'#f1dfad'},
 modal:{position:'absolute',top:0,bottom:0,left:0,right:0,backgroundColor:'#031315c9',alignItems:'center',justifyContent:'center'},dialog:{width:'100%',maxWidth:510,maxHeight:'100%',flexGrow:0,backgroundColor:'#102e2ff5',borderColor:'#a38a60',borderWidth:1,borderRadius:14},dialogContent:{padding:22,gap:16},panelHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},panelTitle:{fontFamily:serif,color:'#f2dbb1',fontSize:25,fontWeight:'700'},close:{backgroundColor:'transparent',borderWidth:0,padding:0,width:44,height:44,alignItems:'center',justifyContent:'center'},closeText:{color:'#f2dbb1',fontSize:30},preview:{flexDirection:'row',gap:20,alignItems:'center'},previewPortrait:{width:80,height:80},body:{color:'#f2dfbb',fontSize:17,lineHeight:24},muted:{color:'#bdc4ae',fontSize:14,lineHeight:22},label:{color:'#e6c997',fontSize:11,letterSpacing:2},input:{borderWidth:1,borderColor:'#8c805c',borderRadius:7,padding:12,color:'#f2dfbb',fontSize:18,backgroundColor:'#061d1e'},action:{minHeight:46,padding:12,borderWidth:1,borderColor:'#c99b54',borderRadius:8,backgroundColor:'#8b542b44',alignItems:'center',justifyContent:'center'},actionText:{color:'#ffe4b2',fontSize:16,fontWeight:'700'},upgrade:{gap:5,paddingVertical:12,borderTopWidth:1,borderTopColor:'#8c805c55'},upgradeTitle:{fontFamily:serif,color:'#e7c68a',fontSize:17}
});

import React,{useState} from 'react';
import {View,Text,Pressable,TextInput,Image,ScrollView,StyleSheet,Platform,type ImageSourcePropType} from 'react-native';
import type {StartProfile} from './start-profile';
import {START_SCREEN_MENU_FONT,type StartScreenArtwork} from './start-screen-art';
import type {StartScreenIconName} from './start-screen-icons';
import ExpeditionMenu from './ExpeditionMenu';

type Props={width:number;height:number;safe?:{top:number;bottom:number;left:number;right:number};background:React.ReactNode;shade:React.ReactNode;portrait:ImageSourcePropType;artwork:StartScreenArtwork;fontFamily?:string;profile:StartProfile;onProfile:(p:StartProfile)=>void;onPlay:()=>void;onBack?:()=>void;busy?:boolean;notice?:string;playDisabled?:boolean};
type Panel='customise'|'upgrades'|'settings'|null;
const serif=Platform.OS==='ios'?'Georgia':Platform.OS==='web'?'Georgia, serif':'serif';
export default function StartingScreen({width,height,safe={top:0,bottom:0,left:0,right:0},background,shade,portrait,artwork,fontFamily=START_SCREEN_MENU_FONT,profile,onProfile,onPlay,onBack,busy=false,notice='',playDisabled=false}:Props){
 const [panel,setPanel]=useState<Panel>(null),[name,setName]=useState(profile.name);
 const portraitMode=height>width;
 const availableWidth=Math.max(1,width-safe.left-safe.right),availableHeight=Math.max(1,height-safe.top-safe.bottom);
 // The approved 1536px composition is the common artboard for web and iOS.
 const scale=portraitMode?Math.min(availableWidth/650,1):Math.min(availableWidth/1536,availableHeight/710,1.4);
 const unit=(value:number)=>value*scale;
 // One shared horizontal gutter and bottom baseline keep the HUD balanced.
 const gutter=availableWidth*.055;
 const bottomBaseline=safe.bottom+availableHeight*.056;
 const menuWidth=portraitMode?Math.min(availableWidth*.83,420):unit(430);
 const icon=(name:StartScreenIconName,size:number,style?:object)=><Image accessibilityIgnoresInvertColors source={artwork.icons[name]} resizeMode="contain" style={[{width:unit(size),height:unit(size)},style]}/>;
 const action=(label:string,fn:()=>void)=><Pressable accessibilityRole="button" onPress={fn} style={({pressed})=>[s.action,pressed&&s.pressed]}><Text style={s.actionText}>{label}</Text></Pressable>;
 return <View accessibilityLabel="Humans Remain starting screen" style={s.root}>
  {background}{shade}
  <View pointerEvents="none" style={[s.logo,{left:safe.left+gutter,top:safe.top+availableHeight*.077}]}>
   <Image accessibilityLabel="Humans Remain" source={artwork.logo} resizeMode="contain" style={{width:portraitMode?190:unit(216),height:portraitMode?84:unit(95)}}/>
  </View>
  <Pressable accessibilityRole="button" accessibilityLabel="Starting screen settings" disabled={busy} onPress={()=>setPanel('settings')} hitSlop={8} style={[s.settings,{right:safe.right+gutter,top:safe.top+availableHeight*.05,width:Math.max(44,unit(48)),height:Math.max(44,unit(48))}]}>{icon('settings',35)}</Pressable>
  <View style={[s.menu,{right:safe.right+gutter,bottom:portraitMode?bottomBaseline+unit(128):bottomBaseline,width:menuWidth}]}>
   <ExpeditionMenu width={menuWidth} maxHeight={availableHeight*(portraitMode?.53:.67)} fontFamily={fontFamily} artwork={artwork} busy={busy} playDisabled={playDisabled} onPlay={onPlay} onCustomise={()=>{setName(profile.name);setPanel('customise')}} onUpgrades={()=>setPanel('upgrades')}/>
  </View>
  <View style={[s.stats,{left:safe.left+gutter,right:safe.right+gutter,bottom:bottomBaseline,paddingBottom:unit(6),gap:unit(12)}]}>
   <Image source={portrait} resizeMode="contain" style={{width:unit(90),height:unit(82),transform:[{translateY:unit(3)}]}}/>
   <View style={[s.identity,{gap:unit(6),transform:[{translateY:unit(8)}]}]}>
    <View style={[s.nameRow,{gap:unit(28)}]}><Text numberOfLines={1} style={[s.name,{fontFamily,fontSize:unit(25),lineHeight:unit(34),maxWidth:unit(portraitMode?200:230)}]}>{profile.name.toUpperCase()}</Text><Text style={[s.level,{fontFamily,fontSize:unit(19),lineHeight:unit(27)}]}>LEVEL 1</Text></View>
    <View style={[s.xpRow,{gap:unit(18)}]}><View accessibilityRole="progressbar" accessibilityLabel="Survivor experience" accessibilityValue={{min:0,max:1000,now:0,text:'0 out of 1,000 XP'}} style={[s.xp,{width:unit(portraitMode?230:276),height:Math.max(7,unit(13)),borderRadius:unit(8)}]}><View style={s.xpFill}/></View><Text style={[s.xpText,{fontFamily,fontSize:unit(18),lineHeight:unit(23)}]}>0 / 1,000 XP</Text></View>
   </View>

  </View>
  {(!!notice||busy)&&<View pointerEvents="none" style={[s.noticeBanner,{top:safe.top+8,left:safe.left+availableWidth*.28,right:safe.right+availableWidth*.11}]}>
   {!!notice&&<Text accessibilityRole="alert" style={s.notice}>{notice}</Text>}
   {busy&&<Text accessibilityLiveRegion="polite" style={s.detail}>Preparing your world…</Text>}
  </View>}
  {panel&&<View accessibilityViewIsModal style={[s.modal,{paddingTop:safe.top+12,paddingBottom:safe.bottom+12,paddingLeft:safe.left+20,paddingRight:safe.right+20}]}>
   <ScrollView style={s.dialog} contentContainerStyle={s.dialogContent} keyboardShouldPersistTaps="handled">
    <View style={s.panelHeader}><Text accessibilityRole="header" style={s.panelTitle}>{panel==='customise'?'Your survivor':panel==='upgrades'?'Camp upgrades':'Settings'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close panel" onPress={()=>setPanel(null)} style={s.close}><Text style={s.closeText}>×</Text></Pressable></View>
    {panel==='customise'?<><View style={s.preview}><Image source={portrait} resizeMode="contain" style={s.previewPortrait}/><View><Text style={s.body}>Original survivor</Text><Text style={s.muted}>More outfits coming soon</Text></View></View><Text style={s.label}>SURVIVOR NAME</Text><TextInput accessibilityLabel="Survivor name" value={name} maxLength={20} onChangeText={setName} autoCapitalize="words" autoCorrect={false} returnKeyType="done" style={s.input}/>{action('Save survivor',()=>{onProfile({...profile,name:name.trim()||'Survivor'});setPanel(null)})}</>:panel==='upgrades'?<><Text style={s.body}>Build a place worth defending.</Text><Text style={s.muted}>Repair Headquarters to reach Camp Level 1. Gather resources in camp storage, then use Camp Plans inside Headquarters to unlock the next level, buildings and tools.</Text><View style={s.upgrade}><Text style={s.upgradeTitle}>01  MAKESHIFT CAMP</Text><Text style={s.muted}>Repair the camp and restore its facilities.</Text></View><View style={s.upgrade}><Text style={s.upgradeTitle}>02  WORKING CAMP</Text><Text style={s.muted}>Expand your camp through Headquarters.</Text></View>{action('Enter camp',onPlay)}</>:<><Text style={s.body}>Camp animation</Text><Text style={s.muted}>Wind, fire and survivor idle on the starting screen. Your device’s reduced motion setting also applies.</Text>{action(profile.motion?'Animation: On':'Animation: Off',()=>onProfile({...profile,motion:!profile.motion}))}<Text style={s.muted}>Survivor name and preferences are saved on this device. Survival progress continues to use your existing save.</Text>{onBack&&action('World editor',()=>{setPanel(null);onBack()})}</>}
   </ScrollView>
  </View>}
 </View>;
}
const s=StyleSheet.create({
 root:{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'#071b1d',zIndex:1000,overflow:'hidden'},
 logo:{position:'absolute'},
 settings:{backgroundColor:'transparent',borderWidth:0,padding:0,position:'absolute',alignItems:'flex-end',justifyContent:'center'},
 menu:{position:'absolute'},
 pressed:{backgroundColor:'#d995261c'},detail:{color:'#d5bea0',fontSize:12,letterSpacing:3},noticeBanner:{position:'absolute',paddingHorizontal:12,paddingVertical:8,gap:5,backgroundColor:'#061c1ee8',borderRadius:5},notice:{color:'#ffe2b8',fontSize:13,lineHeight:18},
 stats:{position:'absolute',flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:'#ad8e5770'},identity:{},nameRow:{flexDirection:'row',alignItems:'center'},name:{color:'#f2dfb0'},level:{color:'#f5ae35'},xpRow:{flexDirection:'row',alignItems:'center'},xp:{borderWidth:1,borderColor:'#cfaa5c',backgroundColor:'#081d1fc9',overflow:'hidden'},xpFill:{height:'100%',width:0,backgroundColor:'#ffa312',borderRadius:8},xpText:{color:'#f1dfad'},
 modal:{position:'absolute',top:0,bottom:0,left:0,right:0,backgroundColor:'#031315c9',alignItems:'center',justifyContent:'center'},dialog:{width:'100%',maxWidth:510,maxHeight:'100%',flexGrow:0,backgroundColor:'#102e2ff5',borderColor:'#a38a60',borderWidth:1,borderRadius:14},dialogContent:{padding:22,gap:16},panelHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},panelTitle:{fontFamily:serif,color:'#f2dbb1',fontSize:25,fontWeight:'700'},close:{backgroundColor:'transparent',borderWidth:0,padding:0,width:44,height:44,alignItems:'center',justifyContent:'center'},closeText:{color:'#f2dbb1',fontSize:30},preview:{flexDirection:'row',gap:20,alignItems:'center'},previewPortrait:{width:80,height:80},body:{color:'#f2dfbb',fontSize:17,lineHeight:24},muted:{color:'#bdc4ae',fontSize:14,lineHeight:22},label:{color:'#e6c997',fontSize:11,letterSpacing:2},input:{borderWidth:1,borderColor:'#8c805c',borderRadius:7,padding:12,color:'#f2dfbb',fontSize:18,backgroundColor:'#061d1e'},action:{minHeight:46,padding:12,borderWidth:1,borderColor:'#c99b54',borderRadius:8,backgroundColor:'#8b542b44',alignItems:'center',justifyContent:'center'},actionText:{color:'#ffe4b2',fontSize:16,fontWeight:'700'},upgrade:{gap:5,paddingVertical:12,borderTopWidth:1,borderTopColor:'#8c805c55'},upgradeTitle:{fontFamily:serif,color:'#e7c68a',fontSize:17}
});

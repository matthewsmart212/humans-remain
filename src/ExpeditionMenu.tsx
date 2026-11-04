import React from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import type {StartScreenArtwork} from './start-screen-art';
import type {StartScreenIconName} from './start-screen-icons';

type Props={width:number;maxHeight:number;fontFamily:string;artwork:StartScreenArtwork;busy:boolean;playDisabled:boolean;onPlay:()=>void;onCustomise:()=>void;onUpgrades:()=>void};

/** One shared composition for browser and Expo, scaled inside the safe area. */
export default function ExpeditionMenu({width,maxHeight,fontFamily,artwork,busy,playDisabled,onPlay,onCustomise,onUpgrades}:Props){
 const scale=Math.min(width/420,maxHeight/476),u=(n:number)=>n*scale;
 const icon=(name:StartScreenIconName,size:number)=><Image source={artwork.icons[name]} resizeMode="contain" style={{width:u(size),height:u(size)}}/>;
 const frame=(hero=false)=><View pointerEvents="none" style={StyleSheet.absoluteFill}>
  <Image source={artwork.cardTexture} resizeMode="stretch" style={[StyleSheet.absoluteFill,s.texture]}/>
  <View style={[s.inset,{inset:u(4),borderRadius:u(3)},hero&&s.heroInset]}/>
 </View>;
 const corners=()=><View pointerEvents="none" style={StyleSheet.absoluteFill}>{(['tl','tr','bl','br'] as const).map(corner=><View key={corner} style={[s.strap,{width:u(13),height:u(25),borderRadius:u(3)},corner[0]==='t'?{top:u(-4)}:{bottom:u(-4)},corner[1]==='l'?{left:u(6)}:{right:u(6)},{transform:[{rotate:corner==='tl'||corner==='br'?'45deg':'-45deg'}]}]}><View style={[s.rivet,{width:u(4),height:u(4),borderRadius:u(2)}]}/></View>)}</View>;
 const utility=(label:string,name:StartScreenIconName,onPress:()=>void)=><Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled:busy}} disabled={busy} onPress={onPress} style={({pressed})=>[s.card,s.utility,{height:u(134),borderRadius:u(7),gap:u(11)},pressed&&s.pressed,busy&&s.busy]}>
  {frame()}{icon(name,51)}
  <Text numberOfLines={1} adjustsFontSizeToFit style={[s.utilityLabel,{fontFamily,fontSize:u(24),letterSpacing:u(1.4)}]}>{label}</Text>
  {corners()}
 </Pressable>;
 return <View accessibilityLabel="Expedition menu" style={{width:u(420),gap:u(16),alignSelf:'flex-end'}}>
  <Pressable accessibilityRole="button" accessibilityLabel="PLAY" accessibilityState={{disabled:busy||playDisabled}} disabled={busy||playDisabled} onPress={onPlay} style={({pressed})=>[s.card,s.hero,{height:u(230),borderRadius:u(8)},pressed&&s.pressed,(busy||playDisabled)&&s.busy]}>
   <View pointerEvents="none" style={[StyleSheet.absoluteFill,{overflow:'hidden',borderRadius:u(6)}]}>
    <Image source={artwork.expeditionScene} resizeMode="cover" style={StyleSheet.absoluteFill}/>
    <View style={[s.heroShade,StyleSheet.absoluteFill]}/>
   </View>
   <View pointerEvents="none" style={[s.heading,{paddingHorizontal:u(24),height:u(38),gap:u(10)}]}><View style={s.rule}/><Text numberOfLines={1} style={[s.headingText,{fontFamily,fontSize:u(15),letterSpacing:u(2.2)}]}>YOUR NEXT EXPEDITION</Text><View style={s.rule}/></View>
   <View pointerEvents="none" style={[s.playStrip,{height:u(66),gap:u(17),margin:u(5),borderRadius:u(3)}]}>
    <Image source={artwork.cardTexture} resizeMode="stretch" style={[StyleSheet.absoluteFill,{opacity:.17}]}/>
    {icon('play',31)}<Text style={[s.playLabel,{fontFamily,fontSize:u(44),letterSpacing:u(4)}]}>PLAY</Text>
   </View>
   <Image pointerEvents="none" source={artwork.selectionGlow} resizeMode="stretch" style={[s.glow,{height:u(48),bottom:u(-18)}]}/>
   <View pointerEvents="none" style={[s.inset,{inset:u(4),borderRadius:u(4)},s.heroInset]}/>
   {corners()}
  </Pressable>
  <View style={{flexDirection:'row',gap:u(16)}}>{utility('CUSTOMISE','customise',onCustomise)}{utility('UPGRADES','upgrades',onUpgrades)}</View>
  <Pressable accessibilityRole="button" accessibilityLabel="PLAY WITH FRIENDS! Coming soon" accessibilityState={{disabled:true}} disabled style={[s.card,s.friends,{height:Math.max(44,u(80)),borderRadius:u(6),gap:u(17),paddingHorizontal:u(24)}]}>
   {frame()}{icon('friends',42)}
   <View style={{gap:u(7),flexShrink:1}}><Text numberOfLines={1} style={[s.friendsLabel,{fontFamily,fontSize:u(20),letterSpacing:u(1)}]}>PLAY WITH FRIENDS!</Text><View style={{flexDirection:'row',alignItems:'center',gap:u(9)}}>{icon('lock',12)}<Text style={[s.soon,{fontFamily,fontSize:u(12),letterSpacing:u(3)}]}>COMING SOON</Text></View></View>
  </Pressable>
 </View>;
}

const s=StyleSheet.create({
 card:{borderWidth:2,borderColor:'#b99a61',backgroundColor:'#103a37',position:'relative',boxShadow:'0 5px 16px #020f13aa'},
 texture:{opacity:.72},inset:{position:'absolute',borderWidth:1,borderColor:'#9f885e70'},heroInset:{borderColor:'#ebc88c9e'},
 strap:{position:'absolute',backgroundColor:'#795032',borderWidth:1,borderColor:'#c19557',alignItems:'center',justifyContent:'center'},rivet:{backgroundColor:'#e2bb79',borderWidth:.5,borderColor:'#513c26'},
 hero:{justifyContent:'space-between',borderColor:'#d3ad64'},heroShade:{backgroundColor:'#071c2020'},
 heading:{flexDirection:'row',alignItems:'center',backgroundColor:'#0d2d2be0'},headingText:{color:'#eeddb6'},rule:{height:1,backgroundColor:'#bba171',flex:1},
 playStrip:{flexDirection:'row',alignItems:'center',justifyContent:'center',backgroundColor:'#aa641f',borderWidth:1,borderColor:'#eeb65b',overflow:'hidden'},playLabel:{color:'#fff0c8',textShadowColor:'#61340e',textShadowRadius:3,textShadowOffset:{width:0,height:1}},
 glow:{position:'absolute',left:'7%',width:'86%',opacity:.85},utility:{flex:1,justifyContent:'center',alignItems:'center'},utilityLabel:{color:'#efdfb9'},friends:{flexDirection:'row',alignItems:'center',opacity:.64},friendsLabel:{color:'#e6d8b7'},soon:{color:'#dfcfaa'},pressed:{opacity:.82,transform:[{scale:.985}]},busy:{opacity:.5},
});

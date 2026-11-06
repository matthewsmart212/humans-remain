import React from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import type {StartScreenArtwork} from './start-screen-art';

type Props={width:number;maxHeight:number;fontFamily:string;artwork:StartScreenArtwork;busy:boolean;playDisabled:boolean;onPlay:()=>void;onCustomise:()=>void;onUpgrades:()=>void};
type Card='play'|'customise'|'upgrades'|'friends';
const COMPOSITION={width:516,height:599};
const CARDS={
 play:{left:0,top:0,width:516,height:298,label:'PLAY'},
 customise:{left:8,top:314,width:240,height:170,label:'CUSTOMISE'},
 upgrades:{left:267,top:314,width:242,height:170,label:'UPGRADES'},
 friends:{left:8,top:505,width:504,height:94,label:'PLAY WITH FRIENDS! Coming soon'},
} as const;

/**
 * Real independent plaque surfaces instead of rectangular crops from the
 * full-scene concept image. Crops carried a second painted camp background,
 * which obscured the live animated background and produced square seams.
 * Keep every sign separate so its backdrop and shadows follow the silhouette.
 */
export default function ExpeditionMenu({width,maxHeight,fontFamily,artwork,busy,playDisabled,onPlay,onCustomise,onUpgrades}:Props){
 const scale=Math.min(width/COMPOSITION.width,maxHeight/COMPOSITION.height);
 const callbacks:Record<Card,(()=>void)|undefined>={play:onPlay,customise:onCustomise,upgrades:onUpgrades,friends:undefined};
 const labels:Record<Card,string>={play:'PLAY',customise:'CUSTOMISE',upgrades:'UPGRADES',friends:'PLAY WITH FRIENDS!'};
 const icons={play:artwork.icons.play,customise:artwork.icons.customise,upgrades:artwork.icons.upgrades,friends:artwork.icons.friends};
 return <View accessibilityLabel="Expedition menu" style={{width:COMPOSITION.width*scale,height:COMPOSITION.height*scale,alignSelf:'flex-end'}}>
  {(Object.keys(CARDS) as Card[]).map(key=>{
   const card=CARDS[key],disabled=key==='friends'||busy||(key==='play'&&playDisabled),isPlay=key==='play',isFriends=key==='friends';
   const position={left:card.left*scale,top:card.top*scale,width:card.width*scale,height:card.height*scale};
   return <Pressable key={key} accessibilityRole="button" accessibilityLabel={card.label} accessibilityState={{disabled}} disabled={disabled} onPress={callbacks[key]} hitSlop={2} style={({pressed,focused})=>[s.card,position,{borderRadius:Math.max(7,9*scale),opacity:pressed?.84:disabled&&!isFriends?.68:1},focused&&s.focus]}>
    <View pointerEvents="none" style={[StyleSheet.absoluteFill,s.borderOuter,{borderRadius:Math.max(7,9*scale),borderWidth:Math.max(2,3*scale)}]}/>
    <View pointerEvents="none" style={[s.innerFrame,{top:9*scale,bottom:9*scale,left:9*scale,right:9*scale,borderRadius:Math.max(4,6*scale),borderWidth:Math.max(1,scale)}]}/>
    <View pointerEvents="none" style={[s.corner,{left:5*scale,top:5*scale,width:9*scale,height:9*scale,borderRadius:5*scale}]}/>
    <View pointerEvents="none" style={[s.corner,{right:5*scale,top:5*scale,width:9*scale,height:9*scale,borderRadius:5*scale}]}/>
    <View pointerEvents="none" style={[s.corner,{left:5*scale,bottom:5*scale,width:9*scale,height:9*scale,borderRadius:5*scale}]}/>
    <View pointerEvents="none" style={[s.corner,{right:5*scale,bottom:5*scale,width:9*scale,height:9*scale,borderRadius:5*scale}]}/>
    {isPlay?<View pointerEvents="none" style={[s.playContent,{paddingTop:23*scale,paddingHorizontal:24*scale}]}>
      <Text style={[s.eyebrow,{fontFamily,fontSize:19*scale,letterSpacing:3.4*scale}]}>YOUR NEXT EXPEDITION</Text>
      <View style={[s.playLandscape,{marginTop:14*scale,marginBottom:7*scale,borderRadius:5*scale}]}>
        <View style={s.landscapeHaze}/>
        <Text style={[s.landscapeMark,{fontSize:45*scale}]}>⌁</Text>
      </View>
      <View style={[s.playButton,{height:69*scale,marginHorizontal:4*scale,borderRadius:6*scale,borderWidth:Math.max(1,scale)}]}>
       <Image source={icons.play} resizeMode="contain" style={{width:40*scale,height:40*scale,marginRight:16*scale}}/>
       <Text style={[s.playText,{fontFamily,fontSize:49*scale,letterSpacing:2*scale}]}>PLAY</Text>
      </View>
     </View>:isFriends?<View pointerEvents="none" style={[s.friendsContent,{paddingHorizontal:27*scale}]}>
       <Image source={icons.friends} resizeMode="contain" style={{height:49*scale,width:60*scale}}/>
       <View style={[s.dividingLine,{height:46*scale,marginHorizontal:16*scale}]}/>
       <View style={{flex:1}}>
        <Text style={[s.friendsTitle,{fontFamily,fontSize:22*scale,letterSpacing:1.4*scale}]}>{labels[key]}</Text>
        <Text style={[s.comingSoon,{fontFamily,fontSize:15*scale,letterSpacing:4*scale}]}>⌑  COMING SOON</Text>
       </View>
      </View>:<View pointerEvents="none" style={s.smallContent}>
       <Image source={icons[key]} resizeMode="contain" style={{height:62*scale,width:72*scale,marginBottom:10*scale}}/>
       <Text style={[s.smallTitle,{fontFamily,fontSize:25*scale,letterSpacing:1.2*scale}]}>{labels[key]}</Text>
      </View>}
   </Pressable>
  })}
 </View>;
}
const s=StyleSheet.create({
 card:{position:'absolute',overflow:'hidden',alignItems:'stretch',justifyContent:'center',backgroundColor:'#103335',borderWidth:1,borderColor:'#071c1e',boxShadow:'0 7px 14px #0000009c, inset 0 2px 9px #4a604b55, inset 0 -9px 18px #030d0f9e'},
 borderOuter:{borderColor:'#98744888'},
 innerFrame:{position:'absolute',borderColor:'#b08b53aa',backgroundColor:'transparent'},
 corner:{position:'absolute',backgroundColor:'#a48050',borderWidth:1,borderColor:'#432b17'},
 focus:{borderColor:'#f5c66c'},
 playContent:{flex:1,alignItems:'stretch',justifyContent:'center'},
 eyebrow:{color:'#d7c5a3',textAlign:'center',textShadowColor:'#000',textShadowRadius:4},
 playLandscape:{flex:1,overflow:'hidden',backgroundColor:'#13393b',borderWidth:1,borderColor:'#7b76515c',alignItems:'center',justifyContent:'center'},
 landscapeHaze:{position:'absolute',top:0,left:0,bottom:0,right:0,backgroundColor:'#08202375'},
 landscapeMark:{color:'#69868180'},
 playButton:{backgroundColor:'#865a2d',borderColor:'#c39b5d',flexDirection:'row',alignItems:'center',justifyContent:'center',boxShadow:'inset 0 2px 6px #e3bd6244, inset 0 -6px 10px #30190e91'},
 playText:{color:'#f2ddb2',textShadowColor:'#34210d',textShadowRadius:3},
 smallContent:{flex:1,alignItems:'center',justifyContent:'center'},
 smallTitle:{color:'#f3dfb2',textAlign:'center',textShadowColor:'#000',textShadowRadius:3},
 friendsContent:{flex:1,flexDirection:'row',alignItems:'center'},
 dividingLine:{width:1,backgroundColor:'#ac996c'},
 friendsTitle:{color:'#e1d1b1',textAlign:'center'},
 comingSoon:{color:'#a5a594',textAlign:'center',marginTop:3},
});

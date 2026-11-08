import React,{useState} from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import type {StartScreenArtwork} from './start-screen-art';

type Props={width:number;maxHeight:number;fontFamily:string;artwork:StartScreenArtwork;busy:boolean;playDisabled:boolean;onPlay:()=>void;onCustomise:()=>void;onUpgrades:()=>void;onFriends?:()=>void};
type Card='play'|'customise'|'upgrades'|'friends';
const ATLAS={width:1846,height:852};
const COMPOSITION={width:516,height:599};
// These coordinates match the APPROVED illustrated art, including its
// irregular gold borders, leather tabs, painted type and textured backgrounds.
const CARDS={
 play:{x:1280,y:160,width:516,height:298,left:0,top:0,label:'PLAY'},
 customise:{x:1288,y:474,width:240,height:170,left:8,top:314,label:'CUSTOMISE'},
 upgrades:{x:1547,y:474,width:242,height:170,left:267,top:314,label:'UPGRADES'},
 friends:{x:1288,y:665,width:504,height:94,left:8,top:505,label:'PLAY WITH FRIENDS!'},
} as const;

export default function ExpeditionMenu({width,maxHeight,fontFamily,artwork,busy,playDisabled,onPlay,onCustomise,onUpgrades,onFriends}:Props){
 const [focused,setFocused]=useState<Card|null>(null);
 const scale=Math.max(.001,Math.min(width/COMPOSITION.width,maxHeight/COMPOSITION.height));
 const callbacks={play:onPlay,customise:onCustomise,upgrades:onUpgrades,friends:onFriends};
 return <View accessibilityLabel="Expedition menu" style={{width:COMPOSITION.width*scale,height:COMPOSITION.height*scale,alignSelf:'flex-end',overflow:'visible'}}>
  {(Object.keys(CARDS) as Card[]).map(key=>{
   const card=CARDS[key],disabled=(key==='friends'&&!onFriends)||busy||(key==='play'&&playDisabled);
   const panel=artwork.expeditionPanels?.[key];
   return <Pressable key={key} accessibilityRole="button" accessibilityLabel={card.label} accessibilityState={{disabled}} disabled={disabled} onPress={callbacks[key]} onFocus={()=>setFocused(key)} onBlur={()=>setFocused(null)} hitSlop={2}
    style={({pressed})=>[s.card,{left:card.left*scale,top:card.top*scale,width:card.width*scale,height:card.height*scale,opacity:pressed?.86:disabled?.65:1}]}>
    {/* The shadow has an inset rounded caster, outside the image itself.
        iOS gets a genuine blurred shadow without clipping the transparent
        painted corners; web applies drop-shadow to the actual PNG alpha. */}
    <View pointerEvents="none" style={{position:'absolute',left:9*scale,right:9*scale,top:7*scale,bottom:8*scale,borderRadius:Math.max(5,12*scale),backgroundColor:'#071c1d',shadowColor:'#000',shadowOpacity:.78,shadowRadius:Math.max(5,11*scale),shadowOffset:{width:0,height:Math.max(3,8*scale)},elevation:10}}/>
    {panel
     ? <Image accessible={false} pointerEvents="none" source={panel} resizeMode="stretch" style={{width:card.width*scale,height:card.height*scale}}/>
     : <View pointerEvents="none" style={{width:card.width*scale,height:card.height*scale,overflow:'hidden'}}>
        <Image accessible={false} source={artwork.expeditionCards} resizeMode="stretch" style={{position:'absolute',left:-card.x*scale,top:-card.y*scale,width:ATLAS.width*scale,height:ATLAS.height*scale}}/>
       </View>}
    {/* Multiplayer is usable on native. Hide only the obsolete disabled label
        on that original artwork; never recreate the remaining painted signs. */}
    {key==='friends'&&!!onFriends&&<View pointerEvents="none" style={{position:'absolute',left:card.width*scale*.12,right:card.width*scale*.055,top:card.height*scale*.15,bottom:card.height*scale*.15,backgroundColor:'#18312cf5',borderRadius:4*scale,borderWidth:Math.max(.6,scale),borderColor:'#8c704c',flexDirection:'row',alignItems:'center',justifyContent:'center'}}>
      <Image source={artwork.icons.friends} resizeMode="contain" style={{width:36*scale,height:36*scale,marginRight:15*scale}}/>
      <Text allowFontScaling={false} numberOfLines={1} style={{fontFamily,color:'#f0dbac',fontSize:24*scale,letterSpacing:1.2*scale,textAlign:'center'}}>PLAY WITH FRIENDS!</Text>
     </View>}
    {focused===key&&<View pointerEvents="none" style={{...StyleSheet.absoluteFill,borderWidth:Math.max(1,2*scale),borderColor:'#f0cb7c',borderRadius:6*scale}}/>}
   </Pressable>;
  })}
 </View>;
}
const s=StyleSheet.create({
 card:{position:'absolute',backgroundColor:'transparent',overflow:'visible'},
});

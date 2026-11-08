import React,{useState} from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import type {StartScreenArtwork} from './start-screen-art';

type Props={width:number;maxHeight:number;fontFamily:string;artwork:StartScreenArtwork;busy:boolean;playDisabled:boolean;onPlay:()=>void;onCustomise:()=>void;onUpgrades:()=>void;onFriends?:()=>void};
type Card='play'|'customise'|'upgrades'|'friends';
// The approved illustrated menu is unchanged. On web, use transparently
// extracted individual signs rather than clips of an opaque full-scene mock-up.
// Keep the existing atlas fallback for native until extracted files are bundled.
const ATLAS={width:1846,height:852};
const COMPOSITION={width:516,height:599};
const CARD_MASKS:Record<Card,string>={
 play:'polygon(5% 1%,93% 1%,98% 5%,100% 10%,100% 90%,97% 96%,94% 99%,6% 99%,1% 95%,0% 88%,0% 12%,2% 5%)',
 customise:'polygon(5% 2%,94% 2%,99% 7%,99% 90%,94% 99%,6% 99%,1% 93%,1% 8%)',
 upgrades:'polygon(5% 2%,94% 2%,99% 7%,99% 90%,94% 99%,6% 99%,1% 93%,1% 8%)',
 friends:'polygon(3% 2%,97% 2%,100% 12%,100% 88%,97% 99%,3% 99%,0% 90%,0% 10%)',
};
const CARDS={
 play:{x:1280,y:160,width:516,height:298,left:0,top:0,label:'PLAY'},
 customise:{x:1288,y:474,width:240,height:170,left:8,top:314,label:'CUSTOMISE'},
 upgrades:{x:1547,y:474,width:242,height:170,left:267,top:314,label:'UPGRADES'},
 friends:{x:1288,y:665,width:504,height:94,left:8,top:505,label:'PLAY WITH FRIENDS!'},
} as const;

export default function ExpeditionMenu({width,maxHeight,fontFamily,artwork,busy,playDisabled,onPlay,onCustomise,onUpgrades,onFriends}:Props){
 const [focused,setFocused]=useState<Card|null>(null);
 const scale=Math.min(width/COMPOSITION.width,maxHeight/COMPOSITION.height);
 const callbacks={play:onPlay,customise:onCustomise,upgrades:onUpgrades,friends:onFriends};
 return <View accessibilityLabel="Expedition menu" style={{width:COMPOSITION.width*scale,height:COMPOSITION.height*scale,alignSelf:'flex-end'}}>
  {(Object.keys(CARDS) as Card[]).map(key=>{
   const card=CARDS[key],disabled=(key==='friends'&&!onFriends)||busy||(key==='play'&&playDisabled);
   const separate=typeof document!=='undefined'&&artwork.expeditionPanels;
   return <Pressable key={key} accessibilityRole="button" accessibilityLabel={card.label} accessibilityState={{disabled}} disabled={disabled} onPress={callbacks[key]} onFocus={()=>setFocused(key)} onBlur={()=>setFocused(null)} hitSlop={2} style={({pressed})=>[s.card,{left:card.left*scale,top:card.top*scale,width:card.width*scale,height:card.height*scale,...(!separate?{overflow:'hidden' as const,borderRadius:3*scale,...(typeof document!=='undefined'?{clipPath:CARD_MASKS[key]}:{})}:{overflow:'visible' as const})},pressed&&s.pressed,(busy||(key==='play'&&playDisabled))&&s.busy]}>
    {separate
      ? <Image accessible={false} pointerEvents="none" source={artwork.expeditionPanels![key]} resizeMode="stretch" style={{position:'absolute',left:0,top:0,width:card.width*scale,height:card.height*scale}}/>
      : <Image accessible={false} pointerEvents="none" source={artwork.expeditionCards} resizeMode="stretch" style={{position:'absolute',left:-card.x*scale,top:-card.y*scale,width:ATLAS.width*scale,height:ATLAS.height*scale}}/>}
    {/* The approved artwork still has "Coming soon" painted onto this plaque.
         Use an inset painted label for the enabled native co-op action, preserving
         the decorative sign edges until a clean atlas can be shipped. */}
    {key==='friends'&&!!onFriends&&<View pointerEvents="none" style={{position:'absolute',left:card.width*scale*.065,right:card.width*scale*.065,top:card.height*scale*.14,bottom:card.height*scale*.14,backgroundColor:'#2b261ff5',borderWidth:Math.max(.75,scale),borderColor:'#9d784c',borderRadius:Math.max(3,5*scale),alignItems:'center',justifyContent:'center',shadowColor:'#000000',shadowOpacity:.44,shadowRadius:4*scale}}>
     <Text allowFontScaling={false} numberOfLines={1} style={{color:'#f3d29a',fontFamily,fontSize:Math.max(12,23*scale),letterSpacing:1.3*scale,textAlign:'center',textShadowColor:'#100f0c',textShadowRadius:2*scale,textShadowOffset:{width:0,height:1}}}>PLAY WITH FRIENDS!</Text>
    </View>}
    {focused===key&&key!=='play'&&<View pointerEvents="none" style={[StyleSheet.absoluteFill,s.focus]}/>}
   </Pressable>;
  })}
 </View>;
}
const s=StyleSheet.create({backdrop:{position:'absolute',backgroundColor:'#04191b45'},card:{position:'absolute',backgroundColor:'transparent'},pressed:{opacity:.82},busy:{opacity:.5},focus:{borderWidth:2,borderColor:'#ffda83',borderRadius:3}});

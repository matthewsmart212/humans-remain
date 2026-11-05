import React,{useState} from 'react';
import {Image,Pressable,StyleSheet,View} from 'react-native';
import type {StartScreenArtwork} from './start-screen-art';

type Props={width:number;maxHeight:number;fontFamily:string;artwork:StartScreenArtwork;busy:boolean;playDisabled:boolean;onPlay:()=>void;onCustomise:()=>void;onUpgrades:()=>void};
type Card='play'|'customise'|'upgrades'|'friends';
// Use the approved artwork directly. Each view clips one card from the same
// cached image, preserving the reference's illustration, lettering and bevels.
// The camp surrounding these cards continues to use the existing animated scene.
const ATLAS={width:1846,height:852};
const COMPOSITION={width:516,height:600};
const CARDS={
 play:{x:1280,y:160,width:516,height:298,left:0,top:0,label:'PLAY'},
 customise:{x:1288,y:474,width:240,height:170,left:8,top:314,label:'CUSTOMISE'},
 upgrades:{x:1547,y:474,width:242,height:170,left:267,top:314,label:'UPGRADES'},
 friends:{x:1288,y:665,width:504,height:94,left:8,top:505,label:'PLAY WITH FRIENDS! Coming soon'},
} as const;

export default function ExpeditionMenu({width,maxHeight,artwork,busy,playDisabled,onPlay,onCustomise,onUpgrades}:Props){
 const [focused,setFocused]=useState<Card|null>(null);
 const scale=Math.min(width/COMPOSITION.width,maxHeight/COMPOSITION.height);
 const callbacks={play:onPlay,customise:onCustomise,upgrades:onUpgrades,friends:undefined};
 return <View accessibilityLabel="Expedition menu" style={{width:COMPOSITION.width*scale,height:COMPOSITION.height*scale,alignSelf:'flex-end'}}>
  {(Object.keys(CARDS) as Card[]).map(key=>{
   const card=CARDS[key],disabled=key==='friends'||busy||(key==='play'&&playDisabled);
   return <Pressable key={key} accessibilityRole="button" accessibilityLabel={card.label} accessibilityState={{disabled}} disabled={disabled} onPress={callbacks[key]} onFocus={()=>setFocused(key)} onBlur={()=>setFocused(null)} hitSlop={2} style={({pressed})=>[s.card,{left:card.left*scale,top:card.top*scale,width:card.width*scale,height:card.height*scale,borderRadius:3*scale},pressed&&s.pressed,(busy||(key==='play'&&playDisabled))&&s.busy]}>
    <Image accessible={false} pointerEvents="none" source={artwork.expeditionCards} resizeMode="stretch" style={{position:'absolute',left:-card.x*scale,top:-card.y*scale,width:ATLAS.width*scale,height:ATLAS.height*scale}}/>
    {focused===key&&<View pointerEvents="none" style={[StyleSheet.absoluteFill,s.focus]}/>}
   </Pressable>;
  })}
 </View>;
}
const s=StyleSheet.create({card:{position:'absolute',overflow:'hidden',backgroundColor:'transparent'},pressed:{opacity:.82},busy:{opacity:.5},focus:{borderWidth:2,borderColor:'#ffda83',borderRadius:3}});

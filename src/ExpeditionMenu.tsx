import React,{useState} from 'react';
import {Image,Platform,Pressable,StyleSheet,Text,View} from 'react-native';
import type {ImageSourcePropType} from 'react-native';
import type {StartScreenArtwork} from './start-screen-art';

type Props={width:number;maxHeight:number;fontFamily:string;artwork:StartScreenArtwork;busy:boolean;playDisabled:boolean;onPlay:()=>void;onCustomise:()=>void;onUpgrades:()=>void;onFriends?:()=>void};
type Card='play'|'customise'|'upgrades'|'friends';
const ATLAS={width:1846,height:852},COMPOSITION={width:516,height:599};
const CARDS={
 play:{width:516,height:298,left:0,top:0,label:'PLAY'},
 customise:{width:240,height:170,left:8,top:314,label:'CUSTOMISE'},
 upgrades:{width:242,height:170,left:267,top:314,label:'UPGRADES'},
 friends:{width:504,height:94,left:8,top:505,label:'PLAY WITH FRIENDS!'},
} as const;
const GOLD='#c49a59',CREAM='#f5ddb0',TEAL='#0d3736';

// Paint the clean plaque and its drop shadow separately. The old concept
// image is flattened and contains the old camp behind its clipped corners.
export function ExpeditionPlaque({width,height,scale,children}:{width:number;height:number;scale:number;children:React.ReactNode}){
 const w=width*scale,h=height*scale;
 return <View style={{width:w,height:h,backgroundColor:TEAL,borderRadius:Math.max(5,12*scale),shadowColor:'#000',shadowOpacity:.78,shadowRadius:Math.max(6,14*scale),shadowOffset:{width:0,height:Math.max(3,9*scale)},elevation:12}}>
  <View style={{flex:1,overflow:'hidden',borderWidth:Math.max(1.2,3*scale),borderColor:GOLD,borderRadius:Math.max(5,12*scale),backgroundColor:TEAL}}>
   <View pointerEvents="none" style={{...StyleSheet.absoluteFillObject,borderWidth:Math.max(.6,2*scale),borderColor:'#1f5a51',borderRadius:Math.max(3,8*scale),margin:4*scale}}/>
   {children}
  </View>
  {([0,1,2,3] as const).map(i=><View key={i} pointerEvents="none" style={{position:'absolute',width:Math.max(9,19*scale),height:Math.max(9,19*scale),left:i%2===0?5*scale:undefined,right:i%2===1?5*scale:undefined,top:i<2?5*scale:undefined,bottom:i>=2?5*scale:undefined,transform:[{rotate:'45deg'}],backgroundColor:'#9a572b',borderColor:'#d5a36a',borderWidth:Math.max(1,2*scale),borderRadius:2*scale,alignItems:'center',justifyContent:'center'}}>
   <View style={{width:3*scale,height:3*scale,backgroundColor:'#e5ba7c',borderRadius:2*scale}}/>
  </View>)}
 </View>;
}

// Keep only the forest gate painting from the original approved artwork,
// well inside the new panel. Never sample its contaminated outside edges.
export function ExpeditionForest({scale,source}:{scale:number;source:ImageSourcePropType}){
 const x=1310,y=226,w=466,h=174,destW=476*scale,destH=167*scale,sx=destW/w,sy=destH/h;
 return <View pointerEvents="none" style={{width:destW,height:destH,overflow:'hidden',alignSelf:'center',backgroundColor:'#103c39'}}>
  <Image source={source} resizeMode="stretch" style={{position:'absolute',left:-x*sx,top:-y*sy,width:ATLAS.width*sx,height:ATLAS.height*sy}}/>
  <View style={{position:'absolute',left:0,right:0,bottom:0,height:31*scale,backgroundColor:'#102d2bc0'}}/>
 </View>;
}

export default function ExpeditionMenu({width,maxHeight,fontFamily,artwork,busy,playDisabled,onPlay,onCustomise,onUpgrades,onFriends}:Props){
 const [focused,setFocused]=useState<Card|null>(null);
 const scale=Math.max(.001,Math.min(width/COMPOSITION.width,maxHeight/COMPOSITION.height));
 const callbacks={play:onPlay,customise:onCustomise,upgrades:onUpgrades,friends:onFriends};
 return <View accessibilityLabel="Expedition menu" style={{width:COMPOSITION.width*scale,height:COMPOSITION.height*scale,alignSelf:'flex-end'}}>
  {(Object.keys(CARDS) as Card[]).map(key=>{
   const card=CARDS[key],disabled=(key==='friends'&&!onFriends)||busy||(key==='play'&&playDisabled);
   return <Pressable key={key} accessibilityRole="button" accessibilityLabel={card.label} accessibilityState={{disabled}} disabled={disabled} onPress={callbacks[key]} onFocus={()=>setFocused(key)} onBlur={()=>setFocused(null)} hitSlop={2}
    style={({pressed})=>[{position:'absolute',left:card.left*scale,top:card.top*scale,width:card.width*scale,height:card.height*scale,opacity:pressed?0.82:disabled?0.65:1},Platform.OS==='web'&&{filter:'drop-shadow(0 6px 8px rgba(0,0,0,.50))'}]}>
    <ExpeditionPlaque width={card.width} height={card.height} scale={scale}>
     {key==='play'?<>
      <Text allowFontScaling={false} numberOfLines={1} style={{fontFamily,fontSize:21*scale,lineHeight:48*scale,letterSpacing:2.5*scale,color:CREAM,textAlign:'center'}}>—  YOUR NEXT EXPEDITION  —</Text>
      <ExpeditionForest scale={scale} source={artwork.expeditionCards}/>
      <View style={{flex:1,backgroundColor:'#9d5a19',borderTopWidth:Math.max(1,2*scale),borderTopColor:'#dda64e',alignItems:'center',justifyContent:'center'}}>
       <Text allowFontScaling={false} style={{fontFamily,fontSize:51*scale,lineHeight:61*scale,letterSpacing:3*scale,color:'#fce7bb',textShadowColor:'#452007',textShadowRadius:3*scale,textShadowOffset:{width:0,height:2*scale}}}>▶ PLAY</Text>
      </View>
     </>:key==='friends'?<View style={{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:21*scale,paddingHorizontal:30*scale}}>
       <Image source={artwork.icons.friends} resizeMode="contain" style={{width:56*scale,height:56*scale}}/>
       <View style={{width:1*scale,height:55*scale,backgroundColor:'#c8a2728c'}}/>
       <View style={{flex:1,alignItems:'center',justifyContent:'center'}}><Text allowFontScaling={false} numberOfLines={1} style={{fontFamily,fontSize:24*scale,letterSpacing:1.4*scale,color:CREAM,textAlign:'center'}}>PLAY WITH FRIENDS!</Text>{!onFriends&&<Text allowFontScaling={false} style={{fontFamily,fontSize:13*scale,letterSpacing:3*scale,color:'#d7bd8a'}}>COMING SOON</Text>}</View>
      </View>:<View style={{flex:1,alignItems:'center',justifyContent:'center',gap:11*scale,paddingTop:7*scale}}>
       <Image source={artwork.icons[key]} resizeMode="contain" style={{width:72*scale,height:72*scale}}/>
       <Text allowFontScaling={false} numberOfLines={1} style={{fontFamily,fontSize:27*scale,letterSpacing:2.2*scale,color:CREAM}}>{key==='customise'?'CUSTOMISE':'UPGRADES'}</Text>
      </View>}
      {focused===key&&<View pointerEvents="none" style={{...StyleSheet.absoluteFillObject,borderColor:'#ffde91',borderWidth:2,borderRadius:5*scale}}/>}
    </ExpeditionPlaque>
   </Pressable>;
  })}
 </View>;
}

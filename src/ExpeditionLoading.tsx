import React,{useEffect,useRef} from 'react';
import {Animated,Easing,Text,View,type ImageSourcePropType} from 'react-native';
import {ExpeditionForest,ExpeditionPlaque} from './ExpeditionMenu';

type Props={width:number;height:number;artwork:ImageSourcePropType;forestArtwork?:ImageSourcePropType;progress:number;reducedMotion:boolean};
const ART={width:516,height:599};
export default function ExpeditionLoading({width,height,artwork,forestArtwork,progress,reducedMotion}:Props){
 const scale=Math.max(.001,Math.min(width/ART.width,height/ART.height));
 const target=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0));
 const value=useRef(new Animated.Value(target)).current;
 useEffect(()=>{
  const animation=Animated.timing(value,{toValue:target,duration:reducedMotion?0:320,easing:Easing.out(Easing.cubic),useNativeDriver:false});
  animation.start();return()=>animation.stop();
 },[target,reducedMotion,value]);
 const percent=Math.round(target*100);
 const caption=target===1?'Your expedition is ready':target<.3?'Getting your camp ready':'Preparing your world';
 return <View accessibilityRole="progressbar" accessibilityLabel="Preparing your world" accessibilityValue={{min:0,max:100,now:percent,text:percent+' percent'}} style={{width:ART.width*scale,height:ART.height*scale,alignSelf:'flex-end'}}>
  <ExpeditionPlaque width={ART.width} height={ART.height} scale={scale}>
   <View style={{height:65*scale,alignItems:'center',justifyContent:'center'}}>
    <Text allowFontScaling={false} style={{fontFamily:'CampMenu',fontSize:25*scale,letterSpacing:3*scale,color:'#f3ddb4'}}>— YOUR EXPEDITION —</Text>
   </View>
   <View style={{marginHorizontal:15*scale,overflow:'hidden',borderColor:'#9b814d',borderWidth:Math.max(1,1.5*scale),backgroundColor:'#153e3b',height:203*scale,alignItems:'center',justifyContent:'center'}}>
    <ExpeditionForest scale={scale} source={forestArtwork||artwork}/>
   </View>
   <View style={{paddingHorizontal:33*scale,paddingTop:29*scale,alignItems:'center',gap:14*scale}}>
    <Text allowFontScaling={false} style={{fontFamily:'CampMenu',fontSize:30*scale,textAlign:'center',letterSpacing:1.2*scale,color:'#f4dfb3'}}>PREPARING YOUR CAMP</Text>
    <Text allowFontScaling={false} style={{fontFamily:'CampMenu',fontSize:17*scale,color:'#d8c6a5',textAlign:'center'}}>{caption}</Text>
    <View style={{height:22*scale,width:'100%',borderRadius:8*scale,backgroundColor:'#082223',borderColor:'#a48a58',borderWidth:Math.max(.8,1.5*scale),overflow:'hidden'}}>
     <Animated.View style={{height:'100%',width:value.interpolate({inputRange:[0,1],outputRange:['0%','100%']}),backgroundColor:'#e49325',borderRadius:6*scale}}/>
    </View>
    <Text allowFontScaling={false} style={{fontFamily:'CampMenu',fontSize:24*scale,color:'#f1d6a0'}}>{percent}%</Text>
    <View style={{flexDirection:'row',gap:60*scale,paddingTop:8*scale}}>
     {[0,.33,.72].map((threshold,index)=><View key={index} style={{width:28*scale,height:28*scale,borderRadius:14*scale,borderWidth:2*scale,borderColor:target>=threshold?'#f3ae42':'#62736a',backgroundColor:target>=threshold?'#af6b23':'#102b2b'}}/>)}
    </View>
   </View>
  </ExpeditionPlaque>
 </View>;
}

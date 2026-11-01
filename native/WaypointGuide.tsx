import React,{useEffect,useRef} from 'react';
import {useWaypointNavigation} from '../src/use-waypoint-navigation';
import type {World} from '../src/survival-engine';
import {Animated,Easing} from 'react-native';
import {Canvas,Group,Path} from '@shopify/react-native-skia';
import {WAYPOINT_NEEDLE} from '../src/waypoint';
export default function WaypointGuide({world,active=true}:{world:{current:World|null};active?:boolean}){
 const {angle}=useWaypointNavigation(world,true,active);
 const rotation=useRef(new Animated.Value(angle)).current;
 useEffect(()=>{if(!active){rotation.stopAnimation();return}const motion=Animated.timing(rotation,{toValue:angle,duration:80,easing:Easing.linear,useNativeDriver:true});motion.start();return()=>motion.stop()},[angle,rotation,active]);
 return <Animated.View pointerEvents="none" style={{width:24,height:24,transform:[{rotate:rotation.interpolate({inputRange:[0,Math.PI*2],outputRange:['0rad',`${Math.PI*2}rad`],extrapolate:'extend'})}]}}><Canvas style={{width:24,height:24}}><Group transform={[{translateX:12},{translateY:12}]}><Path path={WAYPOINT_NEEDLE} color="#f4e6c7"/><Path path={WAYPOINT_NEEDLE} color="#c6a56b" style="stroke" strokeWidth={1.3} strokeJoin="round"/><Path path="M0 -9V5L-6 8Z" color="#75998a"/></Group></Canvas></Animated.View>;
}

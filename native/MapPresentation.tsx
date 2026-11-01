import React,{useMemo} from 'react';
import {Text,type StyleProp,type TextStyle,type ViewStyle} from 'react-native';
import Animated,{useAnimatedStyle,useDerivedValue,type SharedValue} from 'react-native-reanimated';
import {Circle,Group,Picture,RadialGradient,type SkPicture} from '@shopify/react-native-skia';
import type {PlayerMapView} from '../src/player-map';
import type {MapIllustration} from '../src/player-map-art';
import {CAMP_MAP_WALL} from '../src/player-map-camp-wall';
import {nativeMapLabel,nativeMapPoint,type MapPoint,type NativeMapLabelData} from './map-presentation';

export function NativeMapPoint({point,view,children,yOffset=0,clip=false,width,height}:{point:MapPoint;view:SharedValue<PlayerMapView>;children:React.ReactNode;yOffset?:number;clip?:boolean;width:number;height:number}){
 const transform=useDerivedValue(()=>{const p=nativeMapPoint(point,view.value);return[{translateX:p.x},{translateY:p.y+yOffset}]});
 const opacity=useDerivedValue(()=>{const p=nativeMapPoint(point,view.value);return !clip||p.x>=-20&&p.x<=width+20&&p.y>=-20&&p.y<=height+20?1:0});
 return <Group transform={transform} opacity={opacity}>{children}</Group>;
}
export function NativeMapCampPicture({item,picture,view}:{item:MapIllustration;picture:SkPicture;view:SharedValue<PlayerMapView>}){
 const transform=useDerivedValue(()=>{const factor=Math.max(1,28/(item.width*view.value.scale));return[{translateX:item.x},{translateY:item.y},{rotate:item.rotation},{scaleX:(item.flipX?-1:1)*factor},{scaleY:(item.flipY?-1:1)*factor}]});
 return <Group transform={transform}><Picture picture={picture}/></Group>;
}
export function NativeMapFireGlow({point,view,night,opacity,radius:worldRadius}:{point:MapPoint;view:SharedValue<PlayerMapView>;night:number;opacity:number;radius:number}){
 const centre=useDerivedValue(()=>nativeMapPoint(point,view.value)),x=useDerivedValue(()=>centre.value.x),y=useDerivedValue(()=>centre.value.y),radius=useDerivedValue(()=>Math.min(190,worldRadius*view.value.scale));
 return <Circle cx={x} cy={y} r={radius} opacity={night*opacity}><RadialGradient c={centre} r={radius} colors={['#ffb957','#efad6040','#efad6000']} positions={[0,.38,1]}/></Circle>;
}
export function NativeMapLabel({data,view,width,height,style,textStyle}:{data:NativeMapLabelData;view:SharedValue<PlayerMapView>;width:number;height:number;style:StyleProp<ViewStyle>;textStyle:StyleProp<TextStyle>}){
 const campSpan=CAMP_MAP_WALL.radius*2;
 const animated=useAnimatedStyle(()=>{const p=nativeMapLabel(data,view.value,width,height,campSpan);return{left:p.left,top:p.top,width:p.width,opacity:p.labelOpacity}});
 return <Animated.View pointerEvents="none" style={[style,animated]}><Text numberOfLines={1} style={textStyle}>{data.label}</Text></Animated.View>;
}
export function NativeMapLandmark({data,view,width,height,children}:{data:NativeMapLabelData;view:SharedValue<PlayerMapView>;width:number;height:number;children:React.ReactNode}){
 const campSpan=CAMP_MAP_WALL.radius*2,position=useDerivedValue(()=>nativeMapLabel(data,view.value,width,height,campSpan)),transform=useDerivedValue(()=>[{translateX:position.value.anchor.x},{translateY:position.value.anchor.y}]),opacity=useDerivedValue(()=>position.value.opacity);
 return <Group transform={transform} opacity={opacity}>{children}</Group>;
}
export function NativeMapWaypointLabel({point,view,style,textStyle}:{point:MapPoint;view:SharedValue<PlayerMapView>;style:StyleProp<ViewStyle>;textStyle:StyleProp<TextStyle>}){
 const animated=useAnimatedStyle(()=>{const p=nativeMapPoint(point,view.value);return{left:p.x-34,top:p.y+6}});
 return <Animated.View pointerEvents="none" style={[style,animated]}><Text style={textStyle}>WAYPOINT</Text></Animated.View>;
}
export function NativeMapAccessiblePlayer({point,view,width,height,label}:{point:MapPoint;view:SharedValue<PlayerMapView>;width:number;height:number;label:string}){
 const animated=useAnimatedStyle(()=>{const p=nativeMapPoint(point,view.value);return{left:p.x-22,top:p.y-22,opacity:p.x>=-20&&p.x<=width+20&&p.y>=-20&&p.y<=height+20?1:0}});
 return <Animated.View pointerEvents="none" accessible accessibilityRole="image" accessibilityLabel={label} style={[{position:'absolute',width:44,height:44},animated]}/>;
}

import {CAMP_RESTORATION_ART} from './camp-restoration-art';
import {FURNACE_NATIVE_ART} from './furnace-animation-art';
import {IRONWORKS_NATIVE_ART} from './ironworks-art';
import React,{useEffect,useRef} from 'react';
import {View,StyleSheet,BackHandler,type ImageSourcePropType} from 'react-native';
import type {World} from '../src/survival-engine';
import HeadquartersContent,{FurnaceRepairContent,type HeadquartersNavigation} from '../src/HeadquartersContent';
import {presentStationMenu} from '../src/station-menu-layout';
import {BUNDLED_ART} from './bundled-art';
import {BACKPACK_NATIVE_ART} from './backpack-art';
import {WORLD_URL} from './config';
import StationMenu from './StationMenu';
type Props={world:World;width:number;height:number;safe:{top:number;bottom:number;left:number;right:number};onClose:()=>void;onChange:()=>void};
const furnaceArt=IRONWORKS_NATIVE_ART.campFurnaceRuined;
const textures:Record<string,number>={
 '/survival/headquarters-menu-v1/camp-dawn.webp':require('../public/survival/headquarters-menu-v1/camp-dawn.webp'),
 '/survival/ui-field-kit-v1/logs.png':require('../public/survival/ui-field-kit-v1/logs.png'),
 '/survival/headquarters-menu-v1/camp-plan.webp':require('../public/survival/headquarters-menu-v1/camp-plan.webp'),
 '/survival/headquarters-menu-v1/parchment.webp':require('../public/survival/headquarters-menu-v1/parchment.webp'),
 '/survival/hq-furniture-v2/exploration-bench.webp':require('../public/survival/hq-furniture-v2/exploration-bench.webp'),
 '/survival/camp-workshop-v2/idle-00.webp':require('../public/survival/camp-workshop-v2/idle-00.webp'),
 '/survival/ui-field-kit-v1/axe.png':require('../public/survival/ui-field-kit-v1/axe.png'),
 '/survival/scrap-runner/bow-v1/bow-icon.webp':require('../public/survival/scrap-runner/bow-v1/bow-icon.webp'),
 '/survival/scrap-runner/bow-v1/arrows-icon.webp':require('../public/survival/scrap-runner/bow-v1/arrows-icon.webp'),
};
const source=(path:string):ImageSourcePropType=>FURNACE_NATIVE_ART[path]??CAMP_RESTORATION_ART[path]??textures[path]??BUNDLED_ART[path]??BACKPACK_NATIVE_ART[path]??{uri:path.startsWith('/')?WORLD_URL+path:path};
export default function HeadquartersPanel({world,width,height,safe,onClose,onChange}:Props){
 const navigation=useRef<HeadquartersNavigation>(null);
 const available={width:Math.max(1,width-safe.left-safe.right-16),height:Math.max(1,height-safe.top-safe.bottom-16)};
 useEffect(()=>{presentStationMenu(world,true,false,safe);const back=BackHandler.addEventListener('hardwareBackPress',()=>{navigation.current?.back();return true});return()=>{back.remove();presentStationMenu(world,false)}},[world.fire,onClose,safe.top,safe.left,safe.right,safe.bottom]);
 return <View style={[StyleSheet.absoluteFill,{paddingTop:safe.top+8,paddingBottom:safe.bottom+8,paddingLeft:safe.left+8,paddingRight:safe.right+8,backgroundColor:'#0a0d0bd9'}]}><HeadquartersContent world={world} {...available} navigation={navigation} source={source} onClose={onClose} onChange={onChange}/></View>;
}
export function FurnaceRepairPanel(props:Props){
 return <StationMenu {...props} compact fitContent title="Damaged furnace" image={furnaceArt}>
  <FurnaceRepairContent world={props.world} source={source} onClose={props.onClose} onChange={props.onChange}/>
 </StationMenu>;
}

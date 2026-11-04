import {CAMP_RESTORATION_ART} from './camp-restoration-art';
import React,{useEffect} from 'react';
import {View,Text,Pressable,ScrollView,StyleSheet,Image,BackHandler,type ImageSourcePropType} from 'react-native';
import type {World} from '../src/survival-engine';
import HeadquartersContent from '../src/HeadquartersContent';
import {presentStationMenu} from '../src/station-menu-layout';
import {blueprintLearned} from '../src/headquarters-plans';
import {campAccessLevel} from '../src/camp-levels';
import {BUNDLED_ART} from './bundled-art';
import {BACKPACK_NATIVE_ART} from './backpack-art';
import {WORLD_URL} from './config';
import StationMenu from './StationMenu';
import {packWeight} from '../src/expedition-inventory';
import {canPayMaterials} from '../src/camp-materials';
import {costRows,RESTORE_FURNACE_COST} from '../src/run-progression';
type Props={world:World;width:number;height:number;safe:{top:number;bottom:number;left:number;right:number};onClose:()=>void;onChange:()=>void};
const furnaceArt=require('../public/survival/camp-craft-v2/furnace-idle.webp');
const textures:Record<string,number>={
 '/survival/ui-field-kit-v1/logs.png':require('../public/survival/ui-field-kit-v1/logs.png'),
 '/survival/headquarters-menu-v1/camp-plan.webp':require('../public/survival/headquarters-menu-v1/camp-plan.webp'),
 '/survival/headquarters-menu-v1/parchment.webp':require('../public/survival/headquarters-menu-v1/parchment.webp'),
 '/survival/hq-furniture-v2/exploration-bench.webp':require('../public/survival/hq-furniture-v2/exploration-bench.webp'),
 '/survival/camp-workshop-v1/camp-workshop.webp':require('../public/survival/camp-workshop-v1/camp-workshop.webp'),
 '/survival/ui-field-kit-v1/axe.png':require('../public/survival/ui-field-kit-v1/axe.png'),
 '/survival/scrap-runner/bow-v1/bow-icon.webp':require('../public/survival/scrap-runner/bow-v1/bow-icon.webp'),
 '/survival/scrap-runner/bow-v1/arrows-icon.webp':require('../public/survival/scrap-runner/bow-v1/arrows-icon.webp'),
};
const source=(path:string):ImageSourcePropType=>CAMP_RESTORATION_ART[path]??textures[path]??BUNDLED_ART[path]??BACKPACK_NATIVE_ART[path]??{uri:path.startsWith('/')?WORLD_URL+path:path};
export default function HeadquartersPanel({world,width,height,safe,onClose,onChange}:Props){
 const available={width:Math.max(1,width-safe.left-safe.right-16),height:Math.max(1,height-safe.top-safe.bottom-16)};
 useEffect(()=>{presentStationMenu(world,true,false,safe);const back=BackHandler.addEventListener('hardwareBackPress',()=>{onClose();return true});return()=>{back.remove();presentStationMenu(world,false)}},[world.fire,onClose,safe.top,safe.left,safe.right,safe.bottom]);
 return <View style={[StyleSheet.absoluteFill,{paddingTop:safe.top+8,paddingBottom:safe.bottom+8,paddingLeft:safe.left+8,paddingRight:safe.right+8,backgroundColor:'#081812c9'}]}><HeadquartersContent world={world} {...available} source={source} onClose={onClose} onChange={onChange}/></View>;
}
function Action({label,disabled=false,onPress,primary=false}:{label:string;disabled?:boolean;onPress:()=>void;primary?:boolean}){return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={[s.button,primary&&s.primary,disabled&&{opacity:.45}]}><Text style={[s.buttonText,primary&&{color:'#203a2f'}]}>{label}</Text></Pressable>}
function Costs({world,cost}:{world:World;cost:typeof RESTORE_FURNACE_COST}){return <View style={s.costs}>{costRows(world,cost).map(m=><View key={m.id} style={s.cost}><Text style={s.small}>{m.name}</Text><Text style={[s.value,{color:m.have>=m.needed?'#bdd392':'#e6aa88'}]}>{m.have} / {m.needed}</Text></View>)}</View>}
export function FurnaceRepairPanel(props:Props){const {world:w,onClose}=props;return <StationMenu {...props} compact title="Damaged furnace" subtitle="RESTORE METALWORKING" image={furnaceArt} weight={packWeight(w)}><ScrollView contentContainerStyle={s.scroll}><View style={{flexDirection:'row',gap:12,alignItems:'center'}}><Image source={furnaceArt} resizeMode="contain" style={{width:92,height:105}}/><View style={{flex:1,gap:6}}><Text style={s.eyebrow}>CAMP LEVEL 2</Text><Text style={s.title}>Bring the forge back to life</Text><Text style={s.copy}>Equip your repair hammer beside the furnace to restore it with camp materials.</Text></View></View><Text style={s.copy}>{campAccessLevel(w)>=2?'✓ Camp level 2 unlocked':'Requires Camp level 2'}</Text><Costs world={w} cost={RESTORE_FURNACE_COST}/><Action primary label="Return to camp · Equip repair hammer" onPress={onClose}/><Text style={s.small}>Materials come from your backpack and camp stores.</Text></ScrollView></StationMenu>}
const s=StyleSheet.create({scroll:{gap:10,padding:2,paddingBottom:10},mission:{padding:12,gap:7,borderWidth:1,borderColor:'#a9955b',borderRadius:8,backgroundColor:'#193e35'},eyebrow:{fontSize:9,letterSpacing:1.2,color:'#d6bd7e',fontWeight:'700'},title:{fontFamily:'FieldKitBarlow',fontSize:18,color:'#f3e4c2'},copy:{fontSize:12,lineHeight:17,color:'#c7d0b7'},small:{fontSize:10,lineHeight:14,color:'#b9c6ad'},cards:{flexDirection:'row',gap:6},card:{flex:1,padding:9,gap:6,borderWidth:1,borderColor:'#83794e',borderRadius:7,backgroundColor:'#112e29'},selected:{borderColor:'#dec28a',backgroundColor:'#365346'},cardName:{fontFamily:'FieldKitBarlow',fontSize:14,color:'#f3e4c2'},detail:{padding:10,gap:8,borderRadius:8,backgroundColor:'#15332c'},costs:{flexDirection:'row',gap:6},cost:{flex:1,padding:8,gap:4,borderRadius:6,backgroundColor:'#122d28'},value:{fontWeight:'700',fontSize:15},button:{minHeight:42,padding:10,borderWidth:1,borderColor:'#9b855e',borderRadius:7,backgroundColor:'#16372f',alignItems:'center',justifyContent:'center'},buttonText:{fontSize:12,color:'#f4e6c7',fontWeight:'700'},primary:{backgroundColor:'#dcc18a'}});

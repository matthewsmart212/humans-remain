import {Canvas,Path} from '@shopify/react-native-skia';
import React,{useEffect,useRef,useState} from 'react';
import {AppState,View,Text,Image,StyleSheet,type GestureResponderEvent} from 'react-native';
import {ACTION_HEX,actionHexOutline,actionHexAt,pointInActionHex,type ActionHexSlot} from '../src/action-hex';
import {FIELD_KIT_NATIVE_ART as art} from './field-kit-art';
import type {FieldKitIcon} from '../src/field-kit';
type Action={label:string;holdToRepair?:boolean;ariaLabel?:string;icon?:FieldKitIcon;glyph?:React.ReactNode;image?:number;disabled:boolean;unavailable?:boolean;repairProgress?:number;pressed?:boolean;onDown:()=>void;onUp?:()=>void};
type Props={primary:Action;sprint:Action;dodge?:Action;repair?:Action};
const frames={primary:require('../public/survival/ui-action-hex-v1/primary.png'),secondary:require('../public/survival/ui-action-hex-v1/secondary.png'),active:require('../public/survival/ui-action-hex-v1/active.png')};
export default function HexActions(props:Props){
 const latest=useRef(props);latest.current=props;
 const contacts=useRef(new Map<string,{slot:ActionHexSlot;up?:()=>void}>()),[touching,setTouching]=useState<ActionHexSlot[]>([]);
 const release=(id?:string)=>{for(const[key,contact]of contacts.current){if(id!==undefined&&id!==key)continue;contacts.current.delete(key);contact.up?.()}setTouching([...contacts.current.values()].map(c=>c.slot))};
 useEffect(()=>{if(props.primary.disabled&&props.sprint.disabled&&(!props.repair||props.repair.disabled))release()},[props.primary.disabled,props.sprint.disabled,props.repair?.disabled]);
 useEffect(()=>{const listener=AppState.addEventListener('change',state=>{if(state!=='active')release()});return()=>{listener.remove();for(const c of contacts.current.values())c.up?.();contacts.current.clear()}},[]);
 const start=(e:GestureResponderEvent)=>{for(const t of e.nativeEvent.changedTouches){const id=String(t.identifier),slot=actionHexAt(t.locationX,t.locationY),action=slot&&latest.current[slot];if(!slot||!action||action.disabled||contacts.current.has(id)||[...contacts.current.values()].some(c=>c.slot===slot))continue;contacts.current.set(id,{slot,up:action.onUp});action.onDown()}setTouching([...contacts.current.values()].map(c=>c.slot))};
 const move=(e:GestureResponderEvent)=>{for(const t of e.nativeEvent.changedTouches){const id=String(t.identifier),contact=contacts.current.get(id);if(contact&&!pointInActionHex(t.locationX,t.locationY,ACTION_HEX.cells[contact.slot]))release(id)}};
 return <View style={{width:ACTION_HEX.width,height:ACTION_HEX.height}} onTouchStart={start} onTouchMove={move} onTouchEnd={e=>{for(const t of e.nativeEvent.changedTouches)release(String(t.identifier))}} onTouchCancel={()=>release()}>
  {(['primary','sprint','dodge','repair'] as const).map(slot=>{const action=props[slot];if(!action)return null;const cell=ACTION_HEX.cells[slot],main=slot==='primary',active=action.pressed===true,holdRepair=action.holdToRepair&&action.label==='REPAIR';
   return <View key={slot} pointerEvents="none" accessible accessibilityRole="button" accessibilityLabel={action.ariaLabel??action.label} accessibilityState={{disabled:action.disabled,...(action.pressed===undefined?{}:{selected:active})}} accessibilityActions={[{name:'activate',label:action.label}]} onAccessibilityAction={e=>{if(e.nativeEvent.actionName==='activate'&&!action.disabled){action.onDown();action.onUp?.()}}} style={[s.button,cell,(action.disabled||action.unavailable)&&s.disabled,touching.includes(slot)&&s.touching]}>
    <Image source={frames[active?'active':main?'primary':'secondary']} resizeMode="stretch" style={[StyleSheet.absoluteFill,{width:cell.width,height:cell.height}]}/>
    <View pointerEvents="none" style={[s.content,main&&{padding:ACTION_HEX.padding*1.2}]}>{action.glyph??<Image source={action.image??art[action.icon as keyof typeof art]??art.punch} resizeMode="contain" style={{width:main?33.6:holdRepair?18:21,height:main?33.6:holdRepair?18:21}}/>}{holdRepair?<View style={s.repairLabel}><Text style={[s.holdCaption,main?{fontSize:9,lineHeight:9.6}:{fontSize:6.5,lineHeight:7}]}>HOLD TO</Text><Text style={[s.label,{fontSize:main?12:8.5,lineHeight:main?14.4:10}]}>{action.label}</Text></View>:<Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.8} style={[s.label,{fontSize:main?12:8.5,lineHeight:main?14.4:10}]}>{action.label}</Text>}</View>
    {action.repairProgress!==undefined&&<Canvas pointerEvents="none" style={StyleSheet.absoluteFill}><Path path={actionHexOutline(cell)} style="stroke" strokeWidth={1.8} strokeJoin="round" strokeCap="round" color="#ffd37d" start={0} end={Math.max(0,Math.min(1,action.repairProgress))}/></Canvas>}
    {action.pressed!==undefined&&<View style={[s.pip,{top:cell.height*.25},active&&s.activePip]}/>}
   </View>
  })}
 </View>;
}
const s=StyleSheet.create({button:{position:'absolute',alignItems:'center',justifyContent:'center'},content:{alignItems:'center',justifyContent:'center',padding:ACTION_HEX.padding,gap:2,width:'100%'},label:{fontFamily:'FieldKitBarlow',color:'#f4e6c7',textAlign:'center'},repairLabel:{alignItems:'center'},holdCaption:{fontFamily:'FieldKitBarlow',fontSize:7.5,lineHeight:8,color:'#d9c7a0',letterSpacing:.25},pip:{position:'absolute',right:4,width:7,height:7,borderRadius:4,borderWidth:1.5,borderColor:'#a49465',backgroundColor:'#314c3c'},activePip:{backgroundColor:'#bae276',borderColor:'#254a2e'},disabled:{opacity:.5},touching:{opacity:.8}});

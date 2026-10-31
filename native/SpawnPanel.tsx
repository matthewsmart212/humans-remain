import {HOUND_NATIVE_ART} from './hound-art';
import {BRUTE_NATIVE_ART} from './brute-art';
import {WALKER_NATIVE_ART} from './walker-art';
import {SKITTER_NATIVE_ART} from './skitter-art';
import React,{useState} from 'react';
import {View,Text,Pressable,Image,StyleSheet} from 'react-native';
import {SPAWNABLES,type SpawnKind} from '../src/play-spawns';
import {BUNDLED_ART} from './bundled-art';
type Props={onSpawn:(kind:SpawnKind,count:number)=>Promise<string>;onBack:()=>void;onClear:()=>void;onHeal:()=>void};
export default function NativeSpawnPanel({onSpawn,onBack,onClear,onHeal}:Props){
 const [filter,setFilter]=useState('All'),[kind,setKind]=useState<SpawnKind>('scrap-bomber'),[count,setCount]=useState(1),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const spawn=async()=>{if(busy)return;setBusy(true);setMessage('');try{setMessage(await onSpawn(kind,count))}catch{setMessage('Artwork could not load. Please try again.')}finally{setBusy(false)}};
 const button=(label:string,action:()=>void,selected=false)=><Pressable accessibilityRole="button" accessibilityState={{disabled:busy,selected}} disabled={busy} onPress={action} style={[s.button,selected&&s.selected]}><Text style={s.text}>{label}</Text></Pressable>;
 return <View style={s.panel}><Text style={s.title}>Spawn</Text><Text style={s.note}>Choose a creature to spawn on clear ground nearby.</Text>
  <View style={s.row}>{['All','Animals','Robots'].map(group=><React.Fragment key={group}>{button(group,()=>{setFilter(group);const options=SPAWNABLES.filter(v=>group==='All'||v.group===group);if(!options.some(v=>v.id===kind))setKind(options[0].id);setMessage('')},group===filter)}</React.Fragment>)}</View>
  <View style={s.grid}>{SPAWNABLES.filter(v=>filter==='All'||v.group===filter).map(v=><Pressable key={v.id} accessibilityRole="button" accessibilityLabel={`Select ${v.name}`} accessibilityState={{selected:kind===v.id,disabled:busy}} disabled={busy} onPress={()=>setKind(v.id)} style={[s.card,kind===v.id&&s.selected]}><Image source={HOUND_NATIVE_ART[v.image]??BRUTE_NATIVE_ART[v.image]??SKITTER_NATIVE_ART[v.image]??WALKER_NATIVE_ART[v.image]??BUNDLED_ART[v.image]} style={{width:50,height:50}} resizeMode="contain"/><Text style={s.text}>{v.name}</Text></Pressable>)}</View>
  <Text style={s.note}>Quantity</Text><View style={s.row}>{[1,3,5].map(n=><React.Fragment key={n}>{button(String(n),()=>setCount(n),n===count)}</React.Fragment>)}</View>
  {button(busy?'Loading…':`Spawn ${count} · ${SPAWNABLES.find(v=>v.id===kind)!.name}`,()=>{void spawn()})}
  {!!message&&<Text accessibilityRole="alert" style={s.note}>{message}</Text>}
  <View style={s.row}>{button('Clear spawned',()=>{onClear();setMessage('Spawned creatures cleared.')})}{button('Restore health',()=>{onHeal();setMessage('Health restored.')})}</View>
  {button('Back to settings',onBack)}
 </View>;
}
const s=StyleSheet.create({panel:{gap:12},row:{flexDirection:'row',gap:8},grid:{flexDirection:'row',flexWrap:'wrap',gap:8},card:{width:'48%',minHeight:85,padding:8,borderRadius:9,borderWidth:1,borderColor:'#59736c',backgroundColor:'#24433f',flexDirection:'row',alignItems:'center',gap:5},button:{flex:1,minHeight:44,padding:10,borderRadius:9,borderWidth:1,borderColor:'#59736c',backgroundColor:'#24433f',justifyContent:'center',alignItems:'center'},selected:{borderColor:'#edbf73',backgroundColor:'#46533d'},text:{flexShrink:1,fontSize:13,fontWeight:'700',color:'#ffe4b2'},title:{fontSize:30,fontWeight:'900',color:'#f4d49c',textAlign:'center'},note:{fontSize:12,lineHeight:17,color:'#d6d5bd',textAlign:'center'}});

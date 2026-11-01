import React,{useState} from 'react';
import {View,Text,Pressable,ScrollView,StyleSheet} from 'react-native';
import {GamePerformanceRecorder,performanceDuration,performanceResultRows} from '../src/performance-recording';
import {usePerformanceSnapshot} from '../src/use-performance-snapshot';

export function NativePerformanceOverlay({recorder,top,left}:{recorder:GamePerformanceRecorder;top:number;left:number}){
 const state=usePerformanceSnapshot(recorder);
 if(!state.overlay&&!state.recording)return null;
 return <View pointerEvents="none" style={[s.meter,{top,left}]} accessibilityLiveRegion="none">
  {state.overlay&&<><Text style={s.meterNumber}>{state.live?`${state.live.fps.toFixed(0)} FPS`:'FPS —'}</Text><Text style={s.small}>{state.live?`${state.live.frameMs.toFixed(1)} ms · CPU render ${state.live.renderMs.toFixed(1)} ms`:'Waiting for active gameplay'}</Text></>}
  {state.recording&&<Text style={s.recording}>● REC {performanceDuration(state.wallSeconds)}</Text>}
 </View>;
}
export function NativePerformanceMenuOptions({recorder,onOpen,onSpawn}:{recorder:GamePerformanceRecorder;onOpen:()=>void;onSpawn?:()=>void}){
 const state=usePerformanceSnapshot(recorder);
 return <><Pressable accessibilityRole="switch" accessibilityState={{checked:state.overlay}} accessibilityLabel="Show FPS and frame time" onPress={()=>recorder.setOverlay(!state.overlay)} style={s.button}><Text style={s.buttonText}>Show FPS &amp; frame time · {state.overlay?'ON':'OFF'}</Text></Pressable>
  <View style={{flexDirection:'row',gap:8}}><Pressable accessibilityRole="button" onPress={onOpen} style={[s.button,{flex:1}]}><Text style={s.buttonText}>{state.recording?'Performance · recording':'Performance recording'}</Text></Pressable>{onSpawn&&<Pressable accessibilityRole="button" onPress={onSpawn} style={[s.button,{flex:1}]}><Text style={s.buttonText}>Spawn</Text></Pressable>}</View></>;
}
export async function exportNativePerformanceLog(recorder:GamePerformanceRecorder){
 // Load/file-write only after Stop, in the paused diagnostics screen.
 const [{File,Paths},Sharing]=await Promise.all([import('expo-file-system'),import('expo-sharing')]);
 if(!await Sharing.isAvailableAsync())throw Error('File sharing is unavailable on this device.');
 const file=new File(Paths.cache,'humans-remain-performance.json');file.write(recorder.exportJson());
 await Sharing.shareAsync(file.uri,{mimeType:'application/json',UTI:'public.json',dialogTitle:'Save performance log'});
}
export default function NativePerformancePanel({recorder,onStart,onBack,defeated,wide}:{recorder:GamePerformanceRecorder;onStart:()=>void;onBack:()=>void;defeated:boolean;wide:boolean}){
 const state=usePerformanceSnapshot(recorder),summary=recorder.summary(),[message,setMessage]=useState(''),[exporting,setExporting]=useState(false);
 const button=(label:string,onPress:()=>void,primary=false,disabled=false)=><Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={[s.button,primary&&s.primary,disabled&&s.disabled]}><Text style={[s.buttonText,primary&&s.primaryText]}>{label}</Text></Pressable>;
 const save=async()=>{setExporting(true);setMessage('');try{await exportNativePerformanceLog(recorder)}catch(e){setMessage(e instanceof Error?e.message:'Export failed. Your log is still here.')}finally{setExporting(false)}};
 return <View style={s.panel}><ScrollView contentContainerStyle={s.content}>
  <Text style={s.eyebrow}>FIELD DIAGNOSTICS</Text><Text accessibilityRole="header" style={s.title}>Performance</Text><Text style={s.subtitle}>Record gameplay, pinch into the map, then pause and stop.</Text>
  <View style={[s.columns,wide&&s.wide]}><View style={[s.column,wide&&s.wideColumn]}>
   <View style={s.session}><Text style={s.recording}>{state.recording?'● RECORDING':state.hasLog?'RECORDING COMPLETE':'READY TO RECORD'}</Text><Text style={s.time}>{performanceDuration(state.wallSeconds)}</Text><Text style={s.small}>{state.frames.toLocaleString()} frames · {state.recording?'paused time excluded':'up to 15 minutes per log'}</Text></View>
   {summary?<><View>{performanceResultRows(summary).map(([label,value])=><View style={s.result} key={label}><Text style={s.small}>{label}</Text><Text style={s.value}>{value}</Text></View>)}</View><Text style={s.note}>{summary.stopReason} · Detailed stage timings and linked slow frames are in the exported log.</Text></>:<Text style={s.note}>Every active frame, map gestures and loading, actual map zoom, hidden world drawing, slow game updates and development UI render timings. Slow frames include the preceding render call. Menus and background time are excluded from FPS.</Text>}
  </View><View style={[s.column,wide&&s.wideColumn]}>
   <Pressable accessibilityRole="switch" accessibilityState={{checked:state.overlay}} accessibilityLabel="FPS overlay" style={s.button} onPress={()=>recorder.setOverlay(!state.overlay)}><Text style={s.buttonText}>FPS overlay · {state.overlay?'ON':'OFF'}</Text></Pressable>
   {state.recording?button('■ Stop recording',()=>recorder.stop(performance.now())):button(state.hasLog?'New recording & resume':'Start recording & resume',()=>{setMessage('');onStart()},true,defeated||exporting)}
   {state.hasLog&&!state.recording&&button(exporting?'Preparing log…':'Export log (.json)',()=>void save(),false,exporting)}
   {button('Back to pause menu',onBack,false,exporting)}
   <Text style={s.note}>Opt-in. Timing buffers ≤ 6.9 MB plus capped event/context history; display refreshes twice a second. New recordings replace the previous log. Export before closing the app.</Text>
   <Text style={s.note}>FPS measures the game loop, not the native GPU/display. No screenshots or automatic uploads. Export opens the share sheet — choose Save to Files.</Text>
   {!!message&&<Text accessibilityRole="alert" style={s.note}>{message}</Text>}
  </View></View>
 </ScrollView></View>;
}
const s=StyleSheet.create({
 panel:{width:'100%',maxWidth:720,maxHeight:'100%',borderWidth:1,borderColor:'#9b8054',borderRadius:16,backgroundColor:'#153234'},content:{padding:18,gap:8},title:{fontSize:28,fontWeight:'900',color:'#f6d69c',textAlign:'center'},eyebrow:{fontSize:10,letterSpacing:2,color:'#b5bd9f',textAlign:'center'},subtitle:{fontSize:13,color:'#d1cfb3',textAlign:'center',marginBottom:8},columns:{gap:18},wide:{flexDirection:'row'},column:{gap:8,minWidth:0},wideColumn:{flex:1},
 button:{minHeight:44,paddingHorizontal:12,paddingVertical:10,borderRadius:9,borderWidth:1,borderColor:'#938260',backgroundColor:'#24433f',justifyContent:'center',alignItems:'center'},buttonText:{fontSize:14,fontWeight:'700',color:'#ffe4b2'},primary:{backgroundColor:'#edbf73',borderColor:'#edbf73'},primaryText:{color:'#172c30'},disabled:{opacity:.4},
 session:{padding:12,gap:4,borderWidth:1,borderColor:'#84754f',borderRadius:10,backgroundColor:'#0d2427'},time:{fontSize:28,fontWeight:'800',color:'#f6e6c6',fontVariant:['tabular-nums']},recording:{fontSize:11,fontWeight:'700',color:'#efc583',letterSpacing:.6},small:{fontSize:11,color:'#c2cab7',lineHeight:16},note:{fontSize:12,lineHeight:17,color:'#c2cab7'},result:{flexDirection:'row',justifyContent:'space-between',gap:10,paddingVertical:6,borderBottomWidth:1,borderBottomColor:'#a88d4e33'},value:{fontSize:11,color:'#f2d496',textAlign:'right',fontVariant:['tabular-nums']},
 meter:{position:'absolute',paddingHorizontal:10,paddingVertical:6,gap:2,borderWidth:1,borderColor:'#aa96638c',borderRadius:8,backgroundColor:'#102d30dd'},meterNumber:{color:'#c0dfa5',fontSize:15,fontWeight:'800',fontVariant:['tabular-nums']}
});

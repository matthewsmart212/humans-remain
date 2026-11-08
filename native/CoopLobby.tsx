import React,{useEffect,useRef,useState} from 'react';
import {View,Text,TextInput,Pressable,StyleSheet,AppState,ScrollView,Keyboard} from 'react-native';
import {COOP_ROOM_CODE} from '../src/coop-protocol';
import type {SurvivorRoleId} from '../src/survivor-roles';
import {COOP_API,CoopClient,createCoopRoom} from './coop-client';

type Props={role:SurvivorRoleId;name:string;onBack:()=>void;onLaunch:(client:CoopClient)=>void};
export default function CoopLobby({role,name,onBack,onLaunch}:Props){
 const [phase,setPhase]=useState<'choose'|'join'|'room'>('choose');
 const [code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [version,setVersion]=useState(0);
 const client=useRef<CoopClient|null>(null),unlisten=useRef<(()=>void)|null>(null),launched=useRef(false);
 const current=client.current;
 const close=()=>{
  unlisten.current?.();unlisten.current=null;
  client.current?.dispose();client.current=null;
  onBack();
 };
 useEffect(()=>{
  const subscription=AppState.addEventListener('change',state=>client.current?.setForeground(state==='active'));
  return()=>{subscription.remove();unlisten.current?.();if(!launched.current)client.current?.dispose()};
 },[]);
 const enter=async(create:boolean)=>{
  if(busy)return;
  setError('');setBusy(true);Keyboard.dismiss();
  try{
   if(!/^https:\/\//.test(COOP_API))throw Error('Co-op server is not configured in this iOS build.');
   const normalized=code.trim().toUpperCase().replace(/[\s-]/g,'');
   if(!create&&!COOP_ROOM_CODE.test(normalized))throw Error('Enter the eight-character expedition code.');
   const room=create?await createCoopRoom():normalized;
   if(!create){const r=await fetch(COOP_API+'/rooms/'+room);if(!r.ok)throw Error(r.status===404?'Expedition not found or expired.':'Unable to join ('+r.status+').')}
   const session=new CoopClient(room,name,role);
   client.current=session;
   unlisten.current=session.subscribe(event=>{
    if(event==='start'){
     if(launched.current)return;
     launched.current=true;onLaunch(session);
    }else setVersion(v=>v+1);
   });
   session.connect();setCode(room);setPhase('room');
  }catch(e){setError(e instanceof Error?e.message:String(e))}
  finally{setBusy(false)}
 };
 const button=(label:string,fn:()=>void,disabled=false)=><Pressable accessibilityRole="button" disabled={disabled} onPress={fn} style={[s.button,disabled&&s.disabled]}><Text style={s.buttonText}>{label}</Text></Pressable>;
 void version;
 return <View accessibilityViewIsModal style={s.root}>
  <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
   <Text style={s.kicker}>HUMANS REMAIN · iOS CO-OP PREVIEW</Text>
   <Text style={s.title}>Play With Friends</Text>
   <Text style={s.body}>Private expeditions for up to four survivors. This first test shares characters and movement, not combat, resources or saves.</Text>
   {phase==='choose'?<>
    {button('Create an expedition',()=>void enter(true),busy)}
    {button('Join with a code',()=>{setPhase('join');setError('')},busy)}
   </>:phase==='join'?<>
    <Text style={s.label}>FRIEND'S EXPEDITION CODE</Text>
    <TextInput accessibilityLabel="Expedition code" autoCapitalize="characters" autoCorrect={false} maxLength={10} placeholder="ABCDEFGH" placeholderTextColor="#7e948d" value={code} onChangeText={setCode} style={s.input}/>
    {button(busy?'Connecting…':'Join expedition',()=>void enter(false),busy)}
    {button('Back',()=>{setPhase('choose');setError('')},busy)}
   </>:<>
    <View style={s.codeBox}><Text style={s.label}>INVITE CODE</Text><Text selectable style={s.code}>{code}</Text></View>
    <Text style={s.status}>{current?.status==='connected'?'Connected':current?.status==='reconnecting'?'Reconnecting…':current?.status==='failed'?'Connection failed':current?.status==='offline'?'Offline':'Connecting…'} · {current?.players.length??0} / 4 survivors</Text>
    {current?.players.map(peer=><View style={s.member} key={peer.id}><Text style={s.memberName}>{peer.name} · {peer.role}</Text><Text style={s.memberStatus}>{peer.id===current.id?'You':peer.id===current.players[0]?.id?'Host':'Ready'}</Text></View>)}
    {current?.isHost?button('Start expedition',()=>current.start(),current.status!=='connected'||current.players.length<2):<Text style={s.body}>Waiting for the expedition host to start the game.</Text>}
    {current?.isHost&&current.players.length<2&&<Text style={s.hint}>Invite a second iPhone to begin the two-player test.</Text>}
    {current?.status==='failed'&&button('Retry connection',()=>current.connect())}
   </>}
   {!!(error||current?.error)&&<Text accessibilityRole="alert" style={s.error}>{error||current?.error}</Text>}
   {button('Return to starting screen',close)}
   {!COOP_API&&<Text style={s.hint}>Developer setup: deploy the co-op Worker and configure EXPO_PUBLIC_COOP_URL in native/.env.local.</Text>}
  </ScrollView>
 </View>;
}
const s=StyleSheet.create({
 root:{position:'absolute',top:0,left:0,right:0,bottom:0,zIndex:2000,backgroundColor:'#071b1df7',alignItems:'center',justifyContent:'center'},
 content:{width:'100%',maxWidth:490,alignSelf:'center',paddingHorizontal:24,paddingVertical:26,gap:13},
 kicker:{color:'#b3b99a',fontSize:11,letterSpacing:2,textAlign:'center'},title:{color:'#f6d8a2',fontSize:29,fontWeight:'900',textAlign:'center'},
 body:{color:'#cdd7c7',fontSize:14,lineHeight:20,textAlign:'center'},
 label:{color:'#c7ab7a',fontSize:11,letterSpacing:2,textAlign:'center'},
 button:{minHeight:46,borderRadius:8,borderColor:'#ac8b57',borderWidth:1,backgroundColor:'#28433e',alignItems:'center',justifyContent:'center',padding:10},
 buttonText:{color:'#ffe2b0',fontSize:15,fontWeight:'700'},disabled:{opacity:.35},
 input:{borderRadius:8,borderWidth:1,borderColor:'#b49568',backgroundColor:'#122b2b',color:'#f4e4c9',fontSize:20,textAlign:'center',letterSpacing:3,padding:12},
 codeBox:{borderWidth:1,borderColor:'#826b46',padding:12,borderRadius:10,backgroundColor:'#0b2527',gap:7},
 code:{color:'#ffe8ad',fontWeight:'900',fontSize:28,letterSpacing:4,textAlign:'center'},
 status:{color:'#a9c5bc',textAlign:'center',fontSize:13},
 member:{flexDirection:'row',justifyContent:'space-between',gap:12,borderBottomColor:'#56736d',borderBottomWidth:1,paddingVertical:8},
 memberName:{color:'#f3dfba',fontSize:14},memberStatus:{color:'#b9cbb9',fontSize:12},
 hint:{color:'#a6b7ab',fontSize:12,lineHeight:18,textAlign:'center'},error:{color:'#ffc6a2',fontSize:13,lineHeight:18,textAlign:'center'}
});

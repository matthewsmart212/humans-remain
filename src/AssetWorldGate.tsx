import React,{lazy,Suspense,useCallback,useEffect,useRef,useState} from 'react';
import GameStart from './GameStart';
import type {ExternalStartActions,ExternalStartState} from './WorldEditor';

// Do not evaluate the Skia world/editor bundle while displaying the intro.
// iPhone Safari otherwise had to prepare the terrain renderer and world textures
// while keeping both cinematic video decoders and the soundtrack in memory.
const WorldEditor=lazy(()=>import('./WorldEditor'));
type RequestedMode='play'|'editor'|null;

export default function AssetWorldGate(){
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const [request,setRequest]=useState<RequestedMode>(null);
 const [playRequested,setPlayRequested]=useState(false);
 const [start,setStart]=useState<ExternalStartState|null>(null);
 const controls=useRef<ExternalStartActions>({play:()=>{},back:()=>{},complete:()=>{}});
 const syncActions=useCallback((actions:ExternalStartActions)=>{controls.current=actions},[]);
 const syncStart=useCallback((next:ExternalStartState)=>{
  setStart(previous=>previous?.visible===next.visible&&previous.busy===next.busy&&previous.progress===next.progress&&previous.notice===next.notice&&previous.disabled===next.disabled?previous:next);
 },[]);
 const open=(mode:Exclude<RequestedMode,null>)=>{
  setError('');
  if(mode==='play')setPlayRequested(true);
  setRequest(mode);
 };

 // Download the artwork registry only once someone starts playing or opens
 // the editor. In particular, publishing a large shared world must not cause
 // its textures to load on the title screen.
 useEffect(()=>{
  if(!request||ready)return;
  let active=true;
  void import('./imported-art').then(async({fetchArtwork,installImportedArt})=>{
   const {records}=await fetchArtwork();
   if(active){installImportedArt(records);setReady(true)}
  }).catch(e=>{
   if(active){setError(e instanceof Error?e.message:String(e));setPlayRequested(false)}
  });
  return()=>{active=false};
 },[request,ready,retry]);

 // The editor publishes its own stable action handlers on mount. Wait for
 // those handlers and the editor's initial state before forwarding the tap.
 useEffect(()=>{
  if(!ready||!start||!request)return;
  const action=request;
  setRequest(null);
  if(action==='play')controls.current.play();
  else controls.current.back();
 },[ready,start,request]);

 useEffect(()=>{
  if(!playRequested)return;
  if(start?.visible===false||(start?.notice&&!start.busy&&start.progress===undefined))
   setPlayRequested(false);
 },[start,playRequested]);

 const loading=playRequested&&(!ready||start?.visible!==false);
 return <>
  {ready&&<Suspense fallback={null}>
   <WorldEditor externalStart onExternalStartState={syncStart} onExternalStartActions={syncActions}/>
  </Suspense>}
  {(!ready||start?.visible!==false)&&
   <GameStart
    gameMounted={ready}
    onPlay={()=>open('play')}
    onBack={()=>open('editor')}
    onLoadingComplete={()=>controls.current.complete()}
    busy={loading||!!start?.busy}
    loadingProgress={start?.progress??(loading?0.04:undefined)}
    playDisabled={!!error||!!start?.disabled}
    notice={error||start?.notice}
   />}
  {!!error&&!ready&&<div className="art-gate" role="alert" style={{zIndex:1200}}>
   <h2>Artwork unavailable</h2><p>{error}</p>
   <button onClick={()=>{setError('');setRetry(n=>n+1)}}>Retry loading</button>
  </div>}
 </>;
}

import React,{useCallback,useEffect,useRef,useState} from 'react';
import GameStart from './GameStart';
import WorldEditor,{type ExternalStartActions,type ExternalStartState} from './WorldEditor';
import {fetchArtwork,installImportedArt} from './imported-art';

/**
 * Hydrate imported assets before mounting the world. A saved camp must never
 * be parsed while its custom asset IDs are unknown.
 *
 * The starting screen deliberately lives OUTSIDE that conditional world mount,
 * so Safari does not destroy/recreate its video and imagery when hydration ends.
 */
export default function AssetWorldGate(){
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const [start,setStart]=useState<ExternalStartState|null>(null);
 const controls=useRef<ExternalStartActions>({play:()=>{},back:()=>{},complete:()=>{}});
 const syncActions=useCallback((actions:ExternalStartActions)=>{controls.current=actions},[]);
 const syncStart=useCallback((next:ExternalStartState)=>{
  setStart(previous=>previous?.visible===next.visible&&previous.busy===next.busy&&previous.progress===next.progress&&previous.notice===next.notice&&previous.disabled===next.disabled?previous:next);
 },[]);
 useEffect(()=>{
  let active=true;
  setError('');
  fetchArtwork().then(({records})=>{
   if(active){installImportedArt(records);setReady(true)}
  }).catch(e=>{if(active)setError(e instanceof Error?e.message:String(e))});
  return()=>{active=false};
 },[retry]);
 return <>
  {ready&&<WorldEditor externalStart onExternalStartState={syncStart} onExternalStartActions={syncActions}/>}
  {(!ready||start?.visible!==false)&&
   <GameStart
    gameMounted={ready}
    onPlay={()=>controls.current.play()}
    onBack={()=>controls.current.back()}
    onLoadingComplete={()=>controls.current.complete()}
    busy={ready&&!!start?.busy}
    loadingProgress={ready?start?.progress:undefined}
    playDisabled={!ready||!start||start.disabled||!!error}
    notice={ready?start?.notice:undefined}
   />}
  {!!error&&!ready&&<div className="art-gate" role="alert" style={{zIndex:1200}}>
   <h2>Artwork unavailable</h2><p>{error}</p>
   <button onClick={()=>setRetry(n=>n+1)}>Retry loading</button>
  </div>}
 </>;
}

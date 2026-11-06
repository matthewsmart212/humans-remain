import React,{useEffect,useState} from 'react';
import GameStart from './GameStart';
import {fetchArtwork,installImportedArt} from './imported-art';

/**
 * The game must hydrate imported artwork BEFORE the world editor mounts:
 * otherwise unknown custom IDs could invalidate a saved camp.
 *
 * Show the actual starting screen during that short preparation instead of
 * flashing a separate "Loading your asset library" page. Play remains disabled
 * until the saved artwork registry is installed and the real game mounts.
 */
export default function AssetWorldGate({children}:{children:React.ReactNode}){
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let live=true;
  setError('');
  fetchArtwork().then(({records})=>{
   if(live){installImportedArt(records);setReady(true)}
  }).catch(e=>{if(live)setError(e instanceof Error?e.message:String(e))});
  return()=>{live=false};
 },[retry]);
 if(ready)return <>{children}</>;
 if(error)return <div className="art-gate"><h2>Artwork unavailable</h2><p>{error}</p><button onClick={()=>setRetry(n=>n+1)}>Retry loading</button></div>;
 // This is the same visual start screen that WorldEditor presents once ready,
 // not an extra loading page. Do not allow Play before the artwork is safe.
 return <GameStart onPlay={()=>{}} busy={false} playDisabled onLoadingComplete={()=>{}}/>;
}

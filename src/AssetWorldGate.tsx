import React,{useEffect,useState} from 'react';
import {fetchArtwork,installImportedArt} from './imported-art';
/** Hydrate before mounting the editor: unknown imported IDs must never erase a saved draft. */
export default function AssetWorldGate({children}:{children:React.ReactNode}){
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let live=true;setError('');fetchArtwork().then(({records})=>{if(live){installImportedArt(records);setReady(true)}}).catch(e=>{if(live)setError(e.message)});return()=>{live=false}},[retry]);
 if(ready)return <>{children}</>;
 return <div className="art-gate"><h2>{error?'Artwork unavailable':'Loading your asset library…'}</h2><p>{error||'Preparing saved artwork and your world.'}</p>{error&&<button onClick={()=>setRetry(n=>n+1)}>Retry</button>}<a href="#home">Main menu</a></div>;
}

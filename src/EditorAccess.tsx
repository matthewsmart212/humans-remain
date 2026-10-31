import React,{useCallback,useEffect,useState} from 'react';
import {LockKeyhole,LogIn,RefreshCw} from 'lucide-react';
import './editor-access.css';

export type EditorAccessState='loading'|'owner'|'anonymous'|'viewer'|'error';
type AccessData={state:EditorAccessState;signInUrl?:string;signOutUrl?:string};
export type EditorAccess=AccessData&{refresh:()=>void};

export function useEditorAccess(returnTo:string):EditorAccess{
 const [data,setData]=useState<AccessData>({state:'loading'}),[version,setVersion]=useState(0);
 const refresh=useCallback(()=>setVersion(v=>v+1),[]);
 useEffect(()=>{
  const controller=new AbortController();
  fetch('/api/edit-access?returnTo='+encodeURIComponent(returnTo),{cache:'no-store',credentials:'same-origin',signal:controller.signal}).then(async r=>{
   if(!r.ok)throw Error('Access check failed');const value=await r.json();
   if(!['owner','anonymous','viewer'].includes(value.state)||value.canEdit!==(value.state==='owner')||!value.signInUrl?.startsWith('/signin-with-chatgpt?')||!value.signOutUrl?.startsWith('/signout-with-chatgpt?'))throw Error('Invalid access response');
   if(!controller.signal.aborted)setData({state:value.state,signInUrl:value.signInUrl,signOutUrl:value.signOutUrl});
  }).catch(()=>{if(!controller.signal.aborted)setData({state:'error'})});
  return()=>controller.abort();
 },[returnTo,version]);
 useEffect(()=>{const visible=()=>{if(document.visibilityState==='visible')refresh()};window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',visible);return()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visible)}},[refresh]);
 return {...data,refresh};
}

export function EditorAccessNotice({access}:{access:EditorAccess}){
 if(access.state==='owner')return null;
 return <div className="editor-access" role="status"><LockKeyhole size={19}/><div><strong>{access.state==='loading'?'Checking editing access…':access.state==='anonymous'?'Sign in to unlock editing':access.state==='viewer'?'This account has read-only access':'Could not check editing access'}</strong><p>{access.state==='loading'?'Your artwork remains available to preview.':access.state==='anonymous'?'Use your ChatGPT owner account to edit images, collision lines and animation settings.':access.state==='viewer'?'Sign out, then sign in with the ChatGPT account that owns this site.':'Retry the access check. Your current changes stay on this screen.'}</p><div className="editor-access-actions">{access.state==='anonymous'&&<a href={access.signInUrl} target="_top"><LogIn size={16}/>Sign in to edit</a>}{access.state==='viewer'&&<a href={access.signOutUrl} target="_top"><LogIn size={16}/>Sign out to change account</a>}{access.state!=='loading'&&<button type="button" onClick={access.refresh}><RefreshCw size={14}/>{access.state==='error'?'Retry access check':'Recheck access'}</button>}</div></div></div>;
}

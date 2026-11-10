import React,{useCallback,useEffect,useState} from 'react';
import {editorTokenHeaders,clearEditorToken} from './editor-token';
import {LockKeyhole,LogIn,RefreshCw} from 'lucide-react';
import './editor-access.css';

export type EditorAccessState='loading'|'owner'|'anonymous'|'viewer'|'error';
type AccessData={state:EditorAccessState;signInUrl?:string;signOutUrl?:string};
export type EditorAccess=AccessData&{refresh:()=>void;unlock:()=>Promise<boolean>;unlockWithKey:()=>Promise<boolean>;lock:()=>Promise<void>};

export function useEditorAccess(returnTo:string):EditorAccess{
 const [data,setData]=useState<AccessData>({state:'loading'}),[version,setVersion]=useState(0);
 const refresh=useCallback(()=>setVersion(v=>v+1),[]);
 // Legacy one-time owner key remains as a fallback while Cloudflare Access
 // is configured. Ordinary publishing no longer needs a copied secret.
 const unlockWithKey=useCallback(async()=>{
  const key=window.prompt('Enter your existing private WORLD_EDITOR_TOKEN to unlock this device (legacy method).');
  if(!key?.trim())return false;
  try{
   const response=await fetch('/api/editor-unlock',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({key:key.trim()})});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||'Owner key could not be verified.');
   clearEditorToken();refresh();return true;
  }catch(error){window.alert(error instanceof Error?error.message:'Could not unlock publishing.');return false}
 },[refresh]);
 const unlock=useCallback(async()=>{
  // A protected owner-only URL lets Cloudflare send an email login, then
  // redirects back with a secure cookie. No token is stored in JavaScript.
  if(window.location.hostname.endsWith('.chatgpt.site'))return unlockWithKey();
  const path=window.location.pathname+window.location.search+(window.location.hash||'#editor');
  window.location.assign('/api/editor-session?returnTo='+encodeURIComponent(path));
  return false;
 },[unlockWithKey]);
 const lock=useCallback(async()=>{
  try{await fetch('/api/editor-lock',{method:'POST',credentials:'same-origin'});}
  finally{clearEditorToken();refresh()}
 },[refresh]);
 useEffect(()=>{
  const controller=new AbortController();
  fetch('/api/edit-access?returnTo='+encodeURIComponent(returnTo),{cache:'no-store',credentials:'same-origin',headers:editorTokenHeaders(),signal:controller.signal}).then(async r=>{
   if(!r.ok)throw Error('Access check failed');const value=await r.json();
   if(!['owner','anonymous','viewer'].includes(value.state)||value.canEdit!==(value.state==='owner')||!value.signInUrl?.startsWith('/signin-with-chatgpt?')||!value.signOutUrl?.startsWith('/signout-with-chatgpt?'))throw Error('Invalid access response');
   if(!controller.signal.aborted)setData({state:value.state,signInUrl:value.signInUrl,signOutUrl:value.signOutUrl});
  }).catch(()=>{if(!controller.signal.aborted)setData({state:'error'})});
  return()=>controller.abort();
 },[returnTo,version]);
 useEffect(()=>{const visible=()=>{if(document.visibilityState==='visible')refresh()};window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',visible);return()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visible)}},[refresh]);
 return {...data,refresh,unlock,unlockWithKey,lock};
}

export function EditorAccessNotice({access}:{access:EditorAccess}){
 if(access.state==='owner')return null;
 const cloudflare=!window.location.hostname.endsWith('.chatgpt.site');
 return <div className="editor-access" role="status"><LockKeyhole size={19}/><div><strong>{access.state==='loading'?'Checking editing access…':cloudflare?'World editor is locked':access.state==='anonymous'?'Sign in to unlock editing':access.state==='viewer'?'This account has read-only access':'Could not check editing access'}</strong><p>{cloudflare?'Sign in once through Cloudflare Access to save and publish on this device. Visitors cannot change the world.':'Your artwork remains available to preview.'}</p><div className="editor-access-actions">{!cloudflare&&access.state==='anonymous'&&<a href={access.signInUrl} target="_top"><LogIn size={16}/>Sign in to edit</a>}{!cloudflare&&access.state==='viewer'&&<a href={access.signOutUrl} target="_top"><LogIn size={16}/>Sign out to change account</a>}{cloudflare&&access.state!=='loading'&&<><button type="button" onClick={()=>void access.unlock()}><LogIn size={16}/>Sign in as owner</button><button type="button" onClick={()=>void access.unlockWithKey()}>Use existing owner key</button></>}{access.state!=='loading'&&<button type="button" onClick={access.refresh}><RefreshCw size={14}/>{access.state==='error'?'Retry access check':'Recheck access'}</button>}</div></div></div>;
}

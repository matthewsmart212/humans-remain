import React,{useCallback,useEffect,useState} from 'react';
import {editorTokenHeaders,clearEditorToken} from './editor-token';
import {LockKeyhole,LogIn,RefreshCw} from 'lucide-react';
import './editor-access.css';

export type EditorAccessState='loading'|'owner'|'anonymous'|'viewer'|'error';
type AccessData={state:EditorAccessState;signInUrl?:string;signOutUrl?:string;passwordlessConfigured?:boolean;passwordlessSignInUrl?:string};
export type EditorAccess=AccessData&{refresh:()=>void;unlock:()=>Promise<boolean>;lock:()=>Promise<void>};

export function useEditorAccess(returnTo:string):EditorAccess{
 const [data,setData]=useState<AccessData>({state:'loading'}),[version,setVersion]=useState(0);
 const refresh=useCallback(()=>setVersion(v=>v+1),[]);
 const unlock=useCallback(async()=>{
  // A one-time owner key is configured as the private WORLD_EDITOR_TOKEN Worker
  // secret. The browser sends it to the server only for the unlock request.
  // A secure HttpOnly cookie then remembers this device for 90 days.
  const key=window.prompt('Enter the WORLD_EDITOR_TOKEN you created in Cloudflare (one time on this browser):');
  if(!key?.trim())return false;
  try{
   const response=await fetch('/api/editor-unlock',{
    method:'POST',headers:{'Content-Type':'application/json'},
    credentials:'same-origin',body:JSON.stringify({key:key.trim()})
   });
   const result=await response.json();
   if(!response.ok)throw Error(result.error||'Could not unlock publishing.');
   clearEditorToken();
   refresh();
   return true;
  }catch(error){
   window.alert(error instanceof Error?error.message:'Could not unlock publishing.');
   return false;
  }
 },[refresh]);
 const lock=useCallback(async()=>{
  try{await fetch('/api/editor-lock',{method:'POST',credentials:'same-origin'});}
  finally{clearEditorToken();refresh()}
 },[refresh]);
 useEffect(()=>{
  const controller=new AbortController();
  fetch('/api/edit-access?returnTo='+encodeURIComponent(returnTo),{cache:'no-store',credentials:'same-origin',headers:editorTokenHeaders(),signal:controller.signal}).then(async r=>{
   if(!r.ok)throw Error('Access check failed');const value=await r.json();
   if(!['owner','anonymous','viewer'].includes(value.state)||value.canEdit!==(value.state==='owner')||!value.signInUrl?.startsWith('/signin-with-chatgpt?')||!value.signOutUrl?.startsWith('/signout-with-chatgpt?')||typeof value.passwordlessConfigured!=='boolean'||value.passwordlessSignInUrl!=='/owner-login')throw Error('Invalid access response');
   if(!controller.signal.aborted)setData({state:value.state,signInUrl:value.signInUrl,signOutUrl:value.signOutUrl,passwordlessConfigured:value.passwordlessConfigured,passwordlessSignInUrl:value.passwordlessSignInUrl});
  }).catch(()=>{if(!controller.signal.aborted)setData({state:'error'})});
  return()=>controller.abort();
 },[returnTo,version]);
 useEffect(()=>{const visible=()=>{if(document.visibilityState==='visible')refresh()};window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',visible);return()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visible)}},[refresh]);
 return {...data,refresh,unlock,lock};
}

export function EditorAccessNotice({access}:{access:EditorAccess}){
 if(access.state==='owner')return null;
 const cloudflare=window.location.hostname.endsWith('.workers.dev');
 const unlock=()=>void access.unlock();
 const title=access.state==='loading'?'Checking editing access…':
  cloudflare?'World publishing is locked':
  access.state==='anonymous'?'Sign in to unlock editing':access.state==='viewer'?'This account has read-only access':'Could not check editing access';
 const description=cloudflare?
  'You can move and save buildings locally. Enter your private Cloudflare editor key once on this device to publish the shared world.':
  access.state==='loading'?'Your artwork remains available to preview.':
  access.state==='anonymous'?'Use your ChatGPT owner account to edit images, collision lines and animation settings.':
  access.state==='viewer'?'Sign out, then sign in with the ChatGPT account that owns this site.':
  'Retry the access check. Your current changes stay on this screen.';
 return <div className="editor-access" role="status"><LockKeyhole size={19}/><div>
  <strong>{title}</strong><p>{description}</p>
  <div className="editor-access-actions">
   {cloudflare&&access.state!=='loading'&&<button type="button" onClick={unlock}><LogIn size={16}/>Unlock Publishing</button>}
   {!cloudflare&&access.state==='anonymous'&&<a href={access.signInUrl} target="_top"><LogIn size={16}/>Sign in to edit</a>}
   {!cloudflare&&access.state==='viewer'&&<a href={access.signOutUrl} target="_top"><LogIn size={16}/>Sign out to change account</a>}
   {access.state!=='loading'&&<button type="button" onClick={access.refresh}><RefreshCw size={14}/>{access.state==='error'?'Retry access check':'Recheck access'}</button>}
  </div>
 </div></div>;
}

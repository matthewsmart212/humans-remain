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
  // The browser never receives or asks for a Cloudflare secret. A path-specific
  // Cloudflare Access application signs the owner in using a one-time email PIN.
  if(!data.passwordlessConfigured){
   window.alert('Passwordless publishing needs one-time setup in Cloudflare Zero Trust. Your world edits are already saved on this device. See docs/WORLD-PUBLISHING.md.');
   return false;
  }
  window.location.assign('/owner-login');
  return true;
 },[data.passwordlessConfigured]);
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
  cloudflare?(access.passwordlessConfigured?'Owner sign-in needed':'Owner sign-in setup needed'):
  access.state==='anonymous'?'Sign in to unlock editing':access.state==='viewer'?'This account has read-only access':'Could not check editing access';
 const description=cloudflare?
  (access.passwordlessConfigured?
   'Move and save buildings freely. To publish to every player, sign in with your owner email. No publish token is needed.':
   'Your building changes are saved locally. To publish them online without a token, configure Cloudflare Access once for the owner-only sign-in route.'):
  access.state==='loading'?'Your artwork remains available to preview.':
  access.state==='anonymous'?'Use your ChatGPT owner account to edit images, collision lines and animation settings.':
  access.state==='viewer'?'Sign out, then sign in with the ChatGPT account that owns this site.':
  'Retry the access check. Your current changes stay on this screen.';
 return <div className="editor-access" role="status"><LockKeyhole size={19}/><div>
  <strong>{title}</strong><p>{description}</p>
  <div className="editor-access-actions">
   {cloudflare&&access.passwordlessConfigured&&access.state!=='loading'&&<button type="button" onClick={unlock}><LogIn size={16}/>Sign in to publish</button>}
   {!cloudflare&&access.state==='anonymous'&&<a href={access.signInUrl} target="_top"><LogIn size={16}/>Sign in to edit</a>}
   {!cloudflare&&access.state==='viewer'&&<a href={access.signOutUrl} target="_top"><LogIn size={16}/>Sign out to change account</a>}
   {access.state!=='loading'&&<button type="button" onClick={access.refresh}><RefreshCw size={14}/>{access.state==='error'?'Retry access check':'Recheck access'}</button>}
  </div>
 </div></div>;
}

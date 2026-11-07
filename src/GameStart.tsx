import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import StartingScreen from './StartingScreen';
import {WEB_START_SCREEN_ART} from './start-screen-art';
import {START_PROFILE_KEY,readStartProfile,type StartProfile} from './start-profile';
import './game-start.css';
export default function GameStart({onPlay,onBack,busy,notice,playDisabled,loadingProgress,onLoadingComplete,gameMounted=false}:{onPlay:()=>void;onBack:()=>void;busy:boolean;notice?:string;playDisabled?:boolean;loadingProgress?:number;onLoadingComplete:()=>void;gameMounted?:boolean}){
 const [size,setSize]=useState(()=>({width:innerWidth,height:innerHeight})),[profile,setProfile]=useState(()=>{try{return readStartProfile(localStorage.getItem(START_PROFILE_KEY))}catch{return readStartProfile(null)}}),[reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),[saveNotice,setSaveNotice]=useState('');
 const video=useRef<HTMLVideoElement>(null);
 // WebKit can terminate a tab when a decoding video, the 42-frame survivor
 // atlas and CanvasKit world textures all remain live during Play startup.
 // Once loading begins, the still poster replaces the video element so Safari
 // can reclaim the decoder without changing the approved scene composition.
 const preparing=loadingProgress!==undefined;
 // Safari can paint the React Native text before its images have decoded.
 // Keep the poster visible underneath, then reveal the full composition
 // together, rather than flashing partial logo/cards/stats on each refresh.
 const [visualsReady,setVisualsReady]=useState(false);
 useEffect(()=>{
  let active=true;
  const sources=[
   '/previews/dawn-camp/preview-poster.webp',
   '/survival/starting-screen-ui-v2/humans-remain-logo.png',
   '/survival/expedition-menu-v2/approved-cards.webp',
   '/survival/starting-screen-ui-v2/survivor-profile.png',
   '/survival/starting-screen-ui-v2/settings.png',
  ];
  const loads=sources.map(src=>new Promise<void>(resolve=>{
   const img=new window.Image();
   img.onload=()=>resolve();
   img.onerror=()=>resolve(); // Do not hang the whole menu on a broken image.
   img.src=src;
   if(img.complete)resolve();
  }));
  void Promise.race([Promise.all(loads),new Promise(resolve=>setTimeout(resolve,4500))]).then(()=>{if(active)setVisualsReady(true)});
  return()=>{active=false};
 },[]);
 useEffect(()=>{const resize=()=>setSize({width:innerWidth,height:innerHeight}),media=matchMedia('(prefers-reduced-motion: reduce)'),motion=()=>setReduced(media.matches);addEventListener('resize',resize);media.addEventListener('change',motion);return()=>{removeEventListener('resize',resize);media.removeEventListener('change',motion)}},[]);
 useEffect(()=>{const sync=()=>{if(document.hidden||reduced||!profile.motion)video.current?.pause();else void video.current?.play().catch(()=>{})};sync();document.addEventListener('visibilitychange',sync);return()=>{video.current?.pause();document.removeEventListener('visibilitychange',sync)}},[profile.motion,reduced,preparing]);
 const save=(next:StartProfile)=>{setProfile(next);try{localStorage.setItem(START_PROFILE_KEY,JSON.stringify(next));setSaveNotice('')}catch{setSaveNotice('Your name and preferences could not be saved on this device.')}};
 useEffect(()=>{const editor=document.querySelector('main.world-editor');editor?.setAttribute('inert','');return()=>editor?.removeAttribute('inert')},[gameMounted]);
 return createPortal(<div className="game-start" style={{opacity:visualsReady?1:0,transition:'opacity 180ms ease-out',...(loadingProgress===1?{backgroundColor:'transparent',backgroundImage:'none'}:{})}} onKeyDown={e=>e.stopPropagation()}>
  <StartingScreen {...size} profile={profile} onProfile={save} onPlay={onPlay} onBack={onBack} busy={busy} loadingProgress={loadingProgress} reducedMotion={reduced||!profile.motion} onLoadingComplete={onLoadingComplete} playDisabled={playDisabled} notice={notice||saveNotice} artwork={WEB_START_SCREEN_ART} portrait={{uri:'/survival/starting-screen-ui-v2/survivor-profile.png'}}
   background={preparing?<div className="game-start-scene game-start-still" aria-hidden="true"/>:<video ref={video} className="game-start-scene" src="https://raw.githubusercontent.com/matthewsmart212/humans-remain/d7e9d3598731f53a1c64f79949c8747a21522d40/public/previews/dawn-camp/preview.mp4" poster="/previews/dawn-camp/preview-poster.webp" autoPlay={!reduced&&profile.motion} loop muted playsInline preload="auto" aria-hidden="true"/>}
   shade={<div className="game-start-shade"/>}/>
 </div>,document.body);
}

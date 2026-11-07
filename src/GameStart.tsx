import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import StartingScreen from './StartingScreen';
import {WEB_START_SCREEN_ART} from './start-screen-art';
import {START_PROFILE_KEY,readStartProfile,type StartProfile} from './start-profile';
import './game-start.css';
export default function GameStart({onPlay,onBack,busy,notice,playDisabled,loadingProgress,onLoadingComplete,gameMounted=false}:{onPlay:()=>void;onBack:()=>void;busy:boolean;notice?:string;playDisabled?:boolean;loadingProgress?:number;onLoadingComplete:()=>void;gameMounted?:boolean}){
 const [size,setSize]=useState(()=>({width:innerWidth,height:innerHeight})),[profile,setProfile]=useState(()=>{try{return readStartProfile(localStorage.getItem(START_PROFILE_KEY))}catch{return readStartProfile(null)}}),[reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),[saveNotice,setSaveNotice]=useState('');
 const video=useRef<HTMLVideoElement>(null);
 const startMusic=useRef<null|(()=>void)>(null),muteRef=useRef(profile.muted);muteRef.current=profile.muted;
 // The video is the whole camp scene, including the survivor and fire.
 // There is no second character image or sprite overlay during Play.
 // Safari can paint the React Native text before its images have decoded.
 // Keep the poster visible underneath, then reveal the full composition
 // together, rather than flashing partial logo/cards/stats on each refresh.
 const [visualsReady,setVisualsReady]=useState(false);
 useEffect(()=>{
  let active=true;
  const sources=[
   '/previews/dawn-camp/start-scene-poster.jpg',
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
 useEffect(()=>{const sync=()=>{if(document.hidden||reduced||!profile.motion)video.current?.pause();else void video.current?.play().catch(()=>{})};sync();document.addEventListener('visibilitychange',sync);return()=>{video.current?.pause();document.removeEventListener('visibilitychange',sync)}},[profile.motion,reduced]);
 const save=(next:StartProfile)=>{muteRef.current=next.muted;startMusic.current?.();setProfile(next);try{localStorage.setItem(START_PROFILE_KEY,JSON.stringify(next));setSaveNotice('')}catch{setSaveNotice('Your name and preferences could not be saved on this device.')}};
 // iOS Safari may suspend Web Audio until an explicit tap. The mute button
 // and first interaction both unlock playback; never leave a silent player
 // with a permanently suspended gain node.
 useEffect(()=>{
  const audio=new Audio('/audio/start-menu.mp3');
  audio.loop=true;audio.preload='auto';audio.volume=1;
  let context:AudioContext|null=null,gain:GainNode|null=null,frame=0,fadeStart:number|null=null,level=0,disposed=false;
  try{
   context=new window.AudioContext();
   gain=context.createGain();gain.gain.value=0;
   const source=context.createMediaElementSource(audio);source.connect(gain);gain.connect(context.destination);
  }catch{context=null;gain=null}
  const setLevel=(value:number)=>{level=value;if(gain)gain.gain.value=muteRef.current?0:value;else audio.volume=muteRef.current?0:value};
  const fade=(now:number)=>{
   if(disposed)return;
   if(fadeStart===null)fadeStart=now;
   setLevel(Math.min(1,(now-fadeStart)/3000));
   if(level<1)frame=requestAnimationFrame(fade);else frame=0;
  };
  const start=()=>{
   if(disposed)return;
   setLevel(level);
   if(document.hidden||muteRef.current){audio.pause();return}
   // Resume synchronously inside the gesture; awaiting play() first can
   // lose Safari's transient user activation.
   if(context?.state==='suspended')void context.resume().catch(()=>{});
   if(audio.paused)void audio.play().then(()=>{
    if(!disposed&&frame===0&&level<1)frame=requestAnimationFrame(fade);
   }).catch(()=>{});
   else if(frame===0&&level<1)frame=requestAnimationFrame(fade);
  };
  const onVisible=()=>{if(document.hidden)audio.pause();else start()};
  const onGesture=()=>start();
  const onError=()=>setSaveNotice('Menu music could not load. Check the soundtrack asset and refresh.');
  audio.addEventListener('error',onError);
  startMusic.current=start;
  document.addEventListener('visibilitychange',onVisible);
  document.addEventListener('pointerdown',onGesture,true);
  document.addEventListener('touchstart',onGesture,true);
  document.addEventListener('keydown',onGesture,true);
  start();
  return()=>{
   disposed=true;startMusic.current=null;cancelAnimationFrame(frame);
   document.removeEventListener('visibilitychange',onVisible);
   document.removeEventListener('pointerdown',onGesture,true);
   document.removeEventListener('touchstart',onGesture,true);
   document.removeEventListener('keydown',onGesture,true);
   audio.removeEventListener('error',onError);audio.pause();audio.removeAttribute('src');audio.load();
   if(context)void context.close().catch(()=>{});
  };
 },[]);
 useEffect(()=>{const editor=document.querySelector('main.world-editor');editor?.setAttribute('inert','');return()=>editor?.removeAttribute('inert')},[gameMounted]);
 return createPortal(<div className="game-start" style={{opacity:visualsReady?1:0,transition:'opacity 180ms ease-out',...(loadingProgress===1?{backgroundColor:'transparent',backgroundImage:'none'}:{})}} onKeyDown={e=>e.stopPropagation()}>
  <StartingScreen {...size} profile={profile} onProfile={save} onPlay={onPlay} onBack={onBack} busy={busy} loadingProgress={loadingProgress} reducedMotion={reduced||!profile.motion} onLoadingComplete={onLoadingComplete} playDisabled={playDisabled} notice={notice||saveNotice} artwork={WEB_START_SCREEN_ART} portrait={{uri:profile.role==='hunter'?'/survival/hunter-v1/portrait.png':profile.role==='engineer'?'/survival/engineer-v2/portrait.webp':'/survival/starting-screen-ui-v2/survivor-profile.png'}}
   background={<video ref={video} className="game-start-scene" src="/previews/dawn-camp/start-scene.mp4" poster="/previews/dawn-camp/start-scene-poster.jpg" autoPlay={!reduced&&profile.motion} loop muted playsInline preload="auto" aria-hidden="true"/>}
   shade={<div className="game-start-shade"/>}/>
 </div>,document.body);
}

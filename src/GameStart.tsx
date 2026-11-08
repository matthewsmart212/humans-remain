import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import StartingScreen from './StartingScreen';
import {WEB_START_SCREEN_ART} from './start-screen-art';
import {START_PROFILE_KEY,readStartProfile,type StartProfile} from './start-profile';
import './game-start.css';

// Only the first entry on a page visit presents the Reclamation splash.
// Returning from a game goes to the already-familiar starting menu, as on iOS.
let hasVisitedMenuThisPage=false;
type EntryPhase='landing'|'watching'|'menu';
type IntroUiPhase='hidden'|'revealing'|'shown';
const INTRO_URL='/previews/the-reclamation/intro.mp4';
const SOUNDTRACK_URL='/previews/the-reclamation/soundtrack.mp3';
const MENU_LOOP_URL='/previews/dawn-camp/start-scene.mp4';
const MENU_POSTER_URL='/previews/dawn-camp/start-scene-poster.jpg';
const LOGO_URL='/survival/starting-screen-ui-v2/humans-remain-logo.png';

export default function GameStart({onPlay,onBack,busy,notice,playDisabled,loadingProgress,onLoadingComplete,gameMounted=false}:{
 onPlay:()=>void;onBack:()=>void;busy:boolean;notice?:string;playDisabled?:boolean;loadingProgress?:number;
 onLoadingComplete:()=>void;gameMounted?:boolean;
}){
 const [size,setSize]=useState(()=>({width:innerWidth,height:innerHeight}));
 const [profile,setProfile]=useState(()=>{try{return readStartProfile(localStorage.getItem(START_PROFILE_KEY))}catch{return readStartProfile(null)}});
 const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [saveNotice,setSaveNotice]=useState('');
 const [visualsReady,setVisualsReady]=useState(false);
 const [phase,setPhase]=useState<EntryPhase>(()=>hasVisitedMenuThisPage?'menu':'landing');
 const [introUiPhase,setIntroUiPhase]=useState<IntroUiPhase>(()=>hasVisitedMenuThisPage?'shown':'hidden');
 const [introHasFrame,setIntroHasFrame]=useState(false);
 const [handoffRequested,setHandoffRequested]=useState(false);
 const [menuFrameReady,setMenuFrameReady]=useState(false);
 const [menuFailed,setMenuFailed]=useState(false);
 const introVideo=useRef<HTMLVideoElement>(null);
 const menuVideo=useRef<HTMLVideoElement>(null);
 const startMusic=useRef<null|(()=>void)>(null);
 const muteRef=useRef(profile.muted),motionRef=useRef(profile.motion),reducedRef=useRef(reduced);
 muteRef.current=profile.muted;motionRef.current=profile.motion;reducedRef.current=reduced;
 const audioActivated=useRef(hasVisitedMenuThisPage);
 const introRevealStarted=useRef(false),menuPlayRequested=useRef(false),finished=useRef(false);

 useEffect(()=>{
  let active=true;
  const sources=[MENU_POSTER_URL,LOGO_URL,'/survival/expedition-menu-v2/approved-cards.webp',
   '/survival/starting-screen-ui-v2/survivor-profile.png','/survival/starting-screen-ui-v2/settings.png'];
  const loads=sources.map(src=>new Promise<void>(resolve=>{
   const img=new window.Image();
   img.onload=resolve;img.onerror=resolve;img.src=src;
   if(img.complete)resolve();
  }));
  void Promise.race([Promise.all(loads),new Promise(resolve=>setTimeout(resolve,4500))])
   .then(()=>{if(active)setVisualsReady(true)});
  return()=>{active=false};
 },[]);
 useEffect(()=>{
  const resize=()=>setSize({width:innerWidth,height:innerHeight});
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const motion=()=>setReduced(media.matches);
  addEventListener('resize',resize);media.addEventListener('change',motion);
  return()=>{removeEventListener('resize',resize);media.removeEventListener('change',motion)};
 },[]);

 // One permanent soundtrack player for both the intro and main menu.
 // Browser autoplay rules require a click to unlock audio on a new visit.
 useEffect(()=>{
  const audio=new Audio(SOUNDTRACK_URL);
  audio.loop=true;audio.preload='auto';audio.volume=.72;
  let context:AudioContext|null=null,gain:GainNode|null=null,frame=0,fadeStart:number|null=null,level=0,disposed=false;
  try{
   context=new window.AudioContext();
   gain=context.createGain();gain.gain.value=0;
   const source=context.createMediaElementSource(audio);source.connect(gain);gain.connect(context.destination);
  }catch{context=null;gain=null}
  const setLevel=(value:number)=>{
   level=value;
   if(gain)gain.gain.value=muteRef.current?0:value*.72;
   else audio.volume=muteRef.current?0:value*.72;
  };
  const fade=(now:number)=>{
   if(disposed)return;
   if(fadeStart===null)fadeStart=now;
   setLevel(Math.min(1,(now-fadeStart)/1800));
   if(level<1)frame=requestAnimationFrame(fade);else frame=0;
  };
  const start=()=>{
   if(disposed||!audioActivated.current)return;
   setLevel(level);
   if(document.hidden||muteRef.current){audio.pause();return}
   // Do not await before play(): Safari's transient user activation matters.
   if(context?.state==='suspended')void context.resume().catch(()=>{});
   if(audio.paused)void audio.play().then(()=>{
    if(!disposed&&frame===0&&level<1)frame=requestAnimationFrame(fade);
   }).catch(()=>{});
   else if(frame===0&&level<1)frame=requestAnimationFrame(fade);
  };
  const onVisible=()=>{if(document.hidden)audio.pause();else start()};
  const onGesture=()=>start();
  const onError=()=>setSaveNotice('The Reclamation soundtrack could not load. Refresh the page to retry.');
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

 const enableAudio=()=>{audioActivated.current=true;startMusic.current?.()};
 const save=(next:StartProfile)=>{
  muteRef.current=next.muted;
  setProfile(next);
  startMusic.current?.();
  try{localStorage.setItem(START_PROFILE_KEY,JSON.stringify(next));setSaveNotice('')}
  catch{setSaveNotice('Your name and preferences could not be saved on this device.')}
 };
 const playMenuVideo=()=>{
  if(menuPlayRequested.current)return;
  menuPlayRequested.current=true;
  if(reducedRef.current||!motionRef.current){setMenuFrameReady(true);return}
  const player=menuVideo.current;
  if(!player){setMenuFailed(true);return}
  // Menu video is muted, so browsers allow the prewarmed player to start
  // as the closing frame arrives even without a second user gesture.
  void player.play().catch(()=>setMenuFailed(true));
 };
 const finishToMenu=()=>{
  if(finished.current)return;
  finished.current=true;
  setIntroUiPhase('shown');
  setHandoffRequested(true);
  playMenuVideo();
 };
 const onWatch=()=>{
  if(phase!=='landing')return;
  enableAudio();
  introRevealStarted.current=false;
  setIntroUiPhase('hidden');
  setPhase('watching');
  const player=introVideo.current;
  if(!player){finishToMenu();return}
  player.currentTime=0;
  void player.play().catch(()=>finishToMenu());
 };
 const onContinue=()=>{enableAudio();finishToMenu()};
 const onSkip=()=>{
  introVideo.current?.pause();
  finishToMenu();
 };
 const onIntroTime=()=>{
  const video=introVideo.current;
  if(!video||finished.current||!Number.isFinite(video.duration)||video.duration<=0)return;
  const remaining=video.duration-video.currentTime;
  if(!introRevealStarted.current&&remaining<=4&&video.duration>4){
   introRevealStarted.current=true;
   setIntroUiPhase('revealing');
  }
  // The user's closing footage matches the beginning of the menu loop.
  if(remaining<=.5)playMenuVideo();
 };

 useEffect(()=>{
  if(!handoffRequested||(!menuFrameReady&&!menuFailed))return;
  hasVisitedMenuThisPage=true;
  setIntroUiPhase('shown');
  setPhase('menu');
  introVideo.current?.pause();
 },[handoffRequested,menuFrameReady,menuFailed]);
 // Returning from the game should resume the menu loop rather than show
 // another splash screen, but never autoplay the intro on initial load.
 useEffect(()=>{
  if(phase!=='menu'||!profile.motion||reduced)return;
  const video=menuVideo.current;
  if(video?.paused)void video.play().catch(()=>setMenuFailed(true));
 },[phase,profile.motion,reduced]);
 useEffect(()=>{
  const sync=()=>{
   if(document.hidden){introVideo.current?.pause();menuVideo.current?.pause();return}
   if(phase==='menu'&&!reduced&&profile.motion)void menuVideo.current?.play().catch(()=>{});
   if(phase==='watching'&&!finished.current)void introVideo.current?.play().catch(()=>{});
  };
  document.addEventListener('visibilitychange',sync);
  return()=>document.removeEventListener('visibilitychange',sync);
 },[phase,reduced,profile.motion]);
 useEffect(()=>{
  const editor=document.querySelector('main.world-editor');
  editor?.setAttribute('inert','');
  return()=>editor?.removeAttribute('inert');
 },[gameMounted]);

 const portrait={uri:profile.role==='hunter'?'/survival/hunter-v1/portrait.png':profile.role==='engineer'?'/survival/engineer-v2/portrait.webp':'/survival/starting-screen-ui-v2/survivor-profile.png'};
 return createPortal(<div className="game-start" onKeyDown={e=>e.stopPropagation()}
  style={{opacity:visualsReady?1:0,transition:'opacity 180ms ease-out',...(loadingProgress===1?{backgroundColor:'transparent',backgroundImage:'none'}:{})}}>
  <div className="game-start-media" aria-hidden="true">
   <video ref={menuVideo} className="game-start-scene"
    style={{opacity:menuFrameReady||phase==='menu'?1:0}}
    src={MENU_LOOP_URL} poster={MENU_POSTER_URL} loop muted playsInline preload="auto"
    onPlaying={()=>setMenuFrameReady(true)}
    onError={()=>setMenuFailed(true)}/>
   <video ref={introVideo} className="game-start-intro-scene"
    style={{opacity:phase==='watching'&&introHasFrame?1:0}}
    src={INTRO_URL} preload="auto" playsInline
    onPlaying={()=>{setIntroHasFrame(true);startMusic.current?.()}}
    onTimeUpdate={onIntroTime}
    onEnded={finishToMenu}
    onError={()=>{if(phase==='watching')finishToMenu()}}/>
  </div>
  <div className="game-start-menu-ui"
   style={{pointerEvents:phase==='menu'?'auto':'none'}}>
   <StartingScreen {...size}
    profile={profile} onProfile={save} onPlay={onPlay} onBack={onBack}
    busy={busy} loadingProgress={loadingProgress}
    reducedMotion={reduced||!profile.motion} onLoadingComplete={onLoadingComplete}
    playDisabled={playDisabled} notice={notice||saveNotice}
    artwork={WEB_START_SCREEN_ART} portrait={portrait}
    introUiPhase={introUiPhase} transparentBackground
    background={null} shade={<div className="game-start-shade"/>}/>
  </div>
  <div className="game-start-welcome" style={{opacity:phase==='landing'||(phase==='watching'&&!introHasFrame)?1:0,pointerEvents:phase==='landing'?'auto':'none'}}>
    <div className="game-start-welcome-content">
     <div className="game-start-overline">THE RECLAMATION</div>
     <img src={LOGO_URL} className="game-start-welcome-logo" alt="Humans Remain"/>
     <p className="game-start-welcome-tagline">THE WORLD WAS TAKEN. WE ARE STILL HERE.</p>
     <div className="game-start-welcome-divider"/>
     <div className="game-start-welcome-actions">
      <button type="button" onClick={onWatch} className="game-start-welcome-button primary">
       <strong>▶ &nbsp; WATCH INTRO</strong><small>THE STORY SO FAR · 60 SECONDS</small>
      </button>
      <button type="button" onClick={onContinue} className="game-start-welcome-button secondary">
       <strong>CONTINUE →</strong><small>GO TO MAIN MENU</small>
      </button>
     </div>
    </div>
    <p className="game-start-welcome-footer">SURVIVE THE DAY. DEFEND THE NIGHT.</p>
   </div>
  {phase==='watching'&&<button className="game-start-skip" type="button" onClick={onSkip}
   aria-label="Skip introduction and open the main menu">SKIP »</button>}
 </div>,document.body);
}

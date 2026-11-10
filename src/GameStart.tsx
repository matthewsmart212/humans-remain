import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import StartingScreen from './StartingScreen';
import {WEB_START_SCREEN_ART} from './start-screen-art';
import {START_PROFILE_KEY,readStartProfile,type StartProfile} from './start-profile';
import './game-start.css';
import {createOpeningMusic} from './opening-music';
import openingMedia from './opening-media-paths.json';

// Only the first entry on a page visit presents the Reclamation splash.
// Returning from a game goes to the already-familiar starting menu, as on iOS.
let hasVisitedMenuThisPage=false;
type EntryPhase='landing'|'transition'|'watching'|'menu';
const INTRO_TITLE_TRANSITION_MS=4000;
type IntroUiPhase='hidden'|'revealing'|'shown';
const {intro:INTRO_URL,soundtrack:SOUNDTRACK_URL,menuLoop:MENU_LOOP_URL}=openingMedia;
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
 const introLogo=useRef<HTMLImageElement>(null);
 const introStartTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const watchPressed=useRef(false);
 const [logoTravel,setLogoTravel]=useState({x:0,y:0});
 const [introNeedsGesture,setIntroNeedsGesture]=useState(false);
 const menuVideo=useRef<HTMLVideoElement>(null);
 const soundtrack=useRef<HTMLAudioElement>(null);
 const startMusic=useRef<null|((retry?:boolean)=>void)>(null);
 const [soundNeedsTap,setSoundNeedsTap]=useState(false);
 const muteRef=useRef(profile.muted),motionRef=useRef(profile.motion),reducedRef=useRef(reduced);
 muteRef.current=profile.muted;motionRef.current=profile.motion;reducedRef.current=reduced;
 const audioActivated=useRef(hasVisitedMenuThisPage);
 const introRevealStarted=useRef(false),menuPlayRequested=useRef(false),finished=useRef(false);

 useEffect(()=>{
  let active=true;
  const sources=[MENU_POSTER_URL,LOGO_URL,'/survival/expedition-menu-v2/approved-cards.webp',
   '/survival/starting-screen-ui-v2/survivor-profile.png','/survival/starting-screen-ui-v2/settings.png',
   '/survival/expedition-menu-v2/panels/play.png',
   '/survival/expedition-menu-v2/panels/customise.png',
   '/survival/expedition-menu-v2/panels/upgrades.png',
   '/survival/expedition-menu-v2/panels/friends.png'];
  const loads=sources.map(src=>new Promise<void>(resolve=>{
   const img=new window.Image();
   img.onload=()=>resolve();img.onerror=()=>resolve();img.src=src;
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

 // Install the streaming player before either entry button can receive a tap.
 useLayoutEffect(()=>{
  const audio=soundtrack.current;
  if(!audio)return;
  const session=(navigator as Navigator & {audioSession?:{type:string}}).audioSession;
  const music=createOpeningMusic(audio,setSoundNeedsTap,session);
  const start=(retry=false)=>{
   if(!audioActivated.current||document.hidden||muteRef.current){
    music.pause();
    setSoundNeedsTap(false);
    return;
   }
   music.start(retry);
  };
  const sync=()=>start();
  startMusic.current=start;
  document.addEventListener('visibilitychange',sync);
  start();
  return()=>{
   startMusic.current=null;
   document.removeEventListener('visibilitychange',sync);
   music.dispose();
  };
 },[]);

 const enableAudio=()=>{audioActivated.current=true;startMusic.current?.(true)};
 useEffect(()=>()=>{if(introStartTimer.current!==null)clearTimeout(introStartTimer.current)},[]);
 const save=(next:StartProfile)=>{
  muteRef.current=next.muted;
  setProfile(next);
  startMusic.current?.(!next.muted);
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
  setHandoffRequested(true);
  playMenuVideo();
 };
 const startIntroVideo=()=>{
  introStartTimer.current=null;
  setPhase('watching');
  const player=introVideo.current;
  if(!player){finishToMenu();return}
  // Intro narration must not begin until the full four-second title animation
  // finishes. The media element has preloaded from the initial page mount.
  player.currentTime=0;
  void player.play().catch(()=>{
   // Safari may require a fresh gesture to play narrated video after a timer.
   // Other transient playback rejections must not silently skip the film.
   // Keep the black title screen and offer an explicit one-tap retry.
   setIntroNeedsGesture(true);
  });
 };
 const retryIntroPlayback=()=>{
  // The playing event starts the soundtrack only after the video resumes.
  const player=introVideo.current;
  if(!player)return;
  void player.play().then(()=>setIntroNeedsGesture(false)).catch(()=>finishToMenu());
 };
 const beginEntry=(choice:'watch'|'continue')=>{
  if(phase!=='landing'||watchPressed.current)return;
  watchPressed.current=true;
  // Continue starts music on the tap. Watch Intro's four-second title
  // transition is silent; only the movie's playing event enables music.
  if(choice==='continue')enableAudio();
  introRevealStarted.current=false;
  setIntroUiPhase('hidden');
  const bounds=introLogo.current?.getBoundingClientRect();
  if(bounds)setLogoTravel({x:innerWidth/2-bounds.left-bounds.width/2,y:innerHeight/2-bounds.top-bounds.height/2});
  setPhase('transition');
  if(choice==='continue')playMenuVideo();
  introStartTimer.current=setTimeout(choice==='watch'?startIntroVideo:finishToMenu,INTRO_TITLE_TRANSITION_MS);
 };
 const onWatch=()=>beginEntry('watch');
 const onContinue=()=>beginEntry('continue');
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
  // Continue/Skip use the same staggered menu entrance as the film outro.
  // Preserve the finished outro when it has already revealed the controls.
  if(!introRevealStarted.current)setIntroUiPhase('revealing');
  else setIntroUiPhase('shown');
  setPhase('menu');
  // Skipping a film that never played still gives the menu its soundtrack.
  if(!audioActivated.current)enableAudio();
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
   if(phase==='watching'&&!finished.current&&!introNeedsGesture)void introVideo.current?.play().catch(()=>{});
  };
  document.addEventListener('visibilitychange',sync);
  return()=>document.removeEventListener('visibilitychange',sync);
 },[phase,reduced,profile.motion,introNeedsGesture]);
 useEffect(()=>{
  const editor=document.querySelector('main.world-editor');
  editor?.setAttribute('inert','');
  return()=>editor?.removeAttribute('inert');
 },[gameMounted]);

 const portrait={uri:profile.role==='hunter'?'/survival/hunter-v1/portrait.png':profile.role==='engineer'?'/survival/engineer-v2/portrait.webp':'/survival/starting-screen-ui-v2/survivor-profile.png'};
 return createPortal(<div className="game-start" onKeyDown={e=>e.stopPropagation()}
  style={{opacity:visualsReady?1:0,transition:'opacity 180ms ease-out',...(loadingProgress===1?{backgroundColor:'transparent',backgroundImage:'none'}:{})}}>
  <div className="game-start-media" aria-hidden="true">
   <audio ref={soundtrack} src={SOUNDTRACK_URL} preload="auto" loop/>
   <video ref={menuVideo} className="game-start-scene"
    style={{opacity:menuFrameReady||phase==='menu'?1:0}}
    src={MENU_LOOP_URL} poster={MENU_POSTER_URL} loop muted playsInline preload="auto"
    onPlaying={()=>setMenuFrameReady(true)}
    onError={()=>setMenuFailed(true)}/>
   <video ref={introVideo} className="game-start-intro-scene"
    style={{opacity:phase==='watching'&&introHasFrame?1:0}}
    src={INTRO_URL} preload="auto" playsInline
    onPlaying={()=>{setIntroHasFrame(true);setIntroNeedsGesture(false);enableAudio()}}
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
  <div className={'game-start-welcome'+(watchPressed.current?' is-transitioning':'')} style={{opacity:phase==='landing'||phase==='transition'||(phase==='watching'&&!introHasFrame)?1:0,pointerEvents:phase==='landing'?'auto':'none',...({'--intro-logo-dx':logoTravel.x+'px','--intro-logo-dy':logoTravel.y+'px'} as React.CSSProperties)}}>
    <div className="game-start-welcome-content">
     <div className="game-start-overline">THE RECLAMATION</div>
     <img ref={introLogo} src={LOGO_URL} className="game-start-welcome-logo" alt="Humans Remain"/>
     <p className="game-start-welcome-tagline">THE WORLD WAS TAKEN. WE ARE STILL HERE.</p>
     <div className="game-start-welcome-divider"/>
     <div className="game-start-welcome-actions">
      <button type="button" onClick={onWatch} disabled={phase!=='landing'} className="game-start-welcome-button primary">
       <strong>▶ &nbsp; WATCH INTRO</strong><small>THE STORY SO FAR · 60 SECONDS</small>
      </button>
      <button type="button" onClick={onContinue} disabled={phase!=='landing'} className="game-start-welcome-button secondary">
       <strong>CONTINUE →</strong><small>GO TO MAIN MENU</small>
      </button>
     </div>
    </div>
    <p className="game-start-welcome-footer">SURVIVE THE DAY. DEFEND THE NIGHT.</p>
   </div>
  {soundNeedsTap&&!profile.muted&&(phase==='menu'||(phase==='watching'&&introHasFrame))&&
   <button className="game-start-skip game-start-sound-retry" type="button" onClick={()=>startMusic.current?.(true)}>RETRY SOUND</button>}
  {phase==='watching'&&introNeedsGesture&&<button className="game-start-intro-retry" type="button" onClick={retryIntroPlayback}>TAP TO BEGIN THE RECLAMATION ▶</button>}
  {phase==='watching'&&<button className="game-start-skip" type="button" onClick={onSkip}
   aria-label="Skip introduction and open the main menu">SKIP »</button>}
 </div>,document.body);
}

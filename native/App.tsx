import NativeStartingScreen from './StartingScreen';
import {prepareSavedCampArtwork} from '../src/run-save';
import {NativeRunSaveStore} from './run-save-store';
import {NativeFrameWorkScheduler} from './frame-work-scheduler';
import type {TravelSnapshot} from '../src/scene-travel';
import {stationMenuAnimating,stationMenuRevision} from '../src/station-menu-layout';
import {normalizeAtlasZoom,settleAtlasZoom} from '../src/continuous-zoom-state';
import {continuousMapCamera} from '../src/continuous-zoom';
import React,{Profiler,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {View,Text,Pressable,ScrollView,StyleSheet,AppState,StatusBar,Alert,useWindowDimensions,AccessibilityInfo,Platform,PixelRatio,type StyleProp,type ViewStyle} from 'react-native';
import {SafeAreaProvider,useSafeAreaInsets} from 'react-native-safe-area-context';
import {Canvas,Picture,Skia,type SkPicture} from '@shopify/react-native-skia';
import {useSharedValue} from 'react-native-reanimated';
import {GestureHandlerRootView,GestureDetector} from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Font from 'expo-font';
import {createCampPlaySession,stepCampPlaySession,type SimulationProfiler} from '../src/studio-play';
import {STEP,clearAttackQueue,dodgePlayer,toggleAxe,type World} from '../src/survival-engine';
import {samplePlayer,presentPlayer,type PlayerSample} from '../src/player-presentation';
import {stepCampLighting,setWorldTimeOfDay} from '../src/camp-lighting';
import {CLEAR_WEATHER,setWorldWeather,stepWeather} from '../src/weather-model';
import {editorCamera} from '../src/placed-world-renderer';
import {EDITOR_IMAGE_SOURCES,editorTerrainDetail} from '../src/editor-image-sources';
import {requiredImages} from '../src/world-assets';
import {usesPaintedHomeTerrain} from '../src/terrain-art';
import {OutdoorTerrainStream} from '../src/outdoor-streaming';
import {SceneResourceCache} from '../src/scene-resources';
import {SceneTravel} from '../src/scene-travel';
import {SCENES} from '../src/world-scenes';
import {createNativeRenderer,PLAY_VIEW} from './game-renderer';
import {createZoomStore} from './play-zoom';
import {useNativePlayZoom} from './use-native-play-zoom';
import {NativePinchSurface} from './NativePinchSurface';
import NativeFieldKitHUD from './FieldKitHUD';
import NativePlayerMap from './PlayerMap';
import {GamePerformanceRecorder} from '../src/performance-recording';
import NativePerformancePanel,{NativePerformanceMenuOptions,NativePerformanceOverlay} from './PerformancePanel';
import {NativeFrameDiagnostics,nativeMapCoversWorld} from './frame-diagnostics';
import {performanceWorldContext} from '../src/performance-context';
import {NativeUiFrameProbe} from './UiFrameProbe';
import {NativeDeviceContextProbe} from './DeviceContextProbe';
import {FieldKitController} from '../src/field-kit';
import {loadGameWorld,type SavedWorld} from './game-world';

// Statically replaced by Expo's environment transform; no Node runtime required.
declare const process:{env:Partial<Record<'EXPO_PUBLIC_GAME_SOURCE_COMMIT'|'EXPO_PUBLIC_GAME_SOURCE_DIRTY'|'EXPO_PUBLIC_GAME_SOURCE_CAPTURED_AT',string>>};
type Mode='loading'|'playing'|'paused'|'bag'|'map'|'error';
type Runtime={renderer:Awaited<ReturnType<typeof createNativeRenderer>>;outdoor:OutdoorTerrainStream;resources:SceneResourceCache;travel:SceneTravel;saved:SavedWorld;reduced:boolean};
const zero=()=>({x:0,y:0});
export default function App(){const [entered,setEntered]=useState(false);return <GestureHandlerRootView style={{flex:1}}><SafeAreaProvider>{entered?<Game onHome={()=>setEntered(false)}/>:<NativeStartingScreen onPlay={()=>setEntered(true)}/>}</SafeAreaProvider></GestureHandlerRootView>}

function Game({onHome}:{onHome:()=>void}){
 const {width,height}=useWindowDimensions(),safe=useSafeAreaInsets(),dimensions=useRef({width,height});dimensions.current={width,height};
 const world=useRef<World|null>(null),runtime=useRef<Runtime|null>(null),input=useRef(zero()),sprint=useRef(false),swing=useRef(false),enabled=useRef(false),modeRef=useRef<Mode>('loading');
 const playView=useRef({...PLAY_VIEW});
 // A pinch moves the atlas amount every frame; only the map subscribes to it.
 const continuousZoom=useRef(1),mapVisible=useRef(false),[mapOpen,setMapOpen]=useState(false),atlasZoom=useMemo(()=>createZoomStore(1),[]);
 const mapReady=useRef(false),onMapReady=useCallback((ready:boolean)=>{mapReady.current=ready},[]),mapPump=useRef<((frameStart:number)=>void)|undefined>(undefined);
 const atlasCamera=useCallback((amount:number)=>world.current?continuousMapCamera(world.current,playView.current,dimensions.current.width,dimensions.current.height,amount):null,[]);
 const mapCamera=()=>atlasCamera(continuousZoom.current);
 const applyZoom=(amount:number,present=true)=>{
  const next=normalizeAtlasZoom(amount,mapCamera()?.minimum??.7),open=next<.7;
  continuousZoom.current=next;playView.current.zoom=Math.max(.7,next);
  if(open!==mapVisible.current){clear(true);if(world.current)world.current.stationPanel=undefined;mapVisible.current=open;setMapOpen(open);gamePerformance.trace(performance.now(),open?'native-map-open':'native-map-close',0,{atlasZoom:next,ready:mapReady.current})}
  atlasZoom.set(next,present);
 };
 const animateZoom=(requested:number,duration=260)=>pinch.animateTo(settleAtlasZoom(requested),duration);
 const settleZoom=(interrupted:boolean)=>{gamePerformance.trace(performance.now(),'native-pinch-end',0,{atlasZoom:continuousZoom.current,interrupted});const target=settleAtlasZoom(continuousZoom.current);if(target===continuousZoom.current)return;if(interrupted){pinch.stopAnimation();applyZoom(target)}else animateZoom(target,150)};
 const closeMap=useCallback(()=>animateZoom(.7),[]);
 const fieldKit=useMemo(()=>new FieldKitController(),[]);
 const saveStore=useMemo(()=>new NativeRunSaveStore({getItem:key=>AsyncStorage.getItem(key),setItem:(key,value)=>AsyncStorage.setItem(key,value)}),[]),saveBlocked=useRef(false),saveRunRef=useRef(()=>{}),[saveNotice,setSaveNotice]=useState('');
 const saveRun=(replaceUnreadable=false)=>{
  const t=runtime.current?.travel;if(!t||saveBlocked.current)return;
  const recording=gamePerformance.recording,session=gamePerformance.session,started=recording?performance.now():0;
  try{
   const prepared=saveStore.prepare(t),encodedAt=recording?performance.now():0;
   if(recording)gamePerformance.trace(started,'native-save-encode',encodedAt-started,{characters:prepared?.text.length??0,layoutCharacters:prepared?.layoutCharacters??0,serializedLayouts:prepared?.serializedLayouts??0,format:'native-split-layouts'},session);
   if(prepared)void saveStore.save(prepared,replaceUnreadable).then(()=>{
    if(recording)gamePerformance.trace(encodedAt,'native-save-write',performance.now()-encodedAt,{ok:!saveStore.error},session);
    setSaveNotice(saveStore.error);
   });
  }catch{setSaveNotice('Progress could not be saved on this device.')}
 };
 saveRunRef.current=saveRun;
 useEffect(()=>{const timer=setInterval(()=>saveRunRef.current(),15000);return()=>{saveRunRef.current();clearInterval(timer)}},[]);
 const gamePerformance=useMemo(()=>new GamePerformanceRecorder(),[]);
 const preparation=useMemo(()=>new NativeFrameWorkScheduler(gamePerformance),[gamePerformance]);
 useEffect(()=>()=>preparation.dispose(),[preparation]);
 const profileSimulation=useMemo<SimulationProfiler>(()=>(phase,ms)=>gamePerformance.system(phase,ms),[gamePerformance]);
 const frameDiagnostics=useMemo(()=>new NativeFrameDiagnostics(gamePerformance),[gamePerformance]);
 const [performanceOpen,setPerformanceOpen]=useState(false);
 const profileRender:React.ProfilerOnRenderCallback=(id,phase,actualDuration,_baseDuration,startTime)=>{if(gamePerformance.recording&&actualDuration>=4)gamePerformance.trace(startTime,'native-react-commit',actualDuration,{id,phase,atlasZoom:continuousZoom.current,mapVisible:mapVisible.current})};
 const startRecording=()=>{if(world.current?.phase==='over'||saveBlocked.current)return;gamePerformance.start(performance.now(),{platform:Platform.OS,osVersion:Platform.Version,developmentBuild:__DEV__,sourceAtMetroStart:{commit:process.env.EXPO_PUBLIC_GAME_SOURCE_COMMIT??'unavailable',trackedChanges:process.env.EXPO_PUBLIC_GAME_SOURCE_DIRTY??'unknown',capturedAt:process.env.EXPO_PUBLIC_GAME_SOURCE_CAPTURED_AT??'unavailable',scope:'Metro startup snapshot; restart Metro after pulling or editing code before a comparison run.'},jsEngine:typeof (globalThis as {HermesInternal?:unknown}).HermesInternal==='object'?'Hermes':'unknown',reactNativeVersion:Platform.constants.reactNativeVersion,renderer:'native-skia-picture',pixelRatio:PixelRatio.get(),renderPixelRatio:Math.min(2,PixelRatio.get()),viewport:dimensions.current,worldUpdatedAt:runtime.current?.saved.layout.updatedAt,worldRevision:runtime.current?.saved.revision,overlayEnabled:gamePerformance.overlay,nativeDiagnosticsRevision:'ios-native-smoothness-v2',nativeSaveFormat:'split-layouts-v2',sharedPreparationBudget:true,reactProfilerAvailable:__DEV__,uiCadenceAvailable:true});clear();change('playing')};
 const pinch=useNativePlayZoom({enabled:()=>enabled.current&&!runtime.current?.travel?.busy,getZoom:()=>continuousZoom.current,minimumZoom:()=>mapCamera()?.minimum??.7,onGestureEnd:settleZoom,setZoom:zoom=>applyZoom(zoom,false),onPinchStart:()=>{gamePerformance.trace(performance.now(),'native-pinch-start',0,{atlasZoom:continuousZoom.current});input.current=zero()}},atlasZoom);
 const [mode,setMode]=useState<Mode>('loading'),[boot,setBoot]=useState(0),[status,setStatus]=useState('Opening game…'),[error,setError]=useState(''),[,refresh]=useState(0),[sprinting,setSprinting]=useState(false);
 const empty=useMemo(()=>{const r=Skia.PictureRecorder();r.beginRecording();const p=r.finishRecordingAsPicture();r.dispose();return p},[]),picture=useSharedValue<SkPicture>(empty);
 const clear=(preserveZoom=false)=>{input.current=zero();sprint.current=false;swing.current=false;fieldKit.cancel();if(!preserveZoom)pinch.cancel();setSprinting(false);if(world.current)clearAttackQueue(world.current)};
 const change=(next:Mode)=>{frameDiagnostics.reset();if(next!=='playing'){pinch.stopAnimation();mapVisible.current=false;continuousZoom.current=playView.current.zoom;setMapOpen(false);atlasZoom.set(1)}gamePerformance.setActivity(next==='playing'?'playing':next==='bag'?'bag':next==='paused'||next==='map'?'paused':next==='error'?'error':'menu',performance.now());if(next==='error')gamePerformance.stop(performance.now(),'Runtime error');modeRef.current=next;enabled.current=next==='playing';if(next!=='paused')setPerformanceOpen(false);setMode(next)};
 const openMap=()=>{gamePerformance.trace(performance.now(),'native-map-button');if(!enabled.current||runtime.current?.travel.busy||!world.current||world.current.phase==='over')return;const c=mapCamera();if(c)animateZoom(.7*Math.min(2.5,c.entry*.5)/c.entry)};
 const pause=()=>{if(modeRef.current==='playing'||modeRef.current==='bag'||modeRef.current==='map'){clear();change('paused');saveRun()}};
 const bindTravel=(r:Runtime,next:World)=>{
  r.travel?.dispose();world.current=next;if(next.cycle){if(next.weather)next.weather.reducedMotion=r.reduced}else{setWorldTimeOfDay(next,'day',true);setWorldWeather(next,CLEAR_WEATHER,r.reduced)}
  r.travel=new SceneTravel(next,r.resources,w=>{world.current=w;clear();refresh(n=>n+1)},setStatus);
 };
 const restoreSurvival=async(r:Runtime)=>{
  await saveStore.flush();saveBlocked.current=false;setSaveNotice('');let snapshot:TravelSnapshot|undefined;
  try{snapshot=await saveStore.load()}catch(e){saveBlocked.current=true;setSaveNotice(`${(e as Error).message} Your save has been kept. Start a new Survival run to replace it.`)}
  // Do not autosave the temporary camp world while reopening a saved interior.
  if(snapshot)saveBlocked.current=true;
  bindTravel(r,snapshot?.worlds.find(([id])=>id==='camp')?.[1]??createCampPlaySession(r.saved.layout,undefined,'survival'));
  if(snapshot)try{await prepareSavedCampArtwork(snapshot,r.renderer.warmImages);await r.travel.restore(snapshot);saveBlocked.current=false}catch(e){saveBlocked.current=true;setSaveNotice(`Could not reopen your saved location: ${(e as Error).message}. Your save has been kept.`)}
 };
 const restart=()=>{const r=runtime.current;if(!r)return;gamePerformance.stop(performance.now(),'New Survival run');try{clear();continuousZoom.current=1;mapVisible.current=false;setMapOpen(false);atlasZoom.set(1);playView.current.zoom=1;bindTravel(r,createCampPlaySession(r.saved.layout,undefined,'survival'));saveBlocked.current=false;setSaveNotice('');change('playing');saveRun(true)}catch(e){setError(String(e));change('error')}};
 const newRun=()=>Alert.alert('Start a new Survival run?','This replaces your saved Survival run on this device.',[{text:'Keep current run',style:'cancel'},{text:'Start new run',style:'destructive',onPress:restart}]);
 useEffect(()=>{clear()},[width,height]);
 useEffect(()=>{
  let live=true,appActive=AppState.currentState==='active',raf=0,last=0,acc=0,lastTerrain=0,previous:PlayerSample|undefined,activeWorld:World|null=null;
  let drawnRevision=-1,drawnMenuRevision=-1,drawnSize='',drawnWorld:World|null=null;
  let renderer:Runtime['renderer']|undefined,local:Runtime|undefined;
  playView.current.zoom=1;pinch.cancel();change('loading');setError('');setStatus('Opening game…');
  const stop=()=>{if(local){local.travel?.dispose();local.outdoor.dispose();local.resources.dispose();local.renderer.dispose();local=undefined}else renderer?.dispose();renderer=undefined;runtime.current=null};
  const frame=(now:number)=>{
   raf=0;if(!live||!appActive||!local||!world.current)return;
   const frameStart=performance.now();
   try{
    const r=local,w=world.current,playing=modeRef.current==='playing',tracked=gamePerformance.beginFrame(now,playing?'playing':modeRef.current==='bag'?'bag':'paused'),updateStarted=tracked?performance.now():0,frameIntervalMs=last&&now>last?Math.min(1000/60,now-last):1000/60,dt=playing&&last?Math.min(.1,(now-last)/1000):0;last=now;let simulationSteps=0;
    if(activeWorld!==w){activeWorld=w;acc=0;previous=undefined;lastTerrain=0}
    stepCampLighting(w,dt);stepWeather(w,dt);acc+=dt;if(!playing)acc=0;
    while(acc>=STEP){const current:World=world.current!;previous=samplePlayer(current);simulationSteps++;
     if(!r.travel.busy)stepCampPlaySession(current,input.current,sprint.current,swing.current,gamePerformance.tracing?profileSimulation:undefined);
     if(current.repairCheckpoint){current.repairCheckpoint=false;saveRunRef.current()}
     if(current.phase==='over'){clear();change('paused');saveRun();acc=0;break}
     r.travel.tick(STEP,true);acc-=STEP;
     if(world.current!==current){previous=undefined;acc=0;break}
    }
    // Scene travel changes busy state outside React; keep native recognition current.
    pinch.syncConfig();
    const simulationEnded=tracked?performance.now():0;
    const current=world.current!,worldCovered=nativeMapCoversWorld(continuousZoom.current,mapReady.current);
    if(!worldCovered&&now-lastTerrain>=200){const size=dimensions.current,c=editorCamera(size.width,size.height,current,playView.current,1);r.outdoor.update({x:c.x,y:c.y,width:size.width/c.scale,height:size.height/c.scale},current.player,!current.scene&&usesPaintedHomeTerrain(current.layout?.terrainImage));current.outdoorReady=r.outdoor.ready;lastTerrain=now}
    const size=dimensions.current,sizeKey=`${size.width}:${size.height}`;
    const drawStarted=tracked?performance.now():0;
    let worldDrawn=false,publishMs=0;
    if(!worldCovered&&(playing||drawnMenuRevision!==stationMenuRevision(current)||stationMenuAnimating(current,now/1000)||drawnWorld!==current||drawnRevision!==r.renderer.revision||drawnSize!==sizeKey)){worldDrawn=true;const nextPicture=r.renderer.draw(presentPlayer(current,previous,playing?acc/STEP:1),size.width,size.height,r.travel.opacity);const publishStarted=tracked?performance.now():0;picture.value=nextPicture;if(tracked)publishMs=performance.now()-publishStarted;drawnRevision=r.renderer.revision;drawnSize=sizeKey;drawnWorld=current;drawnMenuRevision=stationMenuRevision(current)}
    const renderMs=tracked?performance.now()-drawStarted:0,updateMs=tracked?drawStarted-updateStarted:0,diagnosticsStarted=gamePerformance.tracing?performance.now():0;
    if(gamePerformance.tracing){
     gamePerformance.system('simulationMs',simulationEnded-updateStarted);gamePerformance.system('terrainMs',drawStarted-simulationEnded);
     const camera=editorCamera(size.width,size.height,current,playView.current,1);
     gamePerformance.frameContext({playerX:current.player.x,playerY:current.player.y,cameraX:camera.x,cameraY:camera.y,zoom:playView.current.zoom,atlasZoom:continuousZoom.current,enemyCount:current.enemies.length,mapVisible:mapVisible.current,mapReady:mapReady.current,worldDrawn,pinching:pinch.blocksMovement(),moving:current.player.moving,sprinting:current.player.sprinting});
    }
    if(gamePerformance.sampleDue(now)){const sampleStarted=performance.now();gamePerformance.sample(now,{...performanceWorldContext(current,playView.current.zoom,r.renderer.textureStats(),size.width,size.height),presentation:{atlasZoom:continuousZoom.current,mapVisible:mapVisible.current,mapReady:mapReady.current,mapOpacity:mapCamera()?.opacity??0,pinching:pinch.blocksMovement(),worldDrawn}});gamePerformance.trace(sampleStarted,'context-sample',performance.now()-sampleStarted)}
    const diagnosticsMs=gamePerformance.tracing?performance.now()-diagnosticsStarted:0;
    if(gamePerformance.tracing)gamePerformance.system('diagnosticsMs',diagnosticsMs);
    const mapWorkStarted=gamePerformance.tracing?performance.now():0;
    if(playing){mapPump.current?.(frameStart);preparation.drain(frameStart,frameIntervalMs)}
    const mapPrefetchMs=gamePerformance.tracing?performance.now()-mapWorkStarted:0;
    if(gamePerformance.tracing)gamePerformance.system('mapPrefetchMs',mapPrefetchMs);
    if(tracked&&playing)frameDiagnostics.frame(now,updateMs,renderMs,{atlasZoom:continuousZoom.current,mapVisible:mapVisible.current,mapReady:mapReady.current,worldDrawn,pinching:pinch.blocksMovement(),simulationMs:simulationEnded-updateStarted,terrainMs:drawStarted-simulationEnded,publishMs,mapPrefetchMs,diagnosticsMs});
    if(tracked)gamePerformance.endFrame(updateMs,renderMs,simulationSteps);
    raf=requestAnimationFrame(frame);
   }catch(e){clear();setError(e instanceof Error?e.message:String(e));change('error')}
  };
  void (async()=>{
   const stage=async<T,>(name:string,run:()=>T|Promise<T>)=>{try{return await run()}catch(e){const error=e instanceof Error?e:Error(String(e));error.message=`${name}: ${error.message}`;throw error}};
   try{
     await stage('Load interface font',()=>Font.loadAsync({FieldKitBarlow:require('../public/fonts/barlow-condensed-black.ttf')}));
     const reduced=await stage('Read accessibility settings',()=>AccessibilityInfo.isReduceMotionEnabled());
     const saved=await stage('Open game world',loadGameWorld);
     if(!live)return;
     setStatus('Preparing game…');
     renderer=await stage('Open renderer',()=>createNativeRenderer(playView.current,gamePerformance,preparation));if(!live){renderer.dispose();return}
     // Complete placed animations, chopping, stumps and movement before Play.
     // Detailed terrain uses bounded native lookahead and a startup buffer.
     await stage('Warm artwork',()=>renderer!.warmImages({...EDITOR_IMAGE_SOURCES,...editorTerrainDetail(saved.layout.terrainImage),...requiredImages(saved.layout.items.map(p=>p.assetId),saved.layout.terrainImage)}));
     if(!live){renderer?.dispose();return}
     const resources=await stage('Open scenes',()=>new SceneResourceCache(SCENES,renderer!.warmImages,renderer!.releaseImages)),outdoor=new OutdoorTerrainStream(renderer.warmImages,renderer.releaseImages,setStatus);
     if(!live){resources.dispose();outdoor.dispose();renderer?.dispose();return}
     local={renderer,resources,outdoor,saved,reduced,travel:undefined as unknown as SceneTravel};runtime.current=local;await stage('Restore survival',()=>restoreSurvival(local!));
     const w=world.current!,size=dimensions.current,c=editorCamera(size.width,size.height,w,playView.current,1);
     await stage('Settle terrain',async()=>{outdoor.update({x:c.x,y:c.y,width:size.width/c.scale,height:size.height/c.scale},w.player,usesPaintedHomeTerrain(w.layout?.terrainImage));await outdoor.settled();w.outdoorReady=outdoor.ready});
     if(!live){stop();return}
     await stage('Prepare nearby detail',()=>renderer!.prepareTerrain(w,size.width,size.height));
     if(!live){stop();return}
     // Present a complete first frame before removing the loading screen.
     picture.value=await stage('Draw game',()=>renderer!.draw(w,size.width,size.height,local!.travel.opacity));
     // Prime immutable map serialization before interactive play.
     saveStore.prepare(local!.travel);
     renderer!.setFrameManaged(true);
     setStatus('');change(!appActive||saveBlocked.current||w.phase==='over'?'paused':'playing');
     if(appActive)raf=requestAnimationFrame(frame);
   }catch(e){stop();throw e}
  })().catch(e=>{if(!live)return;console.error('Unable to open game',e);setError(e instanceof Error?e.message:String(e));change('error')});
  const subscription=AppState.addEventListener('change',state=>{appActive=state==='active';last=0;acc=0;if(!appActive){pause();gamePerformance.setActivity('background',performance.now());cancelAnimationFrame(raf);raf=0}else if(local&&!raf){gamePerformance.setActivity('paused',performance.now());raf=requestAnimationFrame(frame)}});
  const memoryWarning=AppState.addEventListener('memoryWarning',()=>{gamePerformance.trace(performance.now(),'native-memory-warning',0,{atlasZoom:continuousZoom.current,mapVisible:mapVisible.current});});
  const accessibility=AccessibilityInfo.addEventListener('reduceMotionChanged',reduced=>{if(local)local.reduced=reduced;if(world.current?.weather)world.current.weather.reducedMotion=reduced});
  return()=>{live=false;cancelAnimationFrame(raf);subscription.remove();memoryWarning.remove();accessibility.remove();picture.value=empty;stop()};
 },[boot]);
 const active=mode==='playing',w=world.current;
 const act=(fn:(world:World)=>unknown)=>{if(!enabled.current||runtime.current?.travel.busy||!world.current)return;fn(world.current);refresh(n=>n+1)};
 const wide=width>600;
 const button=(label:string,onPress:()=>void,disabled=false,style?:StyleProp<ViewStyle>)=><Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.button,disabled&&s.disabled,style]}><Text style={s.buttonText}>{label}</Text></Pressable>;
 return <GestureDetector gesture={pinch.gesture}><View style={s.root} collapsable={false}><StatusBar hidden/><Canvas pointerEvents="none" style={StyleSheet.absoluteFill}><Picture picture={picture}/></Canvas>
  <NativeUiFrameProbe recorder={gamePerformance} active={active}/>
  <NativeDeviceContextProbe recorder={gamePerformance} active={active}/>
  <NativePinchSurface registration={pinch.registration}><View collapsable={false} style={StyleSheet.absoluteFill} onTouchStart={pinch.start}/></NativePinchSurface>
  {w&&(active||mode==='bag')&&<Profiler id="native-hud" onRender={profileRender}><NativeFieldKitHUD nativePinch={pinch.registration} world={world} controller={fieldKit} input={input} mapOpen={mapOpen} enabled={active&&!mapOpen&&!runtime.current?.travel.busy} width={width} height={height} safe={safe} sprinting={sprinting} bagOpen={mode==='bag'}
   onPause={pause} onCheckpoint={()=>saveRunRef.current()} onBag={open=>{clear();change(open?'bag':'playing')}}
   onMap={openMap} onMovementTouchStart={pinch.start} isPinching={()=>mapVisible.current||pinch.blocksMovement()}
   onLock={()=>{void Haptics.selectionAsync().catch(()=>{})}}
   onHeld={held=>{swing.current=held;if(held)void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>{})}}
   onSprint={()=>{if(enabled.current){sprint.current=!sprint.current;setSprinting(sprint.current)}}}
   onDodge={()=>act(v=>dodgePlayer(v,input.current))}
   onTool={()=>{if(world.current&&(modeRef.current==='playing'||modeRef.current==='bag')&&!runtime.current?.travel.busy)toggleAxe(world.current)}}/></Profiler>}
  {w&&active&&!mapOpen&&!!(status||saveNotice)&&<Pressable style={[s.notice,{top:safe.top+110}]} onPress={()=>{if(status){runtime.current?.outdoor.retry();runtime.current?.travel.retry()}else saveRun()}}><Text style={s.small}>{status||saveNotice}</Text></Pressable>}
  {w&&active&&<Profiler id="native-map" onRender={profileRender}><NativePlayerMap nativePinch={pinch.registration} presentation={pinch.amount} pinchGesture={pinch.gesture} pinching={pinch.uiPinching} preparation={preparation} diagnostics={gamePerformance} onReady={onMapReady} active={mapOpen} world={world} width={width} height={height} safe={safe} camera={atlasCamera} zoom={atlasZoom} pump={mapPump} onTouchStart={pinch.start} onClose={closeMap}/></Profiler>}
  {w&&active&&<NativePerformanceOverlay recorder={gamePerformance} top={mapOpen?safe.top+8:safe.top+116} left={mapOpen?safe.left+8:safe.left+16}/>}
   {!active&&mode!=='bag'&&mode!=='map'&&<View style={[s.overlay,{paddingTop:safe.top+20,paddingBottom:safe.bottom+20,paddingLeft:safe.left+20,paddingRight:safe.right+20}]}>{mode==='paused'&&performanceOpen?<NativePerformancePanel recorder={gamePerformance} onStart={startRecording} onBack={()=>setPerformanceOpen(false)} defeated={w?.phase==='over'||saveBlocked.current} wide={wide}/>:<ScrollView style={[s.dialog,wide&&s.dialogWide]} contentContainerStyle={s.dialogContent}>
    <Text style={s.title}>{mode==='paused'?(w?.phase==='over'?'Run ended':'Game paused'):mode==='error'?'Unable to open game':'Humans Remain'}</Text>
    <Text style={s.description}>{mode==='loading'?status:mode==='error'?error:w?.phase==='over'?(w.cause||'Your health reached zero.'):'Your game is paused.'}</Text>
    {mode==='paused'&&<Text style={s.description}>{saveNotice||'Progress saves on this device.'}</Text>}
    {mode==='paused'&&<View style={[s.menu,wide&&s.menuWide]}>
     {w?.phase!=='over'&&!saveBlocked.current&&button('Resume',()=>{clear();change('playing');saveRun()},false,wide&&s.menuItem)}
     {button('New Survival run',newRun,false,wide&&s.menuItem)}
     {button('Starting screen',()=>{clear();saveRun();void saveStore.flush().then(onHome)},false,wide&&s.menuItem)}
     <Text style={s.section}>SETTINGS · PERFORMANCE</Text>
     <NativePerformanceMenuOptions recorder={gamePerformance} onOpen={()=>setPerformanceOpen(true)} style={wide&&s.menuItem}/>
    </View>}
    {mode==='error'&&button('Retry',()=>setBoot(n=>n+1))}
   </ScrollView>}</View>}
 </View></GestureDetector>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#100e0c'},hud:{position:'absolute',flexDirection:'row',alignItems:'center',gap:8},stats:{flex:1,backgroundColor:'#102d30e8',borderRadius:10,padding:9},text:{color:'#ffe9c1',fontSize:15,fontWeight:'800'},small:{color:'#e8d9b8',fontSize:12,lineHeight:17},controls:{position:'absolute',flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between'},leftControls:{gap:8,alignItems:'center'},joystick:{width:108,height:108,borderRadius:60,borderWidth:2,borderColor:'#d8c69988',backgroundColor:'#102d3066',alignItems:'center',justifyContent:'center'},thumb:{width:46,height:46,borderRadius:24,backgroundColor:'#e7d6a9aa',borderWidth:2,borderColor:'#f5e3bd'},actions:{alignItems:'flex-end',gap:8,maxWidth:240},row:{flexDirection:'row',gap:8},button:{minHeight:44,paddingHorizontal:13,paddingVertical:10,borderRadius:10,borderWidth:1,borderColor:'#938260',backgroundColor:'#183738ed',justifyContent:'center',alignItems:'center'},buttonText:{fontSize:14,fontWeight:'800',color:'#ffe4b2'},disabled:{opacity:.4},attack:{width:104,height:76,borderRadius:30,borderWidth:2,borderColor:'#e9bc77',backgroundColor:'#9c5428e8',alignItems:'center',justifyContent:'center'},notice:{position:'absolute',alignSelf:'center',top:'28%',maxWidth:'86%',backgroundColor:'#102d30ed',borderRadius:9,padding:10},overlay:{position:'absolute',top:0,bottom:0,left:0,right:0,justifyContent:'center',alignItems:'center',padding:24,backgroundColor:'#100e0cbb'},dialog:{width:'100%',maxWidth:420,maxHeight:'100%',flexGrow:0,borderRadius:16,borderWidth:1,borderColor:'#9b8054',backgroundColor:'#153234f5'},dialogWide:{maxWidth:720},dialogContent:{padding:24,gap:12},menu:{gap:12},menuWide:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',rowGap:12},menuItem:{width:'48.5%'},section:{width:'100%',fontSize:11,letterSpacing:2,color:'#b5bd9f',textAlign:'center',marginTop:4},title:{fontSize:30,fontWeight:'900',color:'#f6d69c',textAlign:'center'},description:{fontSize:15,lineHeight:22,color:'#e4d5b5',textAlign:'center'}});

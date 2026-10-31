import {RUN_SAVE_KEY,RunSaveWriter,encodeRun,decodeRun} from '../src/run-save';
import NativeSpawnPanel from './SpawnPanel';
import {spawnPlayCreature,spawnImages,clearPlaySpawns,type SpawnKind} from '../src/play-spawns';
import {BOMBER_IMAGE_SOURCES} from '../src/bomber-sprites';
import {spawnCombatEnemies,clearCombatEnemies,restoreCombatHealth} from '../src/studio-combat';
import {stationMenuAnimating,stationMenuRevision} from '../src/station-menu-layout';
import {normalizeAtlasZoom,settleAtlasZoom,atlasZoomTween} from '../src/continuous-zoom-state';
import {continuousMapCamera} from '../src/continuous-zoom';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {View,Text,Pressable,ScrollView,StyleSheet,AppState,StatusBar,Alert,useWindowDimensions,AccessibilityInfo,Platform,PixelRatio} from 'react-native';
import {SafeAreaProvider,useSafeAreaInsets} from 'react-native-safe-area-context';
import {Canvas,Picture,Skia,type SkPicture} from '@shopify/react-native-skia';
import {useSharedValue} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Font from 'expo-font';
import {createCampPlaySession,stepCampPlaySession} from '../src/studio-play';
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
import {createNativePlayZoom} from './play-zoom';
import NativeFieldKitHUD from './FieldKitHUD';
import NativePlayerMap from './PlayerMap';
import NativePerformancePanel,{NativePerformanceOverlay,NativePerformanceMenuOptions} from './PerformancePanel';
import {GamePerformanceRecorder} from '../src/performance-recording';
import {performanceWorldContext} from '../src/performance-context';
import {FieldKitController} from '../src/field-kit';
import {worldCandidates,validateSavedWorld,WORLD_CACHE,type SavedWorld} from './game-world';

type Mode='loading'|'ready'|'playing'|'paused'|'bag'|'map'|'error';
type Runtime={renderer:Awaited<ReturnType<typeof createNativeRenderer>>;outdoor:OutdoorTerrainStream;resources:SceneResourceCache;travel:SceneTravel;saved:SavedWorld;reduced:boolean};
const zero=()=>({x:0,y:0});
export default function App(){return <SafeAreaProvider><Game/></SafeAreaProvider>}

function Game(){
 const {width,height}=useWindowDimensions(),safe=useSafeAreaInsets(),dimensions=useRef({width,height});dimensions.current={width,height};
 const world=useRef<World|null>(null),runtime=useRef<Runtime|null>(null),input=useRef(zero()),sprint=useRef(false),swing=useRef(false),enabled=useRef(false),modeRef=useRef<Mode>('loading');
 const playView=useRef({...PLAY_VIEW});
 const continuousZoom=useRef(1),mapVisible=useRef(false),[atlasAmount,setAtlasAmount]=useState(1),zoomAnimation=useRef(0);
 const mapCamera=()=>world.current?continuousMapCamera(world.current,playView.current,dimensions.current.width,dimensions.current.height,continuousZoom.current):null;
 const applyZoom=(amount:number)=>{
  const next=normalizeAtlasZoom(amount,mapCamera()?.minimum??.7),open=next<.7;
  continuousZoom.current=next;playView.current.zoom=Math.max(.7,next);
  if(open!==mapVisible.current){clear(true);if(world.current)world.current.stationPanel=undefined;mapVisible.current=open}
  setAtlasAmount(next);
 };
 const animateZoom=(requested:number,duration=260)=>{cancelAnimationFrame(zoomAnimation.current);const target=settleAtlasZoom(requested),start=continuousZoom.current,at=performance.now();const frame=(now:number)=>{const t=Math.min(1,(now-at)/duration);applyZoom(atlasZoomTween(start,target,t));if(t<1)zoomAnimation.current=requestAnimationFrame(frame)};zoomAnimation.current=requestAnimationFrame(frame)};
 const settleZoom=(interrupted:boolean)=>{const target=settleAtlasZoom(continuousZoom.current);if(target===continuousZoom.current)return;if(interrupted){cancelAnimationFrame(zoomAnimation.current);applyZoom(target)}else animateZoom(target,150)};
 useEffect(()=>()=>cancelAnimationFrame(zoomAnimation.current),[]);
 const fieldKit=useMemo(()=>new FieldKitController(),[]);
 const saveWriter=useMemo(()=>new RunSaveWriter((key,value)=>AsyncStorage.setItem(key,value)),[]),saveBlocked=useRef(false),saveRunRef=useRef(()=>{}),[saveNotice,setSaveNotice]=useState('');
 const saveRun=()=>{const t=runtime.current?.travel;if(!t||saveBlocked.current)return;try{const text=encodeRun(t);if(text)void saveWriter.save(text).then(()=>setSaveNotice(saveWriter.error))}catch{setSaveNotice('Progress could not be saved on this device.')}};
 saveRunRef.current=saveRun;
 useEffect(()=>{const timer=setInterval(()=>saveRunRef.current(),15000);return()=>{saveRunRef.current();clearInterval(timer)}},[]);
 const gamePerformance=useMemo(()=>new GamePerformanceRecorder(),[]),[performanceOpen,setPerformanceOpen]=useState(false),[spawnOpen,setSpawnOpen]=useState(false);
 const pinch=useMemo(()=>createNativePlayZoom({enabled:()=>enabled.current&&!runtime.current?.travel?.busy,getZoom:()=>continuousZoom.current,minimumZoom:()=>mapCamera()?.minimum??.7,onGestureEnd:settleZoom,setZoom:zoom=>{cancelAnimationFrame(zoomAnimation.current);applyZoom(zoom)},onPinchStart:()=>{cancelAnimationFrame(zoomAnimation.current);input.current=zero()}}),[]);
 const [mode,setMode]=useState<Mode>('loading'),[boot,setBoot]=useState(0),[status,setStatus]=useState('Opening your world…'),[error,setError]=useState(''),[,refresh]=useState(0),[sprinting,setSprinting]=useState(false);
 const empty=useMemo(()=>{const r=Skia.PictureRecorder();r.beginRecording();const p=r.finishRecordingAsPicture();r.dispose();return p},[]),picture=useSharedValue<SkPicture>(empty);
 const clear=(preserveZoom=false)=>{input.current=zero();sprint.current=false;swing.current=false;fieldKit.cancel();if(!preserveZoom)pinch.cancel();setSprinting(false);if(world.current)clearAttackQueue(world.current)};
 const change=(next:Mode)=>{if(next!=='playing'){cancelAnimationFrame(zoomAnimation.current);mapVisible.current=false;continuousZoom.current=playView.current.zoom;setAtlasAmount(1)}gamePerformance.setActivity(next==='playing'?'playing':next==='bag'?'bag':next==='paused'||next==='map'?'paused':next==='error'?'error':'menu',performance.now());if(next==='error')gamePerformance.stop(performance.now(),'Runtime error');modeRef.current=next;enabled.current=next==='playing';if(next!=='paused'){setPerformanceOpen(false);setSpawnOpen(false)}setMode(next)};
 const openMap=()=>{if(!enabled.current||runtime.current?.travel.busy||!world.current||world.current.phase==='over')return;const c=mapCamera();if(c)animateZoom(.7*Math.min(2.5,c.entry*.5)/c.entry)};
 const pause=()=>{if(modeRef.current==='playing'||modeRef.current==='bag'||modeRef.current==='map'){clear();change('paused');saveRun()}};
 const bindTravel=(r:Runtime,next:World)=>{
  r.travel?.dispose();world.current=next;if(next.cycle){if(next.weather)next.weather.reducedMotion=r.reduced}else{setWorldTimeOfDay(next,'day',true);setWorldWeather(next,CLEAR_WEATHER,r.reduced)}
  r.travel=new SceneTravel(next,r.resources,w=>{world.current=w;clear();refresh(n=>n+1)},setStatus);
 };
 const restoreSurvival=async(r:Runtime)=>{
  await saveWriter.flush();saveBlocked.current=false;setSaveNotice('');let snapshot:ReturnType<typeof decodeRun>|undefined;
  try{const text=await AsyncStorage.getItem(RUN_SAVE_KEY);if(text)snapshot=decodeRun(text)}catch(e){saveBlocked.current=true;setSaveNotice(`${(e as Error).message} Your save has been kept. Start a new Survival run to replace it.`)}
  bindTravel(r,snapshot?.worlds.find(([id])=>id==='camp')?.[1]??createCampPlaySession(r.saved.layout,undefined,'survival'));
  if(snapshot)try{await r.travel.restore(snapshot)}catch(e){saveBlocked.current=true;setSaveNotice(`Could not reopen your saved location: ${(e as Error).message}. Your save has been kept.`)}
 };
 const restart=()=>{const r=runtime.current;if(!r)return;gamePerformance.stop(performance.now(),'New Survival run');try{clear();continuousZoom.current=1;mapVisible.current=false;setAtlasAmount(1);playView.current.zoom=1;bindTravel(r,createCampPlaySession(r.saved.layout,undefined,'survival'));saveBlocked.current=false;setSaveNotice('');change('playing');saveRun()}catch(e){setError(String(e));change('error')}};
 const newRun=()=>Alert.alert('Start a new Survival run?','This replaces your saved Survival run on this device.',[{text:'Keep current run',style:'cancel'},{text:'Start new run',style:'destructive',onPress:restart}]);
 const openSandbox=()=>{const r=runtime.current;if(!r)return;saveRun();clear();bindTravel(r,createCampPlaySession(r.saved.layout));setSaveNotice('Sandbox changes do not replace your Survival save.');change('paused')};
 const continueSurvival=async()=>{const r=runtime.current;if(!r)return;clear();change('loading');setStatus('Opening saved expedition…');await restoreSurvival(r);change(saveBlocked.current||world.current?.phase==='over'?'paused':'playing')};
 const startPerformanceRecording=()=>{if(world.current?.phase==='over'||saveBlocked.current&&world.current?.progression)return;gamePerformance.start(performance.now(),{platform:Platform.OS,osVersion:Platform.Version,developmentBuild:__DEV__,renderer:'native-skia-picture',pixelRatio:PixelRatio.get(),renderPixelRatio:Math.min(2,PixelRatio.get()),viewport:dimensions.current,worldUpdatedAt:runtime.current?.saved.layout.updatedAt,overlayEnabled:gamePerformance.overlay});clear();change('playing')};
 useEffect(()=>{clear()},[width,height]);
 useEffect(()=>{
  let live=true,appActive=AppState.currentState==='active',raf=0,last=0,acc=0,lastTerrain=0,previous:PlayerSample|undefined,activeWorld:World|null=null;
  let drawnRevision=-1,drawnMenuRevision=-1,drawnSize='',drawnWorld:World|null=null;
  let renderer:Runtime['renderer']|undefined,local:Runtime|undefined;
  playView.current.zoom=1;pinch.cancel();change('loading');setError('');setStatus('Checking the latest saved world…');
  const stop=()=>{if(local){local.travel.dispose();local.outdoor.dispose();local.resources.dispose();local.renderer.dispose();local=undefined}else renderer?.dispose();renderer=undefined;runtime.current=null};
  const frame=(now:number)=>{
   raf=0;if(!live||!appActive||!local||!world.current)return;
   try{
    const r=local,w=world.current,playing=modeRef.current==='playing',tracked=gamePerformance.beginFrame(now,playing?'playing':modeRef.current==='bag'?'bag':'paused'),updateStarted=tracked?performance.now():0,dt=playing&&last?Math.min(.1,(now-last)/1000):0;last=now;let simulationSteps=0;
    if(activeWorld!==w){activeWorld=w;acc=0;previous=undefined;lastTerrain=0}
    stepCampLighting(w,dt);stepWeather(w,dt);acc+=dt;if(!playing)acc=0;
    while(acc>=STEP){const current:World=world.current!;previous=samplePlayer(current);simulationSteps++;
     if(!r.travel.busy)stepCampPlaySession(current,input.current,sprint.current,swing.current);
     if(current.repairCheckpoint){current.repairCheckpoint=false;saveRunRef.current()}
     if(current.phase==='over'){clear();change('paused');saveRun();acc=0;break}
     r.travel.tick(STEP,true);acc-=STEP;
     if(world.current!==current){previous=undefined;acc=0;break}
    }
    const current=world.current!;
    if(now-lastTerrain>=200){const size=dimensions.current,c=editorCamera(size.width,size.height,current,playView.current,1);r.outdoor.update({x:c.x,y:c.y,width:size.width/c.scale,height:size.height/c.scale},current.player,!current.scene&&usesPaintedHomeTerrain(current.layout?.terrainImage));current.outdoorReady=r.outdoor.ready;lastTerrain=now}
    const size=dimensions.current,sizeKey=`${size.width}:${size.height}`;
    const drawStarted=tracked?performance.now():0;
    if(playing||drawnMenuRevision!==stationMenuRevision(current)||stationMenuAnimating(current,now/1000)||drawnWorld!==current||drawnRevision!==r.renderer.revision||drawnSize!==sizeKey){picture.value=r.renderer.draw(presentPlayer(current,previous,playing?acc/STEP:1),size.width,size.height,r.travel.opacity);drawnRevision=r.renderer.revision;drawnSize=sizeKey;drawnWorld=current;drawnMenuRevision=stationMenuRevision(current)}
    if(tracked)gamePerformance.endFrame(drawStarted-updateStarted,performance.now()-drawStarted,simulationSteps);
    if(gamePerformance.sampleDue(now)){const sampleStarted=performance.now();gamePerformance.sample(now,performanceWorldContext(current,playView.current.zoom,r.renderer.textureStats(),size.width,size.height));gamePerformance.trace(sampleStarted,'context-sample',performance.now()-sampleStarted)}
    raf=requestAnimationFrame(frame);
   }catch(e){clear();setError(e instanceof Error?e.message:String(e));change('error')}
  };
  void (async()=>{
   await Font.loadAsync({FieldKitBarlow:require('../public/fonts/barlow-condensed-black.ttf')});
   const reduced=await AccessibilityInfo.isReduceMotionEnabled(),candidates=await worldCandidates();let failure:unknown;
   for(const candidate of candidates){
    if(!live)return;
    try{
     const saved=validateSavedWorld(candidate.value,candidate.source);setStatus(`Loading ${candidate.source.toLowerCase()}…`);
     renderer=await createNativeRenderer(playView.current,gamePerformance);if(!live){renderer.dispose();return}
     // Complete placed animations, chopping, stumps and movement before Play.
     // Distant terrain detail retains the same bounded streaming as web.
     await renderer.warmImages({...EDITOR_IMAGE_SOURCES,...editorTerrainDetail(saved.layout.terrainImage),...requiredImages(saved.layout.items.map(p=>p.assetId),saved.layout.terrainImage)});
     if(!live){renderer.dispose();return}
     const resources=new SceneResourceCache(SCENES,renderer.warmImages,renderer.releaseImages),outdoor=new OutdoorTerrainStream(renderer.warmImages,renderer.releaseImages,setStatus);
     local={renderer,resources,outdoor,saved,reduced,travel:undefined as unknown as SceneTravel};runtime.current=local;await restoreSurvival(local);
     const w=world.current!,size=dimensions.current,c=editorCamera(size.width,size.height,w,playView.current,1);
     outdoor.update({x:c.x,y:c.y,width:size.width/c.scale,height:size.height/c.scale},w.player,usesPaintedHomeTerrain(w.layout?.terrainImage));w.outdoorReady=outdoor.ready;await outdoor.settled();
     if(!live){stop();return}
     // Save one complete successful world/artwork pair, never a partial update.
     void AsyncStorage.setItem(WORLD_CACHE,JSON.stringify(saved)).catch(()=>{});
     setStatus('');change('ready');if(appActive)raf=requestAnimationFrame(frame);return;
    }catch(e){failure=e;stop()}
   }throw failure||Error('The saved game could not open.');
  })().catch(e=>{if(live){setError(e instanceof Error?e.message:String(e));change('error')}});
  const subscription=AppState.addEventListener('change',state=>{appActive=state==='active';last=0;acc=0;if(!appActive){pause();gamePerformance.setActivity('background',performance.now());cancelAnimationFrame(raf);raf=0}else if(local&&!raf){gamePerformance.setActivity('paused',performance.now());raf=requestAnimationFrame(frame)}});
  const accessibility=AccessibilityInfo.addEventListener('reduceMotionChanged',reduced=>{if(local)local.reduced=reduced;if(world.current?.weather)world.current.weather.reducedMotion=reduced});
  return()=>{live=false;cancelAnimationFrame(raf);subscription.remove();accessibility.remove();picture.value=empty;stop()};
 },[boot]);
 const spawnCreature=async(kind:SpawnKind,count:number)=>{const r=runtime.current,current=world.current;if(!r||!current||current.phase==='over')return 'Start Play to spawn creatures.';await r.renderer.warmImages(spawnImages(kind));if(runtime.current!==r||world.current!==current||modeRef.current!=='paused')return 'Spawn cancelled because the map changed.';const size=dimensions.current,c=editorCamera(size.width,size.height,current,playView.current,1),result=spawnPlayCreature(current,kind,count,{x:c.x,y:c.y,width:size.width/c.scale,height:size.height/c.scale});if(result.spawned){clear();change('playing')}return result.message};
 const active=mode==='playing',w=world.current;
 const act=(fn:(world:World)=>unknown)=>{if(!enabled.current||runtime.current?.travel.busy||!world.current)return;fn(world.current);refresh(n=>n+1)};
 const button=(label:string,onPress:()=>void,disabled=false)=><Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.button,disabled&&s.disabled]}><Text style={s.buttonText}>{label}</Text></Pressable>;
 return <View style={s.root} {...pinch.touchHandlers}><StatusBar hidden/><Canvas pointerEvents="none" style={StyleSheet.absoluteFill}><Picture picture={picture}/></Canvas>
  <View style={StyleSheet.absoluteFill} onTouchStart={pinch.start}/>
  {w&&(active||mode==='bag')&&<NativeFieldKitHUD world={world} controller={fieldKit} input={input} mapOpen={mapVisible.current} enabled={active&&!mapVisible.current&&!runtime.current?.travel.busy} width={width} height={height} safe={safe} sprinting={sprinting} bagOpen={mode==='bag'}
   onPause={pause} onCheckpoint={()=>saveRunRef.current()} onBag={open=>{clear();change(open?'bag':'playing')}}
   onMap={openMap} onMovementTouchStart={pinch.start} isPinching={()=>mapVisible.current||pinch.blocksMovement()}
   onLock={()=>{void Haptics.selectionAsync().catch(()=>{})}}
   onHeld={held=>{swing.current=held;if(held)void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>{})}}
   onSprint={()=>{if(enabled.current){sprint.current=!sprint.current;setSprinting(sprint.current)}}}
   onDodge={()=>act(v=>dodgePlayer(v,input.current))}
   onTool={()=>{if(world.current&&(modeRef.current==='playing'||modeRef.current==='bag')&&!runtime.current?.travel.busy)toggleAxe(world.current)}}/>}
  {w&&active&&!mapVisible.current&&!!(status||saveNotice)&&<Pressable style={[s.notice,{top:safe.top+110}]} onPress={()=>{if(status){runtime.current?.outdoor.retry();runtime.current?.travel.retry()}else saveRun()}}><Text style={s.small}>{status||saveNotice}</Text></Pressable>}
  {active&&!mapVisible.current&&<NativePerformanceOverlay recorder={gamePerformance} top={safe.top+116} left={safe.left+16}/>}
  {w&&active&&<NativePlayerMap active={atlasAmount<.7} world={world} width={width} height={height} safe={safe} continuous={continuousMapCamera(w,playView.current,width,height,atlasAmount)} onTouchStart={pinch.start} onClose={()=>animateZoom(.7)}/>}
  {!active&&mode!=='bag'&&mode!=='map'&&<View style={[s.overlay,{paddingTop:safe.top+20,paddingBottom:safe.bottom+20,paddingLeft:safe.left+20,paddingRight:safe.right+20}]}>{mode==='paused'&&performanceOpen?<NativePerformancePanel recorder={gamePerformance} onStart={startPerformanceRecording} onBack={()=>setPerformanceOpen(false)} defeated={w?.phase==='over'} wide={width>600}/>:<ScrollView style={{width:'100%',maxWidth:420,maxHeight:'100%'}} contentContainerStyle={s.dialog}>
   {mode==='paused'&&spawnOpen?<NativeSpawnPanel onSpawn={spawnCreature} onBack={()=>setSpawnOpen(false)} onClear={()=>{if(world.current)clearPlaySpawns(world.current)}} onHeal={()=>{if(world.current)restoreCombatHealth(world.current)}}/>:<><Text style={s.title}>{mode==='paused'?(w?.phase==='over'?'Run ended':'Game paused'):mode==='error'?'Unable to open game':'Humans Remain'}</Text>
   <Text style={s.description}>{mode==='loading'?status:mode==='error'?error:mode==='ready'?'Restore the furnace, unlock metalworking and defend headquarters through three nights.':w?.phase==='over'?(w.cause||'Your health reached zero.'):'Your game is paused.'}</Text>
   {(mode==='ready'||mode==='paused')&&<Text style={s.description}>{saveNotice||(w?.progression?'Survival · Progress saves on this device.':'Testing sandbox · Spawn tools available below.')}</Text>}
   {(mode==='ready'||mode==='paused')&&w?.phase!=='over'&&!(saveBlocked.current&&w?.progression)&&button(mode==='ready'?'Continue game':'Resume',()=>{clear();change('playing');saveRun()})}
   {(mode==='ready'||mode==='paused')&&<>{!w?.progression&&button('Continue Survival',()=>void continueSurvival())}{button('New Survival run',newRun)}{w?.progression&&button('Open testing sandbox',openSandbox)}</>}
   {mode==='paused'&&<><NativePerformanceMenuOptions recorder={gamePerformance} onOpen={()=>setPerformanceOpen(true)} onSpawn={!w?.progression&&w?.phase!=='over'?()=>setSpawnOpen(true):undefined}/>{button('Main menu',()=>{saveRun();gamePerformance.stop(performance.now(),'Left Play mode');clear();change('ready')})}</>}
   {mode==='error'&&button('Retry',()=>setBoot(n=>n+1))}</>}
  </ScrollView>}</View>}
 </View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#100e0c'},hud:{position:'absolute',flexDirection:'row',alignItems:'center',gap:8},stats:{flex:1,backgroundColor:'#102d30e8',borderRadius:10,padding:9},text:{color:'#ffe9c1',fontSize:15,fontWeight:'800'},small:{color:'#e8d9b8',fontSize:12,lineHeight:17},controls:{position:'absolute',flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between'},leftControls:{gap:8,alignItems:'center'},joystick:{width:108,height:108,borderRadius:60,borderWidth:2,borderColor:'#d8c69988',backgroundColor:'#102d3066',alignItems:'center',justifyContent:'center'},thumb:{width:46,height:46,borderRadius:24,backgroundColor:'#e7d6a9aa',borderWidth:2,borderColor:'#f5e3bd'},actions:{alignItems:'flex-end',gap:8,maxWidth:240},row:{flexDirection:'row',gap:8},button:{minHeight:44,paddingHorizontal:13,paddingVertical:10,borderRadius:10,borderWidth:1,borderColor:'#938260',backgroundColor:'#183738ed',justifyContent:'center',alignItems:'center'},buttonText:{fontSize:14,fontWeight:'800',color:'#ffe4b2'},disabled:{opacity:.4},attack:{width:104,height:76,borderRadius:30,borderWidth:2,borderColor:'#e9bc77',backgroundColor:'#9c5428e8',alignItems:'center',justifyContent:'center'},notice:{position:'absolute',alignSelf:'center',top:'28%',maxWidth:'86%',backgroundColor:'#102d30ed',borderRadius:9,padding:10},overlay:{position:'absolute',top:0,bottom:0,left:0,right:0,justifyContent:'center',alignItems:'center',padding:24,backgroundColor:'#100e0cbb'},dialog:{width:'100%',maxWidth:420,padding:24,gap:12,borderRadius:16,borderWidth:1,borderColor:'#9b8054',backgroundColor:'#153234f5'},title:{fontSize:30,fontWeight:'900',color:'#f6d69c',textAlign:'center'},description:{fontSize:15,lineHeight:22,color:'#e4d5b5',textAlign:'center'}});

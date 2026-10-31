import {RUN_SAVE_KEY,encodeRun,decodeRun,prepareSavedCampArtwork} from './run-save';
import {spawnPlayCreature,spawnImages,clearPlaySpawns,type SpawnKind} from './play-spawns';
import {BOMBER_IMAGE_SOURCES} from './bomber-sprites';
import {normalizeAtlasZoom,settleAtlasZoom,atlasZoomTween} from './continuous-zoom-state';
import {nearbyChest as closestChest} from './play-interaction';
import {prepareAuthoredWorld} from './authored-world';
import {addApprovedTreeVariants} from './tree-variants';
import {addApprovedCampFringe} from './camp-fringe';
import {addApprovedWorldPlanting} from './world-planting';
import {refineApprovedWoodlandZones} from './woodland-zones';
import {addApprovedCampRiver} from './camp-river';
import {addApprovedCampOutskirts} from './camp-outskirts';
import {EAST_TERRAIN_SCALE as RIVER_SCALE} from './east-approach';
import {RIVER_BATCHES,RIVER_SIDE_FEATURES} from './river-layout';
import {WATERFALL_LOCATIONS} from './waterfalls';
import {OutdoorTerrainStream} from './outdoor-streaming';
import {isFoliageAsset,readFoliageHidden,rememberFoliageHidden} from './foliage-display';
import {OUTDOOR_SOURCE_SIZE} from './outdoor-terrain';
import {addApprovedCampPerimeter} from './camp-perimeter';
import {nearbyGate,toggleGate,gateActionLabel} from './camp-gates';
import {addApprovedCampPuddles} from './camp-puddles';
import {MAX_LAYOUT_ITEMS,MAX_LAYOUT_BYTES} from './layout-limits';
import {addApprovedCampFoliage,refineApprovedCampFoliage} from './camp-foliage';
import {layoutViews,invalidateLayoutViews} from './layout-views';
import {boundPlacementPoint,placementLimits} from './world-layout';
import {readWeather,rememberWeather,setWorldWeather,stepWeather,triggerLightning,type WeatherKind} from './weather-model';
import React,{useEffect,useId,useMemo,useRef,useState} from 'react';
import {Leaf,ArrowLeft,MousePointer2,Footprints,Search,Save,Play,Undo2,Redo2,Trash2,Copy,LocateFixed,Grid2X2,Shield,Sun,Moon,CloudRain,CloudFog,CloudLightning,Download,Upload,X,MapPin,Layers,Plus,Minus,PanelLeft,SlidersHorizontal,Hand,MoreHorizontal,Maximize2,Minimize2,ArrowUp,ArrowDown,ArrowRight,RotateCw,RotateCcw,Lock,Unlock,FlipHorizontal2,FlipVertical2,LibraryBig,Square,Pause,RotateCcw as Restart,PanelRight,ChevronRight,Box,FolderOpen,Flame,Droplets,Heart,HelpCircle,Check} from 'lucide-react';
import {WORLD_ASSETS,imageDimensions,ASSET_BY_ID,ROLE_LABELS,requiredImages,type WorldAsset,type WorldRole} from './world-assets';
import {emptyLayout,invalidateLayoutCollision,newPlacement,newPlacementId,placementPoint,placementBounds,placementHitStack,placementEditable,normalizeRotation,placementGeometryAsset,fetchWorldLayout,saveWorldLayout,validateLayout,LAYOUT_KEY,type Placement,type WorldLayout} from './world-layout';
import {readEditorDraft,resolveEditorDraft,offlineEditorDraft,persistEditorDraft} from './world-draft-recovery';
import {drawWorldEditor,editorCamera,type EditorView} from './placed-world-renderer';
import {clampPlayZoom} from './play-zoom';
import {attachPlayZoom} from './play-zoom-web';
import {createWorld,STEP,requestAttack,clearAttackQueue,dodgePlayer,toggleAxe,campAction,doAction,pickupTarget,fireLabel} from './survival-engine';
import {selectQuickItem,type QuickItem} from './quick-items';
import {MAP_WIDTH,MAP_HEIGHT} from './factory-map';
import './world-editor.css';
import BaseChecklist from './BaseChecklist';
import {createCampPlaySession,stepCampPlaySession,campInteraction,performCampInteraction} from './studio-play';
import type {World} from './survival-engine';
import {samplePlayer,presentPlayer,type PlayerSample} from './player-presentation';
import {AxeToggle,AxeSwingButton} from './AxeControls';
import {WALKER_IMAGE_SOURCES} from './walker-sprites';
import {SKITTER_IMAGE_SOURCES} from './skitter-sprites';
import {HOUND_IMAGE_SOURCES} from './hound-sprites';
import {BRUTE_IMAGE_SOURCES} from './brute-sprites';
import {CombatAudio,combatSoundEnabled} from './combat-audio';
import SprintButton,{useSprintControl} from './SprintButton';
import {HOME_TERRAIN,usesPaintedHomeTerrain} from './terrain-art';
import {addApprovedFoliageTrial,addApprovedFoliageExpansion,addApprovedTerrainFoliage} from './foliage-trial';
import {type ArtworkFile} from './artwork-model';
import {prepareTerrainUpload} from './terrain-upload';
import WorldCollisionEditor from './WorldCollisionEditor';
import {EditorJoystick,useMobileEditor,useEditorDisplay} from './WorldEditorControls';
import {EditorAccessNotice,useEditorAccess} from './EditorAccess';
import {toggleChest,chestIsOpen} from './chest-animation';
import {addApprovedHeadquartersProps} from './headquarters-dressing';
import {addApprovedCampWell} from './camp-centrepiece';
import {STATION_IDS} from './camp-stations';
import WorldTierControls from './WorldTierControls';
import {prepareTierChange,tierTargets,wallAssetForLayout} from './world-tiers';
import {EDITOR_IMAGE_SOURCES,EDITOR_ENTRY_IMAGES,editorEntryArtwork,editorTerrainDetail,prepareEditorMovement} from './editor-image-sources';
import {loadingDeadline,type ArtworkProgress} from './artwork-loading';
import {libraryAssets} from './asset-library-policy';
import type {PlayToolTab} from './PlayMonitor';
import MobileStudioTools,{type StudioToolTab} from './MobileStudioTools';
import {spawnCombatEnemies,clearCombatEnemies,restoreCombatHealth} from './studio-combat';
import {ENEMY_TYPES,type EnemyKind} from './enemy-types';
import {RenderFrameMeter} from './studio-monitoring';
import './studio.css';
import './studio-mobile.css';
import './combat-controls.css';
import GamePlayMenu,{EditorOnly} from './GamePlayMenu';
import {GamePerformanceRecorder,type PerformanceActivity} from './performance-recording';
import {performanceWorldContext} from './performance-context';
import {GamePerformanceOverlay} from './GamePerformance';
import FieldKitHUD from './FieldKitHUD';
import {continuousMapCamera} from './continuous-zoom';
import PlayerMap,{preloadPlayerMap} from './PlayerMap';
import {FieldKitController} from './field-kit';
import './game-play.css';
import {readTimeOfDay,rememberTimeOfDay,setWorldTimeOfDay,stepCampLighting,type TimeOfDay} from './camp-lighting';
import {SceneTravel} from './scene-travel';
import {SceneResourceCache} from './scene-resources';
import {SCENES,sceneId,sceneName,sceneSize,invalidateScenePortals} from './world-scenes';

function ArtThumb({asset}:{asset:WorldAsset}){const clip=useId();const [x,y,width,height]=asset.crop;return <svg viewBox={asset.crop.join(' ')} aria-hidden="true" preserveAspectRatio="xMidYMid meet"><defs><clipPath id={clip}><rect x={x} y={y} width={width} height={height}/></clipPath></defs><image clipPath={`url(#${clip})`} href={asset.image} width={imageDimensions[asset.image]?.[0]} height={imageDimensions[asset.image]?.[1]}/></svg>}
const clone=(l:WorldLayout):WorldLayout=>JSON.parse(JSON.stringify(l));
export default function WorldEditor(){
 const access=useEditorAccess('/#editor');
 const mobile=useMobileEditor(),[libraryOpen,setLibraryOpen]=useState(!mobile),[inspectorOpen,setInspectorOpen]=useState(!mobile),[libraryTab,setLibraryTab]=useState<'scene'|'assets'|'world'>('scene'),[panTool,setPanTool]=useState(false);
 const display=useEditorDisplay(mobile);
 const [foliageHidden,setFoliageHidden]=useState(readFoliageHidden),foliageHiddenRef=useRef(foliageHidden);
 const outdoorTerrain=useRef<OutdoorTerrainStream|null>(null);
 const [outdoorStatus,setOutdoorStatus]=useState('');
 const [waterfallIndex,setWaterfallIndex]=useState(0);
 const [riverIndex,setRiverIndex]=useState(2);
 const [sideFeatureIndex,setSideFeatureIndex]=useState(0);
 const travel=useRef<SceneTravel|null>(null),mapResources=useRef<SceneResourceCache|null>(null),mapZooms=useRef(new Map<string,number>());
 const [weatherOptions,setWeatherOptions]=useState(readWeather),weatherOptionsRef=useRef(weatherOptions);
 const [timeOfDay,setTimeOfDay]=useState<TimeOfDay>(readTimeOfDay),timeOfDayRef=useRef(timeOfDay);
 const [activeLocation,setActiveLocation]=useState('Camp'),[travelStatus,setTravelStatus]=useState('');
 const [monitorOpen,setMonitorOpen]=useState(!mobile),[playToolTab,setPlayToolTab]=useState<PlayToolTab>('monitor'),frameMeter=useRef(new RenderFrameMeter());
 const [toolsOpen,setToolsOpen]=useState(false),[toolsTab,setToolsTab]=useState<StudioToolTab>('mode'),toolsToggle=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(mobile){setToolsOpen(false);setLibraryOpen(false);setInspectorOpen(false);setMonitorOpen(false)}},[mobile]);
 const [assetBrowser,setAssetBrowser]=useState(location.hash==='#checklist'),[assetFocus,setAssetFocus]=useState<string|undefined>(),[assetView,setAssetView]=useState<'art'|'misc'>('art'),[assetVersion,setAssetVersion]=useState(0),[sceneSearch,setSceneSearch]=useState(''),[sceneCount,setSceneCount]=useState(100);
 const [paused,setPaused]=useState(false),[bagOpen,setBagOpen]=useState(false),[mapOpen,setMapOpen]=useState(false);
 const [saveNotice,setSaveNotice]=useState(''),saveBlocked=useRef(false),saveRunRef=useRef(()=>{});
 const fieldKit=useMemo(()=>new FieldKitController(),[]);
 const gamePerformance=useMemo(()=>new GamePerformanceRecorder(),[]),gameActivity=useRef<PerformanceActivity>('editor');
 const [helpOpen,setHelpOpen]=useState(false),libraryDialog=useRef<HTMLDialogElement>(null),helpDialog=useRef<HTMLDialogElement>(null);
 const editSession=useRef<{world:World;view:EditorView;libraryOpen:boolean;inspectorOpen:boolean}|null>(null),blockedInput=useRef(false);
 const modeActions=useRef<{start:()=>void;stop:()=>void;library:()=>void}|null>(null);

 const touchInput=useRef({x:0,y:0});
 const sprint=useSprintControl(),attackHeld=useRef(false);
 const combatAudio=useRef<CombatAudio|null>(null);
 const [axeEquipped,setAxeEquipped]=useState(true);
 const [initialDraft]=useState(()=>readEditorDraft());
 const [layout,setLayout]=useState<WorldLayout>(()=>initialDraft.layout||emptyLayout()),layoutRef=useRef(layout),draftHydrated=useRef(false);
 const world=useRef<World>({...createWorld(layout),editorPreview:true}),canvas=useRef<HTMLCanvasElement>(null),keys=useRef(new Set<string>()),renderer=useRef<Awaited<ReturnType<typeof import('./skia-web')['createWebWorld']>>|undefined>(undefined);
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState('Opening local draft…'),[cloudLoaded,setCloudLoaded]=useState(false),[busy,setBusy]=useState(false),revision=useRef(0),savingRef=useRef(false);
 const [preparingMode,setPreparingMode]=useState<'walk'|'play'|null>(null),modeRequest=useRef(0);
 const [loadAttempt,setLoadAttempt]=useState(0),[loadProgress,setLoadProgress]=useState<ArtworkProgress&{stage:string}>({loaded:0,total:0,stage:'Opening your saved draft…'}),[terrainDetail,setTerrainDetail]=useState<'loading'|'ready'|'error'>('loading'),[detailProgress,setDetailProgress]=useState<ArtworkProgress>({loaded:0,total:4});
 const canEdit=access.state==='owner'&&cloudLoaded;
 const [mode,setMode]=useState<'edit'|'walk'|'play'>('edit'),modeRef=useRef(mode),[search,setSearch]=useState(''),[group,setGroup]=useState('all'),[selected,setSelected]=useState<string|null>(null),[placing,setPlacing]=useState<string|null>(null),placingRef=useRef<string|null>(null),placementEpoch=useRef(0);
 const [view,setView]=useState<EditorView>({x:layout.spawn.x,y:layout.spawn.y,zoom:mobile?1:.78,follow:mobile,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false}),viewRef=useRef(view);
 const history=useRef<WorldLayout[]>([]),future=useRef<WorldLayout[]>([]),[,setHistoryTick]=useState(0),gesture=useRef<{kind:'move'|'pan'|'tap';id?:string;start:{x:number;y:number};client:{x:number;y:number};origin:{x:number;y:number};before:WorldLayout;pointer:number;moved:boolean}|null>(null),upload=useRef<HTMLInputElement>(null);
 const pointers=useRef(new Map<number,{x:number;y:number}>()),pinch=useRef<{distance:number;zoom:number;anchor:{x:number;y:number}}|null>(null);
 const playZoomInput=useRef<ReturnType<typeof attachPlayZoom>|null>(null);
 const [terrainBusy,setTerrainBusy]=useState(false),[terrainProgress,setTerrainProgress]=useState('');
 useEffect(()=>{if(modeRef.current!=='play'){setBagOpen(false);setMapOpen(false)}},[mode]);
 const [collisionEdit,setCollisionEdit]=useState<Placement|null>(null);
 const [tierBusy,setTierBusy]=useState(false),tierBusyRef=useRef(false);
 const [overlapIds,setOverlapIds]=useState<string[]>([]);
 const [message,setMessage]=useState(''),[onlyPlaced,setOnlyPlaced]=useState(false),[askClear,setAskClear]=useState(false);
 // Docks are outside the canvas. Only modal workflows suspend world input.
 blockedInput.current=assetBrowser||paused||bagOpen||helpOpen||!!collisionEdit||askClear||!!error;
 gameActivity.current=mode!=='play'?'editor':error?'error':bagOpen?'bag':blockedInput.current?'paused':'playing';
 const selectedItem=layout.items.find(p=>p.id===selected),selectedAsset=selectedItem&&ASSET_BY_ID.get(selectedItem.assetId);const selectedGeometry=selectedItem&&placementGeometryAsset(selectedItem);
 const [nearbyGateId,setNearbyGateId]=useState<string|null>(null);
 const [nearbyChest,setNearbyChest]=useState<string|null>(null),[,refreshChest]=useState(0);
 const [bonfireAction,setBonfireAction]=useState<string|null>(null);
 const previewCooking=()=>{const w=world.current;if(pickupTarget(w)?.kind==='cookedMeat'){if(doAction(w,'pickup')){w.cooked=0;show('Cooked chicken collected.')}}else if(campAction(w)==='cook'&&!w.fire.cookUntil&&!w.fire.ready){if(!w.bag.rawMeat){w.bag.rawMeat=1;w.loads++}doAction(w,'cook')}};
 const findNearbyChest=()=>closestChest(world.current);
 const openChest=(id:string)=>{toggleChest(world.current,id);refreshChest(n=>n+1)};
 useEffect(()=>{if(!ready||mode!=='walk'){setNearbyGateId(null);setNearbyChest(null);setBonfireAction(null);return}const timer=setInterval(()=>{setNearbyGateId(nearbyGate(world.current)?.id||null);setNearbyChest(findNearbyChest());const w=world.current;setBonfireAction(pickupTarget(w)?.kind==='cookedMeat'?'Collect meal':campAction(w)==='cook'?(w.fire.cookUntil||w.fire.ready?fireLabel(w):'Try cooking'):null)},150);return()=>clearInterval(timer)},[ready,mode]);
 const updateView=(patch:Partial<EditorView>)=>{viewRef.current={...viewRef.current,...patch};setView(viewRef.current)};
 const select=(id:string|null,candidates?:string[])=>{setSelected(id);setOverlapIds(candidates??(id?[id]:[]));updateView({selected:id})};
 const toggleFoliage=()=>{cancelGesture();cancelPlace();const hidden=!foliageHiddenRef.current;foliageHiddenRef.current=hidden;setFoliageHidden(hidden);rememberFoliageHidden(hidden);if(hidden&&isFoliageAsset(ASSET_BY_ID.get(layoutRef.current.items.find(p=>p.id===viewRef.current.selected)?.assetId||'')))select(null)};
 const setCurrent=(next:WorldLayout,record=true)=>{if(world.current.scene)backToCamp();if(record){history.current.push(layoutRef.current);if(history.current.length>60)history.current.shift();future.current=[];setHistoryTick(n=>n+1)}next={...next,updatedAt:new Date().toISOString()};layoutRef.current=next;world.current.layout=next;for(const id of STATION_IDS){const p=next.items.find(p=>p.role===id);world.current.camp[id].x=p?.x??-10000;world.current.camp[id].y=p?.y??-10000}setLayout(next);setStatus('Changes saved on this device · Save to sync');};
 const editItem=(id:string,patch:Partial<Placement>,record=true)=>{if(modeRef.current==='play')return;const item=layoutRef.current.items.find(p=>p.id===id);if(!item||!placementEditable(item,patch))return;setCurrent({...layoutRef.current,items:layoutRef.current.items.map(p=>p.id===id?{...p,...patch}:p)},record);};
 const cancelPlace=()=>{placementEpoch.current++;placingRef.current=null;setPlacing(null);updateView({ghost:null,placingSpawn:false})};
 const cancelGesture=()=>{const g=gesture.current;if(g?.kind==='move'&&g.moved)setCurrent(g.before,false);gesture.current=null;pinch.current=null;pointers.current.clear();playZoomInput.current?.cancel()};
 const equipAxe=()=>{if(toggleAxe(world.current))setAxeEquipped(world.current.player.equipped==='axe')};
 const clearInput=(preserveZoom=false)=>{keys.current.clear();touchInput.current={x:0,y:0};sprint.reset();attackHeld.current=false;fieldKit.cancel();clearAttackQueue(world.current);if(!preserveZoom)playZoomInput.current?.cancel()};
 const changeBag=(open:boolean)=>{clearInput();gamePerformance.setActivity(open?'bag':'playing',performance.now());setBagOpen(open);if(!open)canvas.current?.focus({preventScroll:true})};
 const continuousZoom=useRef(1),mapVisible=useRef(false),[atlasAmount,setAtlasAmount]=useState(1),zoomAnimation=useRef(0);
 const mapCamera=()=>continuousMapCamera(world.current,viewRef.current,canvas.current?.clientWidth||1,canvas.current?.clientHeight||1,continuousZoom.current);
 const applyContinuousZoom=(amount:number)=>{
  const next=normalizeAtlasZoom(amount,mapCamera().minimum),open=next<.7;
  continuousZoom.current=next;viewRef.current={...viewRef.current,zoom:Math.max(.7,next),follow:true};
  if(next<.95)preloadPlayerMap(world.current);
  if(open!==mapVisible.current){clearInput(true);world.current.stationPanel=undefined;mapVisible.current=open;setMapOpen(open)}
  setAtlasAmount(next);
 };
 const animateZoom=(requested:number,duration=260)=>{cancelAnimationFrame(zoomAnimation.current);const target=settleAtlasZoom(requested),start=continuousZoom.current,at=performance.now();const frame=(now:number)=>{const t=Math.min(1,(now-at)/duration);applyContinuousZoom(atlasZoomTween(start,target,t));if(t<1)zoomAnimation.current=requestAnimationFrame(frame)};zoomAnimation.current=requestAnimationFrame(frame)};
 const settleZoom=(interrupted:boolean)=>{const target=settleAtlasZoom(continuousZoom.current);if(target===continuousZoom.current)return;if(interrupted){cancelAnimationFrame(zoomAnimation.current);applyContinuousZoom(target)}else animateZoom(target,150)};
 useEffect(()=>()=>cancelAnimationFrame(zoomAnimation.current),[]);
 useEffect(()=>{if(paused||bagOpen||mode!=='play'){cancelAnimationFrame(zoomAnimation.current);mapVisible.current=false;continuousZoom.current=viewRef.current.zoom;setMapOpen(false);setAtlasAmount(1)}},[paused,bagOpen,mode]);
 const changeMap=(open:boolean)=>{if(open&&(modeRef.current!=='play'||!ready||paused||bagOpen||world.current.phase==='over'||travel.current?.busy||!!travelStatus))return;animateZoom(open?Math.max(mapCamera().minimum,.7*Math.min(2.5,mapCamera().entry*.5)/mapCamera().entry):.7);if(!open)canvas.current?.focus({preventScroll:true})};
 useEffect(()=>{gamePerformance.setActivity(document.hidden?'background':gameActivity.current,performance.now())},[paused,bagOpen,mapOpen,mode,error,gamePerformance]);
 useEffect(()=>{
  const el=canvas.current;if(!ready||!el)return;
  const controls=attachPlayZoom(el,{enabled:()=>modeRef.current==='play'&&!blockedInput.current&&!travel.current?.busy,getZoom:()=>mapVisible.current?continuousZoom.current:viewRef.current.zoom,minimumZoom:()=>mapCamera().minimum,mapActive:()=>mapVisible.current,animateZoom,onGestureEnd:settleZoom,setZoom:zoom=>{cancelAnimationFrame(zoomAnimation.current);applyContinuousZoom(zoom)},onPinchStart:()=>{cancelAnimationFrame(zoomAnimation.current);touchInput.current={x:0,y:0}}});
  playZoomInput.current=controls;return()=>{controls.dispose();if(playZoomInput.current===controls)playZoomInput.current=null};
 },[ready]);
 const dodge=()=>{if(blockedInput.current||modeRef.current!=='play'||travel.current?.busy)return false;const k=keys.current;return dodgePlayer(world.current,{x:Number(k.has('d')||k.has('arrowright'))-Number(k.has('a')||k.has('arrowleft'))+touchInput.current.x,y:Number(k.has('s')||k.has('arrowdown'))-Number(k.has('w')||k.has('arrowup'))+touchInput.current.y})};
 const spawnEnemies=async(kind:SpawnKind,count:number)=>{
  const w=world.current,r=renderer.current,el=canvas.current;
  if(modeRef.current!=='play'||!ready||!r||!el)return 'Start Play to spawn enemies.';
  if(travel.current?.busy)return 'Wait until you arrive before spawning enemies.';
  clearInput();await r.warmImages(spawnImages(kind));
  if(world.current!==w||renderer.current!==r||modeRef.current!=='play'||travel.current?.busy)return 'Spawn cancelled because the map or Play session changed.';
  const c=editorCamera(el.width,el.height,w,viewRef.current),result=spawnPlayCreature(w,kind,count,{x:c.x,y:c.y,width:el.width/c.scale,height:el.height/c.scale});
  if(result.spawned&&mobile)setMonitorOpen(false);
  el.focus({preventScroll:true});return result.message;
 };
 const toggleWeather=(kind:WeatherKind)=>{const next={...weatherOptionsRef.current,[kind]:!(weatherOptionsRef.current[kind]&&(kind!=='heavyRain'||weatherOptionsRef.current.rain))};if(kind==='heavyRain'&&next.heavyRain)next.rain=true;weatherOptionsRef.current=next;setWeatherOptions(next);rememberWeather(next);const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;setWorldWeather(world.current,next,reduced);if(editSession.current)setWorldWeather(editSession.current.world,next,reduced)};
 const testStrike=()=>{if(world.current.scene?.weather==='sheltered'||world.current.scene?.lighting==='baked'){show('Return outside to test a lightning strike.');return}if(!weatherOptionsRef.current.lightning)toggleWeather('lightning');triggerLightning(world.current);};
 const toggleTimeOfDay=()=>{const next=timeOfDayRef.current==='day'?'night':'day';timeOfDayRef.current=next;setTimeOfDay(next);rememberTimeOfDay(next);setWorldTimeOfDay(world.current,next);if(editSession.current)setWorldTimeOfDay(editSession.current.world,next,true)};
 const bindTravel=(w:World)=>{
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(w.cycle){if(w.weather)w.weather.reducedMotion=reduced}else{setWorldTimeOfDay(w,timeOfDayRef.current,true);setWorldWeather(w,weatherOptionsRef.current,reduced)}
  travel.current?.dispose();travel.current=null;setTravelStatus('');setActiveLocation(sceneName(w));
  if(!mapResources.current)return;
  travel.current=new SceneTravel(w,mapResources.current,next=>{
   mapZooms.current.set(sceneId(world.current),viewRef.current.zoom);
   world.current=next;clearInput();setNearbyChest(null);setBonfireAction(null);setActiveLocation(sceneName(next));
   updateView({x:next.player.x,y:next.player.y,follow:true,zoom:modeRef.current==='play'?clampPlayZoom(viewRef.current.zoom):mapZooms.current.get(sceneId(next))??1});
  },setTravelStatus);
 };
 const backToCamp=()=>{if(travel.current){world.current=travel.current.returnToCamp();world.current.layout=layoutRef.current;setActiveLocation('Camp')}};
 const wholeMap=()=>{const size=sceneSize(world.current),el=canvas.current;if(!el)return;const width=el.width||el.clientWidth,height=el.height||el.clientHeight,base=Math.max(width/1800,height/900);updateView({x:size.left+size.width/2,y:size.top+size.height/2,follow:false,zoom:Math.max(.06,Math.min(2,Math.min(width/size.width,height/size.height)/base*.95))})};
 const setRoute=(hash:string)=>window.history.replaceState(null,'',hash);
 const cancelModePreparation=()=>{modeRequest.current++;setPreparingMode(null)};
 const prepareMode=async(next:'walk'|'play')=>{
  const r=renderer.current;if(!ready||!r||tierBusyRef.current||terrainBusy)return false;
  const request=++modeRequest.current;setPreparingMode(next);clearInput();
  try{await prepareEditorMovement(r,layoutRef.current);return request===modeRequest.current&&renderer.current===r&&!blockedInput.current&&!tierBusyRef.current}
  catch{if(request===modeRequest.current&&renderer.current===r)show('Movement artwork could not load. Your editor is ready; press Walk or Play to retry.');return false}
  finally{if(request===modeRequest.current&&renderer.current===r)setPreparingMode(null)}
 };
 const saveRun=()=>{if(modeRef.current!=='play'||saveBlocked.current||!travel.current)return;try{const text=encodeRun(travel.current);if(text){localStorage.setItem(RUN_SAVE_KEY,text);setSaveNotice('')}}catch{setSaveNotice('Progress could not be saved on this device. Free some storage and try again.')}};
 saveRunRef.current=saveRun;
 const stopPlay=()=>{
  saveRun();
  gamePerformance.stop(performance.now(),'Left Play mode');
  cancelModePreparation();
  const saved=editSession.current;if(!saved)return;
  clearInput();world.current=saved.world;world.current.layout=layoutRef.current;editSession.current=null;bindTravel(world.current);
  modeRef.current='edit';setMode('edit');setPaused(false);setToolsOpen(false);
  updateView({...saved.view,playing:false});setLibraryOpen(saved.libraryOpen);setInspectorOpen(saved.inspectorOpen);setAxeEquipped(world.current.player.equipped==='axe');setRoute('#editor');
 };
 const restoreSurvival=async()=>{
  setPaused(true);clearInput();
  saveBlocked.current=false;setSaveNotice('');let snapshot:ReturnType<typeof decodeRun>|undefined;
  try{const text=localStorage.getItem(RUN_SAVE_KEY);if(text)snapshot=decodeRun(text)}catch(e){saveBlocked.current=true;setSaveNotice(`${(e as Error).message} Your existing save has been kept. Choose New Survival run to replace it.`)}
  const session=snapshot?.worlds.find(([id])=>id==='camp')?.[1]??createCampPlaySession(layoutRef.current,undefined,'survival');
  // Keep the stored scene intact while its camp artwork and interior load.
  if(snapshot)saveBlocked.current=true;
  clearInput();world.current=session;bindTravel(session);
  if(snapshot&&travel.current)try{await prepareSavedCampArtwork(snapshot,sources=>renderer.current!.loadImages(sources));await travel.current.restore(snapshot);saveBlocked.current=false}catch(e){saveBlocked.current=true;setSaveNotice(`Could not reopen the saved location: ${(e as Error).message}. Your save has been kept.`)}
  await renderer.current?.prepareGameplay(world.current);
  setPaused(document.hidden||saveBlocked.current||world.current.phase==='over');setAxeEquipped(true);
  updateView({playing:true,follow:true,zoom:1,x:world.current.player.x,y:world.current.player.y});
  saveRun();
 };
 const startPlay=async()=>{
  if(!ready||tierBusyRef.current||terrainBusy||modeRef.current==='play')return;
  if(!await prepareMode('play'))return;
  cancelGesture();cancelPlace();backToCamp();
  try{
   editSession.current={world:world.current,view:{...viewRef.current},libraryOpen,inspectorOpen};
   modeRef.current='play';setMode('play');await restoreSurvival();
   setLibraryOpen(false);setInspectorOpen(false);setAskClear(false);setToolsOpen(false);setMonitorOpen(false);setPanTool(false);setAssetBrowser(false);setHelpOpen(false);setCollisionEdit(null);setMessage('');
   setRoute('#game');canvas.current?.focus({preventScroll:true});
  }catch(e){stopPlay();show((e as Error).message);setRoute('#editor')}
 };
 const restartPlay=()=>{gamePerformance.stop(performance.now(),'New Survival run');try{clearInput();world.current=createCampPlaySession(layoutRef.current,undefined,'survival');bindTravel(world.current);saveBlocked.current=false;setSaveNotice('');setPaused(false);setAxeEquipped(true);updateView({playing:true,follow:true,zoom:1,x:world.current.player.x,y:world.current.player.y});saveRun();canvas.current?.focus({preventScroll:true})}catch(e){show((e as Error).message)}};
 const openSandbox=()=>{saveRun();clearInput();world.current=createCampPlaySession(layoutRef.current);bindTravel(world.current);setSaveNotice('Sandbox changes do not replace your Survival save. Spawn tools are in this menu.');setPaused(true);updateView({playing:true,follow:true,zoom:1,x:world.current.player.x,y:world.current.player.y})};
 const pauseGame=()=>{clearInput();gamePerformance.setActivity('paused',performance.now());setPaused(true);saveRun()};
 const resumeGame=async()=>{
  const w=world.current,r=renderer.current;if(!r||w.phase==='over'||saveBlocked.current&&w.progression)return;
  try{await r.prepareGameplay(w);if(world.current!==w||renderer.current!==r||modeRef.current!=='play'||document.hidden)return;clearInput();gamePerformance.setActivity('playing',performance.now());setPaused(false);canvas.current?.focus({preventScroll:true})}
  catch{if(world.current===w&&renderer.current===r)setSaveNotice('Could not resume yet. Check your connection and try again.')}
 };
 useEffect(()=>{const save=()=>saveRunRef.current(),hidden=()=>{if(document.hidden){save();if(modeRef.current==='play'){clearInput();setPaused(true)}}};const timer=setInterval(save,15000);window.addEventListener('pagehide',save);window.addEventListener('beforeunload',save);document.addEventListener('visibilitychange',hidden);return()=>{save();clearInterval(timer);window.removeEventListener('pagehide',save);window.removeEventListener('beforeunload',save);document.removeEventListener('visibilitychange',hidden)}},[]);
 const startPerformanceRecording=()=>{if(world.current.phase==='over'||saveBlocked.current&&world.current.progression)return;const el=canvas.current;gamePerformance.start(performance.now(),{platform:'web',userAgent:navigator.userAgent,pixelRatio:window.devicePixelRatio,renderer:el?.dataset.skiaBackend||'unknown',buffer:{width:el?.width,height:el?.height},worldUpdatedAt:layoutRef.current.updatedAt,overlayEnabled:gamePerformance.overlay});resumeGame()};
 const switchMode=async(m:'edit'|'walk')=>{
  if(m==='edit')cancelModePreparation();else if(!await prepareMode('walk'))return;
  if(modeRef.current==='play')stopPlay();
  if(m==='edit'){backToCamp();world.current.treeChops=undefined;}
  cancelGesture();modeRef.current=m;setMode(m);cancelPlace();clearInput();setPanTool(false);setAskClear(false);setToolsOpen(false);
  if(m==='walk'){setLibraryOpen(false);setInspectorOpen(false)}
  updateView({playing:false,follow:m==='walk',...((m==='walk'||viewRef.current.follow)?{x:world.current.player.x,y:world.current.player.y}:{}),...(m==='walk'?{zoom:1}:{})});setRoute('#editor');
 };
 const openAssetLibrary=(id?:string,add=false)=>{cancelModePreparation();cancelGesture();clearInput();setAssetFocus(id);setAssetView(add?'misc':'art');setAssetBrowser(true);setAskClear(false);setToolsOpen(false);setRoute('#checklist')};
 const refreshArtwork=async()=>{invalidateLayoutViews();invalidateScenePortals(world.current);invalidateScenePortals({layout:layoutRef.current} as World);if(editSession.current)invalidateScenePortals(editSession.current.world);invalidateLayoutCollision(layoutRef.current);if(world.current.layout)invalidateLayoutCollision(world.current.layout);if(editSession.current?.world.layout)invalidateLayoutCollision(editSession.current.world.layout);setAssetVersion(n=>n+1);try{await renderer.current?.loadImages(requiredImages(layoutRef.current.items.map(p=>p.assetId),layoutRef.current.terrainImage))}catch{show('Some artwork could not refresh. Reopen the library to retry.')}};
 const closeAssetLibrary=()=>{setAssetBrowser(false);setRoute(modeRef.current==='play'?'#game':'#editor');void refreshArtwork()};
 const focusObject=(p:Placement)=>{cancelModePreparation();setToolsOpen(false);if(modeRef.current==='play')stopPlay();backToCamp();const b=placementBounds(p);select(p.id);updateView({x:b.x+b.width/2,y:b.y+b.height/2,zoom:.85,follow:false});setMode('edit');modeRef.current='edit';setInspectorOpen(true);if(mobile)setLibraryOpen(false)};
 modeActions.current={start:startPlay,stop:()=>{if(modeRef.current==='play')stopPlay();else switchMode('edit')},library:()=>openAssetLibrary()};
 useEffect(()=>{if(!helpOpen)return;const el=helpDialog.current;el?.showModal();return()=>el?.close()},[helpOpen]);
 useEffect(()=>{if(!assetBrowser)return;const el=libraryDialog.current;el?.showModal();return()=>el?.close()},[assetBrowser]);
 useEffect(()=>{const route=()=>{if(location.hash==='#checklist'){modeActions.current?.library();return}setAssetBrowser(false);if(location.hash==='#game'){if(ready)modeActions.current?.start()}else if(ready)modeActions.current?.stop()};route();window.addEventListener('hashchange',route);return()=>window.removeEventListener('hashchange',route)},[ready]);

 const undo=(redo=false)=>{if(modeRef.current==='play')return;const from=redo?future.current:history.current,to=redo?history.current:future.current,last=from.pop();if(last){to.push(layoutRef.current);setCurrent(last,false);select(null);setHistoryTick(n=>n+1)}};
 const toggleLock=()=>{if(selectedItem){cancelGesture();editItem(selectedItem.id,{locked:!selectedItem.locked})}};
 const rotateSelected=(degrees:number)=>{if(selectedItem&&!selectedItem.locked)editItem(selectedItem.id,{rotation:normalizeRotation(degrees)})};
 const nudgeSelected=(dx:number,dy:number)=>{
  if(!ready||modeRef.current!=='edit')return;
  cancelGesture();
  const p=layoutRef.current.items.find(item=>item.id===viewRef.current.selected);if(!p||p.locked)return;
  // Fine positioning bypasses grid snapping and preserves fractional coordinates.
  const {x,y}=boundPlacementPoint({x:p.x+dx,y:p.y+dy},p.assetId,layoutRef.current);
  if(x!==p.x||y!==p.y)editItem(p.id,{x,y});
 };
 const changeLayer=(value:number)=>{if(!selectedItem||!Number.isFinite(value))return;cancelGesture();const layer=Math.max(-10000,Math.min(10000,Math.trunc(value)));editItem(selectedItem.id,{layer:layer===0?undefined:layer})};
 const overlappingItems=overlapIds.map(id=>layout.items.find(p=>p.id===id)).filter((p):p is Placement=>!!p);
 const selectUnderneath=()=>{if(overlappingItems.length<2)return;const index=overlappingItems.findIndex(p=>p.id===selected);const next=overlappingItems[(index+1)%overlappingItems.length];select(next.id,overlappingItems.map(p=>p.id));show('Selected '+(ASSET_BY_ID.get(next.assetId)?.name||'asset')+'. Drag it to move, or open Object settings.')};
 const remove=(id:string|null=viewRef.current.selected)=>{
  if(!id)return;
  const item=layoutRef.current.items.find(p=>p.id===id);if(!item)return;
  const name=ASSET_BY_ID.get(item.assetId)?.name||'asset';
  if(item.locked&&!window.confirm('Remove locked asset “'+name+'” from this world? You can Undo afterwards.'))return;
  // Finish/cancel any captured drag before recording the removal so a later
  // pointer cancellation cannot restore the deleted object behind the panel.
  cancelGesture();cancelPlace();keys.current.clear();touchInput.current={x:0,y:0};sprint.reset();attackHeld.current=false;clearAttackQueue(world.current);
  setCurrent({...layoutRef.current,items:layoutRef.current.items.filter(p=>p.id!==id)});select(null);if(mobile)setInspectorOpen(false);setCollisionEdit(null);show(name+' removed from this draft. Undo restores it.');
 };
 const duplicate=()=>{if(layoutRef.current.items.length>=MAX_LAYOUT_ITEMS){show(`This world is at the ${MAX_LAYOUT_ITEMS}-object limit.`);return}const p=layoutRef.current.items.find(p=>p.id===selected);if(p){const next={...p,locked:false,id:newPlacementId(),...boundPlacementPoint({x:p.x+100,y:p.y+60},p.assetId,layoutRef.current)};setCurrent({...layoutRef.current,items:[...layoutRef.current.items,next]});select(next.id)}};
 const show=(s:string)=>setMessage(s);
 const retryLoading=()=>{cancelModePreparation();if(modeRef.current==='play')stopPlay();backToCamp();setReady(false);setError('');setLoadProgress({loaded:0,total:0,stage:'Opening your saved draft…'});setLoadAttempt(n=>n+1)};
 const loadTerrainDetail=async(r=renderer.current)=>{
  if(!r)return;const detail=editorTerrainDetail(layoutRef.current.terrainImage);if(!Object.keys(detail).length){setTerrainDetail('ready');return}
  setTerrainDetail('loading');
  try{await r.loadImages(detail,p=>{if(renderer.current===r)setDetailProgress(p)},'background');if(renderer.current===r)setTerrainDetail('ready')}
  catch(e){if(renderer.current===r){setTerrainDetail('error');console.warn('Terrain detail will retry on request',e)}}
 };
 useEffect(()=>{const flush=()=>{if(draftHydrated.current)try{persistEditorDraft(layoutRef.current)}catch{}};window.addEventListener('beforeunload',flush);return()=>{flush();window.removeEventListener('beforeunload',flush)}},[]);
 useEffect(()=>{if(!draftHydrated.current)return;const timeout=setTimeout(()=>{try{persistEditorDraft(layout)}catch{setStatus('Local storage full · use Export to keep your draft')}},350);return()=>clearTimeout(timeout)},[layout,ready]);
 useEffect(()=>{
  const audio=new CombatAudio();combatAudio.current=audio;audio.setEnabled(combatSoundEnabled());
  const unlock=()=>{if(modeRef.current==='play')audio.unlock()},settings=()=>{audio.setEnabled(combatSoundEnabled());unlock()};
  document.addEventListener('pointerdown',unlock,true);document.addEventListener('keydown',unlock,true);window.addEventListener('camp-combat-sound',settings);
  return()=>{document.removeEventListener('pointerdown',unlock,true);document.removeEventListener('keydown',unlock,true);window.removeEventListener('camp-combat-sound',settings);audio.dispose();combatAudio.current=null};
 },[]);
 useEffect(()=>{let previous:PlayerSample|undefined;let alive=true,raf=0,last=0,acc=0;const localAt=layoutRef.current.updatedAt,controller=new AbortController();
  const local=draftHydrated.current?{layout:layoutRef.current,raw:JSON.stringify(layoutRef.current),unconfirmedEmpty:false}:initialDraft;
  const resetMeter=()=>{frameMeter.current.reset();gamePerformance.setActivity(document.hidden?'background':gameActivity.current,performance.now());renderer.current?.setActive(!document.hidden);last=0;acc=0};document.addEventListener('visibilitychange',resetMeter);resetMeter();
  const startupTimeout=setTimeout(()=>controller.abort(new Error('Loading took too long. Your draft is safe; please retry.')),90000);
  (async()=>{
   // Fetch renderer code while resolving the saved draft, without editing it.
   const rendererModule=loadingDeadline(import('./skia-web'),45000,controller.signal);void rendererModule.catch(()=>{});
   let ownerCanSave=false;
   let saved:Awaited<ReturnType<typeof fetchWorldLayout>>|undefined;
   try{saved=await fetchWorldLayout()}catch{if(alive)setStatus('Cloud unavailable · local draft is still editable')}
   if(!alive)return;
   const source=saved?resolveEditorDraft(local,saved.draft):offlineEditorDraft(local);
   if(layoutRef.current.updatedAt===localAt){layoutRef.current=source;setLayout(source);world.current={...createWorld(source),editorPreview:true};updateView({x:source.spawn.x,y:source.spawn.y})}
   draftHydrated.current=true;
   if(saved){ownerCanSave=saved.canEdit;revision.current=saved.revision;setCloudLoaded(true);setStatus(initialDraft.unconfirmedEmpty&&source.items.length?'Saved camp restored · all objects loaded':'Draft ready · saved locally as you edit')}
   if(!alive)return;const before=layoutRef.current,dressed=prepareAuthoredWorld(before);if(dressed!==before){setCurrent(dressed);setStatus(dressed.campGardenVersion!==before.campGardenVersion?'Abandoned vegetable patch added beneath the treatment centre':dressed.ironworksVersion!==before.ironworksVersion?'Furnace placed beside the workshop · central clearing opened':dressed.forageVersion!==before.forageVersion?'Wild food added · Pick berries and apples around the woodland':dressed.treeVariantsVersion!==before.treeVariantsVersion?'Tree variety added · matching designs in each grove':dressed.campFringeVersion!==before.campFringeVersion?'Camp foliage softened · natural woodland edges':dressed.worldPlantingVersion!==before.worldPlantingVersion?'World scenery planted · regional groves ready to explore':dressed.woodlandZonesVersion!==before.woodlandZonesVersion?'Woodland zones refined · matching tree groves and foliage':dressed.campRiverVersion!==before.campRiverVersion?'River approach planted · woodland and bank clearings ready':dressed.campOutskirtsVersion!==before.campOutskirtsVersion?'Camp outskirts planted · nearby groves ready to explore':dressed.campPerimeterVersion!==before.campPerimeterVersion?'Circular camp wall installed · six road entrances remain open':dressed.terrainPuddleVersion!==before.terrainPuddleVersion?'Puddles spaced out · camp updated':dressed.terrainFoliageVersion!==before.terrainFoliageVersion?'Woodland refined · inner fire circle cleared':dressed.foliageTrialVersion!==before.foliageTrialVersion?'Fuller woodland leaf patches added around the bonfire · try Walk or Play':'Camp updated · approved camp props added');if(ownerCanSave&&(dressed.campGardenVersion!==before.campGardenVersion||dressed.ironworksVersion!==before.ironworksVersion||dressed.forageVersion!==before.forageVersion||dressed.treeVariantsVersion!==before.treeVariantsVersion||dressed.campFringeVersion!==before.campFringeVersion||dressed.worldPlantingVersion!==before.worldPlantingVersion||dressed.woodlandZonesVersion!==before.woodlandZonesVersion||dressed.campRiverVersion!==before.campRiverVersion||dressed.campOutskirtsVersion!==before.campOutskirtsVersion||dressed.campPerimeterVersion!==before.campPerimeterVersion||dressed.terrainPuddleVersion!==before.terrainPuddleVersion||dressed.terrainFoliageVersion!==before.terrainFoliageVersion||dressed.campCentreVersion!==before.campCentreVersion||dressed.foliageTrialVersion!==before.foliageTrialVersion)){savingRef.current=true;setBusy(true);void saveWorldLayout(layoutRef.current,revision.current,'save').then(result=>{revision.current=result.revision;if(alive)setStatus('Camp update saved · ready to play')}).catch(e=>{if(alive)setStatus('Camp updated locally · '+(e as Error).message)}).finally(()=>{savingRef.current=false;if(alive)setBusy(false)});}}
   const {createWebWorld}=await rendererModule;
   const r=await createWebWorld(canvas.current!,(ctx,atlas,imgs,w)=>drawWorldEditor(ctx,atlas,imgs,w,{...viewRef.current,hideFoliage:modeRef.current!=='play'&&foliageHiddenRef.current},travel.current?.opacity||0),editorEntryArtwork(layoutRef.current),{sources:EDITOR_ENTRY_IMAGES,signal:controller.signal,diagnostics:gamePerformance,onProgress:(stage,p)=>{if(alive)setLoadProgress({stage,loaded:p?.loaded||0,total:p?.total||0})}});
   clearTimeout(startupTimeout);if(!alive){r.dispose();return}renderer.current=r;
   mapResources.current=new SceneResourceCache(SCENES,sources=>r.warmImages(sources),keys=>{const shared=new Set([...Object.keys(EDITOR_IMAGE_SOURCES),...Object.keys(WALKER_IMAGE_SOURCES),...Object.keys(SKITTER_IMAGE_SOURCES),...Object.keys(BRUTE_IMAGE_SOURCES),...Object.keys(HOUND_IMAGE_SOURCES),...Object.keys(BOMBER_IMAGE_SOURCES),...Object.keys(requiredImages(Object.values(ENEMY_TYPES).map(type=>type.assetId))),...Object.keys(editorTerrainDetail()),...Object.keys(requiredImages(layoutRef.current.items.map(p=>p.assetId),layoutRef.current.terrainImage))]);r.releaseImages(keys.filter(key=>!shared.has(key)))});
   outdoorTerrain.current=new OutdoorTerrainStream(sources=>r.warmImages(sources),keys=>r.releaseImages(keys),message=>{if(alive)setOutdoorStatus(message)});
   bindTravel(world.current);
   r.setActive(!document.hidden);
   let lastWorld=world.current,lastTerrainUpdate=-Infinity,lastGameplayUpdate=-Infinity,backgroundStarted=false;
   const frame=(now:number)=>{if(!alive)return;
    if(document.hidden){last=0;acc=0;raf=requestAnimationFrame(frame);return}
    if(now-lastGameplayUpdate>250){r.updateGameplay(world.current,modeRef.current!=='edit');lastGameplayUpdate=now}
    const callbackAt=gamePerformance.recording?performance.now():0;
    const tracked=gamePerformance.beginFrame(now,document.hidden?'background':gameActivity.current),updateStarted=tracked?performance.now():0;
    if(gamePerformance.tracing&&callbackAt-now>=8)gamePerformance.trace(now,'frame-callback-delay',callbackAt-now);
    let simulationSteps=0;
    if(lastWorld!==world.current){previous=undefined;acc=0;lastWorld=world.current;frameMeter.current.reset()}
    if(outdoorTerrain.current){
     world.current.outdoorReady=outdoorTerrain.current.ready;
     if(!world.current.scene&&now-lastTerrainUpdate>200){
      const el=canvas.current!,c=editorCamera(el.width||el.clientWidth,el.height||el.clientHeight,world.current,viewRef.current);
      outdoorTerrain.current.update({x:c.x,y:c.y,width:(el.width||el.clientWidth)/c.scale,height:(el.height||el.clientHeight)/c.scale},world.current.player,usesPaintedHomeTerrain(world.current.layout?.terrainImage));lastTerrainUpdate=now;
     }
    }
    const blocked=blockedInput.current||document.hidden;
    const elapsed=last?Math.min(.1,(now-last)/1000):0;stepCampLighting(world.current,blocked?0:elapsed);stepWeather(world.current,blocked?0:elapsed);
    acc+=blocked?0:elapsed;last=now;
    while(acc>=STEP){const w=world.current,k=keys.current;previous=samplePlayer(w);simulationSteps++;
     const input=modeRef.current==='edit'||mapVisible.current?{x:0,y:0}:{x:Number(k.has('d')||k.has('arrowright'))-Number(k.has('a')||k.has('arrowleft'))+touchInput.current.x,y:Number(k.has('s')||k.has('arrowdown'))-Number(k.has('w')||k.has('arrowup'))+touchInput.current.y};
     if(travel.current?.current!==w)bindTravel(w);
     if(!travel.current?.busy)stepCampPlaySession(w,input,sprint.requested.current,modeRef.current!=='edit'&&attackHeld.current);
     if(modeRef.current==='play'&&w.repairCheckpoint){w.repairCheckpoint=false;saveRunRef.current()}
     if(modeRef.current==='play'&&w.phase==='over'){clearInput();setPaused(true);saveRunRef.current();acc=0;break}
     travel.current?.tick(STEP,modeRef.current!=='edit');acc-=STEP;
     if(world.current!==w){previous=undefined;acc=0;lastWorld=world.current;frameMeter.current.reset();break}
    }
    combatAudio.current?.update(world.current,modeRef.current==='play'&&!blocked&&!travel.current?.busy);
    const drawStarted=performance.now();
    try{r.draw(presentPlayer(world.current,previous,blocked?1:acc/STEP))}catch(e){r.dispose();gamePerformance.stop(performance.now(),'Renderer error');setError('The workspace could not draw the world. Your draft is safe; retry loading.');console.error(e);return}
    const drawMs=performance.now()-drawStarted;
    if(tracked)gamePerformance.endFrame(drawStarted-updateStarted,drawMs,simulationSteps);
    if(gamePerformance.sampleDue(now)){const sampleStarted=performance.now(),el=canvas.current!;gamePerformance.sample(now,performanceWorldContext(world.current,viewRef.current.zoom,r.textureStats(),el.clientWidth,el.clientHeight));gamePerformance.trace(sampleStarted,'context-sample',performance.now()-sampleStarted)}
    if(!backgroundStarted){
     backgroundStarted=true;setReady(true);
     // Entry is complete only after the first useful canvas frame. Keep detail
     // downloads non-blocking; explicit Play/Walk requests promote their jobs.
     void loadTerrainDetail(r);
    }
    frameMeter.current.record(now,drawMs,!document.hidden);raf=requestAnimationFrame(frame)
   };raf=requestAnimationFrame(frame);
  })().catch(e=>{clearTimeout(startupTimeout);controller.abort();if(alive)setError(e instanceof Error?e.message:'The artwork could not load. Please retry.');console.error(e)});
  return()=>{alive=false;modeRequest.current++;document.removeEventListener('visibilitychange',resetMeter);frameMeter.current.reset();clearTimeout(startupTimeout);controller.abort();cancelAnimationFrame(raf);travel.current?.dispose();travel.current=null;mapResources.current?.dispose();mapResources.current=null;outdoorTerrain.current?.dispose();outdoorTerrain.current=null;renderer.current?.dispose();renderer.current=undefined};
 },[loadAttempt]);
 useEffect(()=>{if(ready)void renderer.current?.loadImages(editorEntryArtwork(layoutRef.current)).catch(()=>show('A saved image could not load. Reload to retry.'))},[ready,layout.terrainImage?.url]);
 useEffect(()=>{if(ready)void loadTerrainDetail()},[layout.terrainImage?.url]);
 useEffect(()=>{
  const editing=(e:KeyboardEvent)=>['INPUT','SELECT','TEXTAREA'].includes((e.target as HTMLElement)?.tagName)||(e.target as HTMLElement)?.isContentEditable;
  const down=(e:KeyboardEvent)=>{
   if(editing(e)||collisionEdit||assetBrowser)return;
   const k=e.key.toLowerCase();
   if(k==='escape'){e.preventDefault();if(e.repeat)return;if(mapOpen){changeMap(false);return}if(world.current.stationPanel){world.current.stationPanel=undefined;clearInput();return}if(bagOpen){changeBag(false);return}if(helpOpen){setHelpOpen(false);return}if(askClear){setAskClear(false);return}if(mobile&&toolsOpen){closeTools();return}if(mobile&&modeRef.current==='play'&&monitorOpen){setMonitorOpen(false);return}if(mobile&&(libraryOpen||inspectorOpen)){setLibraryOpen(false);setInspectorOpen(false);return}if(modeRef.current==='play'){clearInput();setPaused(v=>world.current.phase==='over'||!v);return}cancelPlace();select(null);if(mobile)setLibraryOpen(false);return}
   if(k==='m'&&modeRef.current==='play'&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();if(!e.repeat)changeMap(!mapOpen);return}
   if(blockedInput.current||mapVisible.current)return;
   if(k==='f5'){e.preventDefault();if(!e.repeat){if(modeRef.current==='play')stopPlay();else startPlay()}return}
   if((e.ctrlKey||e.metaKey)&&k==='s'){e.preventDefault();if(modeRef.current!=='play')void save();return}
   if(modeRef.current!=='edit'){
    if(modeRef.current==='play'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&['1','2','3','4','5','6'].includes(k)){e.preventDefault();if(!e.repeat&&!travel.current?.busy){attackHeld.current=false;fieldKit.release();selectQuickItem(world.current,(['fists','woodenAxe','axe','meal','rabbitMeal','venisonMeal'] as QuickItem[])[Number(k)-1])}return}
    if(modeRef.current==='play'&&(k===' '||k==='e')){e.preventDefault();if(e.repeat||travel.current?.busy)return;const action=fieldKit.sample(world.current).action;if(fieldKit.press(world.current,action)){attackHeld.current=fieldKit.holdingAttack;if(action.key.startsWith('broken:'))saveRunRef.current()}if(k==='e'&&!fieldKit.holdingRepair){fieldKit.release('primary');attackHeld.current=fieldKit.holdingAttack}return}
    if(modeRef.current==='play'&&k==='r'&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();if(e.repeat||travel.current?.busy)return;const repair=fieldKit.sample(world.current).repairAction;if(repair&&fieldKit.pressRepair(world.current,repair)){attackHeld.current=fieldKit.holdingAttack;if(repair.target?.buildingId==='headquarters')saveRunRef.current()}return}
    if(k==='b'&&modeRef.current==='play'){e.preventDefault();if(!e.repeat)changeBag(true);return}
    if(k==='q'&&modeRef.current==='play'){e.preventDefault();if(!e.repeat)dodge();return}
if(k==='e'){e.preventDefault();if(!e.repeat){const gate=nearbyGate(world.current),id=findNearbyChest();if(gate){if(toggleGate(world.current,gate.id))show(world.current.notice);refreshChest(n=>n+1)}else if(id)openChest(id);else if(modeRef.current==='play')performCampInteraction(world.current);else previewCooking()}return}
    if(k===' '||k==='1'){e.preventDefault();if(k===' '){attackHeld.current=true;if(!e.repeat)requestAttack(world.current);}else if(!e.repeat)equipAxe();return}
    if(k==='shift'){sprint.setShift(true);return}
    if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){e.preventDefault();keys.current.add(k)}return;
   }
   if((e.ctrlKey||e.metaKey)&&k==='z'){e.preventDefault();undo(e.shiftKey);return}
   if(viewRef.current.selected&&['arrowup','arrowdown','arrowleft','arrowright'].includes(k)&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();nudgeSelected(Number(k==='arrowright')-Number(k==='arrowleft'),Number(k==='arrowdown')-Number(k==='arrowup'));return}
   if(k==='delete'||k==='backspace'){e.preventDefault();remove();return}
   if(k==='f'&&selectedItem){e.preventDefault();focusObject(selectedItem);return}
   if(k===' '){e.preventDefault();keys.current.add(k)}
  };
  const up=(e:KeyboardEvent)=>{keys.current.delete(e.key.toLowerCase());if(e.key===' '||e.key.toLowerCase()==='e'){fieldKit.release('primary');attackHeld.current=fieldKit.holdingAttack}if(e.key.toLowerCase()==='r'){fieldKit.release('repair');attackHeld.current=fieldKit.holdingAttack}if(e.key==='Shift')sprint.setShift(false)},blur=()=>{clearInput();cancelGesture()};
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);
  return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur)};
 },[selected,canEdit,collisionEdit,ready,assetBrowser,helpOpen,askClear,mobile,mode,libraryOpen,inspectorOpen,terrainBusy,toolsOpen,monitorOpen,bagOpen,mapOpen,paused,travelStatus]);

 const point=(clientX:number,clientY:number)=>{const el=canvas.current!,r=el.getBoundingClientRect(),c=editorCamera(el.width||r.width,el.height||r.height,world.current,viewRef.current);return{x:c.x+(clientX-r.left)*(el.width/r.width)/c.scale,y:c.y+(clientY-r.top)*(el.height/r.height)/c.scale}};
 const bounded=(p:{x:number;y:number},assetId?:string)=>boundPlacementPoint({x:viewRef.current.grid?Math.round(p.x/20)*20:p.x,y:viewRef.current.grid?Math.round(p.y/20)*20:p.y},assetId,layoutRef.current);
 const ensureArt=async(id:string)=>{await renderer.current?.loadImages(requiredImages([id]))};
 const switchTier=async(tier:number)=>{
  if(!ready||!renderer.current||tierBusyRef.current)return;
  cancelGesture();cancelPlace();const current=layoutRef.current,id=viewRef.current.selected;if(!id)return;
  tierBusyRef.current=true;setTierBusy(true);
  try{const next=await prepareTierChange(current,id,tier,ids=>renderer.current!.loadImages(requiredImages(ids)),()=>layoutRef.current);
   if(next!==current){setCurrent(next);const count=tierTargets(next,id).length;show(count>1?`All ${count} wall pieces switched to tier ${tier}. Their placements are unchanged.`:`${tier===0?'Broken state':'Tier '+tier} selected. Position and dimensions are unchanged.`)}
  }catch(e){show((e as Error).message)}finally{tierBusyRef.current=false;setTierBusy(false)}
 };
 const beginPlace=async(id:string)=>{if(!ready)return;id=wallAssetForLayout(id,layoutRef.current);switchMode('edit');const epoch=placementEpoch.current;try{await ensureArt(id);if(epoch!==placementEpoch.current||modeRef.current!=='edit')return;placingRef.current=id;setPlacing(id);select(null);canvas.current?.focus({preventScroll:true});show(mobile?'Tap the ground to place your asset.':'Click the ground to place. Escape cancels.')}catch{show('This artwork could not load. Try again.')}};
 const place=async(id:string,p:{x:number;y:number})=>{const epoch=placementEpoch.current;id=wallAssetForLayout(id,layoutRef.current);if(layoutRef.current.items.length>=MAX_LAYOUT_ITEMS){show(`This world is at the ${MAX_LAYOUT_ITEMS}-object limit.`);return}try{await ensureArt(id);if(epoch!==placementEpoch.current||modeRef.current!=='edit')return;const matching=wallAssetForLayout(id,layoutRef.current);if(matching!==id){void place(matching,p);return}const next=newPlacement(id,bounded(p,id).x,bounded(p,id).y);setCurrent({...layoutRef.current,items:[...layoutRef.current.items,next]});select(next.id);cancelPlace();show(mobile?'Placed. Drag to move; tap Object for settings.':'Placed. Drag to move, or adjust it in the panel.')}catch{show('This artwork could not load. Try again.')}};
 // Keep captured pointers separate so a second finger cannot move the selected object.
 const freeCamera=()=>{if(viewRef.current.follow){const r=canvas.current!.getBoundingClientRect(),center=point(r.left+r.width/2,r.top+r.height/2);updateView({follow:false,...center})}};
 const down=(e:React.PointerEvent<HTMLCanvasElement>)=>{
  if(!ready||blockedInput.current||modeRef.current==='play')return;if(e.pointerType==='mouse')e.currentTarget.focus({preventScroll:true});
  pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});e.currentTarget.setPointerCapture(e.pointerId);
  if(pointers.current.size===2){
   const g=gesture.current;if(g?.kind==='move'&&g.moved)setCurrent(g.before,false);
   gesture.current=null;freeCamera();const [a,b]=[...pointers.current.values()];
   pinch.current={distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom:viewRef.current.zoom,anchor:point((a.x+b.x)/2,(a.y+b.y)/2)};return;
  }
  if(pointers.current.size!==1||modeRef.current!=='edit')return;
  const p=point(e.clientX,e.clientY),base={start:p,client:{x:e.clientX,y:e.clientY},origin:{x:0,y:0},before:layoutRef.current,pointer:e.pointerId,moved:false};
  if(e.button===1||e.button===2||keys.current.has(' ')||panTool){e.preventDefault();freeCamera();gesture.current={...base,kind:'pan',start:point(e.clientX,e.clientY)};return}
  // Placement waits for release; pinch, pan and cancelled touches never place an object.
  if(viewRef.current.placingSpawn||placingRef.current){gesture.current={...base,kind:'tap'};return}
  const hits=placementHitStack(layoutRef.current.items,p.x,p.y).filter(item=>!foliageHiddenRef.current||!isFoliageAsset(ASSET_BY_ID.get(item.assetId)));
  // A picked lower asset stays draggable even while another image covers it.
  const hit=hits.find(item=>item.id===viewRef.current.selected)||hits[0];
  select(hit?.id||null,hits.map(item=>item.id));freeCamera();
  gesture.current=hit&&!hit.locked?{...base,kind:'move',id:hit.id,start:point(e.clientX,e.clientY),origin:{x:hit.x,y:hit.y}}:{...base,kind:'pan',start:point(e.clientX,e.clientY)};
 };
 const move=(e:React.PointerEvent<HTMLCanvasElement>)=>{
  if(!ready||blockedInput.current)return;if(pointers.current.has(e.pointerId))pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pinch.current){if(pointers.current.size===2){const [a,b]=[...pointers.current.values()],p=pinch.current;updateView({zoom:Math.max(.06,Math.min(2,p.zoom*Math.hypot(a.x-b.x,a.y-b.y)/p.distance))});const at=point((a.x+b.x)/2,(a.y+b.y)/2);updateView({x:viewRef.current.x+p.anchor.x-at.x,y:viewRef.current.y+p.anchor.y-at.y})}return}
  const p=point(e.clientX,e.clientY),g=gesture.current;
  if(g){if(g.pointer!==e.pointerId)return;if(!g.moved&&Math.hypot(e.clientX-g.client.x,e.clientY-g.client.y)<(e.pointerType==='touch'?6:2))return;g.moved=true;
   if(g.kind==='tap'){if(placingRef.current)updateView({ghost:newPlacement(placingRef.current,bounded(p,placingRef.current).x,bounded(p,placingRef.current).y)});return}
   if(g.kind==='pan'){updateView({follow:false,x:viewRef.current.x+g.start.x-p.x,y:viewRef.current.y+g.start.y-p.y});return}
   editItem(g.id!,bounded({x:g.origin.x+p.x-g.start.x,y:g.origin.y+p.y-g.start.y},g.before.items.find(p=>p.id===g.id)?.assetId),false);
  }else if(placingRef.current&&e.pointerType!=='touch')updateView({ghost:newPlacement(placingRef.current,bounded(p,placingRef.current).x,bounded(p,placingRef.current).y)});
 };
 const up=(e:React.PointerEvent<HTMLCanvasElement>,cancelled=false)=>{
  pointers.current.delete(e.pointerId);
  if(pinch.current){if(!pointers.current.size)pinch.current=null;return}
  const g=gesture.current;if(!g||g.pointer!==e.pointerId)return;gesture.current=null;
  if(g.kind==='move'&&g.moved){if(cancelled)setCurrent(g.before,false);else if(g.before.items.find(p=>p.id===g.id)!==layoutRef.current.items.find(p=>p.id===g.id)){history.current.push(g.before);if(history.current.length>60)history.current.shift();future.current=[];setHistoryTick(n=>n+1)}}
  if(g.kind==='tap'&&!g.moved&&!cancelled){const p=bounded(point(e.clientX,e.clientY),viewRef.current.placingSpawn?undefined:placingRef.current||undefined);if(viewRef.current.placingSpawn){setCurrent({...layoutRef.current,spawn:p});Object.assign(world.current.player,p);cancelPlace()}else if(placingRef.current)void place(placingRef.current,p)}
 };
 useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(''),6500);return()=>clearTimeout(timer)},[message]);
 useEffect(()=>{keys.current.clear();touchInput.current={x:0,y:0};sprint.reset();attackHeld.current=false;clearAttackQueue(world.current);cancelGesture()},[libraryOpen,inspectorOpen,collisionEdit,askClear,assetBrowser,paused,helpOpen]);
 useEffect(()=>{const interrupt=()=>{keys.current.clear();touchInput.current={x:0,y:0};sprint.reset();attackHeld.current=false;clearAttackQueue(world.current);cancelGesture()},hide=()=>{if(document.hidden)interrupt()};window.addEventListener('resize',interrupt);document.addEventListener('visibilitychange',hide);return()=>{window.removeEventListener('resize',interrupt);document.removeEventListener('visibilitychange',hide)}},[]);
 const save=async()=>{if(tierBusyRef.current){show('Wait for tier artwork to finish loading before saving.');return}if(savingRef.current)return;
  if(!canEdit){show('Sign in as the site owner to save to the site. Your local draft is kept.');return}
  const draft=layoutRef.current,check=validateLayout(draft);if(check.errors.length){show(check.errors.join(' '));return}
  savingRef.current=true;setBusy(true);
  try{const result=await saveWorldLayout(draft,revision.current,'save');revision.current=result.revision;
   if(layoutRef.current===draft){const saved={...draft,updatedAt:result.updatedAt};layoutRef.current=saved;setLayout(saved);if(modeRef.current!=='play'&&!world.current.scene)world.current.layout=saved;persistEditorDraft(saved);setStatus('Saved to site · '+new Date(result.updatedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}))}
   else setStatus('Earlier changes saved · newer edits on this device');show('World saved. Play always uses your current draft.');
  }catch(e){show((e as Error).message)}finally{savingRef.current=false;setBusy(false)}
 };

 const exportDraft=()=>{const blob=new Blob([JSON.stringify(layoutRef.current,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='camp-world.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 const importDraft=async(file:File)=>{const epoch=placementEpoch.current,previous=layoutRef.current;if(file.size>MAX_LAYOUT_BYTES){show('Layout file is too large.');return}try{const {layout:next,errors}=validateLayout(JSON.parse(await file.text()));if(!next||errors.length)throw Error(errors.join(' '));await renderer.current?.loadImages(requiredImages(next.items.map(p=>p.assetId),next.terrainImage));if(epoch!==placementEpoch.current||modeRef.current==='play'||previous!==layoutRef.current)throw Error('The world changed while the import loaded. Please import again.');setCurrent(next);select(null);world.current.player.x=next.spawn.x;world.current.player.y=next.spawn.y;updateView({x:next.spawn.x,y:next.spawn.y});show('World imported. Press Play to try it.')}catch(e){show('Could not import: '+(e as Error).message)}};

 const replaceTerrain=async(file:File)=>{
  if(!canEdit||terrainBusy)return;
  setTerrainBusy(true);
  try{const prepared=await prepareTerrainUpload(file);
   setTerrainProgress('Uploading background…');
   const response=await fetch('/api/world-terrain',{method:'POST',headers:{'Content-Type':prepared.type,'X-File-Name':encodeURIComponent(prepared.name),'X-File-Size':String(prepared.size)},body:prepared});const data=await response.json();if(!response.ok)throw Error(data.error||'Terrain upload failed');const image=data as ArtworkFile;
   await renderer.current?.loadImages(requiredImages([],image));setCurrent({...layoutRef.current,terrainImage:image,terrainBorder:image.width===HOME_TERRAIN.fullSize&&image.height===HOME_TERRAIN.fullSize?HOME_TERRAIN.border:0});
   show('Background replaced. Objects stay in place. Press Play to try it.');
  }catch(e){show((e as Error).message)}finally{setTerrainBusy(false);setTerrainProgress('')}
 };
 const nudgeControls=selectedItem&&<div className="we-nudge" role="group" aria-label="Move selected asset one pixel"><span>Move 1 px</span><button type="button" disabled={!!selectedItem.locked||!ready} aria-label="Move selected asset left by 1 pixel" onClick={()=>nudgeSelected(-1,0)}><ArrowLeft size={20}/></button><button type="button" disabled={!!selectedItem.locked||!ready} aria-label="Move selected asset up by 1 pixel" onClick={()=>nudgeSelected(0,-1)}><ArrowUp size={20}/></button><button type="button" disabled={!!selectedItem.locked||!ready} aria-label="Move selected asset down by 1 pixel" onClick={()=>nudgeSelected(0,1)}><ArrowDown size={20}/></button><button type="button" disabled={!!selectedItem.locked||!ready} aria-label="Move selected asset right by 1 pixel" onClick={()=>nudgeSelected(1,0)}><ArrowRight size={20}/></button></div>;
 const objectLayers=selectedItem&&<section className="we-layers" aria-label="Asset layers">
  <label>Layer order<input aria-label="Asset layer order" type="number" min="-10000" max="10000" step="1" value={selectedItem.layer??0} onChange={e=>changeLayer(Number(e.target.value))}/></label>
  <div className="we-layer-actions"><button onClick={()=>changeLayer(Math.min(0,...layout.items.filter(p=>p.id!==selectedItem.id).map(p=>p.layer??0))-1)}><Layers size={17}/>Send to back</button><button onClick={()=>changeLayer(Math.max(0,...layout.items.filter(p=>p.id!==selectedItem.id).map(p=>p.layer??0))+1)}><Layers size={17}/>Bring to front</button></div>
  <button onClick={()=>changeLayer(0)}>Reset to automatic depth</button>
  <p>Higher layers appear in front. Layer 0 uses normal world depth. Layer changes are saved with your layout.</p>
  {overlappingItems.length>1&&<div className="we-overlap-picker"><strong>Overlapping assets</strong><p>Choose an asset underneath without moving the others.</p><button onClick={selectUnderneath}><Layers size={17}/>Select underneath</button>{overlappingItems.map(p=><button key={p.id} aria-pressed={p.id===selectedItem.id} onClick={()=>{select(p.id,overlappingItems.map(item=>item.id));setInspectorOpen(true)}}><span>{ASSET_BY_ID.get(p.assetId)?.name||'Asset'}<small>Object {layout.items.findIndex(item=>item.id===p.id)+1} · Layer {p.layer??0}{p.locked?' · Locked':''}</small></span></button>)}</div>}
 </section>;
 const terrain=usesPaintedHomeTerrain(layout.terrainImage)?undefined:layout.terrainImage,terrainUrl=terrain?.url||HOME_TERRAIN.image;
 const availableAssets=libraryAssets(WORLD_ASSETS);
 const groups=[...new Set(availableAssets.map(a=>a.group))].sort();const filtered=availableAssets.filter(a=>(group==='all'||a.group===group)&&(!onlyPlaced||layout.items.some(p=>p.assetId===a.id||wallAssetForLayout(a.id,layout)===p.assetId))&&(!search||(a.name+' '+a.group).toLowerCase().includes(search.toLowerCase())));

 const sceneItems=useMemo(()=>libraryOpen&&libraryTab==='scene'&&mode!=='play'?layout.items.map((p,index)=>({p,index})).filter(({p})=>(ASSET_BY_ID.get(p.assetId)?.name||'Asset').toLowerCase().includes(sceneSearch.toLowerCase())):[],[layout,sceneSearch,libraryOpen,libraryTab,mode,assetVersion]);
 const objectInspector=selectedItem&&selectedAsset&&mode==='edit'&&<aside id="we-inspector" className="we-inspector" aria-label="Object settings" onPointerDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}><header><span>OBJECT INSPECTOR</span><button className="we-icon" aria-label="Close inspector" onClick={()=>setInspectorOpen(false)}><X size={17}/></button></header><div className="we-inspector-body"><h2>{selectedAsset.name}</h2><p>{selectedAsset.note}</p><div className="studio-inspector-links"><button onClick={()=>focusObject(selectedItem)}><LocateFixed size={16}/>Focus</button><button onClick={()=>openAssetLibrary(selectedItem.frame?.sourceAssetId||selectedItem.assetId)}><LibraryBig size={16}/>Library asset</button></div>{selectedAsset.openFrames?.length&&<button disabled={!ready} onClick={()=>openChest(selectedItem.id)} aria-pressed={chestIsOpen(world.current,selectedItem.id)}>{chestIsOpen(world.current,selectedItem.id)?'Close storage chest':'Open storage chest'}</button>}<button aria-pressed={!!selectedItem.locked} onClick={toggleLock}>{selectedItem.locked?<Unlock size={18}/>:<Lock size={18}/>}{selectedItem.locked?'Unlock asset':'Lock asset'}</button>{selectedItem.locked&&<p>Locked in place. Unlock to move, rotate, flip or resize. Removing a locked asset asks for confirmation.</p>}<WorldTierControls layout={layout} placement={selectedItem} pending={tierBusy} disabled={!ready||busy} onChange={tier=>void switchTier(tier)}/><details className="studio-section"><summary>Layers & overlapping objects</summary>{objectLayers}</details><details className="studio-section" open><summary>Transform</summary><div className="we-coordinates"><label>X<input disabled={!!selectedItem.locked} type="number" value={Math.round(selectedItem.x)} min={placementLimits(selectedItem.assetId,ASSET_BY_ID,layout).left} max={placementLimits(selectedItem.assetId,ASSET_BY_ID,layout).right} onChange={e=>editItem(selectedItem.id,bounded({x:Number(e.target.value),y:selectedItem.y},selectedItem.assetId))}/></label><label>Y<input disabled={!!selectedItem.locked} type="number" value={Math.round(selectedItem.y)} min={placementLimits(selectedItem.assetId,ASSET_BY_ID,layout).top} max={placementLimits(selectedItem.assetId,ASSET_BY_ID,layout).bottom} onChange={e=>editItem(selectedItem.id,bounded({x:selectedItem.x,y:Number(e.target.value)},selectedItem.assetId))}/></label></div>{nudgeControls}<div className="we-rotation"><label>Rotation (degrees)<input aria-label="Asset rotation in degrees" disabled={!!selectedItem.locked} type="number" min="0" max="360" step="1" value={selectedItem.rotation||0} onChange={e=>rotateSelected(Number(e.target.value))}/></label><div><button disabled={!!selectedItem.locked} aria-label="Rotate 1 degree anticlockwise" onClick={()=>rotateSelected((selectedItem.rotation||0)-1)}><RotateCcw size={18}/>1°</button><button disabled={!!selectedItem.locked} aria-label="Rotate 1 degree clockwise" onClick={()=>rotateSelected((selectedItem.rotation||0)+1)}><RotateCw size={18}/>1°</button><button disabled={!!selectedItem.locked} onClick={()=>rotateSelected(0)}>Reset</button></div></div><div className="we-flip"><button disabled={!!selectedItem.locked} aria-pressed={!!selectedItem.flipX} onClick={()=>editItem(selectedItem.id,{flipX:!selectedItem.flipX})}><FlipHorizontal2 size={18}/>Flip horizontal</button><button disabled={!!selectedItem.locked} aria-pressed={!!selectedItem.flipY} onClick={()=>editItem(selectedItem.id,{flipY:!selectedItem.flipY})}><FlipVertical2 size={18}/>Flip vertical</button></div><label>Size <b>{Math.round(selectedItem.scale*100)}%</b><input disabled={!!selectedItem.locked} type="range" min="0.25" max="3" step="0.05" value={selectedItem.scale} onChange={e=>editItem(selectedItem.id,{scale:Number(e.target.value)})}/></label></details><details className="studio-section" open={!mobile}><summary>Collision & appearance</summary><label>Game role<select value={selectedItem.role} onChange={e=>editItem(selectedItem.id,{role:e.target.value as WorldRole})}>{Object.entries(ROLE_LABELS).filter(([id])=>['prop','hearth','well'].includes(id)||id===selectedItem.role).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label className="we-check"><input type="checkbox" checked={selectedItem.solid} onChange={e=>editItem(selectedItem.id,{solid:e.target.checked})}/>Blocks movement</label><label className="we-check"><input type="checkbox" checked={(selectedItem.allowTransparency??selectedGeometry!.allowTransparency)!==false} onChange={e=>editItem(selectedItem.id,{allowTransparency:e.target.checked})}/>Allow automatic transparency</label><p>Applies only to this placed copy, including its roof.</p>{selectedItem.allowTransparency!==undefined&&<button onClick={()=>editItem(selectedItem.id,{allowTransparency:undefined})}>Use library transparency setting</button>}{selectedAsset.roof&&<label>Roof<select value={selectedItem.roof} onChange={e=>editItem(selectedItem.id,{roof:e.target.value as Placement['roof']})}><option value="auto">Hide when worker is inside</option><option value="hidden">Always hidden</option><option value="shown">Always visible</option></select></label>}<button className="we-collision-edit" disabled={['scrap','fuel','pallets','animal','enemySpawn'].includes(selectedItem.role)} title="Pickups and spawn markers are non-blocking. Use a prop or structure role to draw blockers." onClick={()=>{keys.current.clear();touchInput.current={x:0,y:0};sprint.reset();attackHeld.current=false;clearAttackQueue(world.current);cancelPlace();setCollisionEdit(selectedItem)}}><Shield size={17}/>Edit collision lines</button><p>{selectedItem.collision?'Custom blockers for this placed object.':'Uses the asset’s default blockers.'} Changes move, rotate, flip and scale with the image.</p>{!selectedItem.collision&&!selectedGeometry!.collision&&!selectedGeometry!.interior&&selectedItem.solid&&<details><summary>Adjust ground footprint</summary><p>Only the footprint blocks walking.</p><div className="we-coordinates"><label>Width<input aria-label="Collision width" type="number" min="4" max="1500" value={selectedItem.footprint?.width||Math.round((selectedGeometry!.body[0]?.hw||20)*2)} onChange={e=>editItem(selectedItem.id,{footprint:{width:Math.max(4,Math.min(1500,Number(e.target.value))),depth:selectedItem.footprint?.depth||(selectedGeometry!.body[0]?.hh||20)*2}})}/></label><label>Depth<input aria-label="Collision depth" type="number" min="4" max="1500" value={selectedItem.footprint?.depth||Math.round((selectedGeometry!.body[0]?.hh||20)*2)} onChange={e=>editItem(selectedItem.id,{footprint:{width:selectedItem.footprint?.width||(selectedGeometry!.body[0]?.hw||20)*2,depth:Math.max(4,Math.min(1500,Number(e.target.value)))}})}/></label></div><button onClick={()=>editItem(selectedItem.id,{footprint:undefined})}>Reset footprint</button></details>}</details></div><div className="we-object-actions"><button onClick={duplicate}><Copy size={17}/>Duplicate</button><button type="button" className="we-danger" aria-label="Remove selected asset" onClick={()=>remove(selectedItem.id)}><Trash2 size={17}/>Remove</button></div></aside>;
 const terrainPanel=<div className="we-world-settings" hidden={libraryTab!=='world'}><label className="studio-world-name">World name<input aria-label="World name" maxLength={80} value={layout.name} onChange={e=>setCurrent({...layoutRef.current,name:e.target.value})}/></label><section className="we-terrain" aria-label="World background"><div className="we-terrain-preview"><img src={terrainUrl} alt="Current world terrain"/><div><strong>World background</strong><small>{terrain?.name||'Camp + woodland trails'}</small><small>{terrain?.width||OUTDOOR_SOURCE_SIZE.width} × {terrain?.height||OUTDOOR_SOURCE_SIZE.height} px</small>{!terrain&&<small>Continuous ground · camp, village and works</small>}</div></div><div className="we-terrain-actions"><a href={terrain?terrainUrl+'?download=1':HOME_TERRAIN.fullImage} download={terrain?.name||'painted-home-terrain-4800.webp'}><Download size={15}/>{terrain?'Download':'Camp image'}</a><label className="we-terrain-replace" data-disabled={!canEdit||!ready||terrainBusy}><Upload size={15}/><span>{terrainBusy?terrainProgress||'Preparing…':'Replace'}</span><input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Replace world background image" disabled={!canEdit||!ready||terrainBusy} onChange={e=>{const chosen=e.target.files?.[0];e.target.value='';if(chosen)void replaceTerrain(chosen)}}/></label></div><small>PNG, JPEG or WebP · up to 32 MP and 64 MB. Original resolution is kept. Buildings stay in place.</small>{terrain?.width===HOME_TERRAIN.fullSize&&terrain.height===HOME_TERRAIN.fullSize&&<label className="we-terrain-border"><input type="checkbox" checked={layout.terrainBorder===HOME_TERRAIN.border} disabled={terrainBusy} onChange={e=>setCurrent({...layoutRef.current,terrainBorder:e.target.checked?HOME_TERRAIN.border:0})}/>Image includes 600 px outer scenery border</label>}{terrain&&<button className="we-terrain-reset" disabled={terrainBusy} onClick={()=>{setCurrent({...layoutRef.current,terrainImage:undefined,terrainBorder:undefined});show('Original background restored in this draft.')}}>Restore original background</button>}</section><button onClick={()=>{switchMode('edit');updateView({placingSpawn:true});setLibraryOpen(!mobile);show('Tap clear ground to set the player start.')}}><MapPin size={17}/>Set player spawn</button><button onClick={()=>updateView({x:layout.spawn.x,y:layout.spawn.y,follow:false,zoom:.8})}><LocateFixed size={17}/>Find spawn</button><EditorAccessNotice access={access}/></div>;
 const controlsAvailable=ready&&!error&&!assetBrowser&&!paused&&!helpOpen&&!collisionEdit&&!askClear;
 const closeTools=()=>{setToolsOpen(false);toolsToggle.current?.focus({preventScroll:true})};
 const toggleTools=()=>{clearInput();setToolsOpen(v=>!v);setAskClear(false);setMonitorOpen(false);setLibraryOpen(false);setInspectorOpen(false)};
 const openPanel=(tab:'scene'|'assets'|'world')=>{setToolsOpen(false);if(modeRef.current==='play')stopPlay();else if(world.current.scene)switchMode('edit');setLibraryTab(tab);setLibraryOpen(true);if(mobile)setInspectorOpen(false)};
 const chooseAsset=(id:string)=>{closeAssetLibrary();if(modeRef.current==='play')stopPlay();void beginPlace(id);if(mobile)setLibraryOpen(false)};
 const locationTools=<span className="studio-location" aria-label="Current map"><MapPin size={15}/>{activeLocation}</span>;
 const weatherTools=<><button className="studio-lighting-toggle" aria-label="Night lighting" aria-pressed={timeOfDay==='night'} title={timeOfDay==='night'?'Switch to day':'Switch to night'} disabled={!ready} onClick={toggleTimeOfDay}>{timeOfDay==='night'?<Moon size={17}/>:<Sun size={17}/>}<span>{timeOfDay==='night'?'Night':'Day'}</span></button><div className="studio-tool-group studio-weather-controls" aria-label="Weather preview">{([{key:'rain',label:'Rain',Icon:CloudRain},{key:'heavyRain',label:'Heavy rain',Icon:CloudRain},{key:'fog',label:'Fog',Icon:CloudFog},{key:'lightning',label:'Lightning',Icon:CloudLightning}] as const).map(({key,label,Icon})=><button key={key} aria-label={label} aria-pressed={key==='heavyRain'?!!weatherOptions.heavyRain&&weatherOptions.rain:!!weatherOptions[key]} title={`${label}: ${weatherOptions[key]&&(key!=='heavyRain'||weatherOptions.rain)?'on — click to turn off':'off — click to turn on'}`} disabled={!ready} onClick={()=>toggleWeather(key)}><Icon size={17}/>{key==='heavyRain'&&<b className="studio-heavy-rain-mark" aria-hidden="true">+</b>}<span>{label}</span></button>)}<button className="studio-test-strike" aria-label="Test lightning strike" title="Trigger a ground strike now (enables Lightning)" disabled={!ready} onClick={testStrike}><CloudLightning size={17}/><span>Test strike</span></button></div></>;
 const modeTools=mode==='play'?<><span className="studio-session-label" data-paused={paused}><i/>{paused?'Paused':'Playing'}</span><button aria-label={paused?'Resume game':'Pause game'} onClick={()=>{clearInput();setPaused(v=>!v)}}>{paused?<Play size={17}/>:<Pause size={17}/>}<span>{paused?'Resume':'Pause'}</span></button><button aria-label="Restart game" onClick={restartPlay}><Restart size={17}/><span>Restart</span></button><span className="studio-toolbar-note">Current draft · stop to return to building</span></>:<><div className="studio-tool-group"><button aria-label="Select and move objects" title="Select and move objects" aria-pressed={mode==='edit'&&!panTool&&!placing&&!view.placingSpawn} onClick={()=>{switchMode('edit');setPanTool(false)}}><MousePointer2 size={18}/><span>Select</span></button><button aria-label="Pan map" aria-pressed={panTool} onClick={()=>{switchMode('edit');cancelPlace();setPanTool(!panTool)}}><Hand size={18}/><span>Pan</span></button><button aria-label="Walk preview" aria-pressed={mode==='walk'} onClick={()=>switchMode(mode==='walk'?'edit':'walk')}><Footprints size={18}/><span>Walk</span></button></div><div className="studio-tool-group"><button aria-label="Undo" title="Undo (Ctrl / ⌘ Z)" disabled={!history.current.length||mode!=='edit'} onClick={()=>undo()}><Undo2 size={18}/>{mobile&&<span>Undo</span>}</button><button aria-label="Redo" title="Redo (Ctrl / ⌘ Shift Z)" disabled={!future.current.length||mode!=='edit'} onClick={()=>undo(true)}><Redo2 size={18}/>{mobile&&<span>Redo</span>}</button></div><div className="studio-tool-group"><button aria-label="Grid and snap" aria-pressed={view.grid} onClick={()=>updateView({grid:!view.grid})}><Grid2X2 size={18}/><span>Snap</span></button><button aria-label="Show collision lines" aria-pressed={view.collision} onClick={()=>updateView({collision:!view.collision})}><Shield size={18}/><span>Collision</span></button><button aria-label="Set player spawn" aria-pressed={view.placingSpawn} onClick={()=>{switchMode('edit');updateView({placingSpawn:true});if(mobile){setLibraryOpen(false);setInspectorOpen(false)}show('Tap clear ground to set the player start.')}}><MapPin size={18}/><span>Spawn</span></button></div><span className="studio-toolbar-note">{mode==='walk'?'Walk around to check your layout':`${layout.items.length} objects in your world`}</span></>;
 const cameraTools=<><div className="studio-camera" role="group" aria-label="Camera controls"><button aria-label="Zoom out" onClick={()=>updateView({zoom:Math.max(.06,view.zoom-.1)})}><Minus size={17}/></button><output aria-label="Zoom level">{Math.round(view.zoom*100)}%</output><button aria-label="Zoom in" onClick={()=>updateView({zoom:Math.min(2,view.zoom+.1)})}><Plus size={17}/></button><i/><button title="Follow player" aria-label="Follow player" aria-pressed={view.follow} onClick={()=>updateView({x:world.current.player.x,y:world.current.player.y,follow:true,zoom:1})}><LocateFixed size={17}/><span>Player</span></button><button onClick={wholeMap}>Whole map</button>{mode!=='play'&&!world.current.scene&&usesPaintedHomeTerrain(layout.terrainImage)&&<button title="Cycle through the connected river reaches" onClick={()=>{const p=RIVER_BATCHES[riverIndex],point=p.corridor?.points[Math.floor(p.corridor.points.length/2)]??[p.source.x+p.source.width/2,p.source.y+p.source.height/2];switchMode('edit');updateView({x:(point[0]-600)*RIVER_SCALE,y:(point[1]-600)*RIVER_SCALE,zoom:.55,follow:false});setRiverIndex((riverIndex+1)%RIVER_BATCHES.length);show('River reach '+(riverIndex+1)+' of '+RIVER_BATCHES.length);if(mobile)closeTools()}}>River</button>}</div>
    {mode!=='play'&&!world.current.scene&&usesPaintedHomeTerrain(layout.terrainImage)&&<><button title={`View ${RIVER_SIDE_FEATURES[sideFeatureIndex].name}`} onClick={()=>{const p=RIVER_SIDE_FEATURES[sideFeatureIndex];switchMode('edit');updateView({x:(p.focus[0]-600)*RIVER_SCALE,y:(p.focus[1]-600)*RIVER_SCALE,zoom:p.kind==='lake'?.45:.7,follow:false});setSideFeatureIndex((sideFeatureIndex+1)%RIVER_SIDE_FEATURES.length);show(p.name);if(mobile)closeTools()}}><Droplets size={17}/><span>Streams &amp; lake</span></button><button title={`View ${WATERFALL_LOCATIONS[waterfallIndex].name} (${waterfallIndex+1} of ${WATERFALL_LOCATIONS.length})`} onClick={()=>{const p=WATERFALL_LOCATIONS[waterfallIndex];switchMode('edit');updateView({x:(p.x+p.width*.5-600)*RIVER_SCALE,y:(p.y+p.height*.5-600)*RIVER_SCALE,zoom:1.2,follow:false});setWaterfallIndex((waterfallIndex+1)%WATERFALL_LOCATIONS.length);show(p.name);if(mobile)closeTools()}}><MapPin size={17}/><span>{waterfallIndex===0?'Waterfalls':'Next waterfall'}</span></button></>}
    <button className="studio-foliage-toggle" aria-label="Show foliage" aria-pressed={!foliageHidden} title="Show or hide foliage across the whole map" onClick={toggleFoliage}><Leaf size={17}/><span>{foliageHidden?'Show foliage':'Hide foliage'}</span></button>
   <button className="studio-world-plan" title="Open the world plan in a new tab" onClick={()=>{clearInput();window.open('/world-plan.html','_blank','noopener,noreferrer')}}><MapPin size={17}/><span>World plan</span></button>
   <button className="studio-help-button" aria-label="Controls and shortcuts" onClick={()=>{clearInput();setHelpOpen(true)}}><HelpCircle size={18}/>{mobile&&<span>Controls & help</span>}</button></>;
 return <main className="world-editor camp-studio" style={mobile?{height:display.height,'--studio-viewport-height':`${display.height}px`} as React.CSSProperties:undefined} data-map-open={mapOpen} data-mobile={mobile} data-tools-open={toolsOpen} data-mobile-dock={toolsOpen||(mode==='play'?monitorOpen:libraryOpen||(mode==='edit'&&inspectorOpen))} data-library-open={libraryOpen} data-monitor-open={monitorOpen} data-inspector-open={inspectorOpen} data-mode={mode} data-objects={layout.items.length}>
  <EditorOnly playing={mode==='play'}>
  <header className="we-top studio-top">
   <button className="studio-brand" aria-label="Humans Remain — world settings" title="World settings" onClick={()=>openPanel('world')}><Box size={23}/><span>HUMANS<span>REMAIN</span></span></button>
   <button className="studio-panel-toggle" aria-label={mode==='play'?'Toggle game monitor':'Toggle scene panel'} aria-controls={mode==='play'?'studio-play-monitor':'we-library'} aria-expanded={mode==='play'?monitorOpen:libraryOpen} onClick={()=>{clearInput();setAskClear(false);if(mobile)setToolsOpen(false);if(mode==='play'){setMonitorOpen(v=>!v);return}setLibraryOpen(v=>!v);if(mobile)setInspectorOpen(false)}}><PanelLeft size={20}/></button>
   <div className="studio-world-title"><strong>{layout.name||'Untitled world'}</strong><small><i className={busy?'is-saving':''}/>{busy?'Saving…':mode==='play'?'Playing current draft':'World workspace'}</small></div>
   <nav className="studio-modes" aria-label="Workspace mode"><button aria-pressed={mode!=='play'} onClick={()=>{if(mode==='play')stopPlay();else switchMode('edit')}}><MousePointer2 size={17}/><span>Build</span></button><button className={mode==='play'?'is-playing':'studio-start'} aria-pressed={mode==='play'} disabled={!ready||tierBusy||terrainBusy} onClick={()=>mode==='play'?stopPlay():startPlay()}>{mode==='play'?<Square size={16}/>:<Play size={17}/>}<span>{mode==='play'?'Stop':'Play'}</span></button></nav>
   <div className="studio-top-actions">{mobile&&<button ref={toolsToggle} className="studio-tools-toggle" data-paused={mode==='play'&&paused} aria-label="Toggle tools" aria-expanded={toolsOpen} aria-controls="studio-mobile-tools" onClick={toggleTools}><SlidersHorizontal size={17}/><span>{mode==='play'&&paused?'Paused':'Tools'}</span></button>}<button className="studio-library-button" aria-label="Open asset library" title="Asset library" onClick={()=>openAssetLibrary()}><LibraryBig size={19}/><span>Asset library</span></button><button className="studio-save" aria-label="Save world to site" title="Save world to site (Ctrl / ⌘ S)" disabled={busy||!ready||!canEdit||tierBusy||terrainBusy} onClick={()=>void save()}><Save size={18}/><span>{busy?'Saving':'Save'}</span></button><button className="studio-inspector-toggle" aria-label="Toggle inspector" aria-expanded={inspectorOpen&&mode==='edit'} disabled={mode==='play'} onClick={()=>{if(mode==='walk')switchMode('edit');setInspectorOpen(v=>!v);if(mobile){setToolsOpen(false);setLibraryOpen(false)}}}><PanelRight size={20}/></button><button aria-label="Workspace options" aria-expanded={askClear} onClick={()=>{setAskClear(v=>!v);clearInput();if(mobile){setToolsOpen(false);setMonitorOpen(false);setLibraryOpen(false);setInspectorOpen(false)}}}><MoreHorizontal size={21}/></button></div>
  </header>
  {!mobile&&<div className="studio-toolbar" aria-label="World tools"><div className="studio-toolbar-tools">{locationTools}{weatherTools}{modeTools}</div><div className="studio-toolbar-view">{cameraTools}</div></div>}
  {mobile&&toolsOpen&&<MobileStudioTools playing={mode==='play'} tab={toolsTab} onTab={setToolsTab} onClose={closeTools} modeTools={modeTools} weatherTools={<>{locationTools}{weatherTools}</>} cameraTools={cameraTools}/>}
  </EditorOnly>
  {mode!=='play'&&libraryOpen&&<aside id="we-library" className="we-library studio-sidebar" aria-label="World panels">
   <div className="studio-panel-tabs" role="tablist" aria-label="World panels">{(['scene','assets','world'] as const).map(tab=><button key={tab} role="tab" aria-selected={libraryTab===tab} aria-controls={'studio-'+tab} onClick={()=>setLibraryTab(tab)}>{tab==='scene'?<Layers size={15}/>:tab==='assets'?<Box size={15}/>:<SlidersHorizontal size={15}/>}<span>{tab[0].toUpperCase()+tab.slice(1)}</span></button>)}<button className="studio-close-panel" aria-label="Close world panels" onClick={()=>setLibraryOpen(false)}><X size={17}/></button></div>
   {libraryTab==='scene'&&<section className="studio-scene" id="studio-scene" role="tabpanel" aria-label="Scene objects"><div className="studio-panel-heading"><h2>Scene</h2><span>{layout.items.length} objects</span></div><label className="we-search"><Search size={16}/><input placeholder="Find a placed object…" aria-label="Search placed objects" value={sceneSearch} onChange={e=>{setSceneSearch(e.target.value);setSceneCount(100)}}/></label><div className="studio-scene-list"><button className="studio-spawn-row" onClick={()=>{updateView({x:layout.spawn.x,y:layout.spawn.y,zoom:.8,follow:false});if(mobile)setLibraryOpen(false)}}><MapPin size={17}/><span>Player start<small>Where Play begins</small></span><LocateFixed size={15}/></button>{sceneItems.slice(0,sceneCount).map(({p,index})=>{const a=ASSET_BY_ID.get(p.assetId);return <div className={`studio-scene-row ${selected===p.id?'is-selected':''}`} key={p.id}><button className="studio-select-object" aria-label={`Select ${a?.name||'asset'}, object ${index+1}`} aria-pressed={selected===p.id} onClick={()=>{if(mode==='walk')switchMode('edit');select(p.id);setInspectorOpen(true);if(mobile)setLibraryOpen(false)}} onDoubleClick={()=>focusObject(p)}><Box size={16}/><span>{a?.name||'Asset'}<small>#{index+1} · {p.locked?'Locked':p.solid?'Collision on':'Decorative'}</small></span></button><button aria-label={`Focus ${a?.name||'asset'}`} title="Focus object" onClick={()=>focusObject(p)}><LocateFixed size={15}/></button><button aria-label={`${p.locked?'Unlock':'Lock'} ${a?.name||'asset'}`} title={p.locked?'Unlock':'Lock'} onClick={()=>editItem(p.id,{locked:!p.locked})}>{p.locked?<Lock size={15}/>:<Unlock size={15}/>}</button></div>})}{sceneItems.length>sceneCount&&<button className="studio-add-object" onClick={()=>setSceneCount(n=>n+100)}>Show more ({sceneCount} of {sceneItems.length})</button>}{!sceneItems.length&&<p className="studio-empty-list">{layout.items.length?'No matching objects.':'Add an asset to start your world.'}</p>}</div><button className="studio-add-object" onClick={()=>setLibraryTab('assets')}><Plus size={17}/>Add object</button><p className="studio-panel-hint">Select any object here, even behind a roof or another asset.</p></section>}
   {libraryTab==='assets'&&<section className="we-asset-browser" id="studio-assets" role="tabpanel" aria-label="Place assets"><div className="studio-panel-heading"><h2>Place assets</h2><span>{availableAssets.length} assets</span></div><button className="studio-manage-library" onClick={()=>openAssetLibrary()}><LibraryBig size={17}/>Open asset library<ChevronRight size={16}/></button><label className="we-search"><Search size={17}/><input placeholder="Find an asset…" aria-label="Search assets" value={search} onChange={e=>setSearch(e.target.value)}/></label><select aria-label="Asset category" value={group} onChange={e=>setGroup(e.target.value)}><option value="all">All categories</option>{groups.map(g=><option key={g}>{g}</option>)}</select><label className="we-placed-filter"><input type="checkbox" checked={onlyPlaced} onChange={e=>setOnlyPlaced(e.target.checked)}/>Used in this world</label><div className="we-assets">{filtered.map(a=><button key={a.id} className={`we-asset ${placing===a.id?'is-selected':''}`} draggable={!mobile&&ready&&mode==='edit'} disabled={!ready} title={`${a.name} · click to place`} onDragStart={e=>{e.dataTransfer.setData('application/safety-last-asset',a.id);e.dataTransfer.effectAllowed='copy';void ensureArt(a.id).catch(()=>show('Artwork could not load. Try again.'))}} onClick={()=>{void beginPlace(a.id);if(mobile)setLibraryOpen(false)}}><div className="we-thumb"><ArtThumb asset={a}/></div><strong>{a.name}</strong><small><Plus size={11}/>Place in world</small></button>)}{!filtered.length&&<p>No matching artwork.</p>}</div><button onClick={()=>openAssetLibrary(undefined,true)}><Upload size={16}/>Upload new asset</button></section>}
   {libraryTab==='world'&&<section id="studio-world" className="studio-world-panel" role="tabpanel" aria-label="World settings">{terrainPanel}<div className="we-library-foot"><button onClick={exportDraft}><Download size={16}/>Export world</button><button disabled={!ready} onClick={()=>upload.current?.click()}><Upload size={16}/>Import</button></div><details className="studio-section"><summary>Start a new world</summary><p>Clear this draft to empty terrain. You can undo this until you close the workspace.</p><button className="we-danger" onClick={()=>{if(!window.confirm('Clear this draft? Export first if you want a separate copy. You can Undo this change.'))return;cancelGesture();cancelPlace();setCurrent(emptyLayout());select(null);Object.assign(world.current.player,layoutRef.current.spawn);updateView({x:layoutRef.current.spawn.x,y:layoutRef.current.spawn.y,follow:false,zoom:.4});show('Empty world ready. Undo restores your previous draft.')}}><Trash2 size={16}/>Clear draft</button></details></section>}
  </aside>}
  <section className="we-world" aria-label={mode==='play'?'Playable world':'World viewport'}>
   <canvas ref={canvas} tabIndex={0} aria-label={mode==='edit'?'World canvas. Select an object to edit. Drag ground to pan, pinch or scroll to zoom.':'Play your camp. WASD or arrows to move, Shift to sprint, Space to act, Q to dodge, E to interact, hold R to repair with your hammer.'} onPointerDown={down} onPointerMove={move} onPointerUp={e=>up(e)} onPointerCancel={e=>up(e,true)} onLostPointerCapture={e=>up(e,true)} onContextMenu={e=>e.preventDefault()} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect=mode==='edit'?'copy':'none'}} onDrop={e=>{e.preventDefault();if(mode==='edit'&&ready&&!blockedInput.current){const id=e.dataTransfer.getData('application/safety-last-asset');if(ASSET_BY_ID.has(id))void place(id,point(e.clientX,e.clientY))}}} onWheel={e=>{if(modeRef.current!=='play'&&!blockedInput.current)updateView({zoom:Math.max(.06,Math.min(2,viewRef.current.zoom*(e.deltaY>0?.91:1.1)))})}}/>
   {mode==='play'&&<GamePlayMenu hideButton paused={paused} defeated={world.current.phase==='over'} cause={world.current.cause} survival={!!world.current.progression} saveNotice={saveNotice} saveBlocked={saveBlocked.current&&!!world.current.progression} onSandbox={openSandbox} onContinue={()=>void restoreSurvival()} spawns={world.current.progression?undefined:{onSpawn:async(kind,count)=>{const w=world.current,before=w.animals.length+w.enemies.length,message=await spawnEnemies(kind,count);if(world.current===w&&w.animals.length+w.enemies.length>before)resumeGame();return message},onClear:()=>clearPlaySpawns(world.current),onHeal:()=>restoreCombatHealth(world.current)}} diagnostics={{recorder:gamePerformance,onStart:startPerformanceRecording}} fullscreen={display.fullscreen} onPause={pauseGame} onResume={resumeGame} onRestart={restartPlay} onExit={stopPlay} onExpand={()=>void display.expand()}/>}
   {mode==='play'&&!paused&&!bagOpen&&!mapOpen&&<GamePerformanceOverlay recorder={gamePerformance}/>}
   {mode==='play'&&<div className="game-play-feedback" aria-live="polite">
    {(outdoorStatus||travelStatus)&&!preparingMode&&<div role="status"><span>{travelStatus||outdoorStatus}</span>{(travel.current?.error||outdoorTerrain.current?.error)&&<button onClick={()=>{if(travel.current?.error)travel.current.retry();else outdoorTerrain.current?.retry()}}>Retry</button>}</div>}
    {saveNotice&&world.current.progression&&!paused&&<div role="status"><span>{saveNotice}</span></div>}
    {message&&<div role="status"><span>{message}</span><button aria-label="Dismiss message" onClick={()=>setMessage('')}><X size={17}/></button></div>}
    {error&&<div role="alert"><span>{error}</span><button onClick={retryLoading}>Retry loading</button></div>}
   </div>}
   {mode!=='play'&&<div className="we-world-label">{timeOfDay==='night'?<Moon size={15}/>:<Sun size={15}/>}<b>{mode==='walk'?'WALK PREVIEW':'SCENE VIEW'}</b><span>{activeLocation==='Camp'?`${layout.items.length} placed`:activeLocation}</span></div>}
   {mode==='play'&&ready&&!error&&<FieldKitHUD world={world} controller={fieldKit} enabled={controlsAvailable&&!mapOpen&&!travel.current?.busy&&!travelStatus} mobile={mobile} input={touchInput} sprinting={sprint.active} onSprint={sprint.toggle} onHeld={held=>attackHeld.current=held} onDodge={dodge} onTool={equipAxe} onMove={()=>{viewRef.current={...viewRef.current,follow:true}}} isPinching={()=>playZoomInput.current?.blocksMovement()??false} onPause={pauseGame} onCheckpoint={()=>saveRunRef.current()} bagOpen={bagOpen} onBag={changeBag} mapOpen={mapOpen} onMap={changeMap}/>}
   {mode==='play'&&<PlayerMap world={world} open={mapOpen} continuous={continuousMapCamera(world.current,viewRef.current,canvas.current?.clientWidth||1,canvas.current?.clientHeight||1,atlasAmount)} onClose={()=>changeMap(false)}/>}
   {!layout.items.length&&ready&&mode==='edit'&&!placing&&!view.placingSpawn&&<div className="we-empty"><Layers size={24}/><h2>Your world starts here</h2><p>Choose an asset, place it in your world, then press Play to explore.</p><button className="we-primary" onClick={()=>openPanel('assets')}>Choose an asset</button></div>}
   {selectedItem&&selectedAsset&&mode==='edit'&&!(mobile&&libraryOpen)&&!inspectorOpen&&<div className="studio-selection"><button onClick={()=>{setToolsOpen(false);setInspectorOpen(true)}}><SlidersHorizontal size={18}/><span>{selectedAsset.name}<small>Object settings</small></span></button><button title="Lock or unlock" aria-label={selectedItem.locked?'Unlock object':'Lock object'} onClick={toggleLock}>{selectedItem.locked?<Lock size={18}/>:<Unlock size={18}/>}</button><button aria-label="Deselect object" onClick={()=>select(null)}><X size={18}/></button></div>}
   {mode==='edit'&&(placing||view.placingSpawn)&&<div className="we-placement"><span>{placing?`Tap ground to place ${ASSET_BY_ID.get(placing)?.name||'asset'}`:'Tap clear ground to set player start'}</span><button onClick={cancelPlace}><X size={17}/>Cancel</button></div>}
   {controlsAvailable&&mode==='walk'&&mobile&&<EditorJoystick input={touchInput} onStart={()=>updateView({follow:true})}/>}
   {controlsAvailable&&mode==='walk'&&<SprintButton className="we-sprint" active={sprint.active} onToggle={sprint.toggle}/>}
   {controlsAvailable&&mode==='walk'&&nearbyGateId&&<button className="we-chest-action" onClick={()=>{if(toggleGate(world.current,nearbyGateId)){show(world.current.notice);refreshChest(n=>n+1)}}}>{gateActionLabel(world.current,nearbyGateId)}{!mobile&&' · E'}</button>}
   {controlsAvailable&&mode==='walk'&&!nearbyGateId&&nearbyChest&&<button className="we-chest-action" onClick={()=>{const id=findNearbyChest();if(id)openChest(id)}}>{chestIsOpen(world.current,nearbyChest)?'Close chest':'Open chest'}{!mobile&&' · E'}</button>}
   {controlsAvailable&&mode==='walk'&&bonfireAction&&!nearbyChest&&!nearbyGateId&&<button className="we-chest-action" disabled={bonfireAction.startsWith('COOKING')||bonfireAction==='CLEAR DROP AREA'} onClick={previewCooking}>{bonfireAction}{!mobile&&' · E'}</button>}
   {controlsAvailable&&mode==='walk'&&<div className="we-axe-controls"><AxeToggle equipped={axeEquipped} onToggle={equipAxe}/><AxeSwingButton equipped={axeEquipped} world={world} onHeld={held=>attackHeld.current=held} onSwing={()=>requestAttack(world.current)}/></div>}
   {ready&&!error&&terrainDetail!=='ready'&&mode!=='play'&&!libraryOpen&&!inspectorOpen&&<div className="we-terrain-status" role="status">{terrainDetail==='error'?<button onClick={()=>void loadTerrainDetail()}>Retry map detail</button>:<span>Map detail {detailProgress.loaded}/{detailProgress.total}</span>}</div>}
   {mode!=='play'&&(!ready||error)&&<div className="we-loading" role="status" aria-live="polite"><b>{error?'The workspace couldn’t finish loading.':'Opening your world…'}</b><span>{error||loadProgress.stage}</span>{!error&&loadProgress.total>0&&<progress aria-label="Camp artwork loaded" value={loadProgress.loaded} max={loadProgress.total}/>}<div className="we-loading-actions">{error&&<button className="we-primary" onClick={retryLoading}>Retry loading</button>}<button onClick={exportDraft}><Download size={16}/>Export draft</button></div></div>}
  </section>
  {mode==='edit'&&inspectorOpen&&<div className="studio-inspector-dock">{objectInspector||<aside className="studio-inspector-empty"><header><span>OBJECT INSPECTOR</span><button aria-label="Close inspector" onClick={()=>setInspectorOpen(false)}><X size={17}/></button></header><div><MousePointer2 size={30}/><h2>Select an object</h2><p>Click an object in your world or choose it from the Scene list.</p><p>Adjust its position, rotation, tier, layers and collision here.</p><button onClick={()=>openPanel('scene')}><Layers size={17}/>Browse scene</button></div></aside>}</div>}
  <EditorOnly playing={mode==='play'}>
  <footer className="we-bottom"><span>{status}</span><span>{mode==='play'?'Play changes reset when you stop':`Draft · ${layout.items.length} objects · ${availableAssets.length} library assets`}</span><button onClick={()=>void display.expand()}>{display.fullscreen?<Minimize2 size={15}/>:<Maximize2 size={15}/>}Expand view</button></footer>
  <div className="studio-workspace-feedback">
  {preparingMode&&<div className="we-message studio-mode-preparing" role="status"><span>Preparing {preparingMode==='play'?'Play':'Walk'}… You can keep editing.</span><button onClick={cancelModePreparation}>Cancel</button></div>}
  {askClear&&<div className="we-options studio-options"><strong>Workspace<button className="studio-options-close" aria-label="Close workspace options" onClick={()=>setAskClear(false)}><X size={18}/></button></strong>{mobile&&<><button aria-label="Save world to site" disabled={busy||!ready||!canEdit||tierBusy||terrainBusy} onClick={()=>{setAskClear(false);void save()}}><Save size={17}/>{busy?'Saving…':'Save world'}</button><button onClick={()=>openAssetLibrary()}><LibraryBig size={17}/>Asset library</button></>}<button onClick={()=>{setAskClear(false);openPanel('world')}}><SlidersHorizontal size={17}/>World settings</button><button onClick={()=>{setAskClear(false);void display.expand()}}><Maximize2 size={17}/>{display.fullscreen?'Exit full screen':'Expand view'}</button><button onClick={()=>{setAskClear(false);exportDraft()}}><Download size={17}/>Export world</button><button disabled={mode==='play'||!ready} onClick={()=>{setAskClear(false);upload.current?.click()}}><Upload size={17}/>Import world</button><button onClick={()=>{setAskClear(false);setHelpOpen(true)}}><HelpCircle size={17}/>Controls & shortcuts</button><button onClick={()=>setAskClear(false)}><X size={17}/>Close</button></div>}
  {display.swipeHint&&<aside className="we-browser-hint" aria-label="Expand view instructions"><ArrowUp size={20}/><span>{mobile?"Swipe up on this bar to hide your browser’s controls.":"Use your browser’s full-screen option to expand this view."}</span><button aria-label="Dismiss expand view instructions" onClick={()=>display.setSwipeHint(false)}><X size={18}/></button></aside>}
  {outdoorStatus&&!travelStatus&&!world.current.scene&&!preparingMode&&<div className="we-message studio-travel-status" role="status"><span>{outdoorStatus}</span>{outdoorTerrain.current?.error&&<button onClick={()=>outdoorTerrain.current?.retry()}>Retry terrain</button>}</div>}
  {travelStatus&&!preparingMode&&<div className="we-message studio-travel-status" role="status"><span>{travelStatus}</span>{travel.current?.error&&<button onClick={()=>travel.current?.retry()}>Retry map</button>}</div>}
  {message&&!preparingMode&&<div className="we-message" role="status"><span>{message}</span><button aria-label="Dismiss message" onClick={()=>setMessage('')}><X size={17}/></button></div>}
  </div>
  </EditorOnly>
  <input ref={upload} type="file" accept=".json,application/json" hidden onChange={e=>{if(e.target.files?.[0])void importDraft(e.target.files[0]);e.target.value=''}}/>
  {collisionEdit&&ASSET_BY_ID.has(collisionEdit.assetId)&&<WorldCollisionEditor key={collisionEdit.id} placement={collisionEdit} asset={ASSET_BY_ID.get(collisionEdit.assetId)!} onClose={()=>setCollisionEdit(null)} onApply={collision=>{editItem(collisionEdit.id,{collision,footprint:undefined,...(collision?{solid:true}:{})});setCollisionEdit(null);updateView({collision:true});show('Collision saved in this draft. Press Play to test the walkable space.')}}/>}
  {assetBrowser&&<dialog ref={libraryDialog} className="studio-library-dialog" aria-label="Asset library" onCancel={e=>{if(e.target!==e.currentTarget)return;e.preventDefault();closeAssetLibrary()}}><BaseChecklist embedded onBack={closeAssetLibrary} onPlace={ready?chooseAsset:undefined} onArtworkChanged={()=>void refreshArtwork()} initialAssetId={assetFocus} initialView={assetView}/></dialog>}
  {helpOpen&&<dialog ref={helpDialog} className="studio-help-overlay" aria-label="Workspace controls" onCancel={e=>{e.preventDefault();setHelpOpen(false)}}><section><header><h2>Build. Play. Keep building.</h2><button aria-label="Close controls" onClick={()=>setHelpOpen(false)}><X size={20}/></button></header><p><b>Build</b> places and edits your assets. <b>Play</b> starts your current draft at the player start. Use <b>Pause → Return to Build</b> to restore your editing view.</p><dl><div><dt>Select anything</dt><dd>Use Scene to reach objects behind roofs or other assets.</dd></div><div><dt>Place artwork</dt><dd>Drag from Assets, or tap an asset and then tap the ground.</dd></div><div><dt>Fine positioning</dt><dd>Arrow keys move a selected object 1 pixel. Rotate by 1° in the inspector.</dd></div><div><dt>Move around</dt><dd>WASD / arrows or the joystick. Shift or Sprint to run.</dd></div><div><dt>Day / Night</dt><dd>On iPhone, open Tools → Weather. Use the sun / moon button to preview camp lighting. Play starts with your selected lighting.</dd></div><div><dt>Travel</dt><dd>Walk to the bunker door to enter. Use the stairs inside to return to camp.</dd></div><div><dt>Interact</dt><dd>Space, E or the main on-screen action. Hold R or the separate Repair button for damaged buildings with the hammer equipped. In Play, select Fists / Axe / Chicken with 1 / 2 / 3 or the bottom quick bar. Q or Dodge to evade.</dd></div><div><dt>Shortcuts</dt><dd>F focuses an object. Ctrl / ⌘ Z undoes. Ctrl / ⌘ S saves. F5 plays or stops.</dd></div></dl><p>The headquarters chest starts stocked with food to try eating, cooking and preparing meals. Play progress resets when you return to Build. Saving keeps your world layout.</p><button className="we-primary" onClick={()=>setHelpOpen(false)}>Back to world</button></section></dialog>}
 </main>;
}

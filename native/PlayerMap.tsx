import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,BackHandler,Easing,Platform,Pressable,StyleSheet,Text,View,type GestureResponderEvent} from 'react-native';
import {Canvas,Circle,Group,Image as SkiaImage,LinearGradient,RadialGradient,PaintStyle,Path,Picture,Rect,Skia,useImage,type SkPicture,type SkImage} from '@shopify/react-native-skia';
import {PLAYER_MAP_MAX_ZOOM,PLAYER_MAP_TERRAIN_URL,playerMapFeatures,playerMapHeading,playerMapScene,playerMapView,projectMapPoint,unprojectMapPoint,type PlayerMapFeatures,type PlayerMapImage,type PlayerMapLandmark} from '../src/player-map';
import type {Direction,Vec,World} from '../src/survival-engine';
import type {GamePerformanceRecorder} from '../src/performance-recording';
import type {WorldBounds} from '../src/world-bounds';
import {BUNDLED_ART} from './bundled-art';
import {WORLD_URL} from './config';
import {PLAYER_MAP_MARKER,mapArtDisplayFactor} from '../src/player-map-art';
import {playerMapLabels} from '../src/player-map-labels';
import {PLAYER_MAP_NIGHT,playerMapNightAmount,playerMapInk} from '../src/player-map-lighting';
import {clearWaypoint,currentWaypoint,placeWaypoint,WaypointTap,WAYPOINT_PIN} from '../src/waypoint';

const headingNames:Record<Direction,string>={up:'north','up-right':'north-east',right:'east','down-right':'south-east',down:'south','down-left':'south-west',left:'west','up-left':'north-west'};
const atlasFont='FieldKitBarlow';
const compassRose='M0 -24L4 -4L24 0L4 4L0 24L-4 4L-24 0L-4 -4Z';
const landmarkSymbols:Record<PlayerMapLandmark['kind'],string>={
 camp:'M-11 9L0 -10L11 9ZM-3 9L0 1L3 9M0 -10V-15L7 -12L0 -10',
 bunker:'M-12 9H12M-10 9V0Q-10 -9 0 -9Q10 -9 10 0V9M-4 9V0Q-4 -4 0 -4Q4 -4 4 0V9M-8 -3H-5M5 -3H8',
 headquarters:'M-12 -1L0 -11L12 -1M-9 -3V10H9V-3M-3 10V2H3V10M-7 1H-5M5 1H7',
 storage:'M-10 -4Q0 -11 10 -4V9H-10ZM-10 0H10M-2 -1H2V4H-2Z',
 well:'M-10 -4L0 -12L10 -4M-7 -4V6M7 -4V6M-9 6H9V10H-9ZM0 -4V4',
 building:'M-10 10V-7H-5V-11H-1V-7H3V-11H7V-7H10V10ZM-3 10V3H3V10',
};
const landmarkPriority:Record<PlayerMapLandmark['kind'],number>={camp:0,bunker:1,headquarters:2,well:3,storage:4,building:5};
type Camera={zoom:number;focus:Vec};
type Props={world:React.RefObject<World|null>;width:number;height:number;safe:{top:number;right:number;bottom:number;left:number};onClose:()=>void;diagnostics?:GamePerformanceRecorder;onReady?:(ready:boolean)=>void;active?:boolean;continuous?:{zoom:number;entry:number;opacity:number;focus:Vec};onTouchStart?:(event:GestureResponderEvent)=>void};
const clampZoom=(zoom:number)=>Math.max(1,Math.min(PLAYER_MAP_MAX_ZOOM,zoom));
const sampleWorld=(w:World)=>({world:w,layout:w.layout,scene:w.scene,x:w.player.x,y:w.player.y,direction:w.player.direction,waypoint:w.waypoint,night:playerMapNightAmount(w),fireLit:w.camp.hearth.fuel>0});
function outdoorFollowZoom(bounds:WorldBounds,width:number,height:number){
 if(width<=0||height<=0)return 2.5;
 const fitScale=playerMapView(bounds,width,height,1).scale;
 const coverZoom=Math.max(width/bounds.width,height/bounds.height)/fitScale;
 return clampZoom(Math.max(2.5,coverZoom));
}

// Mounted during normal play so decoding does not begin at the pinch threshold.
// Keeping loaders outside the Canvas also retains images when its drawing is hidden.
function MapTextureLoader({textureKey,source,onImage,diagnostics}:{textureKey:string;source:number|string;onImage:(key:string,image:SkImage|null)=>void;diagnostics?:GamePerformanceRecorder}){
 const started=useRef(performance.now()),session=useRef(diagnostics?.session);
 const failed=useCallback(()=>{onImage(textureKey,null);diagnostics?.trace(started.current,'native-map-texture',performance.now()-started.current,{key:textureKey,ready:false},session.current)},[textureKey,onImage,diagnostics]);
 const decoded=useImage(source,failed);
 useEffect(()=>{if(decoded){onImage(textureKey,decoded);diagnostics?.trace(started.current,'native-map-texture',performance.now()-started.current,{key:textureKey,ready:true,width:decoded.width(),height:decoded.height()},session.current)}},[decoded,textureKey,onImage,diagnostics]);
 return null;
}
function measureMapBuild<T>(diagnostics:GamePerformanceRecorder|undefined,stage:string,build:()=>T):T{
 const start=diagnostics?.recording?performance.now():undefined;
 try{return build()}finally{if(start!==undefined)diagnostics!.trace(start,stage,performance.now()-start)}
}

// One decoded atlas and one retained display list for every camp illustration.
function MapIllustrations({features,bounds,scale,image}:{features:PlayerMapFeatures;bounds:WorldBounds;scale:number;image:SkImage|null|undefined}){
 const picture=useMemo(()=>{
  if(!image)return null;
  const recorder=Skia.PictureRecorder(),canvas=recorder.beginRecording(Skia.XYWHRect(bounds.left,bounds.top,bounds.width,bounds.height)),paint=Skia.Paint();
  paint.setAntiAlias(true);
  try{
   for(const item of features.illustrations.filter(a=>a.kind!=='camp')){
    const source=item.source;
    canvas.save();canvas.translate(item.x,item.y);canvas.rotate(item.rotation*180/Math.PI,0,0);canvas.scale(item.flipX?-1:1,item.flipY?-1:1);
    canvas.drawImageRect(image,Skia.XYWHRect(source.x,source.y,source.width,source.height),Skia.XYWHRect(-item.width/2,-item.height/2,item.width,item.height),paint,false);canvas.restore();
   }
   return recorder.finishRecordingAsPicture();
  }finally{paint.dispose();recorder.dispose()}
 },[image,features,bounds]);
 useEffect(()=>()=>picture?.dispose(),[picture]);
 const campPictures=useMemo(()=>image?features.illustrations.filter(a=>a.kind==='camp').map(item=>{
  const recorder=Skia.PictureRecorder(),canvas=recorder.beginRecording(Skia.XYWHRect(-item.width/2,-item.height/2,item.width,item.height)),paint=Skia.Paint();paint.setAntiAlias(true);
  try{const source=item.source;canvas.drawImageRect(image,Skia.XYWHRect(source.x,source.y,source.width,source.height),Skia.XYWHRect(-item.width/2,-item.height/2,item.width,item.height),paint,false);return{item,picture:recorder.finishRecordingAsPicture()}}finally{paint.dispose();recorder.dispose()}
 }):[],[image,features]);
 useEffect(()=>()=>{for(const camp of campPictures)camp.picture.dispose()},[campPictures]);
 return <>{picture&&<Picture picture={picture}/>}{campPictures.map(({item,picture})=>{const factor=mapArtDisplayFactor(item,scale);return <Group key={item.id} transform={[{translateX:item.x},{translateY:item.y},{rotate:item.rotation},{scaleX:(item.flipX?-1:1)*factor},{scaleY:(item.flipY?-1:1)*factor}]}><Picture picture={picture}/></Group>})}</>;
}

function LandmarkSymbol({kind}:{kind:PlayerMapLandmark['kind']}){return <Group><Path path={landmarkSymbols[kind]} color="#11150fe0" style="stroke" strokeWidth={4} strokeCap="round" strokeJoin="round"/><Path path={landmarkSymbols[kind]} color="#eee4c9" style="stroke" strokeWidth={1.3} strokeCap="round" strokeJoin="round"/></Group>}
function CompassRose({right=false}:{right?:boolean}){return <View pointerEvents="none" style={[s.compass,right?{right:14}:{left:14}]}><Text style={s.compassText}>N</Text><Canvas style={{width:66,height:66}}><Group transform={[{translateX:33},{translateY:33}]}><Circle r={19} color="#b4a57988" style="stroke" strokeWidth={.6}/><Path path="M-16 -16L-4 -2L-2 -4ZM16 -16L4 -2L2 -4ZM16 16L2 4L4 2ZM-16 16L-2 4L-4 2Z" color="#9c936b"/><Path path={compassRose} color="#10150fd9" style="stroke" strokeWidth={3}/><Path path={compassRose} color="#b6a675"/><Path path="M0 -24L0 0L4 -4ZM24 0L0 0L4 4ZM0 24L0 0L-4 4ZM-24 0L0 0L-4 -4Z" color="#eee4c9"/><Circle r={2} color="#e7d6a4"/></Group></Canvas><Text style={s.compassWest}>W</Text><Text style={s.compassEast}>E</Text><Text style={s.compassSouth}>S</Text></View>}
function ControlSymbol({kind}:{kind:'location'|'fit'}){return <Canvas pointerEvents="none" style={{width:17,height:17}}><Group transform={[{translateX:8.5},{translateY:8.5}]}>{kind==='location'?<><Circle r={5} color="#b9a778" style="stroke" strokeWidth={.8}/><Path path="M0 -8V-4M8 0H4M0 8V4M-8 0H-4M0 -3L2 3L0 2L-2 3Z" color="#e9dfc6" style="stroke" strokeWidth={1}/></>:<Path path="M-2 -6H-6V-2M2 -6H6V-2M6 2V6H2M-2 6H-6V2" color="#d3c5a1" style="stroke" strokeWidth={1.2}/>}</Group></Canvas>}

/** A few retained paths hold the current layout. Moving the pin and panning
 * never reload terrain or rebuild thousands of placed objects. */
function featurePicture(features:PlayerMapFeatures,bounds:WorldBounds):SkPicture{
 const recorder=Skia.PictureRecorder(),canvas=recorder.beginRecording(Skia.XYWHRect(bounds.left,bounds.top,bounds.width,bounds.height)),paint=Skia.Paint();
 paint.setAntiAlias(true);
 try{
  for(const item of features.paths){
   const path=Skia.Path.MakeFromSVGString(item.path);if(!path)continue;
   if(item.fill!=='transparent'){paint.setStyle(PaintStyle.Fill);paint.setColor(Skia.Color(item.fill));canvas.drawPath(path,paint)}
   if(item.stroke&&item.strokeWidth){paint.setStyle(PaintStyle.Stroke);paint.setColor(Skia.Color(item.stroke));paint.setStrokeWidth(item.strokeWidth);canvas.drawPath(path,paint)}
   path.dispose();
  }
  return recorder.finishRecordingAsPicture();
 }finally{paint.dispose();recorder.dispose()}
}

function touchState(event:GestureResponderEvent){
 const touches=event.nativeEvent.touches;
 if(!touches.length)return null;
 const a=touches[0],b=touches[1];
 return{count:b?2:1,x:b?(a.pageX+b.pageX)/2:a.pageX,y:b?(a.pageY+b.pageY)/2:a.pageY,distance:b?Math.hypot(a.pageX-b.pageX,a.pageY-b.pageY):0};
}

function MapAction({kind,label,top,right,selected=false,onPress}:{kind:'place'|'clear';label:string;top:number;right:number;selected?:boolean;onPress:()=>void}){
 return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected}} onPress={onPress} style={[s.close,{position:'absolute',top,right},selected&&{borderColor:'#ffe0a0'}]}><Canvas pointerEvents="none" style={{width:44,height:44}}><Circle cx={22} cy={22} r={21}><LinearGradient start={{x:8,y:5}} end={{x:35,y:42}} colors={selected?['#98683d','#573b29']:['#26565a','#0b3034']}/></Circle><Circle cx={22} cy={22} r={21} color="#edcb83" style="stroke" strokeWidth={1}/><Group transform={[{translateX:22},{translateY:22},{scale:.72}]}>{kind==='place'?<><Path path={WAYPOINT_PIN} color="#f4e6c7" style="stroke" strokeWidth={2.5}/><Path path="M4 -18H16M10 -24V-12" color="#f4e6c7" style="stroke" strokeWidth={2.5} strokeCap="round"/></>:<Path path="M-10 -10H10M-6 -10V-15H6V-10M-8 -10L-6 14H6L8 -10M-2 -4V8M3 -4V8" color="#f4e6c7" style="stroke" strokeWidth={2.5} strokeCap="round" strokeJoin="round"/>}</Group></Canvas></Pressable>;
}

export default function NativePlayerMap({world,width,height,safe,onClose,active=true,continuous,onTouchStart,diagnostics,onReady}:Props){
 const portrait=useImage(require('../public/maps/survivor-map-portrait-v2.webp'));
 const [sample,setSample]=useState(()=>sampleWorld(world.current!));
 const [placingWaypoint,setPlacingWaypoint]=useState(false),waypointTap=useRef(new WaypointTap());
 useEffect(()=>{setPlacingWaypoint(false);waypointTap.current.cancel()},[sample.world,sample.scene]);
 const scene=useMemo(()=>playerMapScene(sample.world),[sample.world,sample.layout,sample.scene]);
 const features=useMemo(()=>measureMapBuild(diagnostics,'native-map-features',()=>playerMapFeatures(sample.layout)),[sample.layout]);
 const geometry=useMemo(()=>measureMapBuild(diagnostics,'native-map-geometry',()=>featurePicture(features,scene.bounds)),[features,scene.bounds]);
 const initialZoom=sample.scene?1:2.5;
 const [localCamera,setCamera]=useState<Camera>(()=>({zoom:initialZoom,focus:continuous?.focus??{x:sample.x,y:sample.y}}));
 const camera=continuous?{zoom:continuous.zoom,focus:localCamera.focus}:localCamera;
 const cameraRef=useRef(camera);cameraRef.current=camera;
 const [size,setSize]=useState({width:Math.max(1,width),height:Math.max(1,height)});
 const outdoorMinimumZoom=outdoorFollowZoom(scene.bounds,size.width,size.height);
 const focus=continuous?{x:continuous.focus.x+(camera.focus.x-continuous.focus.x)*continuous.opacity,y:continuous.focus.y+(camera.focus.y-continuous.focus.y)*continuous.opacity}:camera.focus;
 const view=playerMapView(scene.bounds,size.width,size.height,camera.zoom,focus,Math.max(12,continuous?.entry??12));
 useEffect(()=>{waypointTap.current.cancel()},[view.scale]);
 const current=useRef({scene,size,view});current.current={scene,size,view};
 const body=useRef<React.ElementRef<typeof View>>(null),origin=useRef({x:0,y:0}),gesture=useRef<ReturnType<typeof touchState>>(null),following=useRef(true);
 const [textures,setTextures]=useState<Record<string,SkImage|null>>({}),[retry,setRetry]=useState(0);
 const reportTexture=useCallback((key:string,image:SkImage|null)=>setTextures(old=>old[key]===image?old:{...old,[key]:image}),[]);
 const onClosed=useRef(onClose);onClosed.current=onClose;
 const progress=useRef(new Animated.Value(0)).current,closing=useRef(false),entering=useRef(true),reducedMotion=useRef(false);
 const requestClose=()=>{if(continuous){onClose();return}if(closing.current)return;closing.current=true;gesture.current=null;progress.stopAnimation();if(reducedMotion.current){onClosed.current();return}Animated.timing(progress,{toValue:0,duration:220,easing:Easing.in(Easing.cubic),useNativeDriver:true}).start(({finished})=>{if(finished)onClosed.current()})};
 const close=useRef(requestClose);close.current=requestClose;
 const updateCamera=(next:Camera)=>{cameraRef.current=next;setCamera(next)};
 const normalized=(next:Camera):Camera=>{const {scene,size}=current.current,v=playerMapView(scene.bounds,size.width,size.height,next.zoom,next.focus);return{zoom:clampZoom(next.zoom),focus:{x:v.x+v.width/2,y:v.y+v.height/2}}};
 useEffect(()=>{if(continuous){entering.current=false;progress.setValue(1);return}let active=true;const ready=()=>{if(!active)return;entering.current=false;body.current?.measureInWindow((x,y)=>{origin.current={x,y}})};const enter=(reduce:boolean)=>{if(!active||closing.current)return;reducedMotion.current=reduce;if(reduce){progress.setValue(1);ready()}else Animated.timing(progress,{toValue:1,duration:420,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start(({finished})=>{if(finished)ready()})};void AccessibilityInfo.isReduceMotionEnabled().then(enter,()=>enter(false));return()=>{active=false;progress.stopAnimation()}},[progress]);

 useEffect(()=>{if(!active)return;const timer=setInterval(()=>{const w=world.current;if(!w)return;const next=sampleWorld(w);setSample(old=>old.world===next.world&&old.layout===next.layout&&old.scene===next.scene&&old.x===next.x&&old.y===next.y&&old.direction===next.direction&&old.waypoint===next.waypoint&&old.night===next.night&&old.fireLit===next.fireLit?old:next)},100);return()=>clearInterval(timer)},[world,active]);
 useEffect(()=>{const listener=BackHandler.addEventListener('hardwareBackPress',()=>{if(!active)return false;close.current();return true});return()=>listener.remove()},[active]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 useEffect(()=>{gesture.current=null;following.current=true;updateCamera({zoom:sample.scene?1:2.5,focus:{x:sample.x,y:sample.y}})},[scene.id]);
 useEffect(()=>{if(!continuous&&following.current&&!sample.scene&&cameraRef.current.zoom<outdoorMinimumZoom)updateCamera({...cameraRef.current,zoom:outdoorMinimumZoom})},[scene.id,sample.scene,outdoorMinimumZoom]);
 useEffect(()=>{if(following.current)updateCamera({...cameraRef.current,focus:continuous?.focus??{x:sample.x,y:sample.y}})},[sample.x,sample.y]);
 useEffect(()=>{gesture.current=null;body.current?.measureInWindow((x,y)=>{origin.current={x,y}})},[width,height,size.width,size.height]);

 const move=(event:GestureResponderEvent)=>{
  if(entering.current||closing.current)return;
  const next=touchState(event),previous=gesture.current;gesture.current=next;
  if(next)waypointTap.current.move(next.x,next.y,next.count);
  if(placingWaypoint&&waypointTap.current.pending)return;
  if(!next||!previous||next.count!==previous.count||continuous&&next.count!==1)return;
  following.current=false;
  const {scene,size}=current.current,cam=cameraRef.current,v=current.current.view;
  const anchor=unprojectMapPoint({x:previous.x-origin.current.x,y:previous.y-origin.current.y},v);
  const zoom=continuous?continuous.zoom:clampZoom(cam.zoom*(next.count===2&&previous.distance>1?next.distance/previous.distance:1));
  const scale=playerMapView(scene.bounds,size.width,size.height,zoom,undefined,Math.max(12,continuous?.entry??12)).scale;
  const nextCamera={zoom,focus:{x:anchor.x-(next.x-origin.current.x-size.width/2)/scale,y:anchor.y-(next.y-origin.current.y-size.height/2)/scale}};updateCamera(continuous?nextCamera:normalized(nextCamera));
 };
 const zoomBy=(factor:number)=>updateCamera(normalized({...cameraRef.current,zoom:clampZoom(cameraRef.current.zoom*factor)}));
 const findMe=()=>{const w=world.current;if(!w)return;following.current=true;updateCamera({zoom:Math.max(cameraRef.current.zoom,w.scene?1:outdoorMinimumZoom),focus:{x:w.player.x,y:w.player.y}})};
 const fit=()=>{following.current=false;updateCamera({zoom:1,focus:{x:scene.bounds.left+scene.bounds.width/2,y:scene.bounds.top+scene.bounds.height/2}})};
 const target=currentWaypoint(sample.world),targetPoint=target?projectMapPoint(target,view):null;
 const removeDestination=()=>{if(world.current){clearWaypoint(world.current);setPlacingWaypoint(false);setSample(sampleWorld(world.current))}};
 const finishWaypoint=(event:GestureResponderEvent)=>{const t=event.nativeEvent.changedTouches[0];if(placingWaypoint&&t&&!event.nativeEvent.touches.length&&waypointTap.current.end(t.identifier,t.pageX,t.pageY)&&world.current&&placeWaypoint(world.current,unprojectMapPoint({x:t.pageX-origin.current.x,y:t.pageY-origin.current.y},current.current.view))){setPlacingWaypoint(false);setSample(sampleWorld(world.current))}waypointTap.current.cancel();gesture.current=null};
 const pin=projectMapPoint({x:sample.x,y:sample.y},view),pinVisible=pin.x>=-20&&pin.x<=size.width+20&&pin.y>=-20&&pin.y<=size.height+20;
 const artReady=!!textures['camp-art'];
 const landmarks=playerMapLabels(features,view,size.width,size.height,camera.zoom,pin,artReady);
 const anyError=scene.images.some(image=>textures[image.id+'|'+image.url]===null)||features.illustrations.length>0&&textures['camp-art']===null,loading=scene.images.some(image=>!textures[image.id+'|'+image.url])||features.illustrations.length>0&&!textures['camp-art'];
 useEffect(()=>{const ready=!loading&&!anyError;onReady?.(ready);diagnostics?.trace(performance.now(),'native-map-ready',0,{ready,active});return()=>onReady?.(false)},[loading,anyError,onReady]);
 const compact=height<440;
 const mapButton=(label:string,action:()=>void,kind:'location'|'fit',active=false)=><Pressable accessibilityRole="button" accessibilityLabel={label} onPress={action} style={({pressed})=>[s.control,active&&s.primary,pressed&&s.pressed]}><ControlSymbol kind={kind}/><Text style={[s.controlText,active&&s.primaryText]}>{label}</Text></Pressable>;

 return <Animated.View pointerEvents={active?'auto':'none'} style={[s.overlay,{opacity:continuous?.opacity??progress}]}>
  {scene.images.map(image=><MapTextureLoader key={image.id+'|'+image.url+'|'+retry} textureKey={image.id+'|'+image.url} source={image.url===PLAYER_MAP_TERRAIN_URL?require('../public/maps/world-illustrated.webp'):BUNDLED_ART[image.url]??(image.url.startsWith('/')?WORLD_URL+image.url:image.url)} onImage={reportTexture} diagnostics={diagnostics}/>)}
  {features.illustrations.length>0&&<MapTextureLoader key={'camp-art|'+retry} textureKey="camp-art" source={require('../public/maps/camp-atlas-v2.webp')} onImage={reportTexture} diagnostics={diagnostics}/>}
  <Animated.View style={[s.panel,{borderWidth:0,borderRadius:0}]}>
   <View ref={body} style={s.map} onLayout={event=>{const {width,height}=event.nativeEvent.layout;gesture.current=null;setSize({width:Math.max(1,width),height:Math.max(1,height)});body.current?.measureInWindow((x,y)=>{origin.current={x,y}})}}>
    {active&&<Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
     <Rect x={0} y={0} width={size.width} height={size.height} color="#252b19"/>
     <Group transform={[{translateX:-view.x*view.scale},{translateY:-view.y*view.scale},{scale:view.scale}]} clip={{x:scene.bounds.left,y:scene.bounds.top,width:scene.bounds.width,height:scene.bounds.height}}>
      {scene.images.map(image=>{const decoded=textures[image.id+'|'+image.url];return decoded?<SkiaImage key={image.id} image={decoded} x={image.x} y={image.y} width={image.width} height={image.height} fit="fill"/>:null})}
      <Picture picture={geometry}/>
      {features.illustrations.length>0&&<MapIllustrations key={'camp-art|'+retry} features={features} bounds={scene.bounds} scale={view.scale} image={textures['camp-art']}/>}
     </Group>
     {sample.night>0&&<>
      <Rect x={0} y={0} width={size.width} height={size.height} color={PLAYER_MAP_NIGHT.tint} opacity={sample.night} blendMode="multiply"/>
      <Rect x={0} y={0} width={size.width} height={size.height} color={PLAYER_MAP_NIGHT.moonlight} opacity={sample.night*PLAYER_MAP_NIGHT.moonlightOpacity} blendMode="screen"/>
      {sample.fireLit&&features.illustrations.filter(item=>item.kind==='camp').map(fire=>{const p=projectMapPoint(fire,view),radius=Math.min(190,PLAYER_MAP_NIGHT.campRadius*view.scale);return <Circle key={fire.id} cx={p.x} cy={p.y} r={radius} opacity={sample.night*PLAYER_MAP_NIGHT.campOpacity}><RadialGradient c={p} r={radius} colors={['#ffb957','#efad6040','#efad6000']} positions={[0,.38,1]}/></Circle>})}
     </>}
     <Rect x={0} y={0} width={size.width} height={38}><LinearGradient start={{x:0,y:0}} end={{x:0,y:38}} colors={['#18210fe0','#18210f00']}/></Rect>
     <Rect x={0} y={size.height-38} width={size.width} height={38}><LinearGradient start={{x:0,y:size.height-38}} end={{x:0,y:size.height}} colors={['#18210f00','#18210fe0']}/></Rect>
     <Rect x={0} y={0} width={28} height={size.height}><LinearGradient start={{x:0,y:0}} end={{x:28,y:0}} colors={['#18210fc0','#18210f00']}/></Rect>
     <Rect x={size.width-28} y={0} width={28} height={size.height}><LinearGradient start={{x:size.width-28,y:0}} end={{x:size.width,y:0}} colors={['#18210f00','#18210fc0']}/></Rect>
     {sample.night>0&&<Rect x={0} y={0} width={size.width} height={size.height} opacity={sample.night}><RadialGradient c={{x:size.width/2,y:size.height/2}} r={Math.hypot(size.width,size.height)/2} colors={['#07132700','#07132700','#0713277a']} positions={[0,.36,1]}/></Rect>}
     {landmarks.filter(point=>!point.illustrated).map(point=><Group key={point.mark.id} transform={[{translateX:point.anchor.x},{translateY:point.anchor.y}]}><LandmarkSymbol kind={point.mark.kind}/></Group>)}
     {targetPoint&&<Group transform={[{translateX:targetPoint.x},{translateY:targetPoint.y-16}]}><Path path={WAYPOINT_PIN} color="#173f40"/><Path path={WAYPOINT_PIN} color="#e2bf75" style="stroke" strokeWidth={2}/><Circle cy={-6} r={4} color="#f4e6c7"/></Group>}
     {pinVisible&&<Group transform={[{translateX:pin.x},{translateY:pin.y}]}>
      <Group transform={[{rotate:playerMapHeading(sample.direction)*Math.PI/180}]}><Path path={PLAYER_MAP_MARKER.pointer} color="#f7e9bd"/><Path path={PLAYER_MAP_MARKER.pointer} color="#173c38" style="stroke" strokeWidth={1.5} strokeJoin="round"/></Group>
      <Circle r={PLAYER_MAP_MARKER.size/2} color="#123b3c"/>
      {portrait?<SkiaImage image={portrait} x={-PLAYER_MAP_MARKER.size/2} y={-PLAYER_MAP_MARKER.size/2} width={PLAYER_MAP_MARKER.size} height={PLAYER_MAP_MARKER.size} fit="contain"/>:<Circle r={21} color="#bb9555" style="stroke" strokeWidth={2}/>}
     </Group>}
    </Canvas>}
    <View style={StyleSheet.absoluteFill} onTouchStart={e=>{onTouchStart?.(e);if(e.nativeEvent.touches.length>1)waypointTap.current.cancel()}} onStartShouldSetResponder={()=>!entering.current&&!closing.current} onMoveShouldSetResponder={()=>!entering.current&&!closing.current} onResponderTerminationRequest={()=>true} onResponderGrant={event=>{const t=touchState(event);gesture.current=t;if(placingWaypoint&&t)waypointTap.current.begin(event.nativeEvent.touches[0].identifier,t.x,t.y,t.count)}} onResponderMove={move} onResponderEnd={event=>{gesture.current=touchState(event)}} onResponderRelease={finishWaypoint} onResponderTerminate={()=>{gesture.current=null;waypointTap.current.cancel()}}/>
    {landmarks.map(({mark,box,opacity})=>box&&<View pointerEvents="none" key={mark.id} style={[s.landmark,{left:box.left,width:box.width,top:box.top,opacity}]}><Text numberOfLines={1} style={[s.landmarkText,{color:playerMapInk(sample.night),textShadowColor:`rgba(3,15,27,${Math.min(1,sample.night*3)})`,textShadowOffset:{width:0,height:1},textShadowRadius:2}]}>{mark.label}</Text></View>)}
    {targetPoint&&<View pointerEvents="none" style={[s.waypointLabel,{left:targetPoint.x-34,top:targetPoint.y+6}]}><Text style={s.waypointText}>WAYPOINT</Text></View>}
    {pinVisible&&<View pointerEvents="none" accessible accessibilityRole="image" accessibilityLabel={`Your location. Facing ${headingNames[sample.direction]}.`} style={{position:'absolute',left:pin.x-22,top:pin.y-22,width:44,height:44}}/>}
    {anyError?<View style={s.textureNotice}><Text style={s.textureText}>Map artwork couldn’t load.</Text><Pressable accessibilityRole="button" accessibilityLabel="Retry loading map artwork" onPress={()=>{setTextures({});setRetry(value=>value+1)}} style={s.retry}><Text style={s.controlText}>Retry</Text></Pressable></View>:loading?<View pointerEvents="none" style={s.textureNotice}><Text style={s.textureText}>Loading map…</Text></View>:null}
   </View>
   <Pressable accessibilityRole="button" accessibilityLabel="Exit map" onPress={requestClose} style={({pressed})=>[s.close,{position:'absolute',top:Math.max(12,safe.top),right:Math.max(12,safe.right)},pressed&&{opacity:.8}]}><Canvas pointerEvents="none" style={{width:44,height:44}}><Circle cx={22} cy={22} r={21}><LinearGradient start={{x:8,y:5}} end={{x:35,y:42}} colors={['#26565a','#0b3034']}/></Circle><Circle cx={22} cy={22} r={21} color="#edcb83" style="stroke" strokeWidth={1}/><Circle cx={22} cy={22} r={19} color="#123134" style="stroke" strokeWidth={1}/><Path path="M15 15L29 29M29 15L15 29" color="#f6e7bb" style="stroke" strokeWidth={3.5} strokeCap="round"/><Path path="M34 2L41 9M32 4L37 9" color="#d18442" style="stroke" strokeWidth={2.2} strokeCap="round"/></Canvas></Pressable>
   <MapAction kind="place" label={placingWaypoint?'Cancel waypoint placement':'Place waypoint'} selected={placingWaypoint} top={Math.max(12,safe.top)+58} right={Math.max(12,safe.right)} onPress={()=>{waypointTap.current.cancel();setPlacingWaypoint(v=>!v)}}/>
   {sample.waypoint&&<MapAction kind="clear" label="Remove waypoint" top={Math.max(12,safe.top)+116} right={Math.max(12,safe.right)} onPress={removeDestination}/>}
   {placingWaypoint&&<View pointerEvents="none" style={[s.placementHint,{top:Math.max(12,safe.top)+62,right:Math.max(12,safe.right)+64}]}><Text style={s.placementText}>Tap a spot to set your waypoint</Text></View>}
  </Animated.View>
 </Animated.View>;
}

const s=StyleSheet.create({
 waypointLabel:{position:'absolute',width:68,paddingVertical:3,borderWidth:1,borderColor:'#b99355',borderRadius:5,backgroundColor:'#123b3de8'},waypointText:{fontFamily:atlasFont,fontSize:11,color:'#f4e6c7',textAlign:'center'},placementHint:{position:'absolute',maxWidth:180,paddingVertical:9,paddingHorizontal:13,borderWidth:1,borderColor:'#bd985a',borderRadius:9,backgroundColor:'#143b3ef2'},placementText:{fontFamily:atlasFont,fontSize:13,lineHeight:16,color:'#f4e6c7'},
 overlay:{position:'absolute',top:0,right:0,bottom:0,left:0,backgroundColor:'#080b09f5',zIndex:100},panel:{flex:1,overflow:'hidden',borderRadius:3,borderWidth:1,borderColor:'#75694d',backgroundColor:'#222a18'},
 header:{minHeight:70,paddingHorizontal:20,paddingVertical:12,flexDirection:'row',alignItems:'center',gap:12,borderBottomWidth:1,borderBottomColor:'#a1936b3b',backgroundColor:'#222a18'},headerCompact:{minHeight:55,paddingVertical:7},heading:{flex:1,minWidth:0},eyebrow:{fontFamily:'FieldKitBarlow',fontSize:8,letterSpacing:2.6,color:'#a99d7a'},title:{fontFamily:atlasFont,fontSize:25,letterSpacing:1,color:'#f0e7ce',marginTop:4},titleCompact:{fontSize:21,marginTop:2},status:{alignItems:'flex-end',gap:6},statusText:{fontFamily:'FieldKitBarlow',fontSize:8,letterSpacing:1.8,color:'#c7bd9a'},paused:{fontFamily:atlasFont,fontSize:9,fontStyle:'italic',color:'#b1ad87'},close:{width:48,height:48,alignItems:'center',justifyContent:'center',borderRadius:24,borderWidth:2,borderColor:'#bb9555',backgroundColor:'#123b3c',shadowColor:'#172c25',shadowOffset:{width:0,height:2},shadowOpacity:.4,shadowRadius:3,elevation:3},closeText:{fontFamily:atlasFont,fontSize:28,lineHeight:32,color:'#dfd5b8'},
 map:{flex:1,minHeight:80,overflow:'hidden',backgroundColor:'#252d19'},compass:{position:'absolute',top:17,alignItems:'center',width:76,height:83,paddingTop:8},compassText:{position:'absolute',top:0,fontFamily:atlasFont,fontSize:12,color:'#f0e5c6',textShadowColor:'#0c110b',textShadowOffset:{width:0,height:1},textShadowRadius:4},compassWest:{position:'absolute',left:0,top:36,fontFamily:atlasFont,fontSize:8,color:'#c8bb94',textShadowColor:'#0c110b',textShadowOffset:{width:0,height:1},textShadowRadius:3},compassEast:{position:'absolute',right:0,top:36,fontFamily:atlasFont,fontSize:8,color:'#c8bb94',textShadowColor:'#0c110b',textShadowOffset:{width:0,height:1},textShadowRadius:3},compassSouth:{position:'absolute',bottom:0,fontFamily:atlasFont,fontSize:8,color:'#c8bb94',textShadowColor:'#0c110b',textShadowOffset:{width:0,height:1},textShadowRadius:3},
 landmark:{position:'absolute',alignItems:'center'},landmarkText:{fontFamily:atlasFont,fontSize:13,lineHeight:15,letterSpacing:.35,textTransform:'uppercase',color:'#193d36',textAlign:'center'},you:{position:'absolute',width:64,alignItems:'center'},youText:{fontFamily:atlasFont,fontSize:9,letterSpacing:3,color:'#fff3d0',textShadowColor:'#080d06',textShadowOffset:{width:0,height:1},textShadowRadius:4,paddingVertical:2},
 zoomControls:{position:'absolute',bottom:16,overflow:'hidden',borderRadius:2,borderWidth:1,borderColor:'#94846180',backgroundColor:'#27321adc'},zoom:{width:44,height:44,alignItems:'center',justifyContent:'center'},zoomText:{fontFamily:atlasFont,fontSize:25,lineHeight:30,color:'#e5dabd'},zoomDivider:{height:1,marginHorizontal:9,backgroundColor:'#a7986a44'},disabled:{opacity:.3},
 footer:{paddingHorizontal:16,paddingVertical:10,borderTopWidth:1,borderTopColor:'#a1936b3b',gap:9,backgroundColor:'#222a18'},footerCompact:{paddingVertical:7},toolbar:{flexDirection:'row',alignItems:'center',gap:10},control:{minHeight:44,paddingHorizontal:11,paddingVertical:9,flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center',borderRadius:2,borderWidth:1,borderColor:'#a89a6d35',backgroundColor:'#21301444'},controlText:{fontFamily:atlasFont,fontSize:11,letterSpacing:.7,color:'#d5ccaf'},primary:{backgroundColor:'#b19d5e0b',borderColor:'#b5a37370'},primaryText:{color:'#f0e4c4'},pressed:{opacity:.65},zoomValue:{marginLeft:'auto',fontFamily:atlasFont,fontSize:12,color:'#c4b78c',fontVariant:['tabular-nums']},footerDetails:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10},hint:{fontFamily:'FieldKitBarlow',fontSize:8,letterSpacing:1,color:'#a4a67b'},facing:{fontFamily:atlasFont,fontSize:9,fontStyle:'italic',textTransform:'capitalize',color:'#c3b694'},textureNotice:{position:'absolute',left:16,bottom:16,paddingHorizontal:12,paddingVertical:7,borderRadius:2,borderWidth:1,borderColor:'#9f91624d',backgroundColor:'#29361beb',flexDirection:'row',alignItems:'center',gap:8,maxWidth:'76%'},textureText:{fontFamily:atlasFont,fontSize:11,color:'#dfd4b8'},retry:{minHeight:32,paddingHorizontal:6,alignItems:'center',justifyContent:'center'},
 insetFrame:{position:'absolute',top:5,right:5,bottom:5,left:5,borderWidth:1,borderColor:'#b3a27220'},corner:{position:'absolute',width:13,height:13,borderColor:'#c4b17c',opacity:.7},cornerNW:{left:5,top:5,borderLeftWidth:1,borderTopWidth:1},cornerNE:{right:5,top:5,borderRightWidth:1,borderTopWidth:1},cornerSW:{left:5,bottom:5,borderLeftWidth:1,borderBottomWidth:1},cornerSE:{right:5,bottom:5,borderRightWidth:1,borderBottomWidth:1},
});

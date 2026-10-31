import React,{useEffect,useLayoutEffect,useId,useMemo,useRef,useState,type RefObject,type CSSProperties} from 'react';
import {Archive,Crosshair,DoorClosed,Droplets,Expand,House,Map as MapIcon,Minus,Plus,Tent,Warehouse,X,MapPinPlus,Trash2} from 'lucide-react';
import type {Direction,Vec,World} from './survival-engine';
import {playerMapFeatures,playerMapHeading,playerMapScene,playerMapView,projectMapPoint,unprojectMapPoint} from './player-map';
import {loadPlayerMapImage,prefetchPlayerMapImages} from './player-map-images';
import {PLAYER_MAP_ART_URL,PLAYER_MAP_MARKER,PLAYER_MAP_PORTRAIT_URL,mapArtDisplayFactor} from './player-map-art';
import {playerMapLabels} from './player-map-labels';
import {PLAYER_MAP_NIGHT,playerMapNightAmount,playerMapInk} from './player-map-lighting';
import {clearWaypoint,currentWaypoint,placeWaypoint,WaypointTap,WAYPOINT_PIN} from './waypoint';
import './player-map.css';

type Props={world:RefObject<World>;open:boolean;onClose:()=>void;continuous?:{zoom:number;entry:number;opacity:number;focus:Vec}};
type Position={world:World;layout:World['layout'];scene:World['scene'];x:number;y:number;direction:Direction;waypoint:World['waypoint'];night:number;fireLit:boolean};
const readPosition=(world:World):Position=>({world,layout:world.layout,scene:world.scene,x:world.player.x,y:world.player.y,direction:world.player.direction,waypoint:world.waypoint,night:playerMapNightAmount(world),fireLit:world.camp.hearth.fuel>0});
const clampZoom=(zoom:number)=>Math.max(1,Math.min(12,zoom));
const headingName=(direction:Direction)=>({'up':'N','up-right':'NE','right':'E','down-right':'SE','down':'S','down-left':'SW','left':'W','up-left':'NW'}[direction]);
export function preloadPlayerMap(world:World){prefetchPlayerMapImages([...playerMapScene(world).images.map(image=>image.url),...(!world.scene?[PLAYER_MAP_ART_URL]:[]),PLAYER_MAP_PORTRAIT_URL])}

/** The map owns its camera. Its terrain and marker share the game's world units. */
export default function PlayerMap({world,open,onClose,continuous}:Props){
 return <div className="player-map-dialog live-atlas" style={{display:open?'block':'none',opacity:continuous?.opacity??1}} role="region" aria-label="World map">
  {open&&<PlayerMapContent open={open} world={world} onClose={onClose} titleId="world-map" continuous={continuous}/>}
 </div>;
}

function PlayerMapContent({world,onClose,continuous}:Props&{titleId:string}){
 const [position,setPosition]=useState(()=>readPosition(world.current));
 const [placingWaypoint,setPlacingWaypoint]=useState(false),waypointTap=useRef(new WaypointTap());
 const model=useMemo(()=>playerMapScene(position.world),[position.world,position.scene,position.layout]);
 const features=useMemo(()=>playerMapFeatures(position.layout),[position.layout]);
 const [size,setSize]=useState({width:1,height:1});
 const [localCamera,setCamera]=useState(()=>({zoom:world.current.scene?1:2.5,focus:{x:world.current.player.x,y:world.current.player.y}}));
 const [following,setFollowing]=useState(true),[imageRevision,setImageRevision]=useState(0),[imageFailed,setImageFailed]=useState(false);
 const viewport=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),images=useRef(new Map<string,HTMLImageElement>());
 const fingers=useRef(new Map<number,Vec>()),gesture=useRef<{center:Vec;distance:number;view:ReturnType<typeof playerMapView>;zoom:number}|null>(null);
 const sceneId=useRef(model.id);
 useEffect(()=>{setPlacingWaypoint(false);waypointTap.current.cancel()},[position.world,position.scene]);
 const camera=continuous?{zoom:continuous.zoom,focus:localCamera.focus}:localCamera;
 const cameraRef=useRef(camera);cameraRef.current=camera;
 const focus=continuous?{x:continuous.focus.x+(following?0:(camera.focus.x-continuous.focus.x)*continuous.opacity),y:continuous.focus.y+(following?0:(camera.focus.y-continuous.focus.y)*continuous.opacity)}:following?position:camera.focus;
 const view=playerMapView(model.bounds,size.width,size.height,camera.zoom,focus,Math.max(12,continuous?.entry??12));
 const fitScale=playerMapView(model.bounds,size.width,size.height,1).scale;
 const locateZoom=position.scene?1:clampZoom(Math.max(2.5,Math.max(size.width/model.bounds.width,size.height/model.bounds.height)/fitScale));
 const viewRef=useRef(view);viewRef.current=view;
 const point=projectMapPoint(position,view);
 const paths=useMemo(()=>features.paths.map(feature=>({...feature,shape:new Path2D(feature.path)})),[features]);
 const footprint=useMemo(()=>{const shape=new Path2D();for(const polygon of model.footprint){if(!polygon.length)continue;shape.moveTo(polygon[0].x,polygon[0].y);for(const p of polygon.slice(1))shape.lineTo(p.x,p.y);shape.closePath()}return shape},[model]);

 useEffect(()=>{const sample=()=>{const next=readPosition(world.current);setPosition(old=>old.world===next.world&&old.layout===next.layout&&old.scene===next.scene&&old.x===next.x&&old.y===next.y&&old.direction===next.direction&&old.waypoint===next.waypoint&&old.night===next.night&&old.fireLit===next.fireLit?old:next)};sample();const timer=setInterval(sample,50);return()=>clearInterval(timer)},[world]);
 useEffect(()=>{if(sceneId.current===model.id)return;sceneId.current=model.id;setCamera({zoom:position.world.scene?1:2.5,focus:{x:position.x,y:position.y}});setFollowing(true);fingers.current.clear();gesture.current=null},[model.id]);
 // Layout dimensions exclude the dialog's entrance transform. Measuring its
 // animated bounding box stretches only the canvas and makes DOM pins drift.
 useLayoutEffect(()=>{const el=viewport.current;if(!el)return;const measure=(width:number,height:number)=>{if(width>0&&height>0)setSize(old=>old.width===width&&old.height===height?old:{width,height})};measure(el.clientWidth,el.clientHeight);const observer=new ResizeObserver(([entry])=>{if(entry)measure(entry.contentRect.width,entry.contentRect.height)});observer.observe(el);return()=>observer.disconnect()},[]);
 useEffect(()=>{for(const id of fingers.current.keys()){if(viewport.current?.hasPointerCapture(id))viewport.current.releasePointerCapture(id)}fingers.current.clear();gesture.current=null},[size.width,size.height]);
 useEffect(()=>{if(continuous||!following||position.scene||size.width<=1||size.height<=1)return;setCamera(old=>old.zoom>=locateZoom?old:{...old,zoom:locateZoom})},[following,position.scene,size.width,size.height,locateZoom]);
 useEffect(()=>{let active=true;setImageFailed(false);images.current.clear();for(const item of [...model.images,...(features.illustrations.length?[{id:'camp-art',url:PLAYER_MAP_ART_URL}]:[])])void loadPlayerMapImage(item.url).then(img=>{if(!active)return;images.current.set(item.id,img);setImageRevision(n=>n+1)},()=>{if(active)setImageFailed(true)});return()=>{active=false}},[model,features]);

 // Only repaint the terrain when its camera/assets/lighting change. The facing arrow is
 // a separate overlay, so live marker sampling never decodes or reloads textures.
 useLayoutEffect(()=>{
  const el=canvas.current;if(!el||size.width<=1||size.height<=1)return;
  const ratio=Math.min(devicePixelRatio||1,2);el.width=Math.round(size.width*ratio);el.height=Math.round(size.height*ratio);
  const ctx=el.getContext('2d');if(!ctx)return;ctx.setTransform(el.width/size.width,0,0,el.height/size.height,0,0);ctx.clearRect(0,0,size.width,size.height);
  ctx.fillStyle='#252b19';ctx.fillRect(0,0,size.width,size.height);
  ctx.save();ctx.scale(view.scale,view.scale);ctx.translate(-view.x,-view.y);
  ctx.fillStyle='#c3ad79';ctx.fill(footprint);ctx.save();ctx.clip(footprint);
  for(const item of model.images){const img=images.current.get(item.id);if(img)ctx.drawImage(img,item.x,item.y,item.width,item.height)}
  // Engraved symbols follow the live placements over the illustrated atlas.
  for(const item of paths){ctx.fillStyle=item.fill;ctx.fill(item.shape);if(item.stroke){ctx.strokeStyle=item.stroke;ctx.lineWidth=item.strokeWidth??1;ctx.stroke(item.shape)}}
  const art=images.current.get('camp-art');
  if(art)for(const item of features.illustrations){
   const source=item.source,factor=mapArtDisplayFactor(item,view.scale);
   ctx.save();ctx.translate(item.x,item.y);ctx.rotate(item.rotation);ctx.scale((item.flipX?-1:1)*factor,(item.flipY?-1:1)*factor);
   ctx.drawImage(art,source.x,source.y,source.width,source.height,-item.width/2,-item.height/2,item.width,item.height);ctx.restore();
  }
  ctx.restore();ctx.strokeStyle='#c7b27866';ctx.lineWidth=1/view.scale;ctx.stroke(footprint);ctx.restore();
  if(position.night>0){
   // Two flat colour passes reuse the decoded artwork and engraved geometry.
   // Labels, controls and navigation pins are separate, unaffected overlays.
   ctx.save();ctx.globalCompositeOperation='multiply';ctx.globalAlpha=position.night;ctx.fillStyle=PLAYER_MAP_NIGHT.tint;ctx.fillRect(0,0,size.width,size.height);
   ctx.globalCompositeOperation='screen';ctx.globalAlpha=position.night*PLAYER_MAP_NIGHT.moonlightOpacity;ctx.fillStyle=PLAYER_MAP_NIGHT.moonlight;ctx.fillRect(0,0,size.width,size.height);
   if(position.fireLit)for(const fire of features.illustrations.filter(item=>item.kind==='camp')){
    const p=projectMapPoint(fire,view),radius=Math.min(190,PLAYER_MAP_NIGHT.campRadius*view.scale);
    const glow=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,radius);glow.addColorStop(0,'#ffb957');glow.addColorStop(.38,'#efad6040');glow.addColorStop(1,'#efad6000');
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=position.night*PLAYER_MAP_NIGHT.campOpacity;ctx.fillStyle=glow;ctx.fillRect(p.x-radius,p.y-radius,radius*2,radius*2);
   }
   ctx.restore();
  }
 },[model,features,paths,footprint,size,view.x,view.y,view.scale,imageRevision,position.night,position.fireLit]);

 const centerOfView=()=>({x:viewRef.current.x+size.width/viewRef.current.scale/2,y:viewRef.current.y+size.height/viewRef.current.scale/2});
 const zoomBy=(factor:number,anchor?:Vec)=>{
  const oldView=viewRef.current,nextZoom=clampZoom(cameraRef.current.zoom*factor),pixel=anchor??{x:size.width/2,y:size.height/2};
  const worldPoint=unprojectMapPoint(pixel,oldView),scale=oldView.scale*nextZoom/cameraRef.current.zoom;
  setFollowing(false);setCamera({zoom:nextZoom,focus:{x:worldPoint.x+(size.width/2-pixel.x)/scale,y:worldPoint.y+(size.height/2-pixel.y)/scale}});
 };
 const locate=()=>{setFollowing(true);setCamera(old=>({zoom:Math.max(old.zoom,locateZoom),focus:{x:world.current.player.x,y:world.current.player.y}}))};
 const fit=()=>{setFollowing(false);setCamera({zoom:1,focus:{x:model.bounds.left+model.bounds.width/2,y:model.bounds.top+model.bounds.height/2}})};
 const local=(e:{clientX:number;clientY:number})=>{const r=viewport.current!.getBoundingClientRect();return{x:(e.clientX-r.left)*size.width/r.width,y:(e.clientY-r.top)*size.height/r.height}};
 const beginGesture=()=>{const values=[...fingers.current.values()];if(!values.length){gesture.current=null;return}const center=values.length>1?{x:(values[0].x+values[1].x)/2,y:(values[0].y+values[1].y)/2}:values[0];gesture.current={center,distance:values.length>1?Math.hypot(values[0].x-values[1].x,values[0].y-values[1].y):0,view:viewRef.current,zoom:cameraRef.current.zoom}};
 // A pinch is captured by the stable game root. Its releases may never
 // reach this viewport; clean those contacts here before the next map tap.
 useEffect(()=>{
  const release=(e:PointerEvent)=>{if(viewport.current?.contains(e.target as Node))return;fingers.current.delete(e.pointerId);waypointTap.current.cancel();beginGesture()};
  const reset=()=>{fingers.current.clear();gesture.current=null;waypointTap.current.cancel()};
  window.addEventListener('pointerup',release,true);window.addEventListener('pointercancel',release,true);window.addEventListener('blur',reset);
  return()=>{window.removeEventListener('pointerup',release,true);window.removeEventListener('pointercancel',release,true);window.removeEventListener('blur',reset)};
 },[]);
 useEffect(()=>{waypointTap.current.cancel()},[view.scale]);
 const end=(e:React.PointerEvent)=>{fingers.current.delete(e.pointerId);beginGesture()};
 const move=(e:React.PointerEvent)=>{
  if(!fingers.current.has(e.pointerId)||!gesture.current)return;e.preventDefault();fingers.current.set(e.pointerId,local(e));
  const here=local(e);waypointTap.current.move(here.x,here.y,fingers.current.size);
  if(placingWaypoint&&waypointTap.current.pending)return;
  const values=[...fingers.current.values()],g=gesture.current;if(continuous&&values.length!==1)return;
  const center=values.length>1?{x:(values[0].x+values[1].x)/2,y:(values[0].y+values[1].y)/2}:values[0];
  const distance=values.length>1?Math.hypot(values[0].x-values[1].x,values[0].y-values[1].y):0;
  const zoom=continuous?continuous.zoom:clampZoom(g.distance>0&&distance>0?g.zoom*distance/g.distance:g.zoom),scale=g.view.scale*zoom/g.zoom;
  const anchor=unprojectMapPoint(g.center,g.view);
  setFollowing(false);setCamera({zoom,focus:{x:anchor.x+(size.width/2-center.x)/scale,y:anchor.y+(size.height/2-center.y)/scale}});
 };
 useEffect(()=>{const el=viewport.current;if(!el||continuous)return;const wheel=(e:WheelEvent)=>{e.preventDefault();zoomBy(Math.exp(-e.deltaY*.0015),local(e))};el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel)},[size,continuous]);
 const target=currentWaypoint(position.world),targetPoint=target?projectMapPoint(target,view):null;
 const setDestination=(pixel:Vec)=>{if(placeWaypoint(world.current,unprojectMapPoint(pixel,viewRef.current))){setPlacingWaypoint(false);setPosition(readPosition(world.current))}};
 const removeDestination=()=>{clearWaypoint(world.current);setPlacingWaypoint(false);setPosition(readPosition(world.current))};
 const within=point.x>=-20&&point.y>=-20&&point.x<=size.width+20&&point.y<=size.height+20;
 const currentHeading=headingName(position.direction);
 const artReady=images.current.has('camp-art');
 const visibleLandmarks=playerMapLabels(features,view,size.width,size.height,camera.zoom,point,artReady);

 return <section className="player-map-shell" data-night={position.night.toFixed(3)} style={{'--map-night':position.night,'--map-ink':playerMapInk(position.night),'--map-caption-shadow':`rgba(3,15,27,${Math.min(1,position.night*3)})`} as CSSProperties}>
  <button type="button" className="player-map-close" aria-label="Exit map" title="Exit map (M / Esc)" onClick={onClose}><X size={22} strokeWidth={3}/><span className="player-map-close-binding" aria-hidden="true"/></button>
  <button type="button" className="player-map-close player-map-place" aria-label={placingWaypoint?'Cancel waypoint placement':'Place waypoint'} aria-pressed={placingWaypoint} title="Place waypoint" onPointerDown={e=>e.stopPropagation()} onClick={()=>{waypointTap.current.cancel();setPlacingWaypoint(v=>!v)}}><MapPinPlus size={23}/><span className="player-map-close-binding" aria-hidden="true"/></button>
  {position.waypoint&&<button type="button" className="player-map-close player-map-clear" aria-label="Remove waypoint" title="Remove waypoint" onPointerDown={e=>e.stopPropagation()} onClick={removeDestination}><Trash2 size={20}/></button>}
  {placingWaypoint&&<div className="player-map-placement-hint" role="status">Tap a spot to set your waypoint</div>}
  <div ref={viewport} className={`player-map-viewport${placingWaypoint?' is-placing-waypoint':''}`} aria-label={`Map of ${model.name}. You are facing ${currentHeading}. Drag to explore; pinch or scroll to zoom.`} tabIndex={0}
   onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();if(!continuous||!e.currentTarget.closest('.we-world')?.hasPointerCapture(e.pointerId))e.currentTarget.setPointerCapture(e.pointerId);const p=local(e);if(e.isPrimary){fingers.current.clear();gesture.current=null;waypointTap.current.cancel()}fingers.current.set(e.pointerId,p);if(placingWaypoint)waypointTap.current.begin(e.pointerId,p.x,p.y,fingers.current.size);beginGesture()}} onPointerMove={move} onPointerUp={e=>{const p=local(e);if(placingWaypoint&&fingers.current.size===1&&waypointTap.current.end(e.pointerId,p.x,p.y))setDestination(p);end(e)}} onPointerCancel={e=>{waypointTap.current.cancel();end(e)}} onLostPointerCapture={e=>{waypointTap.current.cancel();end(e)}} onContextMenu={e=>e.preventDefault()}
   onKeyDown={e=>{if(placingWaypoint&&(e.key==='Enter'||e.key==='Escape')){e.preventDefault();e.stopPropagation();if(e.key==='Enter')setDestination({x:size.width/2,y:size.height/2});else setPlacingWaypoint(false);return}if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','+','=','-','0','f','F'].includes(e.key)){e.preventDefault();e.stopPropagation();if(e.key==='+'||e.key==='=')zoomBy(1.4);else if(e.key==='-')zoomBy(1/1.4);else if(e.key==='0')fit();else if(e.key.toLowerCase()==='f')locate();else{const center=centerOfView(),step=80/view.scale;setFollowing(false);setCamera(old=>({...old,focus:{x:center.x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),y:center.y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0)}}))}}}}>
   <canvas ref={canvas} aria-hidden="true"/>
   <div className="player-map-grid" aria-hidden="true"/>
   {visibleLandmarks.map(({mark,anchor,box,illustrated,opacity})=>{const Icon={camp:Tent,well:Droplets,bunker:DoorClosed,headquarters:House,storage:Archive,building:Warehouse}[mark.kind];return <React.Fragment key={mark.id}>{!illustrated&&<div className={`player-map-landmark player-map-landmark-${mark.kind}`} style={{left:anchor.x,top:anchor.y}} title={mark.label}><span><Icon size={mark.kind==='camp'?23:19} strokeWidth={1.6}/></span></div>}{box&&<b className="player-map-caption" style={{left:box.left,top:box.top,width:box.width,opacity}}>{mark.label}</b>}</React.Fragment>})}
   {targetPoint&&<div className="player-map-waypoint" style={{left:targetPoint.x,top:targetPoint.y}} role="img" aria-label="Your waypoint"><svg viewBox="-20 -24 40 48" aria-hidden="true"><path d={WAYPOINT_PIN} fill="#173f40" stroke="#e2bf75" strokeWidth="2"/><circle cy={-6} r={4} fill="#f4e6c7"/></svg><b>WAYPOINT</b></div>}
   {within&&<div className="player-map-player" data-heading={currentHeading} style={{left:point.x,top:point.y,width:PLAYER_MAP_MARKER.size,height:PLAYER_MAP_MARKER.size}} role="img" aria-label={`Your location. Facing ${currentHeading}.`}><svg className="player-map-heading" viewBox="-34 -34 68 68" style={{transform:`rotate(${playerMapHeading(position.direction)}deg)`}} aria-hidden="true"><path d={PLAYER_MAP_MARKER.pointer} fill="#f7e9bd" stroke="#173c38" strokeWidth="1.5" strokeLinejoin="round"/></svg><img className="player-map-portrait" src={PLAYER_MAP_PORTRAIT_URL} width={PLAYER_MAP_MARKER.size} height={PLAYER_MAP_MARKER.size} alt="" draggable={false}/></div>}
   {imageFailed&&<div className="player-map-image-note" role="status">Some map artwork couldn’t load. Your location and landmarks are still shown.</div>}
   {!imageFailed&&model.images.length>0&&images.current.size===0&&<div className="player-map-image-note" role="status">Unfolding the atlas…</div>}
  </div>
 </section>;
}

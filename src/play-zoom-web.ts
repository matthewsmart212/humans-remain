import {PlayPinchZoom,MIN_PLAY_ZOOM} from './play-zoom';

export function attachPlayZoom(canvas:HTMLCanvasElement,options:{enabled:()=>boolean;getZoom:()=>number;setZoom:(zoom:number)=>void;onMinimumZoom?:()=>void;onPinchStart?:()=>void;touchRoot?:HTMLElement;minimumZoom?:()=>number;mapActive?:()=>boolean;animateZoom?:(zoom:number)=>void;onGestureEnd?:(interrupted:boolean)=>void}){
 const root=options.touchRoot??canvas.parentElement??canvas;
 const pointers=new Map<number,{id:number;x:number;y:number}>(),pinch=new PlayPinchZoom();
 let wheelTarget:number|null=null,wheelTime=0,wheelEnd:ReturnType<typeof setTimeout>|undefined;
 let safariScale:number|null=null,safariOwnsGesture=false,movementBlocked=false;
 const playTarget=(e:Event)=>e.target===canvas||!!(e.target as Element|null)?.closest?.('.kit-movement-region, .player-map-viewport');
 const reset=(notify:boolean)=>{const wasPinching=movementBlocked||safariOwnsGesture;clearTimeout(wheelEnd);wheelTarget=null;pointers.clear();pinch.cancel();safariScale=null;safariOwnsGesture=false;movementBlocked=false;if(notify&&wasPinching&&options.enabled())options.onGestureEnd?.(true)};
 const cancel=()=>reset(true);
 const down=(e:PointerEvent)=>{
  if(!options.enabled()){cancel();return}if(e.pointerType!=='touch'||!playTarget(e))return;clearTimeout(wheelEnd);wheelTarget=null;
  pinch.setMinimum(options.minimumZoom?.()??MIN_PLAY_ZOOM);
  pointers.set(e.pointerId,{id:e.pointerId,x:e.clientX,y:e.clientY});
  // Capture the pair on a stable ancestor before either HUD/map can disappear.
  // A lone movement touch keeps its own capture until a second finger arrives.
  if(e.target===canvas)canvas.setPointerCapture(e.pointerId);
  if(pointers.size>=2){for(const id of pointers.keys())root.setPointerCapture(id);safariOwnsGesture=false;if(!movementBlocked){movementBlocked=true;options.onPinchStart?.()}}
  pinch.update([...pointers.values()],options.getZoom());
 };
 const move=(e:PointerEvent)=>{
  if(!options.enabled()){cancel();return}if(!pointers.has(e.pointerId))return;
  pointers.set(e.pointerId,{id:e.pointerId,x:e.clientX,y:e.clientY});
  if(pointers.size!==2){pinch.cancel();return}e.preventDefault();
  options.setZoom(pinch.update([...pointers.values()],options.getZoom()));
  if(pinch.takeMapRequest()&&!options.minimumZoom)options.onMinimumZoom?.();
 };
 const up=(e:PointerEvent)=>{if(e.type==='lostpointercapture'&&root.hasPointerCapture(e.pointerId))return;pointers.delete(e.pointerId);pinch.update([...pointers.values()],options.getZoom());if(!pointers.size){const completed=movementBlocked;movementBlocked=false;if(completed&&options.enabled())options.onGestureEnd?.(e.type!=='pointerup')}};
 const applyScale=(factor:number)=>{const current=options.getZoom(),proposed=current*factor;options.setZoom(Math.max(options.minimumZoom?.()??MIN_PLAY_ZOOM,Math.min(1,proposed)));if(!options.minimumZoom&&factor<1&&proposed<=MIN_PLAY_ZOOM)options.onMinimumZoom?.()};
 const wheel=(e:WheelEvent)=>{
  if(!options.enabled()||(!options.minimumZoom&&!e.ctrlKey&&!options.mapActive?.())||!playTarget(e))return;
  e.preventDefault();if(safariScale!==null)return;clearTimeout(wheelEnd);wheelEnd=setTimeout(()=>{wheelTarget=null;if(options.enabled())options.onGestureEnd?.(false)},350);
  pinch.cancel();const pixels=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?canvas.clientHeight:1);
  const factor=Math.exp(-pixels*(e.ctrlKey?.01:.002));
  if(options.animateZoom){const now=performance.now(),base=wheelTarget!==null&&now-wheelTime<350?wheelTarget:options.getZoom();wheelTime=now;wheelTarget=Math.max(options.minimumZoom?.()??MIN_PLAY_ZOOM,Math.min(1,base*factor));options.animateZoom(wheelTarget)}else applyScale(factor);
 };
 // Safari trackpads can send GestureEvents instead of Ctrl+wheel. Touchscreen
 // PointerEvents own their gesture when both mechanisms are present.
 const safariStart=(e:Event)=>{if(!options.enabled()||!playTarget(e))return;e.preventDefault();safariScale=1;safariOwnsGesture=pointers.size===0};
 const safariMove=(e:Event)=>{
  if(!options.enabled()){cancel();return}if(safariScale===null)return;e.preventDefault();
  const scale=(e as Event&{scale:number}).scale;if(!Number.isFinite(scale)||scale<=0)return;
  const previousScale=safariScale;safariScale=scale;
  if(safariOwnsGesture)applyScale(scale/previousScale);
 };
 const safariEnd=(e:Event)=>{const completed=safariScale!==null&&safariOwnsGesture;if(safariScale!==null)e.preventDefault();safariScale=null;safariOwnsGesture=false;if(completed&&options.enabled())options.onGestureEnd?.(false)};
 const visibility=()=>{if(document.hidden)cancel()};
 root.addEventListener('pointerdown',down,true);root.addEventListener('pointermove',move,{passive:false,capture:true});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])root.addEventListener(name,up as EventListener,true);
 root.addEventListener('wheel',wheel,{passive:false,capture:true});root.addEventListener('gesturestart',safariStart,{passive:false});root.addEventListener('gesturechange',safariMove,{passive:false});root.addEventListener('gestureend',safariEnd,{passive:false});
 window.addEventListener('blur',cancel);window.addEventListener('resize',cancel);document.addEventListener('visibilitychange',visibility);
 return {cancel,blocksMovement:()=>movementBlocked||!options.enabled(),dispose(){reset(false);root.removeEventListener('pointerdown',down,true);root.removeEventListener('pointermove',move,true);for(const name of ['pointerup','pointercancel','lostpointercapture'])root.removeEventListener(name,up as EventListener,true);root.removeEventListener('wheel',wheel,{capture:true});root.removeEventListener('gesturestart',safariStart);root.removeEventListener('gesturechange',safariMove);root.removeEventListener('gestureend',safariEnd);window.removeEventListener('blur',cancel);window.removeEventListener('resize',cancel);document.removeEventListener('visibilitychange',visibility)}};
}

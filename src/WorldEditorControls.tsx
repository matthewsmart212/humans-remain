import React,{useEffect,useRef,useState} from 'react';

const mobileQuery='(max-width: 1000px), (pointer: coarse)';
export function useMobileEditor(){
 const [mobile,setMobile]=useState(()=>window.matchMedia(mobileQuery).matches);
 useEffect(()=>{const query=window.matchMedia(mobileQuery),change=()=>setMobile(query.matches);query.addEventListener('change',change);return()=>query.removeEventListener('change',change)},[]);
 return mobile;
}

/** Match the game's visual viewport, while leaving a native page scroll gesture
 * available for browsers which don't support fullscreen on arbitrary elements. */
export function useEditorDisplay(mobile:boolean){
 const [height,setHeight]=useState(()=>window.visualViewport?.height||window.innerHeight);
 const [fullscreen,setFullscreen]=useState(false),[swipeHint,setSwipeHint]=useState(false);
 const ownsFullscreen=useRef(false),mounted=useRef(true);
 const doc=document as Document&{webkitFullscreenElement?:Element;webkitExitFullscreen?:()=>Promise<void>|void};
 const fullElement=()=>doc.fullscreenElement||doc.webkitFullscreenElement;
 const standalone=window.matchMedia('(display-mode: standalone)').matches||(navigator as Navigator&{standalone?:boolean}).standalone===true;
 useEffect(()=>{
  mounted.current=true;
  const fit=()=>setHeight(window.visualViewport?.height||window.innerHeight),changed=()=>{setFullscreen(!!fullElement());fit()};
  window.visualViewport?.addEventListener('resize',fit);window.addEventListener('resize',fit);
  document.addEventListener('fullscreenchange',changed);document.addEventListener('webkitfullscreenchange',changed);changed();
  return()=>{mounted.current=false;window.visualViewport?.removeEventListener('resize',fit);window.removeEventListener('resize',fit);document.removeEventListener('fullscreenchange',changed);document.removeEventListener('webkitfullscreenchange',changed);if(ownsFullscreen.current&&fullElement())try{void (doc.exitFullscreen?.()||doc.webkitExitFullscreen?.())?.catch(()=>{})}catch{}};
 },[]);
 useEffect(()=>{
  if(!mobile||standalone)return;
  const root=document.documentElement,scroll={x:window.scrollX,y:window.scrollY};
  root.classList.add('we-mobile-document');
  // This measures the toolbar-free viewport without stretching the visible UI
  // below Safari's address bar or the software keyboard.
  const probe=document.createElement('div');probe.style.cssText='position:fixed;visibility:hidden;pointer-events:none;width:0;height:100lvh;top:0';document.body.appendChild(probe);
  const fit=()=>{if((window.visualViewport?.height||window.innerHeight)>=probe.getBoundingClientRect().height-4)setSwipeHint(false)};
  const frame=requestAnimationFrame(()=>{window.scrollTo(0,1);const visible=window.visualViewport?.height||window.innerHeight;if(window.innerWidth>visible&&probe.getBoundingClientRect().height-visible>40&&!document.fullscreenEnabled)setSwipeHint(true);fit()});
  window.visualViewport?.addEventListener('resize',fit);window.addEventListener('resize',fit);
  return()=>{cancelAnimationFrame(frame);window.visualViewport?.removeEventListener('resize',fit);window.removeEventListener('resize',fit);probe.remove();root.classList.remove('we-mobile-document');window.scrollTo(scroll.x,scroll.y)};
 },[mobile,standalone]);
 const expand=async()=>{
  if(fullElement()){try{await (doc.exitFullscreen?.()||doc.webkitExitFullscreen?.())}catch{}return}
  const root=document.documentElement as HTMLElement&{webkitRequestFullscreen?:()=>Promise<void>|void};
  try{
   if(root.requestFullscreen&&document.fullscreenEnabled){await root.requestFullscreen({navigationUI:'hide'});ownsFullscreen.current=true;return}
   if(root.webkitRequestFullscreen){await root.webkitRequestFullscreen();ownsFullscreen.current=true;return}
  }catch{/* iPhone may expose the API but reject it without a hardware keyboard. */}
  if(mounted.current){setSwipeHint(true);if(mobile)window.scrollTo(0,1)}
 };
 return {height,fullscreen,swipeHint,setSwipeHint,expand,standalone};
}

export function EditorJoystick({input,onStart}:{input:React.MutableRefObject<{x:number;y:number}>;onStart:()=>void}){
 const pointer=useRef<number|null>(null),[thumb,setThumb]=useState({x:0,y:0});
 const clear=()=>{pointer.current=null;input.current={x:0,y:0};setThumb({x:0,y:0})};
 useEffect(()=>{const hide=()=>{if(document.hidden)clear()};window.addEventListener('blur',clear);window.addEventListener('resize',clear);document.addEventListener('visibilitychange',hide);return()=>{input.current={x:0,y:0};window.removeEventListener('blur',clear);window.removeEventListener('resize',clear);document.removeEventListener('visibilitychange',hide)}},[input]);
 const move=(e:React.PointerEvent<HTMLDivElement>)=>{
  if(pointer.current!==e.pointerId)return;
  const r=e.currentTarget.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,length=Math.hypot(dx,dy),max=r.width*.32;
  input.current=length<5?{x:0,y:0}:{x:dx/Math.max(max,length),y:dy/Math.max(max,length)};
  setThumb({x:dx*Math.min(1,max/Math.max(1,length)),y:dy*Math.min(1,max/Math.max(1,length))});
 };
 return <div className="we-joystick" role="application" aria-label="Movement joystick" data-active={pointer.current!==null} onContextMenu={e=>e.preventDefault()} onPointerDown={e=>{if(pointer.current!==null)return;e.preventDefault();onStart();pointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);move(e)}} onPointerMove={move} onPointerUp={e=>{if(pointer.current===e.pointerId)clear()}} onPointerCancel={clear} onLostPointerCapture={clear}><span className="we-stick-cross" aria-hidden="true">+</span><i style={{transform:`translate(${thumb.x}px,${thumb.y}px)`}}/><span className="we-stick-label">MOVE</span></div>;
}

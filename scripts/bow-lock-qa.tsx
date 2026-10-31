// Local-only browser fixture: production HUD, bow simulation, art and Skia renderer.
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createWorld,movePlayer,attack,stepBow,timeOf,type World,type Animal} from '../src/survival-engine';
import {emptyLayout} from '../src/world-layout';
import {FieldKitController} from '../src/field-kit';
import FieldKitHUD from '../src/FieldKitHUD';
import {selectQuickItem} from '../src/quick-items';
import {createWebWorld} from '../src/skia-web';
import {EDITOR_ENTRY_IMAGES,EDITOR_MOVEMENT_IMAGES} from '../src/editor-image-sources';
import {drawWorldEditor} from '../src/placed-world-renderer';
import redirects from '../server/lossless-artwork-redirects.json';
import {startSurvivalCycle} from '../src/survival-cycle';
import '@fontsource/barlow-condensed/800.css';
import '@fontsource/barlow/600.css';
import '../src/styles.css';import '../src/world-editor.css';import '../src/game-play.css';
const view={x:0,y:0,zoom:1,follow:true,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:true};
function chicken(id:number,x:number,y:number):Animal{return{id,x,y,hp:100,maxHp:100,home:0,moving:false,right:true,flashUntil:0,chicken:{home:{x,y},direction:'down-left',distance:0,state:'idle',since:0,until:99999,thinkAt:99999,target:{x,y},seed:id,cycle:0}}}
function make(){const w=createWorld(emptyLayout());Object.assign(w.player,{x:1600,y:1800,direction:'up-left'});w.layout!.terrainImage=undefined;w.animals=[chicken(99001,1860,1910),chicken(99002,1990,1760)];w.enemies=[];w.loot=[];w.breakables=[];w.survivalEnabled=true;w.editorPreview=true;w.combatTest=true;w.notice='';w.noticeUntil=0;selectQuickItem(w,'bow');startSurvivalCycle(w);return w}
function QA(){
 const world=useRef<World>(make()),canvas=useRef<HTMLCanvasElement>(null),input=useRef({x:0,y:0}),held=useRef(false),moving=useRef(false),controller=useMemo(()=>new FieldKitController(),[]);
 const [status,setStatus]=useState('Loading'),[paused,setPaused]=useState(false),[sprint,setSprint]=useState(false),[bag,setBag]=useState(false),[hidden,setHidden]=useState(false),[health,setHealth]=useState(100);
 const live=useRef({paused,sprint,bag});live.current={paused,sprint,bag};
 useEffect(()=>{
  let closed=false,frame=0,last=0,acc=0;let renderer:Awaited<ReturnType<typeof createWebWorld>>|undefined;
  const sources=Object.fromEntries(Object.entries({...EDITOR_ENTRY_IMAGES,...EDITOR_MOVEMENT_IMAGES}).filter(([key])=>!key.startsWith('art-')).map(([key,url])=>[key,(redirects as Record<string,string>)[url]??url]));
  createWebWorld(canvas.current!,(ctx,atlas,imgs,w)=>drawWorldEditor(ctx,atlas,imgs,w,view),{}, {sources,streamRoads:false,streamRivers:false}).then(r=>{
   if(closed){r.dispose();return}renderer=r;setStatus('Ready');
   const draw=(now:number)=>{
    const w=world.current;acc+=Math.min(.1,(now-(last||now))/1000);last=now;
    while(acc>=1/60){acc-=1/60;if(live.current.paused||live.current.bag)continue;movePlayer(w,input.current,live.current.sprint);w.tick++;
     if(moving.current&&w.animals[0]?.hp>0){const a=w.animals[0];a.y=1910+Math.sin(timeOf(w)*.6)*100;a.chicken!.state='walk';a.chicken!.distance+=1.6}
     if(held.current||(w.attackQueuedUntil??0)>=timeOf(w)){if(attack(w))w.attackQueuedUntil=undefined}stepBow(w);w.effects=w.effects.filter(e=>timeOf(w)-e.born<1.2);
    }
    r.draw(w);frame=requestAnimationFrame(draw);
   };frame=requestAnimationFrame(draw);
  }).catch(e=>setStatus(String(e)));
  const timer=setInterval(()=>setHealth(Math.ceil(world.current.animals[0]?.hp??0)),100);
  return()=>{closed=true;cancelAnimationFrame(frame);clearInterval(timer);renderer?.dispose()};
 },[]);
 return <div className="camp-studio clean-game" style={{position:'fixed',inset:0}}>
  <canvas ref={canvas} style={{display:'block',width:'100%',height:'100%'}}/>
  <FieldKitHUD world={world} controller={controller} enabled={!paused&&status==='Ready'} mobile input={input} sprinting={sprint} onSprint={()=>setSprint(v=>!v)} onHeld={v=>{held.current=v}} onDodge={()=>{}} onTool={()=>{}} onMove={()=>{}} onPause={()=>setPaused(v=>!v)} bagOpen={bag} onBag={setBag} mapOpen={false} onMap={()=>{}}/>
  {!hidden&&<aside style={{position:'absolute',top:70,left:12,padding:8,color:'#eee2c0',background:'#10372ee8',zIndex:20,fontSize:12,maxWidth:190}}>
   <output aria-label="Renderer status">{status}</output><div><output aria-label="Target health">Chicken health: {health}</output></div>
   <button onClick={()=>{moving.current=!moving.current}}>Toggle moving target</button>
   <button onClick={()=>{world.current=make();controller.reset();setPaused(false)}}>Reset scene</button>
   <button onClick={()=>setHidden(true)}>Hide diagnostics</button>
  </aside>}
 </div>;
}
createRoot(document.getElementById('root')!).render(<QA/>);

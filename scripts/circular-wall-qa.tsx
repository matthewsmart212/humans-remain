// Development-only review of the production Skia renderer; never bundled into the live entry.
import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import source from '../docs/qa/circular-wall-v1/source-world.json';
import artwork from '../docs/qa/circular-wall-v1/source-artwork.json';
import plan from '../src/camp-circular-wall-layout.json';
import {installImportedArt} from '../src/imported-art';
import {prepareAuthoredWorld} from '../src/authored-world';
import {createCampPlaySession} from '../src/studio-play';
import {requiredImages} from '../src/world-assets';
import {EDITOR_ENTRY_IMAGES,editorTerrainDetail} from '../src/editor-image-sources';
import {drawWorldEditor,editorCamera,type EditorView} from '../src/placed-world-renderer';
import {createWebWorld} from '../src/skia-web';
import {OutdoorTerrainStream} from '../src/outdoor-streaming';
import type {WorldLayout} from '../src/world-layout';
import type {ArtworkRecord} from '../src/artwork-model';
import lossless from '../server/lossless-artwork-redirects.json';
import roads from '../server/retired-road-redirects.json';
import calm from '../server/calm-river-redirects.json';
import features from '../server/river-features-redirects.json';
import quality from '../server/river-quality-redirects.json';
import '@fontsource/barlow-condensed/800.css';

installImportedArt(artwork.records as ArtworkRecord[]);
const initial=prepareAuthoredWorld(source.draft as WorldLayout);
const redirects={...lossless,...roads,...calm,...features,...quality} as Record<string,string>;
const local=(sources:Record<string,string>)=>Object.fromEntries(Object.entries(sources).map(([key,path])=>{let url=path;for(let i=0;redirects[url]&&i<8;i++)url=redirects[url];return[key,url.startsWith('/api/asset-files/')?'/native/assets/world/'+url.split('/').at(-1)+'.png':url]}));
const CENTRE=plan.centre;
function QA(){
 const canvas=useRef<HTMLCanvasElement>(null),world=useRef(createCampPlaySession(initial));
 const view=useRef<EditorView>({x:CENTRE[0],y:CENTRE[1]-70,zoom:.23,follow:false,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:false,hideFoliage:false});
 const [status,setStatus]=useState('Loading current camp…'),[controls,setControls]=useState(true),[angle,setAngle]=useState(0),[side,setSide]=useState('inside');
 world.current.editorPreview=true;
 useEffect(()=>{let live=true,frame=0,dispose=()=>{};void(async()=>{try{
  const r=await createWebWorld(canvas.current!, (ctx,atlas,imgs,w)=>drawWorldEditor(ctx,atlas,imgs,w,view.current),local({...requiredImages(initial.items.map(p=>p.assetId),initial.terrainImage),...editorTerrainDetail(initial.terrainImage)}),{sources:local(EDITOR_ENTRY_IMAGES)});
  const terrain=new OutdoorTerrainStream(sources=>r.warmImages(local(sources)),keys=>r.releaseImages(keys));
  dispose=()=>{terrain.dispose();r.dispose()};if(!live){dispose();return}setStatus('Ready · '+initial.items.filter(p=>p.assetId.startsWith('camp_circular_wall_')).length+' curved sections · '+initial.items.length+' objects');
  let terrainAt=0;
  const draw=()=>{const now=performance.now();if(now-terrainAt>200){const c=editorCamera(canvas.current!.width,canvas.current!.height,world.current,view.current);terrain.update({x:c.x,y:c.y,width:canvas.current!.width/c.scale,height:canvas.current!.height/c.scale},world.current.player,true);world.current.outdoorReady=terrain.ready;terrainAt=now}r.draw(world.current);frame=requestAnimationFrame(draw)};draw();
 }catch(e){setStatus(String(e))}})();return()=>{live=false;cancelAnimationFrame(frame);dispose()};},[]);
 const position=(a:number,inside=side==='inside')=>{const t=a*Math.PI/180,r=inside?1535:1765;world.current.player.x=CENTRE[0]+Math.sin(t)*r;world.current.player.y=CENTRE[1]-Math.cos(t)*r;view.current.x=CENTRE[0]+Math.sin(t)*1650;view.current.y=CENTRE[1]-Math.cos(t)*1650-80;view.current.zoom=.92;setAngle(a);setSide(inside?'inside':'outside')};
 return <main style={{position:'fixed',inset:0,background:'#12221a',fontFamily:'Arial'}}><style>{'button{background:#244b40;color:#f8e9c9;border:1px solid #75947b;border-radius:5px;padding:7px;cursor:pointer;margin:3px}button[aria-pressed=true]{background:#766137}button:disabled{opacity:.5}'}</style><canvas ref={canvas} style={{width:'100%',height:'100%'}}/>{controls&&<aside style={{position:'absolute',left:10,top:10,maxWidth:430,padding:10,background:'#12312cee',color:'#f6e7c7',borderRadius:10}}><strong>Circular wall · current camp</strong><p role="status">{status}</p><div><button onClick={()=>{view.current.x=CENTRE[0];view.current.y=CENTRE[1]-70;view.current.zoom=.23}}>Full camp</button>{[0,90,200,270].map((a,i)=><button key={a} onClick={()=>position(a)}>{['North','East','South','West'][i]}</button>)}</div><div>{[['NE road',52],['SE road',134.4],['South road',182.3],['SW road',221.4],['West road',252],['NW road',317]].map(([label,a])=><button key={label} onClick={()=>position(Number(a))}>{label}</button>)}</div><div><button aria-pressed={side==='inside'} onClick={()=>position(angle,true)}>Player inside</button><button aria-pressed={side==='outside'} onClick={()=>position(angle,false)}>Player outside</button><button onClick={()=>{view.current.collision=!view.current.collision}}>Collision</button><button onClick={()=>{view.current.hideFoliage=!view.current.hideFoliage}}>Foliage</button><button onClick={()=>{world.current.phase=world.current.phase==='night'?'day':'night'}}>Day / night</button><button onClick={()=>setControls(false)}>Hide review controls</button></div></aside>}</main>;
}
createRoot(document.getElementById('root')!).render(<QA/>);

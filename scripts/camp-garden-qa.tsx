// Development-only: the production Skia renderer, current authored camp and real tier control.
import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import snapshot from '../native/assets/world-snapshot.json';
import {installImportedArt} from '../src/imported-art';
import {prepareAuthoredWorld} from '../src/authored-world';
import {createCampPlaySession} from '../src/studio-play';
import {GARDEN_ART,GARDEN_PLACEMENT_ID} from '../src/camp-garden-art';
import {changePlacementTier} from '../src/world-tiers';
import {requiredImages} from '../src/world-assets';
import {EDITOR_ENTRY_IMAGES} from '../src/editor-image-sources';
import {drawWorldEditor,type EditorView} from '../src/placed-world-renderer';
import {createWebWorld} from '../src/skia-web';
import WorldTierControls from '../src/WorldTierControls';
import type {WorldLayout} from '../src/world-layout';
import type {ArtworkRecord} from '../src/artwork-model';
import lossless from '../server/lossless-artwork-redirects.json';
import roads from '../server/retired-road-redirects.json';
import calm from '../server/calm-river-redirects.json';
import features from '../server/river-features-redirects.json';
import quality from '../server/river-quality-redirects.json';
import '@fontsource/barlow-condensed/800.css';
import '../src/styles.css';import '../src/world-editor.css';
installImportedArt(snapshot.records as ArtworkRecord[]);
const initial=prepareAuthoredWorld(snapshot.layout as WorldLayout);
const redirects={...lossless,...roads,...calm,...features,...quality} as Record<string,string>;
const local=(sources:Record<string,string>)=>Object.fromEntries(Object.entries(sources).map(([key,path])=>{let url=path;for(let i=0;redirects[url]&&i<8;i++)url=redirects[url];return[key,url.startsWith('/api/asset-files/')?'/native/assets/world/'+url.split('/').at(-1)+'.png':url]}));
function QA(){
 const canvas=useRef<HTMLCanvasElement>(null),world=useRef(createCampPlaySession(initial)),view=useRef<EditorView>({x:1420,y:1300,zoom:.65,follow:false,grid:false,collision:false,selected:null,ghost:null,placingSpawn:false,playing:false,hideFoliage:false});
 const [layout,setLayout]=useState(initial),[status,setStatus]=useState('Loading artwork…'),[controls,setControls]=useState(true);
 const garden=layout.items.find(p=>p.id===GARDEN_PLACEMENT_ID);
 useEffect(()=>{let live=true,frame=0,dispose=()=>{};void(async()=>{try{const r=await createWebWorld(canvas.current!, (ctx,atlas,imgs,w)=>drawWorldEditor(ctx,atlas,imgs,w,view.current),local(requiredImages([...initial.items.map(p=>p.assetId),...GARDEN_ART.map(a=>a.id)],initial.terrainImage)),{sources:local(EDITOR_ENTRY_IMAGES)});dispose=()=>r.dispose();if(!live){dispose();return}setStatus(garden?'Ready':'Garden not placed');const draw=()=>{r.draw(world.current);frame=requestAnimationFrame(draw)};draw()}catch(e){setStatus(String(e))}})();return()=>{live=false;cancelAnimationFrame(frame);dispose()};},[]);
 const update=(next:WorldLayout)=>{world.current.layout=next;setLayout(next)};
 return <div className="garden-qa" style={{position:'fixed',inset:0,background:'#12221a',fontFamily:'Arial'}}><style>{'.garden-qa button{background:#224b42;color:#f8e9c9;border:1px solid #75947b;border-radius:5px;padding:6px;cursor:pointer}.garden-qa button[aria-pressed=true]{background:#766137}.garden-qa button:disabled{opacity:.5}'}</style><canvas ref={canvas} style={{width:'100%',height:'100%'}}/>{controls&&<aside style={{position:'absolute',right:8,top:8,width:260,padding:12,background:'#12312cee',color:'#f6e7c7',borderRadius:10}}><strong>Production garden artwork</strong><p role="status">{status}</p>{garden&&<><WorldTierControls layout={layout} placement={garden} pending={false} disabled={status!=='Ready'} onChange={tier=>update(changePlacementTier(layout,garden.id,tier))}/><p>Position {Math.round(garden.x)}, {Math.round(garden.y)}</p></>}<button onClick={()=>{view.current.x=1000;view.current.y=1240;view.current.zoom=1}}>Garden closeup</button><button onClick={()=>{view.current.x=1420;view.current.y=1300;view.current.zoom=.65}}>Camp view</button><button onClick={()=>{view.current.collision=!view.current.collision}}>Collision</button><button onClick={()=>{view.current.playing=true;setControls(false)}}>Hide controls</button></aside>}</div>;
}
createRoot(document.getElementById('root')!).render(<QA/>);

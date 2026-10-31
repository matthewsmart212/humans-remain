import React,{useEffect,useRef,useState} from 'react';
import {useStepOnPreview} from './use-step-on-preview';
import {ImageOff} from 'lucide-react';
import type {CatalogueEntry} from './catalogue-model';
import {SURVIVOR_ART,SURVIVOR_IMAGE_SOURCES} from './survivor-art';

/** Preview uses the same source images, crop and worker scale as the game. */
export function ChecklistPreview({entry}:{entry:CatalogueEntry}){
 const canvas=useRef<HTMLCanvasElement>(null);
 const [failed,setFailed]=useState(false),[roof,setRoof]=useState(false),[lit,setLit]=useState(true),[running,setRunning]=useState(true),[selectedFrame,setSelectedFrame]=useState(0);
 const spec=entry.artPreview,stepOn=spec?.animationMode==='step-on';
 const stepPreview=useStepOnPreview(stepOn&&lit,spec?.frames?.length||0,spec?.fps||8);
 useEffect(()=>{
  setFailed(false);
  if(!entry.image||(!spec&&!entry.crop))return;
  let live=true,timer:ReturnType<typeof setInterval>|undefined;
  const urls=[entry.image,...(spec?.frames||[]),...(spec?.openFrames||[]),spec?.unlit,spec?.roof,spec?.worldWidth?SURVIVOR_IMAGE_SOURCES.survivorBase:undefined].filter((v):v is string=>!!v);
  const cache=new Map<string,HTMLImageElement>();
  Promise.all([...new Set(urls)].map(url=>new Promise<void>((resolve,reject)=>{const im=new Image();im.onload=()=>{cache.set(url,im);resolve()};im.onerror=reject;im.src=url}))).then(()=>{
   if(!live)return;
   let frame=selectedFrame;
   const draw=()=>{
    const c=canvas.current,ctx=c?.getContext('2d');if(!ctx||!c)return;
    ctx.clearRect(0,0,c.width,c.height);
    const path=spec?.openFrames?.length?spec.openFrames[Math.min(selectedFrame,spec.openFrames.length-1)]:spec?.frames?.length?(lit?spec.frames[(stepOn?stepPreview.frame:frame)%spec.frames.length]:spec.unlit||entry.image!):entry.image!;
    const im=cache.get(path)!;
    const crop=entry.crop||[0,0,im.naturalWidth,im.naturalHeight];
    const [sx,sy,sw,sh]=crop,k=Math.min((c.width-36)/sw,(c.height-24)/sh),x=(c.width-sw*k)/2,y=(c.height-sh*k)/2;
    ctx.drawImage(im,sx,sy,sw,sh,x,y,sw*k,sh*k);
    if(spec?.worldWidth){
     const worker=cache.get(SURVIVOR_IMAGE_SOURCES.survivorBase)!,f=SURVIVOR_ART.down.idle,[wx,wy,ww,wh]=f.crop;
     const scale=k*sw/spec.worldWidth*f.scale,px=x+sw*k*.5,py=y+sh*k*.73;
     ctx.drawImage(worker,wx,wy,ww,wh,px-f.anchor[0]*scale,py-f.anchor[1]*scale,ww*scale,wh*scale);
    }
    if(roof&&spec?.roof){const r=spec.roofRect||[0,0,sw,sh];ctx.drawImage(cache.get(spec.roof)!,x+r[0]*k,y+r[1]*k,r[2]*k,r[3]*k)}
    frame++;
   };
   draw();
   if(spec?.frames?.length&&!stepOn&&lit&&running&&!matchMedia('(prefers-reduced-motion: reduce)').matches)timer=setInterval(draw,1000/(spec.fps||7.14));
  }).catch(()=>{if(live)setFailed(true)});
  return()=>{live=false;if(timer)clearInterval(timer)};
 },[entry.image,entry.crop,spec,roof,lit,running,selectedFrame,stepOn,stepPreview.frame]);
 if(!entry.image||failed)return <div className="bc-no-art"><ImageOff size={26}/>{failed?'Image unavailable':entry.art===null?'No direct artwork':'Artwork not created'}</div>;
 return <div className="bc-preview-content">
  {entry.crop||spec?<canvas width={760} height={500} ref={canvas} role="img" aria-label={`${entry.name}${spec?.roof?roof?' with removable roof':' interior with player for scale':''}`}/>:<img src={entry.image} alt={entry.name} loading="lazy" onError={()=>setFailed(true)}/>}
  {spec?.frames&&spec.frames.length>1&&<div className="bc-frame-picker" aria-label="Animation images">{spec.frames.map((url,i)=><button key={url} aria-label={`View animation frame ${i+1}`} aria-pressed={lit&&(stepOn?stepPreview.frame===i:!running&&selectedFrame===i)} onClick={()=>{setSelectedFrame(i);stepPreview.inspect(i);setRunning(false);setLit(true)}}><img src={url} alt={`Frame ${i+1}`}/><span>{i+1}</span></button>)}</div>}
  {spec?.openFrames&&<div className="bc-frame-picker" aria-label="Storage chest opening states">{spec.openFrames.map((url,i)=><button key={url} aria-pressed={selectedFrame===i} onClick={()=>setSelectedFrame(i)}><img src={url} alt=""/><span>{['Closed','Half open','Open 45°'][i]||`Frame ${i+1}`}</span></button>)}</div>}
  {spec&&<div className="bc-preview-controls">
   {spec.roof&&<><button type="button" onClick={()=>setRoof(!roof)} aria-pressed={roof}>{roof?'Remove roof':'Show roof'}</button><span>Player shown at game scale</span></>}
   {spec.frames&&<>{spec.unlit&&<button type="button" onClick={()=>setLit(!lit)}>{lit?'Show idle':'Show active'}</button>}{stepOn?<><button type="button" aria-pressed={stepPreview.active} onClick={()=>{stepPreview.step(true);setLit(true)}}>Step on</button><button type="button" aria-pressed={!stepPreview.active} onClick={()=>{stepPreview.step(false);setLit(true)}}>Step off</button><span>Holds open while occupied · reverses when you leave</span></>:<button type="button" onClick={()=>setRunning(!running)} disabled={!lit}>{running?'Pause':'Play animation'}</button>}</>}
  </div>}
 </div>;
}

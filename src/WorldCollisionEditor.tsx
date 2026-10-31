import React,{useEffect,useRef,useState} from 'react';
import {X,Check,RotateCcw} from 'lucide-react';
import CollisionEditor from './CollisionEditor';
import {assetOutline,type PendingImage} from './artwork-draft';
import {collisionError,emptyCollision,type AssetCollision} from './asset-collision';
import {imageDimensions,type WorldAsset} from './world-assets';
import {placementGeometryAsset,type Placement} from './world-layout';
import './base-checklist.css';

export function placedOutline(p:Placement,a:WorldAsset):AssetCollision{
 a=placementGeometryAsset(p)||a;
 if(p.collision)return structuredClone(p.collision);
 if(a.collision||!p.footprint)return assetOutline(a)||emptyCollision();
 return assetOutline({...a,segments:[],body:[{x:0,y:-p.footprint.depth/2,hw:p.footprint.width/2,hh:p.footprint.depth/2}]})||emptyCollision();
}

export default function WorldCollisionEditor({placement,asset,onApply,onClose}:{placement:Placement;asset:WorldAsset;onApply:(collision:AssetCollision|undefined)=>void;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),[value,setValue]=useState(()=>placedOutline(placement,asset)),[drawing,setDrawing]=useState(false);
 useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close()},[]);
 const image:PendingImage={key:asset.id,url:asset.image,name:asset.name,width:asset.crop[2],height:asset.crop[3],crop:asset.crop,sourceSize:imageDimensions[asset.image]||[asset.crop[0]+asset.crop[2],asset.crop[1]+asset.crop[3]]};
 const error=collisionError(value);
 return <dialog ref={dialog} className="we-collision-dialog" aria-labelledby="we-collision-title" onCancel={e=>{e.preventDefault();onClose()}}>
  <header><div><small>PLACED OBJECT</small><h2 id="we-collision-title">{asset.name}</h2></div><button aria-label="Cancel collision editing" onClick={onClose}><X size={20}/></button></header>
  <div className="we-collision-body"><p>Draw blockers for this placed object. Points follow its position and size. Use wall lines with gaps for doorways.</p><CollisionEditor scope="placement" image={image} value={value} onChange={setValue} disabled={false} onDraftChange={setDrawing}/><p className="ai-hint">Roof fading uses the building’s interior area. These lines only change movement.</p></div>
  <footer><button disabled={drawing} onClick={()=>onApply(undefined)}><RotateCcw size={16}/>Use asset default</button><button onClick={onClose}>Cancel</button><button className="we-primary" disabled={drawing||!!error} onClick={()=>onApply(value)}><Check size={17}/>Use these blockers</button></footer>
 </dialog>;
}

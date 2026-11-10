import {entries} from './catalogue-model';
import {ASSET_BY_ID,type WorldAsset,type GroundArtwork} from './world-assets';
import {placementFrame,type Placement,type WorldLayout} from './world-layout';
import wallManifest from './wall-artwork-replacements.json';
import wallGround from './wall-ground-art.json';

export const WALL_FAMILY='camp-perimeter';
export const WALL_TIERS=[{tier:1,name:'Weathered timber'},{tier:2,name:'Complete palisade'}];
export type TierOption={tier:number;name:string;assetId?:string;available:boolean};
export function wallIdentity(id:string){
 for(let i=0;i<wallManifest.length;i++){
  const baseId=wallManifest[i].entryId;
  for(const {tier} of WALL_TIERS)if(id===wallAssetId(baseId,tier))return{baseId,piece:i+1,tier};
 }
 return null;
}
export const wallAssetId=(baseId:string,tier:number)=>tier===1?baseId:`wall-t${tier}-${baseId}`;
export function wallAssetForLayout(id:string,layout:WorldLayout){const wall=wallIdentity(id),existing=layout.items.map(p=>wallIdentity(p.assetId)).find(Boolean);return wall&&existing?wallAssetId(wall.baseId,existing.tier):id}
export function tierIdentity(id:string){
 const wall=wallIdentity(id);if(wall)return{family:WALL_FAMILY,tier:wall.tier,wall};
 const e=entries.find(e=>e.id===id);return e?.family&&Number.isInteger(e.tier)?{family:e.family,tier:e.tier!,wall:null}:null;
}
export function tierOptions(id:string,assets=ASSET_BY_ID):TierOption[]{
 const current=tierIdentity(id);if(!current)return[];
 if(current.wall)return WALL_TIERS.map(t=>{const assetId=wallAssetId(current.wall!.baseId,t.tier);return{...t,assetId,available:assets.has(assetId)}});
 return entries.filter(e=>e.family===current.family&&Number.isInteger(e.tier)).sort((a,b)=>a.tier!-b.tier!).map(e=>({tier:e.tier!,name:e.name,assetId:e.id,available:assets.has(e.id)}));
}
export function tierTargets(layout:WorldLayout,selectedId:string){
 const selected=layout.items.find(p=>p.id===selectedId);
 if(!selected)throw Error('This object is no longer in the draft.');
 return wallIdentity(selected.assetId)?layout.items.filter(p=>wallIdentity(p.assetId)):[selected];
}
/** Moving one upgrade tier must not move the coordinates of any other tier.
 * Keep the original position as a fallback for tiers the user hasn't edited.
 */
export function rememberTierMove(placement:Placement,patch:Partial<Placement>):Placement{
 const next={...placement,...patch},identity=tierIdentity(placement.assetId);
 if(!identity||(next.x===placement.x&&next.y===placement.y))return next;
 const previous=placement.tierPositions??{base:{x:placement.x,y:placement.y}};
 return {...next,tierPositions:{...previous,[String(identity.tier)]:{x:next.x,y:next.y}}};
}
/** Duplicating a tiered object translates every saved tier position together.
 * This is distinct from dragging the selected tier, which only moves that tier.
 */
export function translateTierPositions(p:Placement,position:{x:number;y:number},bound:(point:{x:number;y:number})=>{x:number;y:number}):Placement{
 const dx=position.x-p.x,dy=position.y-p.y;
 return {...p,...position,...(p.tierPositions?{tierPositions:Object.fromEntries(Object.entries(p.tierPositions).map(([tier,point])=>[tier,bound({x:point.x+dx,y:point.y+dy})]))}:{})};
}
/** All-or-nothing: a missing wall variant must never leave half the perimeter upgraded. */
export function changePlacementTier(layout:WorldLayout,selectedId:string,tier:number,assets=ASSET_BY_ID):WorldLayout{
 const targets=tierTargets(layout,selectedId),updates=new Map<string,Placement>();
 for(const p of targets){
  const option=tierOptions(p.assetId,assets).find(o=>o.tier===tier);
  if(!option?.available||!option.assetId)throw Error('Artwork is not ready for every part of this tier. Nothing was changed.');
  if(p.assetId!==option.assetId){
   const position=p.tierPositions?.[String(tier)]??p.tierPositions?.base;
   updates.set(p.id,{...p,frame:structuredClone(placementFrame(p,assets)),assetId:option.assetId,...(position?{x:position.x,y:position.y}:{})});
  }
 }
 return updates.size?{...layout,items:layout.items.map(p=>updates.get(p.id)??p)}:layout;
}
/** Freeze the existing layout until all required pictures have loaded. Never overwrite newer edits. */
export async function prepareTierChange(layout:WorldLayout,id:string,tier:number,load:(ids:string[])=>Promise<unknown>,current:()=>WorldLayout,assets=ASSET_BY_ID){
 const next=changePlacementTier(layout,id,tier,assets);
 if(next===layout)return next;
 await load([...new Set(next.items.filter((p,i)=>p.assetId!==layout.items[i].assetId).map(p=>p.assetId))]);
 if(current()!==layout)throw Error('The draft changed while artwork loaded. Please choose the tier again.');
 return next;
}

/** Original IDs and all tier variants share one registered ground bed per wall piece. */
export function installWallTiers(assets:Map<string,WorldAsset>){
 for(let i=0;i<wallManifest.length;i++){
  const m=wallManifest[i],base=assets.get(m.entryId);if(!base)continue;
  const ground=wallGround[i] as GroundArtwork;
  assets.set(base.id,{...base,ground});
  for(const t of WALL_TIERS.slice(1)){
   const id=wallAssetId(base.id,t.tier),image=`/survival/wall-tiers-v1/t${t.tier}-wall-${i+1}.webp`;
   assets.set(id,{...base,ground,id,catalogueId:undefined,name:`Wall ${i+1} · ${t.name}`,group:'Perimeter walls',image,
    // Every variant is registered to the same transparent canvas as its Tier 1 piece.
    crop:[0,0,m.width,m.height],anchor:[base.anchor[0]/base.crop[2]*m.width,base.anchor[1]/base.crop[3]*m.height],
    frames:undefined,roof:undefined,foreground:undefined,unlit:undefined,note:'Linked perimeter · changing tier switches every placed wall piece together.'});
  }
 }
 return assets;
}

import {ASSET_BY_ID,assetImageKey,TREE_LOG_IMAGE} from './world-assets';
import {visiblePlacements} from './layout-views';
import {insideBuilding,placementBounds,placementContains,placementPoint,type Placement,type WorldLayout} from './world-layout';
import {FORAGE_BY_ID} from './forage-art';
import {forageRemaining,forageRoot} from './foraging';
import {TREE_ART,treeRoot} from './tree-chopping';
import {MINEABLE_ROCKS,rockContact} from './rock-mining';
import {isAxe} from './player-gear';
import {SCRAP_KEYS} from './scrap-salvage';
import {isProvision} from './food-provisions-data';
import {provisionImageKey} from './food-provisions-art';
import {isCookedFood} from './food-items';
import {chestFrame} from './chest-animation';
import {placedAnimationFrame} from './step-on-animation';
import {placedFireLit} from './camp-lighting';
import {getFieldKitTarget} from './field-kit-target';
import {visiblePickupCues} from './pickup-visibility';
import {lineClear,type World,type Loot} from './survival-engine';

export const RESOURCE_OUTLINE_RANGE=260,RESOURCE_OUTLINE_LIMIT=8;
export type ResourceOutlineView={x:number;y:number;width:number;height:number;scale:number};
type Bounds={x:number;y:number;width:number;height:number};
export type ResourceOutlineCue={id:string;kind:'pickup'|'forage'|'tree'|'rock';distance:number;alpha:number;selected:boolean;placement?:Placement;loot?:Loot};
type Cache={bucket:number;layout:WorldLayout|undefined;axe:boolean;placements:Placement[];clear:Map<Placement,boolean>};
const caches=new WeakMap<World['camp'],Cache>();
export const resourceOutlineAlpha=(distance:number,selected=false)=>Math.max(0,1-(distance/RESOURCE_OUTLINE_RANGE)**2)*(selected?.48:.3);

function coveredByRoof(w:World,x:number,y:number,ownId?:string){
 return !w.scene&&!!w.layout&&visiblePlacements(w.layout,{x:x-30,y:y-70,width:60,height:90}).some(p=>p.id!==ownId&&ASSET_BY_ID.get(p.assetId)?.roof&&p.roof!=='hidden'&&!(p.roof==='auto'&&insideBuilding(p,w.player.x,w.player.y))&&(placementContains(p,x,y-35)||placementContains(p,x,y)));
}
/** Short-range, bounded discovery hints. They never change targeting or inventory. */
export function nearbyResourceOutlines(w:World,v:ResourceOutlineView,hideFoliage=false,pickups:readonly Loot[]=visiblePickupCues(w,v)):ResourceOutlineCue[]{
 if(w.phase==='over'||w.player.hp<=0||w.player.downedUntil||w.stationPanel)return [];
 const bucket=Math.floor(w.tick/6),axe=isAxe(w.player.equipped),target=getFieldKitTarget(w);let cache=caches.get(w.camp);
 if(!cache||cache.bucket!==bucket||cache.layout!==w.layout||cache.axe!==axe){
  cache={bucket,layout:w.layout,axe,placements:w.layout&&!w.scene?visiblePlacements(w.layout,{x:w.player.x-320,y:w.player.y-320,width:640,height:640}).filter(p=>FORAGE_BY_ID.has(p.assetId)||MINEABLE_ROCKS.has(p.assetId)||axe&&TREE_ART.has(p.assetId)):[],clear:new Map()};caches.set(w.camp,cache);
 }
 const cues:ResourceOutlineCue[]=[];
 for(const p of cache.placements){
  const forage=FORAGE_BY_ID.get(p.assetId),tree=TREE_ART.has(p.assetId),rock=MINEABLE_ROCKS.has(p.assetId);
  if(forage&&(!forageRemaining(w,p)||hideFoliage)||tree&&(hideFoliage||w.treeChops?.[p.id]?.hp===0)||rock&&(!p.solid||w.rockMining?.[p.id]?.hp===0))continue;
  const kind=forage?'forage':tree?'tree':'rock';
  const root=forage?forageRoot(p):tree?treeRoot(p):rockContact(p,w.player);
  const distance=Math.hypot(root.x-w.player.x,root.y-w.player.y);if(distance>=RESOURCE_OUTLINE_RANGE)continue;
  const b=transformedBounds(p,placementBounds(p));if(b.x+b.width<v.x||b.x>v.x+v.width||b.y+b.height<v.y||b.y>v.y+v.height)continue;
  let clear=cache.clear.get(p);
  if(clear===undefined){
   const stop=forage?(forage.kind==='apple'?40*p.scale:8):tree?38*p.scale+5:rock?9:0,ratio=Math.max(0,distance-stop)/(distance||1);
   clear=lineClear(w.player,{x:w.player.x+(root.x-w.player.x)*ratio,y:w.player.y+(root.y-w.player.y)*ratio},w)&&!coveredByRoof(w,root.x,root.y,p.id);cache.clear.set(p,clear);
  }
  if(!clear)continue;
  // Restored/legacy presentation targets can carry a numeric loot ID. Only
  // namespaced string IDs support placement suffix matching.
  const id=`${kind}:${p.id}`,selected=target?.forageId===p.id||target?.rockId===p.id||target?.treeId===p.id||typeof target?.id==='string'&&target.id.endsWith(`:${p.id}`);
  cues.push({id,kind,placement:p,distance,selected,alpha:resourceOutlineAlpha(distance,selected)});
 }
 for(const loot of pickups){
  const distance=Math.hypot(loot.x-w.player.x,loot.y-w.player.y);if(distance>=RESOURCE_OUTLINE_RANGE)continue;
  const selected=target?.pickupId===loot.id;cues.push({id:`pickup:${loot.id}`,kind:'pickup',loot,distance,selected,alpha:resourceOutlineAlpha(distance,selected)});
 }
 return cues.sort((a,b)=>Number(b.selected)-Number(a.selected)||a.distance-b.distance).slice(0,RESOURCE_OUTLINE_LIMIT);
}

/** Registration matches the actual loose-item draw functions, rather than HUD icons. */
export function pickupOutlineSprite(l:Loot){
 if(l.salvageVariant!==undefined)return{key:SCRAP_KEYS[l.salvageVariant],x:l.x-43,y:l.y-59,width:86,height:68};
 if(l.appearance==='logs')return{key:assetImageKey(TREE_LOG_IMAGE),x:l.x-35,y:l.y-34,width:70,height:47};
 if(['stone','ironOre','ironIngot'].includes(l.kind))return{key:l.kind,x:l.x-28,y:l.y-34,width:56,height:36};
 if(isProvision(l.kind))return{key:provisionImageKey(l.kind),x:l.x-24,y:l.y-43,width:48,height:48};
 const key=l.kind==='rawVenison'?'venisonRaw':l.kind==='cookedVenison'?'venisonCooked':l.kind==='rawRabbit'?'rabbitRaw':l.kind==='cookedRabbit'?'rabbitCooked':l.kind==='rawMeat'?'bonfireRaw':l.kind==='cookedMeat'?'bonfireCooked':l.kind==='scrap'?'bagScrap':l.kind==='fuel'?'bagFuel':undefined;
 if(!key)return;
 return isCookedFood(l.kind)?{key,x:l.x-29,y:l.y-44,width:58,height:48}:{key,x:l.x-24,y:l.y-39,width:48,height:40};
}
type OutlineContext=CanvasRenderingContext2D&{drawSpriteOutline?:(draw:()=>void,bounds:Bounds,alpha:number,width:number)=>void};
function transformedBounds(p:Placement,b:Bounds){
 const corners=[[b.x,b.y],[b.x+b.width,b.y],[b.x+b.width,b.y+b.height],[b.x,b.y+b.height]].map(([x,y])=>placementPoint(p,x,y));
 const xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys);return{x,y,width:Math.max(...xs)-x,height:Math.max(...ys)-y};
}
function transform(ctx:CanvasRenderingContext2D,p:Placement){
 ctx.translate(p.x,p.y);ctx.rotate((p.rotation||0)*Math.PI/180);ctx.translate(-p.x,-p.y);
 if(p.flipX||p.flipY){const b=placementBounds(p),x=b.x+b.width/2,y=b.y+b.height/2;ctx.translate(x,y);ctx.scale(p.flipX?-1:1,p.flipY?-1:1);ctx.translate(-x,-y)}
}
/** The same local Skia alpha-edge pass runs on web/iPhone. No readbacks or new textures. */
export function drawResourceOutlines(ctx:OutlineContext,imgs:Record<string,HTMLImageElement>,w:World,v:ResourceOutlineView,hideFoliage=false,pickups?:readonly Loot[]){
 if(!ctx.drawSpriteOutline)return;
 const s=Math.max(.1,v.scale),padding=5/s;
 for(const cue of nearbyResourceOutlines(w,v,hideFoliage,pickups)){
  let p=cue.placement;
  if(cue.loot?.placementId&&w.layout)p=visiblePlacements(w.layout,{x:cue.loot.x-2,y:cue.loot.y-2,width:4,height:4}).find(p=>p.id===cue.loot!.placementId);
  let draw:(()=>void)|undefined,bounds:Bounds|undefined;
  if(p){
   const asset=ASSET_BY_ID.get(p.assetId);if(!asset)continue;
   const frames=asset.openFrames?.length?asset.openFrames:asset.frames,ready=frames?.every(url=>!!imgs[assetImageKey(url)]),frame=ready?(asset.openFrames?.length?chestFrame(w,p.id,frames!.length):placedAnimationFrame(w,p,asset)):0;
   const image=imgs[assetImageKey(frames?.[frame]||asset.image)]??imgs[assetImageKey(asset.image)];if(!image)continue;
   let b=placementBounds(p);const placement=p,off=p.role==='hearth'&&!placedFireLit(w,p)&&asset.unlit?imgs[assetImageKey(asset.unlit)]:undefined;
   if(off&&!p.frame){const anchor=asset.unlitAnchor??[627,1190],size=asset.unlitSize??[1254,1254];b={...b,x:p.x-anchor[0]/size[0]*b.width,y:p.y-anchor[1]/size[1]*b.height}}
   bounds=transformedBounds(p,b);
   draw=()=>{ctx.save();transform(ctx,placement);if(off)ctx.drawImage(off,b.x,b.y,b.width,b.height);else ctx.drawImage(image,...asset.crop as [number,number,number,number],b.x,b.y,b.width,b.height);ctx.restore()};
  }else if(cue.loot){
   const sprite=pickupOutlineSprite(cue.loot),image=sprite&&imgs[sprite.key];if(!sprite||!image)continue;
   bounds=sprite;draw=()=>ctx.drawImage(image,sprite.x,sprite.y,sprite.width,sprite.height);
  }
  if(!bounds||!draw)continue;
  ctx.drawSpriteOutline(draw,{x:bounds.x-padding,y:bounds.y-padding,width:bounds.width+padding*2,height:bounds.height+padding*2},cue.alpha,(cue.selected?1.5:1.15)/s);
 }
}

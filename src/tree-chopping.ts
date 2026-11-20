import {placementContact} from './placement-contact';
import treeArt from './tree-art.json';
import {visiblePlacements} from './layout-views';
import {placementBounds,placementPoint} from './world-layout';
import {ASSET_BY_ID} from './world-assets';
import type {Placement} from './world-layout';
import type {World,Vec} from './survival-engine';
import {drawTreeContact} from './tree-contact';
import {getFieldKitTarget} from './field-kit-target';

type TreeArt=(typeof treeArt)[number]&{damageRect?:number[]};
export const TREE_ART=new Map<string,TreeArt>(treeArt.map(t=>[t.id,t]));
export type TreeChopState={hp:number;hitAt:number;direction:number;felledAt?:number};
const saplingStart=10;
const matureAt=60;
const fallSeconds=.8;
const stumpHeightScale=.46;
const stumpWidthScale=.76;

const clampUnit=(value:number)=>Math.min(1,Math.max(0,value));
function smoothTransition(start:number,end:number,age:number){
 const t=clampUnit((age-start)/(end-start));
 return t*t*(3-2*t);
}

function timeSinceFelling(state:TreeChopState,tick:number){
 // Convert the saved timestamp back to ticks so transitions land on the exact frame.
 return (tick-Math.round((state.felledAt??state.hitAt)*60))/60;
}

export function treeGrowthScale(w:World,state?:TreeChopState){
 if(state?.hp!==0)return 1;
 const progress=clampUnit((timeSinceFelling(state,w.tick)-saplingStart)/(matureAt-saplingStart));
 // Emerge from zero at the root pin and ease into the final size.
 return progress*(1+progress*(1-progress));
}

// Young crowns are narrower than their final silhouette.
export const treeCrownScale=(growth:number)=>growth*(.70+.30*growth);

export function activeTreeChop(w:World,id:string){
 const state=w.treeChops?.[id];
 return state?.hp===0&&treeGrowthScale(w,state)===1?undefined:state;
}

export function treeFallProgress(w:World,state:TreeChopState){
 return w.weather?.reducedMotion?1:Math.min(1,Math.max(0,timeSinceFelling(state,w.tick)/fallSeconds));
}
/** Match the visual root even when the editor mirrors or rotates the placement. */
export function treeRoot(p:Placement){const [x,y]=placementPoint(p,p.x,p.y);return{x,y}}
/** HUD focus and the contact frame use the same reachable face of the trunk. */
export function treeStrikePoint(p:Placement,player:Vec,angle:number,reach:number,halfArc:number,clear:(from:Vec,to:Vec)=>boolean){
 const contact=placementContact(p,player),dx=contact.x-player.x,dy=contact.y-player.y;
 if(Math.hypot(dx,dy)>Math.min(100,reach)||Math.cos(Math.atan2(dy,dx)-angle)<Math.cos(halfArc))return;
 if(clear(player,contact))return contact;
}
export function chopTree(w:World,angle:number,reach:number,halfArc:number,damage:number,clear:(from:Vec,to:Vec)=>boolean){
 if(!w.layout)return false;
 const player=w.player,t=w.tick/60;
 const candidates=visiblePlacements(w.layout,{x:player.x-reach-80,y:player.y-reach-80,width:2*(reach+80),height:2*(reach+80)});
 let nearest:{p:Placement;distance:number}|undefined;const focused=getFieldKitTarget(w)?.treeId;
 for(const p of candidates){const art=TREE_ART.get(p.assetId);if(!art||activeTreeChop(w,p.id)?.hp===0)continue;
  const contact=treeStrikePoint(p,player,angle,reach,halfArc,clear);
  if(!contact)continue;
  const d=Math.hypot(contact.x-player.x,contact.y-player.y);
  if(nearest&&(nearest.p.id===focused||p.id!==focused&&d>=nearest.distance))continue;
  nearest={p,distance:d};
 }
 if(!nearest)return false;
 const p=nearest.p,art=TREE_ART.get(p.assetId)!,states=w.treeChops??={};
 const hp=Math.max(0,(activeTreeChop(w,p.id)?.hp??art.hp)-damage);
 states[p.id]={hp,hitAt:t,direction:Math.cos(angle)>=0?1:-1,...(hp===0?{felledAt:t}:{})};
 if(hp===0){
  // Drop once, on the player's reachable side. The existing wood supply slot
  // handles manual pickup, backpack capacity and deposits; no new inventory.
  const root=treeRoot(p),away=Math.atan2(player.y-root.y,player.x-root.x);
  const leaves=candidates.filter(q=>ASSET_BY_ID.get(q.assetId)?.foliage).map(q=>placementBounds(q));
  // Prefer visible ground beside the player's feet over dropping beneath a
  // thick shrub or the player's body. Search is bounded and happens only on felling.
  let point={x:player.x,y:player.y},best=Infinity;
  for(let i=0;i<12;i++){
   const a=away+i*Math.PI/6,q={x:player.x+Math.cos(a)*66,y:player.y+Math.sin(a)*66};
   if(Math.hypot(q.x-root.x,q.y-root.y)<65*p.scale||!clear(player,q))continue;
   const cover=leaves.filter(b=>q.x>b.x-20&&q.x<b.x+b.width+20&&q.y>b.y&&q.y<b.y+b.height+25).length;
   const score=cover*10+i*.01;if(score<best){best=score;point=q;}
  }
  w.loot.push({...point,id:w.serial++,kind:'pallets',appearance:'logs',sourceTreeId:p.id,amount:art.hp>=140?4:art.hp>=100?3:2,flight:{from:root,born:t,lands:t+fallSeconds}});
 }
 return true;
}

/** Three regions of a shared atlas; no per-hit loads, image copies, or idle animation. */
export function drawTree(ctx:CanvasRenderingContext2D,im:HTMLImageElement,w:World,p:Placement,mode:'world'|'outline'|'preview'='world'){
 const art=TREE_ART.get(p.assetId);if(!art)return false;
 const state=mode==='preview'?undefined:activeTreeChop(w,p.id),t=w.tick/60,age=state?t-state.hitAt:Infinity;
 const b=placementBounds(p),baseScale=b.width/art.frames[0].crop[2];
 const draw=(stage:number,widthScale=1,heightScale=widthScale)=>{
  const k=baseScale*widthScale;
  if(stage===1&&art.damageRect){
   const h=art.frames[0],[x,y,width,height]=art.damageRect;
   const piece=(sx:number,sy:number,sw:number,sh:number)=>{if(sw>0&&sh>0)ctx.drawImage(im,h.crop[0]+sx,h.crop[1]+sy,sw,sh,p.x+(sx-h.anchor[0])*k,p.y+(sy-h.anchor[1])*k,sw*k,sh*k)};
   // Replace the cut rectangle: transparent missing wood must not reveal intact bark.
   piece(0,0,h.crop[2],y);piece(0,y,x,height);piece(x+width,y,h.crop[2]-x-width,height);piece(0,y+height,h.crop[2],h.crop[3]-y-height);
  }
  const f=art.frames[stage],ky=baseScale*heightScale;
  ctx.drawImage(im,...f.crop as [number,number,number,number],p.x-f.anchor[0]*k,p.y-f.anchor[1]*ky,f.crop[2]*k,f.crop[3]*ky);
 };
 const reduced=w.weather?.reducedMotion;
 ctx.save();
 const growth=treeGrowthScale(w,state);
 const alpha=ctx.globalAlpha;
 const crownWidth=treeCrownScale(growth);
 if(state?.hp===0){
  const elapsed=timeSinceFelling(state,w.tick);
  const stump=1-smoothTransition(4,saplingStart,elapsed);
  if(stump>0){
   const width=stumpWidthScale*(.62+.38*stump);
   ctx.globalAlpha=alpha*stump;
   if(mode==='world')drawTreeContact(ctx,p.x,p.y,baseScale*80*width);
   draw(2,width,stumpHeightScale*stump);
  }
  if(growth>0){
   // The whole sapling uses this species' painting from its first visible
   // frame. Young crowns fill out more slowly than the leader gains height.
   if(mode==='world')drawTreeContact(ctx,p.x,p.y,baseScale*80*crownWidth);
   draw(0,crownWidth,growth);
  }
  const fall=treeFallProgress(w,state);
  if(fall<1){
   const frame=art.frames[0],[sx,sy,sw]=frame.crop;
   const breakHeight=art.cutHeight*stumpHeightScale;
   const aboveCut=frame.anchor[1]-breakHeight;
   const cutY=p.y-breakHeight*baseScale;
   const tilt=fall*fall*1.52;
   // Separate at the cut face, so the crown never swings the planted roots.
   ctx.globalAlpha=alpha*(1-smoothTransition(.58,1,fall));
   ctx.translate(p.x,cutY+breakHeight*baseScale*fall*fall*.8);
   ctx.rotate(state.direction*tilt);
   ctx.drawImage(im,sx,sy,sw,aboveCut,-frame.anchor[0]*baseScale,-aboveCut*baseScale,sw*baseScale,aboveCut*baseScale);
  }
 }else{
  if(mode==='world')drawTreeContact(ctx,p.x,p.y,baseScale*80);
  if(!reduced&&age<.24){ctx.translate(p.x,p.y);ctx.rotate(Math.sin(age/.24*Math.PI*3)*.025*(1-age/.24)*state!.direction);ctx.translate(-p.x,-p.y)}
  draw(state?1:0);
 }
 ctx.restore();return true;
}

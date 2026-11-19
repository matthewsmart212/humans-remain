import treeArt from './tree-art.json';
import {visiblePlacements} from './layout-views';
import {placementBounds,placementPoint} from './world-layout';
import {ASSET_BY_ID} from './world-assets';
import type {Placement} from './world-layout';
import type {World,Vec} from './survival-engine';
import {getFieldKitTarget} from './field-kit-target';

type TreeArt=(typeof treeArt)[number]&{damageRect?:number[]};
export const TREE_ART=new Map<string,TreeArt>(treeArt.map(t=>[t.id,t]));
export type TreeChopState={hp:number;hitAt:number;direction:number;felledAt?:number};
const growthScales=[0,.19,.44,.73,1] as const;
const stageSeconds=15;
const fallSeconds=.55;

function timeSinceFelling(state:TreeChopState,tick:number){
 // Convert the saved timestamp back to ticks so transitions land on the exact frame.
 return (tick-Math.round((state.felledAt??state.hitAt)*60))/60;
}

export function treeGrowthScale(w:World,state?:TreeChopState){
 if(state?.hp!==0)return 1;
 const stage=Math.floor(timeSinceFelling(state,w.tick)/stageSeconds);
 return growthScales[Math.min(growthScales.length-1,Math.max(0,stage))];
}

export function activeTreeChop(w:World,id:string){
 const state=w.treeChops?.[id];
 return state?.hp===0&&treeGrowthScale(w,state)===1?undefined:state;
}

export function treeFallProgress(w:World,state:TreeChopState){
 return w.weather?.reducedMotion?1:Math.min(1,Math.max(0,timeSinceFelling(state,w.tick)/fallSeconds));
}
/** Match the visual root even when the editor mirrors or rotates the placement. */
export function treeRoot(p:Placement){const [x,y]=placementPoint(p,p.x,p.y);return{x,y}}
export function chopTree(w:World,angle:number,reach:number,halfArc:number,damage:number,clear:(from:Vec,to:Vec)=>boolean){
 if(!w.layout)return false;
 const player=w.player,t=w.tick/60;
 const candidates=visiblePlacements(w.layout,{x:player.x-reach-80,y:player.y-reach-80,width:2*(reach+80),height:2*(reach+80)});
 let nearest:{p:Placement;distance:number}|undefined;const focused=getFieldKitTarget(w)?.treeId;
 for(const p of candidates){const art=TREE_ART.get(p.assetId);if(!art||activeTreeChop(w,p.id)?.hp===0)continue;
  const root=treeRoot(p),dx=root.x-player.x,dy=root.y-player.y,d=Math.hypot(dx,dy);
  if(d>reach||Math.cos(Math.atan2(dy,dx)-angle)<Math.cos(halfArc))continue;
  if(nearest&&(nearest.p.id===focused||p.id!==focused&&d>=nearest.distance))continue;
  // Stop at the near face of the trunk, not inside its own movement blocker.
  const radius=38*p.scale+5,ratio=Math.max(0,d-radius)/(d||1);
  if(!clear(player,{x:player.x+dx*ratio,y:player.y+dy*ratio}))continue;
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

/** Keep the narrow trunk flare above the uneven soil line. The long root
 * fingers painted into the atlas extend below this silhouette. */
function clipTreeBase(ctx:CanvasRenderingContext2D,x:number,y:number,k:number,stump:boolean){
 const shoulder=stump?92:74;
 const edge=stump?-34:-66;
 ctx.beginPath();
 ctx.moveTo(x-1600*k,y-1600*k);
 ctx.lineTo(x+1600*k,y-1600*k);
 ctx.lineTo(x+1600*k,y+(edge-35)*k);
 ctx.lineTo(x+shoulder*k,y+edge*k);
 ctx.lineTo(x+36*k,y-11*k);
 ctx.lineTo(x+9*k,y+2*k);
 ctx.lineTo(x-19*k,y-3*k);
 ctx.lineTo(x-41*k,y-15*k);
 ctx.lineTo(x-shoulder*k,y+(edge+4)*k);
 ctx.lineTo(x-1600*k,y+(edge-35)*k);
 ctx.closePath();
 ctx.clip();
}

function drawTreeContact(ctx:CanvasRenderingContext2D,x:number,y:number,k:number){
 ctx.save();
 ctx.translate(x,y-5*k);
 ctx.scale(67*k,23*k);
 const shade=ctx.createRadialGradient(0,0,0,0,0,1);
 shade.addColorStop(0,'rgba(24,17,10,.68)');
 shade.addColorStop(.55,'rgba(33,23,12,.35)');
 shade.addColorStop(1,'rgba(33,23,12,0)');
 ctx.fillStyle=shade;
 ctx.fillRect(-1,-1,2,2);
 ctx.restore();
}

/** Three regions of a shared atlas; no per-hit loads, image copies, or idle animation. */
export function drawTree(ctx:CanvasRenderingContext2D,im:HTMLImageElement,w:World,p:Placement,mode:'world'|'outline'|'preview'='world'){
 const art=TREE_ART.get(p.assetId);if(!art)return false;
 const state=mode==='preview'?undefined:activeTreeChop(w,p.id),t=w.tick/60,age=state?t-state.hitAt:Infinity;
 const baseScale=placementBounds(p).width/art.frames[0].crop[2];
 const draw=(stage:number,growth=1)=>{
  const k=baseScale*growth;
  ctx.save();
  clipTreeBase(ctx,p.x,p.y,k,stage===2);
  if(stage===1&&art.damageRect){
   const h=art.frames[0],[x,y,width,height]=art.damageRect;
   const piece=(sx:number,sy:number,sw:number,sh:number)=>{if(sw>0&&sh>0)ctx.drawImage(im,h.crop[0]+sx,h.crop[1]+sy,sw,sh,p.x+(sx-h.anchor[0])*k,p.y+(sy-h.anchor[1])*k,sw*k,sh*k)};
   // Replace the cut rectangle: transparent missing wood must not reveal intact bark.
   piece(0,0,h.crop[2],y);piece(0,y,x,height);piece(x+width,y,h.crop[2]-x-width,height);piece(0,y+height,h.crop[2],h.crop[3]-y-height);
  }
  const f=art.frames[stage];ctx.drawImage(im,...f.crop as [number,number,number,number],p.x-f.anchor[0]*k,p.y-f.anchor[1]*k,f.crop[2]*k,f.crop[3]*k);
  ctx.restore();
 };
 const reduced=w.weather?.reducedMotion;
 ctx.save();
 const growth=treeGrowthScale(w,state);
 if(mode==='world')drawTreeContact(ctx,p.x,p.y,baseScale*Math.max(.75,growth));
 if(state?.hp===0){
  if(growth>0)draw(0,growth);
  else{
   draw(2);
   const fall=treeFallProgress(w,state);
   if(fall<1){ctx.translate(p.x,p.y);ctx.rotate(state.direction*fall*fall*.75);ctx.translate(-p.x,-p.y);ctx.globalAlpha*=1-fall;draw(1)}
  }
 }else{
  const [px,py]=placementPoint(p,w.player.x,w.player.y,true),b=placementBounds(p);
  if(mode==='world'&&p.allowTransparency!==false&&py<p.y&&py>b.y&&Math.abs(px-p.x)<b.width*.3)ctx.globalAlpha*=.6;
  if(!reduced&&age<.24){ctx.translate(p.x,p.y);ctx.rotate(Math.sin(age/.24*Math.PI*3)*.025*(1-age/.24)*state!.direction);ctx.translate(-p.x,-p.y)}
  draw(state?1:0);
 }
 ctx.restore();return true;
}

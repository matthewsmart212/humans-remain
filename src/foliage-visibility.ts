import {ASSET_BY_ID} from './world-assets';
import {visiblePlacements} from './layout-views';
import {compareWorldDrawables,placementBounds,placementPoint,type Placement,type WorldLayout} from './world-layout';
import {drawWorker} from './worker-renderer';
import type {World} from './survival-engine';

type Bounds={x:number;y:number;width:number;height:number};
type Drawable={roof?:boolean;layer?:number;y:number;draw:()=>void};
type OutlineContext=CanvasRenderingContext2D&{
 drawSpriteOutline?:(draw:()=>void,bounds:Bounds,alpha:number,width:number)=>void;
 drawMaskedSpriteOutline?:(draw:()=>void,mask:()=>void,bounds:Bounds,alpha:number,width:number)=>void;
};
const smooth=(n:number)=>{n=Math.max(0,Math.min(1,n));return n*n*(3-2*n)};
const samples=[-22,0,22].flatMap(x=>[-20,-42,-64,-86].map(y=>({x,y})));
function canopyAmount(p:Placement,x:number,y:number){
 const b=placementBounds(p),[lx,ly]=placementPoint(p,x,y,true);
 const dx=(lx-b.x-b.width*.5)/(b.width*.46),dy=(ly-b.y-b.height*.48)/(b.height*.43);
 return smooth((1-dx*dx-dy*dy)*3);
}
/** A local spatial query and twelve body samples; no all-camp scan or texture
 * readback. Only foliage drawn in front can obscure the player. */
export function foliagePlayerOcclusion(layout:WorldLayout,player:{x:number;y:number},nearby=visiblePlacements(layout,{x:player.x-75,y:player.y-145,width:150,height:165})){
 const cover=samples.map(()=>0),plants:Placement[]=[];
 let depth={layer:0,y:player.y};
 for(const p of nearby){
  const a=ASSET_BY_ID.get(p.assetId);if(!a?.foliage)continue;
  const y=placementPoint(p,p.x,p.y)[1];if(compareWorldDrawables({layer:p.layer,y},{y:player.y})<=0)continue;
  let overlaps=false;
  samples.forEach((s,i)=>{const amount=canopyAmount(p,player.x+s.x,player.y+s.y);cover[i]=Math.max(cover[i],amount);overlaps ||= amount>0});
  if(!overlaps)continue;plants.push(p);
  if(compareWorldDrawables({layer:p.layer,y},depth)>0)depth={layer:p.layer??0,y};
 }
 const coverage=cover.reduce((sum,n)=>sum+n,0)/cover.length,alpha=smooth((coverage-.24)/.4)*.62;
 if(!alpha)return;
 return{...depth,y:depth.y+.01,alpha,coverage,plants};
}

/** Restrict the extra pass to paintings near the body. The actual drawn alpha
 * mask below handles transparent holes, crops, flips and animated poses. */
export function playerOutlinePass(ctx:OutlineContext,imgs:Record<string,HTMLImageElement>,w:World,scale:number){
 if(!w.layout||!ctx.drawSpriteOutline||!ctx.drawMaskedSpriteOutline)return;
 const player=w.player;
 const bounds={x:player.x-135,y:player.y-165,width:270,height:200};
 const nearby=visiblePlacements(w.layout,bounds);
 const foliage=scale>=.42?foliagePlayerOcclusion(w.layout,player,nearby):undefined;
 const plants=new Set(foliage?.plants);
 const placements=new Set<Placement>();
 for(const p of nearby){
  const a=ASSET_BY_ID.get(p.assetId);
  if(!a||a.groundDetail||a.puddle||a.foliage&&!plants.has(p))continue;
  const b=placementBounds(p),[x,y]=placementPoint(p,player.x,player.y-55,true);
  // A 90-unit enclosing radius includes the torso, head and feet at any rotation.
  const roof=a.roofRect;
  const left=b.x+Math.min(0,roof?roof[0]/a.crop[2]:0)*b.width;
  const top=b.y+Math.min(0,roof?roof[1]/a.crop[3]:0)*b.height;
  const right=b.x+Math.max(1,roof?(roof[0]+roof[2])/a.crop[2]:1)*b.width;
  const bottom=b.y+Math.max(1,roof?(roof[1]+roof[3])/a.crop[3]:1)*b.height;
  if(x+90>=left&&x-90<=right&&y+90>=top&&y-90<=bottom)placements.add(p);
 }
 const covers:Drawable[]=[],leaves=new Set<Drawable>();
 return{bounds,placements,covers,leaves,drawable():Drawable|undefined{
  // Circular walls resolve their final depth after all bays have been collected.
  const front=covers.filter(d=>compareWorldDrawables(d,{y:player.y})>0).sort(compareWorldDrawables);
  const last=front.at(-1);if(!last)return;
  const alpha=foliage&&front.every(d=>leaves.has(d))?foliage.alpha:.62;
  return{roof:last.roof,layer:last.layer,y:last.y+.001,draw:()=>{
   ctx.drawMaskedSpriteOutline!(()=>drawWorker(ctx,imgs,w),()=>{for(const d of front)d.draw()},bounds,alpha,1.25/Math.max(.6,scale));
  }};
 }};
}

import {ASSET_BY_ID} from './world-assets';
import {visiblePlacements} from './layout-views';
import {compareWorldDrawables,placementBounds,placementPoint,placementContains,type Placement,type WorldLayout} from './world-layout';
import {drawWorker} from './worker-renderer';
import type {World} from './survival-engine';

type OutlineContext=CanvasRenderingContext2D&{
 drawSpriteOutline?:(draw:()=>void,bounds:{x:number;y:number;width:number;height:number},alpha:number,width:number)=>void;
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
export function foliagePlayerOcclusion(layout:WorldLayout,player:{x:number;y:number}){
 const nearby=visiblePlacements(layout,{x:player.x-75,y:player.y-145,width:150,height:165});
 const cover=samples.map(()=>0),plants:Placement[]=[];
 let depth={layer:0,y:player.y};
 for(const p of nearby){
  const a=ASSET_BY_ID.get(p.assetId);if(!a?.foliage||compareWorldDrawables({layer:p.layer,y:p.y},{y:player.y})<=0)continue;
  let overlaps=false;
  samples.forEach((s,i)=>{const amount=canopyAmount(p,player.x+s.x,player.y+s.y);cover[i]=Math.max(cover[i],amount);overlaps ||= amount>0});
  if(!overlaps)continue;plants.push(p);
  if(compareWorldDrawables({layer:p.layer,y:p.y},depth)>0)depth={layer:p.layer??0,y:p.y};
 }
 const coverage=cover.reduce((sum,n)=>sum+n,0)/cover.length,alpha=smooth((coverage-.24)/.4)*.62;
 if(!alpha)return;
 // This feature must not become an x-ray through camp walls or other solid
 // props when a plant happens to stand in front of the same place.
 if(nearby.some(p=>p.solid&&!ASSET_BY_ID.get(p.assetId)?.foliage&&
  compareWorldDrawables({layer:p.layer,y:p.y},{y:player.y})>0&&placementContains(p,player.x,player.y-45)))return;
 return{...depth,y:depth.y+.01,alpha,coverage,plants};
}
export function foliagePlayerOutline(ctx:OutlineContext,imgs:Record<string,HTMLImageElement>,w:World,scale:number){
 if(!w.layout||!ctx.drawSpriteOutline||scale<.42)return;
 const occlusion=foliagePlayerOcclusion(w.layout,w.player);if(!occlusion)return;
 return{layer:occlusion.layer,y:occlusion.y,draw:()=>{
  ctx.save();ctx.beginPath();
  // Restrict the outline to the covering canopies: visible face/hair retain
  // their original appearance, and leaves retain all of their opacity.
  for(const p of occlusion.plants){const b=placementBounds(p);
   for(let i=0;i<20;i++){const t=i/20*Math.PI*2,[x,y]=placementPoint(p,b.x+b.width*(.5+Math.cos(t)*.46),b.y+b.height*(.48+Math.sin(t)*.43));i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();
  }
  ctx.clip();
  const p=w.player;
  ctx.drawSpriteOutline!(()=>drawWorker(ctx,imgs,w),{x:p.x-135,y:p.y-165,width:270,height:200},occlusion.alpha,1.25/Math.max(.6,scale));
  ctx.restore();
 }};
}

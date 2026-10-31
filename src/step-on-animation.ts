import {buildingRestored,campBuildingId} from './camp-restoration';
import {layoutViews} from './layout-views';
import {advanceAnimation,animationFrame} from './asset-animation';
import {ASSET_BY_ID,type WorldAsset} from './world-assets';
import {placementBounds,placementPoint,type Placement,type WorldLayout} from './world-layout';
import {hitCollider} from './camp-collision';

export type StepOnMotion={position:number;active:boolean};
type AnimationWorld={progression?:import('./run-progression').RunProgression;tick:number;player:{x:number;y:number};layout?:WorldLayout;stepOnMotions?:Record<string,StepOnMotion>};

/** Test the player's feet in image space, including authored flips, size and rotation. */
export function onAnimationArea(p:Placement,asset:WorldAsset,x:number,y:number){
 const area=asset.animationArea;if(!area)return false;
 const bounds=placementBounds(p),[localX,localY]=placementPoint(p,x,y,true);
 const u=(localX-bounds.x)/bounds.width,v=(localY-bounds.y)/bounds.height;
 if(u<0||u>1||v<0||v>1)return false;
 return hitCollider({id:p.id,shape:'polygon',points:area.points,x:.5,y:.5,hw:.5,hh:.5},u,v,0);
}

export function stepOnAnimations(world:AnimationWorld,seconds=1/60){
 const live=new Set<string>();
 for(const placement of layoutViews(world.layout).stepOn){
  const id=campBuildingId(placement.assetId);if(id&&!buildingRestored(world,id))continue;
  const asset=ASSET_BY_ID.get(placement.assetId);
  if(asset?.animationMode!=='step-on'||!asset.frames?.length)continue;
  live.add(placement.id);
  const active=onAnimationArea(placement,asset,world.player.x,world.player.y),previous=world.stepOnMotions?.[placement.id];
  if(!active&&!previous)continue;
  (world.stepOnMotions??={})[placement.id]={active,position:advanceAnimation(previous?.position||0,active,asset.frames.length,asset.fps||8,seconds)};
 }
 // Deleted/replaced objects must not inherit an old animation when added again.
 for(const id of Object.keys(world.stepOnMotions||{}))if(!live.has(id))delete world.stepOnMotions![id];
}

export function placedAnimationFrame(world:AnimationWorld,placement:Placement,asset:WorldAsset){
 const count=asset.frames?.length||1;
 return asset.animationMode==='step-on'?animationFrame(world.stepOnMotions?.[placement.id]?.position||0,count):Math.floor(world.tick*(asset.fps||7.5)/60)%count;
}

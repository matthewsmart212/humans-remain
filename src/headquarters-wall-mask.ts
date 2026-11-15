import {ASSET_BY_ID} from './world-assets';
import {HQ_SOUTH_INTERIOR} from './headquarters-south-art';
import {placementBounds,placementPoint,type WorldLayout,type Placement} from './world-layout';

type Mask={placement:Placement;points:[number,number][];left:number;top:number;right:number;bottom:number};
const cached=new WeakMap<WorldLayout,Mask[]>();
/** Clip stockade pixels *behind* the HQ silhouette, not just its walkable
 * floor. The original v=.23 mask left tall wall boards drawn over the exposed
 * rear wall after the roof disappeared. The surrounding palisade and its
 * collisions remain untouched in either HQ condition. */
export function headquartersWallMasks(layout:WorldLayout):Mask[]{
 let masks=cached.get(layout);if(masks)return masks;
 masks=layout.items.filter(p=>ASSET_BY_ID.get(p.assetId)?.image===HQ_SOUTH_INTERIOR).map(p=>{
  // Reach just above the high rear wall, then flare around the outer sides.
  // The polygon follows the HQ's own rotated/flipped placement coordinates.
  const b=placementBounds(p),points=([[.15,-.035],[.85,-.035],[.94,.20],[.965,.44],[.965,.81],[.035,.81],[.035,.44],[.06,.20]] as const).map(([u,v])=>placementPoint(p,b.x+u*b.width,b.y+v*b.height));
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return{placement:p,points,left:Math.min(...xs),top:Math.min(...ys),right:Math.max(...xs),bottom:Math.max(...ys)};
 });cached.set(layout,masks);return masks;
}
export function clipWallsOutsideHeadquarters(ctx:CanvasRenderingContext2D,masks:Mask[],b:{x:number;y:number;width:number;height:number}){
 for(const m of masks){
  if(b.x>m.right||b.x+b.width<m.left||b.y>m.bottom||b.y+b.height<m.top)continue;
  ctx.beginPath();
  const native=ctx as CanvasRenderingContext2D&{clipOutsidePath?:()=>void};
  if(!native.clipOutsidePath){ctx.moveTo(b.x-1,b.y-1);ctx.lineTo(b.x+b.width+1,b.y-1);ctx.lineTo(b.x+b.width+1,b.y+b.height+1);ctx.lineTo(b.x-1,b.y+b.height+1);ctx.closePath()}
  m.points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
  if(native.clipOutsidePath)native.clipOutsidePath();else ctx.clip('evenodd');
 }
}

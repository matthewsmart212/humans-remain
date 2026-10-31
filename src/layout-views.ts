import {ASSET_BY_ID} from './world-assets';
import {placementBounds,placementPoint,type Placement,type WorldLayout} from './world-layout';
import type {FoliageViewport} from './foliage-renderer';
type Bound={p:Placement;r:number;order:number;foliage:boolean};
type Query={x:number;y:number;width:number;height:number;placements:Placement[];ground:Placement[]};
type Index={plain:Placement[];ground:Placement[];shelters:Placement[];stepOn:Placement[];chests:Placement[];gates:Placement[];cells:Map<string,Bound[]>;queries:Query[]};
let cache=new WeakMap<WorldLayout,Index>();
export function invalidateLayoutViews(){cache=new WeakMap()}
export function layoutViews(layout?:WorldLayout):Index{
 if(!layout)return{plain:[],ground:[],shelters:[],stepOn:[],chests:[],gates:[],cells:new Map(),queries:[]};
 let index=cache.get(layout);if(index)return index;
 index={plain:[],ground:[],shelters:[],stepOn:[],chests:[],gates:[],cells:new Map(),queries:[]};
 for(const [order,p] of layout.items.entries()){const a=ASSET_BY_ID.get(p.assetId);if(!a)continue;
  if(a.gate)index.gates.push(p);if(a.ground)index.ground.push(p);if(a.interior)index.shelters.push(p);if(a.animationMode==='step-on'&&a.frames?.length)index.stepOn.push(p);if(a.openFrames?.length)index.chests.push(p);
  if(!a.foliage)index.plain.push(p);
  const b=placementBounds(p),rects=[b];
  if(a.ground){const [x,y,w,h]=a.ground.rect;rects.push({x:b.x+x*b.width,y:b.y+y*b.height,width:w*b.width,height:h*b.height})}
  if(a.roofRect){const [x,y,w,h]=a.roofRect;rects.push({x:b.x+x/a.crop[2]*b.width,y:b.y+y/a.crop[3]*b.height,width:w/a.crop[2]*b.width,height:h/a.crop[3]*b.height})}
  const r=Math.max(...rects.flatMap(rect=>[[rect.x,rect.y],[rect.x+rect.width,rect.y],[rect.x,rect.y+rect.height],[rect.x+rect.width,rect.y+rect.height]].map(([x,y])=>{const [wx,wy]=placementPoint(p,x,y);return Math.hypot(wx-p.x,wy-p.y)})))*1.2+40,entry={p,r,order,foliage:!!a.foliage};
  for(let x=Math.floor((p.x-r)/256);x<=Math.floor((p.x+r)/256);x++)for(let y=Math.floor((p.y-r)/256);y<=Math.floor((p.y+r)/256);y++){const k=x+','+y,cell=index.cells.get(k)||[];cell.push(entry);index.cells.set(k,cell)}
 }
 cache.set(layout,index);return index;
}
/** Query visible objects, including rotated artwork, roofs and ground decals. Draw order is
 * still resolved by the existing layer / ground-anchor depth sorter. */
function queryPlacements(layout:WorldLayout,view:FoliageViewport){
 const index=layoutViews(layout),cached=index.queries.find(q=>q.x===view.x&&q.y===view.y&&q.width===view.width&&q.height===view.height);
 if(cached)return cached;
 const seen=new Set<Placement>(),plants:Placement[]=[],plain:Bound[]=[],ground:Bound[]=[];
 for(let x=Math.floor(view.x/256);x<=Math.floor((view.x+view.width)/256);x++)for(let y=Math.floor(view.y/256);y<=Math.floor((view.y+view.height)/256);y++)for(const entry of index.cells.get(x+','+y)||[]){
  const {p,r,foliage}=entry;
  if(seen.has(p))continue;seen.add(p);
  if(p.x+r>=view.x&&p.x-r<=view.x+view.width&&p.y+r>=view.y&&p.y-r<=view.y+view.height){if(foliage)plants.push(p);else plain.push(entry);if(ASSET_BY_ID.get(p.assetId)?.ground)ground.push(entry);}
 }
 // Preserve the old equal-depth placement order without scanning every distant
 // tree, rock and building each time the renderer or axe asks for local items.
 plain.sort((a,b)=>a.order-b.order);ground.sort((a,b)=>a.order-b.order);
 const result={x:view.x,y:view.y,width:view.width,height:view.height,placements:[...plain.map(q=>q.p),...plants],ground:ground.map(q=>q.p)};
 // The main camera and the player's small occlusion query usually alternate.
 // Reuse both without retaining an unbounded trail as the camera travels.
 index.queries.unshift(result);if(index.queries.length>2)index.queries.pop();return result;
}
/** Returned lists belong to the immutable layout cache; callers must not sort them in place. */
export function visiblePlacements(layout:WorldLayout,view?:FoliageViewport){return view?queryPlacements(layout,view).placements:layout.items}
export function visibleGroundPlacements(layout:WorldLayout,view?:FoliageViewport){return view?queryPlacements(layout,view).ground:layoutViews(layout).ground}

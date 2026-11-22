import {FISHING_PIER_ID,FISHING_PIER_DECK,FISHING_PIER_FOREGROUND,FISHING_PIER_ENTRY,type FishingPoint} from './fishing-site-art';
import {fishingPierMetadata} from './fishing-site-metadata';
import type {Placement,WorldLayout} from './world-layout';

type Bounds={x:number;y:number;width:number;height:number};
export type FishingPierGeometry={
 bounds:Bounds;worldBounds:Bounds;deckBounds:Bounds;deck:readonly FishingPoint[];
 originX:number;originY:number;uX:number;uY:number;vX:number;vY:number;
 waterEnd:{x:number;y:number};
 foreground:readonly {id:string;outline:readonly FishingPoint[];foot:{x:number;y:number}}[];
};
type GeometryCache={x:number;y:number;scale:number;rotation:number;flipX:boolean;flipY:boolean;width:number;height:number;ax:number;ay:number;value:FishingPierGeometry};
let geometries=new WeakMap<Placement,GeometryCache>();
let layouts=new WeakMap<WorldLayout,{items:Placement[];length:number;piers:readonly Placement[]}>();

/** No asset registry import: water collision can use deck geometry without a module cycle. */
export function invalidateFishingSiteGeometry(){geometries=new WeakMap();layouts=new WeakMap()}
export function fishingPiers(layout?:WorldLayout):readonly Placement[]{
 if(!layout)return [];
 const cached=layouts.get(layout);
 if(cached&&cached.items===layout.items&&cached.length===layout.items.length)return cached.piers;
 const piers=layout.items.filter(p=>p.assetId===FISHING_PIER_ID);
 layouts.set(layout,{items:layout.items,length:layout.items.length,piers});
 return piers;
}
function bounds(points:readonly FishingPoint[]):Bounds{
 let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
 for(const [x,y]of points){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
 return points.length?{x:left,y:top,width:right-left,height:bottom-top}:{x:0,y:0,width:0,height:0};
}
export function fishingPierGeometry(p:Placement):FishingPierGeometry{
 const metadata=fishingPierMetadata(),width=p.frame?.width??metadata.width,height=p.frame?.height??metadata.height;
 const ax=p.frame?.anchor[0]??metadata.anchor[0],ay=p.frame?.anchor[1]??metadata.anchor[1];
 const rotation=p.rotation??0,flipX=!!p.flipX,flipY=!!p.flipY,cached=geometries.get(p);
 if(cached&&cached.x===p.x&&cached.y===p.y&&cached.scale===p.scale&&cached.rotation===rotation&&cached.flipX===flipX&&cached.flipY===flipY&&cached.width===width&&cached.height===height&&cached.ax===ax&&cached.ay===ay)return cached.value;
 const w=width*p.scale,h=height*p.scale,angle=rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
 // Match placementPoint: mirror around the image centre, then rotate around its anchor.
 const dx=((flipX?1:0)-ax)*w,dy=((flipY?1:0)-ay)*h;
 const originX=p.x+dx*c-dy*s,originY=p.y+dx*s+dy*c;
 const uX=(flipX?-1:1)*w*c,uY=(flipX?-1:1)*w*s,vX=-(flipY?-1:1)*h*s,vY=(flipY?-1:1)*h*c;
 const point=([u,v]:FishingPoint):FishingPoint=>[originX+u*uX+v*vX,originY+u*uY+v*vY];
 const deck=FISHING_PIER_DECK.map(point);
 const foreground=FISHING_PIER_FOREGROUND.map(part=>{const [x,y]=point(part.foot);return{id:part.id,outline:part.outline,foot:{x,y}}});
 const farthest=[...FISHING_PIER_DECK].sort((a,b)=>Math.hypot(b[0]-FISHING_PIER_ENTRY[0],b[1]-FISHING_PIER_ENTRY[1])-Math.hypot(a[0]-FISHING_PIER_ENTRY[0],a[1]-FISHING_PIER_ENTRY[1])).slice(0,3);
 const end: FishingPoint=farthest.length?[farthest.reduce((sum,p)=>sum+p[0],0)/farthest.length,farthest.reduce((sum,p)=>sum+p[1],0)/farthest.length]:[.22,.76];
 const [endX,endY]=point(end);
 const value:FishingPierGeometry={bounds:{x:p.x-ax*w,y:p.y-ay*h,width:w,height:h},
  worldBounds:bounds(([ [0,0],[1,0],[1,1],[0,1] ] as const).map(point)),deckBounds:bounds(deck),deck,
  originX,originY,uX,uY,vX,vY,waterEnd:{x:endX,y:endY},foreground};
 geometries.set(p,{x:p.x,y:p.y,scale:p.scale,rotation,flipX,flipY,width,height,ax,ay,value});
 return value;
}
export function fishingPierPoint(p:Placement,u:number,v:number){
 const g=fishingPierGeometry(p);return{x:g.originX+u*g.uX+v*g.vX,y:g.originY+u*g.uY+v*g.vY};
}
/** An entire body circle must fit on the continuous deck, including concave corners. */
export function fishingPierDeckContains(p:Placement,x:number,y:number,r=0){
 const g=fishingPierGeometry(p),b=g.deckBounds,points=g.deck;
 if(points.length<3||x-r<b.x||y-r<b.y||x+r>b.x+b.width||y+r>b.y+b.height)return false;
 let inside=false,nearest=Infinity;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const [ax,ay]=points[j],[bx,by]=points[i],dx=bx-ax,dy=by-ay,length=dx*dx+dy*dy;
  if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  const t=length?Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/length)):0;
  const px=x-ax-t*dx,py=y-ay-t*dy;nearest=Math.min(nearest,px*px+py*py);
 }
 return (inside||nearest<1e-8)&&nearest+1e-8>=r*r;
}
export function fishingDeckSupports(layout:WorldLayout|undefined,x:number,y:number,r=0){
 if(!layout)return false;
 for(const p of fishingPiers(layout))if(fishingPierDeckContains(p,x,y,r))return true;
 return false;
}

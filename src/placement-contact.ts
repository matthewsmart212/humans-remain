import type {Vec} from './survival-engine';
import {placementArtPoint,placementBodies,placementPoint,type Placement} from './world-layout';

function closestOnSegment(a:Vec,b:Vec,origin:Vec):Vec{
 const dx=b.x-a.x,dy=b.y-a.y;
 const fraction=((origin.x-a.x)*dx+(origin.y-a.y)*dy)/(dx*dx+dy*dy||1);
 const t=Math.max(0,Math.min(1,fraction));
 return {x:a.x+dx*t,y:a.y+dy*t};
}

/** A usable stretch of a painted work surface, projected into the world.
 * Map markers use its midpoint. Interaction picks the closest point on it. */
export function placementUseFace(p:Placement,start:readonly [number,number],end:readonly [number,number],from?:Vec){
 const a=placementArtPoint(p,...start),b=placementArtPoint(p,...end);
 return from?closestOnSegment(a,b,from):{x:(a.x+b.x)/2,y:(a.y+b.y)/2};
}

/** Aim just outside the nearest solid edge so the line-of-sight probe
 * can reach it without grazing the station itself. */
export function stationEdge(p:Placement,from:Vec,front?:Vec){
 const contact=placementContact(p,from);
 const dx=from.x-contact.x,dy=from.y-contact.y;
 if(front&&Math.hypot(from.x-front.x,from.y-front.y)<Math.hypot(dx,dy))return front;
 const fraction=Math.min(1,4/(Math.hypot(dx,dy)||1));
 return {x:contact.x+dx*fraction,y:contact.y+dy*fraction};
}

function facingPoint(center:Vec,radius:number,origin:Vec):Vec{
 const dx=origin.x-center.x,dy=origin.y-center.y,length=Math.hypot(dx,dy)||1;
 return {x:center.x+dx*radius/length,y:center.y+dy*radius/length};
}

/** Closest ground contact for a hand or tool, including rotated and mirrored footprints. */
export function placementContact(p:Placement,origin:Vec):Vec{
 let nearest:Vec|undefined,distance=Infinity;
 function consider(point:Vec){
  const d=(point.x-origin.x)**2+(point.y-origin.y)**2;
  if(d<distance){nearest=point;distance=d}
 }
 for(const body of placementBodies(p)){
  switch(body.shape){
   case 'rect':
    consider({x:Math.max(body.x-body.hw,Math.min(body.x+body.hw,origin.x)),y:Math.max(body.y-body.hh,Math.min(body.y+body.hh,origin.y))});
    break;
   case 'polygon':
    for(let i=0;i<body.points.length;i++){
     const [x,y]=body.points[i],[ex,ey]=body.points[(i+1)%body.points.length];
     consider(closestOnSegment({x,y},{x:ex,y:ey},origin));
    }
    break;
   case 'circle':
    consider(facingPoint(body,body.r,origin));
    break;
   case 'segment':
    consider(facingPoint(closestOnSegment(body,{x:body.ex,y:body.ey},origin),body.r,origin));
    break;
  }
 }
 if(nearest)return nearest;
 const [x,y]=placementPoint(p,p.x,p.y);
 return {x,y};
}

import {placementBounds,placementPoint,placementGeometryAsset,type Placement} from './world-layout';
import type {World} from './survival-engine';
import {headquartersRaidVisible} from './headquarters-roof';

const smooth=(value:number)=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t)};
/** A reversible, distance-based reveal across the stairs. No elapsed-time
 * state, delayed roof, or pop when the survivor stops or changes direction. */
export function headquartersCutawayAmount(p:Placement,w:World){
 if(p.roof==='hidden')return 1;
 if(p.roof!=='auto'||(p.allowTransparency??placementGeometryAsset(p)?.allowTransparency)===false)return 0;
 if(headquartersRaidVisible(p,w))return 1;
 const b=placementBounds(p),[x,y]=placementPoint(p,w.player.x,w.player.y,true);
 const u=(x-b.x)/b.width,v=(y-b.y)/b.height;
 // The player's feet approach the stairway while their head already overlaps
 // the tall facade. Reveal *before* that overlap, rather than waiting until
 // the feet have passed into the painted room (which hid the entire survivor).
 // Restrict this early reveal to the central entrance; the outer walls keep
 // their full exterior silhouette until the survivor is genuinely indoors.
 const entrance=smooth((.22-Math.abs(u-.5))/.06);
 const doorway=entrance*smooth((1.19-v)/.15);
 const room=smooth((u-.07)/.035)*smooth((.93-u)/.035)*smooth((v-.35)/.035)*smooth((.79-v)/.04);
 return Math.max(doorway,room)*smooth((v-.32)/.035);
}

/** The entrance steps, stone plinth, crates and log store use the ORIGINAL
 * exterior pixels in every state. Only artwork above this seam fades. */
export function clipHeadquartersLayer(ctx:CanvasRenderingContext2D,b:{x:number;y:number;width:number;height:number},upper:boolean){
 const seam:[[number,number],...Array<[number,number]>]=[[0,.70],[.333,.70],[.333,.78],[.666,.78],[.666,.70],[1,.70]];
 const points=upper?[[0,0],[1,0],...seam.slice().reverse()]:[...seam,[1,1],[0,1]];
 ctx.beginPath();points.forEach(([u,v],i)=>i?ctx.lineTo(b.x+u*b.width,b.y+v*b.height):ctx.moveTo(b.x+u*b.width,b.y+v*b.height));ctx.closePath();ctx.clip();
}

/** The doorway is an aperture onto the same room used by the cutaway. These
 * pixel contours follow the inner jambs/braces, including the broken hanging
 * timber. Never show the second, painted room baked into the exterior sprite. */
export function clipHeadquartersDoorway(ctx:CanvasRenderingContext2D,b:{x:number;y:number;width:number;height:number},broken:boolean,outside=false){
 const top:readonly (readonly [number,number])[]=broken
  ?[[.37,.47],[.42,.42],[.595,.42],[.665,.47]]
  :[[.365,.47],[.42,.42],[.60,.42],[.665,.47]];
 const points=[...top,[.665,.735],[.365,.735]];
 const native=ctx as CanvasRenderingContext2D&{clipOutsidePath?:()=>void};
 ctx.beginPath();
 if(outside&&!native.clipOutsidePath){ctx.moveTo(b.x-1,b.y-1);ctx.lineTo(b.x+b.width+1,b.y-1);ctx.lineTo(b.x+b.width+1,b.y+b.height+1);ctx.lineTo(b.x-1,b.y+b.height+1);ctx.closePath()}
 points.forEach(([x,y],i)=>i?ctx.lineTo(b.x+x*b.width,b.y+y*b.height):ctx.moveTo(b.x+x*b.width,b.y+y*b.height));ctx.closePath();
 if(outside&&native.clipOutsidePath)native.clipOutsidePath();else ctx.clip(outside?'evenodd':'nonzero');
}

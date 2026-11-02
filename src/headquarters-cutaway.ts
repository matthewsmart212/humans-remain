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
 const doorway=smooth((.20-Math.abs(u-.5))/.045)*smooth((.97-v)/.19);
 const room=smooth((u-.07)/.035)*smooth((.93-u)/.035)*smooth((v-.46)/.035)*smooth((.80-v)/.04);
 return Math.max(doorway,room)*smooth((v-.46)/.035);
}

/** The entrance steps, stone plinth, crates and log store use the ORIGINAL
 * exterior pixels in every state. Only artwork above this seam fades. */
export function clipHeadquartersLayer(ctx:CanvasRenderingContext2D,b:{x:number;y:number;width:number;height:number},upper:boolean){
 const seam:[[number,number],...Array<[number,number]>]=[[0,.675],[.333,.675],[.333,.755],[.666,.755],[.666,.675],[1,.675]];
 const points=upper?[[0,0],[1,0],...seam.slice().reverse()]:[...seam,[1,1],[0,1]];
 ctx.beginPath();points.forEach(([u,v],i)=>i?ctx.lineTo(b.x+u*b.width,b.y+v*b.height):ctx.moveTo(b.x+u*b.width,b.y+v*b.height));ctx.closePath();ctx.clip();
}

/** The doorway is an aperture onto the same room used by the cutaway. These
 * pixel contours follow the inner jambs/braces, including the broken hanging
 * timber. Never show the second, painted room baked into the exterior sprite. */
export function clipHeadquartersDoorway(ctx:CanvasRenderingContext2D,b:{x:number;y:number;width:number;height:number},broken:boolean,outside=false){
 const top:readonly (readonly [number,number])[]=broken
  ?[[554,507],[625,452],[819,452],[870,508],[943,559],[935,537],[958,554],[915,493],[985,527]]
  :[[554,507],[625,452],[913,452],[985,507]];
 const points=[...top,[985,773],[554,773]];
 const native=ctx as CanvasRenderingContext2D&{clipOutsidePath?:()=>void};
 ctx.beginPath();
 if(outside&&!native.clipOutsidePath){ctx.moveTo(b.x-1,b.y-1);ctx.lineTo(b.x+b.width+1,b.y-1);ctx.lineTo(b.x+b.width+1,b.y+b.height+1);ctx.lineTo(b.x-1,b.y+b.height+1);ctx.closePath()}
 points.forEach(([x,y],i)=>i?ctx.lineTo(b.x+x/1536*b.width,b.y+y/1024*b.height):ctx.moveTo(b.x+x/1536*b.width,b.y+y/1024*b.height));ctx.closePath();
 if(outside&&native.clipOutsidePath)native.clipOutsidePath();else ctx.clip(outside?'evenodd':'nonzero');
}

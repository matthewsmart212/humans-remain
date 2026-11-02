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

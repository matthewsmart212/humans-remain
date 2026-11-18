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

// Follow the tops of the two lintels and the sloped timber that frames the gable.
// Both restored and ruined fronts share these 1536 × 1024 source coordinates.
const frontEave:readonly (readonly [number,number])[]=[
 [0,505],[97,505],[105,504],[487,503],[499,507],[502,501],[767,340],
 [1032,501],[1040,510],[1046,503],[1429,506],[1436,505],[1536,505],
];

export function drawHeadquartersExterior(ctx:CanvasRenderingContext2D,image:CanvasImageSource,
 b:{x:number;y:number;width:number;height:number},cutaway:number){
 if(cutaway<=0){ctx.drawImage(image,b.x,b.y,b.width,b.height);return}
 // Reveal the roof first, then the front walls. At the midpoint the grounded
 // timber facade remains crisp against the open room on either side of the door.
 const drawLayer=(top:boolean,opacity:number)=>{
  if(opacity<=0)return;
  ctx.save();
  ctx.globalAlpha*=opacity;
  ctx.beginPath();
  ctx.moveTo(b.x,top?b.y:b.y+b.height);
  for(const [x,y] of frontEave)ctx.lineTo(b.x+x/1536*b.width,b.y+y/1024*b.height);
  ctx.lineTo(b.x+b.width,top?b.y:b.y+b.height);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(image,b.x,b.y,b.width,b.height);
  ctx.restore();
 };
 drawLayer(true,1-smooth(cutaway*2));
 drawLayer(false,1-smooth(cutaway*2-1));
}

/** The doorway is an aperture onto the same room used by the cutaway. These
 * pixel contours follow the inner jambs/braces, including the broken hanging
 * timber. Never show the second, painted room baked into the exterior sprite. */
export function clipHeadquartersDoorway(ctx:CanvasRenderingContext2D,b:{x:number;y:number;width:number;height:number},broken:boolean,outside=false){
 // Stay inside the upright jambs and end the cast shade on the wooden
 // threshold. The projecting stone lantern plinths belong to the sunlit front.
 const top:readonly (readonly [number,number])[]=broken
  ?[[.388,.555],[.391,.506],[.414,.471],[.445,.439],[.475,.431],[.525,.431],[.561,.442],[.591,.474],[.609,.507],[.612,.555]]
  :[[.388,.63],[.391,.556],[.399,.503],[.426,.463],[.468,.438],[.530,.438],[.564,.455],[.596,.492],[.601,.52],[.612,.63]];
 const points=[...top,[.612,.722],[.389,.722]];
 const native=ctx as CanvasRenderingContext2D&{clipOutsidePath?:()=>void};
 ctx.beginPath();
 if(outside&&!native.clipOutsidePath){ctx.moveTo(b.x-1,b.y-1);ctx.lineTo(b.x+b.width+1,b.y-1);ctx.lineTo(b.x+b.width+1,b.y+b.height+1);ctx.lineTo(b.x-1,b.y+b.height+1);ctx.closePath()}
 points.forEach(([x,y],i)=>i?ctx.lineTo(b.x+x*b.width,b.y+y*b.height):ctx.moveTo(b.x+x*b.width,b.y+y*b.height));ctx.closePath();
 if(outside&&native.clipOutsidePath)native.clipOutsidePath();else ctx.clip(outside?'evenodd':'nonzero');
}

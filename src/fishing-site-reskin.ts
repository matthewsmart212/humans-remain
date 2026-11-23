import {FISHING_PIER_ID,FISHING_PIER_IMAGE,FISHING_PIER_SIZE,FISHING_PIER_WIDTH,FISHING_PIER_COLLISION} from './fishing-site-art';
import type {ArtworkRecord} from './artwork-model';

const oldImage='/survival/stillwater-fishing-v1/pier.webp';
const point=([x,y]:readonly number[])=>[x/1614,y/975];
const foot=(x:number,y:number,hw=33,hh=13)=>({closed:true,points:[[x-hw,y-hh],[x+hw,y-hh],[x+hw,y+hh],[x-hw,y+hh]].map(point)});
const oldCollision={lineWidth:.006,paths:[
 foot(97,555),foot(548,355),foot(508,727),foot(910,525),foot(1137,185),foot(1435,252),
 {closed:true,points:[[461,382],[550,379],[586,401],[555,419],[462,394]].map(point)},
 {closed:true,points:[[582,430],[643,406],[701,436],[636,475]].map(point)},
 foot(1357,405,40,10),
]};
const oldCollisionKey=JSON.stringify(oldCollision);

/** Refresh known v1 metadata in published/offline worlds while keeping later
 * owner uploads, placement transforms and hand-edited collision authoritative. */
export function resolveFishingPierArtwork(record:ArtworkRecord):ArtworkRecord{
 const c=record.config;
 if(record.id!==FISHING_PIER_ID||c.base.url!==oldImage||c.kind!=='sprite'||
  c.frames.length||c.roof||c.unlit||c.base.width!==1614||c.base.height!==975)return record;
 const authoredCollision=!c.collision||JSON.stringify(c.collision)===oldCollisionKey;
 return {...record,config:{...c,
  base:{...c.base,url:FISHING_PIER_IMAGE,name:'stillwater-fishing-pier-v2.webp',mime:'image/webp',
   width:FISHING_PIER_SIZE[0],height:FISHING_PIER_SIZE[1],bytes:1080162},
  worldWidth:c.worldWidth===740?FISHING_PIER_WIDTH:c.worldWidth,
  collision:authoredCollision?FISHING_PIER_COLLISION:c.collision,
 }};
}

/** Square world: expanded east to match the existing height. Existing placement coordinates and sprite scale are unchanged. */
import {BUILDINGS,buildingRoom,buildingColliders,buildingPoint,GROUND_SCALE} from './camp-buildings';
import type {Rect} from './camp-buildings';
export {BUILDINGS,BUILDING_PREFABS,buildingArt,buildingForeground,GROUND_SCALE} from './camp-buildings';
export type {Rect,Room} from './camp-buildings';
export const MAP_WIDTH=2400*Math.SQRT2,MAP_HEIGHT=2400*Math.SQRT2;
const SCALE=GROUND_SCALE;
const point=(x:number,y:number)=>({x:x*SCALE,y:y*SCALE});
export const BASE_POINT=buildingPoint('workshop',251,44),SPAWN_POINT=buildingPoint('workshop',163,110),SHUTTER_POINT=buildingPoint('workshop',149,0),SHUTTER_CONTROL=buildingPoint('workshop',195,22),BARRIER_POINT=buildingPoint('workshop',0,147),CRUSHER_POINT=point(249,614),CRUSHER_CONTROL=point(278,675);
// Lamps are independent powered entities, not painted into the ground.
export const CAMP_LAMPS=[point(545,381),point(646,580),point(387,698),point(686,730),point(300,311),point(895,372),point(606,240),point(422,1050)];
export const WELL_POINT=point(446,735),FIRE_POINT=point(609,724);
export const ANIMAL_POINTS=[point(391,239),point(879,458),point(320,910),point(811,984)];
export const EMERGENCY_FUEL=point(910,264);
export const ROOMS=BUILDINGS.map(buildingRoom);
export const WALLS:Rect[]=BUILDINGS.flatMap(buildingColliders);
export const HOME_FRAMES=[[71,60,566,551],[832,64,306,551],[61,674,580,509],[724,658,486,553]] as const;
export const HOME_PROPS=[
 {cell:1,...point(674,218),w:155,h:285,hw:61,hh:30},
 {cell:0,...point(890,712),w:340,h:340,hw:24,hh:20},
 {cell:0,...point(243,997),w:350,h:355,hw:24,hh:20},
 {cell:0,...point(958,1078),w:300,h:310,hw:22,hh:18},
 {cell:0,...point(391,196),w:265,h:280,hw:20,hh:18},
 {cell:2,...point(220,819),w:230,h:208,hw:96,hh:34},
 {cell:3,...point(710,828),w:170,h:194,hw:70,hh:31},
];
export const PROPS:{sprite:string;x:number;y:number;w:number;h:number;solid:boolean}[]=[];
// Modular furnishings: contact point, drawn bounds and solid footprint are authored together.
// Searchable lockers use a front interaction point; inert furniture has no loot marker.
export const FURNITURE:{cell:number;x:number;y:number;w:number;h:number;hw:number;hh:number;search?:'scrap'|'fuel';amount?:number}[]=[
 {cell:5,...buildingPoint('bunkhouse',29,41),w:96,h:134,hw:33,hh:55},
 {cell:5,...buildingPoint('bunkhouse',29,89),w:96,h:134,hw:33,hh:55},
 {cell:4,...buildingPoint('bunkhouse',92,18),w:155,h:105,hw:62,hh:24},
 {cell:6,...buildingPoint('bunkhouse',142,72),w:74,h:139,hw:26,hh:25,search:'scrap' as const,amount:6},
 {cell:4,...buildingPoint('workshop',64,27),w:180,h:120,hw:75,hh:29},
 {cell:4,...buildingPoint('workshop',30,102),w:113,h:103,hw:44,hh:25},
 {cell:6,...buildingPoint('workshop',26,207),w:82,h:153,hw:28,hh:28,search:'scrap' as const,amount:6},
 {cell:4,...buildingPoint('workshop',251,186),w:143,h:105,hw:55,hh:26},
 {cell:7,...buildingPoint('fuel-store',44,32),w:160,h:138,hw:66,hh:32},
 {cell:7,...buildingPoint('fuel-store',108,32),w:111,h:125,hw:41,hh:28},
 {cell:6,...buildingPoint('fuel-store',116,98),w:75,h:140,hw:26,hh:24,search:'fuel' as const,amount:25},
];
export const BREAKABLE_POINTS=[
 {...point(459,553),kind:'pallets' as const,amount:3},
 {...point(582,442),kind:'scrap' as const,amount:4},
 {...point(204,189),kind:'scrap' as const,amount:4},
 {...point(920,236),kind:'fuel' as const,amount:20},
 {...point(646,887),kind:'pallets' as const,amount:4},
 {...point(271,768),kind:'scrap' as const,amount:5},
];
export const OBSTACLES:Rect[]=[...WALLS,
 // Starter station bodies live in per-run state; do not bake them into this index.
 ...CAMP_LAMPS.map(p=>({...p,hw:10,hh:9})),
 ...FURNITURE.map(p=>({x:p.x,y:p.y-p.hh,hw:p.hw,hh:p.hh})),
 ...HOME_PROPS.map(p=>({x:p.x,y:p.y-(p.cell===0?12:p.hh),hw:p.hw,hh:p.hh})),
 {x:SHUTTER_CONTROL.x,y:SHUTTER_CONTROL.y+15,hw:31,hh:21},
 {x:CRUSHER_POINT.x,y:CRUSHER_POINT.y-80,hw:94,hh:80},
];
const loot=(x:number,y:number,kind:'fuel'|'scrap'|'pallets',amount:number)=>({...point(x,y),kind,amount});
export const LOOT_POINTS=[
 loot(467,406,'scrap',4),loot(609,530,'scrap',4),loot(484,573,'pallets',2),
 loot(236,182,'scrap',5),loot(222,221,'pallets',3),loot(248,219,'fuel',20),
 loot(898,245,'fuel',25),loot(930,266,'fuel',30),loot(891,285,'scrap',4),
 loot(714,902,'pallets',4),loot(765,867,'fuel',20),loot(207,876,'scrap',6),
 loot(351,763,'pallets',3),loot(210,735,'scrap',5),loot(373,1090,'fuel',20),
 loot(553,882,'scrap',5),loot(857,1039,'pallets',4),loot(843,1160,'fuel',25),
 loot(888,854,'scrap',5),loot(831,578,'fuel',20),loot(735,269,'scrap',5),
 loot(457,231,'pallets',3),loot(536,157,'fuel',25),loot(218,423,'scrap',4),
];
export const ENTRANCES=[point(545,110),point(115,523),point(927,1303)];

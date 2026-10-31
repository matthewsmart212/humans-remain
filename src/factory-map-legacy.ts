/** Sector 01: editable map data, shared by collision, AI, Skia and the mini-map. */
export const MAP_WIDTH=1800,MAP_HEIGHT=2400;
export const BASE_POINT={x:900,y:1200},SHUTTER_POINT={x:900,y:970},SHUTTER_CONTROL={x:1080,y:1020},BARRIER_POINT={x:680,y:1200},CRUSHER_POINT={x:540,y:1030},CRUSHER_CONTROL={x:540,y:1125};
export type Rect={x:number;y:number;hw:number;hh:number};
export type Room={name:string;x:number;y:number;width:number;height:number;doors:{side:'n'|'s'|'e'|'w';at:number;width:number}[]};
export const ROOMS:Room[]=[
 {name:'MAINTENANCE',x:140,y:260,width:490,height:520,doors:[{side:'e',at:360,width:160},{side:'s',at:220,width:150}]},
 {name:'WAREHOUSE',x:1160,y:250,width:490,height:560,doors:[{side:'w',at:365,width:170},{side:'s',at:260,width:150}]},
 {name:'FOUNDRY',x:150,y:1580,width:510,height:600,doors:[{side:'n',at:340,width:160},{side:'e',at:380,width:160}]},
 {name:'FUEL DEPOT',x:1150,y:1630,width:500,height:530,doors:[{side:'n',at:160,width:150},{side:'w',at:330,width:160}]},
 {name:'WORKSHOP',x:680,y:970,width:440,height:460,doors:[{side:'n',at:220,width:180},{side:'s',at:220,width:200},{side:'e',at:230,width:190},{side:'w',at:230,width:190}]}
];
function roomWalls(r:Room):Rect[]{const out:Rect[]=[];for(const side of ['n','s','e','w'] as const){const horizontal=side==='n'||side==='s',length=horizontal?r.width:r.height,doors=r.doors.filter(d=>d.side===side).sort((a,b)=>a.at-b.at);let from=0;for(const d of [...doors,{at:length,width:0}]){const end=d.at-d.width/2;if(end>from)out.push(horizontal?{x:r.x+(from+end)/2,y:r.y+(side==='s'?r.height:0),hw:(end-from)/2,hh:17}:{x:r.x+(side==='e'?r.width:0),y:r.y+(from+end)/2,hw:17,hh:(end-from)/2});from=d.at+d.width/2}}return out}
export const WALLS:Rect[]=[...ROOMS.flatMap(roomWalls),{x:900,y:70,hw:820,hh:22},{x:900,y:2330,hw:820,hh:22},{x:70,y:1200,hw:22,hh:1130},{x:1730,y:1200,hw:22,hh:1130}];
export const PROPS=[
 {sprite:'crate',x:235,y:400,w:150,h:170,solid:true},{sprite:'crate',x:510,y:420,w:140,h:160,solid:true},{sprite:'barrel',x:230,y:650,w:110,h:135,solid:true},
 {sprite:'crate',x:1280,y:400,w:165,h:180,solid:true},{sprite:'crate',x:1510,y:400,w:165,h:180,solid:true},{sprite:'crate',x:1530,y:660,w:150,h:170,solid:true},
 {sprite:'conveyor',x:310,y:1780,w:290,h:130,solid:true},{sprite:'crusher_housing',x:350,y:2010,w:215,h:160,solid:true},{sprite:'barrel',x:570,y:2090,w:100,h:120,solid:true},
 {sprite:'barrel',x:1270,y:1780,w:115,h:145,solid:true},{sprite:'barrel',x:1500,y:1780,w:115,h:145,solid:true},{sprite:'barrel',x:1490,y:2010,w:115,h:145,solid:true},
 {sprite:'crate',x:260,y:1150,w:145,h:170,solid:true},{sprite:'barrel',x:1500,y:1120,w:120,h:145,solid:true},{sprite:'barrel',x:1570,y:1170,w:115,h:135,solid:true},
 {sprite:'debris',x:270,y:910,w:150,h:115,solid:false},{sprite:'debris',x:1490,y:1430,w:165,h:125,solid:false},{sprite:'debris',x:1010,y:2130,w:160,h:125,solid:false},
 {sprite:'guardrail',x:420,y:1400,w:200,h:100,solid:true},{sprite:'guardrail',x:1430,y:930,w:190,h:100,solid:true},
 {sprite:'cone',x:735,y:1720,w:75,h:95,solid:false},{sprite:'cone',x:1050,y:550,w:75,h:95,solid:false}
];
export const OBSTACLES:Rect[]=[...WALLS,...PROPS.filter(p=>p.solid).map(p=>({x:p.x,y:p.y,hw:p.w*.28,hh:p.h*.23}))];
export const LOOT_POINTS=[
 // Starter supplies around the central yard, then richer building interiors.
 {x:560,y:1350,kind:'fuel',amount:20},{x:1200,y:1450,kind:'scrap',amount:4},{x:1240,y:1140,kind:'pallets',amount:2},{x:850,y:850,kind:'scrap',amount:4},
 {x:350,y:530,kind:'scrap',amount:8},{x:505,y:660,kind:'fuel',amount:25},{x:390,y:360,kind:'pallets',amount:4},
 {x:1370,y:550,kind:'pallets',amount:5},{x:1250,y:710,kind:'scrap',amount:8},{x:1550,y:520,kind:'fuel',amount:30},
 {x:500,y:1700,kind:'scrap',amount:10},{x:510,y:1900,kind:'fuel',amount:25},{x:270,y:2110,kind:'pallets',amount:4},
 {x:1380,y:1890,kind:'fuel',amount:40},{x:1570,y:2080,kind:'scrap',amount:8},{x:1250,y:2050,kind:'pallets',amount:4},
 {x:900,y:340,kind:'fuel',amount:35},{x:850,y:2120,kind:'scrap',amount:10},{x:200,y:1490,kind:'pallets',amount:3},{x:1570,y:1530,kind:'fuel',amount:25},
 {x:1000,y:1680,kind:'pallets',amount:3},{x:770,y:590,kind:'scrap',amount:6},{x:950,y:1850,kind:'fuel',amount:20},{x:420,y:1010,kind:'scrap',amount:4}
] as const;
export const ENTRANCES=[{x:900,y:310},{x:145,y:1250},{x:1640,y:1460},{x:900,y:2240}];

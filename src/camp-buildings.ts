/** Building art and physical footprints belong to the same replaceable prefab.
 * Coordinates in each prefab are local source pixels, not global map positions.
 * Future upgrade art can register another prefab and replace an instance's prefabId.
 * Keep doors/furnishing sockets compatible, or relocate occupants before a larger upgrade.
 */
export const GROUND_SCALE=1800*Math.SQRT2/1086;
export type Crop=readonly [number,number,number,number];
export type Rect={x:number;y:number;hw:number;hh:number};
export type Door={side:'n'|'s'|'e'|'w';at:number;width:number};
export type Room={name:string;x:number;y:number;width:number;height:number;doors:Door[]};
export type BuildingPrefab={name:string;imageKey:string;art:Crop;anchor:readonly [number,number];width:number;height:number;doors:Door[];foreground:Crop[];attachments:Rect[]};
export const BUILDING_PREFABS:Record<string,BuildingPrefab>={
 'repair-hall-ruined':{name:'REPAIR HALL',imageKey:'homeBuildings',art:[372,320,337,368],anchor:[19,32],width:290,height:266,
  doors:[{side:'n',at:149,width:50},{side:'s',at:144,width:51},{side:'w',at:147,width:42}],
  foreground:[[384,594,127,36],[559,594,130,36]],
  attachments:[{x:-10,y:75,hw:6,hh:43},{x:-10,y:222,hw:6,hh:48},{x:300,y:156,hw:5,hh:133}]},
 'bunkhouse-ruined':{name:'BUNKHOUSE',imageKey:'homeBuildings',art:[122,104,181,173],anchor:[9,28],width:158,height:120,
  doors:[{side:'s',at:102,width:40}],foreground:[[124,230,90,31],[252,230,45,31]],attachments:[]},
 'fuel-store-ruined':{name:'FUEL STORE',imageKey:'homeBuildings',art:[834,150,168,199],anchor:[12,29],width:135,height:141,
  doors:[{side:'s',at:56,width:40}],foreground:[[839,299,43,27],[922,299,66,27]],
  attachments:[{x:145,y:88,hw:5,hh:76}]},
};
export type BuildingInstance={id:string;prefabId:string;x:number;y:number};
export const BUILDINGS:BuildingInstance[]=[
 {id:'workshop',prefabId:'repair-hall-ruined',x:391*GROUND_SCALE,y:352*GROUND_SCALE},
 {id:'bunkhouse',prefabId:'bunkhouse-ruined',x:131*GROUND_SCALE,y:132*GROUND_SCALE},
 {id:'fuel-store',prefabId:'fuel-store-ruined',x:846*GROUND_SCALE,y:179*GROUND_SCALE},
];
export function buildingRoom(b:BuildingInstance):Room{const p=BUILDING_PREFABS[b.prefabId];return{name:p.name,x:b.x,y:b.y,width:p.width*GROUND_SCALE,height:p.height*GROUND_SCALE,doors:p.doors.map(d=>({...d,at:d.at*GROUND_SCALE,width:d.width*GROUND_SCALE}))}}
export function buildingArt(b:BuildingInstance){const p=BUILDING_PREFABS[b.prefabId];return{imageKey:p.imageKey,crop:p.art,x:b.x-p.anchor[0]*GROUND_SCALE,y:b.y-p.anchor[1]*GROUND_SCALE,width:p.art[2]*GROUND_SCALE,height:p.art[3]*GROUND_SCALE}}
export function buildingForeground(b:BuildingInstance){const p=BUILDING_PREFABS[b.prefabId],art=buildingArt(b);return p.foreground.map(c=>({imageKey:p.imageKey,crop:c,x:art.x+(c[0]-p.art[0])*GROUND_SCALE,y:art.y+(c[1]-p.art[1])*GROUND_SCALE,width:c[2]*GROUND_SCALE,height:c[3]*GROUND_SCALE}))}
export function roomWalls(r:Room):Rect[]{const out:Rect[]=[];for(const side of ['n','s','e','w'] as const){const horizontal=side==='n'||side==='s',length=horizontal?r.width:r.height,doors=r.doors.filter(d=>d.side===side).sort((a,b)=>a.at-b.at);let from=0;for(const d of [...doors,{at:length,width:0}]){const end=d.at-d.width/2;if(end>from)out.push(horizontal?{x:r.x+(from+end)/2,y:r.y+(side==='s'?r.height:0),hw:(end-from)/2,hh:12}:{x:r.x+(side==='e'?r.width:0),y:r.y+(from+end)/2,hw:12,hh:(end-from)/2});from=d.at+d.width/2}}return out}
export function buildingColliders(b:BuildingInstance):Rect[]{const p=BUILDING_PREFABS[b.prefabId];return[...roomWalls(buildingRoom(b)),...p.attachments.map(r=>({x:b.x+r.x*GROUND_SCALE,y:b.y+r.y*GROUND_SCALE,hw:r.hw*GROUND_SCALE,hh:r.hh*GROUND_SCALE}))]}
export function buildingPoint(id:string,x:number,y:number){const b=BUILDINGS.find(b=>b.id===id);if(!b)throw Error('Unknown building '+id);return{x:b.x+x*GROUND_SCALE,y:b.y+y*GROUND_SCALE}}

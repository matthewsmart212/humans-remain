import type {AssetCollision} from './asset-collision';
import type {CatalogueEntry} from './catalogue-model';
import type {Direction} from './survival-engine';

export const PATCH_STATION_ID='art_patch_maintenance_station';
export const PATCH_LOCKER_ID='art_patch_service_locker';
export const PATCH_STATION_IMAGE='/survival/patch-v1/station.webp';
export const PATCH_LOCKER_IMAGE='/survival/patch-v1/locker.webp';
export const PATCH_STATION_SIZE=[1100,825] as const;
export const PATCH_LOCKER_SIZE=[256,256] as const;
export const PATCH_STATION_WIDTH=420;
export const PATCH_LOCKER_WIDTH=66;
export const PATCH_STATION_ANCHOR=[.5,.90] as const;
export const PATCH_LOCKER_ANCHOR=[.5,.9] as const;
export const PATCH_IMAGES={patchRobot:'/survival/patch-v1/robot.webp',patchDamaged:'/survival/patch-v1/damaged.webp',patchWalk:'/survival/patch-v2/walk.webp'};
export const PATCH_ROBOT_CELL=256;
export const PATCH_ROBOT_ANCHOR=[128,228] as const;
// Both dimensions are 50% larger; quest collision and navigation stay separate.
export const PATCH_ROBOT_SCALE=.45;
export const PATCH_ROBOT_FRAMES:Record<Direction,number>={down:0,'down-right':1,right:2,'up-right':3,up:4,'up-left':5,left:6,'down-left':7};
export const PATCH_WALK_PHASES=8;
// The run stores actual walked ground modulo one complete left/right stride.
export const PATCH_WALK_CYCLE_DISTANCE=112;
// Caged-lamp centers measured in the registered atlas cells (never mirrored).
export const PATCH_ROBOT_LAMPS:readonly (readonly [number,number])[]=[[114,43],[113,43],[117,43],[101,43],[132,44],[156,44],[134,42],[144,43]];
export const PATCH_DAMAGED_LAMP=[96,81] as const;

// Trace the painted masonry and pump footing, not the roof silhouette. This
// abandoned shed is scenery; both quest interactions live on the clear ground
// outside it, so no survivor can disappear beneath its baked roof painting.
export const PATCH_STATION_COLLISION:AssetCollision={lineWidth:.012,paths:[
 {closed:true,points:[[.366,.832],[.245,.762],[.247,.681],[.625,.565],[.943,.762],[.945,.787],[.563,.916]]},
 {closed:true,points:[[.043,.767],[.117,.709],[.232,.759],[.365,.831],[.359,.863],[.280,.903],[.169,.849],[.114,.858],[.046,.811]]},
]};
export const PATCH_LOCKER_COLLISION:AssetCollision={lineWidth:.01,paths:[
 {closed:true,points:[[.285,.836],[.456,.788],[.706,.836],[.531,.92]]},
]};
const shared={
 family:'Woodland scenery',category:'World scenery',group:'A Light Left On',
 recordType:'environment prop',phase:'B1',priority:'Normal',tier:null,
 lastUpdatedAt:'2026-11-24T00:00:00.000Z',art:true,conceptApproved:true,
 exportComplete:true,implemented:true,tested:false,presentInPrototype:true,
 improvement:'',artLinks:[],implementationDependencies:[],blockers:[],
 playerUnlock:'Follow the note beyond Stillwater Lake',resourceCost:'None',inputs:'',
 outputs:'P-04 rescue quest',buildMenuVisibility:'World editor',availability:'Current world asset',capacity:'',
 testScope:'Saved placement, dry routes, transformed anchors and companion depth.',
 evidence:'docs/qa/patch-v1/README.md',
} satisfies Partial<CatalogueEntry>;
export const patchStationEntry:CatalogueEntry={
 ...shared,id:PATCH_STATION_ID,name:'Lakeside maintenance station',
 purpose:'An abandoned service shed beyond Stillwater Lake, where P-04 waits for help.',
 appearance:'Weathered timber, a broken roof, stone footing and a rusted lifting hoist.',
 states:'Abandoned',image:PATCH_STATION_IMAGE,crop:[0,0,...PATCH_STATION_SIZE],
 artPreview:{worldWidth:PATCH_STATION_WIDTH},artworkExports:[PATCH_STATION_IMAGE],
};
export const patchLockerEntry:CatalogueEntry={
 ...shared,id:PATCH_LOCKER_ID,name:'Maintenance service locker',
 purpose:'P-04’s old tool locker outside the first-aid shelter.',
 appearance:'A small weathered industrial service locker with an amber rescue chevron.',
 states:'Empty service locker',
 image:PATCH_LOCKER_IMAGE,crop:[0,0,...PATCH_LOCKER_SIZE],
 artPreview:{worldWidth:PATCH_LOCKER_WIDTH},artworkExports:[PATCH_LOCKER_IMAGE],
};

export type PatchRouteKind='shelter'|'dispatch'|'hauler';
export const PATCH_ROUTE_ART={
 shelter:{id:'art_patch_rescue_shelter',name:'Rescue shelter',width:235,
  image:'/survival/patch-v5/shelter.webp',purpose:'P-04’s first-aid tarp, stretcher and laid-out bedding beside the west-bank shed.'},
 dispatch:{id:'art_patch_signal_post',name:'Signal post',width:265,
  image:'/survival/patch-v5/dispatch.webp',purpose:'The abandoned evacuation mast and its last dispatch ledger.'},
 hauler:{id:'art_patch_cable_hauler',name:'Cable works',width:365,
  image:'/survival/patch-v5/hauler.webp',purpose:'A stranded cable hauler off the logging road, with an exposed drive and a hand brake.'},
} as const;
export const PATCH_ROUTE_SIZE=[960,720] as const;
export const patchRouteEntries:CatalogueEntry[]=Object.values(PATCH_ROUTE_ART).map(a=>({
 ...shared,id:a.id,name:a.name,purpose:a.purpose,states:'Abandoned evacuation route',
 image:a.image,crop:[0,0,...PATCH_ROUTE_SIZE],artPreview:{worldWidth:a.width},artworkExports:[a.image],
}));
// Normalized outlines around the painted ground contacts leave the workbench and brake accessible.
export const PATCH_ROUTE_COLLISIONS:Record<PatchRouteKind,AssetCollision>={
 shelter:{lineWidth:.012,paths:[
  {closed:true,points:[[.15,.76],[.23,.74],[.25,.81],[.15,.84]]},
  {closed:true,points:[[.30,.74],[.47,.63],[.78,.72],[.67,.90],[.56,.87]]},
  {closed:true,points:[[.73,.89],[.81,.83],[.80,.92],[.73,.95]]},
 ]},
 dispatch:{lineWidth:.012,paths:[{closed:true,points:[[.25,.76],[.39,.66],[.68,.60],[.77,.75],[.77,.84],[.51,.94],[.28,.88]]}]},
 hauler:{lineWidth:.012,paths:[{closed:true,points:[[.035,.68],[.12,.57],[.55,.53],[.91,.65],[.96,.77],[.52,.94],[.39,.94],[.11,.78]]}]}
};

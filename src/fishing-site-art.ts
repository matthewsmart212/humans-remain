import type {AssetCollision} from './asset-collision';
import type {CatalogueEntry} from './catalogue-model';

export const FISHING_PIER_ID='art_fishing_pier';
export const FISHING_REEDS_ID='art_fishing_reeds';
export const FISHING_PIER_PLACEMENT_ID='stillwater-fishing-pier';
export const FISHING_PIER_IMAGE='/survival/stillwater-fishing-v1/pier.webp';
export const FISHING_REEDS_IMAGE='/survival/stillwater-fishing-v1/reeds.webp';
export const FISHING_PIER_SIZE=[1614,975] as const;
export const FISHING_REEDS_SIZE=[1254,1254] as const;
export const FISHING_PIER_WIDTH=740;
export const FISHING_REEDS_WIDTH=175;
export const FISHING_PIER_ANCHOR=[1317/1614,180/975] as const;
export const FISHING_PIER_ENTRY=FISHING_PIER_ANCHOR;
export const FISHING_REEDS_ANCHOR=[.52,.745] as const;
// Normalized painted bounds (left, top, right, bottom), excluding the export's
// nearly transparent fringe. Used only when choosing new shoreline placements.
export const FISHING_REEDS_VISIBLE_BOUNDS=[230/1254,235/1254,1039/1254,945/1254] as const;

export type FishingPoint=readonly [number,number];
export type FishingForegroundPart={id:string;outline:readonly FishingPoint[];foot:FishingPoint};
const point=([x,y]:FishingPoint):[number,number]=>[x/FISHING_PIER_SIZE[0],y/FISHING_PIER_SIZE[1]];
const outline=(points:readonly FishingPoint[])=>points.map(point);
const part=(id:string,foot:FishingPoint,points:readonly FishingPoint[]):FishingForegroundPart=>({id,foot:point(foot),outline:outline(points)});
// Trace the top plank surface, including its continuous gangway. Support legs
// below the deck do not extend the walking surface into the water.
export const FISHING_PIER_DECK:readonly FishingPoint[]=outline([
 [97,550],[532,351],[603,384],[1235,149],[1399,210],[793,471],[911,525],[477,724],
]);
// The painted support tips meet the water below the walking surface.
export const FISHING_PIER_WATER_FEET:readonly FishingPoint[]=outline([
 [97,750],[277,805],[509,929],[636,836],[914,721],[1225,451],
]);
// Replay only the upright silhouettes above the deck, using their contact on
// the planks for depth. Open gaps beneath the stool retain the ground pass.
export const FISHING_PIER_FOREGROUND:readonly FishingForegroundPart[]=[
 part('west-post',[97,555],[[50,478],[86,455],[145,477],[145,535],[100,559],[50,538]]),
 part('back-post',[548,355],[[500,259],[541,233],[591,254],[590,351],[546,370],[497,350]]),
 part('front-post',[508,727],[[461,657],[503,630],[550,652],[551,707],[508,729],[458,706]]),
 part('east-post',[910,525],[[862,411],[901,388],[950,410],[959,504],[913,533],[861,511]]),
 part('bank-far-post',[1137,185],[[1088,30],[1132,9],[1182,32],[1184,185],[1138,210],[1087,191]]),
 part('bank-near-post',[1435,252],[[1392,136],[1435,115],[1483,136],[1490,243],[1438,264],[1388,242]]),
 part('tacklebox',[522,409],[[456,347],[500,319],[588,350],[590,398],[562,421],[458,391]]),
 part('stool-seat',[643,455],[[573,359],[645,325],[724,353],[724,369],[653,410],[572,379]]),
 part('stool-front-leg',[643,455],[[635,391],[657,399],[636,474],[622,475]]),
 part('stool-right-leg',[643,455],[[679,385],[698,382],[702,438],[685,444]]),
 part('stool-left-leg',[643,455],[[590,376],[609,382],[589,442],[574,445]]),
 part('bucket',[1357,410],[[1304,286],[1407,286],[1407,414],[1304,414]]),
 part('net',[1535,400],[[1494,187],[1513,282],[1605,361],[1605,414],[1445,414],[1462,282]]),
];
const foot=(x:number,y:number,hw=33,hh=13)=>({closed:true,points:outline([[x-hw,y-hh],[x+hw,y-hh],[x+hw,y+hh],[x-hw,y+hh]])});
export const FISHING_PIER_COLLISION:AssetCollision={lineWidth:.006,paths:[
 foot(97,555),foot(548,355),foot(508,727),foot(910,525),foot(1137,185),foot(1435,252),
 {closed:true,points:outline([[461,382],[550,379],[586,401],[555,419],[462,394]])},
 {closed:true,points:outline([[582,430],[643,406],[701,436],[636,475]])},
 foot(1357,405,40,10),
]};

const shared={
 family:'Woodland scenery',category:'World scenery',group:'Stillwater Lake',
 recordType:'environment prop',phase:'B1',priority:'Normal',tier:null,
 lastUpdatedAt:'2026-11-22T00:00:00.000Z',art:true,conceptApproved:true,
 exportComplete:true,implemented:true,tested:true,presentInPrototype:true,
 improvement:'',artLinks:[],implementationDependencies:[],blockers:[],
 playerUnlock:'Explore the lakeshore',resourceCost:'None',inputs:'',
 outputs:'Lakeside scenery',buildMenuVisibility:'World editor',
 availability:'Current world asset',capacity:'',
 testScope:'Saved placement, pier walking, water boundaries, depth and ambient fish.',
 evidence:'docs/qa/stillwater-fishing-v1/README.md',
} satisfies Partial<CatalogueEntry>;

export const fishingPierEntry:CatalogueEntry={
 ...shared,id:FISHING_PIER_ID,name:'Stillwater fishing jetty',
 purpose:'A walkable timber jetty overlooking the fish in Stillwater Lake.',
 appearance:'Weathered timber, rope-bound posts, an old stool and tackle box.',
 states:'Weathered and usable',image:FISHING_PIER_IMAGE,
 crop:[0,0,...FISHING_PIER_SIZE],artPreview:{worldWidth:FISHING_PIER_WIDTH},
 artworkExports:[FISHING_PIER_IMAGE],
};
export const fishingReedsEntry:CatalogueEntry={
 ...shared,id:FISHING_REEDS_ID,name:'Stillwater shoreline reeds',
 purpose:'Natural reeds and rounded stones along the fishing bank.',
 appearance:'Olive reeds, dry seed heads and softly rounded shore stones.',
 states:'Lakeshore foliage',image:FISHING_REEDS_IMAGE,
 crop:[0,0,...FISHING_REEDS_SIZE],artPreview:{worldWidth:FISHING_REEDS_WIDTH},
 artworkExports:[FISHING_REEDS_IMAGE],
};

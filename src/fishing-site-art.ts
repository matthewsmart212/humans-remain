import type {AssetCollision} from './asset-collision';
import type {CatalogueEntry} from './catalogue-model';

export const FISHING_PIER_ID='art_fishing_pier';
export const FISHING_REEDS_ID='art_fishing_reeds';
export const FISHING_PIER_PLACEMENT_ID='stillwater-fishing-pier';
export const FISHING_PIER_IMAGE='/survival/stillwater-fishing-v2/pier.webp';
export const FISHING_REEDS_IMAGE='/survival/stillwater-fishing-v1/reeds.webp';
export const FISHING_PIER_SIZE=[1614,975] as const;
export const FISHING_REEDS_SIZE=[1254,1254] as const;
export const FISHING_PIER_WIDTH=820;
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
 [105,580],[507,359],[611,398],[1118,169],[1220,138],[1290,162],
 [1490,91],[1584,128],[1390,206],[1375,260],[840,468],[901,538],[482,731],
]);
// The painted support tips meet the water below the walking surface.
export const FISHING_PIER_WATER_FEET:readonly FishingPoint[]=outline([
 [80,772],[254,824],[509,950],[634,866],[918,751],[1228,481],
]);
// Replay only the upright silhouettes above the deck, using their contact on
// the planks for depth. Open gaps beneath the stool retain the ground pass.
export const FISHING_PIER_FOREGROUND:readonly FishingForegroundPart[]=[
 part('west-post',[85,593],[[33,498],[75,468],[129,492],[129,572],[85,602],[34,580]]),
 part('back-post',[525,360],[[479,258],[520,236],[566,255],[568,331],[529,365],[481,341]]),
 part('front-post',[509,748],[[467,671],[509,646],[555,666],[558,735],[513,758],[466,736]]),
 part('east-post',[918,543],[[869,438],[909,411],[954,432],[960,508],[951,535],[913,554],[868,533]]),
 part('bank-far-post',[1120,174],[[1074,29],[1116,9],[1163,28],[1167,118],[1154,152],[1125,177],[1073,160]]),
 part('bank-near-post',[1410,271],[[1365,153],[1410,131],[1458,151],[1463,230],[1458,258],[1410,280],[1364,259]]),
 part('tacklebox',[495,416],[[438,352],[479,324],[568,355],[566,399],[529,421],[438,398]]),
 part('stool-seat',[630,477],[[561,367],[625,337],[704,367],[702,385],[632,421],[559,396]]),
 part('stool-front-leg',[630,477],[[622,403],[641,414],[619,478],[607,474]]),
 part('stool-right-leg',[630,477],[[666,395],[684,394],[697,460],[680,467]]),
 part('stool-left-leg',[630,477],[[575,391],[590,405],[581,459],[567,455]]),
 part('bucket',[1353,411],[[1355,266],[1384,296],[1401,340],[1398,411],[1305,419],[1294,346],[1325,289]]),
 part('net',[1508,432],[[1457,209],[1485,288],[1572,362],[1570,416],[1438,439],[1425,392],[1434,307]]),
];
const foot=(x:number,y:number,hw=33,hh=13)=>({closed:true,points:outline([[x-hw,y-hh],[x+hw,y-hh],[x+hw,y+hh],[x-hw,y+hh]])});
export const FISHING_PIER_COLLISION:AssetCollision={lineWidth:.006,paths:[
 foot(85,593),foot(525,360),foot(509,748),foot(918,543),foot(1120,174),foot(1410,271),
 {closed:true,points:outline([[441,382],[524,379],[565,398],[529,421],[441,401]])},
 {closed:true,points:outline([[575,446],[630,417],[696,450],[619,480]])},
 foot(1353,410,38,10),
]};

const shared={
 family:'Woodland scenery',category:'World scenery',group:'Stillwater Lake',
 recordType:'environment prop',phase:'B1',priority:'Normal',tier:null,
 lastUpdatedAt:'2026-11-23T00:00:00.000Z',art:true,conceptApproved:true,
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
 appearance:'A broad weathered timber deck, shore ramp, rope-bound posts, stool and tackle box.',
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

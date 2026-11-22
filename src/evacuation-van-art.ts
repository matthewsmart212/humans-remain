import type {AssetCollision} from './asset-collision';
import type {CatalogueEntry} from './catalogue-model';

export const EVACUATION_VAN_ID='art_evacuation_van';
export const EVACUATION_BACKPACK_ID='art_evacuation_backpack';
export const EVACUATION_VAN_PLACEMENT_ID='evacuation-van-wreck';
export const EVACUATION_BACKPACK_PLACEMENT_ID='evacuation-van-backpack';
export const EVACUATION_VAN_IMAGE='/survival/evacuation-van-v1/van.webp';
export const EVACUATION_BACKPACK_IMAGE='/survival/evacuation-van-v1/backpack.webp';
export const EVACUATION_VAN_SIZE=[1639,959] as const;
export const EVACUATION_BACKPACK_SIZE=[1254,1254] as const;
export const EVACUATION_VAN_WIDTH=500;
export const EVACUATION_BACKPACK_WIDTH=65;
export const EVACUATION_VAN_ANCHOR=[.55,.77] as const;
export const EVACUATION_BACKPACK_ANCHOR=[.5,.9] as const;
// Search from the ground behind the open cargo doors, outside the chassis.
export const EVACUATION_VAN_LATCH=[.36,.745] as const;
export const EVACUATION_BACKPACK_LATCH=[.49,.87] as const;

/** Trace the chassis and open door feet, not the tall roof or spilled supplies. */
export const EVACUATION_VAN_COLLISION:AssetCollision={
 lineWidth:.008,
 paths:[
  {closed:true,points:[[.232,.638],[.55,.782],[.627,.799],[.934,.607],[.981,.468],[.793,.361],[.535,.438]]},
  {closed:false,points:[[.139,.603],[.232,.619]]},
  {closed:false,points:[[.49,.737],[.553,.775]]},
 ],
};
// A dropped bag and its notebook/torch can be stepped over.
export const EVACUATION_BACKPACK_COLLISION:AssetCollision={lineWidth:.008,paths:[]};

const shared={
 family:'Woodland scenery',category:'World scenery',group:'Survivor traces',
 recordType:'environment prop',phase:'B1',priority:'Normal',tier:null,
 lastUpdatedAt:'2026-11-22T00:00:00.000Z',art:true,conceptApproved:true,
 exportComplete:true,implemented:true,tested:true,presentInPrototype:true,
 improvement:'',artLinks:[],implementationDependencies:[],blockers:[],
 playerUnlock:'Approach and search',resourceCost:'None',inputs:'',
 outputs:'Finite salvaged supplies',buildMenuVisibility:'World editor',
 availability:'Current world asset',testScope:'Placement, ground collision, search reach and saved loot.',
} satisfies Partial<CatalogueEntry>;

export const evacuationVanEntry:CatalogueEntry={
 ...shared,id:EVACUATION_VAN_ID,name:'Evacuation van',
 purpose:'Search the open cargo for food, basic tools and scrap.',
 appearance:'A wrecked cream and olive civilian van with open doors, cargo and spilled luggage.',
 states:'Already-open cargo. Remaining supplies are saved independently for each wreck.',
 image:EVACUATION_VAN_IMAGE,crop:[0,0,...EVACUATION_VAN_SIZE],
 artPreview:{worldWidth:EVACUATION_VAN_WIDTH},artworkExports:[EVACUATION_VAN_IMAGE],
 capacity:'One finite cargo cache per van',
};

export const evacuationBackpackEntry:CatalogueEntry={
 ...shared,id:EVACUATION_BACKPACK_ID,name:'Abandoned backpack',
 purpose:'Follow the abandoned belongings and search for a few remaining supplies.',
 appearance:'An olive canvas backpack with a dropped notebook and torch.',
 states:'Each backpack keeps its own remaining supplies.',
 image:EVACUATION_BACKPACK_IMAGE,crop:[0,0,...EVACUATION_BACKPACK_SIZE],
 artPreview:{worldWidth:EVACUATION_BACKPACK_WIDTH},artworkExports:[EVACUATION_BACKPACK_IMAGE],
 capacity:'One small finite cache per backpack',
};

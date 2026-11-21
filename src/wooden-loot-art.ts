import type {CatalogueEntry} from './catalogue-model';

export const WOODEN_LOOT_ID='art_wooden_loot_chest';
const directory='/survival/wooden-loot-chest-v1';
export const WOODEN_LOOT_POSTER=directory+'/closed.webp';
export const WOODEN_LOOT_SHEET=directory+'/opening.webp';
export const WOODEN_LOOT_SPRITE={width:300,height:320,columns:4,frames:12} as const;
/** Draw a short charge, the hinge motion and the latch settling before showing loot. */
export const WOODEN_LOOT_OPEN_TICKS=54;
export const WOODEN_LOOT_ANCHOR=[.51,.965] as const;
export const WOODEN_LOOT_LATCH=[.49,1.19] as const;

export const woodenLootEntry:CatalogueEntry={
 id:WOODEN_LOOT_ID,name:'Wooden loot chest',family:'Woodland scenery',category:'World scenery',
 group:'Survivor camps',recordType:'environment prop',phase:'B1',priority:'Normal',tier:null,lastUpdatedAt:'2026-11-21T00:00:00.000Z',
 art:true,conceptApproved:true,exportComplete:true,implemented:true,tested:true,presentInPrototype:true,
 purpose:'Place a scavenging chest with its own supplies.',improvement:'',
 appearance:'Weathered oak, riveted iron straps, a brass latch and warm orange light.',
 states:'Closed, opening, opened with loot, or empty.',
 image:WOODEN_LOOT_POSTER,crop:[0,0,WOODEN_LOOT_SPRITE.width,WOODEN_LOOT_SPRITE.height],artPreview:{worldWidth:95},
 artworkExports:[WOODEN_LOOT_POSTER,WOODEN_LOOT_SHEET],artLinks:[],implementationDependencies:[],blockers:[],
 playerUnlock:'Approach the chest',resourceCost:'None',inputs:'',outputs:'Scavenged supplies',capacity:'One cache per placement',
 buildMenuVisibility:'World editor',availability:'Current world asset',testScope:'Placement, animation, interaction and loot persistence.',
};

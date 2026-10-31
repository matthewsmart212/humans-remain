import {GARDEN_ART,GARDEN_FAMILY,GARDEN_ANCHOR} from './camp-garden-art';
import type {CatalogueEntry} from './catalogue-model';

export const gardenEntries:CatalogueEntry[]=GARDEN_ART.map(a=>({
 id:a.id,name:a.name,family:GARDEN_FAMILY,category:'Cooking, food production and farming',group:'Camp garden',recordType:a.tier>0?'upgrade':'buildable structure',phase:'B2',priority:'High',tier:a.tier,lastUpdatedAt:'2026-10-27T00:00:00.000Z',
 art:true,conceptApproved:true,exportComplete:true,implemented:false,tested:false,presentInPrototype:a.tier===0,
 purpose:a.tier===0?'Abandoned vegetable patch beneath the treatment centre, outside the central path.':'Visual garden upgrade for the same camp lot; choose its tier in Build mode.',
 improvement:'Broken patch, ground beds, raised beds and greenhouse share one footprint.',appearance:'Weathered timber, rusty brackets, olive foliage and softly blended soil.',
 states:'Four artwork states. Farming, repair costs and survival unlocks are not connected yet.',image:a.image,crop:[0,0,...a.size],artPreview:{worldWidth:a.worldWidth},artworkExports:[a.image],artReadiness:'Transparent game sprite; aligned ground anchor and shared collision footprint.',
 artLinks:[],implementationDependencies:[],blockers:[],playerUnlock:'Editor tier selection',resourceCost:'Progression design pending',inputs:'Visual asset',outputs:'Farming gameplay pending',capacity:a.tier===0?'Abandoned':`${[0,2,4,6][a.tier]} planned growing slots`,buildMenuVisibility:'World editor',testScope:'Placement, paths, tier swapping and web/native artwork loading.',availability:'Current world asset',physical:{groundAnchor:GARDEN_ANCHOR.join(', ')},
}));

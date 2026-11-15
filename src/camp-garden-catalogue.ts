import {GARDEN_ART,GARDEN_FAMILY,GARDEN_ANCHOR} from './camp-garden-art';
import type {CatalogueEntry} from './catalogue-model';

export const gardenEntries:CatalogueEntry[]=GARDEN_ART.map(a=>({
 id:a.id,name:a.name,family:GARDEN_FAMILY,category:'Cooking, food production and farming',group:'Potato patch',recordType:a.tier>0?'upgrade':'buildable structure',phase:'B2',priority:'High',tier:a.tier,lastUpdatedAt:'2026-10-27T00:00:00.000Z',
 art:true,conceptApproved:true,exportComplete:true,implemented:false,tested:false,presentInPrototype:a.tier===0,
 purpose:a.tier===0?'Broken potato patch beside the west road; repair before planting.':'Plant potatoes by the roadside patch and harvest four per planting.',
 improvement:'Broken and repaired versions use exactly the same four-bed footprint and road-facing entrance.',appearance:'Approved hand-painted timber, rich soil, potatoes and growing foliage.',
 states:'Broken or repaired. Each of the four soil beds can hold a growing potato; one planted yields four.',image:a.image,crop:[0,0,...a.size],artPreview:{worldWidth:a.worldWidth},artworkExports:[a.image],artReadiness:'Transparent game sprite; aligned ground anchor and shared collision footprint.',
 artLinks:[],implementationDependencies:[],blockers:[],playerUnlock:'Editor tier selection',resourceCost:'Progression design pending',inputs:'Visual asset',outputs:'Potatoes for hunger and future cooking',capacity:a.tier===0?'Abandoned':'4 planting slots',buildMenuVisibility:'World editor',testScope:'Placement, paths, tier swapping and web/native artwork loading.',availability:'Current world asset',physical:{groundAnchor:GARDEN_ANCHOR.join(', ')},
}));

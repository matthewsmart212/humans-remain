import {GARDEN_ART,GARDEN_FAMILY,GARDEN_ANCHOR} from './camp-garden-art';
import type {CatalogueEntry} from './catalogue-model';

export const gardenEntries:CatalogueEntry[]=GARDEN_ART.map(a=>({
 id:a.id,name:a.name,family:GARDEN_FAMILY,category:'Cooking, food production and farming',group:'Vegetable patch',recordType:a.tier>0?'upgrade':'buildable structure',phase:'B2',priority:'High',tier:a.tier,lastUpdatedAt:'2026-11-16T00:00:00.000Z',
 art:true,conceptApproved:true,exportComplete:true,implemented:true,tested:false,presentInPrototype:a.tier===0,
 purpose:a.tier===0?'Broken vegetable patch beside the west road; repair before planting.':'Plant potatoes or carrots independently in four beds; harvest four per planting.',
 improvement:'Broken and repaired versions use exactly the same four-bed footprint and road-facing entrance.',appearance:'Hand-painted timber and four soil beds with potato and carrot growth sprites.',
 states:'Broken or repaired. Each bed holds potatoes or carrots with four growth stages; one planted yields four.',image:a.image,crop:[0,0,...a.size],artPreview:{worldWidth:a.worldWidth},artworkExports:[a.image],artReadiness:'Transparent game sprite; aligned ground anchor and shared collision footprint.',
 artLinks:[],implementationDependencies:[],blockers:[],playerUnlock:'Repair the garden after restoring headquarters',resourceCost:'3 logs to repair',inputs:'One potato or carrot per bed',outputs:'Four vegetables per planting after 240 seconds',capacity:a.tier===0?'Abandoned':'4 planting slots',buildMenuVisibility:'World editor',testScope:'Placement, paths, tier swapping and web/native artwork loading.',availability:'Current world asset',physical:{groundAnchor:GARDEN_ANCHOR.join(', ')},
}));

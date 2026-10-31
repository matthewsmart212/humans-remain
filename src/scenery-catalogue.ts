import sceneryArt from './world-scenery-art.json';
import rockArt from './world-rock-art.json';
import type {CatalogueEntry} from './catalogue-model';
const scenery=[...sceneryArt,...rockArt];

/** World dressing is opt-in: adding catalogue records never plants the owner's map. */
export const sceneryEntries:CatalogueEntry[]=scenery.map(s=>({
 id:s.id,name:s.name,family:s.kind==='foliage'?`World foliage · ${s.zone}`:`World scenery · ${s.zone}`,category:'Camp surroundings',group:'World scenery',recordType:'prop',phase:'B1',priority:'Medium',tier:null,lastUpdatedAt:'2026-10-16T18:00:00.000Z',
 art:true,conceptApproved:false,exportComplete:true,implemented:true,tested:false,presentInPrototype:true,
 purpose:s.kind==='foliage'?'Walk-through world foliage with contact bending and automatic depth.':('walkable' in s&&s.walkable)?'Loose ground stones · walkable scenery.':'Placeable natural scenery with a ground-level collision footprint.',
 improvement:'Shared compact texture, loaded only when placed; existing view culling and spatial queries.',appearance:s.description,
 states:s.kind==='foliage'?'Subtle wind, contact bend, sprint push and recovery; respects reduced motion.':'Static scenic prop; not a harvestable resource.',
 image:s.image,artPreview:{worldWidth:s.worldWidth},artworkExports:[s.image],artReadiness:'Transparent illustrated artwork matched to the camp and the current outdoor terrain.',
 artLinks:[],implementationDependencies:[],blockers:[],playerUnlock:'World editor',resourceCost:'None — placeable scenery',inputs:s.kind==='foliage'?'Movement contact':'None',outputs:'Scenery only; no resource drops',capacity:'Not applicable',buildMenuVisibility:'World editor',testScope:'Automated catalogue, loading, collisions, foliage response and software renderer checks; device playtest pending.',availability:'World scenery pack'
}));

import art from './camp-circular-wall-art.json';
import type {CatalogueEntry} from './catalogue-model';

/** The approved circular kit is one skin; legacy wall tiers stay resolvable. */
export const circularWallEntries:CatalogueEntry[]=art.map(piece=>({
 id:piece.id,lastUpdatedAt:'2026-10-31',name:piece.name,family:'Camp perimeter',
 category:'Defences and warnings',recordType:'wall piece',phase:'B1',priority:'High',
 tier:null,group:'Camp perimeter',art:true,conceptApproved:true,exportComplete:true,
 implemented:true,tested:false,presentInPrototype:true,image:piece.image,
 purpose:'A curved section of the mossy timber camp wall, with open road entrances.',
 improvement:'Uneven sharpened timber above a low mossy stone foundation.',
 states:'Approved circular wall section; each part has its own fixed orientation.',
 artLinks:[],artworkExports:[piece.image],implementationDependencies:[],blockers:[],
 playerUnlock:'World editor',resourceCost:'Not set',inputs:'None for placement',
 outputs:'Camp perimeter',capacity:'Not applicable',buildMenuVisibility:'World editor',
 testScope:null,availability:'Current camp wall',
}));

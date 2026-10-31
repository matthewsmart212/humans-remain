import trees from './tree-art.json';
import type {CatalogueEntry} from './catalogue-model';

export const treeEntries:CatalogueEntry[]=trees.map(t=>({
 id:t.id,name:t.name,family:'Choppable trees',category:'Camp surroundings',group:'Trees',recordType:'prop',phase:'B1',priority:'Medium',tier:null,lastUpdatedAt:'2026-10-16T00:00:00.000Z',
 art:true,conceptApproved:false,exportComplete:true,implemented:true,tested:false,presentInPrototype:true,
 purpose:'Placeable tree with axe damage, a notched trunk and a rooted stump.',improvement:'Shared three-state texture; only the trunk blocks movement.',appearance:'Painterly woodland tree with warm bark and matching cut wood.',
 states:'Intact → axe-notched → stump. Brief hit sway and fall transition. Resets when leaving the test session.',image:t.image,crop:t.frames[0].crop,artPreview:{worldWidth:t.worldWidth},artworkExports:[t.image],artReadiness:'Three transparent painted states, registered at the trunk base.',
 artLinks:[],implementationDependencies:[],blockers:[],playerUnlock:'World editor',resourceCost:'None — placeable world asset',inputs:'Axe contact',outputs:'Collectible logs; trees reset with the play session',capacity:`${t.hp} health`,buildMenuVisibility:'World editor',testScope:'Automated axe and rendering checks; device playtest pending.',availability:'Current camp asset'
}));

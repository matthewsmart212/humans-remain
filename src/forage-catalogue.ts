import {FORAGE_ART} from './forage-art';
import type {CatalogueEntry} from './catalogue-model';

export const forageEntries:CatalogueEntry[]=FORAGE_ART.map(a=>({
 id:a.id,name:a.name,family:'Wild food',category:'Camp surroundings',group:'Foraging',recordType:'prop',phase:'B1',priority:'Medium',tier:null,lastUpdatedAt:'2026-10-25T00:00:00.000Z',
 art:true,conceptApproved:true,exportComplete:true,implemented:true,tested:false,presentInPrototype:true,
 purpose:`Pick ${a.kind==='berries'?'berries':'apples'} straight into the existing backpack.`,improvement:'Fruit disappears as it is picked; the same plant regrows during the run.',appearance:'Painted moss and olive woodland foliage with warm bark and visible ripe fruit.',
 states:`Ripe → picked → regrows after ${a.regrowDays} dawns. Picking gives a short contact shake.`,image:a.image,crop:[0,0,...a.size],artPreview:{worldWidth:a.worldWidth},artworkExports:[a.image],artReadiness:'Transparent plant sprite with separately rendered fruit; fixed size and ground anchor.',
 artLinks:[],implementationDependencies:[],blockers:[],playerUnlock:'Explore the woodland',resourceCost:'None',inputs:'Pick one per tap while nearby; no tool required',outputs:a.kind==='berries'?'Berries':'Apples',capacity:`${a.capacity} per plant`,buildMenuVisibility:'World editor',testScope:'Picking, capacity, regrowth, line of sight and shared rendering.',availability:'Current world asset',
}));

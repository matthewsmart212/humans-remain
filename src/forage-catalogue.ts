import {FORAGE_ART,FORAGE_FRUIT_ART} from './forage-art';
import {cropPickedUrl} from './crop-art';
import type {CatalogueEntry} from './catalogue-model';

export const forageEntries:CatalogueEntry[]=FORAGE_ART.map(a=>({
 id:a.id,name:a.name,family:'Wild food',category:'Camp surroundings',group:'Foraging',recordType:'prop',phase:'B1',priority:'Medium',tier:null,lastUpdatedAt:'2026-10-25T00:00:00.000Z',
 art:true,conceptApproved:true,exportComplete:true,implemented:true,tested:false,presentInPrototype:true,
 purpose:`Pick ${a.kind==='berries'?'berries':a.kind==='potato'?'potatoes':a.kind==='carrot'?'carrots':'apples'} straight into the existing backpack.`,improvement:a.regrowDays?'Fruit disappears one portion at a time and regrows during the run.':'Harvesting leaves a shallow divot in the soil.',appearance:'Painted woodland plants with weathered leaves, warm bark and visible fruit or root crowns.',
 states:a.regrowDays?`Ripe → picked → regrows after ${a.regrowDays} dawns.`:'Ripe → picked soil. Eat the vegetable or plant it at camp.',image:a.image,crop:[0,0,...a.size],artPreview:{worldWidth:a.worldWidth},artworkExports:[a.image,...(a.kind==='berries'||a.kind==='apple'?FORAGE_FRUIT_ART[a.kind].images:[cropPickedUrl(a.kind)])],artReadiness:'Transparent woodland sprites with consistent ground anchors across harvest states.',
 artLinks:[],implementationDependencies:[],blockers:[],playerUnlock:'Explore the woodland',resourceCost:'None',inputs:'Pick one per tap while nearby; no tool required',outputs:a.kind==='berries'?'Berries':a.kind==='potato'?'Potatoes':a.kind==='carrot'?'Carrots':'Apples',capacity:`${a.capacity} per plant`,buildMenuVisibility:'World editor',testScope:'Picking, capacity, regrowth, line of sight and shared rendering.',availability:'Current world asset',
}));

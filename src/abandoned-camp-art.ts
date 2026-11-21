import type {AssetCollision} from './asset-collision';
import type {CatalogueEntry} from './catalogue-model';

export const ABANDONED_CAMP_ID='art_abandoned_woodland_camp';
export const ABANDONED_CAMP_LATCH=[.338,.57] as const;
export const ABANDONED_CAMP_SIZE=[1020,680] as const;
export const ABANDONED_CAMP_WIDTH=500;
const directory='/survival/abandoned-woodland-camp-v1';
export const ABANDONED_CAMP_FRAMES=[directory+'/closed.webp',directory+'/open.webp'];

// Ground contacts only. The bones and dropped provisions can be stepped over.
export const ABANDONED_CAMP_COLLISION:AssetCollision={
 lineWidth:.012,
 paths:[
  {closed:true,points:[[.008,.476],[.063,.478],[.071,.51],[.21,.435],[.49,.47],[.552,.455],[.45,.382],[.15,.348],[.008,.421]]},
  {closed:false,points:[[.077,.617],[.215,.463],[.226,.598]]},
  {closed:true,points:[[.546,.278],[.588,.32],[.98,.592],[.979,.535],[.62,.266]]},
  {closed:true,points:[[.5,.59],[.56,.626],[.602,.563],[.6,.512],[.528,.527]]},
  {closed:true,points:[[.57,.767],[.60,.811],[.685,.78],[.862,.866],[.932,.808],[.679,.637]]},
  {closed:true,points:[[.218,.695],[.28,.659],[.365,.657],[.423,.705],[.425,.766],[.37,.819],[.264,.814],[.209,.77]]},
  {closed:true,points:[[.275,.488],[.402,.481],[.408,.505],[.281,.517]]},
 ],
};

export const abandonedCampEntry:CatalogueEntry={
 id:ABANDONED_CAMP_ID,name:'Abandoned woodland camp',family:'Woodland scenery',category:'World scenery',
 group:'Survivor camps',recordType:'environment prop',phase:'B1',priority:'Normal',tier:null,lastUpdatedAt:'2026-11-21T00:00:00.000Z',
 art:true,conceptApproved:true,exportComplete:true,implemented:true,tested:true,presentInPrototype:true,
 purpose:'Search the wooden chest beneath the larger shelter.',improvement:'',
 appearance:'Two torn shelters, a cold hearth, scattered bones, supplies and a broken stake fence.',
 states:'Closed or opened wooden chest. Each camp keeps its own remaining loot.',
 image:ABANDONED_CAMP_FRAMES[0],crop:[0,0,...ABANDONED_CAMP_SIZE],artPreview:{worldWidth:ABANDONED_CAMP_WIDTH,openFrames:ABANDONED_CAMP_FRAMES},
 artworkExports:ABANDONED_CAMP_FRAMES,artLinks:[],implementationDependencies:[],blockers:[],playerUnlock:'Approach the chest',
 resourceCost:'None',inputs:'',outputs:'Salvaged supplies',capacity:'One loot chest per camp',buildMenuVisibility:'World editor',
 availability:'Current world asset',testScope:'Placement, chest interaction and loot persistence.',
};

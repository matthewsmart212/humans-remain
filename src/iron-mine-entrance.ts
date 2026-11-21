import type {AssetCollision,CollisionPoint} from './asset-collision';
import type {CatalogueEntry} from './catalogue-model';

export const IRON_MINE_ENTRANCE_ID='art_iron_mine_entrance';
export const IRON_MINE_ENTRANCE_IMAGE='/survival/iron-mine-v1/entrance.webp';
export const IRON_MINE_ENTRANCE_SIZE=[1280,640] as const;
export const IRON_MINE_ENTRANCE_WIDTH=680;
export const IRON_MINE_ENTRANCE_ANCHOR=[.5,.7] as const;

// The rail bed crosses the threshold between the two front timber posts.
export const IRON_MINE_DOOR_AREA:CollisionPoint[]=[[.392,.67],[.49,.582],[.545,.601],[.45,.71]];
export const IRON_MINE_RETURN_POINT:CollisionPoint=[.33,.854];
export const IRON_MINE_ENTRANCE_COLLISION:AssetCollision={
 lineWidth:.008,
 paths:[
  // A recessed mouth leaves the rails open while the hill blocks travel behind it.
  {closed:true,points:[[.013,.59],[.065,.42],[.20,.27],[.49,.17],[.74,.23],[.91,.40],[.976,.59],[.989,.70],[.837,.799],[.644,.812],[.62,.659],[.598,.654],[.575,.565],[.516,.51],[.435,.546],[.357,.68],[.253,.742],[.125,.737],[.021,.666]]},
  {closed:true,points:[[.477,.816],[.569,.764],[.619,.79],[.619,.84],[.561,.916],[.489,.886]]},
 ],
};

export const ironMineEntranceEntry:CatalogueEntry={
 id:IRON_MINE_ENTRANCE_ID,name:'Iron mine entrance',family:'Woodland scenery',category:'World scenery',
 group:'Mining',recordType:'environment prop',phase:'B1',priority:'Normal',tier:null,lastUpdatedAt:'2026-11-21T00:00:00.000Z',
 art:true,conceptApproved:true,exportComplete:true,implemented:true,tested:true,presentInPrototype:true,
 purpose:'Follow the rails underground to reach the iron workings.',improvement:'',
 appearance:'A timber-framed adit in a mossy rock outcrop, with an ore cart, a hanging lantern and a pair of rails.',
 states:'Open passage to the mine',image:IRON_MINE_ENTRANCE_IMAGE,crop:[0,0,...IRON_MINE_ENTRANCE_SIZE],
 artPreview:{worldWidth:IRON_MINE_ENTRANCE_WIDTH},artworkExports:[IRON_MINE_ENTRANCE_IMAGE],
 artLinks:[],implementationDependencies:[],blockers:[],playerUnlock:'Walk into the timber entrance',
 resourceCost:'None',inputs:'',outputs:'Underground passage',capacity:'',buildMenuVisibility:'World editor',
 availability:'Current world asset',testScope:'Placement, entrance collision and return travel.',
};

import type {AssetCollision,CollisionPoint} from './asset-collision';
import type {CatalogueEntry} from './catalogue-model';
import type {WorldAsset} from './world-assets';

export const SOUTHEAST_SMALLHOLDING='southeast-smallholding-cottage';
export const SMALLHOLDING_COTTAGE_ID='art_smallholding_cottage';
const directory='/survival/smallholding-v1';
export const COTTAGE_EXTERIOR=directory+'/cottage.webp';
export const COTTAGE_INTERIOR=directory+'/cottage-interior.webp';
export const COTTAGE_SIZE=[768,512] as const;
const width=600,height=400;
const door={left:.28,right:.394,threshold:.807};
const anchor=[.5,door.threshold];
// From the left jamb, follow the stone sill, rear wall and right wall back
// to the other jamb. Closing this outline adds only the walk-in threshold.
const outline:CollisionPoint[]=[
 [door.left,door.threshold],[.147,.774],[.147,.639],[.273,.429],
 [.704,.493],[.704,.847],[door.right,.824],[door.right,door.threshold],
];
const walls:AssetCollision={lineWidth:.009,paths:[
 {closed:false,points:outline},
 {closed:true,points:[[.275,.427],[.442,.448],[.457,.482],[.287,.516]]}, // hearth
 {closed:true,points:[[.704,.62],[.90,.64],[.95,.825],[.89,.945],[.727,.89],[.704,.84]]}, // lean-to
 {closed:true,points:[[.055,.725],[.116,.721],[.137,.775],[.095,.803],[.052,.783]]}, // barrel
]};

export const cottageEntry:CatalogueEntry={
 id:SMALLHOLDING_COTTAGE_ID,name:'Ruined smallholding cottage',family:'Woodland scenery',category:'World scenery',
 group:'Survivor camps',recordType:'environment prop',phase:'B1',priority:'Normal',tier:null,lastUpdatedAt:'2026-11-21T00:00:00.000Z',
 art:true,conceptApproved:true,exportComplete:true,implemented:true,tested:true,presentInPrototype:true,
 purpose:'Explore the abandoned cottage through its open southern doorway.',improvement:'',
 appearance:'Weathered timber walls, broken shingles and an overgrown lean-to.',
 states:'Exterior and walk-in interior.',image:COTTAGE_INTERIOR,crop:[0,0,...COTTAGE_SIZE],
 artPreview:{worldWidth:width,roof:COTTAGE_EXTERIOR,roofRect:[0,0,...COTTAGE_SIZE]},
 artworkExports:[COTTAGE_INTERIOR,COTTAGE_EXTERIOR],artLinks:[],implementationDependencies:[],blockers:[],
 playerUnlock:'Walk through the open door',resourceCost:'None',inputs:'',outputs:'',capacity:'',
 buildMenuVisibility:'World editor',availability:'Current world asset',testScope:'Walkable doorway and interior.',
};

export function configureSmallholdingCottage(asset:WorldAsset){
 asset.anchor=anchor.map((fraction,i)=>COTTAGE_SIZE[i]*fraction);
 asset.body=[];
 asset.collision=walls;
 const floor=outline.map(([u,v]):CollisionPoint=>[(u-anchor[0])*width,(v-anchor[1])*height]);
 const left=Math.min(...floor.map(([x])=>x)),top=Math.min(...floor.map(([,y])=>y));
 asset.interior={x:left,y:top,width:Math.max(...floor.map(([x])=>x))-left,
  height:Math.max(...floor.map(([,y])=>y))-top,outline:floor};
 asset.allowTransparency=true;
 asset.note='Walk through the southern door to reveal the interior.';
}

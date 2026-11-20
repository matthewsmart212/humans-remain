import type {ArtworkRecord} from './artwork-model';
import type {AssetCollision,CollisionPoint} from './asset-collision';
import exports from './camp-worksites-exports.json';

export const WORKSITE_ROOT='/survival/camp-craft-v2';
export const WAREHOUSE_ASSET_ID='misc_ceaf1a05-5426-45df-8a51-d3e2e07c6f9f';
export const WAREHOUSE_ARTWORK={empty:WORKSITE_ROOT+'/warehouse-empty.webp',light:WORKSITE_ROOT+'/warehouse-light.webp',half:WORKSITE_ROOT+'/warehouse-half.webp',full:WORKSITE_ROOT+'/warehouse-full.webp'};
export const WAREHOUSE_ANCHOR:[number,number]=[.5,.84];
// The porch runs between the left post/barrel and the cart. The painted floor
// and loose planks at its lip are walkable in the ruined and restored states.
export const WAREHOUSE_COLLISION:AssetCollision={lineWidth:.008,paths:[
 // Rear store, shelf, side walls, porch posts and the fixed scrap bin.
 {closed:true,points:[[.153,.716],[.22,.594],[.57,.452],[.928,.608],[.938,.763],[.909,.795],[.849,.811],[.821,.833],[.763,.81],[.639,.756],[.601,.744],[.556,.733],[.557,.684],[.36,.653],[.223,.724],[.21,.786],[.18,.799],[.157,.772]]},
 // Barrel beside the left entrance post.
 {closed:true,points:[[.05,.743],[.071,.724],[.127,.721],[.164,.737],[.179,.766],[.167,.8],[.132,.821],[.081,.823],[.052,.805],[.044,.779]]},
 // Stone cart, wheel and both projecting shafts.
 {closed:true,points:[[.488,.773],[.641,.703],[.76,.735],[.76,.841],[.748,.899],[.723,.938],[.696,.953],[.669,.949],[.647,.923],[.644,.903],[.616,.897],[.549,.956],[.524,.962],[.519,.942],[.59,.868],[.534,.869],[.496,.86],[.444,.909],[.423,.915],[.416,.893],[.488,.828]]},
]};

const logPile=(points:CollisionPoint[]):AssetCollision=>({lineWidth:.008,paths:[{closed:true,points}]});
// Only the wood bay changes the walkable porch. Stone and scrap always sit
// inside the cart and bin above. Levels correspond to the four stock images.
const warehouseLogs=[
 undefined,
 logPile([[.261,.665],[.338,.619],[.397,.623],[.397,.664],[.333,.708],[.278,.708],[.26,.694]]),
 logPile([[.242,.659],[.34,.606],[.406,.614],[.415,.673],[.376,.703],[.255,.702],[.239,.687]]),
 logPile([[.24,.652],[.345,.588],[.463,.607],[.483,.673],[.44,.721],[.392,.723],[.349,.697],[.253,.697],[.236,.683]]),
];
export function warehouseLogCollision(level:number):AssetCollision|undefined{return warehouseLogs[level]}

export const PREVIOUS_FURNACE_COLLISION:AssetCollision={lineWidth:.008,paths:[
 {closed:true,points:[[.12,.60],[.29,.51],[.65,.43],[.85,.55],[.85,.64],[.68,.70],[.57,.75],[.38,.77],[.14,.73],[.12,.70]]},
 {closed:true,points:[[.227,.738],[.328,.707],[.382,.748],[.383,.787],[.457,.76],[.561,.798],[.560,.872],[.474,.929],[.438,.929],[.310,.865],[.310,.835],[.227,.818]]},
 {closed:true,points:[[.65,.777],[.695,.757],[.773,.763],[.795,.791],[.804,.832],[.765,.853],[.689,.858],[.65,.84]]},
 {closed:true,points:[[.854,.665],[.890,.660],[.890,.700],[.857,.702]]},
]};
export const FURNACE_COLLISION:AssetCollision={...PREVIOUS_FURNACE_COLLISION,paths:[...PREVIOUS_FURNACE_COLLISION.paths,
 // Workbench, canopy post and the upper half of the anvil stump.
 {closed:true,points:[[.60,.61],[.86,.58],[.89,.69],[.77,.72],[.78,.77],[.81,.83],[.66,.86],[.64,.80],[.65,.73],[.60,.73]]},
]};
export const FURNACE_FIREBOX={light:[.482,.609] as const};
// The front of the new workbench stays clear of the bellows and crucible.
export const FURNACE_INGOT_RACK={x:.695,y:.568,stepX:.016,stepY:-.004,width:.033,height:.025};

// Recognize only the shipped outlines in retained artwork and layout snapshots.
const legacyWarehouse:AssetCollision[]=[
 {lineWidth:.012,paths:[{closed:true,points:[[.09943,.54924],[.12879,.45170],[.32008,.29640],[.91951,.64962],[.90530,.73580],[.58617,.95833],[.35795,.82670],[.39394,.75]]}]},
 {lineWidth:.008,paths:[{closed:true,points:[[.06,.64],[.51,.42],[.94,.70],[.94,.79],[.76,.84],[.65,.77],[.64,.66],[.60,.64],[.40,.64],[.23,.76],[.06,.70]]}]},
];
export function isDefaultWarehouseCollision(c:AssetCollision|undefined){
 if(!c||c===WAREHOUSE_COLLISION)return true;
 return [...legacyWarehouse,WAREHOUSE_COLLISION].some(ref=>ref.lineWidth===c.lineWidth&&ref.paths.length===c.paths.length&&ref.paths.every((p,i)=>{
  const saved=c.paths[i];
  return p.closed===saved.closed&&p.points.length===saved.points.length&&p.points.every(([x,y],j)=>Math.abs(x-saved.points[j][0])<.00001&&Math.abs(y-saved.points[j][1])<.00001);
 }));
}

/** Replace this approved source only. Future owner-uploaded artwork wins. */
export function resolveWorksiteWarehouse(record:ArtworkRecord):ArtworkRecord{
 const c=record.config;
 if(record.id!==WAREHOUSE_ASSET_ID||c.base.id!=='511df250-f10f-4b4e-8b9d-f091fe490070'||c.kind!=='sprite'||c.frames.length||c.roof||c.unlit)return record;
 const file=exports.find(f=>f.name==='warehouse-full')!;
 return {...record,config:{...c,base:{...c.base,url:WAREHOUSE_ARTWORK.full,name:'warehouse-full.webp',mime:'image/webp',width:file.width,height:file.height,bytes:file.bytes},worldWidth:1254,anchor:WAREHOUSE_ANCHOR,collision:isDefaultWarehouseCollision(c.collision)?WAREHOUSE_COLLISION:c.collision}};
}

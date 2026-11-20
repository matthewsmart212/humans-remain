import type {AssetCollision,CollisionPoint} from './asset-collision';
import type {ArtworkRecord} from './artwork-model';
import type {WorldAsset} from './world-assets';
import workshopArt from './workshop-art.json';
import treatmentArt from './treatment-art.json';
import {PREVIOUS_FURNACE_COLLISION,WAREHOUSE_ARTWORK,isDefaultWarehouseCollision} from './camp-worksites-art';
import {FURNACE_COLD_IMAGE} from './furnace-animation-art';
import {HQ_SOUTH_INTERIOR,isOriginalHeadquartersOutline} from './headquarters-south-art';

export const BUNKER_IMAGE='/survival/camp-structures-v3/bunker-0.webp';
export const BUNKER_STEP_AREA:CollisionPoint[]=[[.29,.79],[.52,.79],[.52,.97],[.29,.97]];
export const BUNKER_DOOR_AREA:CollisionPoint[]=[[.34,.80],[.48,.80],[.48,.88],[.34,.88]];

const solid=(points:CollisionPoint[]):AssetCollision=>({lineWidth:.012,paths:[{closed:true,points}]});
export const BUNKER_FOOT=solid([[.06,.73],[.14,.59],[.53,.47],[.82,.53],[.92,.68],[.90,.80],[.63,.89],[.51,.88],[.51,.77],[.29,.77],[.28,.85],[.08,.82]]);
export const HEARTH_FOOT=solid([[.093,.716],[.139,.653],[.272,.584],[.440,.558],[.617,.565],[.787,.615],[.877,.676],[.906,.738],[.941,.748],[.948,.788],[.855,.847],[.826,.827],[.704,.869],[.502,.891],[.322,.884],[.192,.849],[.111,.801]]);
export const WELL_IMAGE='/survival/camp-well-v2/oak-well.webp';
export const WELL_FOOT=solid([[.129,.771],[.178,.730],[.204,.729],[.210,.665],[.305,.601],[.455,.580],[.585,.603],[.668,.665],[.693,.752],[.675,.833],[.612,.888],[.473,.918],[.333,.908],[.241,.883],[.183,.872],[.153,.835],[.128,.818]]);
export const IRON_ROCK_FOOT=solid([[.03,.62],[.11,.48],[.37,.43],[.71,.45],[.91,.54],[.97,.66],[.91,.76],[.74,.88],[.57,.96],[.38,.97],[.18,.91],[.06,.78]]);

// These outlines were saved against earlier paintings, including an oblique
// bunker entrance. Match the old points to source-pixel precision so later
// hand-drawn outlines and replacement artwork continue to take precedence.
const oldWorkshop:CollisionPoint[]=[[.0424,.5454],[.6073,.4436],[.936,.6349],[.9838,.7815],[.9128,.8695],[.7724,.888],[.4421,.9405],[.2137,.9374],[.0424,.8371],[0,.6766]];
const oldTreatment:CollisionPoint[]=[[.051,.5899],[.5209,.3511],[.7759,.423],[.983,.5853],[1,.7406],[.9057,.8635],[.711,.9423],[.4111,.8959],[.1113,.838]];
const previousWorkshop:CollisionPoint[]=[[.2,.61],[.67,.56],[.91,.7],[.94,.76],[.82,.81],[.6,.86],[.49,.91],[.16,.8],[.055,.725],[.065,.665]];
const previousTreatment:CollisionPoint[][]=[
 [[.13,.68],[.40,.49],[.50,.54],[.49,.60],[.40,.76],[.26,.79],[.17,.74]],
 [[.58,.58],[.66,.58],[.92,.70],[.93,.84],[.80,.89],[.56,.73],[.56,.65]],
 [[.41,.47],[.61,.53],[.72,.59]],
];
const previousCot:CollisionPoint[]=[[0.044,0.674],[0.185,0.55],[0.52,0.47],[0.79,0.535],[0.945,0.645],[0.931,0.697],[0.838,0.754],[0.761,0.798],[0.755,0.835],[0.721,0.834],[0.715,0.814],[0.665,0.862],[0.62,0.87],[0.525,0.843],[0.525,0.779],[0.508,0.774],[0.511,0.705],[0.565,0.677],[0.558,0.589],[0.499,0.648],[0.488,0.731],[0.456,0.731],[0.449,0.718],[0.345,0.688],[0.338,0.71],[0.309,0.71],[0.291,0.699],[0.219,0.735],[0.203,0.755],[0.154,0.762],[0.125,0.752],[0.12,0.727],[0.078,0.722],[0.078,0.691]];
const oldPlacedBunker:CollisionPoint[]=[[.2852,.6823],[.5263,.4929],[.761,.592],[.4891,.8717],[.577,.9451],[.9368,.5216],[.9133,.3421],[.5616,.1537],[.2816,.4096],[.2825,.5107],[.1828,.6109]];
const oldBunker:CollisionPoint[]=[[.1797,.6055],[.2726,.4023],[.5218,.1462],[.897,.3276],[.9103,.563],[.6023,.9445],[.5085,.9062],[.7407,.619],[.5227,.4883],[.2821,.7071]];
const oldHearth:CollisionPoint[]=[[.1161,.5268],[.8839,.5268],[.8839,.9375],[.1161,.9375]];
const oldHearthFoot:CollisionPoint[]=[[.08,.73],[.18,.63],[.38,.57],[.66,.57],[.82,.62],[.93,.71],[.91,.80],[.77,.86],[.52,.90],[.29,.88],[.12,.83]];
const oldPlacedWell:CollisionPoint[]=[[.15,.79],[.24,.64],[.46,.60],[.68,.70],[.75,.83],[.65,.94],[.42,.98],[.22,.91]];
const oldWell:CollisionPoint[]=[[.0926,.4217],[.0254,.5524],[.0181,.7209],[.0795,.8516],[.2738,.9602],[.4929,.9807],[.4695,.5618],[.8274,.5224],[.7807,.4343],[.4783,.4106],[.2153,.4201],[.0941,.4217],[.0488,.4563]];
const oldFurnace:CollisionPoint[]=[[.08,.74],[.33,.67],[.64,.63],[.92,.72],[.92,.77],[.69,.88],[.29,.93],[.08,.84]];
const oldSteps:CollisionPoint[]=[[.29,.7],[.53,.51],[.74,.60],[.49,.86]];

function samePoints(points:CollisionPoint[]|undefined,old:CollisionPoint[]){
 return points?.length===old.length&&points.every(([x,y],i)=>Math.abs(x-old[i][0])<.00006&&Math.abs(y-old[i][1])<.00006);
}
function matches(c:AssetCollision|undefined,old:CollisionPoint[],width=.012,closed=true){
 return c?.lineWidth===width&&c.paths.length===1&&c.paths[0].closed===closed&&samePoints(c.paths[0].points,old);
}
function updatedWorkstationOutline(image:string,c:AssetCollision|undefined):AssetCollision|undefined{
 if(image==='/survival/camp-workshop-v2/idle-00.webp'&&(matches(c,oldWorkshop,.008)||matches(c,previousWorkshop,.008)))return workshopArt.collision as AssetCollision;
 if(image==='/survival/camp-treatment-v2/idle-00.webp'){
  const previous=c?.lineWidth===.008&&c.paths.length===previousTreatment.length&&c.paths.every((p,i)=>p.closed===(i!==2)&&samePoints(p.points,previousTreatment[i]));
  const cot=c?.lineWidth===.008&&c.paths.length===treatmentArt.collision.paths.length&&c.paths.every((path,i)=>path.closed&&samePoints(path.points,i===0?previousCot:treatmentArt.collision.paths[i].points as CollisionPoint[]));
  if(cot||previous||matches(c,oldTreatment))return treatmentArt.collision as AssetCollision;
 }
}
// The editor's older eight-piece palisade set shares canvases across tiers.
// Each trace follows the row of feet, including the bends in the upright pieces.
const wallFeet:{revision:number;points:CollisionPoint[]}[]=[
 {revision:5,points:[[.06,.21],[.41,.33],[.64,.44],[.77,.55]]},
 {revision:2,points:[[.71,.19],[.82,.40],[.91,.67],[.93,.89]]},
 {revision:2,points:[[.50,.85],[.72,.72],[.82,.54],[.89,.27]]},
 {revision:3,points:[[.09,.87],[.42,.77],[.70,.68],[.65,.57]]},
 {revision:1,points:[[.23,.74],[.47,.80],[.70,.85],[.87,.84]]},
 {revision:2,points:[[.08,.12],[.15,.35],[.27,.46],[.50,.66]]},
 {revision:2,points:[[.14,.89],[.21,.69],[.30,.48],[.49,.29]]},
 {revision:1,points:[[.15,.39],[.44,.27],[.69,.20],[.89,.14]]},
];
export function alignImportedFixture(record:ArtworkRecord):ArtworkRecord{
 const c=record.config,url=c.base.url;
 const workstation=updatedWorkstationOutline(url,c.collision);
 if(workstation)return {...record,config:{...c,collision:workstation}};
 const wallNumber=/^\/survival\/camp-walls-moss-v1\/wall-([1-8])\.webp$/.exec(url);
 if(wallNumber){
  const wall=wallFeet[Number(wallNumber[1])-1];
  if(record.revision===wall.revision)return {...record,config:{...c,solid:true,collision:{lineWidth:.044,paths:[{closed:false,points:wall.points}]}}};
 }
 if(url===BUNKER_IMAGE){
  const collision=matches(c.collision,oldBunker)?BUNKER_FOOT:c.collision;
  const animationArea=samePoints(c.animationArea?.points,oldSteps)?{points:BUNKER_STEP_AREA}:c.animationArea;
  if(collision!==c.collision||animationArea!==c.animationArea)return {...record,config:{...c,collision,animationArea}};
 }
 if(url===WELL_IMAGE&&matches(c.collision,oldWell,.012,false))return {...record,config:{...c,collision:WELL_FOOT}};
 if(url==='/survival/camp-hearth-v4/flame-0.webp'&&(matches(c.collision,oldHearth)||matches(c.collision,oldHearthFoot)))return {...record,config:{...c,collision:HEARTH_FOOT}};
 return record;
}
export function placedCollision(asset:WorldAsset,override?:AssetCollision):AssetCollision|undefined{
 if(!override)return asset.collision;
 if(asset.image===WAREHOUSE_ARTWORK.full&&isDefaultWarehouseCollision(override))return asset.collision;
 if(asset.image===WELL_IMAGE&&matches(override,oldPlacedWell,.008))return asset.collision;
 if(asset.image===FURNACE_COLD_IMAGE&&(matches(override,oldFurnace,.008)||JSON.stringify(override)===JSON.stringify(PREVIOUS_FURNACE_COLLISION)))return asset.collision;
 if(asset.image==='/survival/camp-hearth-v4/flame-0.webp'&&matches(override,oldHearthFoot))return asset.collision;
 if(asset.image===HQ_SOUTH_INTERIOR&&isOriginalHeadquartersOutline(override))return asset.collision;
 if(asset.image===BUNKER_IMAGE&&matches(override,oldPlacedBunker))return BUNKER_FOOT;
 if(updatedWorkstationOutline(asset.image,override))return asset.collision;
 return override;
}

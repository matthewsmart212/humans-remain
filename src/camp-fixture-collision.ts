import type {AssetCollision,CollisionPoint} from './asset-collision';
import type {ArtworkRecord} from './artwork-model';
import type {WorldAsset} from './world-assets';

export const BUNKER_IMAGE='/survival/camp-structures-v3/bunker-0.webp';
export const BUNKER_STEP_AREA:CollisionPoint[]=[[.29,.79],[.52,.79],[.52,.97],[.29,.97]];
export const BUNKER_DOOR_AREA:CollisionPoint[]=[[.34,.80],[.48,.80],[.48,.88],[.34,.88]];

const solid=(points:CollisionPoint[]):AssetCollision=>({lineWidth:.012,paths:[{closed:true,points}]});
export const BUNKER_FOOT=solid([[.06,.73],[.14,.59],[.53,.47],[.82,.53],[.92,.68],[.90,.80],[.63,.89],[.51,.88],[.51,.77],[.29,.77],[.28,.85],[.08,.82]]);
export const HEARTH_FOOT=solid([[.08,.73],[.18,.63],[.38,.57],[.66,.57],[.82,.62],[.93,.71],[.91,.80],[.77,.86],[.52,.90],[.29,.88],[.12,.83]]);
export const IRON_ROCK_FOOT=solid([[.03,.62],[.11,.48],[.37,.43],[.71,.45],[.91,.54],[.97,.66],[.91,.76],[.74,.88],[.57,.96],[.38,.97],[.18,.91],[.06,.78]]);

// These outlines were saved against earlier paintings, including an oblique
// bunker entrance. Match the old points to source-pixel precision so later
// hand-drawn outlines and replacement artwork continue to take precedence.
const oldWorkshop:CollisionPoint[]=[[.0424,.5454],[.6073,.4436],[.936,.6349],[.9838,.7815],[.9128,.8695],[.7724,.888],[.4421,.9405],[.2137,.9374],[.0424,.8371],[0,.6766]];
const oldTreatment:CollisionPoint[]=[[.051,.5899],[.5209,.3511],[.7759,.423],[.983,.5853],[1,.7406],[.9057,.8635],[.711,.9423],[.4111,.8959],[.1113,.838]];
const oldPlacedBunker:CollisionPoint[]=[[.2852,.6823],[.5263,.4929],[.761,.592],[.4891,.8717],[.577,.9451],[.9368,.5216],[.9133,.3421],[.5616,.1537],[.2816,.4096],[.2825,.5107],[.1828,.6109]];
const oldBunker:CollisionPoint[]=[[.1797,.6055],[.2726,.4023],[.5218,.1462],[.897,.3276],[.9103,.563],[.6023,.9445],[.5085,.9062],[.7407,.619],[.5227,.4883],[.2821,.7071]];
const oldHearth:CollisionPoint[]=[[.1161,.5268],[.8839,.5268],[.8839,.9375],[.1161,.9375]];
const oldSteps:CollisionPoint[]=[[.29,.7],[.53,.51],[.74,.60],[.49,.86]];

function samePoints(points:CollisionPoint[]|undefined,old:CollisionPoint[]){
 return points?.length===old.length&&points.every(([x,y],i)=>Math.abs(x-old[i][0])<.00006&&Math.abs(y-old[i][1])<.00006);
}
function matches(c:AssetCollision|undefined,old:CollisionPoint[],width=.012){
 return c?.lineWidth===width&&c.paths.length===1&&c.paths[0].closed&&samePoints(c.paths[0].points,old);
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
 if(url==='/survival/camp-hearth-v4/flame-0.webp'&&matches(c.collision,oldHearth))return {...record,config:{...c,collision:HEARTH_FOOT}};
 return record;
}
export function placedCollision(asset:WorldAsset,override?:AssetCollision):AssetCollision|undefined{
 if(!override)return asset.collision;
 if(asset.image===BUNKER_IMAGE&&matches(override,oldPlacedBunker))return BUNKER_FOOT;
 if(asset.image==='/survival/camp-treatment-v2/idle-00.webp'&&matches(override,oldTreatment))return asset.collision;
 if(asset.image==='/survival/camp-workshop-v2/idle-00.webp'&&matches(override,oldWorkshop,.008))return asset.collision;
 return override;
}

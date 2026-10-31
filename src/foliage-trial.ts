import {MAX_LAYOUT_ITEMS} from './layout-limits';
import {usesPaintedHomeTerrain} from './terrain-art';
import {ASSET_BY_ID} from './world-assets';
import {layoutBlocked,newPlacement,placementBounds,type Placement,type WorldLayout} from './world-layout';

const FIRE_ID='06c42057-0d46-43ef-977b-f183d7c50561';
export const FOLIAGE_TRIAL_PREFIX='camp-foliage-v1-';
/** One approved, deliberately small patch on the existing bare bonfire clearing.
 * No terrain repaint, obstacles, relocated props, or recurring auto-decoration. */
export function addApprovedFoliageTrial(layout:WorldLayout):WorldLayout{
 if(layout.foliageTrialVersion||!usesPaintedHomeTerrain(layout.terrainImage))return layout;
 const fire=layout.items.find(p=>p.id===FIRE_ID&&p.role==='hearth');
 if(!fire||Math.hypot(fire.x-1718.1676,fire.y-1573.5125)>140)return layout;
 if(layout.items.some(p=>p.id.startsWith(FOLIAGE_TRIAL_PREFIX)))return{...layout,foliageTrialVersion:1};
 const spots:[string,number,number,number,number][]=[
  ['broadleaf',-365,90,.95,0],['fern',-310,128,.88,6],
  ['grass',-400,155,1,353],['broadleaf',-355,183,.85,8],
  ['grass',-282,204,.9,4],['broadleaf',-244,156,.8,354],
  ['fern',-407,73,.78,355],['grass',-445,122,.95,6],
  ['fern',-328,232,.8,0],['broadleaf',-405,223,.75,352],
  ['grass',-253,110,.8,9],['grass',-449,194,.85,0],
 ];
 if(layout.items.length+spots.length>MAX_LAYOUT_ITEMS||spots.some(([name])=>!ASSET_BY_ID.has('art_foliage_'+name)))return layout;
 const additions:Placement[]=spots.map(([name,dx,dy,scale,rotation],i)=>({...newPlacement('art_foliage_'+name,fire.x+dx,fire.y+dy),id:FOLIAGE_TRIAL_PREFIX+(i+1),scale,rotation,flipX:i%3===1,locked:false,allowTransparency:false,solid:false,layer:0}));
 // If the owner has since built here, don't decorate over their new objects.
 for(const p of additions){const b=placementBounds(p);for(const [x,y]of [[p.x,p.y],[b.x,b.y+b.height*.65],[b.x+b.width,b.y+b.height*.65]])if(layoutBlocked(layout,x,y,26))return layout;}
 return{...layout,foliageTrialVersion:1,items:[...layout.items,...additions],updatedAt:new Date().toISOString()};
}

export const FOLIAGE_EXPANSION_PREFIX='camp-foliage-v2-';
/** Approved larger test garden. Runs once against the owner's chosen draft,
 * keeping the first trial, edited placements and the south food approach. */
export function addApprovedFoliageExpansion(layout:WorldLayout):WorldLayout{
 if((layout.foliageTrialVersion??0)>=2||!usesPaintedHomeTerrain(layout.terrainImage))return layout;
 const fire=layout.items.find(p=>p.id===FIRE_ID&&p.role==='hearth');
 if(!fire||Math.hypot(fire.x-1718.1676,fire.y-1573.5125)>140)return layout;
 // An imported, partially edited expansion must not refill removed plants.
 if(layout.items.some(p=>p.id.startsWith(FOLIAGE_EXPANSION_PREFIX)))return{...layout,foliageTrialVersion:2};
 const spots:[string,number,number,number,number][]=[
  ['olive_shrub',-462,-60,1.03,355],['golden_shrub',-365,-116,1,4],
  ['copper_fern',-283,-83,.98,352],['pale_flowers',-424,-151,.9,2],
  ['grass',-513,-115,1.12,8],['broadleaf',-494,1,1.08,356],
  ['olive_shrub',-230,30,.9,5],['golden_shrub',-328,37,.96,354],
  ['pale_flowers',-418,32,1.02,3],['copper_fern',-521,98,.95,357],
  ['olive_shrub',-520,221,1.06,4],['pale_flowers',-476,272,1.06,352],
  ['golden_shrub',-391,321,1.08,5],['copper_fern',-294,294,.93,354],
  ['olive_shrub',-211,234,.94,3],['pale_flowers',-229,346,.92,356],
  ['grass',-330,366,1.13,0],['broadleaf',-548,317,1.1,6],
  ['golden_shrub',-563,35,.98,356],['fern',-468,369,1.1,3],
  ['olive_shrub',-319,-233,1,5],['pale_flowers',-213,-245,.93,0],
  ['golden_shrub',-98,-265,1.02,353],['grass',-157,-309,1.06,6],
  ['copper_fern',50,-264,.96,6],['pale_flowers',141,-256,1.04,356],
  ['olive_shrub',244,-238,1.06,354],['broadleaf',337,-219,1.12,4],
  ['golden_shrub',407,-151,1.03,356],['pale_flowers',305,-139,.94,6],
  ['copper_fern',471,-79,1,355],['olive_shrub',298,-26,.97,3],
  ['grass',388,-46,1.06,358],['pale_flowers',504,30,1.07,4],
  ['golden_shrub',413,71,1.06,353],['broadleaf',257,83,1.12,8],
  ['olive_shrub',332,150,.98,2],['copper_fern',499,158,.93,358],
  ['pale_flowers',424,202,.97,354],['golden_shrub',254,265,1.04,3],
  ['grass',336,259,1.1,6],['olive_shrub',473,309,1.08,354],
  ['copper_fern',363,355,.96,5],['pale_flowers',224,376,1,357],
  ['broadleaf',518,378,1.06,3],['grass',441,397,1.13,355],
  ['pale_flowers',-545,-213,1,3],['fern',505,-220,1.12,354],
 ];
 if(layout.items.length+spots.length>MAX_LAYOUT_ITEMS||spots.some(([name])=>!ASSET_BY_ID.has('art_foliage_'+name)))return layout;
 const additions:Placement[]=spots.map(([name,dx,dy,scale,rotation],i)=>({...newPlacement('art_foliage_'+name,fire.x+dx,fire.y+dy),id:FOLIAGE_EXPANSION_PREFIX+(i+1),scale,rotation,flipX:i%3===1,locked:false,allowTransparency:false,solid:false,layer:0})).filter(p=>{
  const b=placementBounds(p);
  // Leave newly built objects alone instead of abandoning the whole upgrade.
  return [[p.x,p.y],[b.x,b.y+b.height*.85],[b.x+b.width,b.y+b.height*.85]].every(([x,y])=>!layoutBlocked(layout,x,y,28));
 });
 return{...layout,foliageTrialVersion:2,items:[...layout.items,...additions],updatedAt:new Date().toISOString()};
}

export const TERRAIN_FOLIAGE_PREFIX='camp-foliage-v3-';
/** Broader leaf groups matching the terrain, added beside the existing trial. */
export function addApprovedTerrainFoliage(layout:WorldLayout):WorldLayout{
 if(layout.foliageTrialVersion===3||!usesPaintedHomeTerrain(layout.terrainImage))return layout;
 const fire=layout.items.find(p=>p.id===FIRE_ID&&p.role==='hearth');
 if(!fire||Math.hypot(fire.x-1718.1676,fire.y-1573.5125)>140)return layout;
 if(layout.items.some(p=>p.id.startsWith(TERRAIN_FOLIAGE_PREFIX)))return{...layout,foliageTrialVersion:3};
 const spots:[string,number,number,number,number][]=[
  // Loose overlapping islands: substantial leaf faces beside the finer plants.
  ['moss_rosette',-425,-48,1,356],['lime_rosette',-487,-6,.9,7],
  ['flower_leaf_clump',-377,17,.9,2],['moss_rosette',-540,-76,.88,353],
  ['lime_rosette',-354,-122,.96,4],['flower_leaf_clump',-506,-161,.82,357],
  ['moss_rosette',-402,342,1.03,5],['lime_rosette',-311,393,.93,354],
  ['flower_leaf_clump',-479,389,.94,2],['moss_rosette',-252,334,.86,355],
  ['lime_rosette',-426,450,.91,6],['flower_leaf_clump',-330,466,.78,0],
  ['moss_rosette',371,193,1.06,354],['lime_rosette',448,242,.91,5],
  ['flower_leaf_clump',313,275,.88,358],['moss_rosette',506,176,.87,4],
  ['lime_rosette',397,322,.98,356],['flower_leaf_clump',522,333,.9,3],
  ['moss_rosette',-299,-303,.95,355],['lime_rosette',-212,-351,.86,4],
  ['flower_leaf_clump',-360,-374,.83,0],['moss_rosette',228,-299,1,5],
  ['lime_rosette',327,-321,.9,354],['flower_leaf_clump',285,-386,.82,358],
 ];
 if(layout.items.length+spots.length>MAX_LAYOUT_ITEMS||spots.some(([name])=>!ASSET_BY_ID.has('art_foliage_'+name)))return layout;
 const additions:Placement[]=spots.map(([name,dx,dy,scale,rotation],i)=>({...newPlacement('art_foliage_'+name,fire.x+dx,fire.y+dy),id:TERRAIN_FOLIAGE_PREFIX+(i+1),scale,rotation,flipX:i%3===1,locked:false,allowTransparency:false,solid:false,layer:0})).filter(p=>{
  const b=placementBounds(p);
  return [[p.x,p.y],[b.x,b.y+b.height*.75],[b.x+b.width,b.y+b.height*.75]].every(([x,y])=>!layoutBlocked(layout,x,y,28));
 });
 return{...layout,foliageTrialVersion:3,items:[...layout.items,...additions],updatedAt:new Date().toISOString()};
}

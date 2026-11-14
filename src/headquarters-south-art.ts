import type {ArtworkRecord} from './artwork-model';
import type {WorldAsset} from './world-assets';
import type {AssetCollision} from './asset-collision';

export const HQ_SOUTH_ROOT='/survival/headquarters-south-v1';
export const HQ_V2_ROOT='/survival/headquarters-v2';
export const HQ_SOUTH_INTERIOR=HQ_V2_ROOT+'/repaired-interior.webp';
export const HQ_SOUTH_GROUND=HQ_SOUTH_ROOT+'/settled-ground-v6.webp';
// Let the actual map stones/leaves show through the disturbed soil. Keep the
// masonry/roots opaque: only the broad terrain dressing should mix with ground.
export const HQ_SOUTH_GROUND_OPACITY=.36;
export const HQ_SOUTH_FOOTING=HQ_SOUTH_ROOT+'/rooted-footing-v6.webp';
/** Reuse the camp's low foliage at the masonry feet. These are decorative
 * parts of the building, so they follow owner transforms without new blockers. */
export const HQ_FOUNDATION_DRESSING:readonly {image:string;rect:readonly [number,number,number,number]}[]=[];
export const HQ_SOUTH_ROOF=HQ_V2_ROOT+'/repaired-exterior.webp';
export const HQ_SOUTH_RUIN=HQ_V2_ROOT+'/broken-exterior.webp';
export const HQ_SOUTH_RUIN_INTERIOR=HQ_V2_ROOT+'/broken-interior.webp';
export const HQ_SOUTH_ANCHOR:[number,number]=[.5,.94];
// Ground contact, not the elevated top edge of a wall. The centre doorway
// and the steps are deliberately absent from the blocking outlines.
export const HQ_SOUTH_OLD_COLLISION:AssetCollision={lineWidth:.009,paths:[
 {closed:false,points:[[.13,.32],[.87,.32]]},
 {closed:false,points:[[.13,.32],[.055,.49],[.055,.74]]},
 {closed:false,points:[[.87,.32],[.945,.49],[.945,.74]]},
 {closed:true,points:[[.025,.69],[.332,.69],[.332,.86],[.025,.86]]},
 {closed:true,points:[[.668,.69],[.975,.69],[.975,.86],[.668,.86]]},
]};

// This floor ends at the back wall's feet, rather than its elevated top edge.
export const HQ_SOUTH_COLLISION:AssetCollision={lineWidth:.009,paths:[
 {closed:false,points:[[.13,.34],[.87,.34]]},
 {closed:false,points:[[.13,.34],[.065,.50],[.065,.75]]},
 {closed:false,points:[[.87,.34],[.935,.50],[.935,.75]]},
 {closed:true,points:[[.025,.695],[.332,.695],[.332,.86],[.025,.86]]},
 {closed:true,points:[[.668,.695],[.975,.695],[.975,.86],[.668,.86]]},
 // The centre table is painted into both room sprites; no second desk sprite.
 {closed:true,points:[[.385,.515],[.615,.515],[.615,.665],[.385,.665]]},
]};

/** Only replace the reviewed pair of uploads; later owner uploads win. */
export function resolveSouthHeadquarters(record:ArtworkRecord):ArtworkRecord{
 const c=record.config;
 if(record.id!=='base_shelter_t1'||c.base.id!=='93db0d98-1245-4026-a136-6248654149f9'||c.roof?.id!=='cc6d2270-1400-486e-a12a-2014ca70f4e3')return record;
 const file=(source:typeof c.base,url:string,bytes:number)=>({...source,url,name:url.split('/').pop()!,mime:'image/webp',width:1536,height:1024,bytes});
 return {...record,config:{...c,kind:'building',base:file(c.base,HQ_SOUTH_INTERIOR,238264),roof:file(c.roof,HQ_SOUTH_ROOF,286736),worldWidth:672,anchor:HQ_SOUTH_ANCHOR,solid:true,collision:HQ_SOUTH_COLLISION,building:{left:.08,right:.92,top:.49,bottom:.76,doorSide:'south',doorStart:.30,doorEnd:.70}}};
}

export function withSouthHeadquartersGeometry(a:WorldAsset):WorldAsset{
 if(a.id!=='base_shelter_t1'||a.image!==HQ_SOUTH_INTERIOR)return a;
 return {...a,body:[],segments:[],collision:HQ_SOUTH_COLLISION,
  ground:undefined,
  interior:{x:(.08-.5)*a.width,y:(.36-.94)*a.height,width:.84*a.width,height:.40*a.height},
  foreground:[[20,260,100,590],[1416,260,100,590]],
  roof:HQ_SOUTH_ROOF,roofRect:[0,0,1536,1024],
  anchor:[768,1024*.94],note:'Headquarters v2 · built-in centre planning table · clear southern stairs · repaired and ruined cutaways',
 };
}

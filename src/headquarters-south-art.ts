import type {ArtworkRecord} from './artwork-model';
import type {WorldAsset} from './world-assets';
import type {AssetCollision} from './asset-collision';

export const HQ_SOUTH_ROOT='/survival/headquarters-south-v1';
export const HQ_SOUTH_INTERIOR=HQ_SOUTH_ROOT+'/interior.webp';
export const HQ_SOUTH_ROOF=HQ_SOUTH_ROOT+'/exterior.webp';
export const HQ_SOUTH_RUIN=HQ_SOUTH_ROOT+'/ruined.webp';
export const HQ_SOUTH_RUIN_INTERIOR=HQ_SOUTH_ROOT+'/ruined-interior.webp';
export const HQ_SOUTH_ANCHOR:[number,number]=[.5,.94];
// Ground contact, not the elevated top edge of a wall. The centre doorway
// and the steps are deliberately absent from the blocking outlines.
export const HQ_SOUTH_COLLISION:AssetCollision={lineWidth:.009,paths:[
 {closed:false,points:[[.13,.32],[.87,.32]]},
 {closed:false,points:[[.13,.32],[.055,.49],[.055,.74]]},
 {closed:false,points:[[.87,.32],[.945,.49],[.945,.74]]},
 {closed:true,points:[[.025,.69],[.332,.69],[.332,.86],[.025,.86]]},
 {closed:true,points:[[.668,.69],[.975,.69],[.975,.86],[.668,.86]]},
]};

/** Only replace the reviewed pair of uploads; later owner uploads win. */
export function resolveSouthHeadquarters(record:ArtworkRecord):ArtworkRecord{
 const c=record.config;
 if(record.id!=='base_shelter_t1'||c.base.id!=='93db0d98-1245-4026-a136-6248654149f9'||c.roof?.id!=='cc6d2270-1400-486e-a12a-2014ca70f4e3')return record;
 const file=(source:typeof c.base,url:string,bytes:number)=>({...source,url,name:url.split('/').pop()!,mime:'image/webp',width:1536,height:1024,bytes});
 return {...record,config:{...c,kind:'building',base:file(c.base,HQ_SOUTH_INTERIOR,442838),roof:file(c.roof,HQ_SOUTH_ROOF,647022),worldWidth:672,anchor:HQ_SOUTH_ANCHOR,solid:true,collision:HQ_SOUTH_COLLISION,building:{left:.08,right:.92,top:.32,bottom:.76,doorSide:'south',doorStart:.30,doorEnd:.70}}};
}

export function withSouthHeadquartersGeometry(a:WorldAsset):WorldAsset{
 if(a.id!=='base_shelter_t1'||a.image!==HQ_SOUTH_INTERIOR)return a;
 return {...a,body:[],segments:[],collision:HQ_SOUTH_COLLISION,
  interior:{x:(.08-.5)*a.width,y:(.32-.94)*a.height,width:.84*a.width,height:.44*a.height},
  foreground:[[25,470,485,415],[1026,470,485,415]],
  roof:HQ_SOUTH_ROOF,roofRect:[0,0,1536,1024],
  anchor:[768,1024*.94],note:'South-facing headquarters · spacious walkable room · clear central entrance · independent roof',
 };
}

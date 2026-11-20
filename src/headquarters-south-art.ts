import type {ArtworkRecord} from './artwork-model';
import type {WorldAsset} from './world-assets';
import type {AssetCollision,CollisionPoint} from './asset-collision';

export const HQ_SOUTH_ROOT='/survival/headquarters-south-v1';
export const HQ_V4_ROOT='/survival/headquarters-v4';
export const HQ_SOUTH_INTERIOR=HQ_V4_ROOT+'/repaired-interior.webp';
export const HQ_SOUTH_GROUND=HQ_SOUTH_ROOT+'/settled-ground-v6.webp';
// Let the actual map stones/leaves show through the disturbed soil. Keep the
// masonry/roots opaque: only the broad terrain dressing should mix with ground.
export const HQ_SOUTH_GROUND_OPACITY=.28;
export const HQ_SOUTH_FOOTING=HQ_SOUTH_ROOT+'/rooted-footing-v6.webp';
/** Reuse the camp's low foliage at the masonry feet. These are decorative
 * parts of the building, so they follow owner transforms without new blockers. */
export const HQ_FOUNDATION_DRESSING:readonly {image:string;rect:readonly [number,number,number,number]}[]=[];
export const HQ_SOUTH_ROOF=HQ_V4_ROOT+'/repaired-exterior.webp';
export const HQ_SOUTH_RUIN=HQ_V4_ROOT+'/broken-exterior.webp';
export const HQ_SOUTH_RUIN_INTERIOR=HQ_V4_ROOT+'/broken-interior.webp';
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

// Outline embedded in released v4 layouts before the fixtures were traced.
const HQ_SOUTH_TABLE_COLLISION:AssetCollision={lineWidth:.009,paths:[
 {closed:false,points:[[.13,.34],[.87,.34]]},
 {closed:false,points:[[.13,.34],[.065,.50],[.065,.75]]},
 {closed:false,points:[[.87,.34],[.935,.50],[.935,.75]]},
 {closed:true,points:[[.025,.695],[.332,.695],[.332,.86],[.025,.86]]},
 {closed:true,points:[[.668,.695],[.975,.695],[.975,.86],[.668,.86]]},
 // The same painted planning table occupies the same pixels in both interior states.
 {closed:true,points:[[.382,.465],[.618,.465],[.618,.64],[.382,.64]]},
]};

const solid = (points:CollisionPoint[]) => ({closed:true,points});

// Ground-contact outlines traced on the registered v4 interiors. The front
// foundations include the side plinths down to the lowest tread. The open
// space between them is the stairway, continuous with the interior floor.
const previousInterior:AssetCollision = {lineWidth:.009,paths:[
 // Rear wall, bookcases and the side wall foundations.
 solid([[.296,.25],[.73,.25],[.745,.306],[.618,.309],[.611,.296],[.43,.296],[.42,.307],[.3,.307]]),
 solid([[.3,.25],[.315,.29],[.207,.391],[.148,.534],[.15,.714],[.104,.739],[.105,.599],[.079,.515],[.143,.347]]),
 solid([[.714,.26],[.743,.25],[.863,.354],[.936,.516],[.895,.602],[.897,.733],[.854,.716],[.851,.557],[.821,.428],[.743,.327]]),
 // Sandbags, barrel and lantern plinth to the left of the entrance.
 solid([[.101,.706],[.388,.704],[.389,.949],[.337,.95],[.335,.876],[.188,.867],[.181,.834],[.105,.828],[.094,.807]]),
 // Firewood, crates, barrels and matching plinth on the right.
 solid([[.613,.703],[.895,.703],[.919,.758],[.912,.825],[.878,.827],[.858,.861],[.707,.884],[.666,.881],[.666,.951],[.614,.95]]),
 // Fireplace and barrel, workbench and its two low stools.
 solid([[.183,.331],[.248,.286],[.314,.279],[.334,.294],[.332,.332],[.277,.359],[.26,.384],[.218,.405],[.178,.384]]),
 solid([[.149,.432],[.207,.367],[.246,.363],[.234,.421],[.267,.42],[.271,.479],[.234,.491],[.216,.519],[.197,.52],[.19,.556],[.158,.559],[.157,.523],[.143,.518]]),
 // Table, front stools and the chair at its back.
 solid([[.404,.5],[.481,.475],[.485,.423],[.537,.417],[.541,.477],[.613,.499],[.621,.586],[.589,.589],[.588,.621],[.441,.621],[.44,.59],[.402,.587]]),
 // Rear crate, chairs, side table and tall crate against the east wall.
 solid([[.701,.279],[.746,.278],[.755,.324],[.733,.347],[.702,.331]]),
 solid([[.727,.346],[.756,.338],[.773,.369],[.805,.374],[.826,.407],[.846,.415],[.85,.494],[.819,.517],[.794,.506],[.792,.462],[.765,.444],[.735,.448],[.72,.421]]),
 solid([[.852,.463],[.883,.444],[.895,.485],[.878,.552],[.852,.554]]),
]};

export const HQ_SOUTH_COLLISION:AssetCollision={...previousInterior,paths:[...previousInterior.paths,
 // The bench and chimney back directly onto the west wall and bookcase.
 solid([[.14,.432],[.177,.334],[.255,.275],[.306,.272],[.311,.315],[.246,.378],[.21,.437],[.161,.521],[.136,.523]]),
]};

export const HQ_SOUTH_RUIN_DEBRIS:AssetCollision = {lineWidth:.009,paths:[
 solid([[.622,.451],[.644,.415],[.683,.377],[.749,.318],[.789,.289],[.764,.336],[.71,.399],[.654,.452]]),
]};

export function isOriginalHeadquartersOutline(c:AssetCollision){
 return [HQ_SOUTH_OLD_COLLISION,HQ_SOUTH_TABLE_COLLISION,previousInterior].some(old=>
  c.lineWidth===old.lineWidth && c.paths.length===old.paths.length && c.paths.every((path,i)=>{
   const saved=old.paths[i];
   return path.closed===saved.closed && path.points.length===saved.points.length &&
    path.points.every(([x,y],j)=>x===saved.points[j][0] && y===saved.points[j][1]);
  }));
}

/** Only replace the reviewed pair of uploads; later owner uploads win. */
export function resolveSouthHeadquarters(record:ArtworkRecord):ArtworkRecord{
 const c=record.config;
 if(record.id!=='base_shelter_t1'||c.base.id!=='93db0d98-1245-4026-a136-6248654149f9'||c.roof?.id!=='cc6d2270-1400-486e-a12a-2014ca70f4e3')return record;
 const file=(source:typeof c.base,url:string,bytes:number)=>({...source,url,name:url.split('/').pop()!,mime:'image/webp',width:1536,height:1024,bytes});
 const collision=c.base.url===HQ_SOUTH_INTERIOR&&c.collision&&!isOriginalHeadquartersOutline(c.collision)?c.collision:HQ_SOUTH_COLLISION;
 return {...record,config:{...c,kind:'building',base:file(c.base,HQ_SOUTH_INTERIOR,1568262),roof:file(c.roof,HQ_SOUTH_ROOF,377440),worldWidth:672,anchor:HQ_SOUTH_ANCHOR,solid:true,collision,building:{left:.08,right:.92,top:.49,bottom:.76,doorSide:'south',doorStart:.30,doorEnd:.70}}};
}

export function withSouthHeadquartersGeometry(a:WorldAsset):WorldAsset{
 if(a.id!=='base_shelter_t1'||a.image!==HQ_SOUTH_INTERIOR)return a;
 return {...a,body:[],segments:[],collision:a.collision??HQ_SOUTH_COLLISION,
  // Both authentic interior base textures carry their own feathered terrain.
  // Do not draw the old separate dark soil decal beneath them: the actual
  // camp terrain should show through the gently cleared outer edges.
  ground:undefined,
  interior:{x:(.08-.5)*a.width,y:(.296-.94)*a.height,width:.84*a.width,height:.464*a.height},
  foreground:[[20,260,100,590],[1416,260,100,590]],
  roof:HQ_SOUTH_ROOF,roofRect:[0,0,1536,1024],
  anchor:[768,1024*.94],note:'Headquarters v4 · matching repaired/ruined interiors and exteriors · built-in central planning table and collision',
 };
}

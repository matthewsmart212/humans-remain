import profiles from './camp-ground-profiles.json';
import {WORKSITE_ROOT,WAREHOUSE_ARTWORK} from './camp-worksites-art';
import {FURNACE_BROKEN_IMAGE,FURNACE_COLD_IMAGE} from './furnace-animation-art';
import {TREATMENT_BROKEN_IMAGE,TREATMENT_IDLE_FRAMES} from './treatment-animation-art';
import {WORKSHOP_BROKEN_IMAGE,WORKSHOP_IDLE_FRAMES} from './workshop-animation-art';
import type {WorldAsset} from './world-assets';
import {placementBounds,type Placement} from './world-layout';

const bySource=new Map(profiles.flatMap(p=>p.sources.map(s=>[s,p] as const)));
type ContactProfile={paths:readonly (readonly (readonly [number,number])[])[];width:number;opacity:number};
const workshop:ContactProfile={width:.027,opacity:.62,paths:[
 [[.052,.798],[.11,.822],[.185,.845],[.230,.875],[.292,.878],[.404,.842]],
 [[.444,.864],[.473,.836],[.519,.9],[.57,.862],[.583,.827]],
 [[.715,.722],[.77,.719],[.831,.724],[.905,.693],[.928,.686]],
]};
const treatment:ContactProfile={width:.023,opacity:.58,paths:[
 [[.034,.640],[.057,.657]],
 [[.090,.675],[.151,.697],[.206,.716],[.273,.690]],
 [[.580,.799],[.612,.816],[.670,.842],[.710,.826],[.738,.799]],
 [[.780,.825],[.796,.830]],
 [[.948,.634],[.968,.638]],
]};
const furnace:ContactProfile={width:.028,opacity:.64,paths:[
 [[.108,.700],[.167,.726],[.24,.732],[.315,.748],[.397,.744],[.47,.738],[.547,.718],[.598,.712]],
 [[.218,.827],[.295,.852],[.346,.875],[.439,.925],[.477,.926],[.535,.892],[.561,.873]],
 [[.656,.828],[.688,.845],[.767,.841],[.804,.811]],
 [[.862,.686],[.89,.688]],
]};
const warehouse:ContactProfile={width:.025,opacity:.64,paths:[
 [[.052,.776],[.098,.794],[.161,.794],[.216,.787],[.333,.801],[.485,.808]],
 [[.430,.893],[.457,.874],[.480,.864]],
 [[.532,.943],[.552,.925],[.581,.899]],
 [[.654,.929],[.687,.944],[.719,.937],[.748,.902]],
 [[.779,.821],[.836,.808],[.900,.790],[.940,.768]],
]};
const bunker:ContactProfile={width:.030,opacity:.43,paths:[
 [[.083,.775],[.171,.842],[.272,.859],[.436,.871],[.586,.890],[.699,.886],[.830,.829],[.908,.771]],
]};
const worksiteContacts=new Map<string,ContactProfile>([
 [WORKSHOP_IDLE_FRAMES[0],workshop],[WORKSHOP_BROKEN_IMAGE,workshop],
 [TREATMENT_IDLE_FRAMES[0],treatment],[TREATMENT_BROKEN_IMAGE,treatment],
 [FURNACE_COLD_IMAGE,furnace],[FURNACE_BROKEN_IMAGE,furnace],
 [WAREHOUSE_ARTWORK.full,warehouse],[WORKSITE_ROOT+'/warehouse-broken.webp',warehouse],
 ['/survival/camp-structures-v3/bunker-0.webp',bunker],['/survival/camp-ruins-v1/bunker.webp',bunker],
]);
const feather=[{scale:2.5,strength:.12},{scale:1.8,strength:.19},{scale:1.2,strength:.27},{scale:.65,strength:.42}];
type ContactContext=CanvasRenderingContext2D&{strokeRounded?:()=>void};
function shadeContact(ctx:ContactContext,width:number,opacity:number){
 const alpha=ctx.globalAlpha;
 for(const {scale,strength} of feather){
  ctx.globalAlpha=alpha*opacity*strength;
  ctx.lineWidth=width*scale;
  if(ctx.strokeRounded)ctx.strokeRounded();
  else ctx.stroke();
 }
}

export const hasCampGroundContact=(a:WorldAsset)=>!!a.perimeterCurve?.length||worksiteContacts.has(a.image);
/** Exterior shadows sit on terrain below the depth-sorted world. Paths follow
 * the masonry and feet in the registered sources, including damaged sprites. */
export function drawCampGroundContact(ctx:CanvasRenderingContext2D,p:Placement,a:WorldAsset,source:string){
 const b=placementBounds(p);
 ctx.strokeStyle='#20190f';ctx.lineJoin='round';ctx.lineCap='round';
 if(a.perimeterCurve?.length){
  const scaleX=b.width/a.width,scaleY=b.height/a.height;
  const x0=b.x+a.anchor[0]/a.crop[2]*b.width,y0=b.y+a.anchor[1]/a.crop[3]*b.height;
  ctx.beginPath();
  for(const [i,[x,y]] of a.perimeterCurve.entries()){
   const px=x0+(x+4)*scaleX,py=y0+(y+28)*scaleY;
   if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py);
  }
  shadeContact(ctx,24*scaleX,.38);
  return;
 }
 const profile=worksiteContacts.get(source);
 if(!profile)return;
 ctx.beginPath();
 for(const path of profile.paths)path.forEach(([u,v],i)=>i?ctx.lineTo(b.x+u*b.width,b.y+v*b.height):ctx.moveTo(b.x+u*b.width,b.y+v*b.height));
 shadeContact(ctx,b.width*profile.width,profile.opacity);
}

/** Small, feathered contact shadows follow the authored feet/foundations.
 * Draw in the asset's own layer so indoor props sit on their wooden floor,
 * and the bonfire shadow remains above the separate clearing decal. The
 * caller applies the same rotation/mirror transform as the artwork. */
export function drawCampContact(ctx:CanvasRenderingContext2D,p:Placement,a:WorldAsset){
 const profile=bySource.get(a.image);if(!profile)return;
 const b=placementBounds(p);ctx.save();ctx.strokeStyle='#302516';ctx.lineJoin='round';ctx.lineCap='round';
 ctx.beginPath();for(const path of profile.paths)path.forEach(([u,v],i)=>i?ctx.lineTo(b.x+u*b.width,b.y+v*b.height):ctx.moveTo(b.x+u*b.width,b.y+v*b.height));
 shadeContact(ctx,b.width*profile.contactWidth,profile.contactOpacity);
 ctx.restore();
}

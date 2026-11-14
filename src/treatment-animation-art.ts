import type {ArtworkRecord} from './artwork-model';
/** Five matching transparent frames, with light levels from low to high. */
export const TREATMENT_ART_ROOT='/survival/camp-treatment-v2';
export const TREATMENT_IDLE_FRAMES=Array.from({length:5},(_,i)=>`${TREATMENT_ART_ROOT}/idle-0${i}.webp`);
export const TREATMENT_PULSE_FRAMES=[0,1,2,3,4,3,2,1].map(i=>TREATMENT_IDLE_FRAMES[i]);
export const TREATMENT_BROKEN_IMAGE=`${TREATMENT_ART_ROOT}/broken.webp`;
export const TREATMENT_ANIMATION_FPS=4;
const TREATMENT_FRAME_BYTES=[199304,206862,183542,184962,209030];

/** Upgrade original treatment artwork, preserving later custom uploads and placement geometry. */
export function resolveTreatmentArtwork(record:ArtworkRecord):ArtworkRecord{
 const c=record.config;
 if(record.id!=='base_medical_t2'||c.kind!=='sprite'||c.frames.length||c.roof||c.unlit||c.base.url!=='/survival/camp-essentials-v1/treatment-centre.webp')return record;
 const file=(url:string,id:string):ArtworkRecord['config']['base']=>{
  const frame=Math.max(0,TREATMENT_IDLE_FRAMES.indexOf(url));
  return {...c.base,id,url,name:url.split('/').pop()!,mime:'image/webp',width:1254,height:1254,bytes:TREATMENT_FRAME_BYTES[frame]};
 };
 return {...record,config:{...c,base:file(TREATMENT_IDLE_FRAMES[0],'treatment-v2-base'),frames:TREATMENT_PULSE_FRAMES.map((url,i)=>file(url,`treatment-v2-frame-${i}`)),fps:TREATMENT_ANIMATION_FPS,animationMode:'loop'}};
}
